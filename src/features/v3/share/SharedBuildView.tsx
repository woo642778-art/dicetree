import { analyzeDeckCompositionV4, type DeckScoreCategoryV4 } from "../../../deck-lab/analyzeDeck";
import type { CanonicalGameData } from "../../../game-data/types";
import { projectResources, simulatedInvestmentCost } from "../../../planner-v3/costs";
import type { SharedResultV47 } from "../../../share/resultCodecV47";
import type { PlannerStateV3 } from "../../../planner-v3/types";
import { addTreeCosts, treeCostForRange, ZERO_TREE_COST } from "../../../planner-v3/costs";
import type { SimulationInputV3 } from "../../../simulation/engine/types";
import { simulateDiceWithTreeV3 } from "../../../simulation/engine/simulateTreeAware";
import { DiceIcon } from "../shared/DiceIcon";

const CATEGORIES: Record<DeckScoreCategoryV4, { ko: string; en: string }> = {
  damage: { ko: "딜링", en: "Damage" }, growth: { ko: "성장", en: "Growth" }, economy: { ko: "경제", en: "Economy" },
  control: { ko: "CC", en: "CC" }, buff: { ko: "버프", en: "Buff" }, boss: { ko: "보스", en: "Boss" }, stability: { ko: "안정성", en: "Stability" },
};

function nameOf(data: CanonicalGameData, diceId: string, locale: "ko" | "en") {
  const dice = data.dice.find((entry) => entry.id === diceId);
  return dice?.nameKey ? data.localization[locale][dice.nameKey] ?? diceId : diceId;
}

function effectiveRanks(state: PlannerStateV3) {
  return Object.fromEntries([...new Set([...Object.keys(state.ownedRanks), ...Object.keys(state.simulatedRanks)])].map((nodeId) => [nodeId, Math.max(state.ownedRanks[nodeId] ?? 0, state.simulatedRanks[nodeId] ?? 0)]));
}

function measuredDps(data: CanonicalGameData, input: SimulationInputV3) {
  try {
    const result = simulateDiceWithTreeV3(input, data);
    return { value: result.practicalDps ?? result.projectedBasicAttackDps ?? result.basicAttackDps ?? null, verified: result.practicalDps !== null };
  } catch { return { value: null, verified: false }; }
}

export function SharedBuildView({ data, locale, result, myState, myDeckIds, myInput, friendInput, onCopyBuild, onOpenSimulator }: {
  data: CanonicalGameData;
  locale: "ko" | "en";
  result: SharedResultV47;
  myState: PlannerStateV3;
  myDeckIds: string[];
  myInput: SimulationInputV3;
  friendInput: SimulationInputV3;
  onCopyBuild: () => void;
  onOpenSimulator: () => void;
}) {
  const analysis = analyzeDeckCompositionV4(data, result.deckIds);
  const myAnalysis = analyzeDeckCompositionV4(data, myDeckIds);
  const spent = simulatedInvestmentCost(data.tree, result.state);
  const resources = projectResources(result.state.inventory, spent);
  const categories = Object.keys(CATEGORIES) as DeckScoreCategoryV4[];
  const targetRanks = effectiveRanks(result.state);
  const mine = effectiveRanks(myState);
  const catchUp = data.tree.reduce((summary, node) => {
    const from = mine[node.id] ?? 0;
    const to = targetRanks[node.id] ?? 0;
    if (to <= from) return summary;
    return { cost: addTreeCosts(summary.cost, treeCostForRange(node, from, to)), ranks: summary.ranks + (to - from) };
  }, { cost: { ...ZERO_TREE_COST }, ranks: 0 });
  const myDps = measuredDps(data, myInput);
  const friendDps = measuredDps(data, friendInput);
  const dpsDelta = myDps.value !== null && friendDps.value !== null ? ((friendDps.value - myDps.value) / Math.max(Number.EPSILON, myDps.value)) * 100 : null;
  return <main className="v47-shared-build" data-testid="v47-shared-build">
    <header><span>RANDOM DICE 2</span><button type="button" onClick={onCopyBuild}>{locale === "ko" ? "플래너로 돌아가기" : "Back to planner"}</button></header>
    <section className="v47-share-hero">
      <small>{locale === "ko" ? "공유된 빌드 결과" : "SHARED BUILD RESULT"}</small><h1>{result.title || (locale === "ko" ? "이름 없는 덱" : "Untitled deck")}</h1>
      <p>{result.note || (locale === "ko" ? "작성자 메모가 없습니다." : "No author note.")}</p><b>{result.author || (locale === "ko" ? "제작자 모님" : "Created by Monim")}</b>
    </section>
    <section className="v47-share-deck"><div>{result.deckIds.map((diceId) => <article key={diceId}><DiceIcon diceId={diceId} label={nameOf(data, diceId, locale)} /><strong>{nameOf(data, diceId, locale)}</strong></article>)}</div><aside><span>{locale === "ko" ? "덱 종합" : "Overall"}</span><strong>{analysis.scores.overall}</strong><small>/100</small></aside></section>
    <section className="v47-share-grid">
      <article><h2>{locale === "ko" ? "능력 요약" : "Performance summary"}</h2>{categories.map((key) => <div key={key}><span>{CATEGORIES[key][locale]}</span><i><b style={{ width: `${analysis.scores[key]}%` }} /></i><strong>{analysis.scores[key]}</strong></div>)}</article>
      <article><h2>{locale === "ko" ? "트리와 재화" : "Tree and resources"}</h2><dl><div><dt>{locale === "ko" ? "계획 노드" : "Planned nodes"}</dt><dd>{Object.keys(result.state.simulatedRanks).length}</dd></div><div><dt>{locale === "ko" ? "총 투자비" : "Total investment"}</dt><dd>{spent.gold.toLocaleString()} G · {spent.stone.toLocaleString()} C</dd></div><div><dt>{locale === "ko" ? "남은 재화" : "Remaining"}</dt><dd>{resources.remaining.gold.toLocaleString()} G · {resources.remaining.stone.toLocaleString()} C</dd></div></dl><p>{analysis.insights[0]?.[locale]}</p></article>
    </section>
    <section className="v52-friend-comparison" data-testid="v52-friend-comparison"><header><small>BUILD VS BUILD</small><h2>{locale === "ko" ? "내 빌드와 비교" : "Compare with my build"}</h2></header><div><article><span>{locale === "ko" ? "나" : "Mine"}</span><strong>{myDps.value === null ? "DPS —" : `${myDps.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} DPS`}</strong><small>{locale === "ko" ? `덱 점수 ${myAnalysis.scores.overall}` : `Deck score ${myAnalysis.scores.overall}`}</small></article><article><span>{locale === "ko" ? "친구" : "Friend"}</span><strong>{friendDps.value === null ? "DPS —" : `${friendDps.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} DPS`}</strong><small>{locale === "ko" ? `덱 점수 ${analysis.scores.overall}` : `Deck score ${analysis.scores.overall}`}</small></article><article><span>{locale === "ko" ? "차이" : "Difference"}</span><strong>{dpsDelta === null ? "—" : `${dpsDelta >= 0 ? "+" : ""}${dpsDelta.toFixed(1)}%`}</strong><small>{myDps.verified && friendDps.verified ? (locale === "ko" ? "검증 계산" : "Verified") : (locale === "ko" ? "부분 검증" : "Partial")}</small></article></div><p>{locale === "ko" ? `친구의 트리 랭크를 따라잡는 추가 비용: ${catchUp.cost.gold.toLocaleString()} G · ${catchUp.cost.stone.toLocaleString()} C (${catchUp.ranks}랭크). 덱·룬·레벨 차이는 이 비용에 포함하지 않습니다.` : `Additional cost to match the friend's tree ranks: ${catchUp.cost.gold.toLocaleString()} G · ${catchUp.cost.stone.toLocaleString()} C (${catchUp.ranks} ranks). Deck, rune, and level differences are excluded.`}</p></section>
    <footer><button type="button" onClick={onCopyBuild}>{locale === "ko" ? "이 빌드 복사" : "Copy this build"}</button><button type="button" onClick={onOpenSimulator}>{locale === "ko" ? "시뮬레이터에서 열기" : "Open in simulator"}</button></footer>
  </main>;
}
