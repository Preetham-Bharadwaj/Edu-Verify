import { useEffect, useRef } from 'react';

const DEFAULT_INTERVAL_MS = 20000;

/**
 * Silently re-fetches data on an interval and when the tab regains focus.
 * Pass `enabled: false` to pause polling (e.g. while a dialog is open).
 */
export function useAutoRefresh(fetchFn, deps = [], { intervalMs = DEFAULT_INTERVAL_MS, enabled = true } = {}) {
    const fetchRef = useRef(fetchFn);
    fetchRef.current = fetchFn;

    useEffect(() => {
        if (!enabled || typeof fetchRef.current !== 'function') return undefined;

        const tick = () => {
            fetchRef.current?.(true);
        };

        const id = setInterval(tick, intervalMs);

        const onFocus = () => tick();
        const onVisibility = () => {
            if (document.visibilityState === 'visible') tick();
        };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            clearInterval(id);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [enabled, intervalMs, ...deps]);
}
