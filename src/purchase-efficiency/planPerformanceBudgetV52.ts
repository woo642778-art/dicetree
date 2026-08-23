import type { MultiStepBuildPlanV52 } from "../optimizer/accountOptimizerV52";
import { purchaseDisplayPrice, type PurchaseProduct } from "./products";

export interface PerformanceBudgetPlanV52 {
  products: PurchaseProduct[];
  spent: number;
  reachedStep: number;
  reachedDps: number | null;
  resources: { gold: number; core: number };
  evaluatedCombinations: number;
}

/** Exhaustively evaluates one-copy known-reward package combinations against a solved growth route. */
export function planPerformanceBudgetV52(input: {
  locale: "ko" | "en";
  cashBudget: number;
  availableGold: number;
  availableCore: number;
  route: MultiStepBuildPlanV52;
}, products: readonly PurchaseProduct[]): PerformanceBudgetPlanV52 {
  const eligible = products.filter((product) => product.rewardEvidence !== "price-only");
  const prices = eligible.map((product) => purchaseDisplayPrice(product, input.locale).value);
  let best: PerformanceBudgetPlanV52 = {
    products: [], spent: 0, reachedStep: 0, reachedDps: input.route.baselineDps,
    resources: { gold: Math.max(0, input.availableGold), core: Math.max(0, input.availableCore) }, evaluatedCombinations: 0,
  };
  let evaluatedCombinations = 0;
  for (let mask = 0; mask < 2 ** eligible.length; mask += 1) {
    const selected: PurchaseProduct[] = [];
    let spent = 0;
    let gold = Math.max(0, input.availableGold);
    let core = Math.max(0, input.availableCore);
    for (let index = 0; index < eligible.length; index += 1) {
      if (!(mask & (1 << index))) continue;
      const product = eligible[index];
      selected.push(product);
      spent += prices[index];
      gold += product.rewards.gold ?? 0;
      core += product.rewards.core ?? 0;
    }
    if (spent > Math.max(0, input.cashBudget)) continue;
    evaluatedCombinations += 1;
    const reached = input.route.steps.filter((step) => step.cumulativeCost.gold <= gold && step.cumulativeCost.stone <= core).at(-1);
    const reachedStep = reached?.order ?? 0;
    const reachedDps = reached?.dpsAfter ?? input.route.baselineDps;
    const better = reachedStep > best.reachedStep
      || (reachedStep === best.reachedStep && (reachedDps ?? 0) > (best.reachedDps ?? 0))
      || (reachedStep === best.reachedStep && reachedDps === best.reachedDps && spent < best.spent);
    if (better) best = { products: selected, spent, reachedStep, reachedDps, resources: { gold, core }, evaluatedCombinations: 0 };
  }
  return { ...best, evaluatedCombinations };
}
