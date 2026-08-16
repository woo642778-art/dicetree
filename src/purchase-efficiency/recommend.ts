import { PURCHASE_PRODUCTS_V41, type PurchaseGoal, type PurchaseProduct, type PurchaseProfile } from "./products";

function goalScore(product: PurchaseProduct, goal: PurchaseGoal) {
  const efficiency = product.clientEfficiency ?? 0;
  const { gold = 0, core = 0, redesignItem = 0 } = product.rewards;
  if (goal === "core") return efficiency + core * 3 + gold / 10_000;
  if (goal === "gold") return efficiency + gold / 1_000 + core;
  if (goal === "redesign") return efficiency + redesignItem * 1_000;
  return efficiency;
}

export function recommendPurchasesV41(
  profile: PurchaseProfile,
  goal: PurchaseGoal,
  products: readonly PurchaseProduct[] = PURCHASE_PRODUCTS_V41,
) {
  const comparable = products.filter((product) => (
    product.clientEfficiency !== undefined
    && product.category === "special"
    && (profile === "invested" || product.priceUsd <= 7.99)
    && (goal !== "redesign" || (product.rewards.redesignItem ?? 0) > 0)
  ));

  return [...comparable].sort((left, right) => (
    goalScore(right, goal) - goalScore(left, goal)
    || (right.clientEfficiency ?? 0) - (left.clientEfficiency ?? 0)
    || left.priceUsd - right.priceUsd
  ));
}

export function findIntroOffer(products: readonly PurchaseProduct[] = PURCHASE_PRODUCTS_V41) {
  return products.find((product) => product.category === "intro");
}
