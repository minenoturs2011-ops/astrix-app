import { create } from "zustand";
import type { FeedStatus } from "@/types/layer";
import type { AlertRecord, AlertSeverity } from "@/features/alerts/types";
import { SEVERITY_RANK } from "@/features/alerts/types";

type AlertStore = {
  records: AlertRecord[];
  zoneOnlyCount: number;
  status: FeedStatus | null;
  loading: boolean;
  error: string | null;

  /** Minimum severity filter: "all" or a severity floor. */
  minSeverity: "all" | AlertSeverity;
  setMinSeverity: (s: "all" | AlertSeverity) => void;

  setData: (records: AlertRecord[], zoneOnlyCount: number, status: FeedStatus) => void;
  setLoading: (v: boolean) => void;
  setError: (msg: string | null, status?: FeedStatus | null) => void;
  clear: () => void;
};

export const useAlertStore = create<AlertStore>((set) => ({
  records: [],
  zoneOnlyCount: 0,
  status: null,
  loading: false,
  error: null,
  minSeverity: "all",
  setMinSeverity: (minSeverity) => set({ minSeverity }),
  setData: (records, zoneOnlyCount, status) =>
    set({ records, zoneOnlyCount, status, error: null, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error, status) => set((s) => ({ error, loading: false, status: status ?? s.status })),
  clear: () => set({ records: [], zoneOnlyCount: 0, status: null, error: null, loading: false }),
}));

/** Mapped (drawable) records passing the severity filter. */
export function selectFilteredAlerts(s: {
  records: AlertRecord[];
  minSeverity: "all" | AlertSeverity;
}): AlertRecord[] {
  const floor = s.minSeverity === "all" ? 0 : SEVERITY_RANK[s.minSeverity];
  return s.records.filter((r) => r.hasGeometry && SEVERITY_RANK[r.severity] >= floor);
}
