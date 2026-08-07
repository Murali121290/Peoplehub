const getApiUrl = () => {
  let url = (import.meta.env.VITE_API_URL as string) || "";
  
  if (typeof window !== "undefined") {
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const isIpAddress = /^[0-9.]+$/.test(window.location.hostname);
    
    if (!isLocalhost && !isIpAddress) {
      // Force HTTPS for production domain (like peoplehub.s4carlisle.com) to avoid HTTP-to-HTTPS redirect blocks
      url = `https://${window.location.host}`;
    } else {
      url = `${window.location.protocol}//${window.location.host}`;
    }
  }

  if (typeof window !== "undefined" && window.location.protocol === "https:" && url.startsWith("http:")) {
    url = url.replace(/^http:/, "https:");
  }
  return url;
};

export const BASE_API_URL = getApiUrl();
export const API_URL = BASE_API_URL;

export const getProfileImageUrl = (profileImage: any, employeeId?: number | string) => {
  if (!profileImage) {
    return "/default-avatar.png";
  }
  if (typeof profileImage === "string") {
    if (profileImage.startsWith("/api/")) {
      return `${API_URL}${profileImage}`;
    }
    if (profileImage.startsWith("data:") || profileImage.startsWith("http:") || profileImage.startsWith("https:")) {
      return profileImage;
    }
    if (profileImage === "true" || profileImage === "True" || profileImage === "1") {
      if (employeeId) {
        return `${API_URL}/api/employees/image/${employeeId}`;
      }
      return "/default-avatar.png";
    }
    // raw base64 string
    return `data:image/jpeg;base64,${profileImage}`;
  }
  if (typeof profileImage === "boolean" && profileImage) {
    if (employeeId) {
      return `${API_URL}/api/employees/image/${employeeId}`;
    }
  }
  return "/default-avatar.png";
};

