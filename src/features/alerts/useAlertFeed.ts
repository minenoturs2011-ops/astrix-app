import { useEffect, useRef } from "react";
import { fetchAlerts, NWS_EXPECTED_REFRESH_SECONDS } from "@/lib/providers/nwsAlerts";
import { useAlertStore } from "@/stores/useAlertStore";
import { useLayerStore } from "@/stores/useLayerStore";

/**
 * Polls NWS active alerts while the layer is enabled (spec §16). Refreshes on a
 * 2-minute cadence with exponential backoff on failure, keeping the last data
 * and marking it stale/offline rather than blanking it.
 */
export function useAlertFeed() {
  const enabled = useLayerStore((s) => s.layers["severe-alerts"]?.enabled ?? false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failuresRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      useAlertStore.getState().clear();
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
      const store = useAlertStore.getState();
      store.setLoading(true);
      try {
        const { records, zoneOnlyCount, status } = await fetchAlerts(controller.signal);
        if (cancelled) return;
        failuresRef.current = 0;
        store.setData(records, zoneOnlyCount, status);
        scheduleNext(NWS_EXPECTED_REFRESH_SECONDS);
      } catch (e) {
        if (cancelled || (e as Error).name === "AbortError") return;
        failuresRef.current += 1;
        const prev = useAlertStore.getState().status;
        const hasData = useAlertStore.getState().records.length > 0;
        store.setError("NWS alert data is temporarily unavailable.", {
          sourceId: "nws-alerts",
          state: hasData ? "stale" : "offline",
          lastSuccessfulFetchAt: prev?.lastSuccessfulFetchAt,
          observedAt: prev?.observedAt,
          expectedRefreshSeconds: NWS_EXPECTED_REFRESH_SECONDS,
          message: (e as Error).message,
        });
        const backoff = Math.min(NWS_EXPECTED_REFRESH_SECONDS, 30 * 2 ** (failuresRef.current - 1));
        scheduleNext(backoff);
      }
    };

    run();
    return () => {
      cancelled = true;
      controller.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled]);
}

export function AlertFeedController() {
  useAlertFeed();
  return null;
}
