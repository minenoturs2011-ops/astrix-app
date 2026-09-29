import { z } from "zod";

/**
 * Place search (spec §8). Two real, key-less mechanisms:
 *   1. Local coordinate parsing (no network) — "35.68, 139.69", DMS, etc.
 *   2. Open-Meteo Geocoding API — free, CORS-enabled, no API key.
 *
 * External payloads are validated with Zod before use (spec §33.10). We never
 * invent results; when nothing matches we return an empty list (spec §8).
 */

const GEOCODE_BASE_URL =
  (import.meta.env.VITE_GEOCODE_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
  "https://geocoding-api.open-meteo.com/v1";

export type GeocodeResult = {
  id: string;
  name: string;
  admin?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  /** "coordinate" when parsed locally, "place" when from the geocoder. */
  kind: "coordinate" | "place";
  population?: number;
  timezone?: string;
};

// ── Coordinate parsing ──────────────────────────────────────────────────────

const DECIMAL_PAIR = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;
// e.g. 35°41'24"N 139°41'30"E  (degrees, optional minutes/seconds, hemisphere)
const DMS =
  /(\d{1,3})(?:[°:\s]+(\d{1,2}))?(?:['′:\s]+(\d{1,2}(?:\.\d+)?))?["″\s]*\s*([NSEW])/gi;

function isValidLatLon(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

/** Parse a coordinate string to {lat, lon}, or null if it isn't one. */
export function parseCoordinates(input: string): { latitude: number; longitude: number } | null {
  const decimal = input.match(DECIMAL_PAIR);
  if (decimal) {
    const lat = parseFloat(decimal[1]);
    const lon = parseFloat(decimal[2]);
    if (isValidLatLon(lat, lon)) return { latitude: lat, longitude: lon };
  }

  // DMS pair with hemispheres.
  const matches = [...input.matchAll(DMS)];
  if (matches.length >= 2) {
    const parts = matches.slice(0, 2).map((m) => {
      const deg = parseInt(m[1], 10);
      const min = m[2] ? parseInt(m[2], 10) : 0;
      const sec = m[3] ? parseFloat(m[3]) : 0;
      const hemi = m[4].toUpperCase();
      let value = deg + min / 60 + sec / 3600;
      if (hemi === "S" || hemi === "W") value = -value;
      return { value, hemi };
    });
    const latPart = parts.find((p) => p.hemi === "N" || p.hemi === "S");
    const lonPart = parts.find((p) => p.hemi === "E" || p.hemi === "W");
    if (latPart && lonPart && isValidLatLon(latPart.value, lonPart.value)) {
      return { latitude: latPart.value, longitude: lonPart.value };
    }
  }
  return null;
}

// ── Open-Meteo geocoding ─────────────────────────────────────────────────────

const OpenMeteoResult = z.object({
  id: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  country: z.string().optional(),
  country_code: z.string().optional(),
  admin1: z.string().optional(),
  population: z.number().optional(),
  timezone: z.string().optional(),
});

const OpenMeteoResponse = z.object({
  results: z.array(OpenMeteoResult).optional(),
});

/**
 * Search places. Returns a coordinate hit first (if the query parses as one),
 * then geocoder matches. Throws only on network/validation failure so the UI
 * can show an error state; a successful-but-empty response returns [].
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const results: GeocodeResult[] = [];

  const coords = parseCoordinates(trimmed);
  if (coords) {
    results.push({
      id: `coord:${coords.latitude},${coords.longitude}`,
      name: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
      kind: "coordinate",
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
  }

  // Pure coordinate input needs no geocoder call.
  if (coords && /^[\s\d.,-]+$/.test(trimmed)) return results;

  const url = `${GEOCODE_BASE_URL}/search?name=${encodeURIComponent(trimmed)}&count=8&language=en&format=json`;
  const resp = await fetch(url, { signal });
  if (!resp.ok) {
    throw new Error(`Geocoding request failed (${resp.status})`);
  }
  const json = await resp.json();
  const parsed = OpenMeteoResponse.safeParse(json);
  if (!parsed.success) {
    throw new Error("Geocoding response could not be validated.");
  }

  for (const r of parsed.data.results ?? []) {
    results.push({
      id: `place:${r.id}`,
      name: r.name,
      admin: r.admin1,
      country: r.country,
      countryCode: r.country_code,
      latitude: r.latitude,
      longitude: r.longitude,
      kind: "place",
      population: r.population,
      timezone: r.timezone,
    });
  }

  return results;
}
