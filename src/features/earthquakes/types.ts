import type { TerraEntity } from "@/types/entity";

/** USGS feed time windows (spec §7.E / §11 event filters). */
export type QuakeWindow = "hour" | "day" | "week";

/**
 * A normalized earthquake record. The presentation `entity` is kept clean and
 * generic; raw metrics used for styling/filtering live alongside it so the
 * shared TerraEntity type doesn't accrue layer-specific fields.
 */
export type EarthquakeRecord = {
  entity: TerraEntity;
  magnitude: number | null;
  depthKm: number;
  time: number; // origin time, ms epoch
};

export const QUAKE_WINDOW_LABELS: Record<QuakeWindow, string> = {
  hour: "Past hour",
  day: "Past 24 hours",
  week: "Past 7 days",
};
