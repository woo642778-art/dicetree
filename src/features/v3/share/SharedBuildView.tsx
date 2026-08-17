import { analyzeDeckCompositionV4, type DeckScoreCategoryV4 } from "../../../deck-lab/analyzeDeck";
import type { CanonicalGameData } from "../../../game-data/types";
import { projectResources, simulatedInvestmentCost } from "../../../planner-v3/costs";
import type { SharedResultV47 } from "../../../share/resultCodecV47";
import { DiceIcon } from "../shared/DiceIcon";

const CATEGORIES: Record<DeckScoreCategoryV4, { ko: string; en: string }> = {
  damage: { ko: "딜링", en: "Damage" }, growth: { ko: "성장", en: "Growth" }, economy: { ko: "경제", en: "Economy" },
  control: { ko: "CC", en: "CC" }, buff: { ko: "버프", en: "Buff" }, boss: { ko: "보스", en: "Boss" }, stability: { ko: "안정성", en: "Stability" },
};

function nameOf(data: CanonicalGameData, diceId: string, locale: "ko" | "en") {
  const dice = data.dice.find((entry) => entry.id === diceId);
  return dice?.nameKey ? data.localization[locale][dice.nameKey] ?? diceId : diceId;
}

export function SharedBuildView({ data, locale, result, onCopyBuild, onOpenSimulator }: {
  data: CanonicalGameData;
  locale: "ko" | "en";
  result: SharedResultV47;
  onCopyBuild: () => void;
  onOpenSimulator: () => void;
}) {
  const analysis = analyzeDeckCompositionV4(data, result.deckIds);
  const spent = simulatedInvestmentCost(data.tree, result.state);
  const resources = projectResources(result.state.inventory, spent);
  const categories = Object.keys(CATEGORIES) as DeckScoreCategoryV4[];
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
    <footer><button type="button" onClick={onCopyBuild}>{locale === "ko" ? "이 빌드 복사" : "Copy this build"}</button><button type="button" onClick={onOpenSimulator}>{locale === "ko" ? "시뮬레이터에서 열기" : "Open in simulator"}</button></footer>
  </main>;
}
