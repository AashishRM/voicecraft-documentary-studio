import { GetRequest, PostRequest } from "../plugins/https"

// export const APIGetAllMessages = ()=>{
//     return GetRequest('message');

// export const APISendMessage = (body: { text: string }) => {
//   return PostRequest("message", body);
// };
// export const PostRequest = async (url: string, body: any) => {
//   const res = await fetch(BASE_URL + url, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(body),
//   });

//   return res.json();
// };

// frontend/api/tts.ts
import axios from "axios";

export interface TTSRequest {
  text: string;
  pitch_scale: number;
  energy_scale: number;
  duration_scale: number;
  output: "postnet";
}

export const APISendMessage = async (body: TTSRequest) => {
  const response = await axios.post(
    "https://fastspeech20-production.up.railway.app/api/v1/synthesize/wav",
    body,
    {
      responseType: "blob",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};
