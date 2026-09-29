import { useFireStore } from "@/stores/useFireStore";
import { FIRE_SOURCES, type FireSource } from "./types";
import { CONFIDENCE_LEGEND } from "./fireStyle";
import { FeedStatusBadge } from "@/components/layers/FeedStatusBadge";
import { timeAgo } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { CAPS } from "@/components/globe/baseMaps";

/** Wildfire (NASA FIRMS) controls: satellite product, status, count, legend. */
export function FireControls() {
  const source = useFireStore((s) => s.source);
  const setSource = useFireStore((s) => s.setSource);
  const status = useFireStore((s) => s.status);
  const loading = useFireStore((s) => s.loading);
  const error = useFireStore((s) => s.error);
  const count = useFireStore((s) => s.records.length);

  if (!CAPS.firms) {
    return (
      <div className="space-y-2 border-t border-terra-border px-2.5 py-2.5">
        <p className="text-[11px] leading-relaxed text-terra-amber">
          Wildfires need a free NASA FIRMS MAP_KEY. Add <code>VITE_FIRMS_MAP_KEY</code> to your{" "}
          <code>.env</code> (see the README for how to get one), then rebuild.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-terra-border px-2.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        {status ? <FeedStatusBadge state={status.state} /> : (
          <span className="text-[10px] text-terra-text-muted">{loading ? "Loading…" : "—"}</span>
        )}
        {status?.lastSuccessfulFetchAt && (
          <span className="tnum text-[10px] text-terra-text-muted">updated {timeAgo(status.lastSuccessfulFetchAt)}</span>
        )}
      </div>

      {error && <p className="text-[11px] text-terra-red">{error}</p>}

      <div>
        <span className="text-[10px] uppercase tracking-wide text-terra-text-muted">Satellite product</span>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as FireSource)}
          aria-label="Fire detection satellite product"
          className="mt-1 w-full rounded-lg border border-terra-border bg-terra-surface-2 px-2 py-1.5 text-xs text-terra-text focus:border-terra-border-hover focus:outline-none"
        >
          {FIRE_SOURCES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="tnum text-[11px] text-terra-text-secondary">
        {count === 0 && !loading && !error ? (
          <span className="text-terra-text-muted">No detections in the last 24h.</span>
        ) : (
          <span>Showing <span className="text-terra-text">{count}</span> detections (24h)</span>
        )}
      </div>

      <div className="space-y-1.5 rounded-lg border border-terra-border bg-terra-surface-1/60 p-2">
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-terra-text-muted">
          <Icon name="info" size={11} /> Colour — confidence · size — power
        </div>
        {CONFIDENCE_LEGEND.map((c) => (
          <div key={c.label} className="flex items-center gap-2 text-[11px] text-terra-text-secondary">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
            {c.label}
          </div>
        ))}
      </div>

      <p className="text-[10px] leading-relaxed text-terra-text-muted">
        Each point is a satellite <span className="text-terra-text-secondary">thermal anomaly</span>, not a confirmed
        fire or a perimeter. Near-real-time, last 24 hours.
      </p>
    </div>
  );
}
