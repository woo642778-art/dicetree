import { expect, test } from "@playwright/test";

test("planner supports goal selection, simulated investment and a share payload", async ({ page }) => {
  await page.goto("/dicetree/");
  await expect(page.getByRole("heading", { name: /랜덤다이스2/ })).toBeVisible();
  await page.getByTestId("node-global-bullet-observed-next").click();
  await page.getByTestId("node-panel").getByRole("button", { name: "+" }).click();
  await expect(page.getByTestId("resource-summary")).toContainText("3,000");
  await page.getByTestId("share-button").click();
  await expect(page.getByTestId("share-button")).toContainText(/복사됨|Share|copied/i);
});

test("mobile canvas remains interactive", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await page.goto("/dicetree/");
  await expect(page.getByTestId("tree-canvas")).toBeVisible();
  await page.getByRole("button", { name: "목표" }).click();
  await expect(page.getByText("빌드 목표")).toBeVisible();
});
