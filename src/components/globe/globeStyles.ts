import type { BaseMapId } from "./baseMaps";

/** Offline style family that adjusts the bundled base imagery. */
export type OfflineStyleId = "natural" | "night" | "analytical";

/**
 * Globe display modes (spec §5). All three are driven from Cesium's bundled
 * offline Natural Earth II imagery by adjusting real ImageryLayer properties
 * (brightness/saturation/gamma) plus scene lighting/atmosphere — no external
 * imagery or token required.
 *
 * NOTE: "Night" is a *styled* dim view with a real computed day/night
 * terminator (lighting). It does NOT show licensed city-lights imagery, so it
 * must not be presented as real night-lights data.
 */
export type GlobeStyleConfig = {
  label: string;
  description: string;
  imagery: {
    brightness: number;
    saturation: number;
    contrast: number;
    gamma: number;
    hue: number;
  };
  /** Cesium Globe.baseColor as CSS hex (shown where imagery is absent). */
  baseColorHex: string;
  enableLighting: boolean;
  showAtmosphere: boolean;
  /** Whether the styled note applies (e.g. night is styled, not real lights). */
  styledNote?: string;
};

export const GLOBE_STYLES: Record<OfflineStyleId, GlobeStyleConfig> = {
  natural: {
    label: "Natural",
    description: "Natural Earth II imagery with restrained overlays.",
    imagery: { brightness: 1.0, saturation: 1.05, contrast: 1.02, gamma: 1.0, hue: 0 },
    baseColorHex: "#0a1626",
    enableLighting: false,
    showAtmosphere: true,
  },
  night: {
    label: "Night",
    description: "Dimmed globe with a computed day/night terminator.",
    imagery: { brightness: 0.32, saturation: 0.55, contrast: 1.1, gamma: 0.85, hue: 0.0 },
    baseColorHex: "#050a12",
    enableLighting: true,
    showAtmosphere: true,
    styledNote:
      "Styled night view with a computed terminator. Not licensed city-lights imagery.",
  },
  analytical: {
    label: "Analytical",
    description: "Muted greyscale terrain for high-contrast data layers.",
    imagery: { brightness: 0.7, saturation: 0.0, contrast: 1.15, gamma: 1.05, hue: 0 },
    baseColorHex: "#0c1017",
    enableLighting: false,
    showAtmosphere: false,
  },
};

/** Which offline style adjustment applies for a given base map. Satellite and
 * streets render their own imagery, so they use neutral ("natural") adjustments. */
export function offlineStyleFor(baseMap: BaseMapId): GlobeStyleConfig {
  if (baseMap === "night") return GLOBE_STYLES.night;
  if (baseMap === "analytical") return GLOBE_STYLES.analytical;
  return GLOBE_STYLES.natural;
}
