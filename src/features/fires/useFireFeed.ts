import { useEffect, useRef } from "react";
import { fetchFires, FIRMS_REFRESH_SECONDS } from "@/lib/providers/firms";
import { useFireStore } from "@/stores/useFireStore";
import { useLayerStore } from "@/stores/useLayerStore";

/** Polls NASA FIRMS while the wildfires layer is enabled (spec §16). */
export function useFireFeed() {
  const enabled = useLayerStore((s) => s.layers["wildfires"]?.enabled ?? false);
  const source = useFireStore((s) => s.source);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failuresRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      useFireStore.getState().clear();
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
      const store = useFireStore.getState();
      store.setLoading(true);
      try {
        const { records, status } = await fetchFires(store.source, 1, controller.signal);
        if (cancelled) return;
        failuresRef.current = 0;
        store.setData(records, status);
        scheduleNext(FIRMS_REFRESH_SECONDS);
      } catch (e) {
        if (cancelled || (e as Error).name === "AbortError") return;
        failuresRef.current += 1;
        const prev = useFireStore.getState().status;
        const hasData = useFireStore.getState().records.length > 0;
        store.setError((e as Error).message, {
          sourceId: "nasa-firms",
          state: hasData ? "stale" : "offline",
          lastSuccessfulFetchAt: prev?.lastSuccessfulFetchAt,
          expectedRefreshSeconds: FIRMS_REFRESH_SECONDS,
          message: (e as Error).message,
        });
        const backoff = Math.min(FIRMS_REFRESH_SECONDS, 30 * 2 ** (failuresRef.current - 1));
        scheduleNext(backoff);
      }
    };

    run();
    return () => {
      cancelled = true;
      controller.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, source]);
}

export function FireFeedController() {
  useFireFeed();
  return null;
}
