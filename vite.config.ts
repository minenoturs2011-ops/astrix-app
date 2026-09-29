/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";
import { fileURLToPath, URL } from "node:url";

// vite-plugin-cesium copies Cesium's static assets (including the bundled
// offline Natural Earth II imagery) into the build and sets CESIUM_BASE_URL,
// so the globe renders with no Cesium Ion access token required.
export default defineConfig({
  plugins: [react(), cesium()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
