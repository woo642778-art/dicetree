import type { DiceDefinition, EffectDefinition, EvaluatedEffect, PlannerGoals } from "./types";

export interface EffectContext {
  goals: PlannerGoals;
  dice: DiceDefinition[];
  existingBulletDamagePercent?: number;
  existingAttackSpeedPercent?: number;
}

function selectedDiceIds(goals: PlannerGoals) {
  return [goals.primaryDieId, ...goals.secondaryDieIds].filter((id): id is string => Boolean(id));
}

function coverage(effect: EffectDefinition, context: EffectContext) {
  const selected = selectedDiceIds(context.goals);
  if (!selected.length) return 1;
  if (effect.appliesTo === "all") return 1;
  if (typeof effect.appliesTo === "string") {
    const byId = new Map(context.dice.map((die) => [die.id, die]));
    return selected.filter((id) => byId.get(id)?.family === effect.appliesTo).length / selected.length;
  }
  return selected.filter((id) => effect.appliesTo.diceIds.includes(id)).length / selected.length;
}

export function evaluateEffect(effect: EffectDefinition, context: EffectContext): EvaluatedEffect {
  const applies = coverage(effect, context);
  if (applies <= 0) return { mode: "unsupported", utility: 0, coverage: 0, reasonKey: "reason.noCoverage" };

  if (effect.kind === "bulletDamagePercent") {
    if (effect.verifiedFormula) {
      const baseline = 100 + (context.existingBulletDamagePercent ?? 0);
      const exactPercent = (effect.amount / baseline) * 100;
      return { mode: "exact", utility: exactPercent * applies, exactPercent, coverage: applies, reasonKey: "reason.verifiedDamage" };
    }
    return { mode: "heuristic", utility: effect.amount * applies, coverage: applies, reasonKey: "reason.formulaUnverified" };
  }

  if (effect.kind === "attackSpeedPercent") {
    if (effect.verifiedFormula && context.existingAttackSpeedPercent !== undefined) {
      const exactPercent = effect.amount;
      return { mode: "exact", utility: exactPercent * applies, exactPercent, coverage: applies, reasonKey: "reason.verifiedSpeed" };
    }
    return { mode: "heuristic", utility: effect.amount * 1.35 * applies, coverage: applies, reasonKey: "reason.formulaUnverified" };
  }

  return {
    mode: "heuristic",
    utility: effect.amount * 0.85 * applies,
    coverage: applies,
    reasonKey: "reason.supportHeuristic",
  };
}
