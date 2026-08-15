import type { PlannerStateV1, TreeNodeDefinition } from "../domain/types";

const verification = { status: "verified" as const, checkedAt: "2026-08-15" };
export const fixtureNodes: TreeNodeDefinition[] = [
  { id: "a", family: "order", position: { x: 0, y: 0 }, maxRank: 1, prerequisites: [], levels: [{ rank: 1, costs: { gold: 1000 }, costsKnown: true, effects: [], effectsKnown: true }], localizationKey: "a", verification, tags: [], investable: true, routeKnown: true },
  { id: "b", family: "order", position: { x: 1, y: 0 }, maxRank: 1, prerequisites: [{ nodeId: "a", minRank: 1 }], levels: [{ rank: 1, costs: { gold: 2000 }, costsKnown: true, effects: [], effectsKnown: true }], localizationKey: "b", verification, tags: [], investable: true, routeKnown: true },
  { id: "c", family: "order", position: { x: 2, y: 0 }, maxRank: 1, prerequisites: [{ nodeId: "b", minRank: 1 }], levels: [{ rank: 1, costs: { gold: 3000 }, costsKnown: true, effects: [], effectsKnown: true }], localizationKey: "c", verification, tags: [], investable: true, routeKnown: true },
  { id: "scaling", family: "magic", position: { x: 3, y: 0 }, maxRank: 3, prerequisites: [], levels: [
    { rank: 1, costs: { gold: 1000 }, costsKnown: true, effects: [], effectsKnown: true },
    { rank: 2, costs: { gold: 2000, core: 1 }, costsKnown: true, effects: [], effectsKnown: true },
    { rank: 3, costs: { gold: 3000 }, costsKnown: true, effects: [], effectsKnown: true },
  ], localizationKey: "scaling", verification, tags: [], investable: true, routeKnown: true },
];
export const sampleState: PlannerStateV1 = { schemaVersion: 1, dataVersion: "test", ranks: { a: 1 }, goals: { primaryDieId: "devourer", secondaryDieIds: [], role: "dealer", spendingProfile: "f2p" } };
