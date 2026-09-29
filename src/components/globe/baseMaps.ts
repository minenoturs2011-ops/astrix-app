/**
 * Base-map options (spec §5 globe styling + §14 provider strategy).
 *
 * Free options need no key and give real detail when zooming in:
 *   - natural      offline Natural Earth II (bundled, no network)
 *   - satellite    Esri World Imagery — high-resolution aerial/satellite
 *   - streets      OpenStreetMap — roads, streets, labels
 *   - night        offline, dimmed, computed terminator (styled)
 *   - analytical   offline greyscale, high-contrast
 *
 * Keyed options (config path only until credentials are provided — spec §33):
 *   - google3d     Google Photorealistic 3D Tiles (the true "Google Earth" 3D;
 *                  requires a Google Maps Platform API key)
 *
 * Terrain and 3D buildings are separate toggles that require a Cesium Ion token.
 */
export type BaseMapId = "natural" | "satellite" | "streets" | "night" | "analytical" | "google3d";

export type BaseMapKind = "offline" | "esri" | "osm" | "google3d";

export type BaseMapDef = {
  id: BaseMapId;
  label: string;
  kind: BaseMapKind;
  description: string;
  /** null = free; otherwise the capability required. */
  requires: null | "google";
};

export const BASE_MAPS: BaseMapDef[] = [
  { id: "natural", label: "Natural", kind: "offline", description: "Offline Natural Earth II imagery.", requires: null },
  { id: "satellite", label: "Satellite", kind: "esri", description: "High-resolution aerial imagery (Esri World Imagery). Zoom in for real detail.", requires: null },
  { id: "streets", label: "Streets", kind: "osm", description: "Roads, streets, and labels (OpenStreetMap).", requires: null },
  { id: "night", label: "Night", kind: "offline", description: "Dimmed globe with a computed day/night terminator.", requires: null },
  { id: "analytical", label: "Analytical", kind: "offline", description: "Muted greyscale for high-contrast data layers.", requires: null },
  { id: "google3d", label: "Google 3D", kind: "google3d", description: "Google Photorealistic 3D Tiles — buildings & terrain, like Google Earth. Requires a Google Maps Platform API key.", requires: "google" },
];

/** Runtime capabilities derived from env keys (never contain the secret value). */
export const CAPS = {
  ion: Boolean(import.meta.env.VITE_CESIUM_ION_TOKEN),
  google: Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY),
  firms: Boolean(import.meta.env.VITE_FIRMS_MAP_KEY),
};

export type Capability = keyof typeof CAPS;

export function baseMapAvailable(def: BaseMapDef): boolean {
  if (def.requires === "google") return CAPS.google;
  return true;
}
