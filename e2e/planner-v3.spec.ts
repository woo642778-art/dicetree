import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

test("V3 Dice Tree invests, shares and restores Gold/Dice Core state", async ({ page, browser, isMobile }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/");
  await expect(page.getByTestId("v3-tree-view")).toBeVisible();
  await expect(page.getByTestId("v3-tree-canvas")).toBeVisible();
  await expect(page.getByLabel("다이스 트리 재화")).toContainText("골드");
  await expect(page.getByLabel("다이스 트리 재화")).toContainText("다이스 코어");
  await expect(page.locator("body")).not.toContainText("파란 재화");
  await expect(page.locator("body")).not.toContainText("빨간 재화");
  await expect(page.locator("body")).not.toContainText("프리즘 재화");
  await page.screenshot({ path: `test-results/qa-v3-tree-${isMobile ? "mobile" : "desktop"}.png`, fullPage: false });

  await page.getByRole("spinbutton", { name: "보유 골드" }).fill("9999999");
  await page.getByRole("spinbutton", { name: "보유 다이스 코어" }).fill("9999");
  const reachable = page.locator('[data-tree-node="true"][data-can-increment="true"]').first();
  await expect(reachable).toBeVisible();
  await reachable.click();
  await expect(page.getByTestId("v3-node-detail-sheet")).toBeVisible();
  await page.screenshot({ path: `test-results/qa-v3-node-detail-${isMobile ? "mobile" : "desktop"}.png`, fullPage: false });
  const increment = page.getByRole("button", { name: "가상 랭크 올리기" });
  await expect(increment).toBeEnabled();
  await increment.click();

  await page.getByRole("button", { name: "공유" }).click();
  await expect.poll(() => page.url()).toContain("#b=v3.");
  const sharedUrl = page.url();

  const context = await browser.newContext();
  const shared = await context.newPage();
  const sharedErrors = captureBrowserErrors(shared);
  await shared.goto(sharedUrl);
  await expect(shared.getByRole("spinbutton", { name: "보유 골드" })).toHaveValue("9999999");
  await expect(shared.getByRole("spinbutton", { name: "보유 다이스 코어" })).toHaveValue("9999");
  await expect(shared.locator('[data-tree-node="true"][data-node-state="simulated"]').first()).toBeVisible();
  expect(errors).toEqual([]);
  expect(sharedErrors).toEqual([]);
  await context.close();
});

test("V3 Simulator exposes dice-specific conditions and partial-safe Predator output", async ({ page, isMobile }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/");
  await page.getByRole("button", { name: "시뮬레이터" }).click();
  await expect(page.getByTestId("v3-simulator-view")).toBeVisible();
  await expect(page.getByTestId("v3-condition-controls")).toBeVisible();
  await expect(page.getByTestId("v3-stat-panel")).toContainText(/부분 계산|Partial/);
  await page.screenshot({ path: `test-results/qa-v3-predator-simulator-${isMobile ? "mobile" : "desktop"}.png`, fullPage: false });

  const diceList = page.getByRole("listbox", { name: "주사위 목록" });
  const search = page.getByRole("textbox", { name: "주사위 검색" });
  await search.fill("gear");
  const gear = diceList.getByRole("option").first();
  await expect(gear).toBeVisible();
  await gear.click();
  const conditionPanel = page.getByTestId("v3-condition-controls");
  await expect(conditionPanel).toBeVisible();
  await expect(conditionPanel.getByRole("spinbutton")).toBeVisible();
  await page.screenshot({ path: `test-results/qa-v3-gear-simulator-${isMobile ? "mobile" : "desktop"}.png`, fullPage: false });
  expect(errors).toEqual([]);
});

test("V3 Compare uses the shared engine and stays confidence-aware", async ({ page, isMobile }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/");
  await page.getByRole("button", { name: "비교" }).click();
  await expect(page.getByTestId("v3-compare-view")).toBeVisible();
  await expect(page.getByTestId("compare-left")).toBeVisible();
  await expect(page.getByTestId("compare-right")).toBeVisible();
  await expect(page.getByTestId("compare-delta")).toBeVisible();
  await page.screenshot({ path: `test-results/qa-v3-compare-${isMobile ? "mobile" : "desktop"}.png`, fullPage: false });
  expect(errors).toEqual([]);
});

test("V3 malformed share state fails safely", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/#b=v3.not-valid");
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.getByTestId("v3-tree-canvas")).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile V3 tree supports touch pan and bottom-sheet node details", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/");
  const canvas = page.getByTestId("v3-tree-canvas");
  const transform = page.getByTestId("v3-tree-transform");
  const before = await transform.getAttribute("transform");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width * .18;
  const y = box!.y + box!.height * .28;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 54, y: y + 44 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(transform).not.toHaveAttribute("transform", before ?? "");

  const reachable = page.locator('[data-tree-node="true"][data-can-increment="true"]').first();
  await reachable.click();
  await expect(page.getByTestId("v3-node-detail-sheet")).toBeVisible();
  const sheetPosition = await page.getByTestId("v3-node-detail-sheet").evaluate((element) => getComputedStyle(element).position);
  expect(sheetPosition).toBe("fixed");
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport + 1);
  expect(errors).toEqual([]);
});
