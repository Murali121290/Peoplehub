import { API_URL } from "../../config/api";

export const BASE_URL = `${API_URL}/api`;

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
