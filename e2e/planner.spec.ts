import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

test("exact IPA tree plans Chaos attack speed and restores the shared build", async ({ page, browser, isMobile }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/");
  await expect(page.getByTestId("tree-canvas")).toBeVisible();
  if (!isMobile) await expect(page.getByText("239 노드")).toBeVisible();
  await expect(page.getByText("포식 시뮬레이터")).toBeVisible();

  await page.getByTestId("node-5103").click();
  await expect(page.getByTestId("node-panel")).toContainText("혼돈 주사위 공격속도");
  await page.getByRole("button", { name: "rank up" }).click();
  await expect(page.getByText("트리 공격속도").locator("..")).toContainText("+5%");
  await expect(page.getByTestId("resource-summary")).toContainText("−3,000");

  await page.screenshot({ path: `test-results/qa-rd3-tree-${isMobile ? "mobile" : "desktop"}.png`, fullPage: false });

  const semanticBefore = await page.locator("body").evaluate(() => window.location.href);
  expect(semanticBefore).toContain("/dicetree/");

  await page.getByTestId("share-button").click();
  await expect(page.getByTestId("share-popover")).toBeVisible();
  const url = await page.getByTestId("share-url").inputValue();
  expect(url).toContain("/dicetree/#b=v3.");
  await page.screenshot({ path: `test-results/qa-rd3-share-${isMobile ? "mobile" : "desktop"}.png`, fullPage: false });

  const context = await browser.newContext();
  const shared = await context.newPage();
  const sharedErrors = captureBrowserErrors(shared);
  await shared.goto(url);
  await expect(shared.getByText("트리 공격속도").locator("..")).toContainText("+5%");
  await expect(shared.getByTestId("resource-summary")).toContainText("−3,000");
  await shared.getByRole("button", { name: "EN" }).click();
  await expect(shared.getByText("Predator Dice simulator")).toBeVisible();
  expect(errors).toEqual([]);
  expect(sharedErrors).toEqual([]);
  await context.close();
});

test("Predator simulator follows extracted level and Power-Up table deltas", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/");
  await expect(page.getByText("포식 시뮬레이터")).toBeVisible();

  const dotSlider = page.getByRole("slider", { name: /눈금 레벨/ });
  const powerSlider = page.getByRole("slider", { name: /^파워업/ });
  await dotSlider.fill("4");
  await powerSlider.fill("3");

  await expect(page.getByText("공격 주기").locator("..")).toContainText("2.54s");
  await expect(page.getByText("사거리").locator("..")).toContainText("1.35");
  await expect(page.getByText("포식 증가량").locator("..")).toContainText("140");
  expect(errors).toEqual([]);
});

test("malformed V3 share state fails safely", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/#b=v3.not-valid");
  await expect(page.getByTestId("share-warning")).toBeVisible();
  await expect(page.getByTestId("tree-canvas")).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile exact tree supports touch pan and remains horizontally bounded", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/");

  const canvas = page.getByTestId("tree-canvas");
  const transform = page.getByTestId("tree-transform");
  const before = await transform.getAttribute("transform");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  const x = box!.x + box!.width * .25;
  const y = box!.y + box!.height * .25;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 60, y: y + 45 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(transform).not.toHaveAttribute("transform", before ?? "");

  await page.getByRole("button", { name: /포식 주사위/ }).click();
  await expect(page.getByText("포식 시뮬레이터")).toBeVisible();
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport + 1);
  expect(errors).toEqual([]);
});
