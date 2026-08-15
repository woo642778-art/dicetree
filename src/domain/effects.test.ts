import { expect, it } from "vitest";
import { evaluateEffect } from "./effects";
import { diceDefinitions } from "../tree-data/dice";
const goals = { primaryDieId: "devourer", secondaryDieIds: [], role: "dealer" as const, spendingProfile: "f2p" as const };
it("does not emit exact attack-speed DPS when formula is unverified", () => { const result = evaluateEffect({ kind: "attackSpeedPercent", amount: 0.5, appliesTo: "chaos", verifiedFormula: false }, { goals, dice: diceDefinitions }); expect(result.mode).toBe("heuristic"); expect(result.exactPercent).toBeUndefined(); });
