/**
 * Extracts audio from a video file and returns it as a Blob URL
 * Uses MediaRecorder to capture audio from video playback
 */
export async function extractAudioFromVideo(videoFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;
    video.muted = false; // Need audio to extract it
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    
    let mediaRecorder: MediaRecorder | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      URL.revokeObjectURL(videoUrl);
      if (video.src) {
        video.src = '';
        video.load();
      }
    };
    
    video.addEventListener('loadedmetadata', async () => {
      try {
        // Wait a bit for video to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create a MediaStream from the video
        const stream = video.captureStream();
        const audioTracks = stream.getAudioTracks();
        
        if (audioTracks.length === 0) {
          cleanup();
          reject(new Error('Video has no audio track'));
          return;
        }
        
        // Create a MediaRecorder to capture audio
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : MediaRecorder.isTypeSupported('audio/ogg')
          ? 'audio/ogg'
          : 'audio/webm';
        
        mediaRecorder = new MediaRecorder(stream, { mimeType });
        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const audioUrl = URL.createObjectURL(blob);
          cleanup();
          resolve(audioUrl);
        };
        
        mediaRecorder.onerror = () => {
          cleanup();
          reject(new Error('Failed to extract audio'));
        };
        
        // Start recording
        mediaRecorder.start();
        
        // Play video to capture audio
        try {
          await video.play();
          
          // Stop recording when video ends
          const handleEnded = () => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
            video.removeEventListener('ended', handleEnded);
          };
          video.addEventListener('ended', handleEnded);
          
          // Fallback: stop after video duration + buffer
          timeoutId = setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          }, (video.duration * 1000) + 500);
        } catch (playErr) {
          // If play fails, try to stop anyway
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            setTimeout(() => {
              if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
              }
            }, 100);
          } else {
            cleanup();
            reject(playErr);
          }
        }
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
    
    video.addEventListener('error', () => {
      cleanup();
      reject(new Error('Failed to load video'));
    });
  });
}

/**
 * Gets the duration of a video file
 */
export function getVideoDuration(videoFile: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    });
    
    video.addEventListener('error', () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    });
    
    video.src = URL.createObjectURL(videoFile);
  });
}

