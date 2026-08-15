import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { DiceFamily, LocalizedText, ResourceCostV2, ResourceId, ResourceInventory, SourcedField, TreeNodeV2 } from "../domain/types";
import { EMPTY_RESOURCES_V2, canAffordV2, sumV2Costs } from "../domain/costs";
import { useI18n } from "../i18n/I18nContext";
import { treeNodesV2 } from "../tree-data-v2/nodes";
import { diceV2 } from "../tree-data-v2/dice";
import { resourceDefinitions } from "../tree-data-v2/resources";
import { strategyNotes } from "../strategy/strategyNotes";
import { TreeCanvasV2 } from "../features/tree/TreeCanvasV2";

const DATA_VERSION = "v2-2026.08.15";

type Role = "dealer" | "support" | "balanced";
type Profile = "conservative" | "balanced" | "ceiling";
interface BuildStateV2 {
  schemaVersion: 2;
  dataVersion: string;
  planned: Record<string, 0 | 1>;
  inventory: ResourceInventory;
  primaryDieId: string;
  secondaryDieIds: string[];
  role: Role;
  profile: Profile;
}

const emptyBuild = (): BuildStateV2 => ({
  schemaVersion: 2,
  dataVersion: DATA_VERSION,
  planned: {},
  inventory: { ...EMPTY_RESOURCES_V2 },
  primaryDieId: "devourer",
  secondaryDieIds: ["corruption"],
  role: "dealer",
  profile: "conservative",
});

const FAMILY_LABEL: Record<DiceFamily, { ko: string; en: string }> = {
  nature: { ko: "자연", en: "Nature" },
  chaos: { ko: "혼돈", en: "Chaos" },
  order: { ko: "질서", en: "Order" },
  engineering: { ko: "공학", en: "Engineering" },
  magic: { ko: "마법", en: "Magic" },
};

const RESOURCE_SHORT: Record<ResourceId, string> = { gold: "G", blueCard: "B", redCard: "R", prismCube: "◇" };

function localized(field?: SourcedField<LocalizedText>, locale: "ko" | "en" = "ko", fallback = "") {
  return field?.value?.[locale] ?? field?.value?.ko ?? fallback;
}

function encodeState(state: BuildStateV2) {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return `v2.${btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")}`;
}

function decodeState(value: string): BuildStateV2 | null {
  try {
    if (!value.startsWith("v2.")) return null;
    let encoded = value.slice(3).replaceAll("-", "+").replaceAll("_", "/");
    while (encoded.length % 4) encoded += "=";
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<BuildStateV2>;
    if (parsed.schemaVersion !== 2 || !parsed.planned || !parsed.inventory || typeof parsed.primaryDieId !== "string") return null;
    return {
      ...emptyBuild(),
      ...parsed,
      planned: Object.fromEntries(Object.entries(parsed.planned).filter(([id, rank]) => treeNodesV2.some((node) => node.id === id) && rank === 1)) as Record<string, 0 | 1>,
      inventory: { ...EMPTY_RESOURCES_V2, ...parsed.inventory },
      secondaryDieIds: Array.isArray(parsed.secondaryDieIds) ? parsed.secondaryDieIds.filter((id) => diceV2.some((die) => die.id === id)) : [],
    };
  } catch {
    return null;
  }
}

function costText(cost: ResourceCostV2, locale: "ko" | "en") {
  const values: string[] = [];
  if (cost.gold) values.push(`${cost.gold.toLocaleString()} ${locale === "ko" ? "골드" : "Gold"}`);
  if (cost.blueCard) values.push(`${locale === "ko" ? "파란 재화" : "Blue"} ${cost.blueCard}`);
  if (cost.redCard) values.push(`${locale === "ko" ? "빨간 재화" : "Red"} ${cost.redCard}`);
  if (cost.prismCube) values.push(`${locale === "ko" ? "프리즘 재화" : "Prism"} ${cost.prismCube}`);
  return values.join(" · ");
}

function recommendationScore(node: TreeNodeV2, build: BuildStateV2) {
  if (!node.observedNextCost?.value || build.planned[node.id]) return -Infinity;
  const primary = diceV2.find((die) => die.id === build.primaryDieId);
  const secondary = build.secondaryDieIds.map((id) => diceV2.find((die) => die.id === id)).filter(Boolean);
  const focusFamilies = [primary?.family, ...secondary.map((die) => die?.family)].filter(Boolean) as DiceFamily[];
  let score = 0;
  if (node.tags.includes("global")) score += 7;
  if (node.family !== "core" && focusFamilies.includes(node.family)) score += 6;
  if (node.family !== "core" && focusFamilies.filter((family) => family === node.family).length > 1) score += 3;
  if (build.role === "dealer" && ["bullet-damage", "attack-speed", "speed", "combat", "rankable"].some((tag) => node.tags.includes(tag))) score += 3;
  if (node.tags.includes("capstone") || node.tags.includes("milestone")) score += build.profile === "ceiling" ? 3 : 0.4;
  const cost = node.observedNextCost.value;
  const normalized = (cost.gold ?? 0) / 1000 + (cost.blueCard ?? 0) * 4 + (cost.redCard ?? 0) * 7 + (cost.prismCube ?? 0) * 6;
  if (build.profile === "conservative") score -= normalized * 0.18;
  else if (build.profile === "balanced") score -= normalized * 0.1;
  else score -= normalized * 0.035;
  const confidence = node.observedNextCost.confidence;
  if (confidence === "partial" || confidence === "inferred") score -= 2;
  return score;
}

function ResourceGlyph({ id }: { id: ResourceId }) {
  if (id === "gold") return <span className="resource-art gold-art">●</span>;
  if (id === "prismCube") return <span className="resource-art prism-art">◆</span>;
  if (id === "redCard") return <span className="resource-art card-art red-art">▱</span>;
  return <span className="resource-art card-art blue-art">▱</span>;
}

export function App() {
  const { locale, setLocale } = useI18n();
  const [build, setBuild] = useState<BuildStateV2>(() => emptyBuild());
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [familyFilter, setFamilyFilter] = useState<DiceFamily | "all">("all");
  const [query, setQuery] = useState("");
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareWarning, setShareWarning] = useState(false);

  useEffect(() => {
    if (!window.location.hash.startsWith("#b=")) return;
    const restored = decodeState(decodeURIComponent(window.location.hash.slice(3)));
    if (!restored) { setShareWarning(true); return; }
    setBuild(restored);
  }, []);

  const selected = treeNodesV2.find((node) => node.id === selectedNodeId);
  const plannedNodes = useMemo(() => treeNodesV2.filter((node) => build.planned[node.id] && node.observedNextCost?.value), [build.planned]);
  const spent = useMemo(() => sumV2Costs(plannedNodes.map((node) => node.observedNextCost!.value!)), [plannedNodes]);
  const remaining: ResourceInventory = {
    gold: build.inventory.gold - spent.gold,
    blueCard: build.inventory.blueCard - spent.blueCard,
    redCard: build.inventory.redCard - spent.redCard,
    prismCube: build.inventory.prismCube - spent.prismCube,
  };
  const affordable = canAffordV2(build.inventory, spent);
  const recommendations = useMemo(() => treeNodesV2
    .map((node) => ({ node, score: recommendationScore(node, build) }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5), [build]);
  const recommendedIds = useMemo(() => new Set(recommendations.map((entry) => entry.node.id)), [recommendations]);
  const semanticBuild = useMemo(() => encodeState(build), [build]);

  const togglePlan = (node: TreeNodeV2) => {
    if (!node.observedNextCost?.value) return;
    setBuild((current) => ({ ...current, planned: { ...current.planned, [node.id]: current.planned[node.id] ? 0 : 1 } }));
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#b=${encodeURIComponent(semanticBuild)}`;
    setShareUrl(url);
    setShareOpen(true);
    try { await navigator.clipboard?.writeText(url); } catch { /* visible URL is the fallback */ }
  };

  const confidenceText = (node: TreeNodeV2) => {
    const cost = node.fieldConfidence.cost;
    const effect = node.fieldConfidence.effect;
    if (cost === "observed" && (effect === "observed" || effect === "verified" || effect === "partial")) return locale === "ko" ? "비용 확인 · 효과 일부 확인" : "Cost observed · effect partial";
    if (cost === "observed") return locale === "ko" ? "비용 확인 · 효과 상세 필요" : "Cost observed · effect detail needed";
    return locale === "ko" ? "위치 확인 · 상세 자료 필요" : "Position observed · detail needed";
  };

  return <div className="v2-app">
    <header className="v2-header">
      <div className="v2-brand">
        <span className="v2-logo"><i>RD</i><b>2</b></span>
        <div><strong>{locale === "ko" ? "랜덤다이스2 트리" : "Random Dice 2 Tree"}</strong><small>{locale === "ko" ? "실제 트리 기반 빌드 플래너" : "Screenshot-sourced build planner"}</small></div>
      </div>
      <nav className="v2-nav" aria-label="primary"><span className="active">{locale === "ko" ? "다이스 트리" : "Dice Tree"}</span><span>{locale === "ko" ? "전략" : "Strategy"}</span></nav>
      <div className="v2-header-actions">
        <button className="planner-pill" type="button" onClick={() => setPlannerOpen(true)}>{locale === "ko" ? "내 조건" : "My setup"}</button>
        <button className="share-pill" data-testid="share-button" type="button" onClick={share}>{locale === "ko" ? "공유" : "Share"}</button>
        <button className="locale-pill" type="button" onClick={() => setLocale(locale === "ko" ? "en" : "ko")}>{locale === "ko" ? "EN" : "KO"}</button>
      </div>
    </header>

    <section className="resource-rail" data-testid="resource-summary" aria-label={locale === "ko" ? "재화 현황" : "Resources"}>
      <div className="rail-kicker"><b>{locale === "ko" ? "가상 투자" : "Simulation"}</b><span>{plannedNodes.length}{locale === "ko" ? "개 노드" : " nodes"}</span></div>
      {resourceDefinitions.map((resource) => <div className="resource-pill-v2" key={resource.id} style={{ "--resource-accent": resource.accent } as CSSProperties}>
        <ResourceGlyph id={resource.id}/>
        <div><small>{localized(resource.name, locale)}</small><strong>{build.inventory[resource.id].toLocaleString()}</strong></div>
        {spent[resource.id] > 0 && <span className="spent-mark">−{spent[resource.id].toLocaleString()}</span>}
      </div>)}
      <div className={`budget-state ${affordable ? "ok" : "short"}`}><span>{affordable ? "✓" : "!"}</span>{affordable ? (locale === "ko" ? "현재 입력 재화 내" : "Within inventory") : (locale === "ko" ? "재화 부족" : "Shortfall")}</div>
    </section>

    {shareWarning && <div className="share-alert" data-testid="share-warning"><span>{locale === "ko" ? "공유 링크를 읽을 수 없어 새 플래너를 열었습니다." : "The shared build could not be read. A fresh planner was opened."}</span><button type="button" onClick={() => setShareWarning(false)}>×</button></div>}
    <output hidden aria-hidden="true" data-testid="semantic-build-hash">{semanticBuild}</output>

    <main className="v2-workspace">
      <section className="tree-shell">
        <div className="tree-toolbar">
          <div className="family-switcher">
            <button className={familyFilter === "all" ? "active" : ""} type="button" onClick={() => setFamilyFilter("all")}>{locale === "ko" ? "전체" : "All"}</button>
            {(Object.keys(FAMILY_LABEL) as DiceFamily[]).map((family) => <button className={familyFilter === family ? `active family-${family}` : `family-${family}`} key={family} type="button" onClick={() => setFamilyFilter(family)}>{FAMILY_LABEL[family][locale]}</button>)}
          </div>
          <label className="tree-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={locale === "ko" ? "노드·효과 검색" : "Search nodes & effects"}/></label>
        </div>
        <div className="tree-stage-v2">
          <div className="canvas-watermark"><b>{treeNodesV2.length}</b><span>{locale === "ko" ? "개 스크린샷 매핑 노드" : "screenshot-mapped nodes"}</span><i>{locale === "ko" ? "회색 노드도 위치·연결은 실제 사진 기준" : "Grey nodes still use screenshot-sourced geometry"}</i></div>
          <TreeCanvasV2
            nodes={treeNodesV2}
            selectedNodeId={selectedNodeId}
            plannedRanks={build.planned}
            recommendedIds={recommendedIds}
            familyFilter={familyFilter}
            query={query}
            locale={locale}
            onSelect={setSelectedNodeId}
          />
        </div>
      </section>

      <aside className={`node-sheet ${selected ? "has-node" : ""}`} data-testid="node-panel">
        {!selected ? <div className="sheet-empty"><div className="empty-orbit">◇</div><h2>{locale === "ko" ? "노드를 선택하세요" : "Select a node"}</h2><p>{locale === "ko" ? "사진에서 확인된 위치, 비용, 랭크와 추천 근거를 분리해서 보여줍니다." : "See screenshot-sourced position, cost, rank and strategy evidence separately."}</p></div> : <>
          <div className="sheet-topline"><span className={`family-dot family-${selected.family}`}/><span>{selected.family === "core" ? "CORE" : FAMILY_LABEL[selected.family][locale]}</span><small>{confidenceText(selected)}</small></div>
          <div className="sheet-title-row"><div className={`node-preview family-${selected.family}`}><span>{selected.iconKey?.value ? "◇" : "•"}</span></div><div><h2>{localized(selected.name, locale, locale === "ko" ? "노드 상세 확인 중" : "Node detail pending")}</h2><p>{selected.id}</p></div></div>

          {selected.effectSummary?.value ? <div className="effect-card"><span>{locale === "ko" ? "효과" : "Effect"}</span><strong>{localized(selected.effectSummary, locale)}</strong></div> : <div className="partial-card"><span>i</span><div><b>{locale === "ko" ? "위치와 연결은 확인됨" : "Position and route observed"}</b><p>{locale === "ko" ? "정확한 효과 문구는 상세창 자료가 확보되면 추가됩니다. 임의 수치를 사용하지 않습니다." : "Exact effect text will be added only after a current detail-panel source is available."}</p></div></div>}

          <div className="sheet-grid">
            <div><small>{locale === "ko" ? "게임 화면 랭크" : "Observed rank"}</small><strong>{selected.displayedRank?.value ? `${selected.displayedRank.value.current} / ${selected.displayedRank.value.max}` : "—"}</strong></div>
            <div><small>{locale === "ko" ? "관찰된 다음 비용" : "Observed next cost"}</small><strong>{selected.observedNextCost?.value ? costText(selected.observedNextCost.value, locale) : "—"}</strong></div>
          </div>
          {selected.observedNextCost?.value && <p className="rank-context">{locale === "ko" ? "이 비용은 사진에 표시된 현재 랭크에서 다음 1단계에 필요한 값입니다. 50/100레벨 전체 비용으로 반복 추정하지 않습니다." : "This is the next-step cost shown at the photographed rank. It is not repeated across unknown 50/100-rank ladders."}</p>}
          <button className={`plan-button ${build.planned[selected.id] ? "remove" : ""}`} type="button" disabled={!selected.observedNextCost?.value} onClick={() => togglePlan(selected)}>{!selected.observedNextCost?.value ? (locale === "ko" ? "비용 자료 필요" : "Cost data needed") : build.planned[selected.id] ? (locale === "ko" ? "가상 투자 취소" : "Remove planned step") : (locale === "ko" ? "다음 1단계 계획에 추가" : "Plan next step")}</button>

          <div className="recommend-block"><div className="section-label"><span>{locale === "ko" ? "다음 투자 후보" : "Next candidates"}</span><small>{locale === "ko" ? "관측 데이터 기반" : "observed data only"}</small></div>{recommendations.slice(0, 3).map((entry, index) => <button key={entry.node.id} type="button" className="recommend-row" onClick={() => setSelectedNodeId(entry.node.id)}><b>0{index + 1}</b><div><strong>{localized(entry.node.name, locale, locale === "ko" ? `${entry.node.family === "core" ? "코어" : FAMILY_LABEL[entry.node.family][locale]} 노드` : "Mapped node")}</strong><small>{entry.node.observedNextCost?.value ? costText(entry.node.observedNextCost.value, locale) : ""}</small></div><span>→</span></button>)}</div>

          {(() => { const note = strategyNotes.find((item) => (item.subject.type === "family" && item.subject.id === selected.family) || (item.subject.type === "node" && item.subject.id === selected.id)); return note ? <div className="strategy-note"><small>{locale === "ko" ? "커뮤니티 전략 메모" : "Community strategy note"}</small><p>{note.summary[locale]}</p><span>{locale === "ko" ? "공식 데이터와 분리됨" : "Separated from canonical facts"}</span></div> : null; })()}
        </>}
      </aside>
    </main>

    {plannerOpen && <div className="planner-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setPlannerOpen(false); }}><section className="planner-drawer"><div className="drawer-head"><div><small>{locale === "ko" ? "추천 조건" : "Recommendation setup"}</small><h2>{locale === "ko" ? "내 진행 상황" : "My progression"}</h2></div><button type="button" onClick={() => setPlannerOpen(false)}>×</button></div>
      <label className="drawer-field"><span>{locale === "ko" ? "주력 주사위" : "Primary die"}</span><select value={build.primaryDieId} onChange={(event) => setBuild((current) => ({ ...current, primaryDieId: event.target.value }))}>{diceV2.map((die) => <option value={die.id} key={die.id}>{localized(die.name, locale, die.id)}</option>)}</select></label>
      <div className="drawer-field"><span>{locale === "ko" ? "추천 성향" : "Progression profile"}</span><div className="profile-buttons">{(["conservative", "balanced", "ceiling"] as Profile[]).map((profile) => <button type="button" className={build.profile === profile ? "active" : ""} key={profile} onClick={() => setBuild((current) => ({ ...current, profile }))}>{profile === "conservative" ? (locale === "ko" ? "재화 절약" : "Efficient") : profile === "balanced" ? (locale === "ko" ? "균형" : "Balanced") : (locale === "ko" ? "고점" : "Ceiling")}</button>)}</div></div>
      <div className="drawer-field"><span>{locale === "ko" ? "현재 보유 재화" : "Current inventory"}</span><div className="inventory-grid">{resourceDefinitions.map((resource) => <label key={resource.id}><ResourceGlyph id={resource.id}/><small>{localized(resource.name, locale)}</small><input inputMode="numeric" min="0" type="number" value={build.inventory[resource.id]} onChange={(event) => setBuild((current) => ({ ...current, inventory: { ...current.inventory, [resource.id]: Math.max(0, Number(event.target.value) || 0) } }))}/></label>)}</div></div>
      <div className="budget-preview"><div><span>{locale === "ko" ? "계획 사용" : "Planned spend"}</span><strong>{Object.entries(spent).filter(([, value]) => value).map(([key, value]) => `${RESOURCE_SHORT[key as ResourceId]} ${value.toLocaleString()}`).join(" · ") || "0"}</strong></div><div><span>{locale === "ko" ? "남은 재화" : "Remaining"}</span><strong className={affordable ? "good" : "bad"}>{Object.entries(remaining).map(([key, value]) => `${RESOURCE_SHORT[key as ResourceId]} ${value.toLocaleString()}`).join(" · ")}</strong></div></div>
      <button className="drawer-done" type="button" onClick={() => setPlannerOpen(false)}>{locale === "ko" ? "적용" : "Apply"}</button>
    </section></div>}

    {shareOpen && <div className="share-popover-v2" data-testid="share-popover"><div><b>{locale === "ko" ? "빌드 링크" : "Build link"}</b><button type="button" onClick={() => setShareOpen(false)}>×</button></div><p>{locale === "ko" ? "로그인 없이 현재 가상 투자와 추천 조건을 그대로 공유합니다." : "Share planned investments and setup without an account."}</p><label><input data-testid="share-url" readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()}/><button type="button" onClick={() => navigator.clipboard?.writeText(shareUrl)}>{locale === "ko" ? "복사" : "Copy"}</button></label></div>}
  </div>;
}
