import { describe, it, expect } from "vitest";
import { parseFirmsCsv } from "./firms";

const VIIRS_CSV = `country_id,latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
USA,38.1234,-120.5678,330.5,0.4,0.4,2026-09-29,0912,N,VIIRS,h,2.0NRT,295.1,12.4,D
CAN,51.0,-115.0,310.2,0.5,0.5,2026-09-29,1030,N,VIIRS,n,2.0NRT,290.0,3.1,N
BAD,notanumber,-100,,,,,,,,l,,,,`;

const MODIS_CSV = `latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
40.0,-105.0,320.0,1.0,1.0,2026-09-29,0800,Terra,MODIS,85,6.1NRT,295.0,20.5,D
41.0,-106.0,315.0,1.0,1.0,2026-09-29,0805,Terra,MODIS,20,6.1NRT,290.0,5.0,D`;

describe("parseFirmsCsv", () => {
  const now = "2026-09-29T12:00:00Z";

  it("parses VIIRS rows, normalizes confidence, and skips invalid coords", () => {
    const recs = parseFirmsCsv(VIIRS_CSV, "VIIRS_NOAA20_NRT", now);
    expect(recs).toHaveLength(2); // the "notanumber" lat row is skipped
    expect(recs[0].confidence).toBe("high");
    expect(recs[0].frp).toBeCloseTo(12.4);
    expect(recs[0].entity.category).toBe("wildfire");
    expect(recs[0].entity.longitude).toBeCloseTo(-120.5678);
    expect(recs[0].entity.observedAt).toBe("2026-09-29T09:12:00Z");
    expect(recs[0].entity.receivedAt).toBe(now);
    expect(recs[1].confidence).toBe("nominal");
  });

  it("maps MODIS numeric confidence to bands", () => {
    const recs = parseFirmsCsv(MODIS_CSV, "MODIS_NRT", now);
    expect(recs).toHaveLength(2);
    expect(recs[0].confidence).toBe("high"); // 85 >= 80
    expect(recs[1].confidence).toBe("low"); // 20 < 30
  });

  it("returns [] for empty or header-only input", () => {
    expect(parseFirmsCsv("", "VIIRS_SNPP_NRT", now)).toEqual([]);
    expect(parseFirmsCsv("latitude,longitude\n", "VIIRS_SNPP_NRT", now)).toEqual([]);
  });
});
