import { useEffect, useRef, useState } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { Icon } from "@/components/ui/Icon";
import { useUiStore } from "@/stores/useUiStore";
import { BASE_MAPS, baseMapAvailable, CAPS, type BaseMapId } from "@/components/globe/baseMaps";

function UtcClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="tnum hidden text-xs text-terra-text-secondary lg:inline" aria-label="Current UTC time">
      {now.toISOString().slice(11, 19)} UTC
    </span>
  );
}

function BaseMapSelector() {
  const baseMap = useUiStore((s) => s.baseMap);
  const setBaseMap = useUiStore((s) => s.setBaseMap);
  const active = BASE_MAPS.find((b) => b.id === baseMap);
  return (
    <label className="hidden items-center gap-1.5 md:flex">
      <span className="sr-only">Base map</span>
      <Icon name="layers" size={15} className="text-terra-text-muted" />
      <select
        value={baseMap}
        onChange={(e) => setBaseMap(e.target.value as BaseMapId)}
        title={active?.description}
        aria-label="Base map"
        className="rounded-lg border border-terra-border bg-terra-surface-2/70 px-2 py-1 text-xs text-terra-text focus:border-terra-border-hover focus:outline-none"
      >
        {BASE_MAPS.map((b) => {
          const avail = baseMapAvailable(b);
          return (
            <option key={b.id} value={b.id} disabled={!avail}>
              {b.label}
              {!avail ? " (needs key)" : ""}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const atmosphere = useUiStore((s) => s.atmosphere);
  const toggleAtmosphere = useUiStore((s) => s.toggleAtmosphere);
  const reducedEffects = useUiStore((s) => s.reducedEffects);
  const toggleReducedEffects = useUiStore((s) => s.toggleReducedEffects);
  const presentationMode = useUiStore((s) => s.presentationMode);
  const togglePresentation = useUiStore((s) => s.togglePresentation);
  const terrain = useUiStore((s) => s.terrain);
  const toggleTerrain = useUiStore((s) => s.toggleTerrain);
  const buildings = useUiStore((s) => s.buildings);
  const toggleBuildings = useUiStore((s) => s.toggleBuildings);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const Row = ({
    label,
    checked,
    onToggle,
    disabled,
    hint,
  }: {
    label: string;
    checked: boolean;
    onToggle: () => void;
    disabled?: boolean;
    hint?: string;
  }) => (
    <button
      role="menuitemcheckbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      title={disabled ? hint : undefined}
      className={`flex w-full items-center justify-between gap-6 rounded-md px-2.5 py-2 text-sm ${
        disabled ? "cursor-not-allowed text-terra-text-muted opacity-60" : "text-terra-text hover:bg-terra-surface-3"
      }`}
    >
      <span>{label}</span>
      <span
        className={`flex h-4 w-7 items-center rounded-full border transition-colors ${
          checked ? "border-terra-accent bg-terra-accent/30" : "border-terra-border bg-terra-surface-2"
        }`}
      >
        <span
          className={`h-3 w-3 rounded-full transition-transform ${
            checked ? "translate-x-3.5 bg-terra-accent" : "translate-x-0.5 bg-terra-text-muted"
          }`}
        />
      </span>
    </button>
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings and display options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-terra-border text-terra-text-secondary hover:border-terra-border-hover hover:text-terra-text"
      >
        <Icon name="settings" size={18} />
      </button>
      {open && (
        <div
          role="menu"
          className="terra-glass absolute right-0 z-30 mt-2 w-60 rounded-lg p-1.5 shadow-panel-lg"
        >
          <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-terra-text-muted">
            Display
          </div>
          <Row label="Atmosphere glow" checked={atmosphere} onToggle={toggleAtmosphere} />
          <Row label="Reduced effects (low-power)" checked={reducedEffects} onToggle={toggleReducedEffects} />
          <Row label="Presentation mode (globe only)" checked={presentationMode} onToggle={togglePresentation} />
          <div className="mt-1 px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-terra-text-muted">
            3D detail
          </div>
          <Row
            label="3D terrain"
            checked={terrain}
            onToggle={toggleTerrain}
            disabled={!CAPS.ion}
            hint="Requires a Cesium Ion token (see .env.example)"
          />
          <Row
            label="3D buildings"
            checked={buildings}
            onToggle={toggleBuildings}
            disabled={!CAPS.ion}
            hint="Requires a Cesium Ion token (see .env.example)"
          />
          {!CAPS.ion && (
            <p className="px-2.5 pb-1.5 pt-1 text-[10px] leading-relaxed text-terra-text-muted">
              Add a free Cesium Ion token to enable 3D terrain & buildings. For full
              Google-Earth-style 3D, add a Google Maps key (Base map → Google 3D). See the README.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const toggleLeft = useUiStore((s) => s.toggleLeft);
  const leftOpen = useUiStore((s) => s.leftOpen);
  const presentationMode = useUiStore((s) => s.presentationMode);
  const togglePresentation = useUiStore((s) => s.togglePresentation);

  return (
    <header
      className="terra-glass relative z-20 flex items-center gap-3 border-b px-3"
      style={{ height: "var(--terra-topbar-h)" }}
    >
      {!presentationMode && (
        <button
          onClick={toggleLeft}
          aria-label={leftOpen ? "Collapse layer panel" : "Expand layer panel"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-terra-border text-terra-text-secondary hover:border-terra-border-hover hover:text-terra-text"
        >
          <Icon name={leftOpen ? "chevron-left" : "chevron-right"} size={18} />
        </button>
      )}

      <div className="flex shrink-0 items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{ background: "linear-gradient(135deg, var(--terra-accent), var(--terra-violet))" }}
          aria-hidden="true"
        >
          <Icon name="globe" size={18} className="text-terra-bg" strokeWidth={2} />
        </span>
        <span className="text-base font-semibold tracking-wide text-terra-text">TERRA</span>
        <span className="hidden rounded border border-terra-border px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-terra-text-muted sm:inline">
          Phase 2
        </span>
      </div>

      {!presentationMode && (
        <div className="flex flex-1 justify-center px-2">
          <SearchBar />
        </div>
      )}
      {presentationMode && <div className="flex-1" />}

      <div className="flex shrink-0 items-center gap-2">
        <UtcClock />
        <BaseMapSelector />
        {presentationMode ? (
          <button
            onClick={togglePresentation}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-terra-border px-3 text-xs text-terra-text-secondary hover:border-terra-border-hover hover:text-terra-text"
          >
            <Icon name="eye" size={16} /> Exit presentation
          </button>
        ) : (
          <SettingsMenu />
        )}
      </div>
    </header>
  );
}
