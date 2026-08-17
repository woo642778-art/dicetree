import { useEffect, useMemo, useReducer, useState } from "react";
import type { DiceFamilyV3 } from "../../../game-data/types";
import { gameDataV3 } from "../../../game-data/load";
import { playableDiceV3 } from "../../../game-data/playableDice";
import { recommendDeckV4 } from "../../../deck-lab/recommendDeck";
import { useI18n } from "../../../i18n/I18nContext";
import { recommendTreeInvestmentsV3, type V3RecommendationSet } from "../../../optimizer/recommendV3";
import { buildTreeHeatmapV3, type TreeHeatmapModeV3 } from "../../../optimizer/treeHeatmapV3";
import { projectResources, simulatedInvestmentCost } from "../../../planner-v3/costs";
import { planNextRankRouteV3 } from "../../../planner-v3/routes";
import { createPlannerHistoryV3, effectiveRankV3, plannerReducerV3 } from "../../../planner-v3/reducer";
import type { PlannerActionV3, PlannerStateV3 } from "../../../planner-v3/types";
import { resolveEnemyPresetV3 } from "../../../simulation/enemies/presets";
import type { SimulationInputV3 } from "../../../simulation/engine/types";
import { evaluateNodeV3 } from "../../../simulation/marginal/evaluateNode";
import { decodeV3FromHash, encodeV3 } from "../../../share/codecV3";
import { decodeSharedResultFromHashV47, encodeSharedResultV47, type SharedResultV47 } from "../../../share/resultCodecV47";
import type { StoredProfileV3 } from "../../../storage/profileStorageV3";
import { CompareWorkspace } from "../compare/CompareWorkspace";
import { DeckLabView } from "../decks/DeckLabView";
import { PurchaseEfficiencyView } from "../shop/PurchaseEfficiencyView";
import { SimulatorView } from "../simulator/SimulatorView";
import { UpdateCenterView } from "../updates/UpdateCenterView";
import { ProfileManagerV3 } from "../profile/ProfileManagerV3";
import { ShareResultComposer } from "../share/ShareResultComposer";
import { SharedBuildView } from "../share/SharedBuildView";
import { NodeDetailSheet } from "../tree/NodeDetailSheet";
import { GuidedRoutePlanner } from "../tree/GuidedRoutePlanner";
import { RecommendationStrip } from "../tree/RecommendationStrip";
import { TreeCanvasV3 } from "../tree/TreeCanvasV3";

type Tab = "tree" | "simulator" | "decks" | "compare" | "shop" | "updates";

const limits = {
  validNodeIds: new Set(gameDataV3.tree.map((node) => node.id)),
  maxRanks: new Map(gameDataV3.tree.map((node) => [node.id, node.maxRank])),
  prerequisites: new Map(gameDataV3.tree.map((node) => [node.id, node.prerequisites])),
};
const selectableDice = playableDiceV3(gameDataV3);
const validDiceIds = new Set(selectableDice.map((dice) => dice.id));
const defaultDiceId = selectableDice.some((dice) => dice.id === "predator") ? "predator" : selectableDice[0]?.id ?? "";
const EMPTY_RECOMMENDATIONS: V3RecommendationSet = { verified: [], partial: [] };
const DEFAULT_DECK_IDS = recommendDeckV4(gameDataV3, "balanced", "free").dice.map((entry) => entry.diceId);
const FAMILY_NAMES: Record<DiceFamilyV3, { ko: string; en: string }> = {
  nature: { ko: "자연", en: "Nature" },
  chaos: { ko: "혼돈", en: "Chaos" },
  order: { ko: "질서", en: "Order" },
  engineering: { ko: "공학", en: "Engineering" },
  magic: { ko: "마법", en: "Magic" },
};

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
  const [guidedRouteOpen, setGuidedRouteOpen] = useState(false);
  const [familyFilter, setFamilyFilter] = useState<DiceFamilyV3 | "all">("all");
  const [query, setQuery] = useState("");
  const [heatmapMode, setHeatmapMode] = useState<TreeHeatmapModeV3>("none");
  const [shareNotice, setShareNotice] = useState<string>();
  const [deckGoal, setDeckGoal] = useState<"dealer" | "support" | "balanced">("balanced");
  const [spendProfile, setSpendProfile] = useState<"free" | "light" | "invested">("free");
  const [activeDeckIds, setActiveDeckIds] = useState<string[]>(DEFAULT_DECK_IDS);
  const [profileOpen, setProfileOpen] = useState(false);
  const [shareComposerOpen, setShareComposerOpen] = useState(false);
  const [shareTitle, setShareTitle] = useState(locale === "ko" ? "내 다이스 트리 빌드" : "My Dice Tree Build");
  const [shareNote, setShareNote] = useState("");
  const [sharedResult, setSharedResult] = useState<SharedResultV47 | null>(() => {
    const decoded = decodeSharedResultFromHashV47(window.location.hash, { ...limits, validDiceIds });
    return decoded?.ok ? decoded.result : null;
  });
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
  const currentRanks = useMemo(() => rankMap(state), [state]);
  const currentInput = useMemo(() => simulationInput(state), [state]);
  const selectedRoute = useMemo(() => {
    if (!selectedNodeId) return undefined;
    try { return planNextRankRouteV3(gameDataV3.tree, currentRanks, selectedNodeId); } catch { return undefined; }
  }, [currentRanks, selectedNodeId]);
  const selectedRouteAffordable = !selectedRoute || (
    selectedRoute.totalCost.gold <= resources.remaining.gold
    && selectedRoute.totalCost.stone <= resources.remaining.stone
  );
  const marginal = useMemo(() => {
    if (!selectedNodeId) return undefined;
    try { return evaluateNodeV3(currentInput, gameDataV3, selectedNodeId); } catch { return undefined; }
  }, [currentInput, selectedNodeId]);
  const recommendations = useMemo<V3RecommendationSet>(() => {
    try { return recommendTreeInvestmentsV3(currentInput, gameDataV3, { limit: 5 }); }
    catch { return EMPTY_RECOMMENDATIONS; }
  }, [currentInput]);
  const heatmap = useMemo(() => buildTreeHeatmapV3(currentInput, gameDataV3, heatmapMode), [currentInput, heatmapMode]);
  const recommendedIds = useMemo(
    () => new Set(recommendations.verified.map((entry) => entry.nodeId)),
    [recommendations],
  );

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

  const createResultShare = async () => {
    const result: SharedResultV47 = { state, deckIds: activeDeckIds, title: shareTitle, note: shareNote, author: locale === "ko" ? "모님" : "Monim" };
    const encoded = encodeSharedResultV47(result);
    const hash = `#r=${encodeURIComponent(encoded)}`;
    const url = `${window.location.origin}${window.location.pathname}${hash}`;
    window.history.replaceState(null, "", hash);
    try { await navigator.clipboard?.writeText(url); } catch { /* The visible result page remains shareable from the address bar. */ }
    setShareComposerOpen(false);
    setSharedResult(result);
  };

  const loadProfile = (profile: StoredProfileV3) => {
    dispatch({ type: "load", state: profile.state });
    setActiveDeckIds(profile.activeDeckIds);
    setDeckGoal(profile.deckGoal);
    setSpendProfile(profile.spendProfile);
    setProfileOpen(false);
    setShareNotice(locale === "ko" ? `${profile.name} 프로필을 불러왔습니다.` : `Loaded ${profile.name}.`);
  };

  const openSharedBuild = (targetTab: Tab) => {
    if (!sharedResult) return;
    dispatch({ type: "load", state: sharedResult.state });
    if (sharedResult.deckIds.length) setActiveDeckIds(sharedResult.deckIds);
    setTab(targetTab);
    const encoded = encodeV3(sharedResult.state);
    window.history.replaceState(null, "", `#b=${encodeURIComponent(encoded)}`);
    setSharedResult(null);
  };

  if (sharedResult) return <SharedBuildView data={gameDataV3} locale={locale} result={sharedResult} onCopyBuild={() => openSharedBuild("tree")} onOpenSimulator={() => openSharedBuild("simulator")} />;

  return <div className={`v3-app v41-mode-${tab}`} data-testid="v3-app">
    <header className="v3-header">
      <button className="v3-brand" type="button" onClick={() => setTab("tree")} aria-label="Random Dice 2 V3">
        <span className="v3-brand-mark"><b>RD</b><i>2</i></span>
        <span><strong>RANDOM DICE 2</strong><small>{locale === "ko" ? "다이스 트리 연구소" : "Dice Tree Lab"}</small></span>
      </button>
      <nav className="v3-nav" aria-label={locale === "ko" ? "주요 화면" : "Primary views"}>
        {(["tree", "simulator", "decks", "compare", "shop", "updates"] as Tab[]).map((item) => <button key={item} type="button" className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>
          {item === "tree" ? (locale === "ko" ? "다이스 트리" : "Dice Tree") : item === "simulator" ? (locale === "ko" ? "시뮬레이터" : "Simulator") : item === "decks" ? (locale === "ko" ? "덱 연구소" : "Deck Lab") : item === "compare" ? (locale === "ko" ? "비교" : "Compare") : item === "shop" ? (locale === "ko" ? "구매 효율" : "Purchase Value") : (locale === "ko" ? "업데이트" : "Updates")}
        </button>)}
      </nav>
      <div className="v3-header-actions">
        <span className="v41-creator-credit">{locale === "ko" ? "제작자 모님" : "Created by Monim"}</span>
        <button className="v47-profile-button" type="button" onClick={() => setProfileOpen(true)}>{locale === "ko" ? "내 프로필" : "Profiles"}</button>
        <button className="v47-result-button" type="button" onClick={() => setShareComposerOpen(true)}>{locale === "ko" ? "결과 카드" : "Result card"}</button>
        <button className="v47-state-share-button" type="button" data-short-label={locale === "ko" ? "공유" : "Share"} aria-label={locale === "ko" ? "공유" : "Share"} onClick={share}>{locale === "ko" ? "상태 공유" : "State link"}</button>
        <button className="v47-locale-button" type="button" onClick={() => setLocale(locale === "ko" ? "en" : "ko")}>{locale === "ko" ? "EN" : "KO"}</button>
      </div>
    </header>

    <section className="v3-resource-rail" aria-label={locale === "ko" ? "다이스 트리 재화" : "Dice Tree resources"}>
      <div className="v3-resource-item gold"><span className="v3-resource-icon">●</span><label>{locale === "ko" ? "남은 골드" : "Remaining Gold"}<input aria-label={locale === "ko" ? "남은 골드" : "Remaining Gold"} type="number" min="0" value={Math.max(0, resources.remaining.gold)} onChange={(event) => dispatch({ type: "setInventory", inventory: { gold: Math.max(0, Number(event.target.value) || 0) + spent.gold } })} /></label><small>{locale === "ko" ? "사용" : "Spent"} {spent.gold.toLocaleString()}</small></div>
      <div className="v3-resource-item stone"><span className="v3-resource-icon">◆</span><label>{locale === "ko" ? "남은 다이스 코어" : "Remaining Dice Core"}<input aria-label={locale === "ko" ? "남은 다이스 코어" : "Remaining Dice Core"} type="number" min="0" value={Math.max(0, resources.remaining.stone)} onChange={(event) => dispatch({ type: "setInventory", inventory: { stone: Math.max(0, Number(event.target.value) || 0) + spent.stone } })} /></label><small>{locale === "ko" ? "사용" : "Spent"} {spent.stone.toLocaleString()}</small></div>
      <div className={`v3-resource-status ${resources.affordable ? "is-ok" : "is-short"}`}><strong>{resources.affordable ? (locale === "ko" ? "투자 가능" : "Affordable") : (locale === "ko" ? "재화 부족" : "Shortfall")}</strong><span>{locale === "ko" ? "가상 투자 비용" : "Simulated cost"}: {spent.gold.toLocaleString()} G · {spent.stone.toLocaleString()} C</span></div>
      <div className="v3-history-actions"><button type="button" onClick={() => dispatch({ type: "clearSimulatedRanks" })} disabled={!Object.keys(state.simulatedRanks).length}>{locale === "ko" ? "전체 계획 취소" : "Clear plan"}</button><button type="button" onClick={() => dispatch({ type: "undo" })} disabled={!history.past.length}>{locale === "ko" ? "실행 취소" : "Undo"}</button><button type="button" onClick={() => dispatch({ type: "redo" })} disabled={!history.future.length}>{locale === "ko" ? "다시 실행" : "Redo"}</button></div>
    </section>

    {shareNotice && <div className="v3-notice" role="status"><span>{shareNotice}</span><button type="button" onClick={() => setShareNotice(undefined)}>×</button></div>}
    {profileOpen && <ProfileManagerV3 locale={locale} state={state} activeDeckIds={activeDeckIds} deckGoal={deckGoal} spendProfile={spendProfile} onLoad={loadProfile} onClose={() => setProfileOpen(false)} />}
    {shareComposerOpen && <ShareResultComposer locale={locale} title={shareTitle} note={shareNote} onTitleChange={setShareTitle} onNoteChange={setShareNote} onCreate={createResultShare} onClose={() => setShareComposerOpen(false)} />}

    {tab === "tree" && <main className={`v3-tree-view ${selectedNode || guidedRouteOpen ? "has-detail" : ""}`} data-testid="v3-tree-view">
      <section className="v3-tree-main">
        <div className="v3-tree-toolbar">
          <div className="v3-family-filter">
            <button type="button" className={familyFilter === "all" ? "is-active" : ""} onClick={() => setFamilyFilter("all")}>{locale === "ko" ? "전체" : "All"}</button>
            {(["nature", "chaos", "order", "engineering", "magic"] as DiceFamilyV3[]).map((family) => <button key={family} type="button" className={familyFilter === family ? `is-active family-${family}` : `family-${family}`} onClick={() => setFamilyFilter(family)}>{FAMILY_NAMES[family][locale]}</button>)}
          </div>
          <input aria-label={locale === "ko" ? "트리 검색" : "Tree search"} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={locale === "ko" ? "노드·효과 검색" : "Search node or effect"} />
          <select className="v47-heatmap-select" aria-label={locale === "ko" ? "효율 히트맵" : "Efficiency heatmap"} value={heatmapMode} onChange={(event) => setHeatmapMode(event.target.value as TreeHeatmapModeV3)}><option value="none">{locale === "ko" ? "히트맵 끄기" : "Heatmap off"}</option><option value="gold">{locale === "ko" ? "골드 1만당" : "Per 10k Gold"}</option><option value="stone">{locale === "ko" ? "코어 1개당" : "Per Core"}</option><option value="path">{locale === "ko" ? "선행 경로 포함" : "Including path"}</option></select>
          <button className="v45-guided-route-open" type="button" onClick={() => { setSelectedNodeId(undefined); setGuidedRouteOpen(true); }}>{locale === "ko" ? "맞춤 전체 루트" : "Guided full route"}</button>
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
          heatmap={heatmap}
          heatmapMode={heatmapMode}
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
        route={selectedRoute}
        routeAffordable={selectedRouteAffordable}
        onApplyRoute={(ranks) => dispatch({ type: "applyRoute", ranks })}
        onCancelPlan={() => dispatch({ type: "setSimulatedRank", nodeId: selectedNode.id, rank: state.ownedRanks[selectedNode.id] ?? 0 })}
        onSetSimulatedRank={(nodeId, rank) => dispatch({ type: "setSimulatedRank", nodeId, rank })}
        onClose={() => setSelectedNodeId(undefined)}
      />}
      {guidedRouteOpen && <GuidedRoutePlanner
        data={gameDataV3}
        locale={locale}
        selectedDiceId={state.scenario.diceId}
        currentRanks={currentRanks}
        budget={{ gold: Math.max(0, resources.remaining.gold), stone: Math.max(0, resources.remaining.stone) }}
        onApply={(ranks) => dispatch({ type: "applyRoute", ranks })}
        onSelectNode={(nodeId) => { setGuidedRouteOpen(false); setSelectedNodeId(nodeId); }}
        onClose={() => setGuidedRouteOpen(false)}
      />}
    </main>}

    {tab === "simulator" && <SimulatorView data={gameDataV3} state={state} locale={locale} onScenarioChange={(patch) => dispatch({ type: "setScenario", scenario: patch })} />}

    {tab === "decks" && <DeckLabView
      data={gameDataV3}
      locale={locale}
      goal={deckGoal}
      spendProfile={spendProfile}
      onGoalChange={setDeckGoal}
      onSpendProfileChange={setSpendProfile}
      activeDeckIds={activeDeckIds}
      onActiveDeckChange={setActiveDeckIds}
      onSimulate={(diceId) => {
        dispatch({ type: "setScenario", scenario: { diceId, conditionValues: {} } });
        setTab("simulator");
      }}
    />}

    {tab === "compare" && <CompareWorkspace data={gameDataV3} locale={locale} baseInput={currentInput} />}

    {tab === "shop" && <PurchaseEfficiencyView locale={locale} />}
    {tab === "updates" && <UpdateCenterView data={gameDataV3} locale={locale} activeDeckIds={activeDeckIds} />}
  </div>;
}
