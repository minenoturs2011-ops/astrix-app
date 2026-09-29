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
  defined,
} from "cesium";
import { useUiStore } from "@/stores/useUiStore";
import { useLayerStore } from "@/stores/useLayerStore";
import { GLOBE_STYLES } from "./globeStyles";
import { getDemoEntities } from "@/lib/demoData";
import type { TerraEntity } from "@/types/entity";

const HOME_VIEW = { lon: 12, lat: 25, height: 22_000_000 };

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

    // Dev-only handle for debugging / end-to-end tests. Never exposed in
    // production builds (import.meta.env.DEV is false there).
    if (import.meta.env.DEV) {
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
      if (defined(picked) && picked.id instanceof CesiumEntity && picked.id.properties?.terraId) {
        const id = picked.id.properties.terraId.getValue(viewer.clock.currentTime) as string;
        const entity = demoSnapshot.current.find((e) => e.id === id);
        if (entity) {
          select(entity);
          return;
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

  // ── Style mode & effects ────────────────────────────────────────────────────
  const styleMode = useUiStore((s) => s.styleMode);
  const atmosphere = useUiStore((s) => s.atmosphere);
  const reducedEffects = useUiStore((s) => s.reducedEffects);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const cfg = GLOBE_STYLES[styleMode];
    const layer = viewer.imageryLayers.get(0);
    if (layer) {
      layer.brightness = cfg.imagery.brightness;
      layer.saturation = cfg.imagery.saturation;
      layer.contrast = cfg.imagery.contrast;
      layer.gamma = cfg.imagery.gamma;
      layer.hue = cfg.imagery.hue;
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
  }, [styleMode, atmosphere, reducedEffects]);

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
