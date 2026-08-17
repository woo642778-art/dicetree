import type { CanonicalGameData } from "../game-data/types";
import { playableDiceV3 } from "../game-data/playableDice";
import { analyzeDeckCompositionV4, type DeckAnalysisV4, type DeckScoreCategoryV4 } from "./analyzeDeck";
import { CO_OP_RANKING_SNAPSHOT } from "./coOpRankingSnapshot";
import { recommendDeckV4 } from "./recommendDeck";

export interface RivalOptimizationV49 {
  diceIds: string[];
  score: number;
  seedScore: number;
  baseScore: number;
  matchupScore: number;
  changes: Array<{ slot: number; fromDiceId: string; toDiceId: string }>;
  reasons: Array<{ ko: string; en: string }>;
}

export interface RivalTurnV49 extends RivalOptimizationV49 {
  actor: "user" | "rival";
  stage: "original" | "counter" | "revision" | "recounter";
}

export interface RivalSequenceV49 {
  turns: RivalTurnV49[];
  disclosure: { ko: string; en: string };
}

const CATEGORY_LABELS: Record<DeckScoreCategoryV4, { ko: string; en: string }> = {
  damage: { ko: "딜링", en: "damage" }, growth: { ko: "성장", en: "growth" }, economy: { ko: "경제", en: "economy" },
  control: { ko: "제어", en: "control" }, buff: { ko: "버프", en: "buff" }, boss: { ko: "보스 대응", en: "boss" }, stability: { ko: "안정성", en: "stability" },
};

const ANALYSIS_CACHE = new WeakMap<CanonicalGameData, Map<string, DeckAnalysisV4>>();

function analyzeCached(data: CanonicalGameData, diceIds: readonly string[]) {
  let cache = ANALYSIS_CACHE.get(data);
  if (!cache) {
    cache = new Map();
    ANALYSIS_CACHE.set(data, cache);
  }
  const key = diceIds.join(":");
  const cached = cache.get(key);
  if (cached) return cached;
  const analysis = analyzeDeckCompositionV4(data, diceIds);
  cache.set(key, analysis);
  return analysis;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function validDeck(data: CanonicalGameData, diceIds: readonly string[]) {
  const valid = new Set(playableDiceV3(data).map((dice) => dice.id));
  return diceIds.length === 5 && new Set(diceIds).size === 5 && diceIds.every((diceId) => valid.has(diceId));
}

function scoreMatchup(candidate: DeckAnalysisV4, opponent: DeckAnalysisV4) {
  const setupPressure = candidate.scores.control - (opponent.scores.growth + opponent.scores.economy) / 2;
  const survivalEdge = candidate.scores.stability - opponent.scores.damage;
  const tempoEdge = (candidate.scores.growth + candidate.scores.economy + candidate.scores.buff) / 3 - opponent.scores.control;
  const finishingEdge = (candidate.scores.damage + candidate.scores.boss) / 2 - opponent.scores.stability;
  const matchup = clamp(50 + setupPressure * .22 + survivalEdge * .18 + tempoEdge * .2 + finishingEdge * .22);
  const final = clamp(candidate.scores.overall * .62 + matchup * .38);
  return { final, matchup };
}

function explanation(candidate: DeckAnalysisV4, opponent: DeckAnalysisV4) {
  const comparisons: Array<{ key: DeckScoreCategoryV4; delta: number }> = ([
    { key: "control", delta: candidate.scores.control - Math.round((opponent.scores.growth + opponent.scores.economy) / 2) },
    { key: "stability", delta: candidate.scores.stability - opponent.scores.damage },
    { key: "damage", delta: candidate.scores.damage - opponent.scores.stability },
    { key: "growth", delta: candidate.scores.growth - opponent.scores.control },
  ] satisfies Array<{ key: DeckScoreCategoryV4; delta: number }>).sort((left, right) => right.delta - left.delta);
  return comparisons.slice(0, 2).map(({ key, delta }) => ({
    ko: `${CATEGORY_LABELS[key].ko} 대응값이 상대 기준 ${delta >= 0 ? "+" : ""}${delta}점으로 계산되었습니다.`,
    en: `${CATEGORY_LABELS[key].en} response is ${delta >= 0 ? "+" : ""}${delta} points versus the opponent profile.`,
  }));
}

function evaluate(data: CanonicalGameData, diceIds: readonly string[], opponentIds: readonly string[]) {
  const analysis = analyzeCached(data, diceIds);
  const opponent = analyzeCached(data, opponentIds);
  const result = scoreMatchup(analysis, opponent);
  return { score: result.final, baseScore: analysis.scores.overall, matchupScore: result.matchup, analysis, opponent };
}

function uniqueSeeds(data: CanonicalGameData) {
  const recommendations = (["dealer", "support", "balanced"] as const).flatMap((goal) => (["free", "light", "invested"] as const)
    .map((profile) => recommendDeckV4(data, goal, profile).dice.map((entry) => entry.diceId)));
  const candidates = [...CO_OP_RANKING_SNAPSHOT.map((deck) => [...deck.diceIds]), ...recommendations];
  const seen = new Set<string>();
  return candidates.filter((deck) => {
    const key = [...deck].sort().join(":");
    if (seen.has(key) || !validDeck(data, deck)) return false;
    seen.add(key);
    return true;
  });
}

export function optimizeDeckAgainstV49(data: CanonicalGameData, opponentDiceIds: readonly string[], seedDiceIds?: readonly string[]): RivalOptimizationV49 {
  if (!validDeck(data, opponentDiceIds)) throw new Error("A rival requires five distinct playable dice");
  const roster = playableDiceV3(data).map((dice) => dice.id);
  const seedCandidates = seedDiceIds && validDeck(data, seedDiceIds) ? [[...seedDiceIds]] : uniqueSeeds(data);
  let deck = seedCandidates
    .map((diceIds) => ({ diceIds, evaluated: evaluate(data, diceIds, opponentDiceIds) }))
    .sort((left, right) => right.evaluated.score - left.evaluated.score || left.diceIds.join(":").localeCompare(right.diceIds.join(":")))[0].diceIds;
  const original = [...deck];
  const seed = evaluate(data, deck, opponentDiceIds);

  for (let round = 0; round < 4; round += 1) {
    const occupied = new Set(deck);
    const current = evaluate(data, deck, opponentDiceIds);
    let best = { diceIds: deck, evaluated: current };
    for (let slot = 0; slot < deck.length; slot += 1) {
      for (const diceId of roster) {
        if (occupied.has(diceId)) continue;
        const next = [...deck];
        next[slot] = diceId;
        const evaluated = evaluate(data, next, opponentDiceIds);
        if (evaluated.score > best.evaluated.score + .0001
          || (Math.abs(evaluated.score - best.evaluated.score) < .0001 && next.join(":") < best.diceIds.join(":"))) {
          best = { diceIds: next, evaluated };
        }
      }
    }
    if (best.diceIds === deck) break;
    deck = best.diceIds;
  }

  const result = evaluate(data, deck, opponentDiceIds);
  const changes = original.flatMap((fromDiceId, slot) => fromDiceId === deck[slot] ? [] : [{ slot, fromDiceId, toDiceId: deck[slot] }]);
  return {
    diceIds: deck,
    score: Number(result.score.toFixed(1)),
    seedScore: Number(seed.score.toFixed(1)),
    baseScore: result.baseScore,
    matchupScore: Number(result.matchupScore.toFixed(1)),
    changes,
    reasons: explanation(result.analysis, result.opponent),
  };
}

function turn(actor: RivalTurnV49["actor"], stage: RivalTurnV49["stage"], result: RivalOptimizationV49): RivalTurnV49 {
  return { actor, stage, ...result };
}

export function buildRivalSequenceV49(data: CanonicalGameData, userDiceIds: readonly string[]): RivalSequenceV49 {
  if (!validDeck(data, userDiceIds)) throw new Error("A user build requires five distinct playable dice");
  const userEvaluation = evaluate(data, userDiceIds, userDiceIds);
  const original: RivalOptimizationV49 = {
    diceIds: [...userDiceIds], score: Number(userEvaluation.score.toFixed(1)), seedScore: Number(userEvaluation.score.toFixed(1)),
    baseScore: userEvaluation.baseScore, matchupScore: Number(userEvaluation.matchupScore.toFixed(1)), changes: [],
    reasons: [{ ko: "사용자가 입력한 5주사위의 현재 비교 기준점입니다.", en: "Baseline from the user's selected five dice." }],
  };
  const firstRival = optimizeDeckAgainstV49(data, userDiceIds);
  const userRevision = optimizeDeckAgainstV49(data, firstRival.diceIds, userDiceIds);
  const secondRival = optimizeDeckAgainstV49(data, userRevision.diceIds, firstRival.diceIds);
  return {
    turns: [turn("user", "original", original), turn("rival", "counter", firstRival), turn("user", "revision", userRevision), turn("rival", "recounter", secondRival)],
    disclosure: {
      ko: "이 점수는 덱 역할·관측 메타·기본 능력치로 만든 가상 대응 지표이며 실제 승률이나 매치 결과가 아닙니다.",
      en: "This is a virtual response index from deck roles, observed meta, and base stats. It is not a win rate or match prediction.",
    },
  };
}
