import { beforeEach, expect, it } from "vitest";
import { listNamedBuilds } from "./buildStorage";
import { sampleState } from "../test/fixtures";
beforeEach(() => localStorage.clear());
it("isolates corrupt entries", () => { const good = { id: "good", name: "Good", state: sampleState, createdAt: "2026-08-15T00:00:00.000Z", modifiedAt: "2026-08-15T00:00:00.000Z" }; localStorage.setItem("dicetree.build.good", JSON.stringify(good)); localStorage.setItem("dicetree.build.bad", "{"); expect(listNamedBuilds().map((x) => x.name)).toEqual(["Good"]); });
