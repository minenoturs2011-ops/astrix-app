import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchAlerts } from "./nwsAlerts";

function feed(features: unknown[], updated?: string) {
  return JSON.stringify({ updated: updated ?? new Date().toISOString(), features });
}

const polyAlert = {
  id: "urn:oid:2.49.0.1.840.0.abc",
  geometry: {
    type: "Polygon",
    coordinates: [[[-100, 40], [-99, 40], [-99, 41], [-100, 41], [-100, 40]]],
  },
  properties: {
    event: "Severe Thunderstorm Warning",
    severity: "Severe",
    urgency: "Immediate",
    certainty: "Observed",
    headline: "Severe Thunderstorm Warning issued",
    areaDesc: "Somewhere, KS",
    onset: "2026-09-29T21:00:00-05:00",
    expires: "2026-09-29T22:00:00-05:00",
    senderName: "NWS",
    instruction: "Take shelter.",
  },
};

const zoneOnlyAlert = {
  id: "urn:oid:2.49.0.1.840.0.def",
  geometry: null,
  properties: { event: "Flood Watch", severity: "Moderate" },
};

describe("fetchAlerts", () => {
  afterEach(() => vi.restoreAllMocks());

  it("normalizes a polygon alert with centroid + rings and separate times", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(feed([polyAlert]), { status: 200 }));
    const { records, zoneOnlyCount, status } = await fetchAlerts();
    expect(records).toHaveLength(1);
    const r = records[0];
    expect(r.hasGeometry).toBe(true);
    expect(r.rings).toHaveLength(1);
    expect(r.severity).toBe("Severe");
    expect(r.entity.category).toBe("weather-alert");
    // Centroid roughly inside the polygon.
    expect(r.entity.longitude).toBeGreaterThan(-100.1);
    expect(r.entity.longitude).toBeLessThan(-98.9);
    expect(r.entity.observedAt).toBeDefined();
    expect(r.entity.receivedAt).not.toBe(r.entity.observedAt);
    expect(r.entity.sourceUrl).toContain("api.weather.gov/alerts/");
    expect(zoneOnlyCount).toBe(0);
    expect(status.state).toBe("live");
  });

  it("counts zone-only alerts (null geometry) but marks them not drawable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(feed([polyAlert, zoneOnlyAlert]), { status: 200 }),
    );
    const { records, zoneOnlyCount } = await fetchAlerts();
    expect(records).toHaveLength(2);
    expect(zoneOnlyCount).toBe(1);
    const zone = records.find((r) => !r.hasGeometry)!;
    expect(zone.rings).toHaveLength(0);
  });

  it("handles MultiPolygon geometry", async () => {
    const multi = {
      ...polyAlert,
      id: "urn:oid:multi",
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [[[-100, 40], [-99, 40], [-99, 41], [-100, 40]]],
          [[[10, 10], [11, 10], [11, 11], [10, 10]]],
        ],
      },
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(feed([multi]), { status: 200 }));
    const { records } = await fetchAlerts();
    expect(records[0].rings).toHaveLength(2);
  });

  it("defaults unknown severity", async () => {
    const weird = { ...zoneOnlyAlert, id: "u2", properties: { event: "X", severity: "Bogus" } };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(feed([weird]), { status: 200 }));
    const { records } = await fetchAlerts();
    expect(records[0].severity).toBe("Unknown");
  });

  it("throws on invalid payload (schema validation)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ features: "nope" }), { status: 200 }),
    );
    await expect(fetchAlerts()).rejects.toThrow(/validated/);
  });

  it("throws on HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    await expect(fetchAlerts()).rejects.toThrow(/failed/);
  });
});
