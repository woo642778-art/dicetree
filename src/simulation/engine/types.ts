import type { CalculationConfidence } from "../../game-data/types";

export type SimulationStage =
  | "permanent-growth"
  | "battle-upgrade"
  | "tree-passive"
  | "rune"
  | "mechanic"
  | "enemy";

export type ModifierOperation = "add" | "multiply" | "replace";

export interface EnemyScenarioV3 {
  id: string;
  kind: "normal" | "elite" | "boss" | "custom";
  hp?: number;
  values?: Record<string, number | string | boolean>;
}

export interface SimulationInputV3 {
  diceId: string;
  diceProgressionLevel: number;
  battleUpgradeLevel: number;
  treeRanks: Record<string, number>;
  conditionValues: Record<string, number | boolean | string>;
  enemy: EnemyScenarioV3;
  durationSeconds: number;
}

export interface StatModifierV3 {
  id: string;
  stage: SimulationStage;
  stat: string;
  operation: ModifierOperation;
  value: number;
  confidence: CalculationConfidence;
  sourceRefs: string[];
  labelKey?: string;
}

export interface CalculationTraceStepV3 {
  id: string;
  stage: SimulationStage;
  stat: string;
  inputValue: number | null;
  outputValue: number | null;
  operation: ModifierOperation;
  modifierValue: number;
  applied: boolean;
  confidence: CalculationConfidence;
  sourceRefs: string[];
  labelKey?: string;
  reason?: "partial-formula" | "missing-input";
}

export interface SimulationResultV3 {
  diceId: string;
  stats: Record<string, number>;
  basicAttackDps: number | null;
  practicalDps: number | null;
  confidence: CalculationConfidence;
  trace: CalculationTraceStepV3[];
  unresolvedMechanics: string[];
  unresolvedStats: string[];
}
