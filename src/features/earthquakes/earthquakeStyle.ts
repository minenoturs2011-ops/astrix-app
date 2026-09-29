/**
 * Earthquake visual encoding. Magnitude drives point SIZE and depth drives
 * COLOR, and both are always paired with a legend — meaning is never encoded by
 * color alone (spec §24). Depth bands follow the common shallow/intermediate/
 * deep seismology convention.
 */

export type DepthBand = {
  id: string;
  label: string;
  /** inclusive lower bound in km */
  minKm: number;
  color: string;
};

// Shallow quakes are the most hazardous; warm colors draw the eye.
export const DEPTH_BANDS: DepthBand[] = [
  { id: "shallow", label: "0–70 km (shallow)", minKm: 0, color: "#FF737D" },
  { id: "intermediate", label: "70–300 km (intermediate)", minKm: 70, color: "#FFC66D" },
  { id: "deep", label: "300+ km (deep)", minKm: 300, color: "#70A7FF" },
];

export function depthColor(depthKm: number): string {
  if (depthKm >= 300) return DEPTH_BANDS[2].color;
  if (depthKm >= 70) return DEPTH_BANDS[1].color;
  return DEPTH_BANDS[0].color;
}

/** Point pixel size grows with magnitude; unknown magnitude renders small. */
export function magnitudeToPixelSize(mag: number | null): number {
  if (mag === null || Number.isNaN(mag)) return 6;
  // ~6px at M0, ~10px at M2.5, ~22px at M7, capped for very large events.
  return Math.max(6, Math.min(30, 6 + Math.max(0, mag) * 2.6));
}

export const MAGNITUDE_LEGEND = [
  { label: "M2", size: magnitudeToPixelSize(2) },
  { label: "M4", size: magnitudeToPixelSize(4) },
  { label: "M6", size: magnitudeToPixelSize(6) },
];
