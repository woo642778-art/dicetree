import { useRef, useState } from "react";
import type { CanonicalGameData, DiceTreeNodeV3, PassiveDefinitionV3, RuneDefinitionV3 } from "../../../game-data/types";
import { formatGameText, type GameTextValue } from "../../../game-data/formatGameText";
import { nextRankCost } from "../../../planner-v3/costs";
import { effectiveRankV3 } from "../../../planner-v3/reducer";
import type { PlannerStateV3 } from "../../../planner-v3/types";
import type { PlannedRouteV3 } from "../../../planner-v3/routes";
import type { CalculationTraceStepV3 } from "../../../simulation/engine/types";
import type { MarginalNodeResultV3 } from "../../../simulation/marginal/evaluateNode";
import { runeNumberAtRank } from "../../../simulation/mechanics/runeValues";
import { canIncrementNodeV3, prerequisitesSatisfiedV3 } from "./TreeCanvasV3";
import { CalculationDetails } from "./CalculationDetails";
import { DiceIcon } from "../shared/DiceIcon";
import type { TreeHeatmapEntryV3 } from "../../../optimizer/treeHeatmapV3";

export interface NodeDetailSheetProps {
  node: DiceTreeNodeV3;
  data: CanonicalGameData;
  state: PlannerStateV3;
  locale: "ko" | "en";
  selectedDiceId?: string;
  marginal?: MarginalNodeResultV3;
  heatmap?: TreeHeatmapEntryV3;
  trace?: readonly CalculationTraceStepV3[];
  route?: PlannedRouteV3 | null;
  routeAffordable?: boolean;
  onApplyRoute?: (ranks: Record<string, number>) => void;
  onCancelPlan?: () => void;
  onSetOwnedRank?: (nodeId: string, rank: number) => void;
  onSetSimulatedRank: (nodeId: string, rank: number) => void;
  onClose?: () => void;
}

interface EffectSnapshot {
  current?: number;
  next?: number;
  unit?: string;
  scope: string;
  templateValues: GameTextValue[];
}

function passiveValue(passive: PassiveDefinitionV3, rank: number) {
  if (rank <= 0 || passive.baseValue === undefined || passive.baseValue === null) return undefined;
  return passive.baseValue + (rank - 1) * (passive.valuePerRank ?? 0);
}

function passiveScope(passive: PassiveDefinitionV3, locale: "ko" | "en") {
  if (passive.scope === "global") return locale === "ko" ? "모든 주사위" : "All dice";
  if (passive.scope === "dice") return passive.targetDiceIds?.join(", ") || (locale === "ko" ? "지정 주사위" : "Target dice");
  const labels: Record<string, { ko: string; en: string }> = {
    order: { ko: "질서 계열", en: "Order family" }, chaos: { ko: "혼돈 계열", en: "Chaos family" },
    magic: { ko: "마법 계열", en: "Magic family" }, engineering: { ko: "공학 계열", en: "Engineering family" }, nature: { ko: "자연 계열", en: "Nature family" },
  };
  return labels[passive.scope]?.[locale] ?? passive.scope;
}

function runePrimaryValue(rune: RuneDefinitionV3, rank: number) {
  const keys = ["Value1", "Value", "Value0"].filter((key) => typeof rune.values[key] === "number");
  if (!keys.length || rank <= 0) return undefined;
  try {
    return runeNumberAtRank(rune, rank, keys[0]) ?? undefined;
  } catch {
    return undefined;
  }
}

function runeTemplateValues(rune: RuneDefinitionV3, rank: number): GameTextValue[] {
  const displayRank = Math.max(1, rank);
  const output: GameTextValue[] = [];
  for (const key of ["Value1", "Value2", "Duration"]) {
    if (typeof rune.values[key] !== "number") continue;
    output.push(runeNumberAtRank(rune, displayRank, key));
    const rankAdd = rune.values[`${key}_RankAdd`];
    if (typeof rankAdd === "number") output.push(rankAdd);
  }
  return output;
}

function effectSnapshot(
  node: DiceTreeNodeV3,
  data: CanonicalGameData,
  rank: number,
  locale: "ko" | "en",
): EffectSnapshot | undefined {
  const linked = node.passiveOrRuneRef;
  if (!linked) return undefined;
  if (linked.startsWith("passive:")) {
    const passive = data.passives.find((candidate) => candidate.id === linked.slice("passive:".length));
    if (!passive) return undefined;
    return {
      current: passiveValue(passive, rank),
      next: rank < node.maxRank ? passiveValue(passive, rank + 1) : undefined,
      unit: passive.valueType ? localized(data, passive.valueType, locale, passive.valueType) : undefined,
      scope: passiveScope(passive, locale),
      templateValues: [passiveValue(passive, Math.max(1, rank)), passive.valuePerRank],
    };
  }
  if (linked.startsWith("rune:")) {
    const rune = data.runes.find((candidate) => candidate.id === linked.slice("rune:".length));
    if (!rune) return undefined;
    const targets = rune.targetDiceIds?.length ? rune.targetDiceIds : rune.targetDiceId ? [rune.targetDiceId] : [];
    return {
      current: runePrimaryValue(rune, rank),
      next: rank < node.maxRank ? runePrimaryValue(rune, rank + 1) : undefined,
      scope: targets.length ? targets.join(", ") : (locale === "ko" ? "연결 룬 효과" : "Linked rune effect"),
      templateValues: runeTemplateValues(rune, rank),
    };
  }
  return undefined;
}

function formatNumber(value: number | undefined) {
  if (value === undefined) return "—";
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatCost(gold: number, stone: number, locale: "ko" | "en") {
  const parts: string[] = [];
  if (gold) parts.push(`${gold.toLocaleString()} ${locale === "ko" ? "골드" : "Gold"}`);
  if (stone) parts.push(`${stone.toLocaleString()} ${locale === "ko" ? "다이스 코어" : "Dice Core"}`);
  return parts.length ? parts.join(" · ") : (locale === "ko" ? "무료" : "Free");
}

function localized(data: CanonicalGameData, key: string | null | undefined, locale: "ko" | "en", fallback: string) {
  if (!key) return fallback;
  return data.localization[locale][key] ?? data.localization.ko[key] ?? data.localization.en[key] ?? fallback;
}

export function NodeDetailSheet({
  node,
  data,
  state,
  locale,
  selectedDiceId,
  marginal,
  heatmap,
  trace = [],
  route,
  routeAffordable,
  onApplyRoute,
  onCancelPlan,
  onSetOwnedRank,
  onSetSimulatedRank,
  onClose,
}: NodeDetailSheetProps) {
  const [snap, setSnap] = useState<25 | 55 | 90>(55);
  const dragStartY = useRef<number | undefined>(undefined);
  const ownedRank = state.ownedRanks[node.id] ?? 0;
  const rank = effectiveRankV3(state, node.id);
  const cost = nextRankCost(node, rank);
  const effect = effectSnapshot(node, data, rank, locale);
  const name = localized(data, node.nameKey, locale, node.id);
  const rawDescription = localized(data, node.descriptionKey, locale, node.passiveOrRuneRef ?? node.id);
  const description = formatGameText(rawDescription, locale, effect?.templateValues);
  const canIncrement = canIncrementNodeV3(node, state.ownedRanks, state.simulatedRanks);
  const canDecrement = rank > ownedRank;
  const canIncrementOwned = ownedRank < node.maxRank
    && prerequisitesSatisfiedV3(node, state.ownedRanks, {});
  const minimumOwnedRank = node.kind === "dice" && node.prerequisites.length === 0 ? 1 : 0;
  const canDecrementOwned = ownedRank > minimumOwnedRank && !data.tree.some((candidate) => (
    (state.ownedRanks[candidate.id] ?? 0) > 0
    && candidate.prerequisites.some((prerequisite) => (
      prerequisite.nodeId === node.id && prerequisite.minRank > ownedRank - 1
    ))
  ));
  const routeHasPrerequisites = route?.steps.some((step) => !step.target) ?? false;
  // Virtual planning remains available when the entered inventory is short.
  // Prerequisite legality is still enforced by the route builder and reducer.
  const canApplyRoute = Boolean(route?.steps.length && onApplyRoute);
  const canUseIncrementControl = route ? canApplyRoute : canIncrement;
  const incrementLabel = routeHasPrerequisites
    ? (locale === "ko" ? "선행 노드 포함 가상 구매" : "Buy with prerequisite nodes")
    : (locale === "ko" ? "가상 랭크 올리기" : "Increase simulated rank");
  const prerequisiteRows = node.prerequisites.map((prerequisite) => {
    const prerequisiteNode = data.tree.find((candidate) => candidate.id === prerequisite.nodeId);
    return {
      id: prerequisite.nodeId,
      rank: prerequisite.minRank,
      label: prerequisiteNode ? localized(data, prerequisiteNode.nameKey, locale, prerequisite.nodeId) : prerequisite.nodeId,
    };
  });

  const finishSheetDrag = (clientY: number) => {
    if (dragStartY.current === undefined) return;
    const delta = clientY - dragStartY.current;
    dragStartY.current = undefined;
    if (delta > 90 && snap === 25) onClose?.();
    else if (delta > 55) setSnap(snap === 90 ? 55 : 25);
    else if (delta < -55) setSnap(snap === 25 ? 55 : 90);
  };

  return <aside className="v3-node-detail-sheet" data-snap={snap} data-testid="v3-node-detail-sheet" aria-label={name}>
    <div className="v53-detail-handle" onPointerDown={(event) => {
      if ((event.target as HTMLElement).closest("button")) return;
      dragStartY.current = event.clientY;
      event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerUp={(event) => finishSheetDrag(event.clientY)}>
      <span aria-hidden="true" />
      <div aria-label={locale === "ko" ? "상세 높이" : "Detail height"}>{([25, 55, 90] as const).map((value) => <button key={value} type="button" className={snap === value ? "is-active" : ""} onClick={() => setSnap(value)}>{value}%</button>)}</div>
    </div>
    <header>
      {node.kind === "dice" && node.targetId && <DiceIcon diceId={node.targetId} label={name} className="v42-detail-dice" loading="eager" />}
      <div>
        <small>{locale === "ko" ? "다이스 트리" : "Dice Tree"}</small>
        <h2>{name}</h2>
        <p>{description}</p>
      </div>
      {onClose && <button type="button" aria-label={locale === "ko" ? "닫기" : "Close"} onClick={onClose}>×</button>}
    </header>

    <section className="v3-node-rank" aria-label={locale === "ko" ? "랭크" : "Rank"}>
      <div><span>{locale === "ko" ? "현재" : "Current"}</span><strong>{rank} / {node.maxRank}</strong></div>
      <div><span>{locale === "ko" ? "보유" : "Owned"}</span><strong>{ownedRank}</strong></div>
      <div className="v3-rank-controls">
        <button type="button" aria-label={locale === "ko" ? "가상 랭크 내리기" : "Decrease simulated rank"} disabled={!canDecrement} onClick={() => onSetSimulatedRank(node.id, rank - 1)}>−</button>
        <button type="button" aria-label={incrementLabel} disabled={!canUseIncrementControl} onClick={() => {
          if (canApplyRoute && route) onApplyRoute?.(route.targetRanks);
          else onSetSimulatedRank(node.id, rank + 1);
        }}>+</button>
      </div>
    </section>

    {onSetOwnedRank && <section className="v481-owned-rank" aria-label={locale === "ko" ? "실제 보유 트리" : "Owned tree input"}>
      <div>
        <h3>{locale === "ko" ? "실제 보유 트리" : "Owned tree"}</h3>
        <p>{locale === "ko" ? "게임에서 이미 가진 랭크만 기록합니다. 재화는 차감하지 않습니다." : "Record ranks already owned in game. This does not spend resources."}</p>
      </div>
      <div className="v481-owned-controls">
        <button type="button" aria-label={locale === "ko" ? "보유 랭크 내리기" : "Decrease owned rank"} disabled={!canDecrementOwned} onClick={() => onSetOwnedRank(node.id, ownedRank - 1)}>−</button>
        <strong>{ownedRank} / {node.maxRank}</strong>
        <button type="button" aria-label={locale === "ko" ? "보유 랭크 올리기" : "Increase owned rank"} disabled={!canIncrementOwned} onClick={() => onSetOwnedRank(node.id, ownedRank + 1)}>+</button>
      </div>
      {!canIncrementOwned && ownedRank < node.maxRank && <small>{locale === "ko" ? "실제 보유 선행 노드를 먼저 기록해 주세요." : "Record the owned prerequisite ranks first."}</small>}
    </section>}

    <section className="v3-node-effect" data-testid="v3-node-effect">
      <h3>{locale === "ko" ? "효과" : "Effect"}</h3>
      {effect ? <>
        <div><span>{locale === "ko" ? "현재 효과" : "Current effect"}</span><strong>{formatNumber(effect.current)}{effect.unit ? ` ${effect.unit}` : ""}</strong></div>
        <div><span>{locale === "ko" ? "다음 랭크" : "Next rank"}</span><strong>{formatNumber(effect.next)}{effect.unit ? ` ${effect.unit}` : ""}</strong></div>
        {effect.current !== undefined && effect.next !== undefined && <div><span>{locale === "ko" ? "증가량" : "Delta"}</span><strong>+{formatNumber(effect.next - effect.current)}</strong></div>}
        <div><span>{locale === "ko" ? "적용 대상" : "Applies to"}</span><strong>{effect.scope}</strong></div>
      </> : <p>{description}</p>}
    </section>

    <section className="v3-node-cost" data-testid="v3-next-cost">
      <h3>{locale === "ko" ? "다음 비용" : "Next cost"}</h3>
      <strong>{cost ? formatCost(cost.gold, cost.stone, locale) : "MAX"}</strong>
    </section>

    <section className="v3-node-prerequisites">
      <h3>{locale === "ko" ? "선행 조건" : "Prerequisites"}</h3>
      {prerequisiteRows.length ? <ul>{prerequisiteRows.map((row) => <li key={row.id}>{row.label} <strong>Lv.{row.rank}</strong></li>)}</ul> : <p>{locale === "ko" ? "없음" : "None"}</p>}
    </section>

    <section className="v4-route-plan" data-testid="v4-route-plan">
      <h3>{routeHasPrerequisites
        ? (locale === "ko" ? "선행 노드 포함 구매 경로" : "Purchase route with prerequisites")
        : (locale === "ko" ? "다음 랭크 직접 구매" : "Direct next-rank purchase")}</h3>
      {route?.steps.length ? <>
        <ol>{route.steps.map((step) => {
          const routeNode = data.tree.find((candidate) => candidate.id === step.nodeId);
          const label = routeNode ? localized(data, routeNode.nameKey, locale, step.nodeId) : step.nodeId;
          return <li key={step.nodeId} className={step.target ? "is-target" : ""}>
            <span>{label}</span><strong>Lv.{step.fromRank} → {step.toRank}</strong>
          </li>;
        })}</ol>
        <div className="v4-route-total"><span>{locale === "ko" ? "경로 총비용" : "Total route cost"}</span><strong>{formatCost(route.totalCost.gold, route.totalCost.stone, locale)}</strong></div>
        {!routeHasPrerequisites && <p className="is-affordable">{locale === "ko" ? "선행 조건 충족. 이 노드를 바로 구매할 수 있습니다." : "Prerequisites met. This node can be purchased directly."}</p>}
        <p className={routeAffordable ? "is-affordable" : "is-short"}>{routeAffordable
          ? (locale === "ko" ? "현재 남은 재화로 적용 가능합니다." : "Affordable with remaining resources.")
          : (locale === "ko" ? "재화가 부족해도 가상 계획은 적용할 수 있습니다. 정확한 부족분은 상단 재화 영역에 표시됩니다." : "You can still apply this virtual plan. The exact shortfall appears in the resource rail.")}</p>
        {onApplyRoute && <button className="v4-route-apply" type="button" disabled={!canApplyRoute} onClick={() => onApplyRoute(route.targetRanks)}>{routeHasPrerequisites
          ? (locale === "ko" ? "선행 노드 포함 가상 구매" : "Buy route with prerequisites")
          : (locale === "ko" ? "이 노드 가상 구매" : "Buy this node virtually")}</button>}
      </> : <p>{locale === "ko" ? "추가로 구매할 랭크가 없습니다." : "No additional ranks are required."}</p>}
      {canDecrement && onCancelPlan && <button className="v4-route-cancel" type="button" onClick={onCancelPlan}>{locale === "ko" ? "이 노드 계획 취소" : "Cancel this node plan"}</button>}
    </section>

    <section className="v3-node-impact" data-testid="v3-node-impact">
      <h3>{locale === "ko" ? "선택 주사위 영향" : "Selected dice impact"}</h3>
      {!selectedDiceId ? <p>{locale === "ko" ? "주사위를 선택하면 투자 영향을 계산합니다." : "Select a dice to calculate investment impact."}</p>
        : marginal?.confidence === "verified" && marginal.beforeDps !== undefined && marginal.afterDps !== undefined
          ? <p><strong>{marginal.beforeDps.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> → <strong>{marginal.afterDps.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> DPS <em>+{marginal.percentGain?.toFixed(2)}%</em></p>
          : <p>{locale === "ko" ? "현재 공식은 부분 검증 상태라 정확한 DPS 증가는 표시하지 않습니다." : "The current formula is partial, so an exact DPS gain is not shown."}</p>}
    </section>

    <section className="v52-node-roi" data-testid="v52-node-roi">
      <h3>{locale === "ko" ? "노드 효율과 도달 효율" : "Node and path efficiency"}</h3>
      {heatmap?.confidence === "verified" && heatmap.percentGain !== undefined ? <>
        <div><span>{locale === "ko" ? "노드 자체 비용" : "Node-only cost"}</span><strong>{formatCost(heatmap.nodeCost.gold, heatmap.nodeCost.stone, locale)}</strong></div>
        <div><span>{locale === "ko" ? "선행 포함 총비용" : "Path-inclusive cost"}</span><strong>{formatCost(heatmap.routeCost.gold, heatmap.routeCost.stone, locale)}</strong></div>
        <div><span>{locale === "ko" ? "예상 DPS 증가" : "Expected DPS gain"}</span><strong>+{heatmap.percentGain.toFixed(2)}%</strong></div>
        <div><span>{locale === "ko" ? "경로 파레토 등급" : "Path Pareto grade"}</span><strong className={`is-grade-${heatmap.grade.toLowerCase()}`}>{heatmap.grade}</strong></div>
        <p>{locale === "ko" ? "이 트리는 모든 선행 조건이 AND 관계라 같은 목표 랭크까지의 합법적 최소 경로는 하나입니다. 최소 Gold·Core·총재화 경로가 같으며, 등급은 다른 목표 노드 경로와 비교한 파레토 결과입니다." : "All prerequisites are AND constraints, so a target rank has one legal minimum closure. Minimum Gold, Core, and total-resource routes coincide; the grade is its Pareto result against other targets."}</p>
      </> : <p>{locale === "ko" ? "히트맵을 ‘선행 경로 포함’으로 선택하면 검증된 노드의 자체 비용과 실제 도달 총비용을 분리해 표시합니다." : "Choose the path-inclusive heatmap to separate node-only cost from the true prerequisite-inclusive cost."}</p>}
    </section>

    <CalculationDetails trace={trace} locale={locale} />
  </aside>;
}
