import type { SourceDefinition } from "@/types/layer";

/**
 * Provider/source registry (spec §14). Each entry records real, verifiable
 * providers and whether credentials are required. Terms/coverage MUST be
 * re-verified before a provider is wired into a production layer (spec §33.5–7).
 *
 * Phase 1 uses only two of these: `open-meteo-geocoding` (place search) and the
 * bundled Cesium/Natural Earth II imagery (`natural-earth-ii`). The rest are
 * catalogued here so layers can reference them honestly before implementation.
 */
export const SOURCES: Record<string, SourceDefinition> = {
  "natural-earth-ii": {
    id: "natural-earth-ii",
    name: "Natural Earth II (offline imagery)",
    organization: "Natural Earth / Cesium",
    url: "https://www.naturalearthdata.com/",
    attribution: "Imagery: Natural Earth II — public domain, bundled with CesiumJS.",
    requiresCredentials: false,
    notes: "Low-resolution offline base imagery shipped with CesiumJS. No token required.",
  },
  "cesium-ion": {
    id: "cesium-ion",
    name: "Cesium Ion World Imagery/Terrain",
    organization: "Cesium",
    url: "https://ion.cesium.com/",
    attribution: "© Cesium Ion and imagery/terrain providers.",
    requiresCredentials: true,
    notes: "Optional high-detail imagery/terrain. Requires a free Cesium Ion token; subject to Cesium terms.",
  },
  "open-meteo-geocoding": {
    id: "open-meteo-geocoding",
    name: "Open-Meteo Geocoding API",
    organization: "Open-Meteo",
    url: "https://open-meteo.com/en/docs/geocoding-api",
    attribution: "Place search © Open-Meteo. Names sourced from GeoNames (CC BY 4.0).",
    requiresCredentials: false,
    notes: "Free, key-less, CORS-enabled place search. Subject to Open-Meteo's terms and fair use.",
  },
  "usgs-earthquakes": {
    id: "usgs-earthquakes",
    name: "USGS Earthquake Hazards Program",
    organization: "U.S. Geological Survey",
    url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php",
    attribution: "Earthquake data courtesy of the U.S. Geological Survey.",
    requiresCredentials: false,
    notes: "Public GeoJSON feeds. Planned for Phase 2.",
  },
  "nws-alerts": {
    id: "nws-alerts",
    name: "NOAA / National Weather Service Alerts",
    organization: "NOAA / NWS",
    url: "https://www.weather.gov/documentation/services-web-api",
    attribution: "Weather alerts courtesy of NOAA/National Weather Service.",
    requiresCredentials: false,
    notes: "Public API (US coverage). Planned for Phase 2.",
  },
  "nasa-firms": {
    id: "nasa-firms",
    name: "NASA FIRMS (fire detections)",
    organization: "NASA",
    url: "https://firms.modaps.eosdis.nasa.gov/",
    attribution: "Fire detections courtesy of NASA FIRMS.",
    requiresCredentials: true,
    notes: "Requires a free MAP_KEY. Planned for Phase 2.",
  },
  celestrak: {
    id: "celestrak",
    name: "CelesTrak (orbital elements)",
    organization: "CelesTrak",
    url: "https://celestrak.org/",
    attribution: "Orbital element sets courtesy of CelesTrak.",
    requiresCredentials: false,
    notes: "Public TLE/OMM data. Positions are computed estimates, not live telemetry. Planned for Phase 2/3.",
  },
  opensky: {
    id: "opensky",
    name: "OpenSky Network (aviation)",
    organization: "OpenSky Network",
    url: "https://opensky-network.org/",
    attribution: "Aircraft data © The OpenSky Network.",
    requiresCredentials: true,
    notes: "Anonymous access is heavily rate-limited; redistribution terms apply. Planned for Phase 2/3.",
  },
  "terra-sim": {
    id: "terra-sim",
    name: "TERRA Simulated Demo",
    organization: "TERRA (this app)",
    url: "",
    attribution: "Simulated demonstration data generated locally by TERRA. Not real.",
    requiresCredentials: false,
    notes: "Deterministic fake data to demonstrate selection/inspector flows. Never real coverage.",
  },
};
