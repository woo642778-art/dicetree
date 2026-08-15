import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

test("V2 planner plans, shares and restores the same semantic build", async ({ page, browser, isMobile }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/");
  await expect(page.getByText(/랜덤다이스2 트리/).first()).toBeVisible();
  await expect(page.getByTestId("tree-canvas")).toBeVisible();

  await page.getByTestId("node-global-bullet-observed-next").click();
  await expect(page.getByTestId("node-panel")).toContainText("3,000 골드");
  await page.getByRole("button", { name: "다음 1단계 계획에 추가" }).click();
  await expect(page.getByTestId("resource-summary")).toContainText("−3,000");
  const semantic = await page.getByTestId("semantic-build-hash").textContent();
  expect(semantic).toContain("v2.");

  await page.getByTestId("share-button").click();
  await expect(page.getByTestId("share-popover")).toBeVisible();
  const url = await page.getByTestId("share-url").inputValue();
  expect(url).toContain("/dicetree/#b=v2.");
  await page.screenshot({ path: `test-results/qa-v2-${isMobile ? "mobile" : "desktop"}.png`, fullPage: false });

  const context = await browser.newContext();
  const shared = await context.newPage();
  const sharedErrors = captureBrowserErrors(shared);
  await shared.goto(url);
  await expect(shared.getByTestId("resource-summary")).toContainText("−3,000");
  await expect(shared.getByTestId("semantic-build-hash")).toHaveText(semantic!);
  await shared.getByRole("button", { name: "EN" }).click();
  await expect(shared.getByText("Random Dice 2 Tree").first()).toBeVisible();
  await expect(shared.getByTestId("semantic-build-hash")).toHaveText(semantic!);
  expect(errors).toEqual([]);
  expect(sharedErrors).toEqual([]);
  await context.close();
});

test("V2 malformed share state fails safely", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/#b=v2.not-valid");
  await expect(page.getByTestId("share-warning")).toBeVisible();
  await expect(page.getByTestId("tree-canvas")).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile V2 canvas supports real touch pan and bounded layout", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/");
  const canvas = page.getByTestId("tree-canvas");
  const transform = page.getByTestId("tree-transform");
  const before = await transform.getAttribute("transform");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  // Start in a deliberately empty corner so this test measures canvas panning,
  // while the shared-build scenario above independently verifies mobile node taps.
  const x = box!.x + box!.width * .14;
  const y = box!.y + box!.height * .16;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 52, y: y + 42 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(transform).not.toHaveAttribute("transform", before ?? "");

  await page.getByTestId("node-global-bullet-observed-next").click();
  await expect(page.getByTestId("node-panel")).toHaveClass(/has-node/);
  await expect(page.getByTestId("share-button")).toBeVisible();
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport + 1);
  expect(errors).toEqual([]);
});
