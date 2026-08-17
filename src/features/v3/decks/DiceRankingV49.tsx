import { useMemo, useState } from "react";
import { rankDiceV49, type DiceRankingRoleV49 } from "../../../deck-lab/diceRankingV49";
import type { CanonicalGameData } from "../../../game-data/types";
import { DiceIcon } from "../shared/DiceIcon";

const FILTERS: Array<{ id: DiceRankingRoleV49; ko: string; en: string }> = [
  { id: "all", ko: "전체", en: "All" }, { id: "dealer", ko: "딜러", en: "Dealer" },
  { id: "support", ko: "서포트", en: "Support" }, { id: "control", ko: "제어", en: "Control" },
  { id: "economy", ko: "경제", en: "Economy" },
];

export function DiceRankingV49({ data, locale, onSelectDice }: { data: CanonicalGameData; locale: "ko" | "en"; onSelectDice: (diceId: string) => void }) {
  const [role, setRole] = useState<DiceRankingRoleV49>("all");
  const [query, setQuery] = useState("");
  const ranking = useMemo(() => rankDiceV49(data, { role, query, locale }), [data, locale, query, role]);
  return <section className="v49-dice-ranking" data-testid="v49-dice-ranking">
    <header><div><small>ROLE RANKING · V4.9</small><h2>{locale === "ko" ? "주사위 역할 랭킹" : "Dice role ranking"}</h2><p>{locale === "ko" ? "관측 덱 사용률과 클라이언트 기본 능력치를 함께 반영한 설명 가능한 지표입니다." : "An explainable index blending observed deck usage with client base stats."}</p></div><span><strong>{ranking.length}</strong>{locale === "ko" ? "종" : " dice"}</span></header>
    <div className="v49-ranking-controls">
      <div>{FILTERS.map((filter) => <button key={filter.id} type="button" className={role === filter.id ? "is-active" : ""} onClick={() => setRole(filter.id)}>{filter[locale]}</button>)}</div>
      <input aria-label={locale === "ko" ? "주사위 랭킹 검색" : "Search dice ranking"} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={locale === "ko" ? "이름·효과 검색" : "Search name or effect"} />
    </div>
    <div className="v49-ranking-list">{ranking.map((entry) => <button type="button" key={entry.diceId} onClick={() => onSelectDice(entry.diceId)}>
      <strong>#{entry.rank}</strong><DiceIcon diceId={entry.diceId} label={entry.name[locale]} /><span><b>{entry.name[locale]}</b><small>{entry.roles.join(" · ")}</small><p>{entry.reason[locale]}</p></span><em>{entry.score}</em>
    </button>)}</div>
    <footer>{locale === "ko" ? "실시간 승률이나 공식 티어가 아닙니다. 특수효과 공식이 미확정이면 기본 DPS를 점수에 넣지 않습니다." : "This is not a live win-rate or official tier list. Unresolved effect formulas are excluded from the base-DPS component."}</footer>
  </section>;
}
