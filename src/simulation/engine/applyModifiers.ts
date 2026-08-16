import type {
  CalculationTraceStepV3,
  StatModifierV3,
} from "./types";

const STAGE_ORDER = new Map([
  ["permanent-growth", 0],
  ["battle-upgrade", 1],
  ["tree-passive", 2],
  ["rune", 3],
  ["mechanic", 4],
  ["enemy", 5],
]);

function applyOperation(input: number, modifier: StatModifierV3): number {
  if (modifier.operation === "add") return input + modifier.value;
  if (modifier.operation === "multiply") return input * modifier.value;
  return modifier.value;
}

function projectionEligible(modifier: StatModifierV3) {
  return modifier.stage === "permanent-growth" || modifier.stage === "battle-upgrade";
}

export interface AppliedModifierResultV3 {
  stats: Record<string, number>;
  projectedStats: Record<string, number>;
  trace: CalculationTraceStepV3[];
  unresolvedStats: string[];
}

export function applyVerifiedModifiers(
  initialStats: Record<string, number>,
  modifiers: readonly StatModifierV3[],
): AppliedModifierResultV3 {
  const stats = { ...initialStats };
  const projectedStats = { ...initialStats };
  const trace: CalculationTraceStepV3[] = [];
  const unresolved = new Set<string>();
  const ordered = [...modifiers].sort((left, right) => {
    const stage = (STAGE_ORDER.get(left.stage) ?? 99) - (STAGE_ORDER.get(right.stage) ?? 99);
    return stage || left.id.localeCompare(right.id);
  });

  for (const modifier of ordered) {
    const inputValue = stats[modifier.stat];
    const projectedInput = projectedStats[modifier.stat];
    if (modifier.confidence !== "verified") {
      unresolved.add(modifier.stat);
      let projectedOutput = projectedInput ?? inputValue ?? null;
      if (
        projectionEligible(modifier)
        && (projectedInput !== undefined || modifier.operation === "replace")
      ) {
        projectedOutput = applyOperation(projectedInput ?? 0, modifier);
        projectedStats[modifier.stat] = projectedOutput;
      }
      trace.push({
        ...modifier,
        inputValue: inputValue ?? null,
        outputValue: projectedOutput,
        applied: false,
        reason: "partial-formula",
        modifierValue: modifier.value,
      });
      continue;
    }
    if (inputValue === undefined && modifier.operation !== "replace") {
      unresolved.add(modifier.stat);
      trace.push({
        ...modifier,
        inputValue: null,
        outputValue: null,
        applied: false,
        reason: "missing-input",
        modifierValue: modifier.value,
      });
      continue;
    }

    const nextValue = applyOperation(inputValue ?? 0, modifier);
    stats[modifier.stat] = nextValue;
    const projectedBase = projectedInput ?? inputValue ?? 0;
    projectedStats[modifier.stat] = applyOperation(projectedBase, modifier);
    trace.push({
      ...modifier,
      inputValue: inputValue ?? null,
      outputValue: nextValue,
      applied: true,
      modifierValue: modifier.value,
    });
  }

  return {
    stats,
    projectedStats,
    trace,
    unresolvedStats: [...unresolved].sort(),
  };
}
