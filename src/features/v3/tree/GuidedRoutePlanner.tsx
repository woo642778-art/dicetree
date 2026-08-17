import { useMemo, useState } from "react";
import type { CanonicalGameData, TreeCost } from "../../../game-data/types";
import { formatGameText } from "../../../game-data/formatGameText";
import {
  planGuidedRouteV3,
  type GuidedRouteFocusV3,
  type GuidedRouteLengthV3,
  type GuidedRouteRoleV3,
  type GuidedRouteSettingsV3,
  type GuidedRouteStyleV3,
} from "../../../optimizer/planGuidedRouteV3";
import { DiceIcon } from "../shared/DiceIcon";

export interface GuidedRoutePlannerProps {
  data: CanonicalGameData;
  locale: "ko" | "en";
  selectedDiceId: string;
  currentRanks: Record<string, number>;
  budget: TreeCost;
  onApply: (ranks: Record<string, number>) => void;
  onSelectNode: (nodeId: string) => void;
  onClose: () => void;
}

function localized(data: CanonicalGameData, key: string | null | undefined, locale: "ko" | "en", fallback: string) {
  if (!key) return fallback;
  return data.localization[locale][key] ?? data.localization.ko[key] ?? data.localization.en[key] ?? fallback;
}

function diceName(data: CanonicalGameData, diceId: string, locale: "ko" | "en") {
  const dice = data.dice.find((candidate) => candidate.id === diceId);
  return localized(data, dice?.nameKey, locale, diceId);
}

function nodeName(data: CanonicalGameData, nodeId: string, locale: "ko" | "en") {
  const node = data.tree.find((candidate) => candidate.id === nodeId);
  return localized(data, node?.nameKey, locale, nodeId);
}

function nodeDescription(data: CanonicalGameData, nodeId: string, rank: number, locale: "ko" | "en") {
  const node = data.tree.find((candidate) => candidate.id === nodeId);
  if (!node) return nodeId;
  const raw = localized(data, node.descriptionKey, locale, node.passiveOrRuneRef ?? nodeId);
  let values: Array<number | string | null | undefined> = [];
  if (node.passiveOrRuneRef?.startsWith("passive:")) {
    const passive = data.passives.find((candidate) => candidate.id === node.passiveOrRuneRef?.slice("passive:".length));
    if (passive) values = [passive.baseValue === undefined || passive.baseValue === null ? null : passive.baseValue + (Math.max(1, rank) - 1) * (passive.valuePerRank ?? 0), passive.valuePerRank];
  } else if (node.passiveOrRuneRef?.startsWith("rune:")) {
    const rune = data.runes.find((candidate) => candidate.id === node.passiveOrRuneRef?.slice("rune:".length));
    if (rune) values = Object.entries(rune.values).filter(([key, value]) => /^Value\d*$|^Duration$/.test(key) && typeof value === "number").map(([, value]) => value as number);
  }
  const formatted = formatGameText(raw, locale, values);
  if (formatted.includes(locale === "ko" ? "미확인" : "Unknown")) {
    return locale === "ko" ? `${nodeName(data, nodeId, locale)} 효과를 확보합니다.` : `Unlocks the ${nodeName(data, nodeId, locale)} effect.`;
  }
  return formatted;
}

function formatCost(cost: TreeCost, locale: "ko" | "en") {
  const parts = [];
  if (cost.gold) parts.push(`${cost.gold.toLocaleString()} ${locale === "ko" ? "골드" : "Gold"}`);
  if (cost.stone) parts.push(`${cost.stone.toLocaleString()} ${locale === "ko" ? "코어" : "Core"}`);
  return parts.join(" · ") || (locale === "ko" ? "무료" : "Free");
}

const REASON_LABELS: Record<string, { ko: string; en: string }> = {
  "role-dealer": { ko: "딜러 역할에 맞춘 공격 기여도", en: "Attack contribution for the dealer role" },
  "role-support": { ko: "서포트 역할에 맞춘 운영 기여도", en: "Utility contribution for the support role" },
  "role-balanced": { ko: "공격과 운영의 균형", en: "Balance of offense and utility" },
  "focus-selected-dice": { ko: "선택 주사위 강화가 핵심 목표", en: "Selected-dice growth is the main focus" },
  "focus-damage": { ko: "대미지 증가가 핵심 목표", en: "Damage growth is the main focus" },
  "focus-attack-speed": { ko: "공격속도가 핵심 목표", en: "Attack speed is the main focus" },
  "focus-critical": { ko: "치명타가 핵심 목표", en: "Critical effects are the main focus" },
  "focus-economy": { ko: "SP와 성장 경제가 핵심 목표", en: "SP and growth economy are the main focus" },
  "focus-survival": { ko: "생존과 제어가 핵심 목표", en: "Survival and control are the main focus" },
  "focus-special": { ko: "고유 효과 강화가 핵심 목표", en: "Special mechanics are the main focus" },
  "style-efficient": { ko: "예산 대비 효율을 우선", en: "Prioritizes value per resource" },
  "style-power": { ko: "비용보다 영향력을 우선", en: "Prioritizes impact over cost" },
  "style-specialized": { ko: "선택 주사위 특화를 우선", en: "Prioritizes selected-dice specialization" },
  "prerequisite-complete": { ko: "모든 선행 노드를 구매 순서에 포함", en: "Includes every prerequisite in purchase order" },
  "budget-checked": { ko: "남은 재화 안에서 경로를 완주 가능", en: "Completable within remaining resources" },
  "slower-peak-power": { ko: "최고점 도달은 다소 느릴 수 있음", en: "May reach peak power more slowly" },
  "maximizes-early-value": { ko: "초반 재화 효율을 높임", en: "Improves early resource value" },
  "higher-resource-spikes": { ko: "일부 단계의 재화 부담이 큼", en: "Some steps have higher resource spikes" },
  "prioritizes-impact": { ko: "큰 효과를 먼저 확보", en: "Secures high-impact effects first" },
  "narrower-coverage": { ko: "다른 주사위에 대한 범용성은 낮음", en: "Offers less coverage for other dice" },
  "prioritizes-selected-dice": { ko: "선택 주사위 성능에 집중", en: "Concentrates on the selected dice" },
  "selected-dice": { ko: "선택 주사위 전용 효과", en: "Selected-dice effect" },
  "global-effect": { ko: "모든 덱에 적용되는 전역 효과", en: "Global effect for every deck" },
  "matching-family": { ko: "선택 주사위 계열과 일치", en: "Matches selected dice family" },
  "core-path": { ko: "후속 분기를 여는 중심 경로", en: "Core route unlocking later branches" },
  "required-prerequisite": { ko: "목표 노드에 필요한 선행 단계", en: "Required prerequisite for the target" },
  "selected-dice-path": { ko: "선택 주사위 노드로 이어지는 경로", en: "Path toward the selected-dice node" },
  "cost-efficient": { ko: "현재 예산 대비 효율 우선", en: "Prioritizes value within the budget" },
  "power-priority": { ko: "비용보다 영향력이 큰 효과 우선", en: "Prioritizes impact over cost" },
  "specialized-path": { ko: "선택 주사위 특화 경로", en: "Selected-dice specialization" },
  "damage-effect": { ko: "공격·불렛 대미지 계열", en: "Attack or bullet damage effect" },
  "speed-effect": { ko: "공격속도 계열", en: "Attack-speed effect" },
  "critical-effect": { ko: "치명타 계열", en: "Critical effect" },
  "economy-effect": { ko: "SP·소환·강화 비용 계열", en: "SP, summon, or upgrade economy" },
  "survival-effect": { ko: "생존·제어 계열", en: "Survival or control effect" },
};

function reasonLabel(code: string, locale: "ko" | "en") {
  return REASON_LABELS[code]?.[locale] ?? code.replace(/^focus-|^role-|^style-/, "");
}

interface RouteDraft {
  diceId: string;
  role: GuidedRouteRoleV3;
  focus: GuidedRouteFocusV3;
  style: GuidedRouteStyleV3;
  length: GuidedRouteLengthV3;
}

export function GuidedRoutePlanner({ data, locale, selectedDiceId, currentRanks, budget, onApply, onSelectNode, onClose }: GuidedRoutePlannerProps) {
  const [draft, setDraft] = useState<RouteDraft>({ diceId: selectedDiceId, role: "balanced", focus: "selected-dice", style: "efficient", length: "standard" });
  const [applied, setApplied] = useState<RouteDraft>(draft);
  const [variant, setVariant] = useState(0);
  const settings: GuidedRouteSettingsV3 = { ...applied, currentRanks, budget, variant };
  const plan = useMemo(() => planGuidedRouteV3(data, settings), [data, settings.diceId, settings.role, settings.focus, settings.style, settings.length, settings.currentRanks, settings.budget, settings.variant]);
  const selectedName = diceName(data, applied.diceId, locale);
  const isValid = Object.values(plan.validity).every(Boolean);

  return <aside className="v45-guided-route" data-testid="v45-guided-route" aria-label={locale === "ko" ? "맞춤 트리 루트" : "Guided tree route"}>
    <header>
      <div><small>{locale === "ko" ? "처음부터 끝까지" : "Start-to-finish"}</small><h2>{locale === "ko" ? "맞춤 트리 루트" : "Guided tree route"}</h2><p>{locale === "ko" ? "원하는 역할과 방향을 고르면 선행 노드, 순서, 비용, 남은 재화까지 한 번에 계산합니다." : "Choose a role and direction to calculate prerequisites, order, cost, and remaining resources."}</p></div>
      <button type="button" aria-label={locale === "ko" ? "맞춤 루트 닫기" : "Close guided route"} onClick={onClose}>×</button>
    </header>

    <section className="v45-route-settings">
      <h3>{locale === "ko" ? "원하는 방향" : "Desired direction"}</h3>
      <label>{locale === "ko" ? "중심 주사위" : "Primary dice"}<select value={draft.diceId} onChange={(event) => setDraft({ ...draft, diceId: event.target.value })}>{data.dice.map((dice) => <option key={dice.id} value={dice.id}>{diceName(data, dice.id, locale)}</option>)}</select></label>
      <label>{locale === "ko" ? "역할" : "Role"}<select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as GuidedRouteRoleV3 })}><option value="dealer">{locale === "ko" ? "딜러" : "Dealer"}</option><option value="support">{locale === "ko" ? "서포트" : "Support"}</option><option value="balanced">{locale === "ko" ? "균형" : "Balanced"}</option></select></label>
      <label>{locale === "ko" ? "핵심 목표" : "Primary focus"}<select value={draft.focus} onChange={(event) => setDraft({ ...draft, focus: event.target.value as GuidedRouteFocusV3 })}><option value="selected-dice">{locale === "ko" ? "선택 주사위 강화" : "Selected dice"}</option><option value="damage">{locale === "ko" ? "대미지" : "Damage"}</option><option value="attack-speed">{locale === "ko" ? "공격속도" : "Attack speed"}</option><option value="critical">{locale === "ko" ? "치명타" : "Critical"}</option><option value="economy">{locale === "ko" ? "SP·성장 경제" : "SP and economy"}</option><option value="survival">{locale === "ko" ? "생존·제어" : "Survival and control"}</option><option value="special">{locale === "ko" ? "고유 효과" : "Special mechanics"}</option></select></label>
      <label>{locale === "ko" ? "우선순위" : "Priority"}<select value={draft.style} onChange={(event) => setDraft({ ...draft, style: event.target.value as GuidedRouteStyleV3 })}><option value="efficient">{locale === "ko" ? "재화 효율" : "Resource efficiency"}</option><option value="power">{locale === "ko" ? "최대 영향력" : "Maximum impact"}</option><option value="specialized">{locale === "ko" ? "주사위 특화" : "Dice specialization"}</option></select></label>
      <label>{locale === "ko" ? "경로 길이" : "Route length"}<select value={draft.length} onChange={(event) => setDraft({ ...draft, length: event.target.value as GuidedRouteLengthV3 })}><option value="short">{locale === "ko" ? "짧게, 최대 8랭크" : "Short, up to 8 ranks"}</option><option value="standard">{locale === "ko" ? "표준, 최대 16랭크" : "Standard, up to 16 ranks"}</option><option value="long">{locale === "ko" ? "장기, 최대 30랭크" : "Long, up to 30 ranks"}</option></select></label>
      <button className="v45-route-generate" type="button" onClick={() => { setApplied(draft); setVariant(0); }}>{locale === "ko" ? "이 조건으로 전체 루트 만들기" : "Build full route with these settings"}</button>
    </section>

    <section className="v45-route-summary" data-testid="v45-route-summary">
      <header><DiceIcon diceId={applied.diceId} label={selectedName} /><div><small>{locale === "ko" ? `대안 ${variant + 1}` : `Alternative ${variant + 1}`}</small><strong>{selectedName} {locale === "ko" ? "추천 경로" : "recommended route"}</strong></div></header>
      <p>{plan.goal.reached
        ? (locale === "ko" ? "선택 주사위 전용 노드까지 도달하며, 이후 남은 예산은 설정한 역할과 효율 기준으로 배분합니다." : "Reaches a selected-dice node, then allocates remaining resources by role and efficiency settings.")
        : (locale === "ko" ? `현재 예산·길이 안에서는 전용 노드까지 완주할 수 없어, 해당 노드로 이어지는 선행 경로 ${plan.goal.progressSteps}단계를 먼저 확보합니다.` : `The dedicated node cannot be completed within this budget and length, so the plan first secures ${plan.goal.progressSteps} prerequisite steps toward it.`)}</p>
      <dl><div><dt>{locale === "ko" ? "총비용" : "Total cost"}</dt><dd>{formatCost(plan.totalCost, locale)}</dd></div><div><dt>{locale === "ko" ? "완료 후 잔액" : "Remaining"}</dt><dd>{plan.remaining.gold.toLocaleString()} G · {plan.remaining.stone.toLocaleString()} C</dd></div><div><dt>{locale === "ko" ? "구매 단계" : "Purchase steps"}</dt><dd>{plan.steps.length}</dd></div><div><dt>{locale === "ko" ? "목표 도달" : "Target reached"}</dt><dd>{plan.goal.reached ? (locale === "ko" ? "도달" : "Reached") : plan.goal.stopReason === "budget" ? (locale === "ko" ? "예산 부족" : "Budget limited") : plan.goal.stopReason === "length" ? (locale === "ko" ? "경로 길이 제한" : "Length limited") : (locale === "ko" ? "전용 노드 없음" : "No dedicated node")}</dd></div><div><dt>{locale === "ko" ? "근거 수준" : "Evidence level"}</dt><dd>{plan.confidence === "verified-effects" ? (locale === "ko" ? "효과 데이터 검증" : "Verified effect data") : (locale === "ko" ? "경로 구조 검증" : "Verified route structure")}</dd></div></dl>
      <div className="v45-route-validity"><span className={plan.validity.prerequisitesSatisfied ? "is-ok" : "is-bad"}>{locale === "ko" ? "선행 조건" : "Prerequisites"}</span><span className={plan.validity.exactCosts ? "is-ok" : "is-bad"}>{locale === "ko" ? "비용 합계" : "Exact costs"}</span><span className={plan.validity.withinBudget ? "is-ok" : "is-bad"}>{locale === "ko" ? "예산 이내" : "Within budget"}</span></div>
      <p className="v45-route-limit">{locale === "ko" ? "효과의 적용 대상과 비용은 데이터로 검증합니다. 공식이 미검증인 효과는 정확한 DPS 증가량으로 과장하지 않고 방향 추천에만 사용합니다." : "Effect scope and costs are data-verified. Unverified formulas influence route direction but are never presented as exact DPS gains."}</p>
    </section>

    <section className="v45-route-steps" data-testid="v45-route-steps">
      <h3>{locale === "ko" ? "전체 구매 순서" : "Complete purchase order"}</h3>
      {plan.steps.length ? <ol>{plan.steps.map((step) => <li key={`${step.order}:${step.nodeId}:${step.toRank}`} className={step.prerequisite ? "is-prerequisite" : "is-target"}>
        <button type="button" onClick={() => onSelectNode(step.nodeId)}><span>{step.order}</span><div><strong>{nodeName(data, step.nodeId, locale)} <b>Lv.{step.fromRank} → {step.toRank}</b></strong><small>{step.prerequisite ? (locale === "ko" ? "필수 선행 노드" : "Required prerequisite") : reasonLabel(step.reasons[0], locale)} · {formatCost(step.cost, locale)}</small><em>{nodeDescription(data, step.nodeId, step.toRank, locale)}</em></div></button>
      </li>)}</ol> : <div className="v45-route-empty"><strong>{locale === "ko" ? "현재 예산으로 만들 수 있는 경로가 없습니다." : "No route fits the current budget."}</strong><p>{locale === "ko" ? "상단의 남은 골드와 다이스 코어를 입력하거나 경로 길이와 우선순위를 바꿔 다시 추천받으세요." : "Enter remaining Gold and Dice Core above, or change route length and priority."}</p></div>}
    </section>

    <section className="v45-route-rationale">
      <h3>{locale === "ko" ? "왜 이 경로인가" : "Why this route"}</h3>
      <ul>{plan.summaryReasons.map((reason) => <li key={reason}>{reasonLabel(reason, locale)}</li>)}</ul>
      <h3>{locale === "ko" ? "감수하는 점" : "Tradeoffs"}</h3>
      <p>{plan.tradeoffs.map((tradeoff) => reasonLabel(tradeoff, locale)).join(" · ")}</p>
      <div className="v45-route-actions"><button type="button" onClick={() => setVariant((current) => (current + 1) % 3)}>{locale === "ko" ? "다른 타당한 경로 보기" : "Show another valid route"}</button><button type="button" disabled={!plan.steps.length || !isValid} onClick={() => onApply(plan.targetRanks)}>{locale === "ko" ? "전체 경로 가상 적용" : "Apply full route virtually"}</button></div>
    </section>
  </aside>;
}
