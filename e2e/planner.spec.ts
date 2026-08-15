import { expect, test } from "@playwright/test";

test("planner shares and restores the same semantic build across locales", async ({ page, browser }) => {
  await page.goto("/dicetree/");
  await expect(page.getByRole("heading", { name: /랜덤다이스2/ })).toBeVisible();

  await page.getByTestId("node-global-bullet-observed-next").click();
  await page.getByTestId("node-panel").getByRole("button", { name: "+" }).click();
  await expect(page.getByTestId("resource-summary")).toContainText("3,000");

  const semanticBuild = await page.getByTestId("semantic-build-hash").textContent();
  expect(semanticBuild).toBeTruthy();

  await page.getByTestId("share-button").click();
  const shareUrl = await page.getByTestId("share-url").inputValue();
  expect(shareUrl).toContain("/dicetree/#b=v1.");

  const freshContext = await browser.newContext();
  const sharedPage = await freshContext.newPage();
  await sharedPage.goto(shareUrl);
  await expect(sharedPage.getByTestId("resource-summary")).toContainText("3,000");
  await expect(sharedPage.getByTestId("semantic-build-hash")).toHaveText(semanticBuild!);

  await sharedPage.getByRole("button", { name: "EN" }).click();
  await expect(sharedPage.getByRole("heading", { name: "Random Dice 2 Tree Planner" })).toBeVisible();
  await expect(sharedPage.getByTestId("semantic-build-hash")).toHaveText(semanticBuild!);
  await freshContext.close();
});

test("malformed shared state fails safely", async ({ page }) => {
  await page.goto("/dicetree/#b=not-a-valid-build");
  await expect(page.getByTestId("share-warning")).toBeVisible();
  await expect(page.getByTestId("tree-canvas")).toBeVisible();
  await expect(page.getByTestId("resource-summary")).toContainText("0");
});

test("mobile canvas supports node investment, touch pan and bounded layout", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await page.goto("/dicetree/");
  const canvas = page.getByTestId("tree-canvas");
  await expect(canvas).toBeVisible();

  const transform = canvas.locator(":scope > g").first();
  const beforePan = await transform.getAttribute("transform");
  await canvas.dispatchEvent("pointerdown", { pointerId: 11, pointerType: "touch", clientX: 180, clientY: 380, buttons: 1 });
  await canvas.dispatchEvent("pointermove", { pointerId: 11, pointerType: "touch", clientX: 220, clientY: 420, buttons: 1 });
  await canvas.dispatchEvent("pointerup", { pointerId: 11, pointerType: "touch", clientX: 220, clientY: 420, buttons: 0 });
  await expect(transform).not.toHaveAttribute("transform", beforePan ?? "");

  await page.getByTestId("node-global-bullet-observed-next").click();
  await expect(page.getByTestId("node-panel")).toBeVisible();
  await page.getByTestId("node-panel").getByRole("button", { name: "+" }).click();
  await expect(page.getByTestId("resource-summary")).toContainText("3,000");

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport + 1);
});
