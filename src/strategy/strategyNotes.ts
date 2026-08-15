import type { Confidence, DiceFamily, PlannerRole } from "../domain/types";

export interface StrategyNote {
  id: string;
  subject: { type: "dice"; id: string } | { type: "family"; id: DiceFamily } | { type: "node"; id: string };
  confidence: Confidence;
  sourceIds: string[];
  roleTags: PlannerRole[];
  summary: { ko: string; en: string };
  canonicalDataImpact: false;
}

export const strategyNotes: StrategyNote[] = [
  {
    id: "devour-community-ceiling",
    subject: { type: "dice", id: "devourer" },
    confidence: "partial",
    sourceIds: ["community-dc-devour-653"],
    roleTags: ["dealer"],
    summary: {
      ko: "커뮤니티에서는 포식 고점을 위해 포식 전용 분기를 빠르게 여는 운영이 공유되고 있다. 정확한 노드명·수치는 상세 캡처 교차 확인 전까지 추천 가중치에만 제한적으로 사용한다.",
      en: "Community players describe opening Devour-specific branches early for higher ceiling. Exact node names and numbers remain source-gated.",
    },
    canonicalDataImpact: false,
  },
  {
    id: "early-magic-reuse",
    subject: { type: "family", id: "magic" },
    confidence: "partial",
    sourceIds: ["community-dc-f2p-1517"],
    roleTags: ["support", "balanced"],
    summary: {
      ko: "초반 범용 진행에서 마법 계열의 적응·소환 계통을 재사용하기 좋다는 커뮤니티 의견이 있다.",
      en: "Community guidance frequently treats early Magic utility routes such as Adapt/Summon as reusable progression.",
    },
    canonicalDataImpact: false,
  },
  {
    id: "engineering-early-route",
    subject: { type: "family", id: "engineering" },
    confidence: "partial",
    sourceIds: ["community-dc-engineering-317"],
    roleTags: ["dealer", "balanced"],
    summary: {
      ko: "공학 계열 초반 투자와 기어 계통을 우선하는 트리 공유가 있다. 실제 비용과 효과는 스크린샷으로 확인된 필드만 계산한다.",
      en: "Community tree shares prioritize early Engineering/Gear routes; only screenshot-confirmed fields are used in cost calculations.",
    },
    canonicalDataImpact: false,
  },
  {
    id: "chaos-dual-dice-synergy",
    subject: { type: "family", id: "chaos" },
    confidence: "partial",
    sourceIds: ["user-prior-stat-details"],
    roleTags: ["dealer"],
    summary: {
      ko: "포식과 부패를 함께 쓰는 덱에서는 혼돈 계열 전체 공격속도처럼 두 주사위에 동시에 적용되는 노드의 덱 전체 가치가 커질 수 있다.",
      en: "When Devour and Corruption are used together, Chaos-wide stats such as attack speed can have higher whole-deck relevance.",
    },
    canonicalDataImpact: false,
  },
];
