import { create } from "zustand";
import { LAYER_CATALOG } from "@/lib/layerRegistry";

type LayerRuntimeState = {
  enabled: boolean;
  opacity: number; // 0..1
};

type LayerStore = {
  layers: Record<string, LayerRuntimeState>;
  toggle: (id: string) => void;
  setEnabled: (id: string, enabled: boolean) => void;
  setOpacity: (id: string, opacity: number) => void;
  resetDefaults: () => void;
};

function initialState(): Record<string, LayerRuntimeState> {
  const state: Record<string, LayerRuntimeState> = {};
  for (const layer of LAYER_CATALOG) {
    state[layer.id] = { enabled: layer.enabledByDefault, opacity: 1 };
  }
  return state;
}

export const useLayerStore = create<LayerStore>((set) => ({
  layers: initialState(),
  toggle: (id) =>
    set((s) => ({
      layers: { ...s.layers, [id]: { ...s.layers[id], enabled: !s.layers[id]?.enabled } },
    })),
  setEnabled: (id, enabled) =>
    set((s) => ({ layers: { ...s.layers, [id]: { ...s.layers[id], enabled } } })),
  setOpacity: (id, opacity) =>
    set((s) => ({
      layers: { ...s.layers, [id]: { ...s.layers[id], opacity: Math.min(1, Math.max(0, opacity)) } },
    })),
  resetDefaults: () => set({ layers: initialState() }),
}));
