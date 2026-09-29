import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchEarthquakes } from "./usgsEarthquakes";

function feed(generated: number, features: unknown[]) {
  return JSON.stringify({
    metadata: { generated, title: "USGS test", count: features.length },
    features,
  });
}

const sampleFeature = {
  id: "nc123",
  properties: {
    mag: 4.2,
    place: "10 km N of Testville",
    time: 1_790_717_851_430,
    updated: 1_790_717_949_101,
    url: "https://earthquake.usgs.gov/earthquakes/eventpage/nc123",
    magType: "md",
    type: "earthquake",
    title: "M 4.2 - 10 km N of Testville",
    tsunami: 0,
    status: "reviewed",
    sig: 270,
  },
  geometry: { type: "Point", coordinates: [-122.8, 38.8, 5.2] },
};

describe("fetchEarthquakes", () => {
  afterEach(() => vi.restoreAllMocks());

  it("validates, normalizes, and separates observed vs received time", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(feed(Date.now(), [sampleFeature]), { status: 200 }),
    );
    const { records, status } = await fetchEarthquakes("day");
    expect(records).toHaveLength(1);
    const r = records[0];
    expect(r.entity.id).toBe("usgs:nc123");
    expect(r.entity.category).toBe("earthquake");
    expect(r.entity.longitude).toBe(-122.8);
    expect(r.magnitude).toBe(4.2);
    expect(r.depthKm).toBeCloseTo(5.2);
    expect(r.entity.observedAt).toBe(new Date(1_790_717_851_430).toISOString());
    expect(r.entity.receivedAt).not.toBe(r.entity.observedAt);
    expect(r.entity.sourceUrl).toContain("earthquake.usgs.gov");
    expect(status.state).toBe("live");
    // Inspector fields only contain present values.
    const labels = r.entity.fields.map((f) => f.label);
    expect(labels).toContain("Magnitude");
    expect(labels).toContain("Depth");
  });

  it("marks the feed delayed when 'generated' is stale", async () => {
    const old = Date.now() - 60 * 60 * 1000; // 1h ago
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(feed(old, [sampleFeature]), { status: 200 }));
    const { status, records } = await fetchEarthquakes("day");
    expect(status.state).toBe("delayed");
    expect(records[0].entity.feedState).toBe("delayed");
  });

  it("skips features with null geometry but keeps valid ones", async () => {
    const noGeom = { ...sampleFeature, id: "x1", geometry: null };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(feed(Date.now(), [noGeom, sampleFeature]), { status: 200 }),
    );
    const { records } = await fetchEarthquakes("hour");
    expect(records).toHaveLength(1);
    expect(records[0].entity.id).toBe("usgs:nc123");
  });

  it("handles null magnitude/place without inventing values", async () => {
    const nullMag = {
      ...sampleFeature,
      id: "x2",
      properties: { ...sampleFeature.properties, mag: null, place: null, title: null },
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(feed(Date.now(), [nullMag]), { status: 200 }));
    const { records } = await fetchEarthquakes("hour");
    expect(records[0].magnitude).toBeNull();
    // No "Magnitude" or "Location" field when the data is absent.
    const labels = records[0].entity.fields.map((f) => f.label);
    expect(labels).not.toContain("Magnitude");
    expect(labels).not.toContain("Location");
    expect(labels).toContain("Depth");
  });

  it("throws on invalid payload (schema validation)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ metadata: {}, features: "nope" }), { status: 200 }),
    );
    await expect(fetchEarthquakes("day")).rejects.toThrow(/validated/);
  });

  it("throws on HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 503 }));
    await expect(fetchEarthquakes("day")).rejects.toThrow(/failed/);
  });
});
