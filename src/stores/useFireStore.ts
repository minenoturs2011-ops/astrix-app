import { create } from "zustand";
import type { FeedStatus } from "@/types/layer";
import type { FireRecord, FireSource } from "@/features/fires/types";

type FireStore = {
  records: FireRecord[];
  status: FeedStatus | null;
  loading: boolean;
  error: string | null;
  source: FireSource;

  setSource: (s: FireSource) => void;
  setData: (records: FireRecord[], status: FeedStatus) => void;
  setLoading: (v: boolean) => void;
  setError: (msg: string | null, status?: FeedStatus | null) => void;
  clear: () => void;
};

export const useFireStore = create<FireStore>((set) => ({
  records: [],
  status: null,
  loading: false,
  error: null,
  source: "VIIRS_NOAA20_NRT",
  setSource: (source) => set({ source }),
  setData: (records, status) => set({ records, status, error: null, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error, status) => set((s) => ({ error, loading: false, status: status ?? s.status })),
  clear: () => set({ records: [], status: null, error: null, loading: false }),
}));
