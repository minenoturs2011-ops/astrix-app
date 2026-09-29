import { useAlertStore, selectFilteredAlerts } from "@/stores/useAlertStore";
import type { AlertSeverity } from "./types";
import { SEVERITY_LEGEND } from "./alertStyle";
import { FeedStatusBadge } from "@/components/layers/FeedStatusBadge";
import { timeAgo } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

/**
 * NWS weather-alert controls shown in the catalog when the layer is enabled:
 * live feed status, severity filter, mapped/zone-only counts, legend, and an
 * honest US-coverage note (spec §6/§11/§13/§18).
 */
export function AlertControls() {
  const status = useAlertStore((s) => s.status);
  const loading = useAlertStore((s) => s.loading);
  const error = useAlertStore((s) => s.error);
  const total = useAlertStore((s) => s.records.length);
  const zoneOnly = useAlertStore((s) => s.zoneOnlyCount);
  const minSeverity = useAlertStore((s) => s.minSeverity);
  const setMinSeverity = useAlertStore((s) => s.setMinSeverity);
  const shown = useAlertStore(selectFilteredAlerts).length;

  const options: ("all" | AlertSeverity)[] = ["all", "Severe", "Extreme"];

  return (
    <div className="space-y-3 border-t border-terra-border px-2.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        {status ? <FeedStatusBadge state={status.state} /> : (
          <span className="text-[10px] text-terra-text-muted">{loading ? "Loading…" : "—"}</span>
        )}
        {status?.observedAt && (
          <span className="tnum text-[10px] text-terra-text-muted">updated {timeAgo(status.observedAt)}</span>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-terra-red">
          {error} {status?.lastSuccessfulFetchAt && `Last update ${timeAgo(status.lastSuccessfulFetchAt)}.`}
        </p>
      )}

      <div>
        <span className="text-[10px] uppercase tracking-wide text-terra-text-muted">Minimum severity</span>
        <div className="mt-1 flex gap-0.5 rounded-lg border border-terra-border bg-terra-surface-2/70 p-0.5" role="radiogroup" aria-label="Minimum alert severity">
          {options.map((o) => (
            <button
              key={o}
              role="radio"
              aria-checked={minSeverity === o}
              onClick={() => setMinSeverity(o)}
              className={`flex-1 rounded-md px-1.5 py-1 text-[11px] transition-colors ${
                minSeverity === o ? "bg-terra-surface-3 text-terra-text" : "text-terra-text-muted hover:text-terra-text"
              }`}
            >
              {o === "all" ? "All" : o === "Severe" ? "Severe+" : "Extreme"}
            </button>
          ))}
        </div>
      </div>

      <div className="tnum text-[11px] text-terra-text-secondary">
        {total === 0 && !loading && !error ? (
          <span className="text-terra-text-muted">No active alerts.</span>
        ) : shown === 0 && total > 0 ? (
          <span className="text-terra-amber">No mapped alerts at this severity. Lower the filter.</span>
        ) : (
          <span>
            Showing <span className="text-terra-text">{shown}</span> mapped of {total} active
          </span>
        )}
      </div>

      <div className="space-y-1.5 rounded-lg border border-terra-border bg-terra-surface-1/60 p-2">
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-terra-text-muted">
          <Icon name="info" size={11} /> Colour — severity
        </div>
        {SEVERITY_LEGEND.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-[11px] text-terra-text-secondary">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>

      <p className="text-[10px] leading-relaxed text-terra-text-muted">
        Coverage: United States (NOAA/NWS). {zoneOnly > 0 && `${zoneOnly} alert(s) reference NWS zones without an inline map shape and are counted but not drawn. `}
        A visualization is not a substitute for official guidance.
      </p>
    </div>
  );
}
