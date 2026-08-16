import type { CanonicalGameData } from "../../game-data/types";
import type { EnemyScenarioV3 } from "../engine/types";

export interface EnemyPresetV3 {
  id: string;
  sourceEnemyId?: string;
  kind: EnemyScenarioV3["kind"];
  nameKey?: string;
  hpMultiplierPercent?: number;
  speed?: number;
  sp?: number;
  requiresHpInput: boolean;
}

function rawEnemy(enemy: CanonicalGameData["enemies"][number]): Record<string, unknown> {
  return enemy as unknown as Record<string, unknown>;
}

function numeric(raw: Record<string, unknown>, key: string): number | undefined {
  const value = raw[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function classifyEnemy(raw: Record<string, unknown>): EnemyScenarioV3["kind"] {
  const kind = String(raw.kind ?? "").toLowerCase();
  const bossType = raw.bossType;
  if ((typeof bossType === "string" && bossType) || kind.includes("boss")) return "boss";
  if (["elite", "speed", "big", "golem", "special"].some((token) => kind.includes(token))) return "elite";
  return "normal";
}

export function buildEnemyPresetsV3(data: CanonicalGameData): EnemyPresetV3[] {
  return [
    { id: "custom", kind: "custom", requiresHpInput: true },
    ...data.enemies.map((enemy) => {
      const raw = rawEnemy(enemy);
      const id = String(raw.id);
      return {
        id,
        sourceEnemyId: id,
        kind: classifyEnemy(raw),
        ...(typeof raw.nameKey === "string" && raw.nameKey ? { nameKey: raw.nameKey } : {}),
        ...(numeric(raw, "hpMultiplierPercent") === undefined ? {} : { hpMultiplierPercent: numeric(raw, "hpMultiplierPercent") }),
        ...(numeric(raw, "speed") === undefined ? {} : { speed: numeric(raw, "speed") }),
        ...(numeric(raw, "sp") === undefined ? {} : { sp: numeric(raw, "sp") }),
        // MinionTable provides relative/scaling fields, not a proven absolute scenario HP.
        requiresHpInput: true,
      };
    }),
  ];
}

export function resolveEnemyPresetV3(
  presetId: string,
  hpOverride: number | undefined,
  data: CanonicalGameData,
): EnemyScenarioV3 {
  const preset = buildEnemyPresetsV3(data).find((candidate) => candidate.id === presetId);
  if (!preset) throw new Error(`Unknown enemy preset: ${presetId}`);
  if (hpOverride !== undefined && (!Number.isFinite(hpOverride) || hpOverride <= 0)) {
    throw new RangeError(`Enemy HP override must be > 0, got ${hpOverride}`);
  }

  const values: Record<string, number | string | boolean> = {};
  if (preset.hpMultiplierPercent !== undefined) values.hpMultiplierPercent = preset.hpMultiplierPercent;
  if (preset.speed !== undefined) values.speed = preset.speed;
  if (preset.sp !== undefined) values.sp = preset.sp;
  if (preset.nameKey) values.nameKey = preset.nameKey;
  values.hpSource = hpOverride === undefined ? "required-user-input" : "user-override";

  return {
    id: preset.id,
    kind: preset.kind,
    ...(hpOverride === undefined ? {} : { hp: hpOverride }),
    values,
  };
}
