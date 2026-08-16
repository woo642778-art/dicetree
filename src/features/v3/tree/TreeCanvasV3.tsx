import { useMemo } from "react";
import type { DiceFamilyV3, DiceTreeNodeV3 } from "../../../game-data/types";
import { localizeGameKey } from "../../../game-data/load";
import { usePanZoom } from "../../tree/usePanZoom";
import { TreeNodeV3 } from "./TreeNodeV3";

export interface TreeCanvasV3Props {
  nodes: readonly DiceTreeNodeV3[];
  ownedRanks: Record<string, number>;
  simulatedRanks: Record<string, number>;
  selectedNodeId?: string;
  selectedDiceId?: string;
  recommendedIds?: ReadonlySet<string>;
  familyFilter?: DiceFamilyV3 | "all";
  query?: string;
  locale: "ko" | "en";
  onSelect: (nodeId: string) => void;
}

const FAMILY_LABEL: Record<DiceFamilyV3, { ko: string; en: string }> = {
  nature: { ko: "자연", en: "Nature" },
  chaos: { ko: "혼돈", en: "Chaos" },
  order: { ko: "질서", en: "Order" },
  engineering: { ko: "공학", en: "Engineering" },
  magic: { ko: "마법", en: "Magic" },
};

const FAMILY_ORDER: DiceFamilyV3[] = ["nature", "chaos", "order", "engineering", "magic"];
const INITIAL_VIEW = { x: 0, y: 0, scale: 0.92 };

function rankFor(
  nodeId: string,
  ownedRanks: Record<string, number>,
  simulatedRanks: Record<string, number>,
) {
  return Math.max(ownedRanks[nodeId] ?? 0, simulatedRanks[nodeId] ?? 0);
}

export function prerequisitesSatisfiedV3(
  node: DiceTreeNodeV3,
  ownedRanks: Record<string, number>,
  simulatedRanks: Record<string, number>,
) {
  return node.prerequisites.every((prerequisite) => (
    rankFor(prerequisite.nodeId, ownedRanks, simulatedRanks) >= prerequisite.minRank
  ));
}

export function canIncrementNodeV3(
  node: DiceTreeNodeV3,
  ownedRanks: Record<string, number>,
  simulatedRanks: Record<string, number>,
) {
  const current = rankFor(node.id, ownedRanks, simulatedRanks);
  return current < node.maxRank && prerequisitesSatisfiedV3(node, ownedRanks, simulatedRanks);
}

function boundsOf(nodes: readonly DiceTreeNodeV3[]) {
  if (!nodes.length) return { minX: -100, maxX: 100, minY: -100, maxY: 100, width: 200, height: 200 };
  const xs = nodes.map((node) => node.position.x);
  const ys = nodes.map((node) => -node.position.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

export function TreeCanvasV3({
  nodes,
  ownedRanks,
  simulatedRanks,
  selectedNodeId,
  selectedDiceId,
  recommendedIds = new Set<string>(),
  familyFilter = "all",
  query = "",
  locale,
  onSelect,
}: TreeCanvasV3Props) {
  const { view, setView, resetView, bind } = usePanZoom(INITIAL_VIEW);
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const bounds = useMemo(() => boundsOf(nodes), [nodes]);
  const margin = Math.max(260, Math.max(bounds.width, bounds.height) * 0.05);
  const viewBox = `${bounds.minX - margin} ${bounds.minY - margin} ${bounds.width + margin * 2} ${bounds.height + margin * 2}`;
  const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const visibleIds = useMemo(() => {
    const visible = new Set<string>();
    for (const node of nodes) {
      const familyMatches = familyFilter === "all" || node.family === "core" || node.family === familyFilter;
      const name = localizeGameKey(node.nameKey ?? undefined, locale, node.id);
      const description = localizeGameKey(node.descriptionKey ?? undefined, locale, "");
      const queryMatches = !normalizedQuery
        || `${name} ${description} ${node.id}`.toLocaleLowerCase().includes(normalizedQuery);
      if (familyMatches && queryMatches) visible.add(node.id);
    }
    return visible;
  }, [familyFilter, locale, nodes, normalizedQuery]);

  const jumpToNodes = (targets: readonly DiceTreeNodeV3[]) => {
    if (!targets.length) return;
    const targetX = targets.reduce((sum, node) => sum + node.position.x, 0) / targets.length;
    const targetY = targets.reduce((sum, node) => sum - node.position.y, 0) / targets.length;
    const scale = Math.max(1.15, view.scale);
    setView({
      x: (center.x - targetX) * scale,
      y: (center.y - targetY) * scale,
      scale,
    });
  };

  const selectedDiceNodes = selectedDiceId
    ? nodes.filter((node) => node.targetId === selectedDiceId || node.id === selectedDiceId)
    : [];

  const zoomBy = (delta: number) => setView((current) => ({
    ...current,
    scale: Math.min(2.5, Math.max(0.35, current.scale + delta)),
  }));

  return <div className="v3-tree-wrap">
    <svg
      className="v3-tree-canvas"
      data-testid="v3-tree-canvas"
      viewBox={viewBox}
      role="tree"
      aria-label={locale === "ko" ? "랜덤다이스2 인게임 다이스 트리" : "Random Dice 2 in-game Dice Tree"}
      {...bind}
    >
      <defs>
        <filter id="v3-node-shadow" x="-70%" y="-70%" width="240%" height="240%">
          <feDropShadow dx="0" dy="16" stdDeviation="18" floodColor="#302855" floodOpacity=".15" />
        </filter>
        <linearGradient id="v3-recommend-edge" x1="0" x2="1">
          <stop offset="0" stopColor="#765ce9" />
          <stop offset="1" stopColor="#e7b34e" />
        </linearGradient>
      </defs>
      <g data-testid="v3-tree-transform" transform={`translate(${view.x / view.scale} ${view.y / view.scale}) scale(${view.scale})`}>
        {nodes.flatMap((node) => node.prerequisites.map((prerequisite) => {
          const parent = byId.get(prerequisite.nodeId);
          if (!parent) return null;
          const parentRank = rankFor(parent.id, ownedRanks, simulatedRanks);
          const nodeRank = rankFor(node.id, ownedRanks, simulatedRanks);
          const parentSimulated = (simulatedRanks[parent.id] ?? 0) > (ownedRanks[parent.id] ?? 0);
          const nodeSimulated = (simulatedRanks[node.id] ?? 0) > (ownedRanks[node.id] ?? 0);
          const invested = parentRank >= prerequisite.minRank && nodeRank > 0;
          const simulated = invested && (parentSimulated || nodeSimulated);
          const recommended = recommendedIds.has(parent.id) && recommendedIds.has(node.id);
          const dimmed = !visibleIds.has(parent.id) && !visibleIds.has(node.id);
          return <line
            key={`${parent.id}-${node.id}`}
            data-testid={`v3-edge-${parent.id}-${node.id}`}
            className={`v3-tree-edge ${invested ? "is-invested" : ""} ${simulated ? "is-simulated" : ""} ${recommended ? "is-recommended" : ""} ${dimmed ? "is-dimmed" : ""}`}
            x1={parent.position.x}
            y1={-parent.position.y}
            x2={node.position.x}
            y2={-node.position.y}
          />;
        }))}
        {nodes.map((node) => {
          const ownedRank = ownedRanks[node.id] ?? 0;
          const simulatedRank = Math.max(ownedRank, simulatedRanks[node.id] ?? ownedRank);
          return <TreeNodeV3
            key={node.id}
            node={node}
            label={localizeGameKey(node.nameKey ?? undefined, locale, node.id)}
            ownedRank={ownedRank}
            simulatedRank={simulatedRank}
            selected={selectedNodeId === node.id}
            recommended={recommendedIds.has(node.id)}
            dimmed={!visibleIds.has(node.id)}
            canIncrement={canIncrementNodeV3(node, ownedRanks, simulatedRanks)}
            onSelect={onSelect}
          />;
        })}
      </g>
    </svg>

    <div className="v3-tree-family-jumps" aria-label={locale === "ko" ? "계열로 이동" : "Jump to family"}>
      {FAMILY_ORDER.map((family) => <button key={family} type="button" onClick={() => jumpToNodes(nodes.filter((node) => node.family === family))}>
        {FAMILY_LABEL[family][locale]}
      </button>)}
      {selectedDiceNodes.length > 0 && <button type="button" data-testid="jump-selected-dice" onClick={() => jumpToNodes(selectedDiceNodes)}>
        {locale === "ko" ? "선택 주사위" : "Selected dice"}
      </button>}
    </div>

    <div className="v3-tree-zoom-controls" aria-label={locale === "ko" ? "트리 보기 조절" : "Tree view controls"}>
      <button type="button" aria-label="Zoom out" onClick={() => zoomBy(-0.15)}>−</button>
      <button type="button" data-testid="v3-fit-tree" onClick={resetView}>{locale === "ko" ? "전체" : "Fit"}</button>
      <button type="button" aria-label="Zoom in" onClick={() => zoomBy(0.15)}>+</button>
    </div>
  </div>;
}
