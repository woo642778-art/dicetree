import { useState } from "react";
import { buildRivalSequenceV49, type RivalSequenceV49 } from "../../../deck-lab/rivalBuilderV49";
import type { CanonicalGameData } from "../../../game-data/types";
import { DiceIcon } from "../shared/DiceIcon";
import { playableDiceV3 } from "../../../game-data/playableDice";

function diceName(data: CanonicalGameData, diceId: string, locale: "ko" | "en") {
  const dice = data.dice.find((entry) => entry.id === diceId);
  return dice?.nameKey ? data.localization[locale][dice.nameKey] ?? diceId : diceId;
}

const STAGES = {
  original: { ko: "내 원본 덱", en: "My original" },
  counter: { ko: "라이벌의 1차 대응", en: "Rival counter" },
  revision: { ko: "내 덱 자동 수정", en: "My revision" },
  recounter: { ko: "라이벌의 재대응", en: "Rival recounter" },
} as const;

export function RivalBuilderV49({ data, locale, diceIds, onApplyRevision }: {
  data: CanonicalGameData;
  locale: "ko" | "en";
  diceIds: string[];
  onApplyRevision: (diceIds: string[]) => void;
}) {
  const [sequence, setSequence] = useState<RivalSequenceV49>();
  const playable = new Set(playableDiceV3(data).map((dice) => dice.id));
  const valid = diceIds.length === 5 && new Set(diceIds).size === 5 && diceIds.every((diceId) => playable.has(diceId));
  const revision = sequence?.turns.find((turn) => turn.stage === "revision");

  return <section className="v49-rival-builder" data-testid="v49-rival-builder">
    <header>
      <div><small>DETERMINISTIC COUNTER LOOP · V4.9</small><h2>{locale === "ko" ? "가상 라이벌 빌더" : "Virtual Rival Builder"}</h2></div>
      <button type="button" disabled={!valid} onClick={() => setSequence(buildRivalSequenceV49(data, diceIds))}>{locale === "ko" ? "라이벌 생성" : "Build rival"}</button>
    </header>
    <p>{locale === "ko" ? "현재 5주사위를 기준으로 대응 덱을 만들고, 내 수정안과 재대응까지 네 단계로 반복합니다." : "Builds a counter to your five dice, revises your build, and counters it again in four deterministic steps."}</p>
    {!valid && <p className="v49-inline-warning">{locale === "ko" ? "서로 다른 플레이 가능 주사위 5개를 먼저 선택하세요." : "Select five distinct playable dice first."}</p>}
    {sequence && <>
      <div className="v49-rival-trace">
        {sequence.turns.map((turn, index) => <article key={turn.stage} className={`is-${turn.actor}`}>
          <header><b>{index + 1}</b><span>{STAGES[turn.stage][locale]}</span><strong>{turn.score.toFixed(1)}</strong></header>
          <div className="v49-rival-dice">{turn.diceIds.map((diceId) => <DiceIcon key={diceId} diceId={diceId} label={diceName(data, diceId, locale)} />)}</div>
          <dl><div><dt>{locale === "ko" ? "구성" : "Build"}</dt><dd>{turn.baseScore}</dd></div><div><dt>{locale === "ko" ? "대응" : "Matchup"}</dt><dd>{turn.matchupScore}</dd></div></dl>
          <p>{turn.reasons.map((reason) => reason[locale]).join(" ")}</p>
          {turn.changes.length > 0 && <small>{turn.changes.map((change) => `${diceName(data, change.fromDiceId, locale)} → ${diceName(data, change.toDiceId, locale)}`).join(" · ")}</small>}
        </article>)}
      </div>
      <footer><p>{sequence.disclosure[locale]}</p>{revision && <button type="button" onClick={() => onApplyRevision(revision.diceIds)}>{locale === "ko" ? "자동 수정안을 내 덱에 적용" : "Apply the revision"}</button>}</footer>
    </>}
  </section>;
}
