import { analyzeDeckDiceV4 } from "./recommendDeck";
import { playableDiceV3 } from "../game-data/playableDice";
import type { CanonicalGameData, DiceDefinitionV3 } from "../game-data/types";

export interface DiceKnowledgeV48 {
  diceId: string;
  roles: string[];
  name: { ko: string; en: string };
  summary: { ko: string; en: string };
  strengths: { ko: string[]; en: string[] };
  weaknesses: { ko: string[]; en: string[] };
  partners: Array<{ diceId: string; reason: { ko: string; en: string } }>;
  conflicts: Array<{ diceId: string; reason: { ko: string; en: string } }>;
  basicDps: number | null;
  confidence: "verified" | "partial";
}

const PAIRS: ReadonlyArray<readonly [string, string, string, string]> = [
  ["predator", "brokengrowth", "높은 눈금 공급으로 포식 누적 시작을 안정화합니다.", "High-dot supply stabilizes Predator's scaling start."],
  ["predator", "light", "공격 속도가 처치 누적 속도를 높입니다.", "Attack speed accelerates kill-stack acquisition."],
  ["predator", "decay", "약화된 적을 마무리해 포식 누적을 돕습니다.", "Softened targets are easier for Predator to finish."],
  ["element", "ice", "이동 제어가 원자 지속 피해의 노출 시간을 늘립니다.", "Control extends exposure to Atomic sustained damage."],
  ["speedgun", "flow", "적 이동 속도가 관성의 속도 비례 공격을 강화합니다.", "Enemy speed directly feeds Momentum scaling."],
  ["gear", "switch", "배치를 복구해 기어 연결 보너스를 유지합니다.", "Position repair maintains Gear adjacency."],
  ["combo", "summon", "합성 재료 공급으로 콤보 누적 기회를 늘립니다.", "Merge material creates more Combo stacking chances."],
  ["joker", "summon", "필요 눈금과 합성 재료를 함께 보충합니다.", "Dot matching and merge supply reinforce each other."],
];

const CONFLICTS: ReadonlyArray<readonly [string, string, string, string]> = [
  ["gear", "mutation", "무작위 변환이 기어의 인접 배치를 훼손할 수 있습니다.", "Random transformation can break Gear adjacency."],
  ["resonance", "mutation", "무작위 변환이 같은 눈금 조건을 불안정하게 만듭니다.", "Random transformation destabilizes same-dot setup."],
  ["predator", "executioner", "마무리 역할이 겹쳐 포식의 처치 누적을 빼앗을 수 있습니다.", "Competing finishers can steal Predator kill stacks."],
];

function localized(data: CanonicalGameData, dice: DiceDefinitionV3, locale: "ko" | "en") {
  return dice.nameKey ? data.localization[locale][dice.nameKey] ?? dice.id : dice.id;
}

function description(data: CanonicalGameData, dice: DiceDefinitionV3, locale: "ko" | "en") {
  return dice.descriptionKey ? data.localization[locale][dice.descriptionKey] ?? "" : "";
}

export function buildDiceKnowledgeV48(data: CanonicalGameData, diceId: string): DiceKnowledgeV48 | null {
  const dice = playableDiceV3(data).find((entry) => entry.id === diceId);
  if (!dice) return null;
  const analyzed = analyzeDeckDiceV4(dice, data);
  const partners: DiceKnowledgeV48["partners"] = PAIRS.flatMap(([a, b, ko, en]) => a === diceId ? [{ diceId: b, reason: { ko, en } }] : b === diceId ? [{ diceId: a, reason: { ko, en } }] : []);
  const conflicts: DiceKnowledgeV48["conflicts"] = CONFLICTS.flatMap(([a, b, ko, en]) => a === diceId ? [{ diceId: b, reason: { ko, en } }] : b === diceId ? [{ diceId: a, reason: { ko, en } }] : []);
  const roles = analyzed.roles;
  const strengths = {
    ko: [roles.includes("dealer") ? "직접 피해 역할" : "조합 보조 역할", analyzed.basicDps !== null ? "기본 공격 수치 계산 가능" : "특수 효과 중심"],
    en: [roles.includes("dealer") ? "Direct damage role" : "Composition support role", analyzed.basicDps !== null ? "Basic attack is calculable" : "Special-effect focused"],
  };
  const weaknesses = {
    ko: [analyzed.calculation === "verified-basic" ? "특수 효과는 기본 DPS에 포함되지 않음" : "실전 공식 일부 미검증", partners.length ? "파트너 의존도가 있음" : "관측 시너지 자료가 제한적임"],
    en: [analyzed.calculation === "verified-basic" ? "Special effect excluded from basic DPS" : "Practical formula partially unresolved", partners.length ? "Depends on partner setup" : "Observed synergy evidence is limited"],
  };
  return {
    diceId, roles, name: { ko: localized(data, dice, "ko"), en: localized(data, dice, "en") },
    summary: { ko: description(data, dice, "ko") || "효과 설명 데이터가 없습니다.", en: description(data, dice, "en") || "No effect description is available." },
    strengths, weaknesses, partners, conflicts, basicDps: analyzed.basicDps,
    confidence: analyzed.calculation === "verified-basic" ? "verified" : "partial",
  };
}

export function searchDiceKnowledgeV48(data: CanonicalGameData, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return playableDiceV3(data).filter((dice) => {
    const text = [dice.id, localized(data, dice, "ko"), localized(data, dice, "en"), description(data, dice, "ko"), description(data, dice, "en")].join(" ").toLocaleLowerCase();
    return !normalized || text.includes(normalized);
  }).map((dice) => buildDiceKnowledgeV48(data, dice.id)!).filter(Boolean);
}
