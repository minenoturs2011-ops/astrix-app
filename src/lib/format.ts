/** Formatting helpers. Coordinates/times use tabular numerals in the UI. */

/** Format a longitude/latitude pair as e.g. "35.6895°N, 139.6917°E". */
export function formatLatLon(lat: number, lon: number, decimals = 4): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(decimals)}°${ns}, ${Math.abs(lon).toFixed(decimals)}°${ew}`;
}

/** Signed decimal degrees, fixed precision, for compact readouts. */
export function formatDegrees(value: number, decimals = 4): string {
  return `${value.toFixed(decimals)}°`;
}

/** Human "time ago" for freshness labels (spec §16/§18). */
export function timeAgo(iso?: string, now: number = Date.now()): string {
  if (!iso) return "unknown";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "unknown";
  const secs = Math.max(0, Math.round((now - t) / 1000));
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** Format an ISO timestamp in UTC (whole seconds) for unambiguous display. */
export function formatUtc(iso?: string): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  // Drop milliseconds: "2026-09-29T21:36:21.913Z" -> "2026-09-29 21:36:21Z"
  return new Date(t).toISOString().slice(0, 19).replace("T", " ") + "Z";
}
