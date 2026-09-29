import { describe, it, expect, vi, afterEach } from "vitest";
import { parseCoordinates, searchPlaces } from "./geocode";

describe("parseCoordinates", () => {
  it("parses decimal pairs", () => {
    expect(parseCoordinates("35.6895, 139.69171")).toEqual({ latitude: 35.6895, longitude: 139.69171 });
    expect(parseCoordinates("-33.9 18.4")).toEqual({ latitude: -33.9, longitude: 18.4 });
  });
  it("rejects out-of-range values", () => {
    expect(parseCoordinates("120, 200")).toBeNull();
  });
  it("parses DMS with hemispheres", () => {
    const r = parseCoordinates(`35°41'24"N 139°41'30"E`);
    expect(r).not.toBeNull();
    expect(r!.latitude).toBeCloseTo(35.69, 1);
    expect(r!.longitude).toBeCloseTo(139.69, 1);
  });
  it("returns null for non-coordinate text", () => {
    expect(parseCoordinates("Tokyo")).toBeNull();
  });
});

describe("searchPlaces", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns a coordinate hit without calling the network for pure coords", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const results = await searchPlaces("35.68, 139.69");
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("coordinate");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("validates and maps a geocoder response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            { id: 1, name: "Tokyo", latitude: 35.68, longitude: 139.69, country: "Japan", admin1: "Tokyo" },
          ],
        }),
        { status: 200 },
      ),
    );
    const results = await searchPlaces("Tokyo");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ name: "Tokyo", kind: "place", country: "Japan" });
  });

  it("returns [] when the geocoder has no results", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    expect(await searchPlaces("zzzxxx")).toEqual([]);
  });

  it("throws on invalid payload shape (schema validation)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ results: [{ id: "bad", name: 5 }] }), { status: 200 }),
    );
    await expect(searchPlaces("Tokyo")).rejects.toThrow(/validated/);
  });

  it("throws on HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    await expect(searchPlaces("Tokyo")).rejects.toThrow(/failed/);
  });
});
