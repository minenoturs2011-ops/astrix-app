import { useEffect, useRef } from "react";
import { fetchEarthquakes, USGS_EXPECTED_REFRESH_SECONDS } from "@/lib/providers/usgsEarthquakes";
import { useEarthquakeStore } from "@/stores/useEarthquakeStore";
import { useLayerStore } from "@/stores/useLayerStore";

/**
 * Polls the USGS feed while the earthquake layer is enabled (spec §16).
 * - Refresh cadence per layer (5 min), aligned with USGS update rate.
 * - Exponential backoff on failure (spec §15/§16), capped.
 * - Cleans up subscriptions when the layer is disabled (spec §32).
 * - On failure, keeps the last data and marks the feed offline/stale.
 */
export function useEarthquakeFeed() {
  const enabled = useLayerStore((s) => s.layers["earthquakes"]?.enabled ?? false);
  const windowSel = useEarthquakeStore((s) => s.window);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failuresRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      useEarthquakeStore.getState().clear();
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const scheduleNext = (delaySeconds: number) => {
      if (cancelled) return;
      timerRef.current = setTimeout(run, delaySeconds * 1000);
    };

    const run = async () => {
      if (cancelled) return;
      const store = useEarthquakeStore.getState();
      store.setLoading(true);
      try {
        const { records, status } = await fetchEarthquakes(store.window, controller.signal);
        if (cancelled) return;
        failuresRef.current = 0;
        store.setData(records, status);
        scheduleNext(USGS_EXPECTED_REFRESH_SECONDS);
      } catch (e) {
        if (cancelled || (e as Error).name === "AbortError") return;
        failuresRef.current += 1;
        const prev = useEarthquakeStore.getState().status;
        const hasData = useEarthquakeStore.getState().records.length > 0;
        store.setError("USGS earthquake data is temporarily unavailable.", {
          sourceId: "usgs-earthquakes",
          state: hasData ? "stale" : "offline",
          lastSuccessfulFetchAt: prev?.lastSuccessfulFetchAt,
          observedAt: prev?.observedAt,
          expectedRefreshSeconds: USGS_EXPECTED_REFRESH_SECONDS,
          message: (e as Error).message,
        });
        // Exponential backoff: 30s, 60s, 120s … capped at 5 min.
        const backoff = Math.min(USGS_EXPECTED_REFRESH_SECONDS, 30 * 2 ** (failuresRef.current - 1));
        scheduleNext(backoff);
      }
    };

    run();
    return () => {
      cancelled = true;
      controller.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, windowSel]);
}

/** Mounts the feed poller without rendering anything. */
export function EarthquakeFeedController() {
  useEarthquakeFeed();
  return null;
}
