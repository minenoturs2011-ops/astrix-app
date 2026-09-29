/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CESIUM_ION_TOKEN?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_GEOCODE_BASE_URL?: string;
  readonly VITE_CELESTRAK_BASE?: string;
  readonly VITE_FIRMS_MAP_KEY?: string;
  readonly VITE_FIRMS_BASE?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
