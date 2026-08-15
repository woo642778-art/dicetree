import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

test("planner shares and restores the same semantic build across locales", async ({ page, browser, isMobile }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto("/dicetree/");
  await expect(page.getByRole("heading", { name: /랜덤다이스2/ })).toBeVisible();

  await page.getByTestId("node-global-bullet-observed-next").click();
  await page.getByTestId("node-panel").getByRole("button", { name: "+" }).click();
  await expect(page.getByTestId("resource-summary")).toContainText("3,000");

  const semanticBuild = await page.getByTestId("semantic-build-hash").textContent();
  expect(semanticBuild).toBeTruthy();

  await page.getByTestId("share-button").click();
  await expect(page.getByTestId("share-popover")).toBeVisible();
  const shareUrl = await page.getByTestId("share-url").inputValue();
  expect(shareUrl).toContain("/dicetree/#b=v1.");
  await page.screenshot({ path: `test-results/qa-share-${isMobile ? "mobile" : "desktop"}.png`, fullPage: false });

  const freshContext = await browser.newContext();
  const sharedPage = await freshContext.newPage();
  const sharedErrors = captureBrowserErrors(sharedPage);
  await sharedPage.goto(shareUrl);
  await expect(sharedPage.getByTestId("resource-summary")).toContainText("3,000");
  await expect(sharedPage.getByTestId("semantic-build-hash")).toHaveText(semanticBuild!);

  await sharedPage.getByRole("button", { name: "EN" }).click();
  await expect(sharedPage.getByRole("heading", { name: "Random Dice 2 Tree Planner" })).toBeVisible();
  await expect(sharedPage.getByTestId("semantic-build-hash")).toHaveText(semanticBuild!);
  expect(browserErrors).toEqual([]);
  expect(sharedErrors).toEqual([]);
  await freshContext.close();
});

test("malformed shared state fails safely", async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto("/dicetree/#b=not-a-valid-build");
  await expect(page.getByTestId("share-warning")).toBeVisible();
  await expect(page.getByTestId("tree-canvas")).toBeVisible();
  await expect(page.getByTestId("resource-summary")).toContainText("0");
  expect(browserErrors).toEqual([]);
});

test("mobile canvas supports node investment, real touch pan, sharing and bounded layout", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  const browserErrors = captureBrowserErrors(page);
  await page.goto("/dicetree/");
  const canvas = page.getByTestId("tree-canvas");
  await expect(canvas).toBeVisible();

  const transform = canvas.locator(":scope > g").first();
  const beforePan = await transform.getAttribute("transform");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width * 0.55;
  const y = box!.y + box!.height * 0.55;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 45, y: y + 35 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(transform).not.toHaveAttribute("transform", beforePan ?? "");

  await page.getByTestId("node-global-bullet-observed-next").click();
  await expect(page.getByTestId("node-panel")).toBeVisible();
  await page.getByTestId("node-panel").getByRole("button", { name: "+" }).click();
  await expect(page.getByTestId("resource-summary")).toContainText("3,000");

  await expect(page.getByTestId("share-button")).toBeVisible();
  await page.getByTestId("share-button").click();
  await expect(page.getByTestId("share-popover")).toBeVisible();
  await expect(page.getByTestId("share-url")).toHaveValue(/\/dicetree\/#b=v1\./);
  await page.screenshot({ path: "test-results/qa-mobile-tree.png", fullPage: false });

  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport + 1);
  expect(browserErrors).toEqual([]);
});
