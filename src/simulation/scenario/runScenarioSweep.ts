import type { CanonicalGameData } from "../../game-data/types";
import type { SimulationInputV3 } from "../engine/types";
import { runScenarioV3 } from "./runScenario";
import { summarizeScenarioV3, type ScenarioMetricKindV3 } from "./summarizeScenario";

export interface ScenarioSweepCellV3 {
  enemyHp: number;
  durationSeconds: number;
  dps: number | null;
  totalDamage: number | null;
  killTimeSeconds: number | null;
  clearsWithinDuration: boolean | null;
  metricKind: ScenarioMetricKindV3;
  confidence: "verified" | "estimated" | "unavailable";
}

export interface ScenarioSweepResultV3 {
  hpValues: number[];
  durationValues: number[];
  cells: ScenarioSweepCellV3[];
  firstClearDurationByHp: Record<number, number | null>;
}

function positiveUnique(values: readonly number[]) {
  return [...new Set(values.filter((value) => Number.isFinite(value) && value > 0))].sort((a, b) => a - b);
}

export function runScenarioSweepV3(
  baseInput: SimulationInputV3,
  data: CanonicalGameData,
  hpValues: readonly number[] = [100_000, 500_000, 1_000_000, 5_000_000],
  durationValues: readonly number[] = [5, 10, 30, 60],
): ScenarioSweepResultV3 {
  const hp = positiveUnique(hpValues);
  const durations = positiveUnique(durationValues);
  const cells = hp.flatMap((enemyHp) => durations.map((durationSeconds): ScenarioSweepCellV3 => {
    const result = runScenarioV3({
      ...baseInput,
      enemy: { ...baseInput.enemy, hp: enemyHp },
      durationSeconds,
    }, data);
    const summary = summarizeScenarioV3(result);
    const killTime = summary.outcome?.killTimeSeconds?.average;
    const killTimeSeconds = killTime === undefined || !Number.isFinite(killTime) ? null : killTime;
    return {
      enemyHp,
      durationSeconds,
      dps: summary.dps,
      totalDamage: summary.dps === null ? null : summary.dps * durationSeconds,
      killTimeSeconds,
      clearsWithinDuration: summary.dps === null ? null : (killTimeSeconds !== null && killTimeSeconds <= durationSeconds),
      metricKind: summary.metricKind,
      confidence: summary.confidence,
    };
  }));
  const firstClearDurationByHp = Object.fromEntries(hp.map((enemyHp) => {
    const clear = cells.find((cell) => cell.enemyHp === enemyHp && cell.clearsWithinDuration);
    return [enemyHp, clear?.durationSeconds ?? null];
  }));
  return { hpValues: hp, durationValues: durations, cells, firstClearDurationByHp };
}
