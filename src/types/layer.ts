/**
 * Shared layer model (spec §6). Every map layer — live, periodic, static, or
 * historical — declares itself with this shape so layer controls, provenance,
 * and freshness are handled uniformly.
 */

export type LayerUpdateMode = "live" | "periodic" | "static" | "historical";
export type SupportedView = "globe" | "map" | "timeline";
export type LayerSensitivity = "public" | "restricted";

/**
 * Implementation status is a TERRA-specific extension of the spec's layer model.
 * It lets the catalog list the full master catalog (spec §7/§13) honestly:
 * only "available" layers actually fetch/render; the rest are clearly marked as
 * not yet implemented so no fake coverage is implied (spec §2.3, §13, §33).
 */
export type LayerImplementationStatus =
  | "available" // wired to a real source or a clearly-labeled simulated feed
  | "planned" // catalogued, not yet implemented in this build
  | "requires-credentials"; // adapter exists conceptually but needs provider keys/terms

export type TerraLayerDefinition = {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  enabledByDefault: boolean;
  supportedViews: SupportedView[];
  sourceIds: string[];
  updateMode: LayerUpdateMode;
  refreshIntervalSeconds?: number;
  attribution?: string;
  termsUrl?: string;
  coverageDescription: string;
  knownLimitations: string[];
  sensitivity?: LayerSensitivity;
  defaultStyle: Record<string, unknown>;

  // TERRA extensions
  implementationStatus: LayerImplementationStatus;
  /** True when this layer renders simulated/demo data (must be labeled, spec §2.3). */
  simulated?: boolean;
  /** Capability (env key) that unlocks this layer when status is
   * "requires-credentials" — e.g. "firms" for NASA FIRMS wildfires. */
  requiresCapability?: "ion" | "google" | "firms";
};

/**
 * Feed status model (spec §18). Values must come from real feed state, never
 * hardcoded. In Phase 1 only the simulated demo layer produces a live status
 * ("simulated"); real feeds arrive in Phase 2.
 */
export type FeedState =
  | "live"
  | "delayed"
  | "stale"
  | "offline"
  | "historical"
  | "simulated";

export type FeedStatus = {
  sourceId: string;
  state: FeedState;
  observedAt?: string;
  receivedAt?: string;
  lastSuccessfulFetchAt?: string;
  expectedRefreshSeconds?: number;
  coverageDescription?: string;
  message?: string;
};

/** A data source/provider descriptor referenced by layers (spec §14/§28). */
export type SourceDefinition = {
  id: string;
  name: string;
  organization: string;
  url: string;
  attribution: string;
  requiresCredentials: boolean;
  notes?: string;
};
