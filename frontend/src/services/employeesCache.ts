import { API_URL } from "../config/api";

const TTL_MS = 30_000;

let cachedEmployees: any[] | null = null;
let cachedAt = 0;
let inFlight: Promise<any[]> | null = null;

export async function getEmployees(force = false): Promise<any[]> {
  const now = Date.now();

  if (!force && cachedEmployees && now - cachedAt < TTL_MS) {
    return cachedEmployees;
  }

  if (!force && inFlight) {
    return inFlight;
  }

  const token = localStorage.getItem("token");
  inFlight = fetch(`${API_URL}/api/employees/`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((res) => res.json())
    .then((data) => {
      cachedEmployees = Array.isArray(data) ? data : [];
      cachedAt = Date.now();
      inFlight = null;
      return cachedEmployees;
    })
    .catch((err) => {
      inFlight = null;
      throw err;
    });

  return inFlight;
}

export function invalidateEmployeesCache() {
  cachedEmployees = null;
  cachedAt = 0;
}
