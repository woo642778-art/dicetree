import type { CanonicalGameData } from "../../../game-data/types";
import type { SimulationInputV3 } from "../../../simulation/engine/types";
import { runScenarioV3 } from "../../../simulation/scenario/runScenario";

export interface CompareViewProps {
  data: CanonicalGameData;
  locale: "ko" | "en";
  left: SimulationInputV3;
  right: SimulationInputV3;
}

function number(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function diceName(data: CanonicalGameData, diceId: string, locale: "ko" | "en") {
  const dice = data.dice.find((candidate) => candidate.id === diceId);
  const key = dice?.nameKey;
  return key ? data.localization[locale][key] ?? data.localization.ko[key] ?? diceId : diceId;
}

export function CompareView({ data, locale, left, right }: CompareViewProps) {
  const leftResult = runScenarioV3(left, data);
  const rightResult = runScenarioV3(right, data);
  const exact = leftResult.simulation.practicalDps !== null
    && rightResult.simulation.practicalDps !== null
    && leftResult.simulation.confidence === "verified"
    && rightResult.simulation.confidence === "verified";
  const delta = exact ? rightResult.simulation.practicalDps! - leftResult.simulation.practicalDps! : null;
  const percent = exact && leftResult.simulation.practicalDps! !== 0
    ? delta! / leftResult.simulation.practicalDps! * 100
    : null;
  const winner = exact
    ? delta === 0 ? "tie" : delta! > 0 ? "right" : "left"
    : "partial";

  return <main className="v3-compare-view" data-testid="v3-compare-view">
    <header>
      <small>{locale === "ko" ? "동일 엔진 비교" : "Shared-engine comparison"}</small>
      <h1>{locale === "ko" ? "주사위 · 트리 비교" : "Dice · Tree Compare"}</h1>
      <p>{locale === "ko" ? "두 설정은 동일한 계산 엔진을 사용합니다." : "Both configurations use the same calculation engine."}</p>
    </header>
    <div className="v3-compare-grid">
      <section data-testid="compare-left" className={winner === "left" ? "is-winner" : ""}>
        <span>A</span><h2>{diceName(data, left.diceId, locale)}</h2>
        <dl>
          <div><dt>{locale === "ko" ? "실전 DPS" : "Practical DPS"}</dt><dd>{number(leftResult.simulation.practicalDps)}</dd></div>
          <div><dt>{locale === "ko" ? "기본 공격 DPS" : "Basic DPS"}</dt><dd>{number(leftResult.simulation.basicAttackDps)}</dd></div>
          <div><dt>{locale === "ko" ? "공격력" : "Attack"}</dt><dd>{number(leftResult.simulation.stats.attack)}</dd></div>
          <div><dt>{locale === "ko" ? "공격 간격" : "Attack interval"}</dt><dd>{number(leftResult.simulation.stats.attackInterval)}</dd></div>
        </dl>
      </section>
      <section className={`v3-compare-delta is-${winner}`} data-testid="compare-delta">
        <span>{locale === "ko" ? "차이" : "Delta"}</span>
        <strong>{delta === null ? "—" : `${delta >= 0 ? "+" : ""}${number(delta)}`}</strong>
        <em>{percent === null ? (locale === "ko" ? "부분 계산" : "Partial") : `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`}</em>
        {winner === "partial" && <p>{locale === "ko" ? "어느 한쪽이라도 공식이 부분 검증이면 정확한 승자를 표시하지 않습니다." : "No exact winner is shown when either side is partial."}</p>}
      </section>
      <section data-testid="compare-right" className={winner === "right" ? "is-winner" : ""}>
        <span>B</span><h2>{diceName(data, right.diceId, locale)}</h2>
        <dl>
          <div><dt>{locale === "ko" ? "실전 DPS" : "Practical DPS"}</dt><dd>{number(rightResult.simulation.practicalDps)}</dd></div>
          <div><dt>{locale === "ko" ? "기본 공격 DPS" : "Basic DPS"}</dt><dd>{number(rightResult.simulation.basicAttackDps)}</dd></div>
          <div><dt>{locale === "ko" ? "공격력" : "Attack"}</dt><dd>{number(rightResult.simulation.stats.attack)}</dd></div>
          <div><dt>{locale === "ko" ? "공격 간격" : "Attack interval"}</dt><dd>{number(rightResult.simulation.stats.attackInterval)}</dd></div>
        </dl>
      </section>
    </div>
  </main>;
}
