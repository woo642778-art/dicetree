import type { CanonicalGameData, DiceDefinitionV3 } from "../game-data/types";
import { playableDiceV3 } from "../game-data/playableDice";

export type DeckGoalV4 = "dealer" | "support" | "balanced";
export type SpendProfileV4 = "free" | "light" | "invested";
export type DeckRoleV4 = "dealer" | "control" | "economy" | "utility";

export interface DeckDiceV4 {
  diceId: string;
  roles: DeckRoleV4[];
  basicDps: number | null;
  calculation: "verified-basic" | "partial-basic" | "unavailable";
  evidence: string;
}

export interface DeckRecommendationV4 {
  dice: DeckDiceV4[];
  primaryDiceId: string;
  goal: DeckGoalV4;
  spendProfile: SpendProfileV4;
  source: "game-data-synergy";
}

const CONTROL_TERMS = [
  "frozen", "freeze", "stun", "lock", "slow", "knockback",
  "빙결", "얼음", "기절", "경직", "봉인", "탈진", "감속",
];
const ECONOMY_TERMS = [
  "sp 획득", "sp gain", "sp mining", "1눈금 주사위 1개 소환", "summon one random",
  "성장 시도", "attempts to grow", "복사 주사위로 변경", "changes into copy dice",
  "같은 눈금의 주사위로", "same pip dice", "종류 관계없이 같은 눈금", "regardless of type",
];
const UTILITY_TERMS = [
  "공격 속도 증가", "attack speed increase", "attack speed bonus", "종류 관계없이",
  "위치 변경", "position", "bubble", "버블", "alignment", "정렬", "resonance",
  "공명", "bless", "축복", "상대", "opponent",
];

function localized(data: CanonicalGameData, dice: DiceDefinitionV3, locale: "ko" | "en") {
  return dice.descriptionKey ? data.localization[locale][dice.descriptionKey] ?? "" : "";
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function basicDps(dice: DiceDefinitionV3) {
  const { attack, attackInterval } = dice.baseStats;
  return attack !== undefined && attack >= 0 && attackInterval !== undefined && attackInterval > 0
    ? attack / attackInterval
    : null;
}

export function analyzeDeckDiceV4(dice: DiceDefinitionV3, data: CanonicalGameData): DeckDiceV4 {
  const ko = localized(data, dice, "ko");
  const en = localized(data, dice, "en");
  const text = `${ko} ${en}`.toLocaleLowerCase();
  const dps = basicDps(dice);
  const roles: DeckRoleV4[] = [];
  if (containsAny(text, CONTROL_TERMS)) roles.push("control");
  if (containsAny(text, ECONOMY_TERMS)) roles.push("economy");
  if (containsAny(text, UTILITY_TERMS)) roles.push("utility");
  if (dps !== null && (dps >= 75 || (dps > 0 && !roles.length))) roles.unshift("dealer");
  if (!roles.length) roles.push("utility");

  const hasSpecialMechanic = Boolean(dice.mechanicRuleId)
    || Boolean(dice.baseStats.extra.ProjectileAbilityId)
    || Boolean(dice.baseStats.extra.DefenderSkillKind);
  return {
    diceId: dice.id,
    roles,
    basicDps: dps,
    calculation: dps === null ? "unavailable" : hasSpecialMechanic ? "partial-basic" : "verified-basic",
    evidence: ko || en || dice.id,
  };
}

function profileConfidenceBonus(entry: DeckDiceV4, profile: SpendProfileV4) {
  if (profile === "free") return entry.calculation === "verified-basic" ? 220 : -100;
  if (profile === "light") return entry.calculation === "verified-basic" ? 90 : 10;
  return entry.calculation === "partial-basic" ? 150 : 20;
}

function score(entry: DeckDiceV4, dice: DiceDefinitionV3, goal: DeckGoalV4, profile: SpendProfileV4) {
  let value = Math.min(entry.basicDps ?? 0, 1_000);
  if (entry.roles.includes("dealer")) value += goal === "dealer" ? 260 : goal === "balanced" ? 180 : 80;
  if (entry.roles.includes("control")) value += goal === "support" ? 280 : 120;
  if (entry.roles.includes("economy")) value += profile === "free" ? 300 : profile === "light" ? 220 : 130;
  if (entry.roles.includes("utility")) value += goal === "support" ? 240 : 110;
  value += profileConfidenceBonus(entry, profile);
  if (profile === "invested" && dice.mechanicRuleId) value += 40;
  return value;
}

function takeRole(selected: DeckDiceV4[], ranked: DeckDiceV4[], role: DeckRoleV4, count: number) {
  for (const candidate of ranked) {
    if (selected.length >= 5 || count <= 0) break;
    if (!candidate.roles.includes(role) || selected.some((entry) => entry.diceId === candidate.diceId)) continue;
    selected.push(candidate);
    count -= 1;
  }
}

export function recommendDeckV4(
  data: CanonicalGameData,
  goal: DeckGoalV4,
  spendProfile: SpendProfileV4,
): DeckRecommendationV4 {
  const playable = playableDiceV3(data);
  if (!playable.length) throw new Error("Cannot recommend a deck without dice data");
  const analyzed = playable.map((dice) => analyzeDeckDiceV4(dice, data));
  const diceById = new Map(playable.map((dice) => [dice.id, dice]));
  const ranked = [...analyzed].sort((left, right) => {
    const difference = score(right, diceById.get(right.diceId)!, goal, spendProfile)
      - score(left, diceById.get(left.diceId)!, goal, spendProfile);
    return difference || left.diceId.localeCompare(right.diceId);
  });
  const selected: DeckDiceV4[] = [];
  const dealerRanked = [...ranked].sort((left, right) => {
    const confidenceBonus = (entry: DeckDiceV4) => profileConfidenceBonus(entry, spendProfile);
    const difference = ((right.basicDps ?? 0) + confidenceBonus(right))
      - ((left.basicDps ?? 0) + confidenceBonus(left));
    return difference || left.diceId.localeCompare(right.diceId);
  });
  takeRole(selected, dealerRanked, "dealer", goal === "support" ? 1 : 2);
  takeRole(selected, ranked, "economy", 1);
  takeRole(selected, ranked, "control", goal === "support" ? 2 : 1);
  takeRole(selected, ranked, "utility", 1);
  for (const candidate of ranked) {
    if (selected.length >= 5) break;
    if (!selected.some((entry) => entry.diceId === candidate.diceId)) selected.push(candidate);
  }
  const primary = selected
    .filter((entry) => entry.basicDps !== null)
    .sort((left, right) => (right.basicDps ?? 0) - (left.basicDps ?? 0))[0] ?? selected[0];
  return {
    dice: selected,
    primaryDiceId: primary.diceId,
    goal,
    spendProfile,
    source: "game-data-synergy",
  };
}
