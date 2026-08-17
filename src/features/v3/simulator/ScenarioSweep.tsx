import type { CanonicalGameData } from "../../../game-data/types";
import type { SimulationInputV3 } from "../../../simulation/engine/types";
import { runScenarioSweepV3 } from "../../../simulation/scenario/runScenarioSweep";

export interface ScenarioSweepProps {
  data: CanonicalGameData;
  input: SimulationInputV3;
  locale: "ko" | "en";
}

function compact(value: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function ScenarioSweep({ data, input, locale }: ScenarioSweepProps) {
  const hpValues = [100_000, 500_000, 1_000_000, 5_000_000];
  const durations = [5, 10, 30, 60];
  const sweep = runScenarioSweepV3(input, data, hpValues, durations);
  const anyAvailable = sweep.cells.some((cell) => cell.dps !== null);

  return <section className="v47-scenario-sweep" data-testid="v47-scenario-sweep">
    <header>
      <div><small>{locale === "ko" ? "16개 조건 자동 계산" : "16 conditions calculated"}</small><h3>{locale === "ko" ? "전투 조건 일괄 시뮬레이션" : "Battle condition sweep"}</h3></div>
      <p>{locale === "ko" ? "같은 주사위, 트리, 고유 조건을 유지하고 적 HP와 전투 시간만 바꿉니다." : "Keeps dice, tree, and mechanic conditions fixed while varying enemy HP and duration."}</p>
    </header>
    {anyAvailable ? <div className="v47-sweep-table" role="table" aria-label={locale === "ko" ? "전투 조건 결과" : "Battle condition results"}>
      <div className="v47-sweep-row is-head" role="row"><strong role="columnheader">HP</strong>{durations.map((duration) => <strong role="columnheader" key={duration}>{duration}s</strong>)}</div>
      {hpValues.map((hp) => <div className="v47-sweep-row" role="row" key={hp}>
        <strong role="rowheader">{compact(hp)}</strong>
        {durations.map((duration) => {
          const cell = sweep.cells.find((candidate) => candidate.enemyHp === hp && candidate.durationSeconds === duration)!;
          return <div role="cell" className={cell.clearsWithinDuration ? "is-clear" : "is-hold"} key={duration}>
            <b>{cell.clearsWithinDuration ? (locale === "ko" ? "처치" : "Clear") : (locale === "ko" ? "생존" : "Holds")}</b>
            <span>{cell.totalDamage === null ? "—" : compact(cell.totalDamage)}</span>
          </div>;
        })}
      </div>)}
    </div> : <p className="v47-sweep-unavailable">{locale === "ko" ? "현재 공식 근거로 공통 DPS를 계산할 수 없습니다." : "No common DPS can be calculated from current formula evidence."}</p>}
    <footer>{hpValues.map((hp) => <span key={hp}><b>{compact(hp)} HP</b>{sweep.firstClearDurationByHp[hp] === null ? (locale === "ko" ? "60초 내 처치 불가" : "No clear within 60s") : (locale === "ko" ? `${sweep.firstClearDurationByHp[hp]}초부터 처치` : `Clears from ${sweep.firstClearDurationByHp[hp]}s`)}</span>)}</footer>
  </section>;
}
