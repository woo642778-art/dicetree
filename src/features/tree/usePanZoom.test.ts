import { describe, expect, it } from "vitest";
import { screenDeltaToSvgUnits } from "./usePanZoom";

describe("screenDeltaToSvgUnits", () => {
  it("converts CSS-pixel drag distance into the SVG viewBox coordinate system", () => {
    expect(screenDeltaToSvgUnits(
      { x: 420, y: 180 },
      { screenScaleX: 0.1, screenScaleY: 0.1 },
    )).toEqual({ x: 4200, y: 1800 });
  });

  it("supports non-uniform viewport scales", () => {
    expect(screenDeltaToSvgUnits(
      { x: 200, y: -150 },
      { screenScaleX: 0.25, screenScaleY: 0.5 },
    )).toEqual({ x: 800, y: -300 });
  });
});
