import type { FireConfidence } from "./types";

/** Confidence colour (paired with a legend/label — never colour alone, §24). */
export const CONFIDENCE_COLORS: Record<FireConfidence, string> = {
  high: "#FF737D",
  nominal: "#FFC66D",
  low: "#FFE29A",
  unknown: "#8899aa",
};

export function confidenceColor(c: FireConfidence): string {
  return CONFIDENCE_COLORS[c];
}

/** Point size scales with fire radiative power (MW). */
export function frpToPixelSize(frp: number | null): number {
  if (frp === null || Number.isNaN(frp)) return 6;
  return Math.max(6, Math.min(22, 6 + Math.sqrt(Math.max(0, frp)) * 1.6));
}

export const CONFIDENCE_LEGEND: { label: string; color: string }[] = [
  { label: "High confidence", color: CONFIDENCE_COLORS.high },
  { label: "Nominal", color: CONFIDENCE_COLORS.nominal },
  { label: "Low", color: CONFIDENCE_COLORS.low },
];
