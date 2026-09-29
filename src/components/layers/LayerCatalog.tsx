import { useMemo, useState } from "react";
import { LAYER_CATALOG, CATEGORY_ORDER } from "@/lib/layerRegistry";
import { LayerItem } from "./LayerItem";
import { Icon } from "@/components/ui/Icon";
import { useLayerStore } from "@/stores/useLayerStore";

export function LayerCatalog() {
  const [filter, setFilter] = useState("");
  const resetDefaults = useLayerStore((s) => s.resetDefaults);
  const enabledCount = useLayerStore(
    (s) => Object.values(s.layers).filter((l) => l.enabled).length,
  );

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const matches = LAYER_CATALOG.filter(
      (l) =>
        q.length === 0 ||
        l.name.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q),
    );
    const byCat = new Map<string, typeof matches>();
    for (const l of matches) {
      const arr = byCat.get(l.category) ?? [];
      arr.push(l);
      byCat.set(l.category, arr);
    }
    return CATEGORY_ORDER.filter((c) => byCat.has(c)).map((c) => ({ category: c, layers: byCat.get(c)! }));
  }, [filter]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-terra-text-muted">Explore</h2>
        <span className="tnum text-[10px] text-terra-text-muted">{enabledCount} on</span>
      </div>

      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg border border-terra-border bg-terra-surface-2/70 px-2.5 py-1.5">
          <Icon name="search" size={14} className="text-terra-text-muted" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter layers…"
            aria-label="Filter layers"
            className="w-full bg-transparent text-xs text-terra-text placeholder:text-terra-text-muted focus:outline-none"
          />
          {filter && (
            <button onClick={() => setFilter("")} aria-label="Clear layer filter" className="text-terra-text-muted hover:text-terra-text">
              <Icon name="close" size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-3">
        {grouped.length === 0 && (
          <p className="px-1 py-4 text-xs text-terra-text-secondary">No layers match “{filter}”.</p>
        )}
        {grouped.map(({ category, layers }) => (
          <section key={category}>
            <h3 className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-terra-text-muted">
              {category}
            </h3>
            <div className="space-y-1.5">
              {layers.map((l) => (
                <LayerItem key={l.id} layer={l} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="border-t border-terra-border p-3">
        <button
          onClick={resetDefaults}
          className="w-full rounded-lg border border-terra-border py-1.5 text-xs text-terra-text-secondary hover:border-terra-border-hover hover:text-terra-text"
        >
          Reset layers to defaults
        </button>
        <p className="mt-2 text-[10px] leading-relaxed text-terra-text-muted">
          Most layers are catalogued for later phases. Only layers marked{" "}
          <span className="text-terra-green">Available</span> render data today. Live feeds arrive in Phase 2.
        </p>
      </div>
    </div>
  );
}
