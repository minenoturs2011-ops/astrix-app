import type { AlertSeverity } from "./types";

/**
 * Severity colour encoding, always paired with a legend/label (never colour
 * alone, spec §24).
 */
export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  Extreme: "#FF737D",
  Severe: "#FFC66D",
  Moderate: "#A78BFA",
  Minor: "#55D6E8",
  Unknown: "#8899aa",
};

export function severityColor(sev: string): string {
  return SEVERITY_COLORS[(sev as AlertSeverity)] ?? SEVERITY_COLORS.Unknown;
}

export const SEVERITY_LEGEND: { label: string; color: string }[] = [
  { label: "Extreme", color: SEVERITY_COLORS.Extreme },
  { label: "Severe", color: SEVERITY_COLORS.Severe },
  { label: "Moderate", color: SEVERITY_COLORS.Moderate },
  { label: "Minor / Unknown", color: SEVERITY_COLORS.Minor },
];
