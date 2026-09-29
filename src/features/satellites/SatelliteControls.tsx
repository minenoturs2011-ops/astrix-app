import { useSatelliteStore } from "@/stores/useSatelliteStore";
import { SAT_GROUPS, type SatGroup } from "./types";
import { FeedStatusBadge } from "@/components/layers/FeedStatusBadge";
import { timeAgo } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

/**
 * Satellite controls: object-group selector, live status, count, and an honest
 * note that positions are computed from orbital elements (spec §7.A).
 */
export function SatelliteControls() {
  const group = useSatelliteStore((s) => s.group);
  const setGroup = useSatelliteStore((s) => s.setGroup);
  const status = useSatelliteStore((s) => s.status);
  const loading = useSatelliteStore((s) => s.loading);
  const error = useSatelliteStore((s) => s.error);
  const count = useSatelliteStore((s) => s.records.length);
  const activeGroup = SAT_GROUPS.find((g) => g.id === group);

  return (
    <div className="space-y-3 border-t border-terra-border px-2.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        {status ? <FeedStatusBadge state={status.state} /> : (
          <span className="text-[10px] text-terra-text-muted">{loading ? "Loading…" : "—"}</span>
        )}
        {status?.observedAt && (
          <span className="tnum text-[10px] text-terra-text-muted">epoch {timeAgo(status.observedAt)}</span>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-terra-red">
          {error} {status?.lastSuccessfulFetchAt && `Last update ${timeAgo(status.lastSuccessfulFetchAt)}.`}
        </p>
      )}

      <div>
        <span className="text-[10px] uppercase tracking-wide text-terra-text-muted">Object group</span>
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value as SatGroup)}
          aria-label="Satellite object group"
          className="mt-1 w-full rounded-lg border border-terra-border bg-terra-surface-2 px-2 py-1.5 text-xs text-terra-text focus:border-terra-border-hover focus:outline-none"
        >
          {SAT_GROUPS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
        {activeGroup && <p className="mt-1 text-[10px] text-terra-text-muted">{activeGroup.note}</p>}
      </div>

      <div className="tnum text-[11px] text-terra-text-secondary">
        {count === 0 && !loading && !error ? (
          <span className="text-terra-text-muted">No objects loaded.</span>
        ) : (
          <span>
            Tracking <span className="text-terra-text">{count}</span> objects
          </span>
        )}
        {group === "starlink" && count > 1000 && (
          <span className="ml-1 text-terra-amber">— large set may affect performance.</span>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-terra-violet/40 bg-terra-violet/10 p-2">
        <Icon name="orbit" size={14} className="mt-0.5 shrink-0 text-terra-violet" />
        <p className="text-[10px] leading-relaxed text-terra-text-secondary">
          Positions are <span className="text-terra-violet">computed from orbital elements</span> (SGP4), not live
          telemetry. Accuracy decreases as the element set ages. Select a satellite to see its predicted orbit.
        </p>
      </div>
    </div>
  );
}
