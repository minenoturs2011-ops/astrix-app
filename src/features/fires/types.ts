import type { TerraEntity } from "@/types/entity";

/** NASA FIRMS satellite products (spec §7.E). NRT = near-real-time. */
export type FireSource = "VIIRS_SNPP_NRT" | "VIIRS_NOAA20_NRT" | "MODIS_NRT";

export const FIRE_SOURCES: { id: FireSource; label: string }[] = [
  { id: "VIIRS_NOAA20_NRT", label: "VIIRS (NOAA-20)" },
  { id: "VIIRS_SNPP_NRT", label: "VIIRS (Suomi NPP)" },
  { id: "MODIS_NRT", label: "MODIS" },
];

/** Confidence normalized across products (VIIRS uses l/n/h; MODIS uses 0-100). */
export type FireConfidence = "low" | "nominal" | "high" | "unknown";

export type FireRecord = {
  entity: TerraEntity;
  /** Fire radiative power (MW). */
  frp: number | null;
  confidence: FireConfidence;
  brightnessK: number | null;
};
