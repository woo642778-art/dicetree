import type { CanonicalGameData, DiceDefinitionV3 } from "../../game-data/types";
import { applyVerifiedModifiers } from "./applyModifiers";
import { growthModifiersForDice } from "./growth";
import type {
  CalculationTraceStepV3,
  SimulationInputV3,
  SimulationResultV3,
  StatModifierV3,
} from "./types";

export interface SimulationEngineOptionsV3 {
  additionalModifiers?: readonly StatModifierV3[];
  resolvedMechanicKeys?: ReadonlySet<string>;
}

function baseNumericStats(dice: DiceDefinitionV3): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const [key, value] of Object.entries(dice.baseStats)) {
    if (key === "extra") continue;
    if (typeof value === "number" && Number.isFinite(value)) stats[key] = value;
  }
  for (const [key, value] of Object.entries(dice.baseStats.extra)) {
    if (typeof value === "number" && Number.isFinite(value)) stats[key] = value;
  }
  return stats;
}

function mechanicKeys(dice: DiceDefinitionV3): string[] {
  const keys = new Set<string>();
  if (dice.mechanicRuleId) keys.add(`skill:${dice.mechanicRuleId}`);
  const projectile = dice.baseStats.extra.ProjectileAbilityId;
  if (typeof projectile === "string" && projectile) keys.add(`projectile:${projectile}`);
  return [...keys].sort();
}

function exactBasicAttackDps(
  stats: Record<string, number>,
  unresolvedStats: readonly string[],
): number | null {
  if (unresolvedStats.includes("attack") || unresolvedStats.includes("attackInterval")) return null;
  const attack = stats.attack;
  const interval = stats.attackInterval;
  if (attack === undefined || interval === undefined || attack < 0 || interval <= 0) return null;
  return attack / interval;
}

function projectionSupportsBasicAttack(trace: readonly CalculationTraceStepV3[]) {
  return trace
    .filter((step) => !step.applied && (step.stat === "attack" || step.stat === "attackInterval"))
    .every((step) => (
      (step.stage === "permanent-growth" || step.stage === "battle-upgrade")
      && step.outputValue !== null
    ));
}

function projectedBasicAttackDps(
  projectedStats: Record<string, number>,
  trace: readonly CalculationTraceStepV3[],
): number | null {
  if (!projectionSupportsBasicAttack(trace)) return null;
  const attack = projectedStats.attack;
  const interval = projectedStats.attackInterval;
  if (attack === undefined || interval === undefined || attack < 0 || interval <= 0) return null;
  return attack / interval;
}

export function simulateDiceV3(
  input: SimulationInputV3,
  data: CanonicalGameData,
  options: SimulationEngineOptionsV3 = {},
): SimulationResultV3 {
  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0) {
    throw new RangeError(`durationSeconds must be > 0, got ${input.durationSeconds}`);
  }

  const dice = data.dice.find((candidate) => candidate.id === input.diceId);
  if (!dice) throw new Error(`Unknown dice id: ${input.diceId}`);

  const growthModifiers = growthModifiersForDice(
    dice,
    input.diceProgressionLevel,
    input.battleUpgradeLevel,
  );
  const applied = applyVerifiedModifiers(
    baseNumericStats(dice),
    [...growthModifiers, ...(options.additionalModifiers ?? [])],
  );

  const resolved = options.resolvedMechanicKeys ?? new Set<string>();
  const unresolvedMechanics = mechanicKeys(dice).filter((key) => !resolved.has(key));
  const basicAttackDps = exactBasicAttackDps(applied.stats, applied.unresolvedStats);
  const projectedBasicDps = projectedBasicAttackDps(applied.projectedStats, applied.trace);
  const practicalDps = basicAttackDps !== null && unresolvedMechanics.length === 0
    ? basicAttackDps
    : null;

  const partial = applied.unresolvedStats.length > 0 || unresolvedMechanics.length > 0;
  return {
    diceId: dice.id,
    stats: applied.stats,
    projectedStats: applied.projectedStats,
    basicAttackDps,
    projectedBasicAttackDps: projectedBasicDps,
    practicalDps,
    confidence: partial ? "partial" : "verified",
    trace: applied.trace,
    unresolvedMechanics,
    unresolvedStats: applied.unresolvedStats,
  };
}
