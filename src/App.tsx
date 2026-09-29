import { useEffect, useRef, useState } from "react";
import { GlobeView } from "@/components/globe/GlobeView";
import { GlobeOverlay } from "@/components/globe/GlobeOverlay";
import { TopBar } from "@/components/layout/TopBar";
import { BottomTimeline } from "@/components/layout/BottomTimeline";
import { LayerCatalog } from "@/components/layers/LayerCatalog";
import { EntityInspector } from "@/components/inspector/EntityInspector";
import { Resizer } from "@/components/layout/Resizer";
import { Icon } from "@/components/ui/Icon";
import { useUiStore } from "@/stores/useUiStore";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { EarthquakeFeedController } from "@/features/earthquakes/useEarthquakeFeed";
import { AlertFeedController } from "@/features/alerts/useAlertFeed";
import { SatelliteFeedController } from "@/features/satellites/useSatelliteFeed";

export default function App() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const leftOpen = useUiStore((s) => s.leftOpen);
  const rightOpen = useUiStore((s) => s.rightOpen);
  const setRightOpen = useUiStore((s) => s.setRightOpen);
  const selected = useUiStore((s) => s.selected);
  const presentationMode = useUiStore((s) => s.presentationMode);
  const togglePresentation = useUiStore((s) => s.togglePresentation);

  const [leftWidth, setLeftWidth] = useState(300);
  const [rightWidth, setRightWidth] = useState(340);

  // On phones/tablets the catalog is a full-height drawer, so start it collapsed
  // (it opens via the floating layers button). Desktop keeps it open by default.
  const didInitResponsive = useRef(false);
  useEffect(() => {
    if (didInitResponsive.current) return;
    didInitResponsive.current = true;
    if (!isDesktop) useUiStore.setState({ leftOpen: false });
  }, [isDesktop]);

  // Close inspector with Escape (spec §24 keyboard access).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && useUiStore.getState().selected) useUiStore.getState().select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const globe = (
    <div className="relative h-full w-full overflow-hidden">
      <GlobeView />
      <GlobeOverlay />
      {presentationMode && (
        <button
          onClick={togglePresentation}
          className="terra-glass absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-terra-text-secondary hover:text-terra-text"
        >
          <Icon name="eye" size={16} /> Exit presentation
        </button>
      )}
    </div>
  );

  if (presentationMode) {
    return (
      <div className="h-full w-full bg-terra-bg">
        <EarthquakeFeedController />
        <AlertFeedController />
        <SatelliteFeedController />
        {globe}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-terra-bg">
      {/* Data feed pollers (no UI) */}
      <EarthquakeFeedController />
      <AlertFeedController />
      <SatelliteFeedController />
      <TopBar />

      <div className="relative flex min-h-0 flex-1">
        {/* ── Left: layer catalog ──────────────────────────────────────── */}
        {isDesktop ? (
          leftOpen && (
            <>
              <aside
                className="terra-surface min-h-0 shrink-0 overflow-hidden"
                style={{ width: leftWidth }}
                aria-label="Layer catalog"
              >
                <LayerCatalog />
              </aside>
              <Resizer
                side="left"
                width={leftWidth}
                min={240}
                max={480}
                onChange={setLeftWidth}
                ariaLabel="Resize layer panel"
              />
            </>
          )
        ) : (
          leftOpen && (
            <div className="absolute inset-0 z-30 flex">
              <aside className="terra-surface h-full w-[85%] max-w-sm overflow-hidden shadow-panel-lg" aria-label="Layer catalog">
                <LayerCatalog />
              </aside>
              <button
                className="h-full flex-1 bg-black/50"
                aria-label="Close layer panel"
                onClick={() => useUiStore.getState().toggleLeft()}
              />
            </div>
          )
        )}

        {/* ── Center: globe ────────────────────────────────────────────── */}
        <main className="relative min-h-0 min-w-0 flex-1">{globe}</main>

        {/* ── Right: entity inspector ──────────────────────────────────── */}
        {isDesktop
          ? rightOpen && (
              <>
                <Resizer
                  side="right"
                  width={rightWidth}
                  min={280}
                  max={520}
                  onChange={setRightWidth}
                  ariaLabel="Resize inspector panel"
                />
                <aside
                  className="terra-surface min-h-0 shrink-0 overflow-hidden"
                  style={{ width: rightWidth }}
                  aria-label="Entity inspector"
                >
                  <EntityInspector />
                </aside>
              </>
            )
          : (rightOpen || selected) && (
              <div className="absolute inset-x-0 bottom-0 z-30 max-h-[70%]">
                <aside
                  className="terra-glass h-full overflow-hidden rounded-t-2xl border-t shadow-panel-lg"
                  aria-label="Entity inspector"
                >
                  <div className="flex justify-center py-1.5">
                    <span className="h-1 w-10 rounded-full bg-terra-surface-3" />
                  </div>
                  <div className="h-[calc(100%-1.5rem)]">
                    <EntityInspector />
                  </div>
                </aside>
              </div>
            )}

        {/* Mobile: floating buttons to open panels */}
        {!isDesktop && (
          <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex flex-col gap-2">
            <button
              onClick={() => useUiStore.getState().toggleLeft()}
              aria-label="Open layers"
              className="terra-glass pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-terra-text-secondary"
            >
              <Icon name="layers" size={20} />
            </button>
            {selected && !rightOpen && (
              <button
                onClick={() => setRightOpen(true)}
                aria-label="Open inspector"
                className="terra-glass pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-terra-text-secondary"
              >
                <Icon name="info" size={20} />
              </button>
            )}
          </div>
        )}
      </div>

      <BottomTimeline />
    </div>
  );
}
