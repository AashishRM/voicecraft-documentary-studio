import { BASE_URL } from "../config/baseURL";

export const fetchWithConfig = async (url: string, options: any = {}) => {
  const token = localStorage.getItem("token");
  const { ...otherOptions } = options;
  const config = {
    ...otherOptions,
    headers: {
      "Content-Type": "application/json",
      "Authorization": !!token ? `Bearer ${token}` : ''
    },
  };

    const response = await fetch(`${BASE_URL}${url}`, config);
    console.log("This is api", `${BASE_URL}${url}`);
    return await response.json();
};