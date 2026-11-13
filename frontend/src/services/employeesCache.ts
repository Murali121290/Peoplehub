import { API_URL } from "../config/api";
import { fetchWithTimeout } from "./fetchWithTimeout";

const TTL_MS = 3_000;
const SESSION_KEY_PREFIX = "peoplehub_employees_swr_";

let cachedEmployees: any[] | null = null;
let cachedAt = 0;
let cachedForUser: string | null = null;
let inFlight: Promise<any[]> | null = null;

function getSessionCacheKey(): string {
  const uid = (typeof window !== "undefined" && localStorage.getItem("user_id")) || "anon";
  return `${SESSION_KEY_PREFIX}${uid}`;
}

export function getCachedEmployeesSync(): any[] {
  const key = getSessionCacheKey();
  if (cachedEmployees && cachedForUser === key) {
    return cachedEmployees;
  }
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cachedEmployees = parsed;
          cachedForUser = key;
          return parsed;
        }
      }
    } catch {
      // Ignore corrupt/blocked sessionStorage
    }
  }
  return [];
}

export async function getEmployees(force = false): Promise<any[]> {
  const now = Date.now();
  const key = getSessionCacheKey();

  if (cachedForUser !== key) {
    cachedEmployees = null;
    cachedAt = 0;
    inFlight = null;
    cachedForUser = key;
  }

  if (force) {
    cachedEmployees = null;
    cachedAt = 0;
    inFlight = null;
  }

  if (!force && cachedEmployees && now - cachedAt < TTL_MS) {
    return cachedEmployees;
  }

  if (!force && inFlight) {
    return inFlight;
  }

  const token = localStorage.getItem("token");
  const url = force ? `${API_URL}/api/employees/?fresh=true` : `${API_URL}/api/employees/`;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (force) headers["Cache-Control"] = "no-cache";

  inFlight = fetchWithTimeout(url, { headers })
    .then((res) => res.json())
    .then((data) => {
      cachedEmployees = Array.isArray(data) ? data : [];
      cachedAt = Date.now();
      cachedForUser = key;
      inFlight = null;
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(key, JSON.stringify(cachedEmployees));
        } catch {
          // Ignore storage quota errors
        }
      }
      return cachedEmployees;
    })
    .catch((err) => {
      inFlight = null;
      throw err;
    });

  return inFlight;
}

export function invalidateEmployeesCache() {
  const key = getSessionCacheKey();
  cachedEmployees = null;
  cachedAt = 0;
  inFlight = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }
}
