import { createApiUrl } from "../config/baseURL";

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

    const apiUrl = createApiUrl(url);
    const response = await fetch(apiUrl, config);
    console.log("This is api", apiUrl);
    return await response.json();
};
