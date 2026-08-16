export type PurchaseGoal = "overall" | "core" | "gold" | "redesign";
export type PurchaseProfile = "light" | "invested";

export interface PurchaseRewards {
  gold?: number;
  core?: number;
  redesignItem?: number;
  other?: number;
  diceSkin?: number;
}

export interface PurchaseProduct {
  id: string;
  nameKo: string;
  priceUsd: number;
  officialKrw?: number;
  clientEfficiency?: number;
  rewards: PurchaseRewards;
  category: "intro" | "special" | "trigger" | "direct";
  sourceTables: string[];
}

export const OFFICIAL_APP_STORE_KR_URL = "https://apps.apple.com/kr/app/%EB%9E%9C%EB%8D%A4-%EB%8B%A4%EC%9D%B4%EC%8A%A4-2/id6748432502?platform=ipad";

/**
 * Static projection of the 1.0.1 client tables. This is intentionally kept
 * separate from live prices: `priceUsd` is ShopProductTable data, while
 * `officialKrw` is present only when the Korean App Store currently exposes it.
 */
export const PURCHASE_PRODUCTS_V41: readonly PurchaseProduct[] = [
  {
    id: "FIRST_PURCHASE",
    nameKo: "첫 구매 패키지",
    priceUsd: 1.99,
    officialKrw: 3_300,
    rewards: { gold: 5_000, core: 8, diceSkin: 1 },
    category: "intro",
    sourceTables: ["ShopProductTable", "RewardTable"],
  },
  {
    id: "SPC_SMALL_CHANGE_1",
    nameKo: "금고에서 빼돌린 잔돈 I",
    priceUsd: 3.99,
    officialKrw: 6_600,
    clientEfficiency: 350,
    rewards: { gold: 5_000, core: 10 },
    category: "special",
    sourceTables: ["ShopProductTable", "SpecialPackageTable", "RewardTable"],
  },
  {
    id: "SPC_SMALL_CHANGE_2",
    nameKo: "금고에서 빼돌린 잔돈 II",
    priceUsd: 3.99,
    clientEfficiency: 350,
    rewards: { gold: 20_000, core: 5 },
    category: "special",
    sourceTables: ["ShopProductTable", "SpecialPackageTable", "RewardTable"],
  },
  {
    id: "SPC_PAPERBAG",
    nameKo: "슬쩍 챙긴 재설계 봉지",
    priceUsd: 3.99,
    officialKrw: 6_600,
    clientEfficiency: 370,
    rewards: { core: 10, redesignItem: 1 },
    category: "special",
    sourceTables: ["ShopProductTable", "SpecialPackageTable", "RewardTable"],
  },
  {
    id: "SPC_CORE_TROPHY",
    nameKo: "동업자와 나눈 골드 전리품",
    priceUsd: 3.99,
    clientEfficiency: 360,
    rewards: { gold: 25_000, other: 15 },
    category: "special",
    sourceTables: ["ShopProductTable", "SpecialPackageTable", "RewardTable"],
  },
  {
    id: "SPC_REDESIGN_BUNDLE",
    nameKo: "몰래 빼돌린 재설계 보따리",
    priceUsd: 7.99,
    officialKrw: 12_000,
    clientEfficiency: 400,
    rewards: { gold: 30_000, core: 12, redesignItem: 1 },
    category: "special",
    sourceTables: ["ShopProductTable", "SpecialPackageTable", "RewardTable"],
  },
  {
    id: "SPC_CORE_BUNDLE",
    nameKo: "몰래 빼돌린 코어 보따리",
    priceUsd: 8.99,
    clientEfficiency: 510,
    rewards: { gold: 10_000, core: 30, other: 20 },
    category: "special",
    sourceTables: ["ShopProductTable", "SpecialPackageTable", "RewardTable"],
  },
  {
    id: "SPC_GOLD_BUNDLE",
    nameKo: "몰래 빼돌린 골드 보따리",
    priceUsd: 9.99,
    clientEfficiency: 500,
    rewards: { gold: 70_000, core: 15, other: 20 },
    category: "special",
    sourceTables: ["ShopProductTable", "SpecialPackageTable", "RewardTable"],
  },
  {
    id: "TRG_LOOKS_GOOD",
    nameKo: "딱 봐도 좋은 패키지",
    priceUsd: 5.99,
    officialKrw: 9_900,
    clientEfficiency: 220,
    rewards: { gold: 10_000, core: 8 },
    category: "trigger",
    sourceTables: ["ShopProductTable", "PopupPackageTable", "RewardTable"],
  },
] as const;
