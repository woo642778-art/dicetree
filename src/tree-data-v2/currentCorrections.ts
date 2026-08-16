import { sourced, unknown } from "../domain/provenance";
import { treeNodesV2 } from "./nodes";

const byId = new Map(treeNodesV2.map((node) => [node.id, node]));

function clearDisplayedRank(id: string, maxRank?: number) {
  const node = byId.get(id);
  if (!node) return;
  node.displayedRank = undefined;
  node.maxRank = maxRank !== undefined
    ? sourced(maxRank, "partial", ["user-prior-stat-details"], "Maximum rank was established in the earlier node discussion; current displayed rank was not.")
    : unknown("The supplied evidence confirms the next effect/cost but not the node's current/max rank display.");
  node.fieldConfidence.rank = maxRank !== undefined ? "partial" : "unknown";
}

function markCostPartial(id: string, note: string) {
  const node = byId.get(id);
  if (!node?.observedNextCost?.value) return;
  node.observedNextCost = sourced(node.observedNextCost.value, "partial", node.observedNextCost.sourceIds, note);
  node.fieldConfidence.cost = "partial";
  node.investable = false;
}

clearDisplayedRank("chaos-attack-speed-observed-next");
clearDisplayedRank("global-bullet-observed-next", 50);
clearDisplayedRank("global-bullet-milestone-15");
clearDisplayedRank("order-speed-max");

markCostPartial(
  "chaos-rank-16-50",
  "The 5,000 gold + 10 purple-resource label is visible near the 16/50 node, but the overview does not prove that the label belongs to this exact rank transition. A detail-panel capture is required before simulation uses it.",
);
