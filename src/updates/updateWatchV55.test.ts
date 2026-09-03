import { beforeEach, describe, expect, it } from "vitest";
import { hasUnreadUpdateV55, markUpdateSeenV55 } from "./updateWatchV55";

describe("update watch V55", () => {
  beforeEach(() => localStorage.clear());
  it("keeps an official version unread until it is acknowledged", () => {
    expect(hasUnreadUpdateV55("1.0.3")).toBe(true);
    markUpdateSeenV55("1.0.3");
    expect(hasUnreadUpdateV55("1.0.3")).toBe(false);
    expect(hasUnreadUpdateV55("1.0.4")).toBe(true);
  });
});
