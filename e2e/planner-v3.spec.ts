import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

async function selectDiceByInternalId(page: Page, diceId: string) {
  await page.getByRole("textbox", { name: "주사위 검색" }).fill(diceId);
  const list = page.getByRole("listbox", { name: "주사위 목록" });
  const option = list.getByRole("option").first();
  await expect(option).toBeVisible();
  await option.click();
}

async function investTreeNode(page: Page, nodeId: string) {
  const node = page.getByTestId(`v3-node-${nodeId}`);
  await expect(node).toBeVisible();
  await expect(node).toHaveAttribute("data-can-increment", "true");
  const before = Number(await node.getAttribute("data-simulated-rank") ?? "0");
  await node.click();
  const increment = page.getByRole("button", { name: "가상 랭크 올리기" });
  await expect(increment).toBeEnabled();
  await increment.click();
  await expect(node).toHaveAttribute("data-simulated-rank", String(before + 1));
  await page.getByRole("button", { name: "닫기" }).click();
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
  const nodeTestId = await reachable.getAttribute("data-testid");
  expect(nodeTestId).toBeTruthy();
  const selectedNode = page.getByTestId(nodeTestId!);
  const beforeSimulatedRank = Number(await selectedNode.getAttribute("data-simulated-rank") ?? "0");
  await selectedNode.click();
  await expect(page.getByTestId("v3-node-detail-sheet")).toBeVisible();
  await page.screenshot({ path: `test-results/qa-v3-node-detail-${isMobile ? "mobile" : "desktop"}.png`, fullPage: false });
  const increment = page.getByRole("button", { name: "가상 랭크 올리기" });
  await expect(increment).toBeEnabled();
  await increment.click();
  await expect(selectedNode).toHaveAttribute("data-simulated-rank", String(beforeSimulatedRank + 1));
  const simulatedRank = await selectedNode.getAttribute("data-simulated-rank");
  expect(simulatedRank).not.toBeNull();

  await page.getByRole("button", { name: "공유" }).click();
  await expect.poll(() => page.url()).toContain("#b=v3.");
  const sharedUrl = page.url();

  const context = await browser.newContext();
  const shared = await context.newPage();
  const sharedErrors = captureBrowserErrors(shared);
  await shared.goto(sharedUrl);
  await expect(shared.getByRole("spinbutton", { name: "보유 골드" })).toHaveValue("9999999");
  await expect(shared.getByRole("spinbutton", { name: "보유 다이스 코어" })).toHaveValue("9999");
  await expect(shared.getByTestId(nodeTestId!)).toHaveAttribute("data-simulated-rank", simulatedRank!);
  expect(errors).toEqual([]);
  expect(sharedErrors).toEqual([]);
  await context.close();
});

test("V4 route planner applies prerequisites as one preview and supports cancellation", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop verifies the full route and header-level clear action; route logic is covered by unit tests on all viewports");
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/");
  await page.getByRole("spinbutton", { name: "보유 골드" }).fill("9999999");
  await page.getByRole("spinbutton", { name: "보유 다이스 코어" }).fill("9999");
  await page.getByTestId("v3-node-1205").click();

  const route = page.getByTestId("v4-route-plan");
  await expect(route).toBeVisible();
  await expect(route.locator("li")).toHaveCount(3);
  await expect(route).not.toContainText("<tag>");
  await expect(route).not.toContainText("{0}");
  await route.getByRole("button", { name: "경로 가상 적용" }).click();
  await expect(page.getByTestId("v3-node-1001")).toHaveAttribute("data-simulated-rank", "1");
  await expect(page.getByTestId("v3-node-1005")).toHaveAttribute("data-simulated-rank", "1");
  await expect(page.getByTestId("v3-node-1205")).toHaveAttribute("data-simulated-rank", "1");

  await route.getByRole("button", { name: "이 노드 계획 취소" }).click();
  await expect(page.getByTestId("v3-node-1205")).toHaveAttribute("data-simulated-rank", "0");
  await page.getByRole("button", { name: "전체 계획 취소" }).click();
  await expect(page.getByTestId("v3-node-1001")).toHaveAttribute("data-simulated-rank", "0");
  await expect(page.getByTestId("v3-node-1005")).toHaveAttribute("data-simulated-rank", "0");
  expect(errors).toEqual([]);
});

test("V3 Simulator exposes dice-specific conditions and partial-safe Predator output", async ({ page, isMobile }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/");
  await page.getByRole("button", { name: "시뮬레이터" }).click();
  await expect(page.getByTestId("v3-simulator-view")).toBeVisible();
  await expect(page.getByTestId("v3-condition-controls")).toBeVisible();
  await expect(page.getByTestId("v3-condition-controls")).toContainText("포식 스택");
  await expect(page.getByTestId("v3-condition-controls")).not.toContainText("sim_condition_");
  await expect(page.getByTestId("v3-stat-panel")).toContainText(/부분 계산|Partial/);
  await page.screenshot({ path: `test-results/qa-v3-predator-simulator-${isMobile ? "mobile" : "desktop"}.png`, fullPage: false });

  await selectDiceByInternalId(page, "gear");
  const conditionPanel = page.getByTestId("v3-condition-controls");
  await expect(conditionPanel).toBeVisible();
  await expect(conditionPanel.getByRole("spinbutton")).toBeVisible();
  await page.screenshot({ path: `test-results/qa-v3-gear-simulator-${isMobile ? "mobile" : "desktop"}.png`, fullPage: false });
  expect(errors).toEqual([]);
});

test("V3 client-table projection reacts to permanent level and battle upgrade without claiming exact DPS", async ({ page, isMobile }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/");
  await page.getByRole("button", { name: "시뮬레이터" }).click();
  await selectDiceByInternalId(page, "wind");

  await expect(page.getByTestId("stat-attack")).toContainText("100");
  await expect(page.getByTestId("stat-attackInterval")).toContainText("0.45");
  await page.getByRole("spinbutton", { name: "영구 주사위 레벨" }).fill("2");
  await page.getByRole("spinbutton", { name: "전투 파워업" }).fill("2");

  await expect(page.getByTestId("stat-attack")).toHaveAttribute("data-projected", "true");
  await expect(page.getByTestId("stat-attack")).toContainText("300");
  await expect(page.getByTestId("stat-attackInterval")).toContainText("0.425");
  await expect(page.getByTestId("stat-projectedBasicAttackDps")).toContainText("705.88");
  await expect(page.getByTestId("v3-stat-panel")).toContainText(/표 기반 예상|Table projection/);
  await expect(page.getByTestId("stat-practical-dps")).toHaveAttribute("data-dps-kind", "projected");
  await expect(page.getByTestId("stat-practical-dps")).toContainText("705.88");
  await expect(page.getByTestId("v3-damage-graph")).toContainText("특수효과 제외 기본 공격 피해");
  await page.screenshot({ path: `test-results/qa-v3-wind-growth-${isMobile ? "mobile" : "desktop"}.png`, fullPage: false });
  expect(errors).toEqual([]);
});

test("V3 custom enemy HP changes kill time through the shared scenario engine", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/");
  await page.getByRole("button", { name: "시뮬레이터" }).click();
  await selectDiceByInternalId(page, "wind");

  await page.getByRole("spinbutton", { name: "적 HP" }).fill("1000");
  await expect(page.getByTestId("stat-practical-dps")).toContainText("222.22");
  await expect(page.getByTestId("damage-kill-time")).toContainText("4.5s");
  await page.getByRole("spinbutton", { name: "적 HP" }).fill("2000");
  await expect(page.getByTestId("damage-kill-time")).toContainText("9s");
  expect(errors).toEqual([]);
});

test("V3 real Wind Dice Tree path changes the selected dice tree stat without fabricating practical DPS", async ({ page, isMobile }) => {
  test.skip(isMobile, "canonical multi-node route interaction is covered on desktop; mobile pan/detail flow is separate");
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/");
  await page.getByRole("spinbutton", { name: "보유 골드" }).fill("9999999");
  await page.getByRole("spinbutton", { name: "보유 다이스 코어" }).fill("9999");

  await page.getByRole("button", { name: "시뮬레이터" }).click();
  await selectDiceByInternalId(page, "wind");
  await page.getByRole("button", { name: "다이스 트리" }).click();

  await investTreeNode(page, "1001");
  await investTreeNode(page, "1005");
  await investTreeNode(page, "1205");

  await page.getByRole("button", { name: "시뮬레이터" }).click();
  const bullet = page.getByTestId("stat-bulletDamagePercent");
  await expect(bullet).toBeVisible();
  await expect.poll(async () => Number((await bullet.locator("strong").textContent())?.replaceAll(",", "") ?? "0")).toBeGreaterThan(0);
  await expect(page.getByTestId("stat-practical-dps")).toHaveAttribute("data-dps-kind", "baseline");
  await expect(page.getByTestId("stat-practical-dps")).not.toHaveText("—");
  expect(errors).toEqual([]);
});

test("V4 Deck Lab keeps live meta claims source-gated and opens its primary dealer in Simulator", async ({ page, isMobile }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/dicetree/");
  await page.getByRole("button", { name: "덱 연구소" }).click();
  await expect(page.getByTestId("v4-deck-lab")).toBeVisible();
  await expect(page.getByTestId("v4-meta-status")).toContainText("라이브 메타 미검증");
  await expect(page.getByTestId("v4-meta-status")).toContainText("랭킹·사용률 데이터가 없습니다");
  for (let index = 1; index <= 5; index += 1) await expect(page.getByTestId(`deck-slot-${index}`)).toBeVisible();
  await page.getByLabel("플레이 역할").selectOption("support");
  await page.getByLabel("투자 성향").selectOption("invested");
  await page.screenshot({ path: `test-results/qa-v4-deck-lab-${isMobile ? "mobile" : "desktop"}.png`, fullPage: true });
  await page.getByRole("button", { name: "주 딜러 시뮬레이션" }).click();
  await expect(page.getByTestId("v3-simulator-view")).toBeVisible();
  await expect(page.getByTestId("stat-practical-dps")).not.toHaveText("—");
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

  const nav = await page.getByRole("navigation", { name: "주요 화면" }).boundingBox();
  const viewport = page.viewportSize();
  expect(nav).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(nav!.y).toBeGreaterThan(viewport!.height / 2);
  expect(nav!.y + nav!.height).toBeLessThanOrEqual(viewport!.height);
  const navButtons = await page.getByRole("navigation", { name: "주요 화면" }).getByRole("button").evaluateAll((buttons) => (
    buttons.map((button) => ({ height: button.getBoundingClientRect().height, lines: button.getClientRects().length }))
  ));
  expect(navButtons.every(({ height, lines }) => height <= 48 && lines === 1)).toBe(true);
  expect(errors).toEqual([]);
});
