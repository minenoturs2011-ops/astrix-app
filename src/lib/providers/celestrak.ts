import * as satellite from "satellite.js";
import type { FeedStatus } from "@/types/layer";
import type { SatelliteRecord, SatGroup } from "@/features/satellites/types";

/**
 * CelesTrak provider adapter (spec §7.A / §14).
 *
 * Real, key-less public orbital element sets (TLE). We parse the 3-line TLE
 * format and build SGP4 records with satellite.js. Positions are COMPUTED from
 * these elements (not live telemetry) and degrade with element age; the epoch
 * and source are surfaced in the UI.
 *
 * Attribution: "Orbital element sets courtesy of CelesTrak."
 */

// Served through our own origin (vite dev proxy / desktop launcher) to avoid
// CelesTrak's unreliable browser CORS (spec §15). Override with VITE_CELESTRAK_BASE.
const BASE = (import.meta.env.VITE_CELESTRAK_BASE as string | undefined) ?? "/api/celestrak";
const SOURCE_ID = "celestrak";
export const CELESTRAK_REFRESH_SECONDS = 3 * 60 * 60; // TLEs update slowly

/** Parse TLE epoch (YYDDD.DDDD in line 1, cols 19-32) into a Date. */
function parseTleEpoch(line1: string): Date {
  const raw = line1.substring(18, 32).trim();
  const yy = parseInt(raw.substring(0, 2), 10);
  const year = yy < 57 ? 2000 + yy : 1900 + yy;
  const doy = parseFloat(raw.substring(2));
  const d = new Date(Date.UTC(year, 0, 1));
  d.setUTCMilliseconds((doy - 1) * 86400000);
  return d;
}

export type SatelliteFetchResult = {
  records: SatelliteRecord[];
  status: FeedStatus;
};

/**
 * Fetch and parse a CelesTrak group into SGP4 records. Throws on network/HTTP
 * failure or an empty/invalid response so callers can show an offline state.
 */
export async function fetchSatellites(
  group: SatGroup,
  signal?: AbortSignal,
): Promise<SatelliteFetchResult> {
  const url = `${BASE}?GROUP=${encodeURIComponent(group)}&FORMAT=tle`;
  const resp = await fetch(url, { signal });
  if (!resp.ok) throw new Error(`CelesTrak request failed (${resp.status})`);
  const text = await resp.text();
  // CelesTrak returns an HTML error body (not TLE) when a group is invalid/empty.
  if (/<html/i.test(text) || text.trim().length === 0) {
    throw new Error("CelesTrak returned no orbital elements for this group.");
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const records: SatelliteRecord[] = [];
  for (let i = 0; i + 2 < lines.length || i + 2 === lines.length; i += 3) {
    const name = lines[i]?.trim();
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (!name || !l1 || !l2 || !l1.startsWith("1 ") || !l2.startsWith("2 ")) continue;
    let satrec;
    try {
      satrec = satellite.twoline2satrec(l1, l2);
    } catch {
      continue;
    }
    if (!satrec || satrec.error !== 0) continue;
    const noradId = l2.substring(2, 7).trim();
    records.push({
      id: `sat:${noradId}`,
      noradId,
      name,
      satrec,
      epoch: parseTleEpoch(l1),
      group,
    });
  }

  if (records.length === 0) throw new Error("No valid orbital elements parsed.");

  const receivedAtIso = new Date().toISOString();
  // Freshness of the *catalog*: how old is the newest element set.
  const newestEpoch = records.reduce((max, r) => Math.max(max, r.epoch.getTime()), 0);
  const ageHours = (Date.now() - newestEpoch) / 3_600_000;
  const state = ageHours > 72 ? "delayed" : "live";

  const status: FeedStatus = {
    sourceId: SOURCE_ID,
    state,
    observedAt: new Date(newestEpoch).toISOString(),
    receivedAt: receivedAtIso,
    lastSuccessfulFetchAt: receivedAtIso,
    expectedRefreshSeconds: CELESTRAK_REFRESH_SECONDS,
    coverageDescription: "Publicly cataloged objects. Positions are computed estimates, not telemetry.",
    message: `${records.length} objects (newest element set ${ageHours.toFixed(0)}h old)`,
  };

  return { records, status };
}
