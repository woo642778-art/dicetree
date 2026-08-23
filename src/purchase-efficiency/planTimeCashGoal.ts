import { PURCHASE_PRODUCTS_V41, purchaseDisplayPrice, type PurchaseProduct } from "./products";

export type TimeCashPreference = "min-spend" | "balanced" | "fastest";

export interface TimeCashGoalInput {
  locale: "ko" | "en";
  budget: number;
  currentGold: number;
  targetGold: number;
  currentCore: number;
  targetCore: number;
  dailyGold: number;
  dailyCore: number;
  maxDays: number;
  preference: TimeCashPreference;
}

export interface TimeCashGoalPlan {
  products: PurchaseProduct[];
  spent: number;
  remainingBudget: number;
  reachesTarget: boolean;
  farmingDays: number | null;
  projectedDays: number;
  purchased: { gold: number; core: number };
  farmed: { gold: number; core: number };
  final: { gold: number; core: number };
  shortfall: { gold: number; core: number };
  surplus: { gold: number; core: number };
  farmingOnlyDays: number | null;
  timeSavedDays: number | null;
  evaluatedCombinations: number;
  burdenScore: number;
}

interface Candidate {
  products: PurchaseProduct[];
  spent: number;
  purchased: { gold: number; core: number };
  requiredDays: number;
  reachesTarget: boolean;
  projectedDays: number;
  final: { gold: number; core: number };
  shortfall: { gold: number; core: number };
  surplus: { gold: number; core: number };
  burdenScore: number;
  gapScore: number;
}

function whole(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function nonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function combinations(products: readonly PurchaseProduct[]) {
  const result: PurchaseProduct[][] = [];
  const visit = (index: number, selected: PurchaseProduct[]) => {
    if (index === products.length) {
      result.push([...selected]);
      return;
    }
    visit(index + 1, selected);
    selected.push(products[index]);
    visit(index + 1, selected);
    selected.pop();
  };
  visit(0, []);
  return result;
}

function daysForResource(shortfall: number, dailyIncome: number) {
  if (shortfall <= 0) return 0;
  if (dailyIncome <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil(shortfall / dailyIncome);
}

function requiredFarmingDays(
  current: { gold: number; core: number },
  target: { gold: number; core: number },
  purchased: { gold: number; core: number },
  daily: { gold: number; core: number },
) {
  return Math.max(
    daysForResource(target.gold - current.gold - purchased.gold, daily.gold),
    daysForResource(target.core - current.core - purchased.core, daily.core),
  );
}

function compareNumbers(left: number, right: number) {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Finds the best one-copy package combination while treating play time as a
 * resource. A plan succeeds only when both Gold and Dice Core targets are met.
 */
export function planTimeCashGoalV51(
  rawInput: TimeCashGoalInput,
  products: readonly PurchaseProduct[] = PURCHASE_PRODUCTS_V41,
): TimeCashGoalPlan {
  const input = {
    ...rawInput,
    budget: nonNegative(rawInput.budget),
    currentGold: whole(rawInput.currentGold),
    targetGold: whole(rawInput.targetGold),
    currentCore: whole(rawInput.currentCore),
    targetCore: whole(rawInput.targetCore),
    dailyGold: whole(rawInput.dailyGold),
    dailyCore: whole(rawInput.dailyCore),
    maxDays: whole(rawInput.maxDays),
  };
  const current = { gold: input.currentGold, core: input.currentCore };
  const target = { gold: input.targetGold, core: input.targetCore };
  const daily = { gold: input.dailyGold, core: input.dailyCore };
  const farmingOnlyRequired = requiredFarmingDays(current, target, { gold: 0, core: 0 }, daily);
  const prices = new Map(products.map((product) => [product.id, purchaseDisplayPrice(product, input.locale).value]));
  const targetGap = {
    gold: Math.max(1, target.gold - current.gold),
    core: Math.max(1, target.core - current.core),
  };

  const candidates: Candidate[] = combinations(products).map((selected) => {
    const spent = selected.reduce((sum, product) => sum + (prices.get(product.id) ?? 0), 0);
    const purchased = selected.reduce((sum, product) => ({
      gold: sum.gold + (product.rewards.gold ?? 0),
      core: sum.core + (product.rewards.core ?? 0),
    }), { gold: 0, core: 0 });
    const requiredDays = requiredFarmingDays(current, target, purchased, daily);
    const reachesTarget = requiredDays <= input.maxDays;
    const projectedDays = reachesTarget ? requiredDays : input.maxDays;
    const final = {
      gold: current.gold + purchased.gold + daily.gold * projectedDays,
      core: current.core + purchased.core + daily.core * projectedDays,
    };
    const shortfall = {
      gold: Math.max(0, target.gold - final.gold),
      core: Math.max(0, target.core - final.core),
    };
    const surplus = {
      gold: Math.max(0, final.gold - target.gold),
      core: Math.max(0, final.core - target.core),
    };
    const spendRatio = input.budget > 0 ? spent / input.budget : spent > 0 ? 1 : 0;
    const dayRatio = input.maxDays > 0 ? projectedDays / input.maxDays : projectedDays > 0 ? 1 : 0;
    const wastePenalty = (surplus.gold / targetGap.gold + surplus.core / targetGap.core) * 0.01;
    const burdenScore = spendRatio * 0.5 + dayRatio * 0.5 + wastePenalty;
    const gapScore = shortfall.gold / targetGap.gold + shortfall.core / targetGap.core;
    return { products: selected, spent, purchased, requiredDays, reachesTarget, projectedDays, final, shortfall, surplus, burdenScore, gapScore };
  }).filter((candidate) => candidate.spent <= input.budget);

  const feasible = candidates.filter((candidate) => candidate.reachesTarget);
  const pool = feasible.length ? feasible : candidates;
  const ranked = [...pool].sort((left, right) => {
    if (!feasible.length) {
      return compareNumbers(left.gapScore, right.gapScore)
        || compareNumbers(left.spent, right.spent)
        || compareNumbers(left.surplus.gold + left.surplus.core, right.surplus.gold + right.surplus.core);
    }
    const wasteLeft = left.surplus.gold / targetGap.gold + left.surplus.core / targetGap.core;
    const wasteRight = right.surplus.gold / targetGap.gold + right.surplus.core / targetGap.core;
    if (input.preference === "min-spend") {
      return compareNumbers(left.spent, right.spent)
        || compareNumbers(left.requiredDays, right.requiredDays)
        || compareNumbers(wasteLeft, wasteRight);
    }
    if (input.preference === "fastest") {
      return compareNumbers(left.requiredDays, right.requiredDays)
        || compareNumbers(left.spent, right.spent)
        || compareNumbers(wasteLeft, wasteRight);
    }
    return compareNumbers(left.burdenScore, right.burdenScore)
      || compareNumbers(left.spent, right.spent)
      || compareNumbers(left.requiredDays, right.requiredDays);
  });

  const best = ranked[0] ?? {
    products: [], spent: 0, purchased: { gold: 0, core: 0 }, requiredDays: Number.POSITIVE_INFINITY,
    reachesTarget: false, projectedDays: input.maxDays,
    final: { gold: current.gold + daily.gold * input.maxDays, core: current.core + daily.core * input.maxDays },
    shortfall: { gold: Math.max(0, target.gold - current.gold - daily.gold * input.maxDays), core: Math.max(0, target.core - current.core - daily.core * input.maxDays) },
    surplus: { gold: 0, core: 0 }, burdenScore: 0, gapScore: 2,
  };
  const farmingDays = best.reachesTarget ? best.requiredDays : null;
  const farmingOnlyDays = Number.isFinite(farmingOnlyRequired) ? farmingOnlyRequired : null;

  return {
    products: best.products,
    spent: best.spent,
    remainingBudget: Math.max(0, input.budget - best.spent),
    reachesTarget: best.reachesTarget,
    farmingDays,
    projectedDays: best.projectedDays,
    purchased: best.purchased,
    farmed: { gold: daily.gold * best.projectedDays, core: daily.core * best.projectedDays },
    final: best.final,
    shortfall: best.shortfall,
    surplus: best.surplus,
    farmingOnlyDays,
    timeSavedDays: best.reachesTarget && farmingOnlyDays !== null ? Math.max(0, farmingOnlyDays - best.requiredDays) : null,
    evaluatedCombinations: candidates.length,
    burdenScore: Math.round(best.burdenScore * 1_000) / 1_000,
  };
}
