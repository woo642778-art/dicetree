import type { SourceRef, TreeNodeV2 } from "../domain/types";
import { validateSourcedField } from "../domain/provenance";
import { sourceRegistry } from "./sources";

export interface DatasetValidationV2 {
  errors: string[];
  warnings: string[];
}

export function validateV2Dataset(
  nodes: TreeNodeV2[],
  sources: SourceRef[] = sourceRegistry,
): DatasetValidationV2 {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sourceIds = new Set(sources.map((source) => source.id));
  const nodeIds = new Set<string>();

  for (const node of nodes) {
    if (nodeIds.has(node.id)) errors.push(`duplicate node id: ${node.id}`);
    nodeIds.add(node.id);

    errors.push(...validateSourcedField(node.name, `${node.id}.name`));
    errors.push(...validateSourcedField(node.maxRank, `${node.id}.maxRank`));
    if (node.displayedRank) errors.push(...validateSourcedField(node.displayedRank, `${node.id}.displayedRank`));
    if (node.observedNextCost) errors.push(...validateSourcedField(node.observedNextCost, `${node.id}.observedNextCost`));
    if (node.effectSummary) errors.push(...validateSourcedField(node.effectSummary, `${node.id}.effectSummary`));

    for (const sourceId of node.sourceIds) {
      if (!sourceIds.has(sourceId)) errors.push(`${node.id}: missing source ${sourceId}`);
    }

    if (node.displayedRank?.value) {
      const { current, max } = node.displayedRank.value;
      if (current < 0 || max <= 0 || current > max) errors.push(`${node.id}: impossible displayed rank ${current}/${max}`);
    }

    if (node.maxRank.value !== undefined && node.maxRank.value <= 0) {
      errors.push(`${node.id}: maxRank must be positive`);
    }

    if (node.investable && !node.observedNextCost?.value && !node.costsByRank?.length) {
      warnings.push(`${node.id}: investable node has no verified/observed cost`);
    }
  }

  for (const node of nodes) {
    for (const prerequisite of node.prerequisites) {
      if (!nodeIds.has(prerequisite.nodeId)) errors.push(`${node.id}: missing prerequisite ${prerequisite.nodeId}`);
      if (prerequisite.minRank <= 0) errors.push(`${node.id}: prerequisite rank must be positive`);
    }
  }

  return { errors, warnings };
}
