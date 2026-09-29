import { useEffect, useRef } from "react";
import {
  Viewer,
  ImageryLayer,
  TileMapServiceImageryProvider,
  buildModuleUrl,
  Ion,
  Color,
  Cartesian3,
  Cartographic,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  CallbackPositionProperty,
  NearFarScalar,
  HeightReference,
  Cartesian2,
  Entity as CesiumEntity,
  PointPrimitiveCollection,
  type PointPrimitive,
  ArcGisMapServerImageryProvider,
  OpenStreetMapImageryProvider,
  EllipsoidTerrainProvider,
  createWorldTerrainAsync,
  createOsmBuildingsAsync,
  createGooglePhotorealistic3DTileset,
  type Cesium3DTileset,
  defined,
} from "cesium";
import { useUiStore } from "@/stores/useUiStore";
import { useLayerStore } from "@/stores/useLayerStore";
import { useEarthquakeStore } from "@/stores/useEarthquakeStore";
import { useAlertStore } from "@/stores/useAlertStore";
import { useSatelliteStore } from "@/stores/useSatelliteStore";
import { offlineStyleFor } from "./globeStyles";
import { CAPS } from "./baseMaps";
import { getDemoEntities } from "@/lib/demoData";
import { depthColor, magnitudeToPixelSize } from "@/features/earthquakes/earthquakeStyle";
import { severityColor } from "@/features/alerts/alertStyle";
import { SEVERITY_RANK } from "@/features/alerts/types";
import { propagateAt, predictedOrbitPath, orbitalPeriodMinutes, inclinationDeg } from "@/features/satellites/propagate";
import type { SatelliteRecord } from "@/features/satellites/types";
import type { TerraEntity, EntityField } from "@/types/entity";

const HOME_VIEW = { lon: 12, lat: 25, height: 22_000_000 };

/** Build a satellite inspector entity from computed (SGP4) values at `now`. */
function buildSatelliteEntity(rec: SatelliteRecord, now: Date): TerraEntity | null {
  const s = propagateAt(rec, now);
  if (!s) return null;
  const period = orbitalPeriodMinutes(rec);
  const incl = inclinationDeg(rec);
  const fields: EntityField[] = [
    { label: "Catalog (NORAD) ID", value: rec.noradId, mono: true },
    { label: "Element-set epoch", value: rec.epoch.toISOString().slice(0, 19).replace("T", " ") + "Z", mono: true },
    { label: "Est. altitude", value: Math.round(s.altitudeKm), unit: "km", provenance: "computed", mono: true },
    { label: "Est. velocity", value: s.velocityKmS.toFixed(2), unit: "km/s", provenance: "computed", mono: true },
  ];
  if (incl !== null) fields.push({ label: "Inclination", value: incl.toFixed(1), unit: "°", provenance: "computed", mono: true });
  if (period !== null) fields.push({ label: "Orbital period", value: period.toFixed(1), unit: "min", provenance: "computed", mono: true });
  fields.push({ label: "Object group", value: rec.group });

  const nowIso = now.toISOString();
  return {
    id: rec.id,
    category: "satellite",
    name: rec.name,
    longitude: s.longitude,
    latitude: s.latitude,
    altitudeMeters: s.altitudeKm * 1000,
    sourceId: "celestrak",
    sourceName: "CelesTrak (orbital elements)",
    sourceUrl: `https://celestrak.org/NORAD/elements/`,
    feedState: "live",
    observedAt: rec.epoch.toISOString(),
    receivedAt: nowIso,
    fields,
  };
}

// Optional Ion token only enables future high-detail terrain/imagery. Phase 1
// renders entirely from bundled offline imagery, so this stays empty by default.
const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined;
if (ionToken) Ion.defaultAccessToken = ionToken;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function GlobeView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  // Latest simulated demo snapshot, refreshed each clock tick.
  const demoSnapshot = useRef<TerraEntity[]>([]);
  const demoEntityIds = useRef<Set<string>>(new Set());
  // Earthquake point primitives + id→entity lookup for selection.
  const quakeCollection = useRef<PointPrimitiveCollection | null>(null);
  const quakeLookup = useRef<Map<string, TerraEntity>>(new Map());
  // Weather-alert entities (polygons + centroid points) + lookup.
  const alertEntityIds = useRef<Set<string>>(new Set());
  const alertLookup = useRef<Map<string, TerraEntity>>(new Map());
  // Satellites: point primitives keyed by id, propagated each tick.
  const satCollection = useRef<PointPrimitiveCollection | null>(null);
  const satPrimById = useRef<Map<string, PointPrimitive>>(new Map());
  const satRecordsRef = useRef<SatelliteRecord[]>([]);
  const satEnabledRef = useRef(false);
  const lastSatUpdate = useRef(0);
  const orbitEntityId = useRef<string | null>(null);
  // Base-map imagery overlay + optional 3D tilesets.
  const detailLayer = useRef<ImageryLayer | null>(null);
  const google3dTileset = useRef<Cesium3DTileset | null>(null);
  const buildingsTileset = useRef<Cesium3DTileset | null>(null);

  // Read stores imperatively inside effects to avoid re-creating the viewer.
  const setCursor = useUiStore((s) => s.setCursor);
  const select = useUiStore((s) => s.select);

  // ── Create the viewer once ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    let handler: ScreenSpaceEventHandler | undefined;
    let tickListener: (() => void) | undefined;

    const baseLayer = ImageryLayer.fromProviderAsync(
      TileMapServiceImageryProvider.fromUrl(buildModuleUrl("Assets/Textures/NaturalEarthII")),
      {},
    );

    const viewer = new Viewer(containerRef.current, {
      baseLayer,
      baseLayerPicker: false,
      geocoder: false, // we provide our own search (Cesium's needs a token)
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      infoBox: false, // our React inspector replaces it
      selectionIndicator: false,
      requestRenderMode: false,
    });
    if (disposed) {
      viewer.destroy();
      return;
    }
    viewerRef.current = viewer;

    // Handle for debugging / end-to-end tests. Exposed in dev, or when the page
    // is opened with ?debug=1. Read-only convenience; exposes no secrets.
    const debugFlag =
      typeof window !== "undefined" && window.location.search.includes("debug");
    if (import.meta.env.DEV || debugFlag) {
      (window as unknown as { __terraViewer?: Viewer }).__terraViewer = viewer;
    }

    // Cinematic defaults.
    viewer.scene.backgroundColor = Color.fromCssColorString("#04060a");
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.fog.enabled = true;
    viewer.scene.highDynamicRange = false;
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(HOME_VIEW.lon, HOME_VIEW.lat, HOME_VIEW.height),
    });

    // Cursor coordinate readout (spec §12).
    handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement: ScreenSpaceEventHandler.MotionEvent) => {
      const cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
      if (cartesian) {
        const carto = Cartographic.fromCartesian(cartesian);
        setCursor({
          longitude: CesiumMath.toDegrees(carto.longitude),
          latitude: CesiumMath.toDegrees(carto.latitude),
        });
      } else {
        setCursor(null);
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // Selection: click an entity to select; click empty space to deselect.
    handler.setInputAction((click: ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(click.position);
      if (defined(picked)) {
        // Demo entities and weather-alert polygons/points are Cesium Entities
        // carrying a terraId property.
        if (picked.id instanceof CesiumEntity && picked.id.properties?.terraId) {
          const id = picked.id.properties.terraId.getValue(viewer.clock.currentTime) as string;
          const entity = demoSnapshot.current.find((e) => e.id === id) ?? alertLookup.current.get(id);
          if (entity) {
            select(entity);
            return;
          }
        }
        // Earthquake & satellite points are primitives whose id is a plain
        // { terraId } object.
        const rawId = picked.id;
        if (rawId && typeof rawId === "object" && "terraId" in rawId) {
          const id = (rawId as { terraId: string }).terraId;
          const quake = quakeLookup.current.get(id);
          if (quake) {
            select(quake);
            return;
          }
          const satRec = satRecordsRef.current.find((r) => r.id === id);
          if (satRec) {
            const ent = buildSatelliteEntity(satRec, new Date());
            if (ent) {
              select(ent);
              return;
            }
          }
        }
      }
      select(null);
    }, ScreenSpaceEventType.LEFT_CLICK);

    // Keep the simulated demo snapshot fresh each tick (single compute/tick).
    tickListener = () => {
      demoSnapshot.current = getDemoEntities(Date.now());
      // Refresh inspector data for a currently-selected demo entity.
      const sel = useUiStore.getState().selected;
      if (sel?.simulated) {
        const fresh = demoSnapshot.current.find((e) => e.id === sel.id);
        if (fresh) useUiStore.setState({ selected: fresh });
      }

      // Propagate satellites (throttled to ~500ms; positions are computed).
      if (satEnabledRef.current && satCollection.current) {
        const nowMs = Date.now();
        if (nowMs - lastSatUpdate.current > 500) {
          lastSatUpdate.current = nowMs;
          const now = new Date(nowMs);
          for (const rec of satRecordsRef.current) {
            const prim = satPrimById.current.get(rec.id);
            if (!prim) continue;
            const s = propagateAt(rec, now);
            if (s) {
              prim.position = Cartesian3.fromDegrees(s.longitude, s.latitude, s.altitudeKm * 1000);
              prim.show = true;
            } else {
              prim.show = false;
            }
          }
          // Refresh a selected satellite's computed inspector values.
          if (sel?.category === "satellite") {
            const rec = satRecordsRef.current.find((r) => r.id === sel.id);
            if (rec) {
              const fresh = buildSatelliteEntity(rec, now);
              if (fresh) useUiStore.setState({ selected: fresh });
            }
          }
          viewer.scene.requestRender();
        }
      }
    };
    demoSnapshot.current = getDemoEntities(Date.now());
    viewer.clock.onTick.addEventListener(tickListener);

    return () => {
      disposed = true;
      if (tickListener) viewer.clock.onTick.removeEventListener(tickListener);
      handler?.destroy();
      if (!viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Base map, style & effects ───────────────────────────────────────────────
  const baseMap = useUiStore((s) => s.baseMap);
  const atmosphere = useUiStore((s) => s.atmosphere);
  const reducedEffects = useUiStore((s) => s.reducedEffects);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    let stale = false;

    // Swap the detail overlay (Esri satellite / OSM streets) as needed.
    const removeDetail = () => {
      if (detailLayer.current && viewer.imageryLayers.contains(detailLayer.current)) {
        viewer.imageryLayers.remove(detailLayer.current, true);
      }
      detailLayer.current = null;
    };
    // Toggle Google Photorealistic 3D Tiles.
    const removeGoogle = () => {
      if (google3dTileset.current && viewer.scene.primitives.contains(google3dTileset.current)) {
        viewer.scene.primitives.remove(google3dTileset.current);
      }
      google3dTileset.current = null;
      viewer.scene.globe.show = true;
    };

    removeDetail();

    if (baseMap === "satellite") {
      removeGoogle();
      const layer = ImageryLayer.fromProviderAsync(
        ArcGisMapServerImageryProvider.fromUrl(
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
        ),
        {},
      );
      viewer.imageryLayers.add(layer);
      detailLayer.current = layer;
    } else if (baseMap === "streets") {
      removeGoogle();
      const layer = new ImageryLayer(
        new OpenStreetMapImageryProvider({ url: "https://tile.openstreetmap.org/" }),
      );
      viewer.imageryLayers.add(layer);
      detailLayer.current = layer;
    } else if (baseMap === "google3d") {
      // Google Photorealistic 3D Tiles (the real "Google Earth" 3D). Requires a
      // Google Maps Platform API key; falls back to Natural if unavailable.
      if (CAPS.google && !google3dTileset.current) {
        createGooglePhotorealistic3DTileset({
          key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
        })
          .then((tileset) => {
            if (stale) return;
            google3dTileset.current = tileset;
            viewer.scene.primitives.add(tileset);
            viewer.scene.globe.show = false; // tileset provides the surface
            viewer.scene.requestRender();
          })
          .catch((e) => console.error("Google 3D Tiles failed to load:", e));
      }
    } else {
      removeGoogle();
    }

    // Offline base-imagery adjustments (natural / night / analytical look).
    const cfg = offlineStyleFor(baseMap);
    const base = viewer.imageryLayers.get(0);
    if (base) {
      base.brightness = cfg.imagery.brightness;
      base.saturation = cfg.imagery.saturation;
      base.contrast = cfg.imagery.contrast;
      base.gamma = cfg.imagery.gamma;
      base.hue = cfg.imagery.hue;
    }
    viewer.scene.globe.baseColor = Color.fromCssColorString(cfg.baseColorHex);
    viewer.scene.globe.enableLighting = cfg.enableLighting && !reducedEffects;
    const showAtmo = cfg.showAtmosphere && atmosphere && !reducedEffects;
    if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = showAtmo;
    viewer.scene.globe.showGroundAtmosphere = showAtmo;
    viewer.scene.fog.enabled = !reducedEffects;
    if (viewer.scene.skyBox) viewer.scene.skyBox.show = !reducedEffects;
    if (viewer.scene.sun) viewer.scene.sun.show = cfg.enableLighting && !reducedEffects;
    viewer.scene.requestRender();

    return () => {
      stale = true;
    };
  }, [baseMap, atmosphere, reducedEffects]);

  // ── Terrain (Cesium Ion) ────────────────────────────────────────────────────
  const terrain = useUiStore((s) => s.terrain);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    let stale = false;
    if (terrain && CAPS.ion) {
      createWorldTerrainAsync()
        .then((tp) => {
          if (!stale) viewer.terrainProvider = tp;
        })
        .catch((e) => console.error("World terrain failed to load:", e));
    } else {
      viewer.terrainProvider = new EllipsoidTerrainProvider();
    }
    return () => {
      stale = true;
    };
  }, [terrain]);

  // ── 3D buildings (Cesium OSM Buildings, Ion) ────────────────────────────────
  const buildings = useUiStore((s) => s.buildings);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    let stale = false;
    const remove = () => {
      if (buildingsTileset.current && viewer.scene.primitives.contains(buildingsTileset.current)) {
        viewer.scene.primitives.remove(buildingsTileset.current);
      }
      buildingsTileset.current = null;
    };
    if (buildings && CAPS.ion && !buildingsTileset.current) {
      createOsmBuildingsAsync()
        .then((ts) => {
          if (stale) {
            return;
          }
          buildingsTileset.current = ts;
          viewer.scene.primitives.add(ts);
          viewer.scene.requestRender();
        })
        .catch((e) => console.error("OSM buildings failed to load:", e));
    } else if (!buildings) {
      remove();
    }
    return () => {
      stale = true;
    };
  }, [buildings]);

  // ── Demo layer enable/disable → create/destroy Cesium entities ──────────────
  const demoEnabled = useLayerStore((s) => s.layers["demo-entities"]?.enabled ?? false);
  const demoOpacity = useLayerStore((s) => s.layers["demo-entities"]?.opacity ?? 1);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (!demoEnabled) {
      // Clean up (spec §32: layer can be toggled off and cleaned up).
      for (const id of demoEntityIds.current) {
        const e = viewer.entities.getById(id);
        if (e) viewer.entities.remove(e);
      }
      demoEntityIds.current.clear();
      // Deselect if a demo entity was selected.
      if (useUiStore.getState().selected?.simulated) select(null);
      viewer.scene.requestRender();
      return;
    }

    const seeds = getDemoEntities(Date.now());
    for (const seed of seeds) {
      if (viewer.entities.getById(seed.id)) continue;
      const cesiumId = seed.id;
      viewer.entities.add({
        id: cesiumId,
        properties: { terraId: seed.id },
        // CallbackProperty reads the fresh snapshot for smooth motion.
        position: new CallbackPositionProperty(() => {
          const cur = demoSnapshot.current.find((e) => e.id === cesiumId) ?? seed;
          return Cartesian3.fromDegrees(cur.longitude, cur.latitude, cur.altitudeMeters ?? 0);
        }, false),
        point: {
          pixelSize: 12,
          color: Color.fromCssColorString("#70A7FF").withAlpha(demoOpacity),
          outlineColor: Color.fromCssColorString("#0A0F16").withAlpha(demoOpacity),
          outlineWidth: 2,
          heightReference: HeightReference.NONE,
          scaleByDistance: new NearFarScalar(1.5e6, 1.4, 3.0e7, 0.7),
        },
        label: {
          text: `${seed.name}  ·  SIMULATED`,
          font: "500 12px Inter, sans-serif",
          fillColor: Color.fromCssColorString("#F3F6FA"),
          showBackground: true,
          backgroundColor: Color.fromCssColorString("#0C1017").withAlpha(0.8),
          backgroundPadding: new Cartesian2(8, 5),
          pixelOffset: new Cartesian2(0, -22),
          translucencyByDistance: new NearFarScalar(1.5e6, 1.0, 2.0e7, 0.0),
        },
      });
      demoEntityIds.current.add(cesiumId);
    }
    viewer.scene.requestRender();
  }, [demoEnabled, demoOpacity, select]);

  // ── Earthquakes (USGS) → GPU-backed point primitives (spec §17) ─────────────
  const quakeEnabled = useLayerStore((s) => s.layers["earthquakes"]?.enabled ?? false);
  const quakeOpacity = useLayerStore((s) => s.layers["earthquakes"]?.opacity ?? 1);
  const quakeRecords = useEarthquakeStore((s) => s.records);
  const quakeMinMag = useEarthquakeStore((s) => s.minMagnitude);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Tear down when disabled (spec §32 cleanup).
    if (!quakeEnabled) {
      if (quakeCollection.current) {
        viewer.scene.primitives.remove(quakeCollection.current);
        quakeCollection.current = null;
      }
      quakeLookup.current.clear();
      if (useUiStore.getState().selected?.category === "earthquake") select(null);
      viewer.scene.requestRender();
      return;
    }

    if (!quakeCollection.current) {
      quakeCollection.current = viewer.scene.primitives.add(new PointPrimitiveCollection());
    }
    const collection = quakeCollection.current!;
    collection.removeAll();
    quakeLookup.current.clear();

    const filtered =
      quakeMinMag <= 0
        ? quakeRecords
        : quakeRecords.filter((r) => (r.magnitude ?? -Infinity) >= quakeMinMag);

    for (const r of filtered) {
      const e = r.entity;
      collection.add({
        position: Cartesian3.fromDegrees(e.longitude, e.latitude, 0),
        color: Color.fromCssColorString(depthColor(r.depthKm)).withAlpha(quakeOpacity),
        outlineColor: Color.fromCssColorString("#04060A").withAlpha(0.6 * quakeOpacity),
        outlineWidth: 1,
        pixelSize: magnitudeToPixelSize(r.magnitude),
        scaleByDistance: new NearFarScalar(2.0e6, 1.15, 4.0e7, 0.55),
        id: { terraId: e.id },
      });
      quakeLookup.current.set(e.id, e);
    }

    // Keep a selected earthquake's inspector data in sync after a refresh.
    const sel = useUiStore.getState().selected;
    if (sel?.category === "earthquake") {
      const fresh = quakeLookup.current.get(sel.id);
      if (fresh) useUiStore.setState({ selected: fresh });
    }

    viewer.scene.requestRender();
  }, [quakeEnabled, quakeRecords, quakeMinMag, quakeOpacity, select]);

  // ── Weather alerts (NOAA/NWS) → polygons + centroid points ──────────────────
  const alertEnabled = useLayerStore((s) => s.layers["severe-alerts"]?.enabled ?? false);
  const alertOpacity = useLayerStore((s) => s.layers["severe-alerts"]?.opacity ?? 1);
  const alertRecords = useAlertStore((s) => s.records);
  const alertMinSeverity = useAlertStore((s) => s.minSeverity);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const clearAlerts = () => {
      for (const id of alertEntityIds.current) {
        const e = viewer.entities.getById(id);
        if (e) viewer.entities.remove(e);
      }
      alertEntityIds.current.clear();
      alertLookup.current.clear();
    };

    if (!alertEnabled) {
      clearAlerts();
      if (useUiStore.getState().selected?.category === "weather-alert") select(null);
      viewer.scene.requestRender();
      return;
    }

    clearAlerts();
    const floor = alertMinSeverity === "all" ? 0 : SEVERITY_RANK[alertMinSeverity];
    const filtered = alertRecords.filter((r) => r.hasGeometry && SEVERITY_RANK[r.severity] >= floor);

    viewer.entities.suspendEvents();
    for (const rec of filtered) {
      const color = Color.fromCssColorString(severityColor(rec.severity));
      // Polygon fill per outer ring.
      rec.rings.forEach((ring, i) => {
        const positions = Cartesian3.fromDegreesArray(ring.flat());
        const polyId = `${rec.entity.id}#poly${i}`;
        viewer.entities.add({
          id: polyId,
          properties: { terraId: rec.entity.id },
          polygon: {
            hierarchy: positions,
            material: color.withAlpha(0.28 * alertOpacity),
            height: 0,
          },
        });
        alertEntityIds.current.add(polyId);
      });
      // Centroid marker (visible/clickable at global zoom).
      const pointId = `${rec.entity.id}#pt`;
      viewer.entities.add({
        id: pointId,
        position: Cartesian3.fromDegrees(rec.entity.longitude, rec.entity.latitude, 0),
        properties: { terraId: rec.entity.id },
        point: {
          pixelSize: 9,
          color: color.withAlpha(alertOpacity),
          outlineColor: Color.fromCssColorString("#04060A").withAlpha(0.6 * alertOpacity),
          outlineWidth: 1,
          scaleByDistance: new NearFarScalar(2.0e6, 1.2, 4.0e7, 0.6),
        },
      });
      alertEntityIds.current.add(pointId);
      alertLookup.current.set(rec.entity.id, rec.entity);
    }
    viewer.entities.resumeEvents();

    const sel = useUiStore.getState().selected;
    if (sel?.category === "weather-alert") {
      const fresh = alertLookup.current.get(sel.id);
      if (fresh) useUiStore.setState({ selected: fresh });
    }

    viewer.scene.requestRender();
  }, [alertEnabled, alertRecords, alertMinSeverity, alertOpacity, select]);

  // ── Satellites (CelesTrak + SGP4) → point primitives ────────────────────────
  const satEnabled = useLayerStore((s) => s.layers["satellites"]?.enabled ?? false);
  const satOpacity = useLayerStore((s) => s.layers["satellites"]?.opacity ?? 1);
  const satRecords = useSatelliteStore((s) => s.records);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    satEnabledRef.current = satEnabled;
    satRecordsRef.current = satEnabled ? satRecords : [];

    if (!satEnabled) {
      if (satCollection.current) {
        viewer.scene.primitives.remove(satCollection.current);
        satCollection.current = null;
      }
      satPrimById.current.clear();
      if (useUiStore.getState().selected?.category === "satellite") select(null);
      viewer.scene.requestRender();
      return;
    }

    if (!satCollection.current) {
      satCollection.current = viewer.scene.primitives.add(new PointPrimitiveCollection());
    }
    const collection = satCollection.current!;
    collection.removeAll();
    satPrimById.current.clear();

    const now = new Date();
    for (const rec of satRecords) {
      const s = propagateAt(rec, now);
      const prim = collection.add({
        position: s ? Cartesian3.fromDegrees(s.longitude, s.latitude, s.altitudeKm * 1000) : Cartesian3.fromDegrees(0, 0, 0),
        show: !!s,
        color: Color.fromCssColorString("#A78BFA").withAlpha(satOpacity),
        outlineColor: Color.fromCssColorString("#04060A").withAlpha(0.6 * satOpacity),
        outlineWidth: 1,
        pixelSize: 6,
        scaleByDistance: new NearFarScalar(2.0e6, 1.2, 6.0e7, 0.5),
        id: { terraId: rec.id },
      });
      satPrimById.current.set(rec.id, prim);
    }
    lastSatUpdate.current = 0;
    viewer.scene.requestRender();
  }, [satEnabled, satRecords, satOpacity, select]);

  // ── Predicted orbit path for a selected satellite ───────────────────────────
  const selected = useUiStore((s) => s.selected);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Remove any previous orbit line.
    if (orbitEntityId.current) {
      const e = viewer.entities.getById(orbitEntityId.current);
      if (e) viewer.entities.remove(e);
      orbitEntityId.current = null;
    }

    if (selected?.category !== "satellite") return;
    const rec = satRecordsRef.current.find((r) => r.id === selected.id);
    if (!rec) return;
    const path = predictedOrbitPath(rec, new Date());
    if (path.length < 6) return;
    const id = `${rec.id}#orbit`;
    viewer.entities.add({
      id,
      polyline: {
        positions: Cartesian3.fromDegreesArrayHeights(path),
        width: 1.5,
        material: Color.fromCssColorString("#A78BFA").withAlpha(0.75),
        arcType: undefined,
      },
    });
    orbitEntityId.current = id;
    viewer.scene.requestRender();
  }, [selected]);

  // ── Fly-to (search result / bookmark) ──────────────────────────────────────
  const flyTarget = useUiStore((s) => s.flyTarget);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !flyTarget) return;
    const instant = reducedEffects || prefersReducedMotion();
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        flyTarget.longitude,
        flyTarget.latitude,
        flyTarget.height ?? 1_500_000,
      ),
      duration: instant ? 0 : 2.0,
    });
  }, [flyTarget, reducedEffects]);

  // ── Reset to home view ──────────────────────────────────────────────────────
  const resetViewNonce = useUiStore((s) => s.resetViewNonce);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || resetViewNonce === 0) return;
    const instant = reducedEffects || prefersReducedMotion();
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(HOME_VIEW.lon, HOME_VIEW.lat, HOME_VIEW.height),
      duration: instant ? 0 : 1.6,
    });
  }, [resetViewNonce, reducedEffects]);

  // ── Resize on container changes (panels open/close) ─────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    const el = containerRef.current;
    if (!viewer || !el) return;
    const ro = new ResizeObserver(() => {
      if (!viewer.isDestroyed()) {
        viewer.resize();
        viewer.scene.requestRender();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 h-full w-full"
      role="application"
      aria-label="Interactive 3D globe. Drag to rotate, scroll to zoom."
    />
  );
}
