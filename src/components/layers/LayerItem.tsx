import { useState } from "react";
import type { TerraLayerDefinition } from "@/types/layer";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useLayerStore } from "@/stores/useLayerStore";
import { SOURCES } from "@/lib/sources";
import { EarthquakeControls } from "@/features/earthquakes/EarthquakeControls";

const STATUS_META: Record<
  TerraLayerDefinition["implementationStatus"],
  { label: string; color: string }
> = {
  available: { label: "Available", color: "var(--terra-green)" },
  planned: { label: "Planned · Phase 2+", color: "var(--terra-text-muted)" },
  "requires-credentials": { label: "Needs provider key", color: "var(--terra-amber)" },
};

export function LayerItem({ layer }: { layer: TerraLayerDefinition }) {
  const [expanded, setExpanded] = useState(false);
  const runtime = useLayerStore((s) => s.layers[layer.id]);
  const toggle = useLayerStore((s) => s.toggle);
  const setOpacity = useLayerStore((s) => s.setOpacity);

  const enabled = runtime?.enabled ?? false;
  const canEnable = layer.implementationStatus === "available";
  const status = STATUS_META[layer.implementationStatus];
  const detailsId = `layer-details-${layer.id}`;

  return (
    <div className="rounded-lg border border-terra-border bg-terra-surface-1/60">
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <Icon name={layer.icon as IconName} size={17} className="shrink-0 text-terra-text-secondary" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm text-terra-text">{layer.name}</span>
            {layer.simulated && (
              <span className="shrink-0 rounded border border-terra-cyan px-1 py-px text-[8px] font-semibold uppercase tracking-wide text-terra-cyan">
                Sim
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span
              className="inline-flex items-center gap-1"
              style={{ color: status.color }}
            >
              <Icon
                name={
                  layer.implementationStatus === "available"
                    ? "dot"
                    : layer.implementationStatus === "requires-credentials"
                      ? "lock"
                      : "clock"
                }
                size={9}
                filled={layer.implementationStatus === "available"}
              />
              {status.label}
            </span>
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          aria-label={`${expanded ? "Hide" : "Show"} details for ${layer.name}`}
          aria-expanded={expanded}
          aria-controls={detailsId}
          className="flex h-7 w-7 items-center justify-center rounded-md text-terra-text-muted hover:bg-terra-surface-3 hover:text-terra-text"
        >
          <Icon name="info" size={15} />
        </button>

        {/* Toggle */}
        <button
          role="switch"
          aria-checked={enabled}
          disabled={!canEnable}
          onClick={() => canEnable && toggle(layer.id)}
          aria-label={`${enabled ? "Disable" : "Enable"} ${layer.name}`}
          title={canEnable ? undefined : "Not available yet in this build"}
          className={`flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
            !canEnable
              ? "cursor-not-allowed border-terra-border bg-terra-surface-2 opacity-50"
              : enabled
                ? "border-terra-accent bg-terra-accent/30"
                : "border-terra-border bg-terra-surface-2"
          }`}
        >
          <span
            className={`h-3.5 w-3.5 rounded-full transition-transform ${
              enabled ? "translate-x-4 bg-terra-accent" : "translate-x-0.5 bg-terra-text-muted"
            }`}
          />
        </button>
      </div>

      {/* Opacity control when enabled */}
      {enabled && canEnable && (
        <div className="flex items-center gap-2 px-2.5 pb-2 pt-0.5">
          <span className="text-[10px] uppercase tracking-wide text-terra-text-muted">Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((runtime?.opacity ?? 1) * 100)}
            onChange={(e) => setOpacity(layer.id, Number(e.target.value) / 100)}
            aria-label={`${layer.name} opacity`}
            className="flex-1 accent-[color:var(--terra-accent)]"
          />
          <span className="tnum w-8 text-right text-[10px] text-terra-text-secondary">
            {Math.round((runtime?.opacity ?? 1) * 100)}%
          </span>
        </div>
      )}

      {/* Layer-specific controls (spec §6) */}
      {enabled && canEnable && layer.id === "earthquakes" && <EarthquakeControls />}

      {expanded && (
        <div id={detailsId} className="space-y-2 border-t border-terra-border px-2.5 py-2 text-xs">
          <p className="text-terra-text-secondary">{layer.description}</p>
          <div>
            <span className="text-terra-text-muted">Coverage: </span>
            <span className="text-terra-text-secondary">{layer.coverageDescription}</span>
          </div>
          {layer.knownLimitations.length > 0 && (
            <div>
              <span className="text-terra-text-muted">Known limitations:</span>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-terra-text-secondary">
                {layer.knownLimitations.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <span className="rounded border border-terra-border px-1.5 py-0.5 text-[10px] text-terra-text-muted">
              {layer.updateMode}
            </span>
            {layer.refreshIntervalSeconds && (
              <span className="rounded border border-terra-border px-1.5 py-0.5 text-[10px] text-terra-text-muted">
                ~{layer.refreshIntervalSeconds}s refresh
              </span>
            )}
            {layer.sensitivity === "restricted" && (
              <span className="rounded border border-terra-amber px-1.5 py-0.5 text-[10px] text-terra-amber">
                Restricted
              </span>
            )}
          </div>
          {layer.sourceIds.length > 0 && (
            <div className="space-y-1 border-t border-terra-border pt-2">
              {layer.sourceIds.map((sid) => {
                const src = SOURCES[sid];
                if (!src) return null;
                return (
                  <div key={sid} className="flex items-start gap-1.5">
                    <span className="text-terra-text-muted">Source:</span>
                    {src.url ? (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-terra-accent hover:underline"
                      >
                        {src.name} <Icon name="external" size={11} />
                      </a>
                    ) : (
                      <span className="text-terra-text-secondary">{src.name}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
