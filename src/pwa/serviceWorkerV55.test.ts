import { describe, expect, it, vi } from "vitest";
import { applyServiceWorkerUpdateV55 } from "./serviceWorkerV55";

describe("service worker update V55", () => {
  it("asks a waiting worker to activate", async () => {
    const postMessage = vi.fn();
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: vi.fn().mockResolvedValue({ waiting: { postMessage } }) } });
    await expect(applyServiceWorkerUpdateV55()).resolves.toBe(true);
    expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });
});
