import type { FeedState } from "@/types/layer";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * Feed-status badge (spec §16/§18). Meaning is NEVER encoded by color alone —
 * every state carries a label and an icon (spec §24). Values must reflect real
 * feed state; in Phase 1 only "simulated" appears.
 */
const CONFIG: Record<FeedState, { label: string; color: string; icon: IconName }> = {
  live: { label: "LIVE", color: "var(--terra-green)", icon: "dot" },
  delayed: { label: "DELAYED", color: "var(--terra-amber)", icon: "clock" },
  stale: { label: "STALE", color: "var(--terra-amber)", icon: "clock" },
  offline: { label: "OFFLINE", color: "var(--terra-text-muted)", icon: "eye-off" },
  historical: { label: "HISTORICAL", color: "var(--terra-violet)", icon: "clock" },
  simulated: { label: "SIMULATED DEMO", color: "var(--terra-cyan)", icon: "sparkles" },
};

export function FeedStatusBadge({ state, className = "" }: { state: FeedState; className?: string }) {
  const c = CONFIG[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
      style={{ color: c.color, borderColor: c.color, background: `color-mix(in srgb, ${c.color} 12%, transparent)` }}
    >
      <Icon name={c.icon} size={11} filled={c.icon === "dot"} />
      {c.label}
    </span>
  );
}
