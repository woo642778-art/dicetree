import { expect, it } from "vitest";
import { createPlannerHistory, plannerReducer } from "./plannerReducer";
import { fixtureNodes, sampleState } from "../test/fixtures";
it("treats applyRoute as one undo step", () => { let h = createPlannerHistory({ ...sampleState, ranks: {} }); h = plannerReducer(h, { type: "applyRoute", route: [{ nodeId: "a", targetRank: 1 }, { nodeId: "b", targetRank: 1 }] }, fixtureNodes); expect(h.present.ranks).toMatchObject({ a: 1, b: 1 }); expect(h.past).toHaveLength(1); h = plannerReducer(h, { type: "undo" }, fixtureNodes); expect(h.present.ranks).toEqual({}); });
