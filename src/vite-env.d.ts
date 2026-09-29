/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CESIUM_ION_TOKEN?: string;
  readonly VITE_GEOCODE_BASE_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
