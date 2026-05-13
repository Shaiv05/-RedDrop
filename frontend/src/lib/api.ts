export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5002";

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
