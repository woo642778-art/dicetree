import type { CSSProperties, KeyboardEvent } from "react";
import type { DiceTreeNodeV3 } from "../../../game-data/types";

const FAMILY_COLOR: Record<DiceTreeNodeV3["family"], string> = {
  core: "#6f5de7",
  nature: "#36a86d",
  chaos: "#db5e76",
  order: "#7259d2",
  engineering: "#7a8596",
  magic: "#3b7cde",
};

export interface TreeNodeV3Props {
  node: DiceTreeNodeV3;
  label: string;
  ownedRank: number;
  simulatedRank: number;
  selected: boolean;
  recommended: boolean;
  dimmed: boolean;
  canIncrement: boolean;
  onSelect: (nodeId: string) => void;
}

function glyphFor(node: DiceTreeNodeV3) {
  if (node.kind === "dice") return "◆";
  if (node.kind === "perk") return "P";
  if (node.kind === "milestone") return "✦";
  if (node.kind === "connector") return "•";
  return "↑";
}

function radiusFor(node: DiceTreeNodeV3) {
  if (node.kind === "dice") return 72;
  if (node.kind === "milestone") return 58;
  if (node.kind === "perk") return 52;
  if (node.kind === "connector") return 30;
  return 44;
}

export function TreeNodeV3({
  node,
  label,
  ownedRank,
  simulatedRank,
  selected,
  recommended,
  dimmed,
  canIncrement,
  onSelect,
}: TreeNodeV3Props) {
  const rank = Math.max(ownedRank, simulatedRank);
  const simulatedOnly = simulatedRank > ownedRank;
  const maxed = rank >= node.maxRank;
  const radius = radiusFor(node);
  const square = node.kind === "dice";
  const state = maxed ? "maxed" : rank > 0 ? (simulatedOnly ? "simulated" : "owned") : canIncrement ? "reachable" : "locked";
  const className = [
    "v3-tree-node",
    `v3-tree-node-${node.kind}`,
    `is-${state}`,
    selected ? "is-selected" : "",
    recommended ? "is-recommended" : "",
    dimmed ? "is-dimmed" : "",
  ].filter(Boolean).join(" ");

  const activate = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(node.id);
    }
  };

  return <g
    className={className}
    data-testid={`v3-node-${node.id}`}
    data-tree-node="true"
    data-node-state={state}
    data-can-increment={String(canIncrement)}
    data-owned-rank={ownedRank}
    data-simulated-rank={simulatedRank}
    transform={`translate(${node.position.x} ${-node.position.y})`}
    style={{ "--family": FAMILY_COLOR[node.family] } as CSSProperties}
    role="treeitem"
    tabIndex={dimmed ? -1 : 0}
    aria-label={`${label}, ${rank}/${node.maxRank}`}
    aria-selected={selected}
    onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => { event.stopPropagation(); onSelect(node.id); }}
    onKeyDown={activate}
  >
    {recommended && <circle className="v3-recommend-orbit" r={radius + 24} aria-hidden="true" />}
    {selected && <circle className="v3-selection-halo" r={radius + 15} aria-hidden="true" />}
    {square
      ? <rect className="v3-node-shell" x={-radius} y={-radius} width={radius * 2} height={radius * 2} rx="25" />
      : <circle className="v3-node-shell" r={radius} />}
    {square
      ? <rect className="v3-node-face" x={-radius + 8} y={-radius + 8} width={(radius - 8) * 2} height={(radius - 8) * 2} rx="20" />
      : <circle className="v3-node-face" r={Math.max(10, radius - 8)} />}
    <text className="v3-node-glyph" textAnchor="middle" dominantBaseline="central" aria-hidden="true">{glyphFor(node)}</text>
    {rank > 0 && <g className="v3-rank-chip" transform={`translate(${radius - 5} ${-radius + 5})`} aria-hidden="true">
      <circle r="24" />
      <text textAnchor="middle" dominantBaseline="central">{maxed ? "M" : rank}</text>
    </g>}
    {simulatedOnly && <circle className="v3-simulated-dot" cx={-radius + 5} cy={-radius + 5} r="10" aria-hidden="true" />}
  </g>;
}
