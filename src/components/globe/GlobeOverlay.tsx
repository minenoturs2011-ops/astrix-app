import { useUiStore } from "@/stores/useUiStore";
import { Icon } from "@/components/ui/Icon";
import { formatDegrees } from "@/lib/format";
import { offlineStyleFor } from "./globeStyles";

/**
 * Floating controls over the globe: reset/home, cursor coordinate readout
 * (spec §12), and the "styled, not real" note for the night mode (spec §5).
 */
export function GlobeOverlay() {
  const resetView = useUiStore((s) => s.resetView);
  const cursor = useUiStore((s) => s.cursor);
  const baseMap = useUiStore((s) => s.baseMap);
  const styledNote = offlineStyleFor(baseMap).styledNote;

  return (
    <>
      {/* Top-right controls */}
      <div className="pointer-events-none absolute right-4 top-4 z-10 flex flex-col gap-2">
        <button
          onClick={resetView}
          aria-label="Reset to home view"
          title="Reset view"
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-lg border border-terra-border bg-terra-surface-1/80 text-terra-text-secondary backdrop-blur hover:border-terra-border-hover hover:text-terra-text"
        >
          <Icon name="home" size={17} />
        </button>
      </div>

      {/* Styled-mode disclosure */}
      {styledNote && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
          <span className="rounded-full border border-terra-border bg-terra-surface-1/80 px-3 py-1 text-[10px] text-terra-text-muted backdrop-blur">
            {styledNote}
          </span>
        </div>
      )}

      {/* Cursor coordinate readout */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10">
        <div className="tnum rounded-md border border-terra-border bg-terra-surface-1/80 px-2.5 py-1 text-[11px] text-terra-text-secondary backdrop-blur">
          {cursor ? (
            <>
              <span className="text-terra-text-muted">lat</span> {formatDegrees(cursor.latitude)}{" "}
              <span className="text-terra-text-muted">lon</span> {formatDegrees(cursor.longitude)}
            </>
          ) : (
            <span className="text-terra-text-muted">Move cursor over the globe for coordinates</span>
          )}
        </div>
      </div>
    </>
  );
}
