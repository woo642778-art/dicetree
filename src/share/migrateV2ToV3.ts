import type { PlannerStateV3 } from "../planner-v3/types";

export interface V2MigrationOptions {
  dataVersion: string;
  validNodeIds: ReadonlySet<string>;
  maxRanks: ReadonlyMap<string, number>;
  validDiceIds: ReadonlySet<string>;
  fallbackDiceId?: string;
}

export interface V2MigrationResult {
  state: PlannerStateV3;
  warnings: string[];
}

const V2_DICE_ALIASES: Record<string, string> = {
  devourer: "predator",
  corruption: "decay",
  taeguk: "bingo",
  adapt: "adjust",
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function positivePlannedNodeIds(raw: Record<string, unknown>): string[] {
  const source = record(raw.planned) ?? record(raw.ranks) ?? {};
  return Object.entries(source)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value) && value > 0)
    .map(([nodeId]) => nodeId)
    .sort();
}

function requestedDiceId(raw: Record<string, unknown>): string | undefined {
  if (typeof raw.primaryDieId === "string") return raw.primaryDieId;
  const goals = record(raw.goals);
  return typeof goals?.primaryDieId === "string" ? goals.primaryDieId : undefined;
}

function migrateDiceId(
  requested: string | undefined,
  options: V2MigrationOptions,
  warnings: string[],
): string {
  const aliased = requested ? (V2_DICE_ALIASES[requested] ?? requested) : undefined;
  if (requested && aliased !== requested) warnings.push(`dice-alias:${requested}->${aliased}`);
  if (aliased && options.validDiceIds.has(aliased)) return aliased;
  if (requested) warnings.push(`unknown-dice:${requested}`);

  const preferred = options.fallbackDiceId ?? "predator";
  if (options.validDiceIds.has(preferred)) return preferred;
  const first = [...options.validDiceIds].sort()[0];
  if (!first) throw new Error("V3 migration requires at least one valid dice id");
  return first;
}

export function migrateV2ToV3(
  input: unknown,
  options: V2MigrationOptions,
): V2MigrationResult | null {
  const raw = record(input);
  if (!raw || raw.schemaVersion !== 2) return null;

  const warnings: string[] = [];
  const simulatedRanks: Record<string, number> = {};
  for (const nodeId of positivePlannedNodeIds(raw)) {
    if (!options.validNodeIds.has(nodeId) || (options.maxRanks.get(nodeId) ?? 0) < 1) {
      warnings.push(`unknown-node:${nodeId}`);
      continue;
    }
    simulatedRanks[nodeId] = 1;
  }

  const inventory = record(raw.inventory) ?? {};
  const gold = typeof inventory.gold === "number" && Number.isInteger(inventory.gold) && inventory.gold >= 0
    ? inventory.gold
    : 0;
  for (const fake of ["blueCard", "redCard", "prismCube"] as const) {
    if (typeof inventory[fake] === "number" && inventory[fake] !== 0) {
      warnings.push(`discarded-v2-resource:${fake}`);
    }
  }

  return {
    state: {
      schemaVersion: 3,
      dataVersion: options.dataVersion,
      ownedRanks: {},
      simulatedRanks,
      inventory: { gold, stone: 0 },
      scenario: {
        diceId: migrateDiceId(requestedDiceId(raw), options, warnings),
        diceProgressionLevel: 1,
        battleUpgradeLevel: 1,
        conditionValues: {},
        enemyPresetId: "custom",
        durationSeconds: 30,
      },
    },
    warnings,
  };
}
