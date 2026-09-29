import * as satellite from "satellite.js";
import type { SatelliteRecord, SatSample } from "./types";

/**
 * SGP4 propagation helpers (spec §7.A). All positions here are COMPUTED
 * estimates from orbital elements, never live telemetry, and error grows with
 * element age — the UI labels them accordingly.
 */

/** Propagate one satellite to `date`. Returns null if the propagation fails
 * (decayed object, numerical error, etc.). */
export function propagateAt(rec: SatelliteRecord, date: Date): SatSample | null {
  try {
    const pv = satellite.propagate(rec.satrec, date);
    if (!pv || typeof pv.position === "boolean" || !pv.position) return null;
    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    const longitude = satellite.degreesLong(geo.longitude);
    const latitude = satellite.degreesLat(geo.latitude);
    const altitudeKm = geo.height;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || !Number.isFinite(altitudeKm)) {
      return null;
    }
    let velocityKmS = 0;
    if (pv.velocity && typeof pv.velocity !== "boolean") {
      const { x, y, z } = pv.velocity;
      velocityKmS = Math.sqrt(x * x + y * y + z * z);
    }
    return { longitude, latitude, altitudeKm, velocityKmS };
  } catch {
    return null;
  }
}

/** Orbital period in minutes from the SGP4 mean motion (rad/min). */
export function orbitalPeriodMinutes(rec: SatelliteRecord): number | null {
  const no = rec.satrec.no; // radians per minute
  if (!no || no <= 0) return null;
  return (2 * Math.PI) / no;
}

/** Inclination in degrees. */
export function inclinationDeg(rec: SatelliteRecord): number | null {
  const inclo = rec.satrec.inclo; // radians
  if (typeof inclo !== "number") return null;
  return (inclo * 180) / Math.PI;
}

/**
 * Sample a predicted orbit ground path over one period, centered on `date`.
 * Returns [lon, lat, altMeters, ...] triples for a Cesium polyline. This is a
 * PREDICTED orbit, labeled as such; gaps at propagation failures are skipped.
 */
export function predictedOrbitPath(
  rec: SatelliteRecord,
  date: Date,
  samples = 120,
): number[] {
  const periodMin = orbitalPeriodMinutes(rec);
  if (!periodMin) return [];
  const stepMs = (periodMin * 60 * 1000) / samples;
  const startMs = date.getTime() - (periodMin * 60 * 1000) / 2;
  const out: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const s = propagateAt(rec, new Date(startMs + i * stepMs));
    if (!s) continue;
    out.push(s.longitude, s.latitude, s.altitudeKm * 1000);
  }
  return out;
}
