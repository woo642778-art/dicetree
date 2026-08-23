import { useMemo, useState } from "react";
import type { CanonicalGameData } from "../../../game-data/types";
import type { PlannerStateV3 } from "../../../planner-v3/types";
import { projectResources, simulatedInvestmentCost } from "../../../planner-v3/costs";
import type { SimulationInputV3 } from "../../../simulation/engine/types";
import type { UserDigitalTwinV48 } from "../../../account/digitalTwinV48";
import { rankRunesForDiceV52, solveMultiStepBuildV52, solveWaveGoalV52, type MultiStepBuildPlanV52 } from "../../../optimizer/accountOptimizerV52";
import { planTimeCashGoalV51 } from "../../../purchase-efficiency/planTimeCashGoal";
import { PURCHASE_PRODUCTS_V41 } from "../../../purchase-efficiency/products";
import { planPerformanceBudgetV52 } from "../../../purchase-efficiency/planPerformanceBudgetV52";
import { compareBuildSnapshotsV52, createBuildSnapshotV52, loadBuildSnapshotsV52, saveBuildSnapshotV52, type BuildSnapshotV52 } from "../../../account/buildTimeMachineV52";

function dps(value: number | null) {
  return value === null ? "—" : value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function arrivalDay(cost: { gold: number; stone: number }, current: { gold: number; stone: number }, daily: { gold: number; stone: number }) {
  const wait = (need: number, have: number, income: number) => need <= have ? 0 : income > 0 ? Math.ceil((need - have) / income) : Number.POSITIVE_INFINITY;
  return Math.max(wait(cost.gold, current.gold, daily.gold), wait(cost.stone, current.stone, daily.stone));
}

export function OptimizationSuiteV52({ data, locale, state, input, deckIds, twin, onTwinChange, onApplyRanks }: {
  data: CanonicalGameData;
  locale: "ko" | "en";
  state: PlannerStateV3;
  input: SimulationInputV3;
  deckIds: string[];
  twin: UserDigitalTwinV48;
  onTwinChange: (next: UserDigitalTwinV48) => void;
  onApplyRanks: (ranks: Record<string, number>) => void;
}) {
  const spent = useMemo(() => simulatedInvestmentCost(data.tree, state), [data.tree, state]);
  const remaining = useMemo(() => projectResources(state.inventory, spent).remaining, [spent, state.inventory]);
  const [targetDps, setTargetDps] = useState(Math.max(1, twin.goal.targetDps ?? 5_000_000));
  const [days, setDays] = useState(14);
  const [depth, setDepth] = useState<1 | 5 | 10 | 20>(10);
  const [cashBudget, setCashBudget] = useState(Math.max(0, twin.goal.maxSpendKrw ?? 0));
  const [plan, setPlan] = useState<MultiStepBuildPlanV52>();
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [wave, setWave] = useState(100);
  const [baseHp, setBaseHp] = useState(100_000);
  const [snapshots, setSnapshots] = useState<BuildSnapshotV52[]>(() => loadBuildSnapshotsV52());
  const [snapshotLabel, setSnapshotLabel] = useState(locale === "ko" ? "현재 빌드" : "Current build");
  const available = {
    gold: Math.max(0, remaining.gold) + twin.resources.dailyGold * days,
    stone: Math.max(0, remaining.stone) + twin.resources.dailyCore * days,
  };
  const runeCandidates = useMemo(() => rankRunesForDiceV52(data, input.diceId, ownedOnly ? new Set(twin.ownedRuneIds ?? []) : undefined).slice(0, 10), [data, input.diceId, ownedOnly, twin.ownedRuneIds]);
  const waveResult = useMemo(() => solveWaveGoalV52(input, data, wave, baseHp), [baseHp, data, input, wave]);
  const timeCash = useMemo(() => {
    if (!plan?.steps.length) return undefined;
    return planTimeCashGoalV51({
      locale, budget: cashBudget, currentGold: Math.max(0, remaining.gold), currentCore: Math.max(0, remaining.stone),
      targetGold: plan.totalCost.gold, targetCore: plan.totalCost.stone,
      dailyGold: twin.resources.dailyGold, dailyCore: twin.resources.dailyCore, maxDays: Math.max(0, days), preference: "min-spend",
    }, PURCHASE_PRODUCTS_V41.filter((product) => product.rewardEvidence !== "price-only"));
  }, [cashBudget, days, locale, plan, remaining.gold, remaining.stone, twin.resources.dailyCore, twin.resources.dailyGold]);
  const comparison = snapshots.length >= 2 ? compareBuildSnapshotsV52(snapshots.at(-2)!, snapshots.at(-1)!) : undefined;
  const cashPower = useMemo(() => plan ? planPerformanceBudgetV52({ locale, cashBudget, availableGold: available.gold, availableCore: available.stone, route: plan }, PURCHASE_PRODUCTS_V41) : undefined, [available.gold, available.stone, cashBudget, locale, plan]);
  const roadmap = plan?.steps.map((step) => ({
    ...step,
    day: arrivalDay(step.cumulativeCost, { gold: Math.max(0, remaining.gold), stone: Math.max(0, remaining.stone) }, { gold: twin.resources.dailyGold, stone: twin.resources.dailyCore }),
    name: data.tree.find((node) => node.id === step.nodeId)?.nameKey,
  })) ?? [];

  const run = () => {
    const next = solveMultiStepBuildV52(input, data, { targetDps, budget: available, maxSteps: depth, bannedNodeIds: twin.preferences.bannedNodeIds });
    setPlan(next);
    onTwinChange({ ...twin, goal: { ...twin.goal, targetDps, maxSpendKrw: cashBudget } });
  };
  const toggleRune = (runeId: string) => {
    const set = new Set(twin.ownedRuneIds ?? []);
    if (set.has(runeId)) set.delete(runeId); else set.add(runeId);
    onTwinChange({ ...twin, ownedRuneIds: [...set] });
  };
  const capture = () => {
    const snapshot = createBuildSnapshotV52(data, state, input, deckIds, snapshotLabel);
    setSnapshots(saveBuildSnapshotV52(snapshot));
  };

  return <section className="v52-optimization-suite" data-testid="v52-optimization-suite">
    <header><div><small>ACCOUNT OPTIMIZER · V5.2</small><h2>{locale === "ko" ? "목표 역산 최적 빌드" : "Reverse target build optimizer"}</h2><p>{locale === "ko" ? "다음 하나가 아니라 최대 20번의 합법적인 투자를 빔 탐색으로 비교합니다." : "Beam-searches up to 20 legal investments instead of choosing only the next one."}</p></div><span>{plan?.confidence === "verified" ? (locale === "ko" ? "검증 계산" : "Verified") : (locale === "ko" ? "부분 검증" : "Partial")}</span></header>
    <div className="v52-goal-grid">
      <label>{locale === "ko" ? "목표 DPS" : "Target DPS"}<input aria-label={locale === "ko" ? "V52 목표 DPS" : "V52 target DPS"} type="number" min="1" value={targetDps} onChange={(event) => setTargetDps(Math.max(1, Number(event.target.value) || 1))} /></label>
      <label>{locale === "ko" ? "성장 기간" : "Growth horizon"}<select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label>
      <label>{locale === "ko" ? "탐색 깊이" : "Search depth"}<select aria-label={locale === "ko" ? "투자 탐색 깊이" : "Investment search depth"} value={depth} onChange={(event) => setDepth(Number(event.target.value) as 1 | 5 | 10 | 20)}><option value="1">1</option><option value="5">5</option><option value="10">10</option><option value="20">20</option></select></label>
      <label>{locale === "ko" ? "현금 예산" : "Cash budget"}<input type="number" min="0" value={cashBudget} onChange={(event) => setCashBudget(Math.max(0, Number(event.target.value) || 0))} /></label>
      <div><span>{locale === "ko" ? `${days}일 내 사용 가능` : `Available in ${days} days`}</span><strong>{available.gold.toLocaleString()} G · {available.stone.toLocaleString()} C</strong></div>
      <button type="button" onClick={run}>{locale === "ko" ? "1·5·10·20단계 역산" : "Solve 1/5/10/20 steps"}</button>
    </div>
    {plan && <div className="v52-plan-result">
      <section className="v52-plan-summary"><div><span>{locale === "ko" ? "현재" : "Current"}</span><strong>{dps(plan.baselineDps)}</strong></div><i>→</i><div><span>{locale === "ko" ? "예상" : "Projected"}</span><strong>{dps(plan.achievedDps)}</strong></div><div><span>{locale === "ko" ? "결과" : "Result"}</span><b>{plan.reached ? (locale === "ko" ? "목표 달성" : "Reached") : (locale === "ko" ? "목표 미달" : "Short")}</b></div><small data-testid="v52-evaluated-states">{plan.evaluatedStates.toLocaleString()} {locale === "ko" ? "개 상태 비교" : "states evaluated"}</small></section>
      <div className="v52-checkpoint-chart">{plan.checkpoints.map((point) => <article key={point.step}><span>{locale === "ko" ? `다음 ${point.step}개` : `Next ${point.step}`}</span><i style={{ height: `${Math.max(8, Math.min(100, point.gainPercent))}%` }} /><strong>+{point.gainPercent.toFixed(2)}%</strong><small>{point.cost.gold.toLocaleString()} G · {point.cost.stone} C</small></article>)}</div>
      <ol data-testid="v52-plan-steps">{plan.steps.map((step) => <li key={`${step.order}:${step.nodeId}`}><b>{step.order}</b><div><strong>{locale === "ko" ? `노드 ${step.nodeId}` : `Node ${step.nodeId}`} <em>Lv.{step.fromRank}→{step.toRank}</em></strong><p>{step.reason[locale]}</p>{step.routeSteps.length > 1 && <small className="v52-route-sequence">{locale === "ko" ? "실행 순서" : "Execution order"}: {step.routeSteps.map((routeStep) => `${routeStep.nodeId} ${routeStep.fromRank}→${routeStep.toRank}`).join(" → ")}</small>}<small>{step.cumulativeCost.gold.toLocaleString()} G · {step.cumulativeCost.stone} C · DPS {dps(step.dpsAfter)}</small></div><span>+{step.gainPercent.toFixed(2)}%</span></li>)}</ol>
      {plan.steps.at(-1) && <button type="button" onClick={() => onApplyRanks(plan.steps.at(-1)!.targetRanks)}>{locale === "ko" ? "전체 경로 가상 적용" : "Preview complete route"}</button>}
      <section className="v52-growth-roadmap" data-testid="v52-growth-roadmap"><header><div><small>7 · 14 · 30 DAY ROADMAP</small><h3>{locale === "ko" ? `${days}일 성장 실행표` : `${days}-day growth roadmap`}</h3></div><span>{locale === "ko" ? "완료할 때마다 현재 상태에서 재탐색" : "Re-solve from current state after completion"}</span></header><ol>{roadmap.map((step) => {
        const nodeName = step.name ? data.localization[locale][step.name] ?? step.nodeId : step.nodeId;
        const reachable = Number.isFinite(step.day) && step.day <= days;
        return <li key={`roadmap:${step.order}:${step.nodeId}`} className={reachable ? "is-reachable" : "is-later"}><time>{Number.isFinite(step.day) ? `Day ${step.day}` : "∞"}</time><div><strong>{nodeName} Lv.{step.toRank}</strong><small>{step.cumulativeCost.gold.toLocaleString()} G · {step.cumulativeCost.stone} C · DPS {dps(step.dpsAfter)}</small></div><button type="button" onClick={() => { onApplyRanks(step.targetRanks); setPlan(undefined); }}>{locale === "ko" ? "여기까지 완료" : "Complete through here"}</button></li>;
      })}</ol><p>{locale === "ko" ? "Day는 입력한 현재 잔액과 하루 수급량으로 계산합니다. 수급량이 0인 재화가 부족하면 ∞로 표시하며, 완료 버튼은 해당 단계까지 합법적인 선행 노드를 함께 적용합니다." : "Day estimates use current balances and entered daily income. A missing resource with zero income is shown as infinite; completion applies every legal prerequisite through that step."}</p></section>
      {timeCash && <aside className="v52-performance-spend"><strong>{locale === "ko" ? "최소 과금으로 이 성능 경로 준비" : "Minimum-spend preparation"}</strong><p>{timeCash.products.length ? timeCash.products.map((product) => product.nameKo).join(" + ") : (locale === "ko" ? "구매 없이 파밍" : "Farm without purchases")}</p><b>{locale === "ko" ? `결제 ${timeCash.spent.toLocaleString()}원 · ${timeCash.projectedDays}일` : `$${timeCash.spent.toFixed(2)} · ${timeCash.projectedDays} days`}</b><small>{locale === "ko" ? "상품 보상은 수량이 확인된 상품만 사용합니다. 성능 계산 신뢰도는 위 경로와 동일합니다." : "Uses only packages with known reward quantities. Performance confidence matches the route above."}</small></aside>}
      {cashPower && <aside className="v52-performance-spend is-inverse"><strong>{locale === "ko" ? "이 예산으로 어디까지 강해지나" : "Power reachable with this budget"}</strong><p>{cashPower.products.length ? cashPower.products.map((product) => product.nameKo).join(" + ") : (locale === "ko" ? "구매 없이 현재 파밍 재화 사용" : "Use farmed resources without purchases")}</p><b>{locale === "ko" ? `${cashPower.spent.toLocaleString()}원 · ${cashPower.reachedStep}/${plan.steps.length}단계 · DPS ${dps(cashPower.reachedDps)}` : `$${cashPower.spent.toFixed(2)} · ${cashPower.reachedStep}/${plan.steps.length} steps · DPS ${dps(cashPower.reachedDps)}`}</b><small>{locale === "ko" ? `보상이 확인된 1회 구매 조합 ${cashPower.evaluatedCombinations.toLocaleString()}개를 전수 비교했습니다. 이 결과는 위에서 생성한 목표 경로 안에서의 최적 조합입니다.` : `Exhaustively compared ${cashPower.evaluatedCombinations.toLocaleString()} known-reward one-copy combinations. This is optimal within the solved target route above.`}</small></aside>}
    </div>}

    <div className="v52-lab-grid">
      <section className="v52-rune-lab"><header><div><small>RUNE LAB · 153 ROWS</small><h3>{locale === "ko" ? "보유 룬 최적 후보" : "Owned-rune candidates"}</h3></div><label><input type="checkbox" checked={ownedOnly} onChange={(event) => setOwnedOnly(event.target.checked)} />{locale === "ko" ? "내가 가진 룬만" : "Owned only"}</label></header>{runeCandidates.length ? <ol>{runeCandidates.map((rune, index) => <li key={rune.runeId}><button type="button" className={(twin.ownedRuneIds ?? []).includes(rune.runeId) ? "is-owned" : ""} onClick={() => toggleRune(rune.runeId)}>{index + 1}</button><div><strong>{rune.kind}</strong><small>{rune.reason[locale]}</small></div><b>{rune.primaryValue ?? "—"}</b><span>{rune.score}</span></li>)}</ol> : <p>{locale === "ko" ? "보유 룬을 먼저 표시하세요." : "Mark owned runes first."}</p>}<footer>{locale === "ko" ? "룬 적용 순서가 미검증인 경우 정확한 DPS 대신 대상 적합도와 직접 효과 점수를 표시합니다." : "When rune ordering is unresolved, target relevance and direct-effect scores replace fabricated DPS."}</footer></section>

      <section className="v52-wave-solver"><header><small>WAVE GOAL SOLVER</small><h3>{locale === "ko" ? "목표 웨이브 역산" : "Reverse wave target"}</h3></header><label>{locale === "ko" ? "목표 웨이브" : "Target wave"}<input type="number" min="1" max="999" value={wave} onChange={(event) => setWave(Math.max(1, Number(event.target.value) || 1))} /></label><label>{locale === "ko" ? "기준 웨이브 HP" : "Base wave HP"}<input type="number" min="1" value={baseHp} onChange={(event) => setBaseHp(Math.max(1, Number(event.target.value) || 1))} /></label><dl><div><dt>{locale === "ko" ? "현재 예상" : "Current estimate"}</dt><dd>Wave {waveResult.estimatedCurrentWave ?? "—"}</dd></div><div><dt>{locale === "ko" ? "필요 DPS" : "Required DPS"}</dt><dd>{dps(waveResult.requiredDps)}</dd></div><div><dt>{locale === "ko" ? "추가 필요" : "Required gain"}</dt><dd>{waveResult.requiredGainPercent === null ? "—" : `${waveResult.requiredGainPercent.toFixed(1)}%`}</dd></div></dl><p>{locale === "ko" ? `웨이브 표의 HP ${waveResult.basis.hpIncreasePercent}% / ${waveResult.basis.interval}구간 증가를 사용한 부분 검증 모델입니다. 기준 HP는 사용자가 입력해야 합니다.` : `Partial model using the wave table's ${waveResult.basis.hpIncreasePercent}% HP increase every ${waveResult.basis.interval} intervals. Base HP is user-supplied.`}</p></section>

      <section className="v52-time-machine"><header><small>BUILD TIME MACHINE</small><h3>{locale === "ko" ? "성장 기록" : "Build history"}</h3></header><div><input value={snapshotLabel} onChange={(event) => setSnapshotLabel(event.target.value)} /><button type="button" onClick={capture}>{locale === "ko" ? "현재 저장" : "Save now"}</button></div>{comparison && <article><strong>{comparison.days}{locale === "ko" ? "일 변화" : " day change"}</strong><span>{comparison.goldDelta >= 0 ? "+" : ""}{comparison.goldDelta.toLocaleString()} G · {comparison.coreDelta >= 0 ? "+" : ""}{comparison.coreDelta} C</span><b>{comparison.dpsPercent === null ? "DPS —" : `DPS ${comparison.dpsPercent >= 0 ? "+" : ""}${comparison.dpsPercent.toFixed(1)}%`}</b><small>{locale === "ko" ? `새 노드 랭크 ${comparison.addedNodeRanks}개` : `${comparison.addedNodeRanks} added node ranks`}</small></article>}<ol>{snapshots.slice(-6).reverse().map((snapshot) => <li key={snapshot.id}><time>{snapshot.at.slice(0, 10)}</time><strong>{snapshot.label}</strong><span>{dps(snapshot.dps)} DPS</span></li>)}</ol></section>
    </div>
  </section>;
}
