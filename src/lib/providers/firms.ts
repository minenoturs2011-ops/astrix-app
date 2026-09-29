import type { FeedStatus } from "@/types/layer";
import type { TerraEntity, EntityField } from "@/types/entity";
import type { FireRecord, FireSource, FireConfidence } from "@/features/fires/types";

/**
 * NASA FIRMS provider adapter (spec §7.E / §14).
 *
 * FIRMS requires a free MAP_KEY and does NOT send CORS headers, so requests go
 * through our same-origin proxy (`/api/firms`, handled by the dev server and the
 * desktop launcher). A detection is a satellite thermal anomaly, NOT a confirmed
 * fire or a perimeter — the UI says so.
 *
 * Attribution: "Fire detections courtesy of NASA FIRMS."
 */

const FIRMS_BASE = (import.meta.env.VITE_FIRMS_BASE as string | undefined) ?? "/api/firms";
const SOURCE_ID = "nasa-firms";
const SOURCE_NAME = "NASA FIRMS";
export const FIRMS_REFRESH_SECONDS = 15 * 60;

function normConfidence(raw: string, source: FireSource): FireConfidence {
  const v = raw?.trim().toLowerCase();
  if (source === "MODIS_NRT") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n >= 80 ? "high" : n >= 30 ? "nominal" : "low";
    return "unknown";
  }
  if (v === "h" || v === "high") return "high";
  if (v === "n" || v === "nominal") return "nominal";
  if (v === "l" || v === "low") return "low";
  return "unknown";
}

/** Parse FIRMS CSV into records. Header-driven so column order changes are safe. */
export function parseFirmsCsv(csv: string, source: FireSource, receivedAtIso: string): FireRecord[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);
  const iLat = idx("latitude");
  const iLon = idx("longitude");
  if (iLat < 0 || iLon < 0) return [];
  const iConf = idx("confidence");
  const iFrp = idx("frp");
  const iBt4 = idx("bright_ti4");
  const iBtModis = idx("brightness");
  const iDate = idx("acq_date");
  const iTime = idx("acq_time");
  const iSat = idx("satellite");
  const iInst = idx("instrument");
  const iDayNight = idx("daynight");

  const records: FireRecord[] = [];
  for (let r = 1; r < lines.length; r++) {
    const c = lines[r].split(",");
    const lat = parseFloat(c[iLat]);
    const lon = parseFloat(c[iLon]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const frp = iFrp >= 0 ? parseFloat(c[iFrp]) : NaN;
    const confidence = iConf >= 0 ? normConfidence(c[iConf], source) : "unknown";
    const brightnessK = iBt4 >= 0 ? parseFloat(c[iBt4]) : iBtModis >= 0 ? parseFloat(c[iBtModis]) : NaN;
    // FIRMS acq_time is HHMM UTC.
    const date = iDate >= 0 ? c[iDate] : "";
    const timeRaw = iTime >= 0 ? c[iTime].padStart(4, "0") : "";
    const observedAt =
      date && timeRaw.length === 4
        ? `${date}T${timeRaw.slice(0, 2)}:${timeRaw.slice(2)}:00Z`
        : undefined;

    const fields: EntityField[] = [];
    if (Number.isFinite(frp)) fields.push({ label: "Fire radiative power", value: frp.toFixed(1), unit: "MW", provenance: "observed", mono: true });
    fields.push({ label: "Confidence", value: confidence });
    if (Number.isFinite(brightnessK)) fields.push({ label: "Brightness", value: brightnessK.toFixed(1), unit: "K", provenance: "observed", mono: true });
    if (iSat >= 0 && c[iSat]) fields.push({ label: "Satellite", value: c[iSat] });
    if (iInst >= 0 && c[iInst]) fields.push({ label: "Instrument", value: c[iInst] });
    if (iDayNight >= 0 && c[iDayNight]) fields.push({ label: "Day/Night", value: c[iDayNight] === "D" ? "Day" : "Night" });

    const entity: TerraEntity = {
      id: `firms:${source}:${lat.toFixed(4)},${lon.toFixed(4)},${date}${timeRaw}`,
      category: "wildfire",
      name: "Fire detection",
      longitude: lon,
      latitude: lat,
      sourceId: SOURCE_ID,
      sourceName: SOURCE_NAME,
      sourceUrl: "https://firms.modaps.eosdis.nasa.gov/",
      feedState: "live",
      observedAt,
      receivedAt: receivedAtIso,
      fields,
    };
    records.push({ entity, frp: Number.isFinite(frp) ? frp : null, confidence, brightnessK: Number.isFinite(brightnessK) ? brightnessK : null });
  }
  return records;
}

export type FireFetchResult = { records: FireRecord[]; status: FeedStatus };

/**
 * Fetch active fire detections. Requires a FIRMS MAP_KEY (VITE_FIRMS_MAP_KEY).
 * Throws with a clear message when the key is missing/invalid or the request
 * fails, so the UI can prompt the user.
 */
export async function fetchFires(
  source: FireSource,
  dayRange = 1,
  signal?: AbortSignal,
): Promise<FireFetchResult> {
  const key = import.meta.env.VITE_FIRMS_MAP_KEY as string | undefined;
  if (!key) throw new Error("No FIRMS MAP_KEY configured. Add VITE_FIRMS_MAP_KEY to enable wildfires.");

  const url = `${FIRMS_BASE}/api/area/csv/${key}/${source}/world/${dayRange}`;
  const resp = await fetch(url, { signal });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`FIRMS request failed (${resp.status})`);
  if (/invalid map_?key/i.test(text)) throw new Error("FIRMS rejected the MAP_KEY (invalid or expired).");

  const receivedAtIso = new Date().toISOString();
  const records = parseFirmsCsv(text, source, receivedAtIso);

  const status: FeedStatus = {
    sourceId: SOURCE_ID,
    state: "live",
    receivedAt: receivedAtIso,
    lastSuccessfulFetchAt: receivedAtIso,
    expectedRefreshSeconds: FIRMS_REFRESH_SECONDS,
    coverageDescription: "Global satellite thermal detections (near real-time), last 24h.",
    message: `${records.length} detections (${source})`,
  };
  return { records, status };
}
