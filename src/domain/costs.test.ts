import { expect, it } from "vitest";
import { calculateSpentResources } from "./costs";
import { fixtureNodes } from "../test/fixtures";
it("sums exact per-rank costs", () => { expect(calculateSpentResources({ scaling: 3 }, fixtureNodes)).toEqual({ gold: 6000, core: 1, token: 0 }); });
