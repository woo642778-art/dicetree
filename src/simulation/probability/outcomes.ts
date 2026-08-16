import { binomialOutcomeRange } from "./binomial";

export interface DpsRangeV3 {
  low: number;
  average: number;
  high: number;
}

export interface DamageCheckpointV3 {
  seconds: number;
  low: number;
  average: number;
  high: number;
}

export interface DamageOutcomeV3 {
  dps: DpsRangeV3;
  checkpoints: DamageCheckpointV3[];
  killTimeSeconds: DpsRangeV3 | null;
}

export function deterministicDpsRange(dps: number): DpsRangeV3 {
  if (!Number.isFinite(dps) || dps < 0) throw new RangeError(`DPS must be non-negative, got ${dps}`);
  return { low: dps, average: dps, high: dps };
}

export function independentProcDpsRange(input: {
  attacks: number;
  durationSeconds: number;
  baseDamagePerAttack: number;
  procChance: number;
  bonusDamagePerProc: number;
}): DpsRangeV3 {
  if (!Number.isInteger(input.attacks) || input.attacks < 0) throw new RangeError("attacks must be a non-negative integer");
  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0) throw new RangeError("durationSeconds must be positive");
  if (!Number.isFinite(input.baseDamagePerAttack) || input.baseDamagePerAttack < 0) throw new RangeError("baseDamagePerAttack must be non-negative");
  if (!Number.isFinite(input.bonusDamagePerProc) || input.bonusDamagePerProc < 0) throw new RangeError("bonusDamagePerProc must be non-negative");

  const procs = binomialOutcomeRange(input.attacks, input.procChance);
  const baseDamage = input.attacks * input.baseDamagePerAttack;
  return {
    low: (baseDamage + procs.lowCount * input.bonusDamagePerProc) / input.durationSeconds,
    average: (baseDamage + procs.expectedCount * input.bonusDamagePerProc) / input.durationSeconds,
    high: (baseDamage + procs.highCount * input.bonusDamagePerProc) / input.durationSeconds,
  };
}

export function buildDamageOutcomeV3(
  dps: DpsRangeV3,
  enemyHp?: number,
  checkpointSeconds: readonly number[] = [5, 10, 30],
): DamageOutcomeV3 {
  for (const value of [dps.low, dps.average, dps.high]) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError("DPS range values must be finite and non-negative");
  }
  const checkpoints = checkpointSeconds.map((seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) throw new RangeError("checkpoint seconds must be positive");
    return {
      seconds,
      low: dps.low * seconds,
      average: dps.average * seconds,
      high: dps.high * seconds,
    };
  });

  let killTimeSeconds: DpsRangeV3 | null = null;
  if (enemyHp !== undefined) {
    if (!Number.isFinite(enemyHp) || enemyHp <= 0) throw new RangeError("enemyHp must be positive");
    killTimeSeconds = {
      // Low DPS means the longest kill time; high DPS means the shortest.
      low: dps.high > 0 ? enemyHp / dps.high : Number.POSITIVE_INFINITY,
      average: dps.average > 0 ? enemyHp / dps.average : Number.POSITIVE_INFINITY,
      high: dps.low > 0 ? enemyHp / dps.low : Number.POSITIVE_INFINITY,
    };
  }

  return { dps, checkpoints, killTimeSeconds };
}
