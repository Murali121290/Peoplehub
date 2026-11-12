import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";

const RELOADED_VER_KEY = "peoplehub_reloaded_version";
const RELOAD_COOLDOWN_KEY = "peoplehub_last_chunk_reload_at";
const CHECK_INTERVAL_MS = 60_000;

function clearStaleUiSnapshots() {
  try {
    const keysToDelete: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (
        k &&
        (k.startsWith("peoplehub_employees_swr_") ||
          k.startsWith("peoplehub_eval_") ||
          k.startsWith("peoplehub_hr_swr_"))
      ) {
        keysToDelete.push(k);
      }
    }
    keysToDelete.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // Ignore storage errors
  }
}

function isUserActivelyEditing(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  return Boolean(el.isContentEditable);
}

function triggerHardReload(targetVersion?: string) {
  const now = Date.now();
  try {
    const last = Number(sessionStorage.getItem(RELOAD_COOLDOWN_KEY) || "0");
    if (now - last < 15_000) return;
    if (targetVersion) {
      const alreadyReloaded = sessionStorage.getItem(RELOADED_VER_KEY);
      if (alreadyReloaded === targetVersion) return;
      sessionStorage.setItem(RELOADED_VER_KEY, targetVersion);
    }
    sessionStorage.setItem(RELOAD_COOLDOWN_KEY, String(now));
  } catch {
    // Ignore storage errors
  }

  clearStaleUiSnapshots();
  window.location.reload();
}

/**
 * Watches `/version.json` and Vite preload errors so live deployments apply
 * automatically without requiring users to manually Ctrl+Shift+R or clear cache.
 */
export const AppVersionWatcher: React.FC = () => {
  const location = useLocation();
  const [pendingVersion, setPendingVersion] = useState<string | null>(null);
  const pendingVersionRef = useRef<string | null>(null);
  const reloadScheduledRef = useRef(false);

  const scheduleOrApplyUpdate = (newVer: string) => {
    try {
      if (sessionStorage.getItem(RELOADED_VER_KEY) === newVer) return;
    } catch {
      // Ignore
    }

    pendingVersionRef.current = newVer;
    setPendingVersion(newVer);

    if (isUserActivelyEditing()) {
      return;
    }
    if (reloadScheduledRef.current) return;
    reloadScheduledRef.current = true;

    toast("New PeopleHub update is live — updating automatically...", {
      id: "peoplehub-auto-update",
      duration: 2500,
    });
    window.setTimeout(() => {
      triggerHardReload(newVer);
    }, 1200);
  };

  useEffect(() => {
    if (!import.meta.env.PROD) return;

    const currentVersion =
      typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "";
    if (!currentVersion) return;

    let checking = false;
    const checkVersion = async () => {
      if (checking || document.hidden) return;
      checking = true;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) return;
        const data = await res.json();
        const serverVer = String(data?.version || "").trim();
        if (serverVer && serverVer !== currentVersion) {
          scheduleOrApplyUpdate(serverVer);
        }
      } catch {
        // Ignore transient offline / network errors
      } finally {
        checking = false;
      }
    };

    const handlePreloadError = (event: Event) => {
      event.preventDefault();
      triggerHardReload(pendingVersionRef.current || undefined);
    };

    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        checkVersion();
      }
    };

    const initialTimer = window.setTimeout(checkVersion, 3000);
    const interval = window.setInterval(checkVersion, CHECK_INTERVAL_MS);

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("vite:preloadError", handlePreloadError);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("vite:preloadError", handlePreloadError);
    };
  }, []);

  // If an update was deferred while typing, apply cleanly when user navigates
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    if (pendingVersionRef.current && !isUserActivelyEditing()) {
      triggerHardReload(pendingVersionRef.current);
    }
  }, [location.pathname]);

  if (!pendingVersion) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-3 rounded-xl border border-teal-200 bg-white px-4 py-2.5 shadow-lg">
      <span className="h-2.5 w-2.5 rounded-full bg-teal-500 animate-ping" />
      <span className="text-xs font-semibold text-slate-800">
        New update available
      </span>
      <button
        type="button"
        onClick={() => triggerHardReload(pendingVersion)}
        className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-bold text-white hover:bg-teal-700 transition cursor-pointer"
      >
        Update Now
      </button>
    </div>
  );
};

export default AppVersionWatcher;

