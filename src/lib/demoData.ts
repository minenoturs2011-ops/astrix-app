import type { TerraEntity } from "@/types/entity";

/**
 * SIMULATED demo entities (spec §2.3, §29). Everything here is invented and
 * must always be labeled as simulated. It exists only to demonstrate selection,
 * the inspector, and feed-status UI before real feeds are wired up (Phase 2).
 *
 * Positions drift deterministically from a seed so the "live (simulated)" feel
 * is visible without pretending to be real observations.
 */

type DemoSeed = {
  id: string;
  name: string;
  category: TerraEntity["category"];
  baseLon: number;
  baseLat: number;
  altitudeMeters?: number;
  note: string;
  radiusDeg: number;
  periodSec: number;
};

const SEEDS: DemoSeed[] = [
  {
    id: "sim-1",
    name: "Sample Vessel Alpha",
    category: "demo",
    baseLon: -30,
    baseLat: 20,
    note: "Simulated moving object over the Atlantic.",
    radiusDeg: 6,
    periodSec: 90,
  },
  {
    id: "sim-2",
    name: "Sample Aircraft Bravo",
    category: "demo",
    baseLon: 100,
    baseLat: 35,
    altitudeMeters: 11000,
    note: "Simulated high-altitude object over Asia.",
    radiusDeg: 8,
    periodSec: 60,
  },
  {
    id: "sim-3",
    name: "Sample Station Charlie",
    category: "demo",
    baseLon: 18,
    baseLat: -34,
    note: "Simulated stationary station near Cape Town.",
    radiusDeg: 0,
    periodSec: 1,
  },
  {
    id: "sim-4",
    name: "Sample Object Delta",
    category: "demo",
    baseLon: -74,
    baseLat: 40.7,
    altitudeMeters: 400000,
    note: "Simulated fast object over North America.",
    radiusDeg: 12,
    periodSec: 30,
  },
];

/** Compute the current simulated positions at time `nowMs`. */
export function getDemoEntities(nowMs: number = Date.now()): TerraEntity[] {
  const receivedAt = new Date(nowMs).toISOString();
  return SEEDS.map((s) => {
    const angle = ((nowMs / 1000) % s.periodSec) / s.periodSec * Math.PI * 2;
    const lon = s.baseLon + Math.cos(angle) * s.radiusDeg;
    const lat = s.baseLat + Math.sin(angle) * s.radiusDeg * 0.5;
    const speedKts = s.radiusDeg === 0 ? 0 : Math.round(120 + Math.abs(Math.sin(angle)) * 380);
    const heading = Math.round(((angle * 180) / Math.PI + 90) % 360);

    return {
      id: s.id,
      category: s.category,
      name: s.name,
      longitude: lon,
      latitude: lat,
      altitudeMeters: s.altitudeMeters,
      sourceId: "terra-sim",
      sourceName: "TERRA Simulated Demo",
      feedState: "simulated",
      observedAt: receivedAt,
      receivedAt,
      simulated: true,
      fields: [
        { label: "Note", value: s.note },
        { label: "Simulated speed", value: speedKts, unit: "kn", provenance: "computed", mono: true },
        { label: "Simulated heading", value: heading, unit: "°", provenance: "computed", mono: true },
        ...(s.altitudeMeters !== undefined
          ? [{ label: "Altitude", value: s.altitudeMeters, unit: "m", provenance: "computed" as const, mono: true }]
          : []),
      ],
    } satisfies TerraEntity;
  });
}
