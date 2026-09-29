/**
 * Minimal inline-SVG icon set (stroke-based, 24x24). Keeps the bundle free of
 * an icon dependency. Icons back the layer catalog and chrome; every icon-only
 * button in the app also carries an accessible label (spec §24).
 */
import type { CSSProperties } from "react";

export type IconName =
  | "sparkles"
  | "plane"
  | "satellite"
  | "ship"
  | "bus"
  | "alert"
  | "radar"
  | "thermometer"
  | "activity"
  | "flame"
  | "mountain"
  | "orbit"
  | "sun"
  | "rocket"
  | "wind"
  | "layers"
  | "building"
  | "camera"
  | "bookmark"
  | "upload"
  | "search"
  | "close"
  | "settings"
  | "clock"
  | "home"
  | "globe"
  | "chevron-left"
  | "chevron-right"
  | "chevron-down"
  | "eye"
  | "eye-off"
  | "info"
  | "external"
  | "play"
  | "pause"
  | "target"
  | "lock"
  | "dot";

const PATHS: Record<IconName, JSX.Element> = {
  sparkles: (
    <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3zM19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z" />
  ),
  plane: <path d="M10 2l1 8-8 4v2l8-1 1 6-2 1v1l3-1 3 1v-1l-2-1 1-6 8 1v-2l-8-4 1-8-3 2-3-2z" />,
  satellite: (
    <>
      <path d="M5 5l3 3M3 11a8 8 0 018-8" />
      <rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)" />
      <path d="M16 16l4 4" />
    </>
  ),
  ship: <path d="M3 14l1.5 5A2 2 0 006.4 20h11.2a2 2 0 001.9-1L21 14l-9-3-9 3zM12 3v8M8 7h8" />,
  bus: (
    <>
      <rect x="4" y="4" width="16" height="12" rx="2" />
      <path d="M4 10h16M8 20v-2M16 20v-2M8 16h.01M16 16h.01" />
    </>
  ),
  alert: <path d="M12 3l10 17H2L12 3zM12 10v4M12 17h.01" />,
  radar: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 12l7-4" />
    </>
  ),
  thermometer: <path d="M14 14V5a2 2 0 10-4 0v9a4 4 0 104 0z" />,
  activity: <path d="M2 12h4l3 8 4-16 3 8h6" />,
  flame: <path d="M12 2s5 4 5 9a5 5 0 01-10 0c0-2 1-3 1-3s0 2 2 2c0-3 2-8 2-8z" />,
  mountain: <path d="M3 20h18L14 6l-4 7-2-3-5 10z" />,
  orbit: (
    <>
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(30 12 12)" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </>
  ),
  rocket: <path d="M5 15c-1 1-2 5-2 5s4-1 5-2m6.5-14C10 6 7 12 7 12l5 5s6-3 8-7.5c1-2 1-6 1-6s-4 0-6.5 1z" />,
  wind: <path d="M3 8h11a3 3 0 100-6M3 12h16a3 3 0 110 6M3 16h8a2 2 0 110 4" />,
  layers: <path d="M12 2l10 6-10 6L2 8l10-6zM2 14l10 6 10-6" />,
  building: <path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M20 21V9a1 1 0 00-1-1h-3M8 7h4M8 11h4M8 15h4" />,
  camera: (
    <>
      <path d="M3 8a2 2 0 012-2h2l1.5-2h7L18 6h1a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </>
  ),
  bookmark: <path d="M6 3h12v18l-6-4-6 4V3z" />,
  upload: <path d="M12 16V4m0 0L7 9m5-5l5 5M4 20h16" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  close: <path d="M5 5l14 14M19 5L5 19" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  home: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
    </>
  ),
  "chevron-left": <path d="M15 5l-7 7 7 7" />,
  "chevron-right": <path d="M9 5l7 7-7 7" />,
  "chevron-down": <path d="M5 9l7 7 7-7" />,
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": <path d="M3 3l18 18M10.5 10.7a3 3 0 004 4M6.5 6.6C3.6 8.2 2 12 2 12s4 7 10 7c1.9 0 3.6-.5 5-1.3M9.9 5.2A10 10 0 0112 5c6 0 10 7 10 7a17 17 0 01-2.2 3" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />,
  play: <path d="M7 4l13 8-13 8V4z" />,
  pause: <path d="M8 4v16M16 4v16" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v3M12 20v3M1 12h3M20 12h3" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="4" />,
};

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
  filled?: boolean;
};

export function Icon({ name, size = 18, className, style, strokeWidth = 1.75, filled = false }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name] ?? PATHS.dot}
    </svg>
  );
}
