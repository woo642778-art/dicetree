import type { CanonicalGameData } from "../../../game-data/types";
import type { SimulationInputV3 } from "../../../simulation/engine/types";
import { runScenarioV3 } from "../../../simulation/scenario/runScenario";
import { CalculationDetails } from "../tree/CalculationDetails";

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

function checkpointMap(result: ReturnType<typeof runScenarioV3>) {
  return new Map((result.outcome?.checkpoints ?? []).map((point) => [point.seconds, point.average]));
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
  const leftCheckpoints = checkpointMap(leftResult);
  const rightCheckpoints = checkpointMap(rightResult);
  const checkpointDeltas = [5, 10, 30].map((seconds) => {
    const leftDamage = leftCheckpoints.get(seconds);
    const rightDamage = rightCheckpoints.get(seconds);
    return { seconds, delta: exact && leftDamage !== undefined && rightDamage !== undefined ? rightDamage - leftDamage : null };
  });
  const leftKill = leftResult.outcome?.killTimeSeconds?.average;
  const rightKill = rightResult.outcome?.killTimeSeconds?.average;
  const killDelta = exact && leftKill !== undefined && rightKill !== undefined && Number.isFinite(leftKill) && Number.isFinite(rightKill)
    ? rightKill - leftKill
    : null;

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
          <div><dt>5s</dt><dd>{number(leftCheckpoints.get(5))}</dd></div>
          <div><dt>10s</dt><dd>{number(leftCheckpoints.get(10))}</dd></div>
          <div><dt>30s</dt><dd>{number(leftCheckpoints.get(30))}</dd></div>
          <div><dt>{locale === "ko" ? "처치시간" : "Kill time"}</dt><dd>{leftKill === undefined ? "—" : `${number(leftKill)}s`}</dd></div>
        </dl>
        <CalculationDetails trace={leftResult.simulation.trace} locale={locale} />
      </section>
      <section className={`v3-compare-delta is-${winner}`} data-testid="compare-delta">
        <span>{locale === "ko" ? "DPS 차이" : "DPS delta"}</span>
        <strong>{delta === null ? "—" : `${delta >= 0 ? "+" : ""}${number(delta)}`}</strong>
        <em>{percent === null ? (locale === "ko" ? "부분 계산" : "Partial") : `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`}</em>
        <dl>{checkpointDeltas.map((point) => <div key={point.seconds}><dt>{point.seconds}s</dt><dd>{point.delta === null ? "—" : `${point.delta >= 0 ? "+" : ""}${number(point.delta)}`}</dd></div>)}
          <div><dt>{locale === "ko" ? "처치시간 차이" : "Kill-time delta"}</dt><dd>{killDelta === null ? "—" : `${killDelta >= 0 ? "+" : ""}${number(killDelta)}s`}</dd></div>
        </dl>
        {winner === "partial" && <p>{locale === "ko" ? "어느 한쪽이라도 공식이 부분 검증이면 정확한 승자를 표시하지 않습니다." : "No exact winner is shown when either side is partial."}</p>}
      </section>
      <section data-testid="compare-right" className={winner === "right" ? "is-winner" : ""}>
        <span>B</span><h2>{diceName(data, right.diceId, locale)}</h2>
        <dl>
          <div><dt>{locale === "ko" ? "실전 DPS" : "Practical DPS"}</dt><dd>{number(rightResult.simulation.practicalDps)}</dd></div>
          <div><dt>{locale === "ko" ? "기본 공격 DPS" : "Basic DPS"}</dt><dd>{number(rightResult.simulation.basicAttackDps)}</dd></div>
          <div><dt>{locale === "ko" ? "공격력" : "Attack"}</dt><dd>{number(rightResult.simulation.stats.attack)}</dd></div>
          <div><dt>{locale === "ko" ? "공격 간격" : "Attack interval"}</dt><dd>{number(rightResult.simulation.stats.attackInterval)}</dd></div>
          <div><dt>5s</dt><dd>{number(rightCheckpoints.get(5))}</dd></div>
          <div><dt>10s</dt><dd>{number(rightCheckpoints.get(10))}</dd></div>
          <div><dt>30s</dt><dd>{number(rightCheckpoints.get(30))}</dd></div>
          <div><dt>{locale === "ko" ? "처치시간" : "Kill time"}</dt><dd>{rightKill === undefined ? "—" : `${number(rightKill)}s`}</dd></div>
        </dl>
        <CalculationDetails trace={rightResult.simulation.trace} locale={locale} />
      </section>
    </div>
  </main>;
}
