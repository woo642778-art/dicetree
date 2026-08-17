import { formatGameText } from "../game-data/formatGameText";
import { playableDiceV3 } from "../game-data/playableDice";
import type { CanonicalGameData } from "../game-data/types";
import { analyzeDeckDiceV4, type DeckRoleV4 } from "./recommendDeck";
import { CO_OP_RANKING_SNAPSHOT, summarizeDiceUsage } from "./coOpRankingSnapshot";

export type DiceRankingRoleV49 = "all" | "dealer" | "support" | "control" | "economy";

export interface DiceRankingEntryV49 {
  rank: number;
  diceId: string;
  name: { ko: string; en: string };
  description: { ko: string; en: string };
  roles: DeckRoleV4[];
  score: number;
  observedDecks: number;
  observedShare: number;
  basicDps: number | null;
  confidence: "verified" | "partial" | "unavailable";
  reason: { ko: string; en: string };
  source: "observed-meta-and-client-stats";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function roleMatch(roles: readonly DeckRoleV4[], role: DiceRankingRoleV49) {
  if (role === "all") return true;
  if (role === "support") return roles.some((entry) => entry !== "dealer");
  return roles.includes(role === "control" ? "control" : role === "economy" ? "economy" : "dealer");
}

export function rankDiceV49(data: CanonicalGameData, options: { role: DiceRankingRoleV49; query?: string; locale?: "ko" | "en" }): DiceRankingEntryV49[] {
  const locale = options.locale ?? "ko";
  const usage = new Map(summarizeDiceUsage(CO_OP_RANKING_SNAPSHOT).map((entry) => [entry.diceId, entry]));
  const normalizedQuery = options.query?.trim().toLocaleLowerCase() ?? "";
  const ranked = playableDiceV3(data).map((dice) => {
    const analyzed = analyzeDeckDiceV4(dice, data);
    const observed = usage.get(dice.id);
    const meta = observed ? observed.share * 100 : 0;
    const dpsScore = analyzed.basicDps === null ? 0 : Math.min(100, Math.log10(analyzed.basicDps + 1) * 34);
    const roleBreadth = analyzed.roles.length * 7;
    const verifiedBonus = analyzed.calculation === "verified-basic" ? 12 : analyzed.calculation === "partial-basic" ? 5 : 0;
    const score = clamp(meta * .52 + dpsScore * .28 + roleBreadth + verifiedBonus);
    const name = {
      ko: dice.nameKey ? data.localization.ko[dice.nameKey] ?? dice.id : dice.id,
      en: dice.nameKey ? data.localization.en[dice.nameKey] ?? dice.id : dice.id,
    };
    const description = {
      ko: formatGameText(dice.descriptionKey ? data.localization.ko[dice.descriptionKey] ?? "" : "", "ko"),
      en: formatGameText(dice.descriptionKey ? data.localization.en[dice.descriptionKey] ?? "" : "", "en"),
    };
    const confidence: DiceRankingEntryV49["confidence"] = analyzed.calculation === "verified-basic" ? "verified" : analyzed.calculation === "partial-basic" ? "partial" : "unavailable";
    return {
      rank: 0, diceId: dice.id, name, description, roles: analyzed.roles, score,
      observedDecks: observed?.decks ?? 0, observedShare: observed?.share ?? 0, basicDps: analyzed.basicDps, confidence,
      reason: {
        ko: `관측 메타 ${Math.round(meta)}% · ${analyzed.basicDps === null ? "기본 DPS 미확정" : `특수효과 제외 기본 DPS ${analyzed.basicDps.toFixed(1)}`} · ${analyzed.roles.join("/")} 역할 근거를 반영했습니다.`,
        en: `Observed meta ${Math.round(meta)}% · ${analyzed.basicDps === null ? "base DPS unresolved" : `base DPS excluding effects ${analyzed.basicDps.toFixed(1)}`} · roles ${analyzed.roles.join("/")}.`,
      },
      source: "observed-meta-and-client-stats" as const,
    };
  }).filter((entry) => roleMatch(entry.roles, options.role))
    .filter((entry) => !normalizedQuery || `${entry.name[locale]} ${entry.name.en} ${entry.description[locale]} ${entry.diceId}`.toLocaleLowerCase().includes(normalizedQuery))
    .sort((left, right) => right.score - left.score || right.observedDecks - left.observedDecks || left.diceId.localeCompare(right.diceId));
  return ranked.map((entry, index) => ({ ...entry, rank: index + 1 }));
}
