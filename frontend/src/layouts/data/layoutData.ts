import { API_URL } from "../../config/api";
<<<<<<< HEAD
=======

>>>>>>> 881eff2d6d04a138ab2d8951a9dda89c8aee0db9
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
