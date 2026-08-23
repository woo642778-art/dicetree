import { describe, expect, it } from "vitest";
import { gameDataV3 } from "../game-data/load";
import { parseAccountScreenshotTextV52 } from "./screenshotImportV52";

describe("screenshot import V5.2", () => {
  it("extracts labeled resources and known dice levels", () => {
    const draft = parseAccountScreenshotTextV52("골드 230,000 다이스 코어 680 원자 Lv.9", gameDataV3);
    expect(draft.gold).toBe(230_000);
    expect(draft.stone).toBe(680);
    expect(draft.diceLevels.atomic ?? draft.diceLevels.element).toBe(9);
  });

  it("marks positional top-bar inference for review", () => {
    const draft = parseAccountScreenshotTextV52("81 6 22 2,294", gameDataV3);
    expect(draft.gold).toBe(2_294);
    expect(draft.stone).toBe(22);
    expect(draft.review).toContain("gold-position-inference");
  });
});
