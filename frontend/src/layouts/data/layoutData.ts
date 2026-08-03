const getBaseUrl = () => {
  let url = (import.meta.env.VITE_API_URL || "") as string;
  if (typeof window !== "undefined" && window.location.protocol === "https:" && url.startsWith("http:")) {
    url = url.replace(/^http:/, "https:");
  }
  return `${url}/api`;
};

export const BASE_URL = getBaseUrl();

export const reportLinks = [
  {
    name: "Schedule Report",
    path: "/reports/schedule",
    state: { tab: "schedule" },
  },
  {
    name: "Team Schedule",
    path: "/reports/today-schedule",
    state: { tab: "today" },
  },
  {
    name: "Project Info",
    path: "/reports/project-schedule",
    state: { tab: "project" },
  },
];
