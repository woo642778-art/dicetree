import type { Confidence, ResourceCostV2 } from "../domain/types";

export interface RankCostEvidence {
  id: string;
  nodeId: string;
  fromRank?: number;
  toRank?: number;
  cost: ResourceCostV2;
  confidence: Extract<Confidence, "verified" | "observed" | "partial">;
  sourceIds: string[];
  note: { ko: string; en: string };
}

const OVERVIEW = ["user-tree-full-a", "user-tree-full-b"];
const DETAIL = ["user-prior-stat-details"];

/**
 * Current Random Dice 2 cost observations only.
 * A single observed next cost never implies that the same price repeats for
 * every rank. Missing rank rows stay missing until a current-game source
 * establishes them.
 */
export const costEvidence: RankCostEvidence[] = [
  { id: "nature-5-6", nodeId: "nature-rank-5-100", fromRank: 5, toRank: 6, cost: { gold: 2000, blueCard: 1 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "전체 트리 캡처에서 5/100 옆 다음 비용 확인", en: "Next cost beside 5/100 in the supplied tree capture" } },
  { id: "nature-2-3", nodeId: "nature-upper-rank-2-50", fromRank: 2, toRank: 3, cost: { gold: 3000 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "2/50 노드의 표시 비용", en: "Displayed cost for the 2/50 node" } },
  { id: "nature-cap-50k", nodeId: "nature-cap-50000", cost: { gold: 50000, prismCube: 10 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "후반 마일스톤에 표시된 복합 비용", en: "Multi-resource late milestone cost" } },
  { id: "nature-cap-100k-20", nodeId: "nature-cap-100000", cost: { gold: 100000, prismCube: 20 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "후반 캡스톤 표시 비용", en: "Displayed late capstone cost" } },
  { id: "nature-end-100k-10", nodeId: "nature-top-end", cost: { gold: 100000, prismCube: 10 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "끝 노드 표시 비용", en: "Displayed end-node cost" } },

  { id: "chaos-5-6", nodeId: "chaos-rank-5-100", fromRank: 5, toRank: 6, cost: { gold: 2000, blueCard: 1 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "5/100 노드 표시 비용", en: "Displayed cost at 5/100" } },
  { id: "chaos-4-5", nodeId: "chaos-rank-4-50", fromRank: 4, toRank: 5, cost: { gold: 3000 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "4/50 노드 표시 비용", en: "Displayed cost at 4/50" } },
  { id: "chaos-16-nearby", nodeId: "chaos-rank-16-50", fromRank: 16, toRank: 17, cost: { gold: 5000, prismCube: 10 }, confidence: "partial", sourceIds: OVERVIEW, note: { ko: "16/50 주변 비용 표시는 보이지만 정확한 귀속은 상세 캡처 추가 확인 필요", en: "A cost label is visible near 16/50, but exact attribution needs a detail capture" } },
  { id: "chaos-special-12", nodeId: "chaos-upper-special", cost: { prismCube: 12 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "특수 노드에 표시된 12 재화", en: "12-resource gate shown on the special node" } },
  { id: "chaos-cap-100k", nodeId: "chaos-cap-100000", cost: { gold: 100000, prismCube: 20 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "후반 캡스톤 표시 비용", en: "Displayed late capstone cost" } },
  { id: "chaos-lower-3", nodeId: "chaos-lower-dark", cost: { prismCube: 3 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "하단 노드 표시 재화", en: "Displayed lower-branch resource cost" } },
  { id: "chaos-as-next", nodeId: "chaos-attack-speed-observed-next", cost: { gold: 3000 }, confidence: "observed", sourceIds: DETAIL, note: { ko: "혼돈 계열 공격속도 +0.5%p의 다음 투자 비용. 현재 랭크 번호는 확인되지 않음", en: "Next cost for +0.5pp Chaos attack speed; current rank number is not confirmed" } },

  { id: "engineering-5-6", nodeId: "engineering-rank-5-100", fromRank: 5, toRank: 6, cost: { gold: 2000, blueCard: 1 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "5/100 노드 표시 비용", en: "Displayed cost at 5/100" } },
  { id: "engineering-special-12", nodeId: "engineering-special-12", cost: { prismCube: 12 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "특수 노드 표시 재화", en: "Displayed special-node resource cost" } },
  { id: "engineering-30k", nodeId: "engineering-special-30000", cost: { gold: 30000, prismCube: 10 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "공학 후반 노드 표시 비용", en: "Displayed Engineering late-node cost" } },
  { id: "engineering-end-8k", nodeId: "engineering-end-8000", cost: { gold: 8000 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "공학 끝쪽 노드 표시 비용", en: "Displayed Engineering endpoint cost" } },

  { id: "magic-5-6", nodeId: "magic-rank-5-100", fromRank: 5, toRank: 6, cost: { gold: 2000, blueCard: 1 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "5/100 노드 표시 비용", en: "Displayed cost at 5/100" } },
  { id: "magic-green-cap", nodeId: "magic-green-cap", cost: { gold: 100000, blueCard: 20, prismCube: 10 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "세 종류 재화가 함께 표시된 후반 노드", en: "Late node displaying three resource requirements" } },
  { id: "magic-1-2-of-15", nodeId: "magic-rank-1-15", fromRank: 1, toRank: 2, cost: { gold: 4000 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "1/15 노드의 다음 비용", en: "Next cost displayed at 1/15" } },
  { id: "magic-cyan-2k", nodeId: "magic-cyan-dice", cost: { gold: 2000 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "하단 주사위 노드 표시 비용", en: "Displayed lower dice-node cost" } },
  { id: "magic-lower-cap", nodeId: "magic-lower-cap", cost: { gold: 100000, blueCard: 20, prismCube: 10 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "하단 캡스톤 표시 비용", en: "Displayed lower capstone cost" } },

  { id: "order-5-6", nodeId: "order-rank-5-100", fromRank: 5, toRank: 6, cost: { gold: 2000, blueCard: 1 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "5/100 노드 표시 비용", en: "Displayed cost at 5/100" } },
  { id: "order-17-18", nodeId: "order-rank-17-50", fromRank: 17, toRank: 18, cost: { gold: 4000 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "17/50 노드의 다음 비용", en: "Next cost displayed at 17/50" } },
  { id: "order-special-12", nodeId: "order-special-12", cost: { prismCube: 12 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "특수 노드 표시 재화", en: "Displayed special-node resource cost" } },
  { id: "order-special-cap", nodeId: "order-special-cap", cost: { gold: 30000, prismCube: 10 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "질서 후반 마일스톤 표시 비용", en: "Displayed Order late milestone cost" } },
  { id: "order-upper-2k", nodeId: "order-upper-stat", cost: { gold: 2000 }, confidence: "observed", sourceIds: OVERVIEW, note: { ko: "상단 능력 노드 표시 비용", en: "Displayed upper stat-node cost" } },
  { id: "global-bullet-next", nodeId: "global-bullet-observed-next", cost: { gold: 3000 }, confidence: "observed", sourceIds: DETAIL, note: { ko: "모든 주사위 불렛 데미지 다음 랭크 +1.2%p의 비용. 최대 50랭크는 확인됐지만 현재 랭크 번호는 미확인", en: "Cost for the next +1.2pp all-dice bullet-damage rank; max 50 is known but current rank number is not" } },
  { id: "global-bullet-15", nodeId: "global-bullet-milestone-15", fromRank: 0, toRank: 1, cost: { gold: 15000 }, confidence: "observed", sourceIds: DETAIL, note: { ko: "모든 주사위 불렛 데미지 +15% 마일스톤 비용", en: "Cost of the +15% all-dice bullet-damage milestone" } },
];

export function getCostEvidenceForNode(nodeId: string): RankCostEvidence[] {
  return costEvidence.filter((entry) => entry.nodeId === nodeId);
}

export function getCostResearchStats() {
  const exactRankContext = costEvidence.filter((entry) => entry.fromRank !== undefined && entry.confidence !== "partial");
  return {
    observations: costEvidence.length,
    nodesCovered: new Set(costEvidence.map((entry) => entry.nodeId)).size,
    nodesWithExactRankContext: new Set(exactRankContext.map((entry) => entry.nodeId)).size,
    completeLadders: 0,
  };
}
