import { useEffect, useMemo, useReducer, useState } from "react";
import type { DiceFamilyV3 } from "../../../game-data/types";
import { gameDataV3 } from "../../../game-data/load";
import { playableDiceV3 } from "../../../game-data/playableDice";
import { createDigitalTwinV48, digitalTwinFromProfileV48, isDigitalTwinV48, updateTwinPlannerV48, type UserDigitalTwinV48 } from "../../../account/digitalTwinV48";
import type { FullAccountImportV49, ObservedAccountV49 } from "../../../account/accountImportV49";
import { recommendDeckV4 } from "../../../deck-lab/recommendDeck";
import { useI18n } from "../../../i18n/I18nContext";
import { recommendTreeInvestmentsV3, type V3RecommendationSet } from "../../../optimizer/recommendV3";
import { buildTreeHeatmapV3, type TreeHeatmapModeV3 } from "../../../optimizer/treeHeatmapV3";
import { projectResources, simulatedInvestmentCost } from "../../../planner-v3/costs";
import { planNextRankRouteV3 } from "../../../planner-v3/routes";
import { createPlannerHistoryV3, effectiveRankV3, plannerReducerV3 } from "../../../planner-v3/reducer";
import type { PlannerActionV3, PlannerStateV3 } from "../../../planner-v3/types";
import { starterOwnedRanksV3 } from "../../../planner-v3/starterRanks";
import { resolveEnemyPresetV3 } from "../../../simulation/enemies/presets";
import type { SimulationInputV3 } from "../../../simulation/engine/types";
import { evaluateNodeV3 } from "../../../simulation/marginal/evaluateNode";
import { decodeV3FromHash, encodeV3 } from "../../../share/codecV3";
import { decodeSharedResultFromHashV47, encodeSharedResultV47, type SharedResultV47 } from "../../../share/resultCodecV47";
import { findProfileByNameV3, saveProfileV3, type StoredProfileV3 } from "../../../storage/profileStorageV3";
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
import { normalizeTreeSearchText, treeNodeSearchTextV3, TreeCanvasV3 } from "../tree/TreeCanvasV3";
import { AccountIntelligenceView } from "../account/AccountIntelligenceView";
import { TierMakerView } from "../tier/TierMakerView";

type Tab = "account" | "tree" | "simulator" | "decks" | "tier" | "compare" | "shop" | "updates";

const STARTER_OWNED_RANKS = starterOwnedRanksV3(gameDataV3.tree);
const limits = {
  validNodeIds: new Set(gameDataV3.tree.map((node) => node.id)),
  maxRanks: new Map(gameDataV3.tree.map((node) => [node.id, node.maxRank])),
  prerequisites: new Map(gameDataV3.tree.map((node) => [node.id, node.prerequisites])),
  minimumOwnedRanks: new Map(Object.entries(STARTER_OWNED_RANKS)),
};
const selectableDice = playableDiceV3(gameDataV3);
const validDiceIds = new Set(selectableDice.map((dice) => dice.id));
const defaultDiceId = selectableDice.some((dice) => dice.id === "predator") ? "predator" : selectableDice[0]?.id ?? "";
const EMPTY_RECOMMENDATIONS: V3RecommendationSet = { verified: [], partial: [] };
const DEFAULT_DECK_IDS = recommendDeckV4(gameDataV3, "balanced", "free").dice.map((entry) => entry.diceId);
const ACCOUNT_STORAGE_KEY = "dicetree:v49:account";
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
    ownedRanks: { ...STARTER_OWNED_RANKS },
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

function loadAccountTwin(): UserDigitalTwinV48 {
  const fallback = createDigitalTwinV48({ planner: initialState(), activeDeckIds: DEFAULT_DECK_IDS, deckGoal: "balanced", spendProfile: "free" });
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ACCOUNT_STORAGE_KEY) ?? "null");
    if (!isDigitalTwinV48(parsed)) return fallback;
    return {
      ...parsed,
      planner: { ...parsed.planner, ownedRanks: { ...STARTER_OWNED_RANKS, ...parsed.planner.ownedRanks } },
    };
  } catch { return fallback; }
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
  const [accountSeed] = useState(loadAccountTwin);
  const [tab, setTab] = useState<Tab>("tree");
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [guidedRouteOpen, setGuidedRouteOpen] = useState(false);
  const [familyFilter, setFamilyFilter] = useState<DiceFamilyV3 | "all">("all");
  const [query, setQuery] = useState("");
  const [heatmapMode, setHeatmapMode] = useState<TreeHeatmapModeV3>("none");
  const [shareNotice, setShareNotice] = useState<string>();
  const [deckGoal, setDeckGoal] = useState<"dealer" | "support" | "balanced">(() => accountSeed.decks.find((deck) => deck.id === accountSeed.primaryDeckId)?.role ?? "balanced");
  const [spendProfile, setSpendProfile] = useState<"free" | "light" | "invested">(accountSeed.preferences.spendProfile);
  const [activeDeckIds, setActiveDeckIds] = useState<string[]>(() => accountSeed.decks.find((deck) => deck.id === accountSeed.primaryDeckId)?.diceIds ?? DEFAULT_DECK_IDS);
  const [digitalTwin, setDigitalTwin] = useState(accountSeed);
  const [profileOpen, setProfileOpen] = useState(false);
  const [shareComposerOpen, setShareComposerOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [treeResetOpen, setTreeResetOpen] = useState(false);
  const [shareTitle, setShareTitle] = useState(locale === "ko" ? "내 다이스 트리 빌드" : "My Dice Tree Build");
  const [shareNote, setShareNote] = useState("");
  const [sharedResult, setSharedResult] = useState<SharedResultV47 | null>(() => {
    const decoded = decodeSharedResultFromHashV47(window.location.hash, { ...limits, validDiceIds });
    return decoded?.ok ? decoded.result : null;
  });
  const [history, dispatchBase] = useReducer(
    (current: ReturnType<typeof createPlannerHistoryV3>, action: PlannerActionV3) => plannerReducerV3(current, action, limits),
    undefined,
    () => createPlannerHistoryV3(accountSeed.planner),
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const spent = useMemo(() => simulatedInvestmentCost(gameDataV3.tree, state), [state]);
  const resources = useMemo(() => projectResources(state.inventory, spent), [spent, state.inventory]);
  const hasResettableTreeProgress = Object.keys(state.simulatedRanks).length > 0
    || Object.entries(state.ownedRanks).some(([nodeId, rank]) => rank !== (STARTER_OWNED_RANKS[nodeId] ?? 0));
  const selectedNode = gameDataV3.tree.find((node) => node.id === selectedNodeId);
  const currentRanks = useMemo(() => rankMap(state), [state]);
  const currentInput = useMemo(() => simulationInput(state), [state]);
  const currentTwin = useMemo(() => updateTwinPlannerV48(digitalTwin, state, activeDeckIds), [activeDeckIds, digitalTwin, state]);
  useEffect(() => {
    try { window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(currentTwin)); } catch { /* Storage can be unavailable in private mode. */ }
  }, [currentTwin]);
  useEffect(() => {
    if (currentTwin.identity?.source !== "local-profile") return;
    const existing = findProfileByNameV3(currentTwin.identity.nickname);
    saveProfileV3({
      name: currentTwin.identity.nickname,
      state,
      activeDeckIds,
      deckGoal,
      spendProfile,
      digitalTwin: currentTwin,
    }, existing?.id);
  }, [activeDeckIds, currentTwin, deckGoal, spendProfile, state]);
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
  const commandResults = useMemo(() => {
    const normalized = normalizeTreeSearchText(commandQuery.trim());
    const tabs: Array<{ id: string; kind: "tab"; tab: Tab; label: string }> = (["account", "tree", "simulator", "decks", "tier", "compare", "shop", "updates"] as Tab[]).map((target) => ({
      id: `tab:${target}`, kind: "tab", tab: target,
      label: target === "account" ? (locale === "ko" ? "내 계정 인텔리전스" : "Account Intelligence") : target === "tree" ? (locale === "ko" ? "다이스 트리" : "Dice Tree") : target === "simulator" ? (locale === "ko" ? "시뮬레이터" : "Simulator") : target === "decks" ? (locale === "ko" ? "덱 연구소" : "Deck Lab") : target === "tier" ? (locale === "ko" ? "티어 메이커" : "Tier Maker") : target === "compare" ? (locale === "ko" ? "비교" : "Compare") : target === "shop" ? (locale === "ko" ? "구매 효율" : "Purchase Value") : (locale === "ko" ? "업데이트" : "Updates"),
    }));
    const dice = selectableDice.map((entry) => ({ id: `dice:${entry.id}`, kind: "dice" as const, diceId: entry.id, label: entry.nameKey ? gameDataV3.localization[locale][entry.nameKey] ?? entry.id : entry.id }));
    const nodes = gameDataV3.tree.filter((node) => node.kind !== "connector").map((node) => ({ id: `node:${node.id}`, kind: "node" as const, nodeId: node.id, label: node.nameKey ? gameDataV3.localization[locale][node.nameKey] ?? node.id : node.id, effect: node.descriptionKey ? gameDataV3.localization[locale][node.descriptionKey] ?? "" : "", searchText: treeNodeSearchTextV3(gameDataV3, node, locale) }));
    return [...tabs, ...dice, ...nodes].filter((entry) => !normalized || ("searchText" in entry ? entry.searchText.includes(normalized) : normalizeTreeSearchText(`${entry.label} ${entry.id}`).includes(normalized))).slice(0, 12);
  }, [commandQuery, locale]);
  const openCommandResult = (entry: (typeof commandResults)[number]) => {
    if (entry.kind === "tab") setTab(entry.tab);
    if (entry.kind === "dice") { dispatch({ type: "setScenario", scenario: { diceId: entry.diceId, conditionValues: {} } }); setTab("simulator"); }
    if (entry.kind === "node") { setSelectedNodeId(entry.nodeId); setQuery(entry.label); setTab("tree"); }
    setCommandOpen(false);
    setCommandQuery("");
  };

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
    setDigitalTwin(digitalTwinFromProfileV48(profile));
    setProfileOpen(false);
    setShareNotice(locale === "ko" ? `${profile.name} 프로필을 불러왔습니다.` : `Loaded ${profile.name}.`);
  };

  const openLocalAccount = (nickname: string): "loaded" | "created" => {
    const existing = findProfileByNameV3(nickname);
    if (existing) {
      loadProfile(existing);
      return "loaded";
    }
    const now = new Date().toISOString();
    const twin: UserDigitalTwinV48 = {
      ...currentTwin,
      identity: { nickname, source: "local-profile", importedAt: now },
      decks: currentTwin.decks.map((deck) => deck.id === currentTwin.primaryDeckId ? { ...deck, name: nickname } : deck),
    };
    setDigitalTwin(twin);
    saveProfileV3({ name: nickname, state, activeDeckIds, deckGoal, spendProfile, digitalTwin: twin });
    setShareNotice(locale === "ko" ? `${nickname} 계정을 현재 상태로 만들고 이 브라우저에 저장했습니다.` : `Created ${nickname} from the current state and saved it in this browser.`);
    return "created";
  };

  const importObservedAccount = (account: ObservedAccountV49) => {
    setActiveDeckIds([...account.diceIds]);
    setDigitalTwin((twin) => ({
      ...twin,
      identity: { nickname: account.nickname, source: "observed-ranking", importedAt: new Date().toISOString(), publicRank: account.rank },
      decks: twin.decks.map((deck) => deck.id === twin.primaryDeckId ? { ...deck, diceIds: [...account.diceIds] } : deck),
    }));
    setShareNotice(locale === "ko" ? `${account.nickname}의 관측 랭킹 덱만 적용했습니다. 트리·재화·레벨은 변경하지 않았습니다.` : `Applied only ${account.nickname}'s observed ranked deck. Tree, resources, and levels were not changed.`);
  };

  const importFullAccount = (account: FullAccountImportV49) => {
    dispatch({ type: "load", state: account.planner });
    setActiveDeckIds([...account.deckIds]);
    setDeckGoal(account.goal);
    setSpendProfile(account.spendProfile);
    setDigitalTwin((twin) => ({
      ...twin,
      planner: structuredClone(account.planner),
      roster: structuredClone(account.roster),
      identity: account.identity,
      decks: [{ id: "primary", name: account.identity.nickname, diceIds: [...account.deckIds], role: account.goal }],
      primaryDeckId: "primary",
      preferences: { ...twin.preferences, spendProfile: account.spendProfile },
      goal: { ...twin.goal, targetDiceId: account.deckIds[0] },
    }));
    setSelectedNodeId(undefined);
    setGuidedRouteOpen(false);
    setTab("tree");
    setShareNotice(locale === "ko" ? `${account.identity.nickname} 계정 스냅샷을 검증해 적용했습니다.` : `Validated and applied ${account.identity.nickname}'s account snapshot.`);
  };

  const resetTree = () => {
    dispatch({ type: "resetTreeProgress" });
    setSelectedNodeId(undefined);
    setGuidedRouteOpen(false);
    setTreeResetOpen(false);
    setShareNotice(locale === "ko" ? "다이스 트리를 기본 해금 상태로 초기화했습니다. 실행 취소로 복원할 수 있습니다." : "Reset the Dice Tree to its starter unlocks. Undo can restore it.");
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
      <button className="v3-brand" type="button" onClick={() => setTab("account")} aria-label="Random Dice 2 V3">
        <span className="v3-brand-mark"><b>RD</b><i>2</i></span>
        <span><strong>RANDOM DICE 2</strong><small>{locale === "ko" ? "다이스 트리 연구소" : "Dice Tree Lab"}</small></span>
      </button>
      <nav className="v3-nav" aria-label={locale === "ko" ? "주요 화면" : "Primary views"}>
        {(["account", "tree", "simulator", "decks", "tier", "compare", "shop", "updates"] as Tab[]).map((item) => <button key={item} type="button" className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>
          {item === "account" ? (locale === "ko" ? "내 계정" : "My Account") : item === "tree" ? (locale === "ko" ? "다이스 트리" : "Dice Tree") : item === "simulator" ? (locale === "ko" ? "시뮬레이터" : "Simulator") : item === "decks" ? (locale === "ko" ? "덱 연구소" : "Deck Lab") : item === "tier" ? (locale === "ko" ? "티어 메이커" : "Tier Maker") : item === "compare" ? (locale === "ko" ? "비교" : "Compare") : item === "shop" ? (locale === "ko" ? "구매 효율" : "Purchase Value") : (locale === "ko" ? "업데이트" : "Updates")}
        </button>)}
      </nav>
      <div className="v3-header-actions">
        <span className="v41-creator-credit">{locale === "ko" ? "제작자 모님" : "Created by Monim"}</span>
        <button className="v48-command-open" type="button" onClick={() => setCommandOpen(true)} aria-label={locale === "ko" ? "통합 검색" : "Universal search"}>⌕ <span>⌘K</span></button>
        <button className="v47-profile-button" type="button" onClick={() => setProfileOpen(true)}>{locale === "ko" ? "내 프로필" : "Profiles"}</button>
        <button className="v47-result-button" type="button" onClick={() => setShareComposerOpen(true)}>{locale === "ko" ? "결과 카드" : "Result card"}</button>
        <button className="v47-state-share-button" type="button" data-short-label={locale === "ko" ? "공유" : "Share"} aria-label={locale === "ko" ? "공유" : "Share"} onClick={share}>{locale === "ko" ? "상태 공유" : "State link"}</button>
        <button className="v47-locale-button" type="button" onClick={() => setLocale(locale === "ko" ? "en" : "ko")}>{locale === "ko" ? "EN" : "KO"}</button>
      </div>
    </header>

    <section className="v3-resource-rail" aria-label={locale === "ko" ? "다이스 트리 재화" : "Dice Tree resources"}>
      <div className="v3-resource-item gold"><span className="v3-resource-icon">●</span><label>{locale === "ko" ? "남은 골드" : "Remaining Gold"}<input aria-label={locale === "ko" ? "남은 골드" : "Remaining Gold"} type="number" min="0" value={Math.max(0, resources.remaining.gold)} onChange={(event) => dispatch({ type: "setInventory", inventory: { gold: Math.max(0, Number(event.target.value) || 0) + spent.gold } })} /></label><small>{locale === "ko" ? "사용" : "Spent"} {spent.gold.toLocaleString()}</small></div>
      <div className="v3-resource-item stone"><span className="v3-resource-icon">◆</span><label>{locale === "ko" ? "남은 다이스 코어" : "Remaining Dice Core"}<input aria-label={locale === "ko" ? "남은 다이스 코어" : "Remaining Dice Core"} type="number" min="0" value={Math.max(0, resources.remaining.stone)} onChange={(event) => dispatch({ type: "setInventory", inventory: { stone: Math.max(0, Number(event.target.value) || 0) + spent.stone } })} /></label><small>{locale === "ko" ? "사용" : "Spent"} {spent.stone.toLocaleString()}</small></div>
      <div className={`v3-resource-status ${resources.affordable ? "is-ok" : "is-short"}`}><strong>{resources.affordable ? (locale === "ko" ? "투자 가능" : "Affordable") : (locale === "ko" ? "재화 부족" : "Shortfall")}</strong><span>{locale === "ko" ? "가상 투자 비용" : "Simulated cost"}: {spent.gold.toLocaleString()} G · {spent.stone.toLocaleString()} C</span>{!resources.affordable && <small>{locale === "ko" ? "추가 필요" : "Need"} {resources.shortage.gold.toLocaleString()} G · {resources.shortage.stone.toLocaleString()} C</small>}</div>
      <div className="v3-history-actions"><button type="button" onClick={() => dispatch({ type: "clearSimulatedRanks" })} disabled={!Object.keys(state.simulatedRanks).length}>{locale === "ko" ? "전체 계획 취소" : "Clear plan"}</button><button className="v49-tree-reset-open" type="button" onClick={() => setTreeResetOpen(true)} disabled={!hasResettableTreeProgress}>{locale === "ko" ? "트리 전체 초기화" : "Reset full tree"}</button><button type="button" onClick={() => dispatch({ type: "undo" })} disabled={!history.past.length}>{locale === "ko" ? "실행 취소" : "Undo"}</button><button type="button" onClick={() => dispatch({ type: "redo" })} disabled={!history.future.length}>{locale === "ko" ? "다시 실행" : "Redo"}</button></div>
    </section>

    {shareNotice && <div className="v3-notice" role="status"><span>{shareNotice}</span><button type="button" onClick={() => setShareNotice(undefined)}>×</button></div>}
    {treeResetOpen && <div className="v49-reset-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTreeResetOpen(false); }}><section className="v49-reset-dialog" role="dialog" aria-modal="true" aria-labelledby="v49-reset-title"><small>{locale === "ko" ? "되돌릴 수 있는 초기화" : "UNDOABLE RESET"}</small><h2 id="v49-reset-title">{locale === "ko" ? "다이스 트리를 전부 초기화할까요?" : "Reset the entire Dice Tree?"}</h2><p>{locale === "ko" ? "실제로 찍은 랭크와 가상 계획을 초기화하고, 게임에서 처음 열려 있는 기본 주사위 5개는 유지합니다. 입력한 골드·코어와 시뮬레이터 설정은 유지되며 실행 취소로 복원할 수 있습니다." : "Owned ranks and simulated plans return to the starter unlocks. Gold, Core, and simulator settings are preserved, and Undo can restore the tree."}</p><div><button type="button" onClick={() => setTreeResetOpen(false)}>{locale === "ko" ? "취소" : "Cancel"}</button><button type="button" className="is-danger" onClick={resetTree}>{locale === "ko" ? "트리 전체 초기화" : "Reset full tree"}</button></div></section></div>}
    {commandOpen && <div className="v48-command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}><section className="v48-command-palette" role="dialog" aria-modal="true" aria-label={locale === "ko" ? "통합 검색" : "Universal search"}><header><input autoFocus aria-label={locale === "ko" ? "통합 검색어" : "Universal search query"} value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && commandResults[0]) openCommandResult(commandResults[0]); }} placeholder={locale === "ko" ? "화면, 주사위, 노드, 효과 검색" : "Search views, dice, nodes, effects"} /><kbd>ESC</kbd></header><div>{commandResults.map((entry) => <button key={entry.id} type="button" onClick={() => openCommandResult(entry)}><span>{entry.kind === "tab" ? (locale === "ko" ? "화면" : "View") : entry.kind === "dice" ? (locale === "ko" ? "주사위" : "Dice") : (locale === "ko" ? "노드" : "Node")}</span><b>{entry.label}</b>{"effect" in entry && entry.effect ? <small>{entry.effect}</small> : null}</button>)}</div><footer>{locale === "ko" ? "Enter로 이동 · Esc로 닫기" : "Enter to open · Esc to close"}</footer></section></div>}
    {profileOpen && <ProfileManagerV3 locale={locale} state={state} activeDeckIds={activeDeckIds} deckGoal={deckGoal} spendProfile={spendProfile} digitalTwin={currentTwin} onLoad={loadProfile} onClose={() => setProfileOpen(false)} />}
    {shareComposerOpen && <ShareResultComposer locale={locale} title={shareTitle} note={shareNote} onTitleChange={setShareTitle} onNoteChange={setShareNote} onCreate={createResultShare} onClose={() => setShareComposerOpen(false)} />}

    {tab === "account" && <AccountIntelligenceView
      data={gameDataV3}
      locale={locale}
      state={state}
      input={currentInput}
      deckIds={activeDeckIds}
      twin={currentTwin}
      onTwinChange={setDigitalTwin}
      onApplyRanks={(ranks) => dispatch({ type: "applyRoute", ranks })}
      onDeckChange={setActiveDeckIds}
      onLocalAccount={openLocalAccount}
      onObservedAccountImport={importObservedAccount}
      onFullAccountImport={importFullAccount}
      onOpenTree={() => setTab("tree")}
      onOpenSimulator={() => setTab("simulator")}
    />}

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
          data={gameDataV3}
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
        onSetOwnedRank={(nodeId, rank) => dispatch({ type: "setOwnedRank", nodeId, rank })}
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

    {tab === "tier" && <TierMakerView data={gameDataV3} locale={locale} />}

    {tab === "compare" && <CompareWorkspace data={gameDataV3} locale={locale} baseInput={currentInput} />}

    {tab === "shop" && <PurchaseEfficiencyView locale={locale} />}
    {tab === "updates" && <UpdateCenterView data={gameDataV3} locale={locale} activeDeckIds={activeDeckIds} />}
  </div>;
}
