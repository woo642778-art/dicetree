import { useEffect, useMemo, useReducer, useState } from "react";
import type { DiceFamily, PlannerStateV1, Recommendation } from "../domain/types";
import { DATA_VERSION } from "../tree-data/dataVersion";
import { treeNodes } from "../tree-data/nodes";
import { diceDefinitions } from "../tree-data/dice";
import { validateDataset } from "../tree-data/validateDataset";
import { canIncrement, getRollbackSet } from "../domain/treeRules";
import { createPlannerHistory, plannerReducer } from "../planner/plannerReducer";
import { selectInvestedCount, selectSpentResources } from "../planner/selectors";
import { recommendNextRoutes } from "../optimizer/recommend";
import { encodePlannerState, loadSharedStateFromHash } from "../share/codec";
import { useI18n } from "../i18n/I18nContext";
import { GoalPanel } from "../features/planner/GoalPanel";
import { TreeCanvas } from "../features/tree/TreeCanvas";
import { ResourceSummary } from "../features/planner/ResourceSummary";
import { NodePanel } from "../features/analysis/NodePanel";
import { RecommendationPanel } from "../features/analysis/RecommendationPanel";
import { ShareButton } from "../features/share/ShareButton";
import { BuildManager } from "../features/storage/BuildManager";

const blankState = (): PlannerStateV1 => ({
  schemaVersion: 1,
  dataVersion: DATA_VERSION,
  ranks: {},
  goals: { primaryDieId: "devourer", secondaryDieIds: ["corruption"], role: "dealer", spendingProfile: "f2p" },
});

type ShareIssue = "invalid" | "partial" | null;

export function App() {
  const { t, locale, setLocale } = useI18n();
  const [history, dispatch] = useReducer((state: ReturnType<typeof createPlannerHistory>, action: Parameters<typeof plannerReducer>[1]) => plannerReducer(state, action, treeNodes), createPlannerHistory(blankState()));
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [familyFilter, setFamilyFilter] = useState<DiceFamily | "all">("all");
  const [search, setSearch] = useState("");
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [shareIssue, setShareIssue] = useState<ShareIssue>(null);
  const state = history.present;
  const validation = useMemo(() => validateDataset(treeNodes, diceDefinitions), []);
  const selectedNode = treeNodes.find((node) => node.id === selectedNodeId);
  const recommendations = useMemo(() => recommendNextRoutes(state, treeNodes, diceDefinitions, { limit: 4 }), [state]);
  const spent = useMemo(() => selectSpentResources(state, treeNodes), [state]);
  const semanticBuild = useMemo(() => encodePlannerState(state), [state]);
  const investedCount = selectInvestedCount(state);

  useEffect(() => {
    const result = loadSharedStateFromHash(window.location.hash, new Set(treeNodes.map((node) => node.id)));
    if (!result) return;
    if (result.state) dispatch({ type: "load", state: result.state });
    if (result.error) setShareIssue("invalid");
    else if (result.warnings.length) setShareIssue("partial");
  }, []);

  const increment = () => selectedNode && dispatch({ type: "increment", nodeId: selectedNode.id });
  const decrement = () => {
    if (!selectedNode) return;
    const current = state.ranks[selectedNode.id] ?? 0;
    const rollback = getRollbackSet(selectedNode.id, current - 1, state.ranks, treeNodes);
    if (Object.keys(rollback).length && !window.confirm(`This change will also roll back ${Object.keys(rollback).length} downstream node(s). Continue?`)) return;
    dispatch({ type: "decrement", nodeId: selectedNode.id });
  };
  const applyRecommendation = (recommendation: Recommendation) => dispatch({ type: "applyRoute", route: recommendation.route });
  const knownCount = treeNodes.filter((node) => node.verification.status !== "unverified").length;
  const unknownCount = treeNodes.length - knownCount;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">RD²</span><div><h1>{t("app.title")}</h1><p>{t("app.subtitle")}</p></div></div>
      <div className="topbar-meta"><span>{t("status.data")} <b>{DATA_VERSION}</b></span><span className={validation.errors.length ? "bad" : "good"}>{validation.errors.length ? `${validation.errors.length} ERR` : "DATA OK"}</span></div>
      <div className="topbar-actions">
        <button type="button" className="mobile-only" onClick={() => setLeftOpen(true)}>{t("action.goals")}</button>
        <button type="button" className="top-action" disabled={!history.past.length} onClick={() => dispatch({ type: "undo" })}>{t("action.undo")}</button>
        <button type="button" className="top-action" disabled={!history.future.length} onClick={() => dispatch({ type: "redo" })}>{t("action.redo")}</button>
        <button type="button" className="top-action" onClick={() => dispatch({ type: "reset", state: blankState() })}>{t("action.reset")}</button>
        <BuildManager state={state} onLoad={(loaded) => dispatch({ type: "load", state: loaded })} />
        <ShareButton state={state} />
        <button type="button" className="locale-toggle" onClick={() => setLocale(locale === "ko" ? "en" : "ko")}>{locale === "ko" ? "EN" : "KO"}</button>
        <button type="button" className="mobile-only" onClick={() => setRightOpen(true)}>{t("action.analysis")}</button>
      </div>
    </header>

    {shareIssue && <div className="notice warning" data-testid="share-warning">
      {t(shareIssue === "invalid" ? "share.invalid" : "share.partial")}
      <button type="button" onClick={() => setShareIssue(null)} aria-label={t("action.close")}>×</button>
    </div>}
    <output hidden aria-hidden="true" data-testid="semantic-build-hash">{semanticBuild}</output>

    <main className="workspace">
      <div className={`mobile-scrim ${leftOpen || rightOpen ? "show" : ""}`} onClick={() => { setLeftOpen(false); setRightOpen(false); }} />
      <GoalPanel
        className={leftOpen ? "mobile-open" : ""}
        dice={diceDefinitions}
        goals={state.goals}
        onChange={(goals) => dispatch({ type: "setGoals", goals })}
        familyFilter={familyFilter}
        onFamilyFilter={setFamilyFilter}
        search={search}
        onSearch={setSearch}
      />
      <div className="canvas-column">
        <div className="canvas-status"><span><b>{knownCount}</b> {t("status.known")}</span><span><b>{unknownCount}</b> {t("status.unknown")}</span></div>
        <TreeCanvas nodes={treeNodes} ranks={state.ranks} selectedNodeId={selectedNodeId} onSelect={(id) => { setSelectedNodeId(id); setRightOpen(true); }} recommendations={recommendations} familyFilter={familyFilter} search={search} />
        <ResourceSummary totals={spent} investedCount={investedCount} />
      </div>
      <aside className={`side-panel analysis-panel ${rightOpen ? "mobile-open" : ""}`}>
        <button className="mobile-close" onClick={() => setRightOpen(false)} type="button">×</button>
        <NodePanel node={selectedNode} rank={selectedNode ? state.ranks[selectedNode.id] ?? 0 : 0} onIncrement={increment} onDecrement={decrement} canIncrement={selectedNode ? canIncrement(selectedNode.id, state.ranks, treeNodes) : false} />
        <RecommendationPanel recommendations={recommendations} nodes={treeNodes} onApply={applyRecommendation} />
      </aside>
    </main>
  </div>;
}
