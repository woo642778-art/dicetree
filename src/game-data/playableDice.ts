import type { CanonicalGameData, DiceDefinitionV3 } from "./types";

/**
 * Client tables also contain battlefield objects that reuse the dice record
 * shape. They are not selectable members of a five-dice deck.
 */
export const NON_PLAYABLE_DICE_IDS = new Set(["spgemstone", "altar", "bomb"]);

export function isPlayableDiceV3(dice: DiceDefinitionV3 | string) {
  const diceId = typeof dice === "string" ? dice : dice.id;
  return !NON_PLAYABLE_DICE_IDS.has(diceId);
}

export function playableDiceV3(data: Pick<CanonicalGameData, "dice">) {
  return data.dice.filter(isPlayableDiceV3);
}
