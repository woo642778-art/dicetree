import type { DamageOutcomeV3 } from "../probability/outcomes";
import type { ScenarioResultV3 } from "./runScenario";

export type ScenarioMetricKindV3 =
  | "practical"
  | "projected-basic"
  | "verified-basic"
  | "tree-excluded-projected"
  | "tree-excluded-verified"
  | "unavailable";

export interface ScenarioSummaryV3 {
  dps: number | null;
  metricKind: ScenarioMetricKindV3;
  confidence: "verified" | "estimated" | "unavailable";
  outcome: DamageOutcomeV3 | null;
  includesSpecialMechanic: boolean;
  includesTree: boolean;
}

/**
 * Selects the same honest headline metric for every simulation surface.
 * Practical DPS wins when it is verified. Otherwise the best basic-attack
 * value remains useful, but is explicitly classified as an estimate whenever
 * it relies on projected growth or excludes the selected tree.
 */
export function summarizeScenarioV3(result: ScenarioResultV3): ScenarioSummaryV3 {
  if (result.simulation.practicalDps !== null && result.outcome && result.simulation.tree.unresolvedNodeIds.length === 0) {
    return {
      dps: result.simulation.practicalDps,
      metricKind: "practical",
      confidence: result.simulation.confidence === "verified" ? "verified" : "estimated",
      outcome: result.outcome,
      includesSpecialMechanic: true,
      includesTree: true,
    };
  }

  const basicKind = result.basicAttackOutcomeKind;
  if (result.basicAttackOutcome && basicKind) {
    return {
      dps: result.basicAttackOutcome.dps.average,
      metricKind: basicKind === "projected"
        ? "projected-basic"
        : basicKind === "verified"
          ? "verified-basic"
          : basicKind,
      confidence: basicKind === "verified" ? "verified" : "estimated",
      outcome: result.basicAttackOutcome,
      includesSpecialMechanic: false,
      includesTree: !basicKind.startsWith("tree-excluded"),
    };
  }

  return {
    dps: null,
    metricKind: "unavailable",
    confidence: "unavailable",
    outcome: null,
    includesSpecialMechanic: false,
    includesTree: false,
  };
}
