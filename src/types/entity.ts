import type { FeedState } from "./layer";

/**
 * Normalized position (spec §14). observedAt (when the source saw it) is kept
 * separate from receivedAt (when TERRA got it) so staleness is honest.
 */
export type NormalizedPosition = {
  entityId: string;
  entityType: string;
  longitude: number;
  latitude: number;
  altitudeMeters?: number;
  observedAt?: string;
  receivedAt: string;
  sourceId: string;
  quality?: "high" | "medium" | "low" | "unknown";
  properties: Record<string, unknown>;
};

/** A single inspector field. `value` absent => the field is genuinely unknown
 * and must not be rendered with an invented value (spec §9, §33). */
export type EntityField = {
  label: string;
  value?: string | number | null;
  unit?: string;
  /** Whether the value was directly observed or estimated/computed (spec §7.B). */
  provenance?: "observed" | "computed" | "estimated";
  mono?: boolean; // render with tabular numerals
};

export type EntityCategory =
  | "place"
  | "aircraft"
  | "satellite"
  | "ship"
  | "earthquake"
  | "wildfire"
  | "weather-station"
  | "camera"
  | "demo";

/**
 * A selectable entity shown in the inspector (spec §9). Type-specific fields go
 * in `fields`; only present values are rendered.
 */
export type TerraEntity = {
  id: string;
  category: EntityCategory;
  name: string;
  longitude: number;
  latitude: number;
  altitudeMeters?: number;
  sourceId: string;
  sourceName: string;
  sourceUrl?: string;
  feedState: FeedState;
  observedAt?: string;
  receivedAt?: string;
  fields: EntityField[];
  /** True when this entity is simulated demo data (spec §2.3). */
  simulated?: boolean;
};
