import { describe, it, expect } from "vitest";
import { getDemoEntities } from "./demoData";

describe("getDemoEntities", () => {
  it("returns only clearly-simulated entities (spec §2.3)", () => {
    const entities = getDemoEntities(Date.parse("2026-01-01T00:00:00Z"));
    expect(entities.length).toBeGreaterThan(0);
    for (const e of entities) {
      expect(e.simulated).toBe(true);
      expect(e.feedState).toBe("simulated");
      expect(e.sourceId).toBe("terra-sim");
    }
  });

  it("produces valid coordinates", () => {
    for (const e of getDemoEntities()) {
      expect(Math.abs(e.latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(e.longitude)).toBeLessThanOrEqual(180);
    }
  });

  it("moves over time (simulated live feel)", () => {
    const t0 = getDemoEntities(1_000_000).find((e) => e.id === "sim-1")!;
    const t1 = getDemoEntities(1_045_000).find((e) => e.id === "sim-1")!;
    expect(t0.longitude === t1.longitude && t0.latitude === t1.latitude).toBe(false);
  });
});
