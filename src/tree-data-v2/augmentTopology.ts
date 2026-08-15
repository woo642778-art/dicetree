import { treeNodesV2 } from "./nodes";
import { topologySlotsV2 } from "./topologySlots";

const existing = new Set(treeNodesV2.map((node) => node.id));
for (const node of topologySlotsV2) {
  if (!existing.has(node.id)) treeNodesV2.push(node);
}
