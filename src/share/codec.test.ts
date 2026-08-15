import { expect, it } from "vitest";
import { decodePlannerState, encodePlannerState } from "./codec";
import { sampleState } from "../test/fixtures";

it("round trips semantic state without locale", () => {
  const encoded = encodePlannerState(sampleState);
  expect(decodePlannerState(encoded, new Set(["a"])).state).toEqual(sampleState);
  expect(encoded).not.toContain("ko");
});

it("drops unknown node ids and reports warnings", () => {
  const encoded = encodePlannerState({ ...sampleState, ranks: { a: 1, removed: 1 } });
  const result = decodePlannerState(encoded, new Set(["a"]));
  expect(result.warnings).toContain("unknown-node:removed");
  expect(result.state?.ranks).toEqual({ a: 1 });
});

it("drops a known node rank when it exceeds the verified maximum", () => {
  const encoded = encodePlannerState({ ...sampleState, ranks: { a: 2 } });
  const result = decodePlannerState(encoded, new Set(["a"]), new Map([["a", 1]]));
  expect(result.warnings).toContain("invalid-rank:a");
  expect(result.state?.ranks).toEqual({});
});
