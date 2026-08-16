import { useMemo, useRef, useState, type CSSProperties, type PointerEvent, type WheelEvent } from "react";
import {
  familyLabel,
  formatNumber,
  rankCost,
  type Locale,
  type RD2Family,
  type RD2TreeNode,
} from "../../game-data/rd2Extracted";

interface ExactTreeCanvasProps {
  nodes: readonly RD2TreeNode[];
  locale: Locale;
  selectedNodeId?: number;
  plannedRanks: Record<number, number>;
  focusIds: Set<number>;
  query: string;
  familyFilter: RD2Family | "all";
  onSelect: (id: number) => void;
}

interface ViewState {
  x: number;
  y: number;
  scale: number;
}

const FAMILY_COLOR: Record<RD2Family, string> = {
  nature: "#28a96b",
  engineering: "#657388",
  magic: "#3b78df",
  order: "#7258cf",
  chaos: "#d95b72",
};

const FIT_VIEW: ViewState = { x: 0, y: 20, scale: 0.92 };
const VIEWBOX_WIDTH = 9800;
const VIEWBOX_HEIGHT = 7800;

function symbolFor(node: RD2TreeNode): string {
  if (node.nodeType === "DICE") return node.name.ko.replace(" 주사위", "").slice(0, 2);
  if (node.nodeType === "PERK") return "P";
  const kind = node.effectKind;
  if (/AtkSpeed/i.test(kind)) return "≫";
  if (/Crit/i.test(kind)) return "✦";
  if (/Attack|Dmg|Bullet/i.test(kind)) return "↑";
  if (/Hp/i.test(kind)) return "♥";
  if (/Sp/i.test(kind)) return "SP";
  if (node.nodeType === "DICE_RUNE") return "◆";
  return "•";
}

function rankCostLabel(node: RD2TreeNode, rank: number, locale: Locale) {
  const cost = rankCost(node, rank);
  const parts: string[] = [];
  if (cost.gold) parts.push(`${formatNumber(cost.gold)}G`);
  if (cost.nodeStone) parts.push(`${cost.nodeStone}${locale === "ko" ? " 코어" : " Core"}`);
  return parts.join(" · ");
}

function clampScale(value: number) {
  return Math.max(0.28, Math.min(2.4, value));
}

export function ExactTreeCanvas({
  nodes,
  locale,
  selectedNodeId,
  plannedRanks,
  focusIds,
  query,
  familyFilter,
  onSelect,
}: ExactTreeCanvasProps) {
  const [view, setView] = useState<ViewState>({ ...FIT_VIEW });
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const matches = useMemo(() => {
    const ids = new Set<number>();
    for (const node of nodes) {
      const familyOK = familyFilter === "all" || node.family === familyFilter;
      const text = `${node.name.ko} ${node.name.en} ${node.effectKind}`.toLocaleLowerCase();
      const queryOK = !normalizedQuery || text.includes(normalizedQuery);
      if (familyOK && queryOK) ids.add(node.id);
    }
    return ids;
  }, [familyFilter, nodes, normalizedQuery]);

  const pointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if ((event.target as Element).closest("[data-exact-node='true']")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const pointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    const rect = event.currentTarget.getBoundingClientRect();
    const unitsX = VIEWBOX_WIDTH / Math.max(1, rect.width);
    const unitsY = VIEWBOX_HEIGHT / Math.max(1, rect.height);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    setView((current) => ({
      ...current,
      x: current.x + (dx * unitsX) / current.scale,
      y: current.y + (dy * unitsY) / current.scale,
    }));
  };
  const pointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (drag.current?.id === event.pointerId) drag.current = null;
  };
  const wheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    setView((current) => ({ ...current, scale: clampScale(current.scale * Math.exp(-event.deltaY * 0.0012)) }));
  };

  return <div className="exact-tree-wrap">
    <svg
      className="exact-tree-svg"
      data-testid="tree-canvas"
      viewBox="-4900 -3900 9800 7800"
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onWheel={wheel}
      aria-label={locale === "ko" ? "인게임 데이터 기반 다이스 트리" : "In-game-data Dice Tree"}
    >
      <defs>
        <filter id="nodeShadow" x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="20" stdDeviation="24" floodColor="#332c55" floodOpacity=".16"/>
        </filter>
        <linearGradient id="focusEdge" x1="0" x2="1"><stop stopColor="#8d6cf0"/><stop offset="1" stopColor="#efbf66"/></linearGradient>
      </defs>
      <g data-testid="tree-transform" transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
        {nodes.flatMap((node) => node.nextNodeIds.map((nextId) => {
          const next = nodeMap.get(nextId);
          if (!next) return null;
          const focus = focusIds.has(node.id) && focusIds.has(next.id);
          const planned = Boolean(plannedRanks[node.id]) && Boolean(plannedRanks[next.id]);
          const dim = !matches.has(node.id) && !matches.has(next.id);
          return <line
            key={`${node.id}-${next.id}`}
            className={`exact-edge ${focus ? "is-focus" : ""} ${planned ? "is-planned" : ""} ${dim ? "is-dim" : ""}`}
            x1={node.position.x}
            y1={-node.position.y}
            x2={next.position.x}
            y2={-next.position.y}
          />;
        }))}

        {nodes.map((node) => {
          const rank = plannedRanks[node.id] ?? 0;
          const selected = selectedNodeId === node.id;
          const focus = focusIds.has(node.id);
          const dim = !matches.has(node.id);
          const color = FAMILY_COLOR[node.family];
          const x = node.position.x;
          const y = -node.position.y;
          const isDice = node.nodeType === "DICE";
          const isPerk = node.nodeType === "PERK";
          const radius = isDice ? 78 : isPerk || node.isBig ? 62 : 46;
          const nextRank = Math.min(node.maxRank, Math.max(1, rank + 1));
          const costLabel = rank < node.maxRank ? rankCostLabel(node, nextRank, locale) : "MAX";
          const accessible = `${node.name[locale] || node.name.ko}, ${familyLabel(node.family, locale)}`;

          return <g
            key={node.id}
            data-exact-node="true"
            data-testid={`node-${node.id}`}
            className={`exact-node exact-${node.nodeType.toLowerCase()} ${selected ? "is-selected" : ""} ${focus ? "is-focus" : ""} ${rank ? "is-planned" : ""} ${dim ? "is-dim" : ""}`}
            transform={`translate(${x} ${y})`}
            style={{ "--family": color } as CSSProperties}
            role="treeitem"
            tabIndex={dim ? -1 : 0}
            aria-label={accessible}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onSelect(node.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(node.id);
              }
            }}
          >
            {focus && <circle className="focus-pulse" r={radius + 28}/>} 
            {selected && <circle className="select-ring" r={radius + 17}/>} 
            {isDice
              ? <rect className="node-frame" x={-radius} y={-radius} width={radius * 2} height={radius * 2} rx="28"/>
              : isPerk
                ? <path className="node-frame" d={`M 0 ${-radius} L ${radius * .86} ${-radius * .5} L ${radius * .86} ${radius * .5} L 0 ${radius} L ${-radius * .86} ${radius * .5} L ${-radius * .86} ${-radius * .5} Z`}/>
                : <circle className="node-frame" r={radius}/>
            }
            {isDice
              ? <rect className="node-face" x={-radius + 9} y={-radius + 9} width={(radius - 9) * 2} height={(radius - 9) * 2} rx="22"/>
              : <circle className="node-face" r={radius - 9}/>
            }
            <text className={`node-symbol ${isDice ? "dice-symbol" : ""}`} textAnchor="middle" dominantBaseline="central">{symbolFor(node)}</text>
            {rank > 0 && <g className="rank-badge" transform={`translate(${radius - 3} ${-radius + 5})`}>
              <circle r="25"/><text textAnchor="middle" dominantBaseline="central">{rank === node.maxRank ? "M" : rank}</text>
            </g>}
            <g className="node-caption" transform={`translate(0 ${radius + 42})`}>
              <rect x="-110" y="-20" width="220" height="40" rx="20"/>
              <text textAnchor="middle" dominantBaseline="central">{costLabel || (locale === "ko" ? "무료" : "Free")}</text>
            </g>
          </g>;
        })}
      </g>
    </svg>

    <div className="exact-canvas-controls">
      <button type="button" onClick={() => setView((current) => ({ ...current, scale: clampScale(current.scale * .82) }))} aria-label="Zoom out">−</button>
      <button type="button" className="fit" onClick={() => setView({ ...FIT_VIEW })}>{locale === "ko" ? "전체 보기" : "Fit"}</button>
      <button type="button" onClick={() => setView((current) => ({ ...current, scale: clampScale(current.scale * 1.22) }))} aria-label="Zoom in">+</button>
    </div>
  </div>;
}
