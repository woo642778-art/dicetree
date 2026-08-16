import { treePart1 } from "./raw/tree-1";
import { treePart2 } from "./raw/tree-2";
import { treePart3 } from "./raw/tree-3";
import { treePart4 } from "./raw/tree-4";
import { treePart5 } from "./raw/tree-5";
import { treePart6 } from "./raw/tree-6";
import { treePart7 } from "./raw/tree-7";
import { dicePart1 } from "./raw/dice-1";
import { dicePart2 } from "./raw/dice-2";
import { dicePart3 } from "./raw/dice-3";
import { dicePart4 } from "./raw/dice-4";
import { runePart1 } from "./raw/rune-1";
import { runePart2 } from "./raw/rune-2";
import { runePart3 } from "./raw/rune-3";
import { runePart4 } from "./raw/rune-4";
import { runePart5 } from "./raw/rune-5";
import { runePart6 } from "./raw/rune-6";
import { passivePart1 } from "./raw/passive-1";
import { passivePart2 } from "./raw/passive-2";
import { passivePart3 } from "./raw/passive-3";
import { passivePart4 } from "./raw/passive-4";
import { perkPart1 } from "./raw/perk-1";
import { projectilePart1 } from "./raw/projectile-1";

type Raw = readonly unknown[];

function text(ko: unknown, en: unknown) {
  return { ko: String(ko ?? ""), en: String(en ?? "") };
}

const treeRows = [
  ...treePart1, ...treePart2, ...treePart3, ...treePart4, ...treePart5, ...treePart6, ...treePart7,
] as readonly Raw[];
const diceRows = [...dicePart1, ...dicePart2, ...dicePart3, ...dicePart4] as readonly Raw[];
const runeRows = [...runePart1, ...runePart2, ...runePart3, ...runePart4, ...runePart5, ...runePart6] as readonly Raw[];
const passiveRows = [...passivePart1, ...passivePart2, ...passivePart3, ...passivePart4] as readonly Raw[];

const dice = diceRows.map((r) => ({
  numericId: Number(r[0]), type: String(r[1]), use: Boolean(r[2]), family: String(r[3]),
  groupInternal: String(r[4]), targetingType: String(r[5]), attackType: String(r[6]),
  attack: Number(r[7]), attackLevelAdd: Number(r[8]), attackUpgradeAdd: Number(r[9]),
  range: Number(r[10]), rangeLevelAdd: Number(r[11]), rangeUpgradeAdd: Number(r[12]),
  attackInterval: Number(r[13]), attackIntervalUpgradeAdd: Number(r[14]),
  bossAttackPercent: Number(r[15]), bossAttackPercentUpgradeAdd: Number(r[16]),
  cooldown: Number(r[17]), cooldownLevelAdd: Number(r[18]), projectileAbilityId: String(r[19]),
  skillKinds: r[20] as readonly string[], name: text(r[21], r[22]), description: text(r[23], r[24]),
  level7Description: text(r[25], r[26]),
}));
const diceById = new Map(dice.map((entry) => [entry.numericId, entry]));

const runes = runeRows.map((r) => ({
  id: Number(r[0]), kind: String(r[1]), grade: String(r[2]), use: Boolean(r[3]), maxRank: Number(r[4]),
  value1: Number(r[5]), value1RankAdd: Number(r[6]), value2: Number(r[7]), value2RankAdd: Number(r[8]),
  duration: Number(r[9]), durationRankAdd: Number(r[10]), diceType: String(r[11]), family: String(r[12]),
  name: text(r[13], r[14]), description: text(r[15], r[16]),
}));
const runeById = new Map(runes.map((entry) => [entry.id, entry]));

const passives = passiveRows.map((r) => ({
  numericId: Number(r[0]), kind: String(r[1]), family: String(r[2]), groupInternal: String(r[3]),
  maxRank: Number(r[4]), value: Number(r[5]), valueRankAdd: Number(r[6]), valueType: String(r[7]),
  name: text(r[8], r[9]), description: text(r[10], r[11]),
}));
const passiveById = new Map(passives.map((entry) => [entry.numericId, entry]));

const perks = (perkPart1 as readonly Raw[]).map((r) => ({
  numericId: Number(r[0]), kind: String(r[1]), family: String(r[2]), groupInternal: String(r[3]),
  maxCount: Number(r[4]), startDelay: Number(r[5]), delay: Number(r[6]), passiveId: Number(r[7]),
  name: text(r[8], r[9]), description: text(r[10], r[11]), passiveDescription: text(r[12], r[13]),
  flavor: text(r[14], r[15]),
}));
const perkById = new Map(perks.map((entry) => [entry.numericId, entry]));

const projectileAbilities = (projectilePart1 as readonly Raw[]).map((r) => ({
  id: String(r[0]), value: Number(r[1]), valueLevelAdd: Number(r[2]), valueUpgradeAdd: Number(r[3]),
  duration: Number(r[4]), durationLevelAdd: Number(r[5]), durationUpgradeAdd: Number(r[6]),
  range: Number(r[7]), rangeLevelAdd: Number(r[8]), rangeUpgradeAdd: Number(r[9]),
  stackMax: Number(r[10]), stackMaxLevelAdd: Number(r[11]), stackMaxUpgradeAdd: Number(r[12]),
  valueLabel: text(r[13], r[14]), durationLabel: text(r[15], r[16]),
  rangeLabel: text(r[17], r[18]), stackLabel: text(r[19], r[20]),
}));

const treeNodes = treeRows.map((r) => {
  const nodeType = String(r[4]);
  const kindId = Number(r[5]);
  const diceEntry = nodeType === "DICE" ? diceById.get(kindId) : undefined;
  const rune = nodeType === "DICE_RUNE" ? runeById.get(kindId) : undefined;
  const passive = nodeType === "PLAYER_PASSIVE" ? passiveById.get(kindId) : undefined;
  const perk = nodeType === "PERK" ? perkById.get(kindId) : undefined;
  const detail = diceEntry ?? rune ?? passive ?? perk;
  return {
    id: Number(r[0]), index: Number(r[1]), position: { x: Number(r[2]), y: Number(r[3]) },
    nodeType, kindId, family: String(r[6]), isBig: Boolean(r[7]), isBase: Boolean(r[8]), isShow: Boolean(r[9]),
    nextNodeIds: r[10] as readonly number[], unlockCondition: r[11] == null ? null : String(r[11]),
    unlockConditionValue: r[12] == null ? null : Number(r[12]), goldByRank: r[13] as readonly number[],
    nodeStoneByRank: r[14] as readonly number[], maxRank: Number(r[15]), intrinsicMaxRank: Number(r[16]),
    name: detail?.name ?? text("", ""), description: detail?.description ?? text("", ""),
    effectKind: nodeType === "DICE" ? "diceUnlock" : String((detail as { kind?: string } | undefined)?.kind ?? ""),
    effectBase: nodeType === "DICE_RUNE" ? Number(rune?.value1 ?? 0) : nodeType === "PLAYER_PASSIVE" ? Number(passive?.value ?? 0) : 0,
    effectRankAdd: nodeType === "DICE_RUNE" ? Number(rune?.value1RankAdd ?? 0) : nodeType === "PLAYER_PASSIVE" ? Number(passive?.valueRankAdd ?? 0) : 0,
    diceType: nodeType === "DICE" ? diceEntry?.type : nodeType === "DICE_RUNE" ? rune?.diceType : undefined,
  };
});

export const RD2_EXTRACTED_DATA = {
  source: {
    ipaVersion: "1.0.1",
    unityVersion: "6000.3.18f1",
    tableBundleVersion: "0.0.4",
    tableCreatedAt: "2026-08-11T19:11:03.2171857+09:00",
    ipaSha256: "0341bef051315f7827466d23f3e41900d06dfa3d4994c7ecc84a89f4d1e21dd8",
    diceTreeHash: "01dd3ae7280ee1f98e9a4a8bebfa3782c07552f171f0437896e84a18810b0bc5",
    defenderHash: "511f60a3cac24f6b18b945dd7166500f8127aeb21fa32726cc9bb7277716dc0a",
  },
  treeNodes,
  dice,
  runes,
  passives,
  perks,
  projectileAbilities,
  constants: {
    playerCritPercent: 10,
    playerCritDamagePercent: 50,
    defenderUpgradeCosts: [250,500,1000,2000,4000,8000,12000,18000,24000,32000,40000,50000,60000,72500,85000,100000,120000,160000,240000],
  },
};
