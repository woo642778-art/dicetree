export type DiceFamily = "order" | "chaos" | "magic" | "engineering" | "nature";
export type VerificationStatus = "verified" | "partial" | "unverified";
export type ResourceType = "gold" | "core" | "token";
export type PlannerRole = "dealer" | "support" | "balanced";
export type SpendingProfile = "f2p" | "light" | "spender";

export interface VerificationMetadata {
  status: VerificationStatus;
  checkedAt: string;
  sourceLabel?: string;
  sourceUrl?: string;
  gameVersion?: string;
  notes?: string;
}

export type EffectTarget = "all" | DiceFamily | { diceIds: string[] };

export type EffectDefinition =
  | {
      kind: "bulletDamagePercent";
      amount: number;
      appliesTo: EffectTarget;
      verifiedFormula: boolean;
    }
  | {
      kind: "attackSpeedPercent";
      amount: number;
      appliesTo: Exclude<EffectTarget, "all">;
      verifiedFormula: boolean;
    }
  | {
      kind: "supportUtility";
      utilityKey: string;
      amount: number;
      appliesTo: { diceIds: string[] };
    };

export interface ResourceTotals {
  gold: number;
  core: number;
  token: number;
}

export interface TreeNodeLevel {
  rank: number;
  costs: Partial<Record<ResourceType, number>>;
  costsKnown: boolean;
  effects: EffectDefinition[];
  effectsKnown: boolean;
}

export interface TreeNodeDefinition {
  id: string;
  family: DiceFamily;
  position: { x: number; y: number };
  maxRank: number;
  prerequisites: Array<{ nodeId: string; minRank: number }>;
  visualParentIds?: string[];
  levels: TreeNodeLevel[];
  localizationKey: string;
  verification: VerificationMetadata;
  tags: string[];
  investable: boolean;
  routeKnown: boolean;
}

export interface DiceDefinition {
  id: string;
  family: DiceFamily;
  localizationKey: string;
  roles: PlannerRole[];
  verification: VerificationMetadata;
  tags: string[];
}

export interface PlannerGoals {
  primaryDieId?: string;
  secondaryDieIds: string[];
  role: PlannerRole;
  spendingProfile: SpendingProfile;
  budget?: Partial<Record<ResourceType, number>>;
}

export interface PlannerStateV1 {
  schemaVersion: 1;
  dataVersion: string;
  ranks: Record<string, number>;
  goals: PlannerGoals;
}

export interface RouteStep {
  nodeId: string;
  targetRank: number;
}

export type EvaluationMode = "exact" | "heuristic" | "unsupported";

export interface EvaluatedEffect {
  mode: EvaluationMode;
  utility: number;
  exactPercent?: number;
  coverage: number;
  reasonKey: string;
}

export interface RecommendationScore {
  score: number;
  utility: number;
  normalizedCost: number;
  coverage: number;
  confidence: VerificationStatus;
}

export interface Recommendation {
  nodeId: string;
  route: RouteStep[];
  incrementalCosts: ResourceTotals;
  score: number;
  confidence: VerificationStatus;
  reasons: string[];
  mode: EvaluationMode;
  exactPercent?: number;
}

/**
 * V2 data types keep provenance on each field so a node can have a verified
 * position and observed cost while its effect text is still unknown.
 */
export type Confidence = "verified" | "observed" | "partial" | "inferred" | "unknown";
export type SourceKind = "userScreenshot" | "official" | "community" | "legacy";

export interface SourceRef {
  id: string;
  kind: SourceKind;
  label: string;
  url?: string;
  observedAt: string;
  notes?: string;
}

export interface SourcedField<T> {
  value?: T;
  confidence: Confidence;
  sourceIds: string[];
  notes?: string;
}

export interface LocalizedText {
  ko: string;
  en: string;
}

export type ResourceId = "gold" | "blueCard" | "redCard" | "prismCube";
export type ResourceCostV2 = Partial<Record<ResourceId, number>>;
export type ResourceInventory = Record<ResourceId, number>;

export type TreeNodeKind = "core" | "dice" | "stat" | "milestone" | "capstone" | "connector";

export interface TreeNodeV2 {
  id: string;
  family: DiceFamily | "core";
  kind: TreeNodeKind;
  position: { x: number; y: number };
  prerequisites: Array<{ nodeId: string; minRank: number }>;
  visualParentIds?: string[];
  name: SourcedField<LocalizedText>;
  iconKey?: SourcedField<string>;
  maxRank: SourcedField<number>;
  displayedRank?: SourcedField<{ current: number; max: number }>;
  costsByRank?: Array<SourcedField<ResourceCostV2>>;
  observedNextCost?: SourcedField<ResourceCostV2>;
  observedNextCostFromRank?: number;
  effectSummary?: SourcedField<LocalizedText>;
  affectedDice?: SourcedField<string[]>;
  tags: string[];
  sourceIds: string[];
  fieldConfidence: Record<string, Confidence>;
  investable: boolean;
}

export interface DiceDefinitionV2 {
  id: string;
  family: DiceFamily;
  name: SourcedField<LocalizedText>;
  iconKey?: SourcedField<string>;
  roles: PlannerRole[];
  tags: string[];
  sourceIds: string[];
}

export type ProgressionProfile = "conservative" | "balanced" | "ceiling";

export interface PlannerGoalsV2 {
  primaryDieId?: string;
  secondaryDieIds: string[];
  role: PlannerRole;
  progressionProfile: ProgressionProfile;
  routeTargetNodeId?: string;
}

export interface PlannerStateV2 {
  schemaVersion: 2;
  dataVersion: string;
  ranks: Record<string, number>;
  inventory: ResourceInventory;
  goals: PlannerGoalsV2;
}

export interface ResourceDefinitionV2 {
  id: ResourceId;
  name: SourcedField<LocalizedText>;
  iconKey: string;
  accent: string;
}
