import { useMemo, useState } from "react";
import { analyzeDeckCompositionV4, replacementCandidatesV4, type DeckScoreCategoryV4 } from "../../../deck-lab/analyzeDeck";
import { playableDiceV3 } from "../../../game-data/playableDice";
import type { CanonicalGameData } from "../../../game-data/types";
import { DiceIcon } from "../shared/DiceIcon";

const SCORE_LABELS: Record<DeckScoreCategoryV4, { ko: string; en: string }> = {
  damage: { ko: "딜링", en: "Damage" }, growth: { ko: "성장", en: "Growth" }, economy: { ko: "경제", en: "Economy" },
  control: { ko: "CC", en: "CC" }, buff: { ko: "버프", en: "Buff" }, boss: { ko: "보스 대응", en: "Boss" }, stability: { ko: "안정성", en: "Stability" },
};

function nameOf(data: CanonicalGameData, diceId: string, locale: "ko" | "en") {
  const dice = data.dice.find((entry) => entry.id === diceId);
  return dice?.nameKey ? data.localization[locale][dice.nameKey] ?? diceId : diceId;
}

export function MyDeckAnalyzer({ data, locale, diceIds, onChange, onSimulate }: {
  data: CanonicalGameData;
  locale: "ko" | "en";
  diceIds: string[];
  onChange: (diceIds: string[]) => void;
  onSimulate: (diceId: string) => void;
}) {
  const [replacementSlot, setReplacementSlot] = useState<number>();
  const analysis = useMemo(() => analyzeDeckCompositionV4(data, diceIds), [data, diceIds]);
  const replacements = useMemo(() => replacementSlot === undefined ? [] : replacementCandidatesV4(data, diceIds, replacementSlot), [data, diceIds, replacementSlot]);
  const playable = playableDiceV3(data);
  const categories = Object.keys(SCORE_LABELS) as DeckScoreCategoryV4[];
  const primary = [...diceIds].sort((left, right) => {
    const l = data.dice.find((dice) => dice.id === left);
    const r = data.dice.find((dice) => dice.id === right);
    const dps = (dice: typeof l) => dice?.baseStats.attack && dice.baseStats.attackInterval ? dice.baseStats.attack / dice.baseStats.attackInterval : 0;
    return dps(r) - dps(l);
  })[0];

  return <section className="v47-my-deck" data-testid="v47-my-deck-analyzer">
    <header>
      <div><small>{locale === "ko" ? "1순위 · 직접 구성 분석" : "PRIORITY 1 · MANUAL DECK ANALYSIS"}</small><h2>{locale === "ko" ? "내 덱 분석기" : "My Deck Analyzer"}</h2><p>{locale === "ko" ? "5칸을 직접 채우면 역할 중복, 전개 공백, 시너지와 교체 전후 점수를 계산합니다." : "Fill all five slots to measure role overlap, setup gaps, synergies, and replacement deltas."}</p></div>
      <div className="v47-overall"><span>{locale === "ko" ? "종합" : "Overall"}</span><strong>{analysis.scores.overall}</strong><em>/100</em></div>
    </header>
    <div className="v47-deck-slots">
      {diceIds.map((diceId, slot) => <article key={slot} className={replacementSlot === slot ? "is-open" : ""}>
        <span>{slot + 1}</span><DiceIcon diceId={diceId} label={nameOf(data, diceId, locale)} />
        <select aria-label={`${locale === "ko" ? "덱 슬롯" : "Deck slot"} ${slot + 1}`} value={diceId} onChange={(event) => {
          const next = [...diceIds]; next[slot] = event.target.value; onChange(next); setReplacementSlot(undefined);
        }}>{playable.map((dice) => <option key={dice.id} value={dice.id} disabled={dice.id !== diceId && diceIds.includes(dice.id)}>{nameOf(data, dice.id, locale)}</option>)}</select>
        <button type="button" onClick={() => setReplacementSlot(replacementSlot === slot ? undefined : slot)}>{locale === "ko" ? "무엇으로 교체?" : "Replace with?"}</button>
      </article>)}
    </div>
    {replacementSlot !== undefined && <div className="v47-replacements" data-testid="v47-replacements">
      <header><strong>{locale === "ko" ? `${replacementSlot + 1}번 슬롯 교체 후보` : `Slot ${replacementSlot + 1} replacements`}</strong><small>{locale === "ko" ? "종합 점수 개선 순" : "Ranked by overall gain"}</small></header>
      {replacements.map((entry) => <button key={entry.toDiceId} type="button" onClick={() => { const next = [...diceIds]; next[replacementSlot] = entry.toDiceId; onChange(next); setReplacementSlot(undefined); }}>
        <DiceIcon diceId={entry.toDiceId} label={nameOf(data, entry.toDiceId, locale)} />
        <span><strong>{nameOf(data, entry.toDiceId, locale)}</strong><small>{entry.reason[locale]}</small></span>
        <em>{entry.before} → {entry.after}</em><b className={entry.delta >= 0 ? "is-up" : "is-down"}>{entry.delta >= 0 ? "+" : ""}{entry.delta}</b>
      </button>)}
    </div>}
    <div className="v47-analysis-grid">
      <div className="v47-score-board">
        {categories.map((key) => <div key={key}><span>{SCORE_LABELS[key][locale]}</span><div><i style={{ width: `${analysis.scores[key]}%` }} /></div><strong>{analysis.scores[key]}</strong></div>)}
      </div>
      <div className="v47-insights"><header><strong>{locale === "ko" ? "진단" : "Diagnosis"}</strong><span className={`is-${analysis.confidence}`}>{analysis.confidence === "verified" ? (locale === "ko" ? "확정 기본식" : "Verified basics") : (locale === "ko" ? "부분 검증" : "Partially verified")}</span></header>{analysis.insights.map((insight, index) => <p key={index} className={`is-${insight.kind}`}><b>{insight.kind === "warning" ? (locale === "ko" ? "보완" : "Fix") : insight.kind === "synergy" ? (locale === "ko" ? "시너지" : "Synergy") : (locale === "ko" ? "강점" : "Strength")}</b>{insight[locale]}</p>)}</div>
    </div>
    <footer><button type="button" onClick={() => onSimulate(primary)}>{locale === "ko" ? "주 딜러 시뮬레이터에서 열기" : "Open primary in simulator"}</button><p>{locale === "ko" ? "점수는 상대 비교용 지표입니다. 미확인 특수 공식은 고정된 사실처럼 합산하지 않습니다." : "Scores are comparative indicators. Unresolved special formulas are not treated as verified facts."}</p></footer>
  </section>;
}
