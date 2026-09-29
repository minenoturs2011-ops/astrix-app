import { z } from "zod";
import type { FeedStatus } from "@/types/layer";
import type { TerraEntity, EntityField } from "@/types/entity";
import type { EarthquakeRecord, QuakeWindow } from "@/features/earthquakes/types";

/**
 * USGS Earthquake provider adapter (spec §14 / §7.E).
 *
 * Real, key-less, public GeoJSON feeds. We validate the payload with Zod,
 * normalize units/coordinates, keep origin time (observedAt) separate from
 * receipt time (receivedAt), and derive an honest FeedStatus from the feed's
 * own `generated` timestamp — never a hardcoded "LIVE" label (spec §18).
 *
 * Attribution: "Earthquake data courtesy of the U.S. Geological Survey."
 * https://www.usgs.gov/programs/earthquake-hazards
 */

const BASE = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary";
const SOURCE_ID = "usgs-earthquakes";
const SOURCE_NAME = "USGS Earthquake Hazards Program";
export const USGS_EXPECTED_REFRESH_SECONDS = 300;

// Coordinates are [lon, lat, depthKm]; depth occasionally missing.
const Geometry = z.object({
  type: z.literal("Point"),
  coordinates: z.array(z.number()).min(2),
});

const Feature = z.object({
  id: z.string(),
  properties: z.object({
    mag: z.number().nullable(),
    place: z.string().nullable(),
    time: z.number().nullable(),
    updated: z.number().nullable(),
    url: z.string(),
    magType: z.string().nullable().optional(),
    type: z.string().optional(),
    title: z.string().nullable().optional(),
    alert: z.string().nullable().optional(),
    tsunami: z.number().optional(),
    status: z.string().optional(),
    sig: z.number().nullable().optional(),
  }),
  geometry: Geometry.nullable(),
});

const FeedSchema = z.object({
  metadata: z.object({
    generated: z.number(),
    title: z.string().optional(),
    count: z.number().optional(),
  }),
  features: z.array(Feature),
});

export type UsgsFeed = z.infer<typeof FeedSchema>;

function magnitudeToString(mag: number | null, magType?: string | null): string | undefined {
  if (mag === null || mag === undefined) return undefined;
  return `${mag.toFixed(1)}${magType ? ` ${magType}` : ""}`;
}

/** Convert one validated feature into an EarthquakeRecord (or null if unusable). */
function normalizeFeature(f: z.infer<typeof Feature>, receivedAtIso: string): EarthquakeRecord | null {
  if (!f.geometry) return null;
  const [lon, lat, depth] = f.geometry.coordinates;
  if (typeof lon !== "number" || typeof lat !== "number") return null;
  const depthKm = typeof depth === "number" ? depth : 0;
  const p = f.properties;
  const observedAt = p.time ? new Date(p.time).toISOString() : undefined;

  const fields: EntityField[] = [];
  const magStr = magnitudeToString(p.mag, p.magType);
  if (magStr) fields.push({ label: "Magnitude", value: magStr, provenance: "observed", mono: true });
  fields.push({ label: "Depth", value: depthKm.toFixed(1), unit: "km", provenance: "observed", mono: true });
  if (p.place) fields.push({ label: "Location", value: p.place });
  if (p.magType) fields.push({ label: "Magnitude type", value: p.magType });
  if (p.status) fields.push({ label: "Review status", value: p.status });
  if (p.alert) fields.push({ label: "PAGER alert", value: p.alert });
  if (p.tsunami === 1)
    fields.push({ label: "Tsunami flag", value: "Yes — see official sources" });
  if (typeof p.sig === "number") fields.push({ label: "Significance", value: p.sig, mono: true });

  const entity: TerraEntity = {
    id: `usgs:${f.id}`,
    category: "earthquake",
    name: p.title ?? magStr ?? "Earthquake",
    longitude: lon,
    latitude: lat,
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    sourceUrl: p.url,
    feedState: "live",
    observedAt,
    receivedAt: receivedAtIso,
    fields,
  };

  return { entity, magnitude: p.mag, depthKm, time: p.time ?? 0 };
}

export type EarthquakeFetchResult = {
  records: EarthquakeRecord[];
  status: FeedStatus;
};

/**
 * Fetch and normalize earthquakes for a time window. Throws on network/HTTP
 * failure so callers can present an offline state; a valid-but-empty feed
 * returns an empty list with a live status.
 */
export async function fetchEarthquakes(
  window: QuakeWindow,
  signal?: AbortSignal,
): Promise<EarthquakeFetchResult> {
  const url = `${BASE}/all_${window}.geojson`;
  const resp = await fetch(url, { signal });
  if (!resp.ok) throw new Error(`USGS feed request failed (${resp.status})`);
  const json = await resp.json();
  const parsed = FeedSchema.safeParse(json);
  if (!parsed.success) throw new Error("USGS feed payload could not be validated.");

  const nowMs = Date.now();
  const receivedAtIso = new Date(nowMs).toISOString();
  const generatedIso = new Date(parsed.data.metadata.generated).toISOString();

  const records: EarthquakeRecord[] = [];
  for (const f of parsed.data.features) {
    const r = normalizeFeature(f, receivedAtIso);
    if (r) records.push(r);
  }

  // Honest freshness: if the feed's own "generated" time is much older than the
  // expected refresh cadence, mark it delayed rather than live (spec §18).
  const ageSeconds = Math.max(0, (nowMs - parsed.data.metadata.generated) / 1000);
  const state = ageSeconds > USGS_EXPECTED_REFRESH_SECONDS * 3 ? "delayed" : "live";
  for (const r of records) r.entity.feedState = state;

  const status: FeedStatus = {
    sourceId: SOURCE_ID,
    state,
    observedAt: generatedIso,
    receivedAt: receivedAtIso,
    lastSuccessfulFetchAt: receivedAtIso,
    expectedRefreshSeconds: USGS_EXPECTED_REFRESH_SECONDS,
    coverageDescription: "Global. Smaller events have regional detection thresholds.",
    message: `${records.length} events (${parsed.data.metadata.title ?? window})`,
  };

  return { records, status };
}
