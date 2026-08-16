import type { DamageOutcomeV3 } from "../../../simulation/probability/outcomes";

export interface DamageGraphProps {
  outcome: DamageOutcomeV3 | null;
  basicAttackOutcome?: DamageOutcomeV3 | null;
  basicAttackOutcomeKind?: "verified" | "projected" | "tree-excluded-verified" | "tree-excluded-projected" | null;
  locale: "ko" | "en";
}

function num(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function DamageGraph({ outcome, basicAttackOutcome, basicAttackOutcomeKind, locale }: DamageGraphProps) {
  const displayed = outcome ?? basicAttackOutcome;
  const baseline = !outcome && Boolean(basicAttackOutcome);
  if (!displayed) return <section className="v3-damage-graph is-partial" data-testid="v3-damage-graph">
    <h3>{locale === "ko" ? "실전 피해" : "Practical damage"}</h3>
    <p>{locale === "ko" ? "실전 DPS 공식이 부분 검증 상태라 누적 피해와 처치시간을 확정하지 않습니다." : "Practical DPS is partial, so cumulative damage and kill time are not asserted."}</p>
  </section>;

  const points = [{ seconds: 0, average: 0 }, ...displayed.checkpoints];
  const maxSeconds = Math.max(...points.map((point) => point.seconds), 1);
  const maxDamage = Math.max(...points.map((point) => point.average), 1);
  const path = points.map((point, index) => {
    const x = 20 + (point.seconds / maxSeconds) * 360;
    const y = 150 - (point.average / maxDamage) * 120;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  return <section className={`v3-damage-graph ${baseline ? "is-baseline" : ""}`} data-testid="v3-damage-graph" data-outcome-kind={baseline ? basicAttackOutcomeKind : "practical"}>
    <h3>{baseline
      ? (locale === "ko" ? "특수효과 제외 기본 공격 피해" : "Basic attack damage excluding special effects")
      : (locale === "ko" ? "실전 피해" : "Practical damage")}</h3>
    {baseline && <p>{basicAttackOutcomeKind === "tree-excluded-projected"
      ? (locale === "ko" ? "현재 트리 효과를 제외하고 레벨 및 전투 강화 성장치를 적용한 기준선입니다. 특수효과도 포함하지 않습니다." : "A projected level and battle-upgrade baseline excluding current tree and special effects.")
      : basicAttackOutcomeKind === "tree-excluded-verified"
        ? (locale === "ko" ? "현재 트리 효과와 미복원 특수효과를 제외한 검증 기본 공격 기준선입니다." : "A verified basic-attack baseline excluding current tree and unresolved special effects.")
        : basicAttackOutcomeKind === "projected"
          ? (locale === "ko" ? "레벨 및 전투 강화 성장치를 적용한 예상값이며, 특수효과는 포함하지 않습니다." : "Projected from level and battle-upgrade growth; special effects are excluded.")
          : (locale === "ko" ? "검증된 기본 공격만 계산했습니다. 미복원 특수효과는 포함하지 않습니다." : "Uses verified basic attacks only; unresolved special effects are excluded.")}</p>}
    <svg viewBox="0 0 400 170" role="img" aria-label={locale === "ko" ? "시간별 누적 피해 그래프" : "Cumulative damage over time graph"}>
      <line x1="20" y1="150" x2="380" y2="150" className="v3-graph-axis" />
      <path d={path} className="v3-graph-line" />
      {points.slice(1).map((point) => {
        const x = 20 + (point.seconds / maxSeconds) * 360;
        const y = 150 - (point.average / maxDamage) * 120;
        return <g key={point.seconds} transform={`translate(${x} ${y})`}><circle r="5" /><text y="-10" textAnchor="middle">{point.seconds}s</text></g>;
      })}
    </svg>
    <div className="v3-damage-checkpoints">
      {displayed.checkpoints.map((point) => <div key={point.seconds} data-testid={`damage-${point.seconds}s`}><span>{point.seconds}s</span><strong>{num(point.average)}</strong></div>)}
      <div data-testid="damage-kill-time"><span>{locale === "ko" ? "예상 처치" : "Kill time"}</span><strong>{displayed.killTimeSeconds ? `${num(displayed.killTimeSeconds.average)}s` : "—"}</strong></div>
    </div>
  </section>;
}
