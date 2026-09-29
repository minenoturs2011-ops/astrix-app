import { describe, it, expect, beforeEach } from "vitest";
import { useLayerStore } from "./useLayerStore";

describe("useLayerStore", () => {
  beforeEach(() => useLayerStore.getState().resetDefaults());

  it("toggles a layer's enabled state", () => {
    const { toggle } = useLayerStore.getState();
    const before = useLayerStore.getState().layers["earthquakes"].enabled;
    toggle("earthquakes");
    expect(useLayerStore.getState().layers["earthquakes"].enabled).toBe(!before);
  });

  it("clamps opacity to [0,1]", () => {
    const { setOpacity } = useLayerStore.getState();
    setOpacity("demo-entities", 2);
    expect(useLayerStore.getState().layers["demo-entities"].opacity).toBe(1);
    setOpacity("demo-entities", -1);
    expect(useLayerStore.getState().layers["demo-entities"].opacity).toBe(0);
  });

  it("resets to defaults (demo layer on)", () => {
    useLayerStore.getState().setEnabled("demo-entities", false);
    useLayerStore.getState().resetDefaults();
    expect(useLayerStore.getState().layers["demo-entities"].enabled).toBe(true);
  });
});
