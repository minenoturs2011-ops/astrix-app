import { create } from "zustand";
import type { FeedStatus } from "@/types/layer";
import type { SatelliteRecord, SatGroup } from "@/features/satellites/types";

type SatelliteStore = {
  records: SatelliteRecord[];
  status: FeedStatus | null;
  loading: boolean;
  error: string | null;
  group: SatGroup;

  setGroup: (g: SatGroup) => void;
  setData: (records: SatelliteRecord[], status: FeedStatus) => void;
  setLoading: (v: boolean) => void;
  setError: (msg: string | null, status?: FeedStatus | null) => void;
  clear: () => void;
};

export const useSatelliteStore = create<SatelliteStore>((set) => ({
  records: [],
  status: null,
  loading: false,
  error: null,
  group: "stations",
  setGroup: (group) => set({ group }),
  setData: (records, status) => set({ records, status, error: null, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error, status) => set((s) => ({ error, loading: false, status: status ?? s.status })),
  clear: () => set({ records: [], status: null, error: null, loading: false }),
}));
