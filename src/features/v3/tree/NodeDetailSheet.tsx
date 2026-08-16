import type { CanonicalGameData, DiceTreeNodeV3, PassiveDefinitionV3, RuneDefinitionV3 } from "../../../game-data/types";
import { localizeGameKey } from "../../../game-data/load";
import { nextRankCost } from "../../../planner-v3/costs";
import { effectiveRankV3 } from "../../../planner-v3/reducer";
import type { PlannerStateV3 } from "../../../planner-v3/types";
import type { CalculationTraceStepV3 } from "../../../simulation/engine/types";
import type { MarginalNodeResultV3 } from "../../../simulation/marginal/evaluateNode";
import { runeNumberAtRank } from "../../../simulation/mechanics/runeValues";
import { canIncrementNodeV3 } from "./TreeCanvasV3";
import { CalculationDetails } from "./CalculationDetails";

export interface NodeDetailSheetProps {
  node: DiceTreeNodeV3;
  data: CanonicalGameData;
  state: PlannerStateV3;
  locale: "ko" | "en";
  selectedDiceId?: string;
  marginal?: MarginalNodeResultV3;
  trace?: readonly CalculationTraceStepV3[];
  onSetSimulatedRank: (nodeId: string, rank: number) => void;
  onClose?: () => void;
}

interface EffectSnapshot {
  current?: number;
  next?: number;
  unit?: string;
  scope: string;
  sourceLabel: string;
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
      unit: passive.valueType ?? undefined,
      scope: passiveScope(passive, locale),
      sourceLabel: passive.id,
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
      sourceLabel: rune.id,
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

export function NodeDetailSheet({
  node,
  data,
  state,
  locale,
  selectedDiceId,
  marginal,
  trace = [],
  onSetSimulatedRank,
  onClose,
}: NodeDetailSheetProps) {
  const ownedRank = state.ownedRanks[node.id] ?? 0;
  const rank = effectiveRankV3(state, node.id);
  const cost = nextRankCost(node, rank);
  const effect = effectSnapshot(node, data, rank, locale);
  const name = localizeGameKey(node.nameKey ?? undefined, locale, node.id);
  const description = localizeGameKey(node.descriptionKey ?? undefined, locale, node.passiveOrRuneRef ?? node.id);
  const canIncrement = canIncrementNodeV3(node, state.ownedRanks, state.simulatedRanks);
  const canDecrement = rank > ownedRank;
  const prerequisiteRows = node.prerequisites.map((prerequisite) => {
    const prerequisiteNode = data.tree.find((candidate) => candidate.id === prerequisite.nodeId);
    return {
      id: prerequisite.nodeId,
      rank: prerequisite.minRank,
      label: prerequisiteNode ? localizeGameKey(prerequisiteNode.nameKey ?? undefined, locale, prerequisite.nodeId) : prerequisite.nodeId,
    };
  });

  return <aside className="v3-node-detail-sheet" data-testid="v3-node-detail-sheet" aria-label={name}>
    <header>
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
        <button type="button" aria-label={locale === "ko" ? "가상 랭크 올리기" : "Increase simulated rank"} disabled={!canIncrement} onClick={() => onSetSimulatedRank(node.id, rank + 1)}>+</button>
      </div>
    </section>

    <section className="v3-node-effect" data-testid="v3-node-effect">
      <h3>{locale === "ko" ? "효과" : "Effect"}</h3>
      {effect ? <>
        <div><span>{locale === "ko" ? "현재 효과" : "Current effect"}</span><strong>{formatNumber(effect.current)}{effect.unit ? ` ${effect.unit}` : ""}</strong></div>
        <div><span>{locale === "ko" ? "다음 랭크" : "Next rank"}</span><strong>{formatNumber(effect.next)}{effect.unit ? ` ${effect.unit}` : ""}</strong></div>
        {effect.current !== undefined && effect.next !== undefined && <div><span>{locale === "ko" ? "증가량" : "Delta"}</span><strong>+{formatNumber(effect.next - effect.current)}</strong></div>}
        <div><span>{locale === "ko" ? "적용 대상" : "Applies to"}</span><strong>{effect.scope}</strong></div>
        <small>{effect.sourceLabel}</small>
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

    <section className="v3-node-impact" data-testid="v3-node-impact">
      <h3>{locale === "ko" ? "선택 주사위 영향" : "Selected dice impact"}</h3>
      {!selectedDiceId ? <p>{locale === "ko" ? "주사위를 선택하면 투자 영향을 계산합니다." : "Select a dice to calculate investment impact."}</p>
        : marginal?.confidence === "verified" && marginal.beforeDps !== undefined && marginal.afterDps !== undefined
          ? <p><strong>{marginal.beforeDps.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> → <strong>{marginal.afterDps.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> DPS <em>+{marginal.percentGain?.toFixed(2)}%</em></p>
          : <p>{locale === "ko" ? "현재 공식은 부분 검증 상태라 정확한 DPS 증가는 표시하지 않습니다." : "The current formula is partial, so an exact DPS gain is not shown."}</p>}
    </section>

    <CalculationDetails trace={trace} locale={locale} />
  </aside>;
}
