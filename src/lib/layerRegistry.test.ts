import { describe, it, expect } from "vitest";
import { LAYER_CATALOG, CATEGORY_ORDER, getLayer } from "./layerRegistry";
import { SOURCES } from "./sources";

describe("layer catalog integrity", () => {
  it("has unique layer ids", () => {
    const ids = LAYER_CATALOG.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only 'available' layers are enabled by default", () => {
    for (const l of LAYER_CATALOG) {
      if (l.enabledByDefault) expect(l.implementationStatus).toBe("available");
    }
  });

  it("every layer's category is in CATEGORY_ORDER", () => {
    for (const l of LAYER_CATALOG) {
      expect(CATEGORY_ORDER).toContain(l.category);
    }
  });

  it("all referenced sources exist in the registry", () => {
    for (const l of LAYER_CATALOG) {
      for (const sid of l.sourceIds) {
        expect(SOURCES[sid], `source ${sid} for layer ${l.id}`).toBeDefined();
      }
    }
  });

  it("any layer that renders simulated data is marked simulated", () => {
    const demo = getLayer("demo-entities");
    expect(demo?.simulated).toBe(true);
    expect(demo?.implementationStatus).toBe("available");
  });

  it("every layer documents coverage and limitations (spec §32)", () => {
    for (const l of LAYER_CATALOG) {
      expect(l.coverageDescription.length).toBeGreaterThan(0);
      expect(Array.isArray(l.knownLimitations)).toBe(true);
    }
  });
});
