import type { DiceTreeNodeV3 } from "../game-data/types";

/**
 * Random Dice 2 begins with one die unlocked in each family. Those five root
 * nodes are account state, not purchases, so they must never consume currency.
 */
export function starterOwnedRanksV3(nodes: readonly DiceTreeNodeV3[]) {
  return Object.fromEntries(nodes
    .filter((node) => node.kind === "dice" && node.prerequisites.length === 0)
    .map((node) => [node.id, 1]));
}
