import type { CanonicalGameData } from "../../../game-data/types";
import type { SimulationInputV3 } from "../../../simulation/engine/types";
import { runScenarioV3 } from "../../../simulation/scenario/runScenario";
import { summarizeScenarioV3, type ScenarioMetricKindV3, type ScenarioSummaryV3 } from "../../../simulation/scenario/summarizeScenario";
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

function checkpointMap(summary: ScenarioSummaryV3) {
  return new Map((summary.outcome?.checkpoints ?? []).map((point) => [point.seconds, point.average]));
}

function metricLabel(kind: ScenarioMetricKindV3, locale: "ko" | "en") {
  if (kind === "practical") return locale === "ko" ? "실전 DPS" : "Practical DPS";
  if (kind === "verified-basic") return locale === "ko" ? "특수효과 제외 기본 DPS" : "Basic DPS excluding special effects";
  if (kind === "projected-basic") return locale === "ko" ? "특수효과 제외 예상 DPS" : "Projected DPS excluding special effects";
  if (kind.startsWith("tree-excluded")) return locale === "ko" ? "트리·특수효과 제외 예상 DPS" : "Estimated DPS excluding tree and special effects";
  return locale === "ko" ? "DPS 근거 부족" : "Insufficient DPS evidence";
}

function basicSummary(result: ReturnType<typeof runScenarioV3>, forceTreeExcluded: boolean): ScenarioSummaryV3 {
  const outcome = result.basicAttackOutcome;
  const rawKind = result.basicAttackOutcomeKind;
  if (!outcome || !rawKind) return { dps: null, metricKind: "unavailable", confidence: "unavailable", outcome: null, includesSpecialMechanic: false, includesTree: false };
  const projected = rawKind.includes("projected");
  return {
    dps: outcome.dps.average,
    metricKind: forceTreeExcluded ? (projected ? "tree-excluded-projected" : "tree-excluded-verified") : (projected ? "projected-basic" : "verified-basic"),
    confidence: projected || forceTreeExcluded ? "estimated" : "verified",
    outcome,
    includesSpecialMechanic: false,
    includesTree: !forceTreeExcluded,
  };
}

export function CompareView({ data, locale, left, right }: CompareViewProps) {
  const leftResult = runScenarioV3(left, data);
  const rightResult = runScenarioV3(right, data);
  const rawLeftSummary = summarizeScenarioV3(leftResult);
  const rawRightSummary = summarizeScenarioV3(rightResult);
  const bothPractical = rawLeftSummary.metricKind === "practical" && rawRightSummary.metricKind === "practical";
  const mustExcludeTree = !bothPractical && (
    leftResult.basicAttackOutcomeKind?.startsWith("tree-excluded")
    || rightResult.basicAttackOutcomeKind?.startsWith("tree-excluded")
  );
  const comparisonLeftResult = mustExcludeTree ? runScenarioV3({ ...left, treeRanks: {} }, data) : leftResult;
  const comparisonRightResult = mustExcludeTree ? runScenarioV3({ ...right, treeRanks: {} }, data) : rightResult;
  const leftSummary = bothPractical ? rawLeftSummary : basicSummary(comparisonLeftResult, Boolean(mustExcludeTree));
  const rightSummary = bothPractical ? rawRightSummary : basicSummary(comparisonRightResult, Boolean(mustExcludeTree));
  const leftStats = leftSummary.metricKind.includes("projected")
    ? comparisonLeftResult.simulation.projectedStats ?? comparisonLeftResult.simulation.stats
    : comparisonLeftResult.simulation.stats;
  const rightStats = rightSummary.metricKind.includes("projected")
    ? comparisonRightResult.simulation.projectedStats ?? comparisonRightResult.simulation.stats
    : comparisonRightResult.simulation.stats;
  const comparable = leftSummary.dps !== null && rightSummary.dps !== null;
  const exact = comparable
    && leftSummary.metricKind === "practical"
    && rightSummary.metricKind === "practical"
    && leftSummary.confidence === "verified"
    && rightSummary.confidence === "verified";
  const delta = comparable ? rightSummary.dps! - leftSummary.dps! : null;
  const percent = comparable && leftSummary.dps! !== 0
    ? delta! / leftSummary.dps! * 100
    : null;
  const winner = comparable
    ? delta === 0 ? "tie" : delta! > 0 ? "right" : "left"
    : "partial";
  const leftCheckpoints = checkpointMap(leftSummary);
  const rightCheckpoints = checkpointMap(rightSummary);
  const checkpointDeltas = [5, 10, 30].map((seconds) => {
    const leftDamage = leftCheckpoints.get(seconds);
    const rightDamage = rightCheckpoints.get(seconds);
    return { seconds, delta: comparable && leftDamage !== undefined && rightDamage !== undefined ? rightDamage - leftDamage : null };
  });
  const leftKill = leftSummary.outcome?.killTimeSeconds?.average;
  const rightKill = rightSummary.outcome?.killTimeSeconds?.average;
  const killDelta = comparable && leftKill !== undefined && rightKill !== undefined && Number.isFinite(leftKill) && Number.isFinite(rightKill)
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
          <div><dt>{metricLabel(leftSummary.metricKind, locale)}</dt><dd data-testid="compare-left-dps">{number(leftSummary.dps)}</dd></div>
          <div><dt>{locale === "ko" ? "검증 기본 공격 DPS" : "Verified basic DPS"}</dt><dd>{number(leftResult.simulation.basicAttackDps)}</dd></div>
          <div><dt>{locale === "ko" ? "적용 공격력" : "Applied attack"}</dt><dd>{number(leftStats.attack)}</dd></div>
          <div><dt>{locale === "ko" ? "적용 공격 간격" : "Applied attack interval"}</dt><dd>{number(leftStats.attackInterval)}</dd></div>
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
        <em data-testid="compare-confidence">{percent === null ? (locale === "ko" ? "비교 불가" : "Unavailable") : `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}% · ${exact ? (locale === "ko" ? "검증 비교" : "Verified") : (locale === "ko" ? "추정 비교" : "Estimated")}`}</em>
        <dl>{checkpointDeltas.map((point) => <div key={point.seconds}><dt>{point.seconds}s</dt><dd>{point.delta === null ? "—" : `${point.delta >= 0 ? "+" : ""}${number(point.delta)}`}</dd></div>)}
          <div><dt>{locale === "ko" ? "처치시간 차이" : "Kill-time delta"}</dt><dd>{killDelta === null ? "—" : `${killDelta >= 0 ? "+" : ""}${number(killDelta)}s`}</dd></div>
        </dl>
        {!exact && comparable && <p>{locale === "ko" ? "두 설정의 공통 계산 가능 범위만 비교했습니다. 특수효과 또는 트리 효과가 제외된 경우 결과 이름에 표시됩니다." : "Only the shared calculable scope is compared. Excluded mechanics or tree effects are stated in each metric label."}</p>}
        {!comparable && <p>{locale === "ko" ? "같은 기준으로 계산할 수 있는 DPS가 없어 승자를 표시하지 않습니다." : "No common DPS basis is available, so no winner is shown."}</p>}
      </section>
      <section data-testid="compare-right" className={winner === "right" ? "is-winner" : ""}>
        <span>B</span><h2>{diceName(data, right.diceId, locale)}</h2>
        <dl>
          <div><dt>{metricLabel(rightSummary.metricKind, locale)}</dt><dd data-testid="compare-right-dps">{number(rightSummary.dps)}</dd></div>
          <div><dt>{locale === "ko" ? "검증 기본 공격 DPS" : "Verified basic DPS"}</dt><dd>{number(rightResult.simulation.basicAttackDps)}</dd></div>
          <div><dt>{locale === "ko" ? "적용 공격력" : "Applied attack"}</dt><dd>{number(rightStats.attack)}</dd></div>
          <div><dt>{locale === "ko" ? "적용 공격 간격" : "Applied attack interval"}</dt><dd>{number(rightStats.attackInterval)}</dd></div>
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
