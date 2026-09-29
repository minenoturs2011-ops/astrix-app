import { create } from "zustand";
import type { TerraEntity } from "@/types/entity";

export type GlobeStyleMode = "natural" | "night" | "analytical";

export type FlyTarget = {
  longitude: number;
  latitude: number;
  /** camera height in meters */
  height?: number;
  /** nonce so repeated fly-to the same place still triggers */
  nonce: number;
};

export type CursorReadout = {
  longitude: number;
  latitude: number;
} | null;

type UiStore = {
  // Panels
  leftOpen: boolean;
  rightOpen: boolean;
  presentationMode: boolean; // globe-only (spec §4)
  toggleLeft: () => void;
  toggleRight: () => void;
  setRightOpen: (v: boolean) => void;
  togglePresentation: () => void;

  // Globe styling & effects
  styleMode: GlobeStyleMode;
  setStyleMode: (m: GlobeStyleMode) => void;
  atmosphere: boolean;
  toggleAtmosphere: () => void;
  reducedEffects: boolean; // low-performance mode (spec §17)
  toggleReducedEffects: () => void;

  // Cursor coordinate readout
  cursor: CursorReadout;
  setCursor: (c: CursorReadout) => void;

  // Selection & camera
  selected: TerraEntity | null;
  select: (e: TerraEntity | null) => void;
  flyTarget: FlyTarget | null;
  flyTo: (lon: number, lat: number, height?: number) => void;
  resetViewNonce: number;
  resetView: () => void;
};

export const useUiStore = create<UiStore>((set) => ({
  leftOpen: true,
  rightOpen: false,
  presentationMode: false,
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
  setRightOpen: (v) => set({ rightOpen: v }),
  togglePresentation: () => set((s) => ({ presentationMode: !s.presentationMode })),

  styleMode: "natural",
  setStyleMode: (m) => set({ styleMode: m }),
  atmosphere: true,
  toggleAtmosphere: () => set((s) => ({ atmosphere: !s.atmosphere })),
  reducedEffects: false,
  toggleReducedEffects: () => set((s) => ({ reducedEffects: !s.reducedEffects })),

  cursor: null,
  setCursor: (c) => set({ cursor: c }),

  selected: null,
  select: (e) => set({ selected: e, rightOpen: e ? true : false }),
  flyTarget: null,
  flyTo: (longitude, latitude, height) =>
    set((s) => ({ flyTarget: { longitude, latitude, height, nonce: (s.flyTarget?.nonce ?? 0) + 1 } })),
  resetViewNonce: 0,
  resetView: () => set((s) => ({ resetViewNonce: s.resetViewNonce + 1 })),
}));
