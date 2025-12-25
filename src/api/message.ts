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

export const APISendMessage = async (body: { text: string }) => {
  const response = await axios.post(
    "http://127.0.0.1:8000/message",
    body,
    {
      responseType: "blob", 
    }
  );

  return response.data;
};
