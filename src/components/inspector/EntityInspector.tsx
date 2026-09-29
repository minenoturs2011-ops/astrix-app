import { useEffect, useState } from "react";
import { useUiStore } from "@/stores/useUiStore";
import { Icon } from "@/components/ui/Icon";
import { FeedStatusBadge } from "@/components/layers/FeedStatusBadge";
import { formatLatLon, formatUtc, timeAgo } from "@/lib/format";
import { SOURCES } from "@/lib/sources";

function DataRow({
  label,
  value,
  unit,
  mono,
  provenance,
}: {
  label: string;
  value?: string | number | null;
  unit?: string;
  mono?: boolean;
  provenance?: "observed" | "computed" | "estimated";
}) {
  // Never render invented values — skip genuinely-unknown fields (spec §9/§33).
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs text-terra-text-muted">{label}</span>
      <span className={`text-right text-sm text-terra-text ${mono ? "tnum" : ""}`}>
        {value}
        {unit ? <span className="ml-0.5 text-xs text-terra-text-secondary">{unit}</span> : null}
        {provenance && provenance !== "observed" && (
          <span className="ml-1.5 text-[9px] uppercase tracking-wide text-terra-text-muted">({provenance})</span>
        )}
      </span>
    </div>
  );
}

export function EntityInspector() {
  const selected = useUiStore((s) => s.selected);
  const select = useUiStore((s) => s.select);
  const flyTo = useUiStore((s) => s.flyTo);
  // Re-render every second so "data age" stays honest.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!selected) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <Icon name="target" size={30} className="text-terra-text-muted" />
        <p className="text-sm text-terra-text-secondary">No entity selected</p>
        <p className="text-xs text-terra-text-muted">
          Click a point on the globe to inspect it. Enable the “Demo Entities (Simulated)” layer to try it.
        </p>
      </div>
    );
  }

  const src = SOURCES[selected.sourceId];
  const sourceUrl = selected.sourceUrl ?? src?.url;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 px-4 pb-2 pt-3">
        <div className="min-w-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-terra-text-muted">
            Entity Inspector
          </h2>
          <p className="mt-1 truncate text-base font-semibold text-terra-text">{selected.name}</p>
          <p className="text-xs capitalize text-terra-text-secondary">{selected.category}</p>
        </div>
        <button
          onClick={() => select(null)}
          aria-label="Close inspector"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-terra-text-muted hover:bg-terra-surface-3 hover:text-terra-text"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {selected.simulated && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-terra-cyan/40 bg-terra-cyan/10 p-2.5">
            <Icon name="sparkles" size={16} className="mt-0.5 shrink-0 text-terra-cyan" />
            <p className="text-xs text-terra-text-secondary">
              This is <span className="font-semibold text-terra-cyan">simulated demonstration data</span> generated
              locally. It is not a real observation and does not represent any real object.
            </p>
          </div>
        )}

        <div className="mb-3">
          <FeedStatusBadge state={selected.feedState} />
        </div>

        {/* Common fields (spec §9) */}
        <div className="divide-y divide-terra-border">
          <DataRow
            label="Position"
            value={formatLatLon(selected.latitude, selected.longitude)}
            mono
          />
          {selected.altitudeMeters !== undefined && (
            <DataRow
              label="Altitude"
              value={Math.round(selected.altitudeMeters).toLocaleString()}
              unit="m"
              mono
              provenance="computed"
            />
          )}
          <DataRow label="Observed at" value={formatUtc(selected.observedAt)} mono />
          <DataRow label="Data age" value={timeAgo(selected.observedAt ?? selected.receivedAt)} mono />
          <DataRow label="Received at" value={formatUtc(selected.receivedAt)} mono />
          <DataRow label="Source" value={selected.sourceName} />
        </div>

        {/* Type-specific fields */}
        {selected.fields.length > 0 && (
          <div className="mt-3 border-t border-terra-border pt-2">
            <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-terra-text-muted">
              Details
            </h3>
            <div className="divide-y divide-terra-border">
              {selected.fields.map((f, i) => (
                <DataRow key={i} label={f.label} value={f.value} unit={f.unit} mono={f.mono} provenance={f.provenance} />
              ))}
            </div>
          </div>
        )}

        {/* Attribution & source link (spec §9) */}
        {src && (
          <div className="mt-3 border-t border-terra-border pt-2">
            <p className="text-[10px] leading-relaxed text-terra-text-muted">{src.attribution}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-terra-border p-3">
        <button
          onClick={() => flyTo(selected.longitude, selected.latitude, 1_500_000)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-terra-border py-2 text-xs text-terra-text-secondary hover:border-terra-border-hover hover:text-terra-text"
        >
          <Icon name="target" size={15} /> Center
        </button>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-terra-border py-2 text-xs text-terra-text-secondary hover:border-terra-border-hover hover:text-terra-text"
          >
            <Icon name="external" size={15} /> Source
          </a>
        )}
      </div>
    </div>
  );
}
