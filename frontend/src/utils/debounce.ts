/**
 * Creates a trailing debounced wrapper with a `.cancel()` cleanup handle.
 * Used to coalesce bursts of real-time socket events (e.g. simultaneous
 * checkouts) into a single refresh per viewer window.
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delayMs);
  };
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return debounced;
}

