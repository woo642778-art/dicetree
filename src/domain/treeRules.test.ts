import { describe, expect, it } from "vitest";
import { canIncrement, getRollbackSet } from "./treeRules";
import { fixtureNodes } from "../test/fixtures";
describe("treeRules", () => {
  it("blocks a node until its prerequisite rank is met", () => { expect(canIncrement("b", { a: 0, b: 0 }, fixtureNodes)).toBe(false); expect(canIncrement("b", { a: 1, b: 0 }, fixtureNodes)).toBe(true); });
  it("returns downstream rollback ranks", () => { expect(getRollbackSet("a", 0, { a: 1, b: 1, c: 1 }, fixtureNodes)).toEqual({ b: 0, c: 0 }); });
});
