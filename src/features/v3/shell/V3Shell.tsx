import { useEffect, useMemo, useReducer, useState } from "react";
import type { DiceFamilyV3 } from "../../../game-data/types";
import { gameDataV3 } from "../../../game-data/load";
import { useI18n } from "../../../i18n/I18nContext";
import { recommendTreeInvestmentsV3, type V3RecommendationSet } from "../../../optimizer/recommendV3";
import { projectResources, simulatedInvestmentCost } from "../../../planner-v3/costs";
import { createPlannerHistoryV3, effectiveRankV3, plannerReducerV3 } from "../../../planner-v3/reducer";
import type { PlannerActionV3, PlannerStateV3 } from "../../../planner-v3/types";
import { resolveEnemyPresetV3 } from "../../../simulation/enemies/presets";
import type { SimulationInputV3 } from "../../../simulation/engine/types";
import { evaluateNodeV3 } from "../../../simulation/marginal/evaluateNode";
import { decodeV3FromHash, encodeV3 } from "../../../share/codecV3";
import { CompareView } from "../compare/CompareView";
import { SimulatorView } from "../simulator/SimulatorView";
import { NodeDetailSheet } from "../tree/NodeDetailSheet";
import { RecommendationStrip } from "../tree/RecommendationStrip";
import { TreeCanvasV3 } from "../tree/TreeCanvasV3";

type Tab = "tree" | "simulator" | "compare";

const limits = {
  validNodeIds: new Set(gameDataV3.tree.map((node) => node.id)),
  maxRanks: new Map(gameDataV3.tree.map((node) => [node.id, node.maxRank])),
};
const validDiceIds = new Set(gameDataV3.dice.map((dice) => dice.id));
const defaultDiceId = gameDataV3.dice.some((dice) => dice.id === "predator") ? "predator" : gameDataV3.dice[0]?.id ?? "";
const EMPTY_RECOMMENDATIONS: V3RecommendationSet = { verified: [], partial: [] };

function initialState(): PlannerStateV3 {
  return {
    schemaVersion: 3,
    dataVersion: `${gameDataV3.manifest.clientVersion}:${gameDataV3.manifest.sourceSha256.slice(0, 12)}`,
    ownedRanks: {},
    simulatedRanks: {},
    inventory: { gold: 0, stone: 0 },
    scenario: {
      diceId: defaultDiceId,
      diceProgressionLevel: 1,
      battleUpgradeLevel: 1,
      conditionValues: {},
      enemyPresetId: "custom",
      durationSeconds: 30,
    },
  };
}

function rankMap(state: PlannerStateV3) {
  return Object.fromEntries(gameDataV3.tree.map((node) => [node.id, effectiveRankV3(state, node.id)]));
}

function simulationInput(state: PlannerStateV3, overrides: Partial<SimulationInputV3> = {}): SimulationInputV3 {
  const enemy = resolveEnemyPresetV3(state.scenario.enemyPresetId, state.scenario.enemyHpOverride, gameDataV3);
  return {
    diceId: state.scenario.diceId,
    diceProgressionLevel: state.scenario.diceProgressionLevel,
    battleUpgradeLevel: state.scenario.battleUpgradeLevel,
    treeRanks: rankMap(state),
    conditionValues: state.scenario.conditionValues,
    enemy,
    durationSeconds: state.scenario.durationSeconds,
    ...overrides,
  };
}

export function V3Shell() {
  const { locale, setLocale } = useI18n();
  const [tab, setTab] = useState<Tab>("tree");
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [familyFilter, setFamilyFilter] = useState<DiceFamilyV3 | "all">("all");
  const [query, setQuery] = useState("");
  const [shareNotice, setShareNotice] = useState<string>();
  const [compareDiceId, setCompareDiceId] = useState(defaultDiceId);
  const [compareTreeMode, setCompareTreeMode] = useState<"current" | "none">("none");
  const [history, dispatchBase] = useReducer(
    (current: ReturnType<typeof createPlannerHistoryV3>, action: PlannerActionV3) => plannerReducerV3(current, action, limits),
    undefined,
    () => createPlannerHistoryV3(initialState()),
  );
  const state = history.present;
  const dispatch = (action: PlannerActionV3) => dispatchBase(action);

  useEffect(() => {
    const restored = decodeV3FromHash(window.location.hash, { ...limits, validDiceIds });
    if (!restored) return;
    if (!restored.ok) {
      setShareNotice(locale === "ko" ? "공유 상태를 읽지 못해 새 V3 플래너를 열었습니다." : "Could not restore the shared V3 state.");
      return;
    }
    dispatch({ type: "load", state: restored.state });
    if (restored.warnings.length) setShareNotice(restored.warnings.join(" · "));
  // restore once; locale only changes presentation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spent = useMemo(() => simulatedInvestmentCost(gameDataV3.tree, state), [state]);
  const resources = useMemo(() => projectResources(state.inventory, spent), [spent, state.inventory]);
  const selectedNode = gameDataV3.tree.find((node) => node.id === selectedNodeId);
  const currentInput = useMemo(() => simulationInput(state), [state]);
  const marginal = useMemo(() => {
    if (!selectedNodeId) return undefined;
    try { return evaluateNodeV3(currentInput, gameDataV3, selectedNodeId); } catch { return undefined; }
  }, [currentInput, selectedNodeId]);
  const recommendations = useMemo<V3RecommendationSet>(() => {
    try { return recommendTreeInvestmentsV3(currentInput, gameDataV3, { limit: 5 }); }
    catch { return EMPTY_RECOMMENDATIONS; }
  }, [currentInput]);
  const recommendedIds = useMemo(
    () => new Set(recommendations.verified.map((entry) => entry.nodeId)),
    [recommendations],
  );
  const compareInput = useMemo<SimulationInputV3>(() => ({
    ...currentInput,
    diceId: compareDiceId,
    treeRanks: compareTreeMode === "current" ? currentInput.treeRanks : {},
    conditionValues: {},
  }), [compareDiceId, compareTreeMode, currentInput]);

  const share = async () => {
    const encoded = encodeV3(state);
    const url = `${window.location.origin}${window.location.pathname}#b=${encodeURIComponent(encoded)}`;
    window.history.replaceState(null, "", `#b=${encodeURIComponent(encoded)}`);
    try {
      await navigator.clipboard?.writeText(url);
      setShareNotice(locale === "ko" ? "V3 빌드 링크를 복사했습니다." : "V3 build link copied.");
    } catch {
      setShareNotice(url);
    }
  };

  return <div className="v3-app" data-testid="v3-app">
    <header className="v3-header">
      <button className="v3-brand" type="button" onClick={() => setTab("tree")} aria-label="Random Dice 2 V3">
        <span className="v3-brand-mark"><b>RD</b><i>2</i></span>
        <span><strong>RANDOM DICE 2</strong><small>{locale === "ko" ? "IPA 기반 다이스 트리" : "IPA-backed Dice Tree"}</small></span>
      </button>
      <nav className="v3-nav" aria-label={locale === "ko" ? "주요 화면" : "Primary views"}>
        {(["tree", "simulator", "compare"] as Tab[]).map((item) => <button key={item} type="button" className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>
          {item === "tree" ? (locale === "ko" ? "다이스 트리" : "Dice Tree") : item === "simulator" ? (locale === "ko" ? "시뮬레이터" : "Simulator") : (locale === "ko" ? "비교" : "Compare")}
        </button>)}
      </nav>
      <div className="v3-header-actions">
        <button type="button" onClick={share}>{locale === "ko" ? "공유" : "Share"}</button>
        <button type="button" onClick={() => setLocale(locale === "ko" ? "en" : "ko")}>{locale === "ko" ? "EN" : "KO"}</button>
      </div>
    </header>

    <section className="v3-resource-rail" aria-label={locale === "ko" ? "다이스 트리 재화" : "Dice Tree resources"}>
      <div className="v3-resource-item gold"><span className="v3-resource-icon">●</span><label>{locale === "ko" ? "골드" : "Gold"}<input aria-label={locale === "ko" ? "보유 골드" : "Owned Gold"} type="number" min="0" value={state.inventory.gold} onChange={(event) => dispatch({ type: "setInventory", inventory: { gold: Math.max(0, Number(event.target.value) || 0) } })} /></label><small>−{spent.gold.toLocaleString()}</small></div>
      <div className="v3-resource-item stone"><span className="v3-resource-icon">◆</span><label>{locale === "ko" ? "다이스 코어" : "Dice Core"}<input aria-label={locale === "ko" ? "보유 다이스 코어" : "Owned Dice Core"} type="number" min="0" value={state.inventory.stone} onChange={(event) => dispatch({ type: "setInventory", inventory: { stone: Math.max(0, Number(event.target.value) || 0) } })} /></label><small>−{spent.stone.toLocaleString()}</small></div>
      <div className={`v3-resource-status ${resources.affordable ? "is-ok" : "is-short"}`}><strong>{resources.affordable ? (locale === "ko" ? "투자 가능" : "Affordable") : (locale === "ko" ? "재화 부족" : "Shortfall")}</strong><span>{locale === "ko" ? "가상 투자 비용" : "Simulated cost"}: {spent.gold.toLocaleString()} G · {spent.stone.toLocaleString()} C</span></div>
      <div className="v3-history-actions"><button type="button" onClick={() => dispatch({ type: "undo" })} disabled={!history.past.length}>{locale === "ko" ? "실행 취소" : "Undo"}</button><button type="button" onClick={() => dispatch({ type: "redo" })} disabled={!history.future.length}>{locale === "ko" ? "다시 실행" : "Redo"}</button></div>
    </section>

    {shareNotice && <div className="v3-notice" role="status"><span>{shareNotice}</span><button type="button" onClick={() => setShareNotice(undefined)}>×</button></div>}

    {tab === "tree" && <main className="v3-tree-view" data-testid="v3-tree-view">
      <section className="v3-tree-main">
        <div className="v3-tree-toolbar">
          <div className="v3-family-filter">
            <button type="button" className={familyFilter === "all" ? "is-active" : ""} onClick={() => setFamilyFilter("all")}>{locale === "ko" ? "전체" : "All"}</button>
            {(["nature", "chaos", "order", "engineering", "magic"] as DiceFamilyV3[]).map((family) => <button key={family} type="button" className={familyFilter === family ? `is-active family-${family}` : `family-${family}`} onClick={() => setFamilyFilter(family)}>{family}</button>)}
          </div>
          <input aria-label={locale === "ko" ? "트리 검색" : "Tree search"} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={locale === "ko" ? "노드·효과 검색" : "Search node or effect"} />
        </div>
        <RecommendationStrip
          data={gameDataV3}
          recommendations={recommendations}
          locale={locale}
          onSelectNode={setSelectedNodeId}
        />
        <TreeCanvasV3
          nodes={gameDataV3.tree}
          ownedRanks={state.ownedRanks}
          simulatedRanks={state.simulatedRanks}
          selectedNodeId={selectedNodeId}
          selectedDiceId={state.scenario.diceId}
          recommendedIds={recommendedIds}
          familyFilter={familyFilter}
          query={query}
          locale={locale}
          onSelect={setSelectedNodeId}
        />
      </section>
      {selectedNode && <NodeDetailSheet
        node={selectedNode}
        data={gameDataV3}
        state={state}
        locale={locale}
        selectedDiceId={state.scenario.diceId}
        marginal={marginal}
        onSetSimulatedRank={(nodeId, rank) => dispatch({ type: "setSimulatedRank", nodeId, rank })}
        onClose={() => setSelectedNodeId(undefined)}
      />}
    </main>}

    {tab === "simulator" && <SimulatorView data={gameDataV3} state={state} locale={locale} onScenarioChange={(patch) => dispatch({ type: "setScenario", scenario: patch })} />}

    {tab === "compare" && <section className="v3-compare-shell">
      <div className="v3-compare-controls">
        <label>{locale === "ko" ? "B 주사위" : "Dice B"}<select value={compareDiceId} onChange={(event) => setCompareDiceId(event.target.value)}>{gameDataV3.dice.map((dice) => <option key={dice.id} value={dice.id}>{dice.nameKey ? gameDataV3.localization[locale][dice.nameKey] ?? dice.id : dice.id}</option>)}</select></label>
        <label>{locale === "ko" ? "B 트리" : "Tree B"}<select value={compareTreeMode} onChange={(event) => setCompareTreeMode(event.target.value as "current" | "none")}><option value="none">{locale === "ko" ? "트리 없음" : "No tree"}</option><option value="current">{locale === "ko" ? "현재 가상 트리" : "Current simulated tree"}</option></select></label>
      </div>
      <CompareView data={gameDataV3} locale={locale} left={currentInput} right={compareInput} />
    </section>}
  </div>;
}
