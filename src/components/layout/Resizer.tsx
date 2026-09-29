import { useCallback, useEffect, useRef } from "react";

/**
 * A 1px draggable divider for resizing side panels. `side` says which panel the
 * handle belongs to so drag direction maps correctly. Keyboard-accessible:
 * arrow keys nudge the width (spec §24).
 */
export function Resizer({
  side,
  width,
  min,
  max,
  onChange,
  ariaLabel,
}: {
  side: "left" | "right";
  width: number;
  min: number;
  max: number;
  onChange: (w: number) => void;
  ariaLabel: string;
}) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const clamp = useCallback((w: number) => Math.min(max, Math.max(min, w)), [min, max]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - startX.current;
      const delta = side === "left" ? dx : -dx;
      onChange(clamp(startW.current + delta));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [side, onChange, clamp]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      tabIndex={0}
      onPointerDown={(e) => {
        dragging.current = true;
        startX.current = e.clientX;
        startW.current = width;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onChange(clamp(width - (side === "left" ? 16 : -16)));
        if (e.key === "ArrowRight") onChange(clamp(width + (side === "left" ? 16 : -16)));
      }}
      className="group relative z-10 w-1 shrink-0 cursor-col-resize bg-terra-border transition-colors hover:bg-terra-accent/60"
    >
      <span className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}
