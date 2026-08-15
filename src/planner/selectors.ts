import type { PlannerStateV1, TreeNodeDefinition } from "../domain/types";
import { calculateSpentResources } from "../domain/costs";

export function selectSpentResources(state: PlannerStateV1, definitions: TreeNodeDefinition[]) {
  return calculateSpentResources(state.ranks, definitions);
}

export function selectInvestedCount(state: PlannerStateV1) {
  return Object.values(state.ranks).filter((rank) => rank > 0).length;
}
