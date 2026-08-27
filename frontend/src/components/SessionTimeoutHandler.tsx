import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const LAST_ACTIVE_KEY = 'peoplehub_last_active_time';
const CHECK_INTERVAL_MS = 1000; // Check every second

export const SessionTimeoutHandler: React.FC = () => {
  const { isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.removeItem(LAST_ACTIVE_KEY);
      return;
    }

    // Initialize last active time
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());

    const updateActivity = () => {
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    };

    // User interactions to track activity
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'click', 'touchstart'];

    activityEvents.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    const interval = setInterval(() => {
      const lastActiveStr = localStorage.getItem(LAST_ACTIVE_KEY);
      if (!lastActiveStr) return;

      const lastActiveTime = parseInt(lastActiveStr, 10);
      const currentTime = Date.now();
      const elapsed = currentTime - lastActiveTime;

      if (elapsed >= TIMEOUT_MS) {
        logout();
        toast.error('Your session has expired due to inactivity. Please log in again.');
      }
    }, CHECK_INTERVAL_MS);

    // Sync across tabs: if another tab updates activity or logs out, synchronize this tab
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && !e.newValue) {
        // Token was removed (logout) in another tab
        logout();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [isAuthenticated, logout]);

  return null;
};

export default SessionTimeoutHandler;
