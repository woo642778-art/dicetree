import type { CanonicalGameData } from "../../../game-data/types";
import { formatGameText } from "../../../game-data/formatGameText";
import { recommendDeckV4, type DeckGoalV4, type DeckRoleV4, type SpendProfileV4 } from "../../../deck-lab/recommendDeck";

export interface DeckLabViewProps {
  data: CanonicalGameData;
  locale: "ko" | "en";
  goal: DeckGoalV4;
  spendProfile: SpendProfileV4;
  onGoalChange: (goal: DeckGoalV4) => void;
  onSpendProfileChange: (profile: SpendProfileV4) => void;
  onSimulate: (diceId: string) => void;
}

const ROLE_LABELS: Record<DeckRoleV4, { ko: string; en: string }> = {
  dealer: { ko: "딜러", en: "Dealer" },
  control: { ko: "제어", en: "Control" },
  economy: { ko: "재화·전개", en: "Economy" },
  utility: { ko: "유틸", en: "Utility" },
};

function localize(data: CanonicalGameData, key: string | undefined, locale: "ko" | "en", fallback: string) {
  return key ? data.localization[locale][key] ?? fallback : fallback;
}

export function DeckLabView(props: DeckLabViewProps) {
  const { data, locale, goal, spendProfile } = props;
  const recommendation = recommendDeckV4(data, goal, spendProfile);
  const byId = new Map(data.dice.map((dice) => [dice.id, dice]));

  return <main className="v4-deck-lab" data-testid="v4-deck-lab">
    <header className="v4-deck-hero">
      <div>
        <small>{locale === "ko" ? "IPA 1.0.1 근거 기반" : "IPA 1.0.1 evidence based"}</small>
        <h1>{locale === "ko" ? "덱 연구소" : "Deck Lab"}</h1>
        <p>{locale === "ko" ? "클라이언트 설명과 기본 스탯으로 역할을 분류해 5주사위 조합을 제안합니다." : "Builds five-dice compositions from client descriptions and base stats."}</p>
      </div>
      <aside className="v4-meta-status" data-testid="v4-meta-status">
        <strong>{locale === "ko" ? "라이브 메타 미검증" : "Live meta unverified"}</strong>
        <p>{locale === "ko" ? "첨부 IPA에는 랭킹·사용률 데이터가 없습니다. 아래 결과를 현재 유행 덱이나 랭킹 덱으로 표시하지 않습니다." : "The attached IPA contains no ranking or usage-rate data. These results are not labeled as current meta or ranked decks."}</p>
        <code>{data.manifest.clientVersion} · {data.manifest.sourceSha256.slice(0, 12)}</code>
      </aside>
    </header>

    <section className="v4-deck-controls" aria-label={locale === "ko" ? "덱 추천 조건" : "Deck recommendation settings"}>
      <label>{locale === "ko" ? "플레이 역할" : "Play role"}
        <select aria-label={locale === "ko" ? "플레이 역할" : "Play role"} value={goal} onChange={(event) => props.onGoalChange(event.target.value as DeckGoalV4)}>
          <option value="dealer">{locale === "ko" ? "딜러 중심" : "Dealer focus"}</option>
          <option value="support">{locale === "ko" ? "서포트 중심" : "Support focus"}</option>
          <option value="balanced">{locale === "ko" ? "균형 조합" : "Balanced"}</option>
        </select>
      </label>
      <label>{locale === "ko" ? "투자 성향" : "Investment profile"}
        <select aria-label={locale === "ko" ? "투자 성향" : "Investment profile"} value={spendProfile} onChange={(event) => props.onSpendProfileChange(event.target.value as SpendProfileV4)}>
          <option value="free">{locale === "ko" ? "무과금형 · 단순·검증 우선" : "Free · simple and verified"}</option>
          <option value="light">{locale === "ko" ? "소과금형 · 균형" : "Light · balanced"}</option>
          <option value="invested">{locale === "ko" ? "고투자형 · 고점·기믹" : "Invested · ceiling and mechanics"}</option>
        </select>
      </label>
      <p>{locale === "ko" ? "투자 성향은 실제 결제 효율이나 보유 여부가 아니라, 단순성과 기믹 의존도를 조절하는 추천 프리셋입니다." : "Investment profile adjusts simplicity and mechanic dependence. It does not assert payment efficiency or ownership."}</p>
    </section>

    <section className="v4-deck-result">
      <div className="v4-deck-title">
        <div><small>{locale === "ko" ? "클라이언트 시너지 추천" : "Client-synergy recommendation"}</small><h2>{locale === "ko" ? "추천 5주사위" : "Recommended five dice"}</h2></div>
        <button type="button" onClick={() => props.onSimulate(recommendation.primaryDiceId)}>{locale === "ko" ? "주 딜러 시뮬레이션" : "Simulate primary dealer"}</button>
      </div>
      <div className="v4-deck-grid">
        {recommendation.dice.map((entry, index) => {
          const dice = byId.get(entry.diceId)!;
          const name = localize(data, dice.nameKey, locale, dice.id);
          return <article key={entry.diceId} className={`family-${dice.family ?? "order"}`} data-testid={`deck-slot-${index + 1}`}>
            <span className="v4-deck-slot">{index + 1}</span>
            <div className="v4-deck-token">{name.slice(0, 1)}</div>
            <div className="v4-deck-card-copy">
              <h3>{name}{entry.diceId === recommendation.primaryDiceId ? <b>{locale === "ko" ? "주 딜러" : "Primary"}</b> : null}</h3>
              <div>{entry.roles.map((role) => <span key={role}>{ROLE_LABELS[role][locale]}</span>)}</div>
              <p>{formatGameText(entry.evidence, locale)}</p>
              <small>{entry.basicDps === null
                ? (locale === "ko" ? "기본 DPS 근거 없음" : "No basic-DPS evidence")
                : `${locale === "ko" ? "특수효과 제외 기본 DPS" : "Basic DPS excluding effects"} ${entry.basicDps.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</small>
            </div>
          </article>;
        })}
      </div>
      <footer>{locale === "ko" ? "역할 태그와 DPS는 IPA 표·설명에서 계산하거나 추론했습니다. 전투 기믹 공식이 미복원된 경우 기본 공격만 표시합니다." : "Role tags and DPS are calculated or inferred from IPA tables and descriptions. Unresolved combat mechanics are excluded."}</footer>
    </section>
  </main>;
}
