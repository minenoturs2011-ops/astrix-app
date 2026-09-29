import type { SatRec } from "satellite.js";

/** CelesTrak object groups we expose (spec §7.A). Kept small by default for
 * performance; larger constellations are opt-in with a warning. */
export type SatGroup = "stations" | "visual" | "gps-ops" | "starlink";

export const SAT_GROUPS: { id: SatGroup; label: string; note: string }[] = [
  { id: "stations", label: "Space stations", note: "ISS and crewed/related objects (small set)." },
  { id: "visual", label: "Brightest", note: "~150 brightest objects visible to the naked eye." },
  { id: "gps-ops", label: "GPS", note: "Operational GPS constellation." },
  { id: "starlink", label: "Starlink", note: "Large constellation — may be thousands of objects." },
];

/** A satellite with its parsed SGP4 record. Positions are COMPUTED from these
 * orbital elements (not live telemetry) and degrade as the epoch ages. */
export type SatelliteRecord = {
  id: string; // `sat:<norad>`
  noradId: string;
  name: string;
  satrec: SatRec;
  epoch: Date;
  group: SatGroup;
};

/** A propagated position + derived quantities at a given time. */
export type SatSample = {
  longitude: number;
  latitude: number;
  altitudeKm: number;
  velocityKmS: number;
};
