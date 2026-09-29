import { useCallback, useEffect, useRef, useState } from "react";
import { searchPlaces, type GeocodeResult } from "@/lib/geocode";
import { useUiStore } from "@/stores/useUiStore";
import { Icon } from "@/components/ui/Icon";
import { formatLatLon } from "@/lib/format";

const RECENT_KEY = "terra:recent-searches";
const DEBOUNCE_MS = 300;

function loadRecent(): GeocodeResult[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as GeocodeResult[]).slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [recent, setRecent] = useState<GeocodeResult[]>(() => loadRecent());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const flyTo = useUiStore((s) => s.flyTo);

  // Debounced search (spec §8).
  useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const r = await searchPlaces(q, ctrl.signal);
        setResults(r);
        setError(null);
        setActiveIndex(r.length > 0 ? 0 : -1);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError("Search is temporarily unavailable. Check your connection and try again.");
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const commit = useCallback(
    (r: GeocodeResult) => {
      flyTo(r.longitude, r.latitude, r.kind === "coordinate" ? 800_000 : 300_000);
      setOpen(false);
      setQuery(r.name);
      inputRef.current?.blur();
      // Persist recent (non-sensitive place config only).
      setRecent((prev) => {
        const next = [r, ...prev.filter((x) => x.id !== r.id)].slice(0, 5);
        try {
          localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        } catch {
          /* ignore storage errors (private mode) */
        }
        return next;
      });
    },
    [flyTo],
  );

  const shown = query.trim().length > 0 ? results : recent;
  const showRecentHeader = query.trim().length === 0 && recent.length > 0;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0 && shown[activeIndex]) {
      commit(shown[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative w-full max-w-xl">
      <div className="flex items-center gap-2 rounded-lg border border-terra-border bg-terra-surface-2/80 px-3 py-2 transition-colors focus-within:border-terra-border-hover">
        <Icon name="search" size={16} className="text-terra-text-muted" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-results"
          aria-autocomplete="list"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder="Search places or coordinates (e.g. Tokyo, or 35.68, 139.69)"
          className="tnum w-full bg-transparent text-sm text-terra-text placeholder:text-terra-text-muted focus:outline-none"
          aria-label="Search places and coordinates"
        />
        {loading && <span className="text-[10px] text-terra-text-muted">…</span>}
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="text-terra-text-muted hover:text-terra-text"
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </div>

      {open && (query.trim().length > 0 || recent.length > 0) && (
        <div
          id="search-results"
          role="listbox"
          className="terra-glass absolute z-30 mt-2 w-full overflow-hidden rounded-lg shadow-panel-lg"
        >
          {error && <div className="px-3 py-3 text-sm text-terra-red">{error}</div>}
          {!error && showRecentHeader && (
            <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-terra-text-muted">
              Recent
            </div>
          )}
          {!error && shown.length === 0 && !loading && query.trim().length > 0 && (
            <div className="px-3 py-3 text-sm text-terra-text-secondary">
              No matching places found. Try a different name or enter coordinates.
            </div>
          )}
          <ul className="max-h-80 overflow-y-auto py-1">
            {shown.map((r, i) => (
              <li key={r.id} role="option" aria-selected={i === activeIndex}>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(r);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left ${
                    i === activeIndex ? "bg-terra-surface-3" : ""
                  }`}
                >
                  <Icon
                    name={r.kind === "coordinate" ? "target" : "globe"}
                    size={16}
                    className="shrink-0 text-terra-accent"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-terra-text">{r.name}</span>
                    <span className="tnum block truncate text-xs text-terra-text-muted">
                      {r.kind === "coordinate"
                        ? formatLatLon(r.latitude, r.longitude)
                        : [r.admin, r.country].filter(Boolean).join(", ") ||
                          formatLatLon(r.latitude, r.longitude)}
                    </span>
                  </span>
                  <span className="shrink-0 rounded border border-terra-border px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-terra-text-muted">
                    {r.kind === "coordinate" ? "Coord" : "Place"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-terra-border px-3 py-1.5 text-[10px] text-terra-text-muted">
            Places via Open-Meteo Geocoding · names from GeoNames (CC BY 4.0)
          </div>
        </div>
      )}
    </div>
  );
}
