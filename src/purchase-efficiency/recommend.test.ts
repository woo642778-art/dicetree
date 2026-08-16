import { describe, expect, it } from "vitest";
import { findIntroOffer, recommendPurchasesV41 } from "./recommend";

describe("purchase recommendations", () => {
  it("uses the client-declared package efficiency for the overall pick", () => {
    expect(recommendPurchasesV41("light", "overall")[0]?.id).toBe("SPC_REDESIGN_BUNDLE");
    expect(recommendPurchasesV41("invested", "overall")[0]?.clientEfficiency).toBe(510);
  });

  it("changes the recommendation with the resource goal", () => {
    expect(recommendPurchasesV41("invested", "core")[0]?.id).toBe("SPC_CORE_BUNDLE");
    expect(recommendPurchasesV41("invested", "gold")[0]?.id).toBe("SPC_GOLD_BUNDLE");
    expect(recommendPurchasesV41("light", "redesign")[0]?.id).toBe("SPC_REDESIGN_BUNDLE");
  });

  it("keeps the first purchase outside the efficiency ranking", () => {
    const intro = findIntroOffer();
    expect(intro?.id).toBe("FIRST_PURCHASE");
    expect(intro?.clientEfficiency).toBeUndefined();
  });
});
