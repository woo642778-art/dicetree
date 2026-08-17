import { analyzeDeckCompositionV4, type DeckAnalysisV4 } from "../deck-lab/analyzeDeck";
import type { CanonicalGameData } from "../game-data/types";
import { simulatedInvestmentCost } from "../planner-v3/costs";
import type { PlannerStateV3 } from "../planner-v3/types";
import { simulateDiceWithTreeV3 } from "../simulation/engine/simulateTreeAware";
import type { SimulationInputV3 } from "../simulation/engine/types";

export interface BuildHealthIssueV48 {
  severity: "high" | "medium" | "low";
  code: string;
  title: { ko: string; en: string };
  detail: { ko: string; en: string };
}

export interface BuildHealthV48 {
  score: number;
  deck: DeckAnalysisV4;
  invested: { gold: number; stone: number };
  practicalDps: number | null;
  confidence: "verified" | "partial";
  issues: BuildHealthIssueV48[];
}

export function analyzeBuildHealthV48(data: CanonicalGameData, state: PlannerStateV3, deckIds: readonly string[], input: SimulationInputV3): BuildHealthV48 {
  const deck = analyzeDeckCompositionV4(data, deckIds);
  const simulation = simulateDiceWithTreeV3(input, data);
  const invested = simulatedInvestmentCost(data.tree, { ownedRanks: {}, simulatedRanks: state.ownedRanks });
  const issues: BuildHealthIssueV48[] = [];
  if (deck.scores.damage < 40) issues.push({ severity: "high", code: "damage-core", title: { ko: "확실한 딜링 축 부족", en: "Missing damage core" }, detail: { ko: "고체력 웨이브를 마무리할 주사위가 부족합니다.", en: "The deck lacks a reliable finisher for high-HP waves." } });
  if (deck.scores.growth < 35 && deck.scores.economy < 35) issues.push({ severity: "high", code: "opening", title: { ko: "초반 전개 병목", en: "Opening bottleneck" }, detail: { ko: "성장·복사·소환·SP 공급 중 하나를 보강해야 합니다.", en: "Add growth, copying, summoning, or SP supply." } });
  if (deck.scores.control < 30) issues.push({ severity: "medium", code: "control", title: { ko: "장기전 제어 부족", en: "Low long-fight control" }, detail: { ko: "장기전에서 적을 묶어 둘 안전 여유가 작습니다.", en: "Long fights have little control safety margin." } });
  if (simulation.practicalDps === null) issues.push({ severity: "medium", code: "unresolved", title: { ko: "일부 공식 미검증", en: "Partially unresolved formula" }, detail: { ko: "현재 주사위의 특수 효과는 정확한 실전 DPS로 확정할 수 없습니다.", en: "The selected dice's special effect cannot yet produce authoritative practical DPS." } });
  if (!Object.keys(state.ownedRanks).length) issues.push({ severity: "low", code: "tree-empty", title: { ko: "실제 트리 미입력", en: "Owned tree not entered" }, detail: { ko: "현재 보유 트리를 입력하면 낭비와 다음 투자 판단이 정확해집니다.", en: "Enter the owned tree for more accurate waste and next-action analysis." } });
  const penalty = issues.reduce((sum, issue) => sum + (issue.severity === "high" ? 11 : issue.severity === "medium" ? 6 : 3), 0);
  const score = Math.max(0, Math.min(100, Math.round(deck.scores.overall * 0.78 + deck.scores.stability * 0.22 - penalty)));
  return { score, deck, invested, practicalDps: simulation.practicalDps, confidence: simulation.confidence === "verified" && deck.confidence === "verified" ? "verified" : "partial", issues };
}
