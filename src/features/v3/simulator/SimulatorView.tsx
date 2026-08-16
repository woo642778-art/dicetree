import { useMemo } from "react";
import type { CanonicalGameData } from "../../../game-data/types";
import { effectiveRankV3 } from "../../../planner-v3/reducer";
import type { PlannerStateV3, SimulationScenarioState } from "../../../planner-v3/types";
import { resolveEnemyPresetV3 } from "../../../simulation/enemies/presets";
import { mechanicConditionDefinitionsV3 } from "../../../simulation/mechanics/registry";
import { runScenarioV3 } from "../../../simulation/scenario/runScenario";
import { CalculationDetails } from "../tree/CalculationDetails";
import { DiceIcon } from "../shared/DiceIcon";
import { ConditionControls } from "./ConditionControls";
import { DamageGraph } from "./DamageGraph";
import { DiceSelector } from "./DiceSelector";
import { EnemyControls } from "./EnemyControls";
import { StatPanel } from "./StatPanel";

export interface SimulatorViewProps {
  data: CanonicalGameData;
  state: PlannerStateV3;
  locale: "ko" | "en";
  onScenarioChange: (patch: Partial<SimulationScenarioState>) => void;
}

function effectiveRanks(state: PlannerStateV3, data: CanonicalGameData) {
  return Object.fromEntries(data.tree.map((node) => [node.id, effectiveRankV3(state, node.id)]));
}

function localized(data: CanonicalGameData, key: string | undefined, locale: "ko" | "en", fallback: string) {
  if (!key) return fallback;
  return data.localization[locale][key] ?? data.localization.ko[key] ?? data.localization.en[key] ?? fallback;
}

export function SimulatorView({ data, state, locale, onScenarioChange }: SimulatorViewProps) {
  const ranks = useMemo(() => effectiveRanks(state, data), [data, state]);
  const scenario = state.scenario;
  const conditions = useMemo(
    () => mechanicConditionDefinitionsV3(scenario.diceId, data, ranks),
    [data, ranks, scenario.diceId],
  );
  const enemy = resolveEnemyPresetV3(scenario.enemyPresetId, scenario.enemyHpOverride, data);
  const input = {
    diceId: scenario.diceId,
    diceProgressionLevel: scenario.diceProgressionLevel,
    battleUpgradeLevel: scenario.battleUpgradeLevel,
    treeRanks: ranks,
    conditionValues: scenario.conditionValues,
    enemy,
    durationSeconds: scenario.durationSeconds,
  };
  const result = runScenarioV3(input, data);
  const selectedDice = data.dice.find((dice) => dice.id === scenario.diceId);
  const selectedName = selectedDice ? localized(data, selectedDice.nameKey, locale, selectedDice.id) : scenario.diceId;
  const investedNodes = data.tree.filter((node) => (ranks[node.id] ?? 0) > 0).length;

  const selectDice = (diceId: string) => {
    const defaults = Object.fromEntries(
      mechanicConditionDefinitionsV3(diceId, data, ranks).map((condition) => [condition.key, condition.defaultValue]),
    );
    onScenarioChange({ diceId, conditionValues: defaults });
  };

  return <main className="v3-simulator-view" data-testid="v3-simulator-view">
    <aside className="v3-simulator-sidebar">
      <DiceSelector data={data} locale={locale} selectedDiceId={scenario.diceId} onSelect={selectDice} />
    </aside>

    <section className="v3-simulator-controls">
      <header>
        <DiceIcon diceId={scenario.diceId} label={selectedName} className="v42-simulator-dice" loading="eager" />
        <div><small>{locale === "ko" ? "전투 시뮬레이터" : "Combat simulator"}</small>
          <h1>{selectedName}</h1>
          <p>{locale === "ko" ? `${investedNodes}개 트리 노드의 현재 가상 랭크를 적용합니다.` : `Applies current simulated ranks from ${investedNodes} tree nodes.`}</p>
        </div>
      </header>

      <section className="v3-growth-controls">
        <h3>{locale === "ko" ? "성장" : "Progression"}</h3>
        <label>
          <span>{locale === "ko" ? "영구 주사위 레벨" : "Permanent dice level"}</span>
          <input
            aria-label={locale === "ko" ? "영구 주사위 레벨" : "Permanent dice level"}
            type="number" min="1" step="1" value={scenario.diceProgressionLevel}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isInteger(value) && value >= 1) onScenarioChange({ diceProgressionLevel: value });
            }}
          />
        </label>
        <label>
          <span>{locale === "ko" ? "전투 파워업" : "Battle upgrade"}</span>
          <input
            aria-label={locale === "ko" ? "전투 파워업" : "Battle upgrade"}
            type="number" min="1" step="1" value={scenario.battleUpgradeLevel}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isInteger(value) && value >= 1) onScenarioChange({ battleUpgradeLevel: value });
            }}
          />
        </label>
      </section>

      <ConditionControls
        definitions={conditions}
        values={scenario.conditionValues}
        locale={locale}
        labelForKey={(key) => localized(data, key, locale, key)}
        onChange={(key, value) => onScenarioChange({ conditionValues: { ...scenario.conditionValues, [key]: value } })}
      />

      <EnemyControls
        data={data}
        locale={locale}
        presetId={scenario.enemyPresetId}
        hpOverride={scenario.enemyHpOverride}
        durationSeconds={scenario.durationSeconds}
        onChange={(patch) => onScenarioChange(patch)}
      />
    </section>

    <section className="v3-simulator-results">
      <StatPanel result={result} locale={locale} />
      <DamageGraph outcome={result.outcome} basicAttackOutcome={result.basicAttackOutcome} basicAttackOutcomeKind={result.basicAttackOutcomeKind} locale={locale} />
      {Object.keys(result.mechanic.values).length > 0 && <section className="v3-mechanic-values" data-testid="v3-mechanic-values">
        <h3>{locale === "ko" ? "고유 효과 입력/해석" : "Mechanic inputs / interpretation"}</h3>
        <dl>{Object.entries(result.mechanic.values).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value === null ? "—" : String(value)}</dd></div>)}</dl>
        {result.mechanic.confidence === "partial" && <p>{locale === "ko" ? "고유 공식의 미검증 구간은 실전 DPS에서 제외됩니다." : "Unverified mechanic portions are excluded from practical DPS."}</p>}
      </section>}
      <CalculationDetails trace={result.simulation.trace} locale={locale} />
    </section>
  </main>;
}
