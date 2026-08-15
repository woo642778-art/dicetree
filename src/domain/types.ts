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
