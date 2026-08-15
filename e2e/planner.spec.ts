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

test("mobile canvas remains interactive", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await page.goto("/dicetree/");
  await expect(page.getByTestId("tree-canvas")).toBeVisible();
  await page.getByRole("button", { name: "목표" }).click();
  await expect(page.getByText("빌드 목표")).toBeVisible();
});
