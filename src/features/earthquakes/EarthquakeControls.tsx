import { useEarthquakeStore, selectFilteredRecords } from "@/stores/useEarthquakeStore";
import { QUAKE_WINDOW_LABELS, type QuakeWindow } from "./types";
import { DEPTH_BANDS, MAGNITUDE_LEGEND } from "./earthquakeStyle";
import { FeedStatusBadge } from "@/components/layers/FeedStatusBadge";
import { timeAgo } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

/**
 * Earthquake-specific controls shown inside the layer catalog when the layer is
 * enabled: time window + magnitude filter, live feed status, result count, and
 * the depth/magnitude legend (spec §6/§11/§13/§18).
 */
export function EarthquakeControls() {
  const windowSel = useEarthquakeStore((s) => s.window);
  const setWindow = useEarthquakeStore((s) => s.setWindow);
  const minMag = useEarthquakeStore((s) => s.minMagnitude);
  const setMinMag = useEarthquakeStore((s) => s.setMinMagnitude);
  const status = useEarthquakeStore((s) => s.status);
  const loading = useEarthquakeStore((s) => s.loading);
  const error = useEarthquakeStore((s) => s.error);
  const total = useEarthquakeStore((s) => s.records.length);
  const shown = useEarthquakeStore(selectFilteredRecords).length;

  const windows: QuakeWindow[] = ["hour", "day", "week"];

  return (
    <div className="space-y-3 border-t border-terra-border px-2.5 py-2.5">
      {/* Feed status */}
      <div className="flex items-center justify-between gap-2">
        {status ? <FeedStatusBadge state={status.state} /> : (
          <span className="text-[10px] text-terra-text-muted">{loading ? "Loading…" : "—"}</span>
        )}
        {status?.observedAt && (
          <span className="tnum text-[10px] text-terra-text-muted">
            updated {timeAgo(status.observedAt)}
          </span>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-terra-red">
          {error} {status?.lastSuccessfulFetchAt && `Last update ${timeAgo(status.lastSuccessfulFetchAt)}.`}
        </p>
      )}

      {/* Time window */}
      <div>
        <span className="text-[10px] uppercase tracking-wide text-terra-text-muted">Time window</span>
        <div className="mt-1 flex gap-0.5 rounded-lg border border-terra-border bg-terra-surface-2/70 p-0.5" role="radiogroup" aria-label="Earthquake time window">
          {windows.map((w) => (
            <button
              key={w}
              role="radio"
              aria-checked={windowSel === w}
              onClick={() => setWindow(w)}
              className={`flex-1 rounded-md px-1.5 py-1 text-[11px] transition-colors ${
                windowSel === w ? "bg-terra-surface-3 text-terra-text" : "text-terra-text-muted hover:text-terra-text"
              }`}
              title={QUAKE_WINDOW_LABELS[w]}
            >
              {w === "hour" ? "1h" : w === "day" ? "24h" : "7d"}
            </button>
          ))}
        </div>
      </div>

      {/* Magnitude filter */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wide text-terra-text-muted">Min magnitude</span>
          <span className="tnum text-[11px] text-terra-text-secondary">
            {minMag === 0 ? "All" : `M ${minMag.toFixed(1)}+`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={7}
          step={0.5}
          value={minMag}
          onChange={(e) => setMinMag(Number(e.target.value))}
          aria-label="Minimum earthquake magnitude"
          className="mt-1 w-full accent-[color:var(--terra-accent)]"
        />
      </div>

      {/* Result count / empty warning (spec §11/§25) */}
      <div className="tnum text-[11px] text-terra-text-secondary">
        {total === 0 && !loading && !error ? (
          <span className="text-terra-text-muted">No events reported in this window.</span>
        ) : shown === 0 && total > 0 ? (
          <span className="text-terra-amber">
            No events at M {minMag.toFixed(1)}+. {total} below this threshold — lower it to see them.
          </span>
        ) : (
          <span>
            Showing <span className="text-terra-text">{shown}</span>
            {shown !== total && <span className="text-terra-text-muted"> of {total}</span>} events
          </span>
        )}
      </div>

      {/* Legend (color = depth, size = magnitude) */}
      <div className="space-y-1.5 rounded-lg border border-terra-border bg-terra-surface-1/60 p-2">
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-terra-text-muted">
          <Icon name="info" size={11} /> Legend
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-terra-text-muted">Colour — depth</span>
          {DEPTH_BANDS.map((b) => (
            <div key={b.id} className="flex items-center gap-2 text-[11px] text-terra-text-secondary">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
              {b.label}
            </div>
          ))}
        </div>
        <div className="flex items-end gap-3 pt-1">
          <span className="text-[10px] text-terra-text-muted">Size — magnitude</span>
          {MAGNITUDE_LEGEND.map((m) => (
            <span key={m.label} className="flex flex-col items-center gap-0.5">
              <span
                className="rounded-full bg-terra-text-secondary"
                style={{ width: m.size / 2, height: m.size / 2 }}
              />
              <span className="tnum text-[9px] text-terra-text-muted">{m.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
