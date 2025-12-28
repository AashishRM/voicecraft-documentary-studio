import { useState, useRef, useCallback } from 'react';

interface AudioClip {
  name: string;
  audioUrl?: string;
  videoUrl?: string; // Video file URL for video clips
  duration: number;
  trackIndex?: number;
  trackVolume?: number;
}

interface UseVideoExportProps {
  videoFile: File | null;
  audioClips: AudioClip[];
  getTrackVolume?: (trackIndex: number) => number; // Function to get current track volume from player
}

interface UseVideoExportReturn {
  isExporting: boolean;
  exportProgress: number;
  exportError: string | null;
  exportVideo: () => Promise<void>;
  cancelExport: () => void;
}

export const useVideoExport = ({
  videoFile,
  audioClips,
  getTrackVolume,
}: UseVideoExportProps): UseVideoExportReturn => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  
  const cancelledRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cleanupRef = useRef<(() => void)[]>([]);

  const cancelExport = useCallback(() => {
    cancelledRef.current = true;
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Run all cleanup functions
    cleanupRef.current.forEach(fn => fn());
    cleanupRef.current = [];
    
    setIsExporting(false);
    setExportProgress(0);
  }, []);

  const exportVideo = useCallback(async () => {
    if (!videoFile) {
      setExportError('No video file selected');
      return;
    }

    // Filter clips that have audio (either audioUrl or videoUrl)
    const playableClips = audioClips.filter(clip => clip.audioUrl || clip.videoUrl);
    if (playableClips.length === 0) {
      setExportError('No audio clips with audio to export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    cancelledRef.current = false;
    cleanupRef.current = [];

    let videoUrl: string | null = null;
    let audioContext: AudioContext | null = null;
    let videoElement: HTMLVideoElement | null = null;
    let animationFrameId: number | null = null;

    try {
      // Create video element
      videoElement = document.createElement('video');
      videoUrl = URL.createObjectURL(videoFile);
      videoElement.src = videoUrl;
      videoElement.muted = true;
      videoElement.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        videoElement!.onloadedmetadata = () => resolve();
        videoElement!.onerror = () => reject(new Error('Failed to load video'));
      });

      if (cancelledRef.current) return;

      // Create canvas for video frames
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 1920;
      canvas.height = videoElement.videoHeight || 1080;
      const ctx = canvas.getContext('2d', { alpha: false });
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Create audio context and merge audio clips
      audioContext = new AudioContext();
      
      // Group clips by track
      const clipsByTrack = new Map<number, typeof playableClips>();
      playableClips.forEach(clip => {
        const trackIndex = clip.trackIndex ?? 0;
        if (!clipsByTrack.has(trackIndex)) {
          clipsByTrack.set(trackIndex, []);
        }
        clipsByTrack.get(trackIndex)!.push(clip);
      });

      // Load all audio buffers for each track (including video clips)
      const trackBuffers = new Map<number, AudioBuffer[]>();
      let totalClips = 0;
      let loadedClips = 0;

      for (const [trackIndex, trackClips] of clipsByTrack.entries()) {
        const buffers: AudioBuffer[] = [];
        for (const clip of trackClips) {
          // Use audioUrl if available, otherwise use videoUrl (video files contain audio)
          const audioSource = clip.audioUrl || clip.videoUrl;
          if (audioSource) {
            totalClips++;
            try {
              const response = await fetch(audioSource);
              const arrayBuffer = await response.arrayBuffer();
              const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
              buffers.push(audioBuffer);
              loadedClips++;
              setExportProgress(Math.round((loadedClips / totalClips) * 15));
            } catch (err) {
              console.warn(`Failed to decode audio for clip ${clip.name}:`, err);
            }
          }
        }
        if (buffers.length > 0) {
          trackBuffers.set(trackIndex, buffers);
        }
      }

      if (trackBuffers.size === 0) {
        throw new Error('No audio could be decoded');
      }

      // Merge clips within each track (sequential)
      const mergedTrackBuffers = new Map<number, AudioBuffer>();
      for (const [trackIndex, buffers] of trackBuffers.entries()) {
        if (buffers.length === 0) continue;
        
        const sampleRate = buffers[0].sampleRate;
        const totalDuration = buffers.reduce((sum, buf) => sum + buf.duration, 0);
        const totalLength = Math.ceil(totalDuration * sampleRate);
        const mergedBuffer = audioContext.createBuffer(
          buffers[0].numberOfChannels,
          totalLength,
          sampleRate
        );

        let offset = 0;
        for (const buffer of buffers) {
          for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const channelData = mergedBuffer.getChannelData(channel);
            const sourceData = buffer.getChannelData(channel);
            channelData.set(sourceData, offset);
          }
          offset += buffer.length;
        }
        
        mergedTrackBuffers.set(trackIndex, mergedBuffer);
      }

      // Mix all tracks together (simultaneous playback) with volume control
      const sortedTrackIndices = Array.from(mergedTrackBuffers.keys()).sort((a, b) => a - b);
      const allTracks = sortedTrackIndices.map(trackIndex => mergedTrackBuffers.get(trackIndex)!);
      
      if (allTracks.length === 0) {
        throw new Error('No audio tracks to merge');
      }
      
      const maxDuration = Math.max(...allTracks.map(buf => buf.duration));
      const sampleRate = allTracks[0].sampleRate;
      const numberOfChannels = Math.max(...allTracks.map(buf => buf.numberOfChannels));
      const totalLength = Math.ceil(maxDuration * sampleRate);
      
      const finalMergedBuffer = audioContext.createBuffer(
        numberOfChannels,
        totalLength,
        sampleRate
      );

      // Get track volumes - use getTrackVolume function if provided, or fall back to clip trackVolume
      const trackVolumesMap = new Map<number, number>();
      
      // First, get volumes for all tracks that exist in clipsByTrack (this ensures we get all tracks)
      if (getTrackVolume) {
        clipsByTrack.forEach((_, trackIndex) => {
          const volume = getTrackVolume(trackIndex);
          trackVolumesMap.set(trackIndex, volume);
        });
      } else {
        // Fallback: get volumes from clips
        audioClips.forEach(clip => {
          if (clip.trackIndex !== undefined && !trackVolumesMap.has(clip.trackIndex)) {
            const volume = clip.trackVolume ?? 1.0;
            trackVolumesMap.set(clip.trackIndex, volume);
          }
        });
      }

      // Mix all tracks with volume control, maintaining track order
      sortedTrackIndices.forEach((trackIndex, arrayIndex) => {
        const trackBuffer = allTracks[arrayIndex];
        const volume = trackVolumesMap.get(trackIndex) ?? 1.0;
        
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const finalChannelData = finalMergedBuffer.getChannelData(channel);
          const trackChannelData = trackBuffer.getChannelData(
            Math.min(channel, trackBuffer.numberOfChannels - 1)
          );
          
          for (let i = 0; i < Math.min(trackBuffer.length, totalLength); i++) {
            finalChannelData[i] += trackChannelData[i] * volume;
          }
        }
      });

      // Normalize to prevent clipping while preserving relative volume differences
      // Only normalize if the signal exceeds 1.0, and do it proportionally
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = finalMergedBuffer.getChannelData(channel);
        let max = 0;
        for (let i = 0; i < channelData.length; i++) {
          max = Math.max(max, Math.abs(channelData[i]));
        }
        // Only normalize if we exceed 1.0 (to prevent clipping)
        // This preserves relative volume differences between tracks
        if (max > 1.0) {
          const normalizeFactor = 1.0 / max;
          for (let i = 0; i < channelData.length; i++) {
            channelData[i] *= normalizeFactor;
          }
        }
      }

      // Calculate export duration to match timeline player
      // Timeline player uses: max of all track durations (where each track duration = sum of clip durations)
      const trackDurations = Array.from(clipsByTrack.values()).map(trackClips => 
        trackClips.reduce((sum, clip) => sum + clip.duration, 0)
      );
      const timelineTotalDuration = trackDurations.length > 0 ? Math.max(...trackDurations) : 0;
      
      // Use the timeline duration (max track duration) as the export duration
      // This ensures the exported video matches exactly what plays in the timeline
      const totalAudioDuration = Math.max(maxDuration, timelineTotalDuration);
      const exportDuration = videoFile ? Math.min(videoElement.duration, totalAudioDuration) : totalAudioDuration;
      const mergedBuffer = finalMergedBuffer;

      // Create audio destination
      const dest = audioContext.createMediaStreamDestination();
      const bufferSource = audioContext.createBufferSource();
      bufferSource.buffer = mergedBuffer;
      bufferSource.connect(dest);

      // Create video stream from canvas at 30fps
      const canvasStream = canvas.captureStream(30);

      // Combine video and audio streams
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      // Setup MediaRecorder
      const chunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 5_000_000,
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const exportPromise = new Promise<Blob>((resolve, reject) => {
        mediaRecorder.onstop = () => {
          if (cancelledRef.current) {
            reject(new Error('Export cancelled'));
            return;
          }
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };
        
        mediaRecorder.onerror = (e) => reject(e);
      });

      // Start recording
      mediaRecorder.start(100);

      // Start audio
      bufferSource.start(audioContext.currentTime);

      // Reset video and play
      videoElement.currentTime = 0;
      videoElement.loop = exportDuration > videoElement.duration; // Loop if audio is longer than video
      await videoElement.play();

      // Render frames synchronized with video playback
      const fps = 30;
      const frameDuration = 1 / fps;
      const startTime = performance.now();
      let frameCount = 0;

      const render = () => {
        if (cancelledRef.current) {
          videoElement!.pause();
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
          return;
        }

        const elapsed = (performance.now() - startTime) / 1000;
        const targetTime = frameCount * frameDuration;

        // Update progress
        const progress = 20 + Math.round((elapsed / exportDuration) * 75);
        setExportProgress(Math.min(progress, 95));

        // Draw current video frame
        // If video has looped, reset it to the correct position
        if (videoElement!.loop && videoElement!.currentTime >= videoElement!.duration) {
          videoElement!.currentTime = 0;
        }
        ctx.drawImage(videoElement!, 0, 0, canvas.width, canvas.height);

        frameCount++;

        // Continue if we haven't reached the export duration (matching timeline duration)
        if (elapsed < exportDuration) {
          animationFrameId = requestAnimationFrame(render);
        } else {
          // Finish recording - stop at exact export duration to match timeline
          videoElement!.pause();
          bufferSource.stop();
          
          // Give MediaRecorder time to finish
          setTimeout(() => {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
          }, 200);
        }
      };

      // Start rendering
      animationFrameId = requestAnimationFrame(render);

      // Wait for export to complete
      const blob = await exportPromise;

      if (cancelledRef.current) return;

      // Download the file
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `documentary-export-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Cleanup download URL after a delay
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      setExportProgress(100);

    } catch (err) {
      if (!cancelledRef.current) {
        console.error('Export error:', err);
        setExportError(err instanceof Error ? err.message : 'Export failed');
      }
    } finally {
      // Cleanup
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (videoElement) {
        videoElement.pause();
        videoElement.src = '';
        videoElement.load();
      }
      
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      
      if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close();
      }

      if (!cancelledRef.current) {
        setIsExporting(false);
      }
      
      cleanupRef.current = [];
    }
  }, [videoFile, audioClips, getTrackVolume]);

  return {
    isExporting,
    exportProgress,
    exportError,
    exportVideo,
    cancelExport,
  };
};




// import { useState, useRef, useCallback } from 'react';
// import { FFmpeg } from '@ffmpeg/ffmpeg';
// import { fetchFile, toBlobURL } from '@ffmpeg/util';

// interface AudioClip {
//   name: string;
//   audioUrl?: string;
// }

// interface UseVideoExportProps {
//   videoFile: File | null;
//   audioClips: AudioClip[];
// }

// interface UseVideoExportReturn {
//   isExporting: boolean;
//   exportProgress: number;
//   exportError: string | null;
//   exportVideo: () => Promise<void>;
//   cancelExport: () => void;
// }

// export const useVideoExport = ({
//   videoFile,
//   audioClips,
// }: UseVideoExportProps): UseVideoExportReturn => {
//   const [isExporting, setIsExporting] = useState(false);
//   const [exportProgress, setExportProgress] = useState(0);
//   const [exportError, setExportError] = useState<string | null>(null);
  
//   const cancelledRef = useRef(false);
//   const ffmpegRef = useRef<FFmpeg | null>(null);

//   const cancelExport = useCallback(() => {
//     cancelledRef.current = true;
//     setIsExporting(false);
//     setExportProgress(0);
//   }, []);

//   const loadFFmpeg = async () => {
//     if (ffmpegRef.current) {
//       return ffmpegRef.current;
//     }

//     const ffmpeg = new FFmpeg();
    
//     ffmpeg.on('log', ({ message }) => {
//       console.log(message);
//     });

//     ffmpeg.on('progress', ({ progress }) => {
//       // FFmpeg progress is 0-1, we use 20-100 for encoding phase
//       setExportProgress(20 + Math.round(progress * 80));
//     });

//     const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
//     await ffmpeg.load({
//       coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
//       wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
//     });

//     ffmpegRef.current = ffmpeg;
//     return ffmpeg;
//   };

//   const mergeAudioFiles = async (audioContext: AudioContext, clips: AudioClip[]): Promise<Blob> => {
//     const audioBuffers: AudioBuffer[] = [];

//     for (const clip of clips) {
//       if (clip.audioUrl) {
//         try {
//           const response = await fetch(clip.audioUrl);
//           const arrayBuffer = await response.arrayBuffer();
//           const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
//           audioBuffers.push(audioBuffer);
//         } catch (err) {
//           console.warn(`Failed to decode audio for clip ${clip.name}:`, err);
//         }
//       }
//     }

//     if (audioBuffers.length === 0) {
//       throw new Error('No audio could be decoded');
//     }

//     // Calculate total duration
//     const totalDuration = audioBuffers.reduce((sum, buf) => sum + buf.duration, 0);
//     const sampleRate = audioBuffers[0].sampleRate;
//     const numberOfChannels = audioBuffers[0].numberOfChannels;
//     const totalLength = Math.ceil(totalDuration * sampleRate);

//     // Create merged buffer
//     const mergedBuffer = audioContext.createBuffer(
//       numberOfChannels,
//       totalLength,
//       sampleRate
//     );

//     // Merge all audio clips
//     let offset = 0;
//     for (const buffer of audioBuffers) {
//       for (let channel = 0; channel < numberOfChannels; channel++) {
//         const channelData = mergedBuffer.getChannelData(channel);
//         const sourceData = buffer.getChannelData(channel);
//         channelData.set(sourceData, offset);
//       }
//       offset += buffer.length;
//     }

//     // Convert to WAV
//     const wavBuffer = audioBufferToWav(mergedBuffer);
//     return new Blob([wavBuffer], { type: 'audio/wav' });
//   };

//   const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
//     const numberOfChannels = buffer.numberOfChannels;
//     const sampleRate = buffer.sampleRate;
//     const format = 1; // PCM
//     const bitDepth = 16;

//     const bytesPerSample = bitDepth / 8;
//     const blockAlign = numberOfChannels * bytesPerSample;

//     const data = new Float32Array(buffer.length * numberOfChannels);
//     for (let channel = 0; channel < numberOfChannels; channel++) {
//       const channelData = buffer.getChannelData(channel);
//       for (let i = 0; i < buffer.length; i++) {
//         data[i * numberOfChannels + channel] = channelData[i];
//       }
//     }

//     const dataLength = data.length * bytesPerSample;
//     const bufferLength = 44 + dataLength;
//     const arrayBuffer = new ArrayBuffer(bufferLength);
//     const view = new DataView(arrayBuffer);

//     // WAV header
//     const writeString = (offset: number, string: string) => {
//       for (let i = 0; i < string.length; i++) {
//         view.setUint8(offset + i, string.charCodeAt(i));
//       }
//     };

//     writeString(0, 'RIFF');
//     view.setUint32(4, bufferLength - 8, true);
//     writeString(8, 'WAVE');
//     writeString(12, 'fmt ');
//     view.setUint32(16, 16, true); // fmt chunk size
//     view.setUint16(20, format, true);
//     view.setUint16(22, numberOfChannels, true);
//     view.setUint32(24, sampleRate, true);
//     view.setUint32(28, sampleRate * blockAlign, true);
//     view.setUint16(32, blockAlign, true);
//     view.setUint16(34, bitDepth, true);
//     writeString(36, 'data');
//     view.setUint32(40, dataLength, true);

//     // Write audio data
//     let offset = 44;
//     for (let i = 0; i < data.length; i++) {
//       const sample = Math.max(-1, Math.min(1, data[i]));
//       const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
//       view.setInt16(offset, intSample, true);
//       offset += 2;
//     }

//     return arrayBuffer;
//   };

//   const exportVideo = useCallback(async () => {
//     if (!videoFile) {
//       setExportError('No video file selected');
//       return;
//     }

//     const playableClips = audioClips.filter(clip => clip.audioUrl);
//     if (playableClips.length === 0) {
//       setExportError('No audio clips with audio to export');
//       return;
//     }

//     setIsExporting(true);
//     setExportProgress(0);
//     setExportError(null);
//     cancelledRef.current = false;

//     let audioContext: AudioContext | null = null;

//     try {
//       // Load FFmpeg
//       setExportProgress(5);
//       const ffmpeg = await loadFFmpeg();
      
//       if (cancelledRef.current) return;

//       // Merge audio files
//       setExportProgress(10);
//       audioContext = new AudioContext();
//       const mergedAudioBlob = await mergeAudioFiles(audioContext, playableClips);
      
//       if (cancelledRef.current) return;

//       setExportProgress(15);

//       // Write files to FFmpeg virtual file system
//       await ffmpeg.writeFile('input_video.mp4', await fetchFile(videoFile));
//       await ffmpeg.writeFile('input_audio.wav', await fetchFile(mergedAudioBlob));

//       if (cancelledRef.current) return;

//       setExportProgress(20);

//       // Run FFmpeg command to merge video and audio
//       // -shortest ensures the output duration matches the shortest input
//       await ffmpeg.exec([
//         '-i', 'input_video.mp4',
//         '-i', 'input_audio.wav',
//         '-c:v', 'libx264',
//         '-preset', 'medium',
//         '-crf', '23',
//         '-c:a', 'aac',
//         '-b:a', '192k',
//         '-map', '0:v:0',
//         '-map', '1:a:0',
//         '-shortest',
//         '-movflags', '+faststart',
//         'output.mp4'
//       ]);

//       if (cancelledRef.current) return;

//       // Read the output file
//       const data = await ffmpeg.readFile('output.mp4');
//       const blob = new Blob([data], { type: 'video/mp4' });

//       // Download the file
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = `documentary-export-${Date.now()}.mp4`;
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
      
//       setTimeout(() => URL.revokeObjectURL(url), 1000);

//       setExportProgress(100);

//       // Cleanup FFmpeg files
//       try {
//         await ffmpeg.deleteFile('input_video.mp4');
//         await ffmpeg.deleteFile('input_audio.wav');
//         await ffmpeg.deleteFile('output.mp4');
//       } catch (err) {
//         console.warn('Failed to cleanup FFmpeg files:', err);
//       }

//     } catch (err) {
//       if (!cancelledRef.current) {
//         console.error('Export error:', err);
//         setExportError(err instanceof Error ? err.message : 'Export failed');
//       }
//     } finally {
//       if (audioContext && audioContext.state !== 'closed') {
//         await audioContext.close();
//       }

//       if (!cancelledRef.current) {
//         setIsExporting(false);
//       }
//     }
//   }, [videoFile, audioClips]);

//   return {
//     isExporting,
//     exportProgress,
//     exportError,
//     exportVideo,
//     cancelExport,
//   };
// };