import { z } from "zod";
import type { FeedStatus } from "@/types/layer";
import type { TerraEntity, EntityField } from "@/types/entity";
import type { AlertRecord, AlertSeverity } from "@/features/alerts/types";

/**
 * NOAA / National Weather Service active-alerts provider adapter (spec §7.E / §14).
 *
 * Real, key-less public API (US coverage). Payloads are Zod-validated. Many
 * alerts reference NWS forecast zones without an inline map shape; those are
 * counted honestly but cannot be drawn as polygons (spec coverage honesty §13).
 *
 * A visualization is never a substitute for official emergency instructions
 * (spec §7.E) — the inspector links to the official alert.
 *
 * Attribution: "Alerts courtesy of NOAA / National Weather Service."
 */

const URL = "https://api.weather.gov/alerts/active";
const SOURCE_ID = "nws-alerts";
const SOURCE_NAME = "NOAA / National Weather Service";
export const NWS_EXPECTED_REFRESH_SECONDS = 120;

const Geometry = z
  .object({
    type: z.enum(["Polygon", "MultiPolygon"]),
    coordinates: z.array(z.any()),
  })
  .nullable();

const Feature = z.object({
  id: z.string(),
  geometry: Geometry,
  properties: z.object({
    event: z.string().nullable().optional(),
    severity: z.string().nullable().optional(),
    certainty: z.string().nullable().optional(),
    urgency: z.string().nullable().optional(),
    headline: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    instruction: z.string().nullable().optional(),
    areaDesc: z.string().nullable().optional(),
    senderName: z.string().nullable().optional(),
    onset: z.string().nullable().optional(),
    effective: z.string().nullable().optional(),
    expires: z.string().nullable().optional(),
    ends: z.string().nullable().optional(),
  }),
});

const FeedSchema = z.object({
  updated: z.string().optional(),
  features: z.array(Feature),
});

const VALID_SEVERITIES: AlertSeverity[] = ["Extreme", "Severe", "Moderate", "Minor", "Unknown"];
function normSeverity(s?: string | null): AlertSeverity {
  return VALID_SEVERITIES.includes(s as AlertSeverity) ? (s as AlertSeverity) : "Unknown";
}

/** Extract outer rings ([lon,lat] pairs) from Polygon/MultiPolygon geometry. */
function outerRings(geom: z.infer<typeof Geometry>): number[][][] {
  if (!geom) return [];
  try {
    if (geom.type === "Polygon") {
      const ring = (geom.coordinates as number[][][])[0];
      return ring ? [ring] : [];
    }
    if (geom.type === "MultiPolygon") {
      return (geom.coordinates as number[][][][]).map((poly) => poly[0]).filter(Boolean);
    }
  } catch {
    /* malformed geometry — treat as no shape */
  }
  return [];
}

function centroid(ring: number[][]): [number, number] {
  let x = 0;
  let y = 0;
  for (const c of ring) {
    x += c[0];
    y += c[1];
  }
  return [x / ring.length, y / ring.length];
}

function isoOrUndefined(s?: string | null): string | undefined {
  if (!s) return undefined;
  const t = Date.parse(s);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

function normalize(f: z.infer<typeof Feature>, receivedAtIso: string): AlertRecord {
  const p = f.properties;
  const rings = outerRings(f.geometry);
  const hasGeometry = rings.length > 0;
  const [lon, lat] = hasGeometry ? centroid(rings[0]) : [NaN, NaN];
  const severity = normSeverity(p.severity);

  const fields: EntityField[] = [];
  if (p.event) fields.push({ label: "Event", value: p.event });
  fields.push({ label: "Severity", value: severity });
  if (p.urgency) fields.push({ label: "Urgency", value: p.urgency });
  if (p.certainty) fields.push({ label: "Certainty", value: p.certainty });
  if (p.headline) fields.push({ label: "Headline", value: p.headline });
  if (p.areaDesc) fields.push({ label: "Area", value: p.areaDesc });
  if (p.onset) fields.push({ label: "Onset", value: isoOrUndefined(p.onset) });
  if (p.expires) fields.push({ label: "Expires", value: isoOrUndefined(p.expires) });
  if (p.instruction) fields.push({ label: "Instructions", value: p.instruction });

  const entity: TerraEntity = {
    id: `nws:${f.id}`,
    category: "weather-alert",
    name: p.event ?? "Weather alert",
    longitude: hasGeometry ? lon : 0,
    latitude: hasGeometry ? lat : 0,
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    sourceUrl: `https://api.weather.gov/alerts/${encodeURIComponent(f.id)}`,
    feedState: "live",
    observedAt: isoOrUndefined(p.onset) ?? isoOrUndefined(p.effective),
    receivedAt: receivedAtIso,
    fields,
  };

  return { entity, severity, rings, hasGeometry };
}

export type AlertFetchResult = {
  records: AlertRecord[];
  zoneOnlyCount: number;
  status: FeedStatus;
};

/**
 * Fetch and normalize active NWS alerts. Throws on network/HTTP/validation
 * failure. No custom headers are sent (keeps the request CORS-simple; the API
 * returns GeoJSON by default).
 */
export async function fetchAlerts(signal?: AbortSignal): Promise<AlertFetchResult> {
  const resp = await fetch(URL, { signal });
  if (!resp.ok) throw new Error(`NWS alerts request failed (${resp.status})`);
  const json = await resp.json();
  const parsed = FeedSchema.safeParse(json);
  if (!parsed.success) throw new Error("NWS alerts payload could not be validated.");

  const nowMs = Date.now();
  const receivedAtIso = new Date(nowMs).toISOString();
  const records = parsed.data.features.map((f) => normalize(f, receivedAtIso));
  const zoneOnlyCount = records.filter((r) => !r.hasGeometry).length;

  const generatedMs = parsed.data.updated ? Date.parse(parsed.data.updated) : nowMs;
  const ageSeconds = Math.max(0, (nowMs - generatedMs) / 1000);
  const state = ageSeconds > NWS_EXPECTED_REFRESH_SECONDS * 5 ? "delayed" : "live";
  for (const r of records) r.entity.feedState = state;

  const status: FeedStatus = {
    sourceId: SOURCE_ID,
    state,
    observedAt: Number.isNaN(generatedMs) ? undefined : new Date(generatedMs).toISOString(),
    receivedAt: receivedAtIso,
    lastSuccessfulFetchAt: receivedAtIso,
    expectedRefreshSeconds: NWS_EXPECTED_REFRESH_SECONDS,
    coverageDescription: "United States only (NOAA/NWS).",
    message: `${records.length} active alerts (${zoneOnlyCount} zone-only, no inline shape)`,
  };

  return { records, zoneOnlyCount, status };
}
