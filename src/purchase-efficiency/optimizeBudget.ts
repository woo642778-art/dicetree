import { PURCHASE_PRODUCTS_V41, purchaseDisplayPrice, type PurchaseGoal, type PurchaseProduct } from "./products";

export interface BudgetCombinationInput {
  locale: "ko" | "en";
  budget: number;
  goal: PurchaseGoal;
  currentCore: number;
  targetCore: number;
}

export interface BudgetCombinationResult {
  products: PurchaseProduct[];
  spent: number;
  remainingBudget: number;
  rewards: { gold: number; core: number; redesignItem: number; other: number; diceSkin: number };
  targetAdditionalCore: number;
  reachesTarget: boolean;
  coreShortfall: number;
  coreWaste: number;
  valueIndex: number;
  evaluatedCombinations: number;
  nextUpgrade?: { extraSpend: number; valueGain: number };
}

function rewardTotals(products: readonly PurchaseProduct[]) {
  return products.reduce((total, product) => ({
    gold: total.gold + (product.rewards.gold ?? 0),
    core: total.core + (product.rewards.core ?? 0),
    redesignItem: total.redesignItem + (product.rewards.redesignItem ?? 0),
    other: total.other + (product.rewards.other ?? 0),
    diceSkin: total.diceSkin + (product.rewards.diceSkin ?? 0),
  }), { gold: 0, core: 0, redesignItem: 0, other: 0, diceSkin: 0 });
}

function valueIndex(products: readonly PurchaseProduct[], goal: PurchaseGoal) {
  const rewards = rewardTotals(products);
  const declared = products.reduce((sum, product) => sum + (product.clientEfficiency ?? 0), 0);
  if (goal === "core") return rewards.core * 100 + rewards.gold / 5_000 + declared;
  if (goal === "gold") return rewards.gold / 500 + rewards.core * 8 + declared;
  if (goal === "redesign") return rewards.redesignItem * 1_500 + rewards.core * 20 + declared;
  return declared + rewards.core * 18 + rewards.gold / 2_500 + rewards.redesignItem * 400 + rewards.other * 2 + rewards.diceSkin * 100;
}

function allCombinations(products: readonly PurchaseProduct[]) {
  const combinations: PurchaseProduct[][] = [];
  for (let mask = 0; mask < 2 ** products.length; mask += 1) {
    const combination: PurchaseProduct[] = [];
    for (let index = 0; index < products.length; index += 1) if (mask & (1 << index)) combination.push(products[index]);
    combinations.push(combination);
  }
  return combinations;
}

export function optimizePurchaseBudgetV47(input: BudgetCombinationInput, products: readonly PurchaseProduct[] = PURCHASE_PRODUCTS_V41): BudgetCombinationResult {
  const prices = new Map(products.map((product) => [product.id, purchaseDisplayPrice(product, input.locale).value]));
  const targetAdditionalCore = Math.max(0, Math.floor(input.targetCore) - Math.floor(input.currentCore));
  const candidates = allCombinations(products).map((selected) => {
    const spent = selected.reduce((sum, product) => sum + (prices.get(product.id) ?? 0), 0);
    const rewards = rewardTotals(selected);
    const reachesTarget = rewards.core >= targetAdditionalCore;
    return { selected, spent, rewards, reachesTarget, coreWaste: reachesTarget ? rewards.core - targetAdditionalCore : 0, coreShortfall: Math.max(0, targetAdditionalCore - rewards.core), value: valueIndex(selected, input.goal) };
  }).filter((candidate) => candidate.spent <= Math.max(0, input.budget));
  const anyReach = candidates.some((candidate) => candidate.reachesTarget);
  const ranked = [...candidates].sort((left, right) => {
    if (anyReach && left.reachesTarget !== right.reachesTarget) return left.reachesTarget ? -1 : 1;
    if (anyReach && left.reachesTarget && right.reachesTarget) {
      return left.coreWaste - right.coreWaste || left.spent - right.spent || right.value - left.value;
    }
    return left.coreShortfall - right.coreShortfall || right.value - left.value || left.spent - right.spent;
  });
  const best = ranked[0] ?? { selected: [], spent: 0, rewards: rewardTotals([]), reachesTarget: targetAdditionalCore === 0, coreWaste: 0, coreShortfall: targetAdditionalCore, value: 0 };

  const all = allCombinations(products).map((selected) => ({
    spent: selected.reduce((sum, product) => sum + (prices.get(product.id) ?? 0), 0),
    value: valueIndex(selected, input.goal),
  })).filter((candidate) => candidate.spent > best.spent && candidate.value > best.value)
    .sort((left, right) => left.spent - right.spent || right.value - left.value);
  const next = all[0];

  return {
    products: best.selected,
    spent: best.spent,
    remainingBudget: Math.max(0, input.budget - best.spent),
    rewards: best.rewards,
    targetAdditionalCore,
    reachesTarget: best.reachesTarget,
    coreShortfall: best.coreShortfall,
    coreWaste: best.coreWaste,
    valueIndex: Math.round(best.value),
    evaluatedCombinations: candidates.length,
    ...(next ? { nextUpgrade: { extraSpend: next.spent - best.spent, valueGain: Math.round(next.value - best.value) } } : {}),
  };
}
