import { describe, it, expect } from "vitest";
import { formatLatLon, formatDegrees, timeAgo, formatUtc } from "./format";

describe("formatLatLon", () => {
  it("labels hemispheres correctly", () => {
    expect(formatLatLon(35.6895, 139.69171)).toBe("35.6895°N, 139.6917°E");
    expect(formatLatLon(-33.9, -18.4)).toBe("33.9000°S, 18.4000°W");
  });
  it("respects decimal precision", () => {
    expect(formatLatLon(10.123456, -20.987654, 2)).toBe("10.12°N, 20.99°W");
  });
});

describe("formatDegrees", () => {
  it("keeps sign and precision", () => {
    expect(formatDegrees(-12.3456)).toBe("-12.3456°");
  });
});

describe("timeAgo", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  it("handles recent and older times", () => {
    expect(timeAgo(new Date(now - 2000).toISOString(), now)).toBe("just now");
    expect(timeAgo(new Date(now - 30_000).toISOString(), now)).toBe("30s ago");
    expect(timeAgo(new Date(now - 5 * 60_000).toISOString(), now)).toBe("5m ago");
    expect(timeAgo(new Date(now - 3 * 3600_000).toISOString(), now)).toBe("3h ago");
    expect(timeAgo(new Date(now - 2 * 86_400_000).toISOString(), now)).toBe("2d ago");
  });
  it("returns 'unknown' for missing/invalid input", () => {
    expect(timeAgo(undefined)).toBe("unknown");
    expect(timeAgo("not-a-date")).toBe("unknown");
  });
});

describe("formatUtc", () => {
  it("renders ISO UTC and handles missing values", () => {
    expect(formatUtc("2026-01-01T12:34:56Z")).toBe("2026-01-01 12:34:56Z");
    expect(formatUtc(undefined)).toBe("—");
    expect(formatUtc("nope")).toBe("—");
  });
});
