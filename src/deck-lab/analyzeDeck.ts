import { playableDiceV3 } from "../game-data/playableDice";
import type { CanonicalGameData, DiceDefinitionV3 } from "../game-data/types";
import { analyzeDeckDiceV4 } from "./recommendDeck";

export type DeckScoreCategoryV4 = "damage" | "growth" | "economy" | "control" | "buff" | "boss" | "stability";

export interface DeckScoreSetV4 extends Record<DeckScoreCategoryV4, number> {
  overall: number;
}

export interface DeckInsightV4 {
  kind: "strength" | "warning" | "synergy";
  ko: string;
  en: string;
}

export interface DeckAnalysisV4 {
  diceIds: string[];
  scores: DeckScoreSetV4;
  insights: DeckInsightV4[];
  confidence: "verified" | "partial";
}

export interface DeckReplacementV4 {
  slot: number;
  fromDiceId: string;
  toDiceId: string;
  before: number;
  after: number;
  delta: number;
  categoryDeltas: Partial<Record<DeckScoreCategoryV4, number>>;
  reason: { ko: string; en: string };
}

const TERMS = {
  growth: ["성장", "복사", "소환", "같은 눈금", "growth", "copy", "summon", "same dot", "same pip", "mimic"],
  economy: ["sp 획득", "sp gain", "sp mining", "현재 sp", "current sp", "소환 비용", "summon cost"],
  control: ["빙결", "기절", "경직", "봉인", "감속", "frozen", "freeze", "stun", "lock", "slow", "return to the entrance", "입구 복귀"],
  buff: ["공격 속도 증가", "대미지 증가", "버블", "정렬", "공명", "축복", "atk spd", "damage of all dice", "bubble", "alignment", "resonance", "bless"],
  damage: ["대미지", "피해", "즉시 처치", "damage", "dmg", "instantly kill", "snipe", "laser"],
};

const SYNERGIES: Array<{ a: string; b: string; ko: string; en: string }> = [
  { a: "predator", b: "brokengrowth", ko: "성장으로 높은 눈금을 확보해 포식의 처치 누적 기반을 안정적으로 키웁니다.", en: "Growth supplies high-dot units that stabilize Predator's kill-scaling setup." },
  { a: "predator", b: "light", ko: "빛의 공격 속도 증가가 포식의 기본 공격과 처치 누적 속도를 함께 끌어올립니다.", en: "Light accelerates Predator's basic attacks and kill-stack acquisition." },
  { a: "predator", b: "decay", ko: "부패의 약화 효과가 포식의 마무리와 누적 진입을 보조합니다.", en: "Decay softens targets so Predator can secure kills and begin scaling." },
  { a: "element", b: "ice", ko: "얼음의 이동 제어가 원자의 지속 피해가 적용되는 시간을 늘립니다.", en: "Ice extends the time enemies remain exposed to Atomic's sustained damage." },
  { a: "speedgun", b: "flow", ko: "흐름이 적 이동 속도를 높여 관성의 속도 비례 공격을 강화합니다.", en: "Flow raises enemy movement speed, directly feeding Momentum's speed scaling." },
  { a: "gear", b: "switch", ko: "스위치로 기어의 인접 배치를 복구해 연결 보너스를 유지하기 쉽습니다.", en: "Switch repairs Gear adjacency and helps maintain connection bonuses." },
  { a: "combo", b: "summon", ko: "소환이 합성 재료와 필드 순환을 공급해 콤보 누적 기회를 늘립니다.", en: "Summon supplies merge material and board cycling for more Combo stacks." },
  { a: "joker", b: "summon", ko: "조커와 소환이 필요한 눈금과 합성 재료를 함께 보충합니다.", en: "Joker and Summon jointly improve dot matching and merge-material supply." },
  { a: "resonance", b: "adjust", ko: "적응으로 같은 눈금 구성을 정리해 공명 발동 조건을 맞추기 쉽습니다.", en: "Mimic smooths same-dot board states needed for Resonance." },
];

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function description(data: CanonicalGameData, dice: DiceDefinitionV3) {
  const key = dice.descriptionKey;
  return key ? `${data.localization.ko[key] ?? ""} ${data.localization.en[key] ?? ""}`.toLocaleLowerCase() : "";
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function diceSignals(data: CanonicalGameData, dice: DiceDefinitionV3) {
  const entry = analyzeDeckDiceV4(dice, data);
  const text = description(data, dice);
  const dps = entry.basicDps ?? 0;
  const damage = clamp(Math.min(80, dps / 2.5) + (entry.roles.includes("dealer") ? 25 : 0) + (hasAny(text, TERMS.damage) ? 18 : 0));
  const growth = clamp((hasAny(text, TERMS.growth) ? 82 : 0) + (["joker", "adjust", "switch"].includes(dice.id) ? 12 : 0));
  const economy = clamp((hasAny(text, TERMS.economy) ? 88 : 0) + (dice.id === "mine" ? 12 : 0));
  const control = clamp((entry.roles.includes("control") ? 82 : 0) + (hasAny(text, TERMS.control) ? 16 : 0));
  const buff = clamp((hasAny(text, TERMS.buff) ? 82 : 0) + (entry.roles.includes("utility") ? 12 : 0));
  const boss = clamp((dice.baseStats.bossMultiplier ?? 100) - 100 + (dice.id === "iron" ? 65 : 0) + (["sniper", "doom", "executioner", "predator", "tyrant"].includes(dice.id) ? 42 : 0) + damage * 0.35);
  const stability = clamp(36 + (entry.calculation === "verified-basic" ? 24 : 4) + (growth > 0 ? 15 : 0) + (control > 0 ? 12 : 0) - (["mutation", "brokengrowth", "blessing"].includes(dice.id) ? 16 : 0));
  return { damage, growth, economy, control, buff, boss, stability, entry };
}

function combinedCategory(values: number[]) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => b - a);
  return clamp((ordered[0] ?? 0) * 0.68 + (ordered[1] ?? 0) * 0.2 + (ordered[2] ?? 0) * 0.08 + (ordered[3] ?? 0) * 0.04);
}

function localizedName(data: CanonicalGameData, diceId: string, locale: "ko" | "en") {
  const dice = data.dice.find((entry) => entry.id === diceId);
  return dice?.nameKey ? data.localization[locale][dice.nameKey] ?? diceId : diceId;
}

export function analyzeDeckCompositionV4(data: CanonicalGameData, diceIds: readonly string[]): DeckAnalysisV4 {
  const playable = new Map(playableDiceV3(data).map((dice) => [dice.id, dice]));
  const dice = diceIds.map((id) => playable.get(id)).filter((entry): entry is DiceDefinitionV3 => Boolean(entry));
  const signals = dice.map((entry) => diceSignals(data, entry));
  const category = (key: DeckScoreCategoryV4) => combinedCategory(signals.map((signal) => signal[key]));
  const scores: DeckScoreSetV4 = {
    damage: category("damage"), growth: category("growth"), economy: category("economy"),
    control: category("control"), buff: category("buff"), boss: category("boss"), stability: category("stability"),
    overall: 0,
  };
  const coverage = (["damage", "growth", "economy", "control", "buff", "boss"] as DeckScoreCategoryV4[]).filter((key) => scores[key] >= 35).length;
  scores.stability = clamp(scores.stability * 0.72 + coverage * 4.6);
  scores.overall = clamp(scores.damage * 0.24 + scores.growth * 0.13 + scores.economy * 0.11 + scores.control * 0.12 + scores.buff * 0.1 + scores.boss * 0.15 + scores.stability * 0.15);

  const insights: DeckInsightV4[] = [];
  const dealerCount = signals.filter((signal) => signal.entry.roles.includes("dealer") || signal.damage >= 55).length;
  if (dealerCount >= 3) insights.push({ kind: "warning", ko: `메인 딜링 후보가 ${dealerCount}개라 성장 재화와 필드 역할이 겹칠 가능성이 큽니다.`, en: `${dealerCount} damage cores may compete for board space and upgrade resources.` });
  if (scores.damage < 38) insights.push({ kind: "warning", ko: "확실한 메인 딜러가 부족해 고체력 웨이브 마무리가 불안정합니다.", en: "No clear damage core makes high-HP wave finishing unreliable." });
  if (scores.growth < 34 && scores.economy < 34) insights.push({ kind: "warning", ko: "초반 전개 수단이 부족합니다. 성장·복사·소환·SP 공급 중 하나를 보강해야 합니다.", en: "Early board development is weak. Add growth, copying, summoning, or SP supply." });
  if (scores.control < 30) insights.push({ kind: "warning", ko: "적 이동을 지연할 제어 수단이 없어 장기전 안전 여유가 작습니다.", en: "Without crowd control, the deck has little safety margin in long fights." });
  if (scores.boss >= 70) insights.push({ kind: "strength", ko: "보스 대상 화력과 특수 처치 기여가 높은 편입니다.", en: "Boss damage and special-finisher coverage are strong." });
  if (scores.stability >= 70) insights.push({ kind: "strength", ko: "전개·제어·피해 역할이 고르게 분산되어 실패 복구력이 높습니다.", en: "Balanced development, control, and damage give this deck good recovery capacity." });

  const idSet = new Set(dice.map((entry) => entry.id));
  for (const pair of SYNERGIES) {
    if (!idSet.has(pair.a) || !idSet.has(pair.b)) continue;
    insights.push({ kind: "synergy", ko: `${localizedName(data, pair.a, "ko")} + ${localizedName(data, pair.b, "ko")}: ${pair.ko}`, en: `${localizedName(data, pair.a, "en")} + ${localizedName(data, pair.b, "en")}: ${pair.en}` });
  }
  if (diceIds.length !== 5 || dice.length !== 5 || new Set(diceIds).size !== 5) {
    insights.unshift({ kind: "warning", ko: "서로 다른 플레이 가능 주사위 5개를 모두 선택해야 정확한 덱 분석이 됩니다.", en: "Select five distinct playable dice for a valid deck analysis." });
  }
  if (!insights.length) insights.push({ kind: "strength", ko: "뚜렷한 역할 충돌은 없지만, 실제 전투 조건별 시뮬레이션으로 고점을 확인해야 합니다.", en: "No major role conflict was found, but scenario simulation is still needed to verify the ceiling." });
  const confidence = signals.every((signal) => signal.entry.calculation === "verified-basic") ? "verified" : "partial";
  return { diceIds: [...diceIds], scores, insights, confidence };
}

export function replacementCandidatesV4(data: CanonicalGameData, diceIds: readonly string[], slot: number, limit = 3): DeckReplacementV4[] {
  if (slot < 0 || slot >= diceIds.length) return [];
  const beforeAnalysis = analyzeDeckCompositionV4(data, diceIds);
  const fromDiceId = diceIds[slot];
  const occupied = new Set(diceIds);
  return playableDiceV3(data)
    .filter((dice) => !occupied.has(dice.id))
    .map((dice) => {
      const next = [...diceIds];
      next[slot] = dice.id;
      const afterAnalysis = analyzeDeckCompositionV4(data, next);
      const categoryDeltas = Object.fromEntries(
        (["damage", "growth", "economy", "control", "buff", "boss", "stability"] as DeckScoreCategoryV4[])
          .map((key) => [key, afterAnalysis.scores[key] - beforeAnalysis.scores[key]])
          .filter(([, delta]) => delta !== 0),
      ) as Partial<Record<DeckScoreCategoryV4, number>>;
      const best = Object.entries(categoryDeltas).sort((left, right) => right[1] - left[1])[0];
      const label: Record<DeckScoreCategoryV4, { ko: string; en: string }> = {
        damage: { ko: "딜링", en: "damage" }, growth: { ko: "성장", en: "growth" }, economy: { ko: "경제", en: "economy" }, control: { ko: "제어", en: "control" }, buff: { ko: "버프", en: "buff" }, boss: { ko: "보스 대응", en: "boss" }, stability: { ko: "안정성", en: "stability" },
      };
      const key = (best?.[0] ?? "stability") as DeckScoreCategoryV4;
      const gain = best?.[1] ?? 0;
      return {
        slot, fromDiceId, toDiceId: dice.id, before: beforeAnalysis.scores.overall, after: afterAnalysis.scores.overall,
        delta: afterAnalysis.scores.overall - beforeAnalysis.scores.overall, categoryDeltas,
        reason: { ko: `${label[key].ko} ${gain >= 0 ? "+" : ""}${gain}점이 가장 크게 변합니다.`, en: `${label[key].en} changes most (${gain >= 0 ? "+" : ""}${gain}).` },
      };
    })
    .sort((left, right) => right.delta - left.delta || right.after - left.after || left.toDiceId.localeCompare(right.toDiceId))
    .slice(0, limit);
}
