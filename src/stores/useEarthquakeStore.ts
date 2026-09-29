import { create } from "zustand";
import type { FeedStatus } from "@/types/layer";
import type { EarthquakeRecord, QuakeWindow } from "@/features/earthquakes/types";

type EarthquakeStore = {
  records: EarthquakeRecord[];
  status: FeedStatus | null;
  loading: boolean;
  error: string | null;

  // Filters (spec §11)
  window: QuakeWindow;
  minMagnitude: number;

  setWindow: (w: QuakeWindow) => void;
  setMinMagnitude: (m: number) => void;
  setData: (records: EarthquakeRecord[], status: FeedStatus) => void;
  setLoading: (v: boolean) => void;
  setError: (msg: string | null, status?: FeedStatus | null) => void;
  clear: () => void;
};

export const useEarthquakeStore = create<EarthquakeStore>((set) => ({
  records: [],
  status: null,
  loading: false,
  error: null,
  window: "day",
  minMagnitude: 0,

  setWindow: (window) => set({ window }),
  setMinMagnitude: (minMagnitude) => set({ minMagnitude }),
  setData: (records, status) => set({ records, status, error: null, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error, status) =>
    set((s) => ({ error, loading: false, status: status ?? s.status })),
  clear: () => set({ records: [], status: null, error: null, loading: false }),
}));

/** Records passing the current magnitude filter (spec §11). */
export function selectFilteredRecords(s: {
  records: EarthquakeRecord[];
  minMagnitude: number;
}): EarthquakeRecord[] {
  if (s.minMagnitude <= 0) return s.records;
  return s.records.filter((r) => (r.magnitude ?? -Infinity) >= s.minMagnitude);
}
