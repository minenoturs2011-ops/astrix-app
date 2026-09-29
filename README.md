# TERRA — Planet-Scale Live Tracking Platform

> Explore the planet through one interactive 3D globe, with selectable live and
> historical data layers.

TERRA is a premium, dark, desktop-first geospatial exploration platform built
around a cinematic 3D Earth. This repository currently implements **Phase 1 —
the globe foundation** from the product specification.

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

### Not yet implemented (later phases)

Real data feeds (earthquakes, weather alerts, wildfires, satellites, aircraft,
ships…), the time machine / historical playback, filters, saved views, alerts,
file import, and the diagnostics panel are catalogued but not built. See
[Roadmap](#roadmap). The catalog UI shows their status explicitly.

---

## Tech stack

| Concern        | Choice                                        |
| -------------- | --------------------------------------------- |
| Framework      | React 18 + TypeScript + Vite                  |
| 3D globe       | CesiumJS (offline Natural Earth II imagery)   |
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

Phase 1 uses only key-less, permissively-licensed sources:

| Source | Used for | Attribution / terms |
| ------ | -------- | ------------------- |
| **Natural Earth II** (bundled with CesiumJS) | Base globe imagery | Public domain. <https://www.naturalearthdata.com/> |
| **CesiumJS** | Globe engine | © Cesium. The on-globe Cesium logo credit is retained per Cesium's terms. |
| **Open-Meteo Geocoding API** | Place search | Free, key-less. Place names from GeoNames (CC BY 4.0). <https://open-meteo.com/en/docs/geocoding-api> |

Additional providers (USGS, NOAA/NWS, NASA FIRMS, CelesTrak, OpenSky, …) are
registered in `src/lib/sources.ts` for later phases. **Their terms, coverage,
and redistribution rules must be re-verified before they are wired into a
production layer.**

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
Phase 2 First real public data layers (earthquakes, weather alerts, wildfires,
satellites) ·
Phase 3 Unified tracking (aircraft/satellite/maritime, trails) ·
Phase 4 Weather & environment rasters ·
Phase 5 Timeline & history ·
Phase 6 Public cameras & transport ·
Phase 7 Custom data & tools ·
Phase 8 Scale & polish.

Build the platform first; add verified data layers one by one.
