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

  const outcome = simulation.practicalDps === null
    ? null
    : buildDamageOutcomeV3(
        deterministicDpsRange(simulation.practicalDps),
        input.enemy.hp,
        [5, 10, 30],
      );

  return { simulation, mechanic, outcome };
}
