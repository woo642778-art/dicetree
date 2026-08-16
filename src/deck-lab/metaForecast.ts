import type { CanonicalGameData } from "../game-data/types";
import { analyzeDeckDiceV4 } from "./recommendDeck";
import { CO_OP_RANKING_SNAPSHOT, summarizeDiceUsage, type CoOpDeckRole } from "./coOpRankingSnapshot";

export interface MetaForecast {
  id: string;
  role: CoOpDeckRole;
  diceIds: readonly string[];
  confidence: number;
  observedRanks: readonly number[];
  title: { ko: string; en: string };
  reason: { ko: string; en: string };
  risk: { ko: string; en: string };
}

export interface RosterMetaAnalysis {
  analyzedDice: number;
  rankedDice: number;
  unrankedDice: number;
  mechanicDice: number;
  dealerDice: number;
  controlDice: number;
  economyDice: number;
  utilityDice: number;
}

export const NEXT_META_FORECASTS: readonly MetaForecast[] = [
  {
    id: "greed-blessing-cycle",
    role: "support",
    diceIds: ["box", "blessing", "summon", "adjust", "brokengrowth"],
    confidence: 64,
    observedRanks: [46, 56],
    title: { ko: "탐욕·축복 순환", en: "Greed and Blessing cycle" },
    reason: {
      ko: "동일한 핵심 조합이 두 순위에서 반복됐다. 소환·적응·성장이 합성 횟수와 눈금 복구를 맡아 탐욕과 축복의 발동 기회를 늘리는 서포트형이다.",
      en: "The same core appeared at two ranks. Summon, Mimic and Growth sustain merges and dot recovery for Greed and Blessing.",
    },
    risk: {
      ko: "표본이 2개뿐이고 직접 화력이 없어 딜러 파트너 의존도가 높다.",
      en: "Only two samples were observed and the deck relies heavily on a dealer partner.",
    },
  },
  {
    id: "electric-chain-carry",
    role: "dealer",
    diceIds: ["electric", "decay", "light", "adjust", "brokengrowth"],
    confidence: 56,
    observedRanks: [63],
    title: { ko: "전기 연쇄 캐리", en: "Electric chain carry" },
    reason: {
      ko: "연쇄 피해와 부패 약화, 빛의 공격 속도 보조가 한 조합에 모였다. 포식 중심 구도가 조정될 경우 가장 자연스럽게 자리를 받을 대체 딜러 구조다.",
      en: "Chain damage, Decay and Light attack-speed support form a coherent alternative carry if Predator is adjusted.",
    },
    risk: {
      ko: "관측은 1개이며 후반 보스 단일 대상 성능은 이 스냅샷만으로 확정할 수 없다.",
      en: "Only one sample was observed and late-boss single-target performance is not established by this snapshot.",
    },
  },
  {
    id: "saw-control-summon",
    role: "dealer",
    diceIds: ["sawblade", "ice", "lock", "adjust", "summon"],
    confidence: 51,
    observedRanks: [84],
    title: { ko: "톱날 소환 제어", en: "Saw summon control" },
    reason: {
      ko: "톱날의 소환 피해에 얼음·봉인으로 시간을 벌고 적응·소환으로 재전개하는 구조다. 현재 주류와 겹치는 서포트 코어가 많아 전환 비용이 낮다.",
      en: "Ice and Seal buy time for Saw summons while Mimic and Summon rebuild the board. Its support core overlaps with current staples.",
    },
    risk: {
      ko: "톱날 특수 피해 공식이 완전 검증되지 않았고 관측도 1개라 실험 후보로 봐야 한다.",
      en: "Saw's special-damage formula is not fully verified and only one sample was observed, so this remains experimental.",
    },
  },
] as const;

export function analyzeRosterMeta(data: CanonicalGameData): RosterMetaAnalysis {
  const analyzed = data.dice.map((dice) => analyzeDeckDiceV4(dice, data));
  const rankedDiceIds = new Set(summarizeDiceUsage().map((entry) => entry.diceId));
  return {
    analyzedDice: analyzed.length,
    rankedDice: rankedDiceIds.size,
    unrankedDice: analyzed.length - rankedDiceIds.size,
    mechanicDice: data.dice.filter((dice) => Boolean(dice.mechanicRuleId)).length,
    dealerDice: analyzed.filter((entry) => entry.roles.includes("dealer")).length,
    controlDice: analyzed.filter((entry) => entry.roles.includes("control")).length,
    economyDice: analyzed.filter((entry) => entry.roles.includes("economy")).length,
    utilityDice: analyzed.filter((entry) => entry.roles.includes("utility")).length,
  };
}

export function observedRanksForComposition(diceIds: readonly string[]) {
  const target = [...diceIds].sort().join("|");
  return CO_OP_RANKING_SNAPSHOT
    .filter((deck) => [...deck.diceIds].sort().join("|") === target)
    .map((deck) => deck.rank);
}
