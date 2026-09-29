import type { TerraEntity } from "@/types/entity";

/** NWS severity levels, ranked for filtering (spec §11 event severity filter). */
export type AlertSeverity = "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";

export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  Extreme: 4,
  Severe: 3,
  Moderate: 2,
  Minor: 1,
  Unknown: 0,
};

/**
 * A normalized weather-alert record. `rings` are the polygon outer rings
 * ([lon,lat] pairs) precomputed for rendering; `entity` carries the centroid
 * position and inspector fields.
 */
export type AlertRecord = {
  entity: TerraEntity;
  severity: AlertSeverity;
  /** Outer rings for each polygon (Polygon => 1, MultiPolygon => N). Empty when
   * the alert only references NWS zones without an inline shape. */
  rings: number[][][];
  hasGeometry: boolean;
};
