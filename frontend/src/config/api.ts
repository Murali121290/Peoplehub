const getApiUrl = () => {
  let url = (import.meta.env.VITE_API_URL as string) || "";
  if (typeof window !== "undefined" && window.location.protocol === "https:" && url.startsWith("http:")) {
    url = url.replace(/^http:/, "https:");
  }
  return url;
};

export const API_URL = getApiUrl();
