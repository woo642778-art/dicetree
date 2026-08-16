import type { CanonicalGameData } from "../../game-data/types";
import { collectTreeModifiersV3 } from "../tree/modifiers";
import { simulateDiceV3, type SimulationEngineOptionsV3 } from "./simulate";
import type { SimulationInputV3, SimulationResultV3, StatModifierV3 } from "./types";

const RAW_ACCUMULATOR_STATS = new Set([
  "flatBulletDamage",
  "bulletDamagePercent",
  "attackSpeedPercent",
  "critRatePercent",
  "critDamagePercent",
]);

export interface TreeAwareSimulationResultV3 extends SimulationResultV3 {
  tree: {
    unresolvedNodeIds: string[];
  };
}

function collapseRawAccumulators(modifiers: readonly StatModifierV3[]): StatModifierV3[] {
  const totals = new Map<string, { value: number; sourceRefs: Set<string>; ids: string[] }>();
  const output: StatModifierV3[] = [];

  for (const modifier of modifiers) {
    if (
      modifier.confidence === "verified"
      && modifier.operation === "add"
      && RAW_ACCUMULATOR_STATS.has(modifier.stat)
    ) {
      const total = totals.get(modifier.stat) ?? { value: 0, sourceRefs: new Set<string>(), ids: [] };
      total.value += modifier.value;
      total.ids.push(modifier.id);
      for (const source of modifier.sourceRefs) total.sourceRefs.add(source);
      totals.set(modifier.stat, total);
    } else {
      output.push(modifier);
    }
  }

  for (const [stat, total] of [...totals.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    output.push({
      id: `tree:aggregate:${stat}:${total.ids.sort().join("+")}`,
      stage: "tree-passive",
      stat,
      operation: "replace",
      value: total.value,
      confidence: "verified",
      sourceRefs: [...total.sourceRefs].sort(),
    });
  }
  return output;
}

export function simulateDiceWithTreeV3(
  input: SimulationInputV3,
  data: CanonicalGameData,
  options: SimulationEngineOptionsV3 = {},
): TreeAwareSimulationResultV3 {
  const tree = collectTreeModifiersV3(data, input.diceId, input.treeRanks);
  const additionalModifiers = collapseRawAccumulators([
    ...tree.modifiers,
    ...(options.additionalModifiers ?? []),
  ]);
  const result = simulateDiceV3(input, data, {
    ...options,
    additionalModifiers,
  });
  return {
    ...result,
    tree: {
      unresolvedNodeIds: tree.unresolvedNodeIds,
    },
  };
}
