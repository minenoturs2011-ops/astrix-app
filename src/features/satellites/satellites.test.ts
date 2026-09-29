import { describe, it, expect, vi, afterEach } from "vitest";
import * as satellite from "satellite.js";
import { propagateAt, orbitalPeriodMinutes, inclinationDeg } from "./propagate";
import { fetchSatellites } from "@/lib/providers/celestrak";
import type { SatelliteRecord } from "./types";

// A real ISS (ZARYA) TLE (NORAD 25544).
const ISS_NAME = "ISS (ZARYA)";
const L1 = "1 25544U 98067A   26272.11005302  .00004557  00000+0  91790-4 0  9991";
const L2 = "2 25544  51.6312 145.7721 0007123 200.7262 159.3438 15.48685648587861";

function issRecord(): SatelliteRecord {
  return {
    id: "sat:25544",
    noradId: "25544",
    name: ISS_NAME,
    satrec: satellite.twoline2satrec(L1, L2),
    epoch: new Date(),
    group: "stations",
  };
}

describe("SGP4 propagation", () => {
  it("computes a plausible ISS position/velocity", () => {
    const s = propagateAt(issRecord(), new Date("2026-09-29T12:00:00Z"));
    expect(s).not.toBeNull();
    // ISS orbits at ~400-430 km; allow a wide sane band.
    expect(s!.altitudeKm).toBeGreaterThan(300);
    expect(s!.altitudeKm).toBeLessThan(500);
    // Orbital velocity ~7.66 km/s.
    expect(s!.velocityKmS).toBeGreaterThan(7);
    expect(s!.velocityKmS).toBeLessThan(8);
    // Latitude bounded by inclination (~51.6°).
    expect(Math.abs(s!.latitude)).toBeLessThanOrEqual(52.5);
    expect(Math.abs(s!.longitude)).toBeLessThanOrEqual(180);
  });

  it("derives period (~92 min) and inclination (~51.6°)", () => {
    const rec = issRecord();
    expect(orbitalPeriodMinutes(rec)!).toBeGreaterThan(88);
    expect(orbitalPeriodMinutes(rec)!).toBeLessThan(96);
    expect(inclinationDeg(rec)!).toBeCloseTo(51.6, 0);
  });
});

describe("fetchSatellites (CelesTrak)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("parses TLE text into SGP4 records", async () => {
    const tle = `${ISS_NAME}          \n${L1}\n${L2}\n`;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(tle, { status: 200 }));
    const { records, status } = await fetchSatellites("stations");
    expect(records).toHaveLength(1);
    expect(records[0].noradId).toBe("25544");
    expect(records[0].name).toBe(ISS_NAME);
    expect(records[0].id).toBe("sat:25544");
    expect(status.sourceId).toBe("celestrak");
  });

  it("throws when CelesTrak returns an HTML error page", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html><body>Invalid query</body></html>", { status: 200 }),
    );
    await expect(fetchSatellites("stations")).rejects.toThrow(/no orbital elements/i);
  });

  it("throws on HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    await expect(fetchSatellites("stations")).rejects.toThrow(/failed/);
  });
});
