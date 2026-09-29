import { useEffect, useRef } from "react";
import { fetchSatellites, CELESTRAK_REFRESH_SECONDS } from "@/lib/providers/celestrak";
import { useSatelliteStore } from "@/stores/useSatelliteStore";
import { useLayerStore } from "@/stores/useLayerStore";

/**
 * Fetches TLEs when the satellite layer is enabled or the group changes
 * (spec §16). TLEs change slowly, so we refetch only every few hours; the
 * per-frame position updates happen in the globe from these elements.
 */
export function useSatelliteFeed() {
  const enabled = useLayerStore((s) => s.layers["satellites"]?.enabled ?? false);
  const group = useSatelliteStore((s) => s.group);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failuresRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      useSatelliteStore.getState().clear();
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
      const store = useSatelliteStore.getState();
      store.setLoading(true);
      try {
        const { records, status } = await fetchSatellites(store.group, controller.signal);
        if (cancelled) return;
        failuresRef.current = 0;
        store.setData(records, status);
        scheduleNext(CELESTRAK_REFRESH_SECONDS);
      } catch (e) {
        if (cancelled || (e as Error).name === "AbortError") return;
        failuresRef.current += 1;
        const prev = useSatelliteStore.getState().status;
        const hasData = useSatelliteStore.getState().records.length > 0;
        store.setError("CelesTrak orbital data is temporarily unavailable.", {
          sourceId: "celestrak",
          state: hasData ? "stale" : "offline",
          lastSuccessfulFetchAt: prev?.lastSuccessfulFetchAt,
          observedAt: prev?.observedAt,
          expectedRefreshSeconds: CELESTRAK_REFRESH_SECONDS,
          message: (e as Error).message,
        });
        const backoff = Math.min(600, 30 * 2 ** (failuresRef.current - 1));
        scheduleNext(backoff);
      }
    };

    run();
    return () => {
      cancelled = true;
      controller.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, group]);
}

export function SatelliteFeedController() {
  useSatelliteFeed();
  return null;
}
