import type { CalculationConfidence, CanonicalGameData, DiceDefinitionV3 } from "../../game-data/types";
import type { SimulationInputV3 } from "../engine/types";

export type ConditionInputType = "number" | "boolean" | "select";

export interface ConditionDefinitionV3 {
  key: string;
  labelKey: string;
  type: ConditionInputType;
  defaultValue: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; labelKey: string }>;
}

export interface MechanicContextV3 {
  dice: DiceDefinitionV3;
  input: SimulationInputV3;
  data: CanonicalGameData;
}

export interface MechanicEvaluationV3 {
  confidence: CalculationConfidence;
  values: Record<string, number | boolean | string | null>;
  unresolved: string[];
  sourceRefs: string[];
}

export interface DiceMechanicRuleV3 {
  diceId: string;
  requiredConditions(ctx: Omit<MechanicContextV3, "input"> & { treeRanks: Record<string, number> }): ConditionDefinitionV3[];
  evaluate(ctx: MechanicContextV3): MechanicEvaluationV3;
}
