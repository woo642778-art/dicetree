import type { ScenarioResultV3 } from "../../../simulation/scenario/runScenario";
import { summarizeScenarioV3 } from "../../../simulation/scenario/summarizeScenario";

export interface StatPanelProps {
  result: ScenarioResultV3;
  locale: "ko" | "en";
}

const STAT_LABELS: Record<string, { ko: string; en: string }> = {
  attack: { ko: "공격력", en: "Attack" },
  attackInterval: { ko: "공격 간격", en: "Attack interval" },
  range: { ko: "사거리", en: "Range" },
  bossMultiplier: { ko: "보스 배율", en: "Boss multiplier" },
  attackSpeedPercent: { ko: "공격속도 증가", en: "Attack speed bonus" },
  bulletDamagePercent: { ko: "불렛 대미지 증가", en: "Bullet damage bonus" },
};

function number(value: number | null | undefined, digits = 3) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function differs(left: number | undefined, right: number | undefined) {
  if (left === undefined || right === undefined) return left !== right;
  return Math.abs(left - right) > 1e-12;
}

export function StatPanel({ result, locale }: StatPanelProps) {
  const exactStats = result.simulation.stats;
  const projectedStats = result.simulation.projectedStats ?? exactStats;
  const interval = projectedStats.attackInterval;
  const attacksPerSecond = interval !== undefined && interval > 0 ? 1 / interval : undefined;
  const exactAttacksPerSecond = exactStats.attackInterval !== undefined && exactStats.attackInterval > 0 ? 1 / exactStats.attackInterval : undefined;
  const statKeys = Object.keys(STAT_LABELS).filter((key) => exactStats[key] !== undefined || projectedStats[key] !== undefined);
  const hasProjection = statKeys.some((key) => differs(exactStats[key], projectedStats[key]));
  const summary = summarizeScenarioV3(result);
  const projectedBasicDps = result.simulation.projectedBasicAttackDps;
  const hasProjectedBasicDps = projectedBasicDps !== null
    && projectedBasicDps !== undefined
    && (result.simulation.basicAttackDps === null || differs(result.simulation.basicAttackDps ?? undefined, projectedBasicDps));
  const headlineDps = summary.dps;
  const headlineKind = summary.metricKind;

  return <section className={`v3-stat-panel is-${result.simulation.confidence}`} data-testid="v3-stat-panel">
    <header>
      <div><small>{headlineKind === "practical"
        ? (locale === "ko" ? "실전 DPS" : "Practical DPS")
        : headlineKind === "projected-basic"
          ? (locale === "ko" ? "특수효과 제외 예상 DPS" : "Projected DPS excluding special effects")
          : headlineKind === "verified-basic"
            ? (locale === "ko" ? "특수효과 제외 기본 DPS" : "Basic DPS excluding special effects")
            : headlineKind.startsWith("tree-excluded")
              ? (locale === "ko" ? "트리·특수효과 제외 기본 DPS" : "Basic DPS excluding tree and special effects")
              : (locale === "ko" ? "DPS 계산 근거 부족" : "Insufficient DPS evidence")}</small><strong data-testid="stat-practical-dps" data-dps-kind={headlineKind}>{number(headlineDps, 2)}</strong></div>
      <span>{result.simulation.confidence === "verified" ? (locale === "ko" ? "검증 계산" : "Verified") : (locale === "ko" ? "부분 계산" : "Partial")}</span>
    </header>
    <div className="v3-stat-grid">
      {statKeys.map((key) => {
        const projected = differs(exactStats[key], projectedStats[key]);
        return <div key={key} data-testid={`stat-${key}`} data-projected={String(projected)}>
          <span>{STAT_LABELS[key][locale]}{projected ? <i>{locale === "ko" ? "표 기반 예상" : "Table projection"}</i> : null}</span>
          <strong>{number(projectedStats[key])}</strong>
        </div>;
      })}
      <div data-testid="stat-attacksPerSecond" data-projected={String(differs(exactAttacksPerSecond, attacksPerSecond))}>
        <span>{locale === "ko" ? "초당 공격 횟수" : "Attacks / sec"}{differs(exactAttacksPerSecond, attacksPerSecond) ? <i>{locale === "ko" ? "표 기반 예상" : "Table projection"}</i> : null}</span>
        <strong>{number(attacksPerSecond)}</strong>
      </div>
      <div data-testid="stat-basicAttackDps">
        <span>{locale === "ko" ? "검증 기본 공격 DPS" : "Verified basic attack DPS"}</span><strong>{number(result.simulation.basicAttackDps, 2)}</strong>
      </div>
      {result.simulation.projectedBasicAttackDps !== undefined && (
        result.simulation.basicAttackDps === null
        || differs(result.simulation.basicAttackDps ?? undefined, result.simulation.projectedBasicAttackDps ?? undefined)
      ) && <div data-testid="stat-projectedBasicAttackDps" data-projected="true">
        <span>{locale === "ko" ? "표 기반 기본 공격 DPS" : "Table-projected basic DPS"}<i>{locale === "ko" ? "예상" : "Projected"}</i></span>
        <strong>{number(result.simulation.projectedBasicAttackDps, 2)}</strong>
      </div>}
    </div>
    {result.simulation.confidence === "partial" && <p className="v3-partial-note">
      {hasProjection
        ? (locale === "ko" ? "레벨 및 전투 강화 성장치는 예상 스탯으로 표시합니다. 검증되지 않은 적용 순서는 실전 DPS에 포함하지 않았습니다." : "Level and battle-upgrade growth is shown as projected stats. Unverified operation order is excluded from practical DPS.")
        : (locale === "ko" ? "검증되지 않은 공식은 실전 DPS에 포함하지 않았습니다." : "Unverified formulas are excluded from practical DPS.")}
    </p>}
  </section>;
}
