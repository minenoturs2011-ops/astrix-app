import { useEffect, useRef, useState } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { Icon } from "@/components/ui/Icon";
import { useUiStore, type GlobeStyleMode } from "@/stores/useUiStore";
import { GLOBE_STYLES } from "@/components/globe/globeStyles";

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

function StyleSwitcher() {
  const styleMode = useUiStore((s) => s.styleMode);
  const setStyleMode = useUiStore((s) => s.setStyleMode);
  const modes = Object.keys(GLOBE_STYLES) as GlobeStyleMode[];
  return (
    <div
      className="hidden items-center gap-0.5 rounded-lg border border-terra-border bg-terra-surface-2/70 p-0.5 md:flex"
      role="radiogroup"
      aria-label="Globe display mode"
    >
      {modes.map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={styleMode === m}
          onClick={() => setStyleMode(m)}
          title={GLOBE_STYLES[m].description}
          className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
            styleMode === m
              ? "bg-terra-surface-3 text-terra-text"
              : "text-terra-text-muted hover:text-terra-text"
          }`}
        >
          {GLOBE_STYLES[m].label}
        </button>
      ))}
    </div>
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

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const Row = ({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) => (
    <button
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-6 rounded-md px-2.5 py-2 text-sm text-terra-text hover:bg-terra-surface-3"
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
        <StyleSwitcher />
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
