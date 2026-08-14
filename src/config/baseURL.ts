const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("Missing VITE_API_BASE_URL environment variable");
}

export const BASE_URL = apiBaseUrl.replace(/\/+$/, "");

export const createApiUrl = (path: string) => {
  const normalizedPath = path.replace(/^\/+/, "");
  return `${BASE_URL}/${normalizedPath}`;
};
