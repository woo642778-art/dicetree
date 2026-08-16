import type { ScenarioResultV3 } from "../../../simulation/scenario/runScenario";

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

export function StatPanel({ result, locale }: StatPanelProps) {
  const stats = result.simulation.stats;
  const interval = stats.attackInterval;
  const attacksPerSecond = interval !== undefined && interval > 0 ? 1 / interval : undefined;
  return <section className={`v3-stat-panel is-${result.simulation.confidence}`} data-testid="v3-stat-panel">
    <header>
      <div><small>{locale === "ko" ? "실전 DPS" : "Practical DPS"}</small><strong data-testid="stat-practical-dps">{number(result.simulation.practicalDps, 2)}</strong></div>
      <span>{result.simulation.confidence === "verified" ? (locale === "ko" ? "검증 계산" : "Verified") : (locale === "ko" ? "부분 계산" : "Partial")}</span>
    </header>
    <div className="v3-stat-grid">
      {Object.entries(stats).filter(([key]) => key in STAT_LABELS).map(([key, value]) => <div key={key} data-testid={`stat-${key}`}>
        <span>{STAT_LABELS[key][locale]}</span><strong>{number(value)}</strong>
      </div>)}
      <div data-testid="stat-attacksPerSecond"><span>{locale === "ko" ? "초당 공격 횟수" : "Attacks / sec"}</span><strong>{number(attacksPerSecond)}</strong></div>
      <div data-testid="stat-basicAttackDps"><span>{locale === "ko" ? "기본 공격 DPS" : "Basic attack DPS"}</span><strong>{number(result.simulation.basicAttackDps, 2)}</strong></div>
    </div>
    {result.simulation.confidence === "partial" && <p className="v3-partial-note">
      {locale === "ko" ? "검증되지 않은 공식은 실전 DPS에 포함하지 않았습니다." : "Unverified formulas are excluded from practical DPS."}
    </p>}
  </section>;
}
