import type { CanonicalGameData } from "../../game-data/types";
import { simulateDiceWithTreeV3, type TreeAwareSimulationResultV3 } from "../engine/simulateTreeAware";
import type { SimulationInputV3 } from "../engine/types";
import { mechanicRuleForDiceV3 } from "../mechanics/registry";
import type { MechanicEvaluationV3 } from "../mechanics/types";
import { buildDamageOutcomeV3, deterministicDpsRange, type DamageOutcomeV3 } from "../probability/outcomes";

export interface ScenarioResultV3 {
  simulation: TreeAwareSimulationResultV3;
  mechanic: MechanicEvaluationV3;
  outcome: DamageOutcomeV3 | null;
  basicAttackOutcome: DamageOutcomeV3 | null;
  basicAttackOutcomeKind: "verified" | "projected" | "tree-excluded-verified" | "tree-excluded-projected" | null;
}

export function runScenarioV3(
  input: SimulationInputV3,
  data: CanonicalGameData,
): ScenarioResultV3 {
  const simulation = simulateDiceWithTreeV3(input, data);
  const mechanicRule = mechanicRuleForDiceV3(input.diceId, data);
  const dice = data.dice.find((candidate) => candidate.id === input.diceId);
  if (!dice) throw new Error(`Unknown dice id: ${input.diceId}`);
  const mechanic = mechanicRule.evaluate({ dice, input, data });

  const hasUnresolvedTreeEffect = simulation.tree.unresolvedNodeIds.length > 0;
  const outcome = simulation.practicalDps === null || hasUnresolvedTreeEffect
    ? null
    : buildDamageOutcomeV3(
        deterministicDpsRange(simulation.practicalDps),
        input.enemy.hp,
        [5, 10, 30],
      );

  let baselineSimulation = simulation;
  let treeExcluded = false;
  if ((
    hasUnresolvedTreeEffect
    || (simulation.basicAttackDps === null && simulation.projectedBasicAttackDps == null)
  ) && Object.values(input.treeRanks).some((rank) => rank > 0)) {
    baselineSimulation = simulateDiceWithTreeV3({ ...input, treeRanks: {} }, data);
    treeExcluded = true;
  }
  const projectedDps = baselineSimulation.projectedBasicAttackDps;
  const useProjection = projectedDps !== null
    && projectedDps !== undefined
    && (baselineSimulation.basicAttackDps === null || Math.abs(projectedDps - baselineSimulation.basicAttackDps) > 1e-12);
  const basicAttackDps = useProjection ? projectedDps : baselineSimulation.basicAttackDps;
  const basicAttackOutcome = basicAttackDps === null || basicAttackDps === undefined
    ? null
    : buildDamageOutcomeV3(
        deterministicDpsRange(basicAttackDps),
        input.enemy.hp,
        [5, 10, 30],
      );
  const basicAttackOutcomeKind = basicAttackOutcome
    ? treeExcluded
      ? (useProjection ? "tree-excluded-projected" : "tree-excluded-verified")
      : (useProjection ? "projected" : "verified")
    : null;

  return { simulation, mechanic, outcome, basicAttackOutcome, basicAttackOutcomeKind };
}
