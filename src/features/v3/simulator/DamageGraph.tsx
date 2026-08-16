import type { DamageOutcomeV3 } from "../../../simulation/probability/outcomes";

export interface DamageGraphProps {
  outcome: DamageOutcomeV3 | null;
  locale: "ko" | "en";
}

function num(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function DamageGraph({ outcome, locale }: DamageGraphProps) {
  if (!outcome) return <section className="v3-damage-graph is-partial" data-testid="v3-damage-graph">
    <h3>{locale === "ko" ? "실전 피해" : "Practical damage"}</h3>
    <p>{locale === "ko" ? "실전 DPS 공식이 부분 검증 상태라 누적 피해와 처치시간을 확정하지 않습니다." : "Practical DPS is partial, so cumulative damage and kill time are not asserted."}</p>
  </section>;

  const points = [{ seconds: 0, average: 0 }, ...outcome.checkpoints];
  const maxSeconds = Math.max(...points.map((point) => point.seconds), 1);
  const maxDamage = Math.max(...points.map((point) => point.average), 1);
  const path = points.map((point, index) => {
    const x = 20 + (point.seconds / maxSeconds) * 360;
    const y = 150 - (point.average / maxDamage) * 120;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  return <section className="v3-damage-graph" data-testid="v3-damage-graph">
    <h3>{locale === "ko" ? "실전 피해" : "Practical damage"}</h3>
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
      {outcome.checkpoints.map((point) => <div key={point.seconds} data-testid={`damage-${point.seconds}s`}><span>{point.seconds}s</span><strong>{num(point.average)}</strong></div>)}
      <div data-testid="damage-kill-time"><span>{locale === "ko" ? "예상 처치" : "Kill time"}</span><strong>{outcome.killTimeSeconds ? `${num(outcome.killTimeSeconds.average)}s` : "—"}</strong></div>
    </div>
  </section>;
}
