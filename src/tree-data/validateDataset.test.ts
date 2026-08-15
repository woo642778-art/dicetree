import { describe, expect, it } from "vitest";
import type { TreeNodeDefinition } from "../domain/types";
import { validateDataset } from "./validateDataset";

const base = (id: string): TreeNodeDefinition => ({ id, family: "order", position: { x: 0, y: 0 }, maxRank: 1, prerequisites: [], levels: [], localizationKey: id, verification: { status: "unverified", checkedAt: "2026-08-15" }, tags: [], investable: false, routeKnown: false });
describe("validateDataset", () => {
  it("rejects duplicate node ids", () => { expect(validateDataset([base("n1"), base("n1")], []).errors).toContain("duplicate-node-id:n1"); });
  it("rejects unknown prerequisites", () => { const n = base("n1"); n.prerequisites = [{ nodeId: "missing", minRank: 1 }]; expect(validateDataset([n], []).errors).toContain("unknown-prerequisite:n1:missing"); });
  it("allows explicit unverified nodes without numeric effects", () => { expect(validateDataset([base("unknown-order-01")], []).errors).toEqual([]); });
});
