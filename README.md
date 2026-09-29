# TERRA — Planet-Scale Live Tracking Platform

> Explore the planet through one interactive 3D globe, with selectable live and
> historical data layers.

TERRA is a premium, dark, desktop-first geospatial exploration platform built
around a cinematic 3D Earth. This repository implements **Phase 1 — the globe
foundation** and **Phase 2 — first real data layers**: live **earthquakes
(USGS)**, **weather alerts (NOAA/NWS)**, **satellites (CelesTrak, SGP4)**, and
**wildfires (NASA FIRMS)**.
Zoom in for high-resolution **satellite imagery** and **street maps** (free), with
optional **3D terrain, 3D buildings, and Google Photorealistic 3D Tiles** behind
your own keys. It also ships a one-file **desktop launcher** (a Windows/macOS/Linux
executable) that serves the app locally so the 3D globe renders reliably.

The guiding principle throughout: **never fake coverage, precision, or live
status.** Simulated data is always labeled; real data always carries its source,
timestamp, and known limitations.

---

## What's implemented (Phase 1)

- **Premium dark app shell** — top bar, collapsible/resizable EXPLORE sidebar,
  ENTITY INSPECTOR, and timeline strip, using the TERRA design tokens.
- **Interactive 3D globe** (CesiumJS) — drag to rotate, wheel to zoom, smooth
  camera flight, reset-to-home, cursor coordinate readout, starfield &
  atmosphere. Renders from Cesium's **bundled offline Natural Earth II imagery**,
  so **no Cesium Ion access token is required**.
- **Three display modes** — Natural, Night (dimmed with a *computed* day/night
  terminator — honestly labeled as styled, not licensed city-lights imagery),
  and Analytical (greyscale, high-contrast).
- **Universal place search** — real, key-less **Open-Meteo Geocoding API** plus
  local coordinate parsing (decimal and DMS). Debounced, keyboard-navigable,
  with recent searches and honest empty/error states. Flies the camera to the
  chosen result.
- **Layer registry & searchable catalog** — the full master catalog is listed by
  category with **honest availability** (`Available`, `Planned · Phase 2+`,
  `Needs provider key`). Only layers marked *Available* render data today.
- **Shared entity inspector** — common + type-specific fields, feed-status badge,
  separate observed/received timestamps, live data-age, source & attribution.
  Never renders invented values.
- **Clearly-labeled simulated demo layer** — the only rendering layer in Phase 1.
  It exercises selection, the inspector, and feed-status UI without pretending
  to be real.
- **Responsive layout** — desktop command center adapts to a mobile layout with
  a bottom-sheet inspector and a layers drawer.
- **Accessibility** — keyboard access, visible focus styles, icon-button labels,
  status never encoded by color alone, `prefers-reduced-motion` support, and a
  reduced-effects (low-power) mode.

## What's implemented (Phase 2 — real data layers)

Two real public data layers, wired end-to-end through the provider-adapter
pattern (Zod-validated, normalized, honest freshness, filters, cleanup on
toggle-off):

**Weather alerts — NOAA/NWS (US):**

- Active watches/warnings/advisories from the public, key-less `api.weather.gov`
  feed. Polygons (`Polygon`/`MultiPolygon`) are drawn and coloured by **severity**
  with a legend; a centroid marker keeps small alerts clickable.
- **Honest coverage** — US-only, and alerts that reference NWS zones without an
  inline map shape are counted but not drawn (stated in the UI).
- Severity filter (All / Severe+ / Extreme), live count, and 2-minute polling
  with backoff.
- Inspector: event, severity, urgency, certainty, headline, area, onset/expires,
  instructions, and a link to the official alert. Includes the reminder that a
  visualization is not a substitute for official guidance.

**Wildfires — NASA FIRMS:**

- Near-real-time satellite fire detections (VIIRS / MODIS) from NASA FIRMS, last
  24h, global. CSV is parsed header-driven; points are coloured by **confidence**
  and sized by **fire radiative power**, with a legend.
- Each point is a **thermal anomaly, not a confirmed fire or perimeter** (stated
  in the UI). Inspector: FRP, confidence, brightness, satellite/instrument,
  day/night, and acquisition time (separate from receipt time).
- FIRMS needs a **free MAP_KEY** and sends no CORS headers, so it is proxied
  same-origin (`/api/firms`). The layer shows as "needs key" until you add
  `VITE_FIRMS_MAP_KEY` (see [API keys](#api-keys--where-to-get-them)).

**Satellites — CelesTrak (SGP4):**

- Public, key-less TLE orbital elements from CelesTrak, propagated in-browser
  with `satellite.js` (SGP4). Object groups: Space stations, Brightest, GPS,
  Starlink.
- Positions are **computed estimates, not live telemetry**, and the UI says so;
  accuracy degrades as the element set ages (the epoch age is shown).
- Rendered as GPU point primitives updated ~2×/second; selecting a satellite draws
  its **predicted orbit path** and shows catalog ID, epoch, estimated altitude &
  velocity, inclination, and period.
- CelesTrak is fetched through a same-origin proxy (the dev server and the desktop
  launcher both proxy `/api/celestrak`) because its browser CORS is unreliable.

**Earthquakes — USGS:**

The first real public data layer, wired end-to-end through the provider adapter
pattern:

- **Live earthquakes from USGS** — the public, key-less USGS GeoJSON summary
  feeds. Payload is **Zod-validated**, coordinates/units are normalized (depth in
  km), and **origin time (observed) is kept separate from receipt time**.
- **Honest freshness** — feed status (`LIVE` / `DELAYED` / `STALE` / `OFFLINE`)
  is derived from the feed's own `generated` timestamp, never hardcoded. Polls
  every 5 minutes with exponential backoff on failure, keeping the last data and
  marking it stale/offline rather than blanking or faking it.
- **Filters** — time window (past hour / 24 h / 7 days) and a minimum-magnitude
  slider, with a live result count and empty-state warnings.
- **Encoding + legend** — point **colour = depth** (shallow/intermediate/deep),
  **size = magnitude**, always paired with a legend (never colour alone).
- **Performance** — rendered with Cesium's GPU-backed `PointPrimitiveCollection`
  so hundreds–thousands of events stay smooth.
- **Inspector** — magnitude, depth, origin time, place, review status, PAGER
  alert, tsunami flag, significance; only fields the feed actually provides, with
  a link to the official USGS event page. Attribution: *"Earthquake data courtesy
  of the U.S. Geological Survey."*

### Desktop launcher (recommended — a single executable)

`packaging/` builds a **single self-contained executable** (`TERRA-windows-amd64.exe`,
plus macOS/Linux) that embeds the built web app, serves it on `http://127.0.0.1`,
and opens your browser. This is the most reliable way to run TERRA: because the
app is *served* (not opened as a bare file), CesiumJS can load its web workers
and the 3D globe renders correctly. Live data is fetched over the internet; no
build step or API key is required.

```bash
# Build the Windows .exe (also cross-builds from macOS/Linux):
packaging/build-desktop.sh
# or several targets at once:
TARGETS="windows/amd64 darwin/arm64 linux/amd64" packaging/build-desktop.sh
# → output in packaging/dist-bin/
```

Requires Go 1.24+ and Node. On Windows, just double-click `TERRA-windows-amd64.exe`
and keep the console window open; close it to stop the app.

### Standalone HTML demo

`standalone/terra-earthquakes.html` is a single file that shows the live USGS
earthquakes **and** NOAA/NWS weather alerts, with the base map embedded directly
in the file. **Important:** browsers block CesiumJS's web workers on `file://`,
so opening it by double-click renders the data points but not the 3D globe
surface — the file detects this and shows a notice. To see the full globe, serve
it over http (`python -m http.server` in the `standalone/` folder, then open
`http://localhost:8000/terra-earthquakes.html`) or just use the desktop launcher
above.

## Base maps & 3D detail ("like Google Earth")

Use the **Base map** selector in the top bar. Two options give real detail when
you zoom in, with **no key required**:

- **Satellite** — Esri World Imagery (high-resolution aerial/satellite photos).
- **Streets** — OpenStreetMap (roads, streets, labels).

Plus offline **Natural**, **Night** (computed terminator), and **Analytical**.

For the full Google-Earth experience there are optional upgrades that need **your
own key** (see below). Until a key is present they appear disabled/greyed:

- **3D terrain** and **3D buildings** (Settings → 3D detail) — need a free
  **Cesium Ion** token.
- **Google 3D** base map — Google **Photorealistic 3D Tiles** (textured 3D
  buildings + terrain, i.e. actual Google Earth 3D) — needs a **Google Maps
  Platform** API key.

> Honest note: truly "exactly like Google Earth" is Google's own Photorealistic
> 3D Tiles. That data is Google's and is only available through the Google Maps
> Platform (API key + billing account, with a monthly free allowance) — it can't
> be bundled for free. Everything else above is free and gets you most of the way.

## API keys — where to get them

All keys are optional. TERRA works fully without them; they only add extra detail.
Put them in a `.env` file (copy from `.env.example`). Restrict browser keys by
HTTP referrer in the provider's console.

| Key | Unlocks | Where to get it |
| --- | ------- | --------------- |
| `VITE_CESIUM_ION_TOKEN` | 3D terrain + 3D buildings | Sign in at <https://ion.cesium.com/> → **Access Tokens** → copy the default token (free tier). |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Photorealistic 3D Tiles ("Google 3D") | <https://console.cloud.google.com/> → create/select a project → enable **Map Tiles API** → **Credentials → Create API key** → restrict by HTTP referrer. Monthly free allowance; beyond it is billed. |
| `VITE_FIRMS_MAP_KEY` | Wildfires (NASA FIRMS) | <https://firms.modaps.eosdis.nasa.gov/api/map_key/> → enter your email → get a MAP_KEY instantly (free). |

No key is needed for earthquakes (USGS), weather alerts (NOAA/NWS), satellites
(CelesTrak), place search (Open-Meteo), or the Satellite/Streets base maps.

### Not yet implemented (later phases)

Other real feeds (wildfires, aircraft, ships…), the time machine / historical
playback, saved views, alerts, file import, and the diagnostics panel are
catalogued but not built. See [Roadmap](#roadmap). The catalog UI shows their
status explicitly.

---

## Tech stack

| Concern        | Choice                                        |
| -------------- | --------------------------------------------- |
| Framework      | React 18 + TypeScript + Vite                  |
| 3D globe       | CesiumJS (offline + Esri/OSM/optional Google 3D) |
| Orbits         | satellite.js (SGP4 propagation)               |
| Styling        | Tailwind CSS + TERRA design tokens (CSS vars) |
| State          | Zustand                                        |
| Validation     | Zod (external payload validation)             |
| Tests          | Vitest + Testing Library                      |

---

## Getting started

Requires **Node.js 20+** (developed on Node 22).

```bash
npm install          # install dependencies
npm run dev          # start the dev server at http://localhost:5173
```

No API keys or `.env` are needed for Phase 1.

### Scripts

```bash
npm run dev         # dev server (HMR)
npm run build       # typecheck + production build to dist/
npm run preview     # serve the production build
npm run typecheck   # tsc --noEmit
npm run test        # run the Vitest suite
npm run lint        # ESLint
```

### Configuration

All configuration is optional. Copy `.env.example` to `.env` to customize:

- `VITE_CESIUM_ION_TOKEN` — *optional.* Only needed to unlock high-detail Cesium
  Ion imagery/terrain in a later phase. Leaving it blank uses the bundled offline
  imagery. Get a free token at <https://ion.cesium.com/> (subject to Cesium's terms).
- `VITE_GEOCODE_BASE_URL` — *optional.* Override the geocoding endpoint.

> **Security:** never put private/secret provider keys behind a `VITE_` prefix —
> anything with that prefix is bundled into the public client. Server-side
> proxying for credentialed providers arrives with the API in later phases.

---

## Data sources & attribution

All current sources are key-less and permissively licensed:

| Source | Used for | Attribution / terms |
| ------ | -------- | ------------------- |
| **Natural Earth II** (bundled with CesiumJS) | Base globe imagery | Public domain. <https://www.naturalearthdata.com/> |
| **CesiumJS** | Globe engine | © Cesium. The on-globe Cesium logo credit is retained per Cesium's terms. |
| **Open-Meteo Geocoding API** | Place search | Free, key-less. Place names from GeoNames (CC BY 4.0). <https://open-meteo.com/en/docs/geocoding-api> |
| **USGS Earthquake Hazards Program** | Live earthquakes | "Earthquake data courtesy of the U.S. Geological Survey." Public GeoJSON feeds. <https://earthquake.usgs.gov/> |
| **NOAA / National Weather Service** | Live weather alerts (US) | "Alerts courtesy of NOAA / National Weather Service." Public API. <https://www.weather.gov/documentation/services-web-api> |
| **CelesTrak** | Satellite orbital elements (TLE) | "Orbital element sets courtesy of CelesTrak." Public, proxied for CORS. <https://celestrak.org/> |
| **NASA FIRMS** | Wildfire detections | "Fire detections courtesy of NASA FIRMS." Free MAP_KEY, proxied for CORS. <https://firms.modaps.eosdis.nasa.gov/> |
| **Esri World Imagery** | Satellite base map | "Imagery © Esri and its data providers." Free, attribution required. |
| **OpenStreetMap** | Streets base map | "© OpenStreetMap contributors" (ODbL). Subject to the OSM tile usage policy. |

Other providers (NASA FIRMS, OpenSky, …) are registered in
`src/lib/sources.ts` for later phases. **Their terms, coverage, and
redistribution rules must be re-verified before they are wired into a production
layer.**

---

## Honesty & limitations

- The **only data that renders** in Phase 1 is the *simulated* demo layer, and it
  is labeled as simulated everywhere it appears.
- **Night mode** shows a real computed terminator but **not** licensed
  city-lights imagery; this is stated on-screen.
- **Satellite/aircraft positions** (later phases) will be computed estimates or
  provider-reported values, never presented as exact live telemetry.
- No layer claims coverage it doesn't have; the catalog shows each layer's real
  implementation status.
- TERRA will **never** scan for exposed cameras, bypass access controls, or track
  private individuals.

---

## Project structure

```
src/
├── App.tsx                      # layout shell (panels, responsive, presentation)
├── main.tsx
├── components/
│   ├── globe/                   # Cesium viewer, style modes, overlay
│   ├── layout/                  # top bar, timeline, resizer
│   ├── layers/                  # catalog, layer item, feed-status badge
│   ├── inspector/               # entity inspector
│   ├── search/                  # search bar
│   └── ui/                      # icons
├── lib/                         # geocoding, layer registry, sources, demo data, formatting
├── stores/                      # Zustand stores (UI + layers)
├── types/                       # shared types (layer, entity)
├── hooks/
└── styles/                      # design tokens + global CSS
```

Data/adapter logic is kept separate from UI components so real providers can be
added behind the existing types without rewriting the interface.

---

## Testing

`npm run test` runs unit tests for coordinate parsing, geocoding (incl. schema
validation and failure handling), freshness/formatting, the layer-registry
integrity rules, the demo data, and the layer store. The Cesium globe is verified
via an end-to-end smoke check during development (globe render, search fly-to,
style switching, demo-entity selection, cursor readout, responsive layout).

---

## Roadmap

Phase 1 ✅ Globe foundation ·
Phase 2 ✅ First real public data layers — **earthquakes (USGS)**, **weather
alerts (NOAA/NWS)**, **satellites (CelesTrak)**, and **wildfires (NASA FIRMS)**.
Plus high-detail base maps (Esri satellite, OSM streets) and optional 3D terrain,
3D buildings, and Google Photorealistic 3D Tiles. ·
Phase 3 Unified tracking (aircraft/satellite/maritime, trails, orbit passes) ·
Phase 4 Weather & environment rasters ·
Phase 5 Timeline & history ·
Phase 6 Public cameras & transport ·
Phase 7 Custom data & tools ·
Phase 8 Scale & polish.

Build the platform first; add verified data layers one by one.
