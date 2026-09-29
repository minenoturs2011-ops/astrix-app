import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * Timeline strip (spec §10). Phase 1 has only live/simulated data, so playback
 * and scrubbing are shown but disabled with an honest note — historical
 * coverage and time-travel arrive in Phase 5. We never pretend layers have
 * history they don't (spec §10, §33).
 */
export function BottomTimeline() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="terra-glass relative z-10 flex items-center gap-3 border-t px-4"
      style={{ height: "var(--terra-timeline-h)" }}
    >
      <button
        className="flex items-center gap-1.5 rounded-lg border border-terra-green/50 bg-terra-green/10 px-3 py-1.5 text-xs font-semibold text-terra-green"
        aria-label="Live — now"
        title="Showing current data"
      >
        <Icon name="dot" size={10} filled /> LIVE · NOW
      </button>

      <div className="tnum hidden text-sm text-terra-text sm:block" aria-label="Current time (UTC)">
        {now.toISOString().slice(0, 19).replace("T", "  ")}{" "}
        <span className="text-xs text-terra-text-muted">UTC</span>
      </div>

      {/* Disabled playback (Phase 5) — present but honestly non-functional. */}
      <div
        className="flex flex-1 items-center gap-2 opacity-45"
        title="Historical playback and scrubbing arrive in Phase 5, when historical sources are added."
      >
        <button disabled aria-label="Step back (available in Phase 5)" className="text-terra-text-muted">
          <Icon name="chevron-left" size={18} />
        </button>
        <button disabled aria-label="Play (available in Phase 5)" className="text-terra-text-muted">
          <Icon name="play" size={18} />
        </button>
        <button disabled aria-label="Step forward (available in Phase 5)" className="text-terra-text-muted">
          <Icon name="chevron-right" size={18} />
        </button>
        <div className="relative mx-2 h-1 flex-1 rounded-full bg-terra-surface-3">
          <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-terra-accent bg-terra-bg" />
        </div>
        <select
          disabled
          aria-label="Playback speed (available in Phase 5)"
          className="tnum rounded-md border border-terra-border bg-terra-surface-2 px-2 py-1 text-xs text-terra-text-muted"
        >
          <option>1×</option>
        </select>
      </div>

      <span className="hidden max-w-[220px] text-[10px] leading-tight text-terra-text-muted lg:block">
        Time-travel & playback unlock in Phase 5 once historical sources are added.
      </span>
    </div>
  );
}
