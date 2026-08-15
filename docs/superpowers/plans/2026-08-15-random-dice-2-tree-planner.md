# Random Dice 2 Tree Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publicly deploy a bilingual, login-free Random Dice 2 tree planner that supports verified-data-only simulation, resource accounting, explainable route recommendations, local saves, and versioned URL sharing.

**Architecture:** Use a client-only React + TypeScript + Vite SPA. Keep game data, planner state, optimization, sharing, storage, and UI isolated behind typed interfaces. Render the tree as SVG with pan/zoom so the site remains static-host friendly and can deploy directly to GitHub Pages.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, Playwright, SVG, localStorage, GitHub Actions, GitHub Pages.

## Global Constraints

- Only verified game data may be treated as factual.
- Unverified nodes remain visible as `미확인` / `Unverified` and never contribute invented values to optimizer scoring.
- Korean is the default locale; English is selectable.
- Shared builds must restore without login or backend storage.
- Shared build semantics must be independent of display language.
- Desktop and mobile must support tree pan/zoom, including mouse and touch.
- Exact DPS numbers are shown only when the relevant formula and inputs are verified.
- V1 has no accounts, database, cloud build storage, comments, public rankings, or opaque AI optimization.
- All production deployments must pass tests and production build first.

---

## File Structure

- `package.json`: scripts and dependencies.
- `vite.config.ts`: Vite, test, and GitHub Pages base-path configuration.
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`: TypeScript project configuration.
- `index.html`: SPA entry document.
- `src/main.tsx`: React bootstrap.
- `src/app/App.tsx`: page shell and feature composition.
- `src/app/app.css`: global layout and visual tokens.
- `src/domain/types.ts`: stable domain types for nodes, dice, resources, effects, planner state, recommendations.
- `src/domain/treeRules.ts`: prerequisites, rank mutations, descendant rollback calculation.
- `src/domain/costs.ts`: purchased-rank and route-cost aggregation.
- `src/domain/effects.ts`: verified effect evaluation and confidence handling.
- `src/tree-data/dataVersion.ts`: active dataset version.
- `src/tree-data/dice.ts`: verified dice metadata and role/family tags.
- `src/tree-data/nodes.ts`: verified nodes plus explicit unverified placeholders.
- `src/tree-data/validateDataset.ts`: duplicate-ID, graph, rank, cost, and localization validation.
- `src/planner/plannerReducer.ts`: undoable semantic planner actions.
- `src/planner/selectors.ts`: derived totals, availability, and selected build projections.
- `src/optimizer/profileWeights.ts`: F2P/light/spender objective weights.
- `src/optimizer/scoreCandidate.ts`: marginal utility and route-cost scoring.
- `src/optimizer/recommend.ts`: deterministic candidate generation and ordered route recommendations.
- `src/share/codec.ts`: stable, URL-safe, versioned state encoding/decoding.
- `src/share/migrate.ts`: forward migration of supported state versions.
- `src/storage/buildStorage.ts`: versioned named localStorage builds.
- `src/i18n/strings.ts`: Korean and English interface strings.
- `src/i18n/I18nContext.tsx`: locale state and translation helper.
- `src/features/tree/TreeCanvas.tsx`: SVG tree rendering, node states, pointer/touch interaction.
- `src/features/tree/usePanZoom.ts`: pointer-centered wheel zoom, drag pan, pinch zoom.
- `src/features/planner/GoalPanel.tsx`: focus dice, role, spending profile, optional budget.
- `src/features/planner/ResourceSummary.tsx`: spent and route cost display.
- `src/features/analysis/NodePanel.tsx`: selected-node details and source/confidence information.
- `src/features/analysis/RecommendationPanel.tsx`: explainable ordered recommendations.
- `src/features/share/ShareButton.tsx`: fragment URL generation and clipboard action.
- `src/features/storage/BuildManager.tsx`: local named save/load/delete UI.
- `src/test/fixtures.ts`: small verified and mixed-confidence test datasets.
- `src/**/*.test.ts(x)`: unit/component tests colocated with implementation.
- `e2e/planner.spec.ts`: end-to-end planner/share/mobile flows.
- `.github/workflows/pages.yml`: CI build/test and GitHub Pages deployment.
- `README.md`: usage, verified-data policy, development commands, deployed URL.

---

### Task 1: Application foundation and verified domain model

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/app.css`
- Create: `src/domain/types.ts`
- Create: `src/tree-data/dataVersion.ts`
- Create: `src/tree-data/dice.ts`
- Create: `src/tree-data/nodes.ts`
- Create: `src/tree-data/validateDataset.ts`
- Test: `src/tree-data/validateDataset.test.ts`

**Interfaces:**
- Produces `TreeNodeDefinition`, `DiceDefinition`, `PlannerStateV1`, `EffectDefinition`, `VerificationMetadata`, `ResourceTotals`.
- Produces `validateDataset(nodes, dice): DatasetValidationResult`.
- Later tasks consume stable IDs from `nodes.ts` and `dice.ts` only.

- [ ] **Step 1: Create the test and toolchain definitions**

Create package scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint:data": "vitest run src/tree-data/validateDataset.test.ts"
  }
}
```

Add React, React DOM, TypeScript, Vite, Vitest, Testing Library, jsdom, Playwright, and their required type packages as committed dependencies/devDependencies with a lockfile produced by `npm install`.

- [ ] **Step 2: Write failing dataset validation tests**

```ts
it("rejects duplicate node ids", () => {
  const result = validateDataset([node("n1"), node("n1")], []);
  expect(result.errors).toContain("duplicate-node-id:n1");
});

it("rejects unknown prerequisites", () => {
  const result = validateDataset([
    node("n1", { prerequisites: [{ nodeId: "missing", minRank: 1 }] })
  ], []);
  expect(result.errors).toContain("unknown-prerequisite:n1:missing");
});

it("allows explicit unverified nodes without numeric effects", () => {
  const result = validateDataset([unverifiedNode("unknown-order-01")], []);
  expect(result.errors).toEqual([]);
});
```

- [ ] **Step 3: Run the tests and confirm failure**

Run `npm test -- src/tree-data/validateDataset.test.ts`.

Expected result: test module cannot resolve domain/data files yet.

- [ ] **Step 4: Implement domain types and dataset validator**

Define exact discriminated unions:

```ts
export type DiceFamily = "order" | "chaos" | "magic" | "engineering" | "nature";
export type VerificationStatus = "verified" | "partial" | "unverified";
export type ResourceType = "gold" | "core" | "token";
export type PlannerRole = "dealer" | "support" | "balanced";
export type SpendingProfile = "f2p" | "light" | "spender";

export interface VerificationMetadata {
  status: VerificationStatus;
  checkedAt: string;
  sourceLabel?: string;
  sourceUrl?: string;
  gameVersion?: string;
  notes?: string;
}

export type EffectDefinition =
  | { kind: "bulletDamagePercent"; amount: number; appliesTo: "all" | DiceFamily | { diceIds: string[] }; verifiedFormula: boolean }
  | { kind: "attackSpeedPercent"; amount: number; appliesTo: DiceFamily | { diceIds: string[] }; verifiedFormula: boolean }
  | { kind: "supportUtility"; utilityKey: string; amount: number; appliesTo: { diceIds: string[] } };
```

Implement validation for duplicate IDs, unknown prerequisites, rank bounds, malformed costs, missing dice references, and graph cycles. Unverified nodes may omit level effects but must still have stable IDs and positions.

- [ ] **Step 5: Seed the first verified dataset conservatively**

Add only data already verified from available screenshots/research during implementation. Every uncertain node is represented as an unverified placeholder with no invented numeric effect. Include initial focus dice records for Devourer, Corruption, and Taiji only when their family/role relationships are verified.

- [ ] **Step 6: Add minimal app shell and render dataset counts**

`App.tsx` initially renders the title plus counts of verified and unverified nodes so the application compiles before interactive features are added.

- [ ] **Step 7: Run validation tests and production build**

Run `npm test -- src/tree-data/validateDataset.test.ts && npm run build`.

Expected result: all tests pass and Vite emits `dist/`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig*.json index.html src
 git commit -m "feat: scaffold verified tree planner domain"
```

---

### Task 2: Tree investment rules, costs, and undoable planner state

**Files:**
- Create: `src/domain/treeRules.ts`
- Create: `src/domain/costs.ts`
- Create: `src/planner/plannerReducer.ts`
- Create: `src/planner/selectors.ts`
- Create: `src/test/fixtures.ts`
- Test: `src/domain/treeRules.test.ts`
- Test: `src/domain/costs.test.ts`
- Test: `src/planner/plannerReducer.test.ts`

**Interfaces:**
- Produces `canIncrement(nodeId, ranks, definitions): boolean`.
- Produces `getRollbackSet(nodeId, targetRank, ranks, definitions): Record<string, number>`.
- Produces `calculateSpentResources(ranks, definitions): ResourceTotals`.
- Produces `calculateRouteCost(route, ranks, definitions): ResourceTotals`.
- Produces reducer actions `increment`, `decrement`, `applyRoute`, `reset`, `load`, `undo`, `redo`.

- [ ] **Step 1: Write failing prerequisite and rollback tests**

```ts
it("blocks a node until its minimum prerequisite rank is met", () => {
  expect(canIncrement("b", { a: 0, b: 0 }, fixtureNodes)).toBe(false);
  expect(canIncrement("b", { a: 1, b: 0 }, fixtureNodes)).toBe(true);
});

it("returns downstream rollback ranks when a prerequisite is removed", () => {
  expect(getRollbackSet("a", 0, { a: 1, b: 1, c: 1 }, fixtureNodes)).toEqual({ b: 0, c: 0 });
});
```

- [ ] **Step 2: Write failing cost tests for non-constant per-rank costs**

```ts
it("sums the exact purchased rank costs", () => {
  expect(calculateSpentResources({ scaling: 3 }, fixtureNodes)).toEqual({ gold: 6000, core: 1, token: 0 });
});
```

- [ ] **Step 3: Run tests and verify failure**

Run `npm test -- src/domain/treeRules.test.ts src/domain/costs.test.ts src/planner/plannerReducer.test.ts`.

- [ ] **Step 4: Implement prerequisite graph traversal and exact cost aggregation**

Use stable node IDs and per-level cost records. Never infer rank costs from a displayed first-rank value.

- [ ] **Step 5: Implement history-based semantic reducer**

Use:

```ts
export interface PlannerHistory {
  past: PlannerStateV1[];
  present: PlannerStateV1;
  future: PlannerStateV1[];
}
```

`undo` and `redo` restore semantic states. `applyRoute` is one undo step even when it raises multiple node ranks.

- [ ] **Step 6: Run full unit suite and build**

Run `npm test && npm run build`.

- [ ] **Step 7: Commit**

```bash
git add src/domain src/planner src/test
 git commit -m "feat: add tree investment and resource rules"
```

---

### Task 3: Versioned share links and local named builds

**Files:**
- Create: `src/share/codec.ts`
- Create: `src/share/migrate.ts`
- Create: `src/storage/buildStorage.ts`
- Test: `src/share/codec.test.ts`
- Test: `src/storage/buildStorage.test.ts`

**Interfaces:**
- Produces `encodePlannerState(state: PlannerStateV1): string`.
- Produces `decodePlannerState(encoded: string, validNodeIds: Set<string>): DecodeResult`.
- Produces `loadSharedStateFromHash(hash: string): DecodeResult | null`.
- Produces `saveNamedBuild(name, state)`, `listNamedBuilds()`, `loadNamedBuild(id)`, `deleteNamedBuild(id)`.

- [ ] **Step 1: Write failing codec round-trip and rejection tests**

```ts
it("round trips semantic state without locale", () => {
  const encoded = encodePlannerState(sampleState);
  expect(decodePlannerState(encoded, validNodeIds).state).toEqual(sampleState);
  expect(encoded).not.toContain("ko");
});

it("drops unknown node ids and reports warnings", () => {
  const result = decodePlannerState(encodedWithRemovedNode, validNodeIds);
  expect(result.warnings).toContain("unknown-node:removed-node");
});
```

- [ ] **Step 2: Implement deterministic URL-safe serialization**

Serialize canonical JSON with sorted rank keys, encode UTF-8 bytes as base64url, and prefix with schema marker `v1.`. Validate schema version, numeric rank bounds, and allowed enum values during decode. Return warnings for unknown current-dataset node IDs rather than crashing.

- [ ] **Step 3: Write failing storage corruption-isolation tests**

```ts
it("loads valid builds when one localStorage entry is corrupt", () => {
  localStorage.setItem("dicetree.build.good", JSON.stringify(validStoredBuild));
  localStorage.setItem("dicetree.build.bad", "{");
  expect(listNamedBuilds().map(x => x.name)).toEqual(["Good"]);
});
```

- [ ] **Step 4: Implement versioned local build storage**

Use keys `dicetree.build.<uuid>` and index key `dicetree.build-index.v1`. Preserve `createdAt` while updating `modifiedAt`.

- [ ] **Step 5: Run tests and build**

Run `npm test -- src/share src/storage && npm run build`.

- [ ] **Step 6: Commit**

```bash
git add src/share src/storage
 git commit -m "feat: add local builds and share links"
```

---

### Task 4: Explainable deterministic optimizer

**Files:**
- Create: `src/domain/effects.ts`
- Create: `src/optimizer/profileWeights.ts`
- Create: `src/optimizer/scoreCandidate.ts`
- Create: `src/optimizer/recommend.ts`
- Test: `src/domain/effects.test.ts`
- Test: `src/optimizer/recommend.test.ts`

**Interfaces:**
- Produces `evaluateEffect(effect, context): EvaluatedEffect` with `mode: "exact" | "heuristic" | "unsupported"`.
- Produces `scoreCandidate(candidate, context): RecommendationScore`.
- Produces `recommendNextRoutes(state, definitions, dice, options): Recommendation[]`.
- Each recommendation contains `route`, `incrementalCosts`, `score`, `confidence`, and `reasons[]`.

- [ ] **Step 1: Write failing tests that prohibit invented exact DPS**

```ts
it("does not emit exact attack-speed DPS when the formula is unverified", () => {
  const result = evaluateEffect(unverifiedAttackSpeedEffect, context);
  expect(result.mode).toBe("heuristic");
  expect(result.exactPercent).toBeUndefined();
});
```

- [ ] **Step 2: Write failing profile and broad-coverage recommendation tests**

```ts
it("f2p prefers the lower-cost broad verified route", () => {
  const [first] = recommendNextRoutes(state, nodes, dice, { profile: "f2p", primaryDieId: "devourer", secondaryDieIds: ["corruption"] });
  expect(first.route.at(-1)).toBe("chaos-speed");
  expect(first.reasons).toContain("affects-multiple-focus-dice");
});
```

Fixture values must be synthetic and explicitly test-only; they are not copied into production game data.

- [ ] **Step 3: Implement effect evaluation boundaries**

Bullet-damage and attack-speed arithmetic only return exact numeric DPS when `verifiedFormula === true` and all required current-stat inputs are supplied. Otherwise return heuristic coverage utility and explanation.

- [ ] **Step 4: Implement spending profiles as transparent configuration**

```ts
export const PROFILE_WEIGHTS = {
  f2p: { resourceEfficiency: 1.5, focusPower: 1.0, broadReuse: 1.4, ceiling: 0.6 },
  light: { resourceEfficiency: 1.1, focusPower: 1.2, broadReuse: 1.0, ceiling: 1.0 },
  spender: { resourceEfficiency: 0.6, focusPower: 1.4, broadReuse: 0.7, ceiling: 1.5 }
} as const;
```

Keep these as recommendation policy weights, never as claims about game mechanics.

- [ ] **Step 5: Implement deterministic route generation and tie-breaking**

Generate reachable verified next-rank candidates and prerequisite-inclusive destination routes. Sort by score descending, then lower normalized cost, then stable node ID to guarantee identical outputs for identical state.

- [ ] **Step 6: Run optimizer tests and build**

Run `npm test -- src/domain/effects.test.ts src/optimizer/recommend.test.ts && npm run build`.

- [ ] **Step 7: Commit**

```bash
git add src/domain/effects.ts src/optimizer
 git commit -m "feat: add explainable build optimizer"
```

---

### Task 5: Bilingual SVG tree planner UI

**Files:**
- Create: `src/i18n/strings.ts`
- Create: `src/i18n/I18nContext.tsx`
- Create: `src/features/tree/usePanZoom.ts`
- Create: `src/features/tree/TreeCanvas.tsx`
- Create: `src/features/planner/GoalPanel.tsx`
- Create: `src/features/planner/ResourceSummary.tsx`
- Create: `src/features/analysis/NodePanel.tsx`
- Create: `src/features/analysis/RecommendationPanel.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/app.css`
- Test: `src/features/tree/TreeCanvas.test.tsx`
- Test: `src/i18n/I18nContext.test.tsx`

**Interfaces:**
- Consumes planner reducer, selectors, dataset, optimizer, and translations.
- `TreeCanvas` receives definitions, ranks, selected node ID, recommendation IDs, and mutation callbacks.
- UI uses no hard-coded balance constants.

- [ ] **Step 1: Write failing node-state rendering tests**

```tsx
it("renders unverified nodes as non-investable", () => {
  render(<TreeCanvas {...propsWithUnverifiedNode} />);
  expect(screen.getByRole("button", { name: /unverified/i })).toHaveAttribute("aria-disabled", "true");
});
```

- [ ] **Step 2: Write failing language semantic-state test**

```tsx
it("switching locale does not mutate planner ranks", async () => {
  const before = store.getState().present.ranks;
  await user.click(screen.getByRole("button", { name: "English" }));
  expect(store.getState().present.ranks).toEqual(before);
});
```

- [ ] **Step 3: Implement SVG graph rendering**

Render prerequisite edges first, then node groups. Node buttons expose family/name/rank/verification state through accessible labels. Apply separate classes for available, locked, invested, recommended, focused, and unverified states.

- [ ] **Step 4: Implement desktop and touch pan/zoom**

Use an SVG view transform `{x, y, scale}`. Wheel zoom keeps the pointer's world coordinate stationary. One-pointer drag pans. Two-pointer distance changes scale around the pinch midpoint. Clamp scale to `0.35..2.5`.

- [ ] **Step 5: Implement goal, node, recommendation, and resource panels**

Desktop uses collapsible side panels. Mobile uses bottom-sheet style panels controlled by CSS media queries. Recommendation entries show confidence, incremental cost, affected focus dice, and textual reasons.

- [ ] **Step 6: Implement dark tree-first visual system**

Use CSS variables for background, surfaces, typography, borders, and family accents. Do not copy proprietary game/reference artwork. Distinguish verification and recommendation states with shape/border/text in addition to color.

- [ ] **Step 7: Run component tests and build**

Run `npm test -- src/features src/i18n && npm run build`.

- [ ] **Step 8: Commit**

```bash
git add src/app src/features src/i18n
 git commit -m "feat: build interactive bilingual tree planner UI"
```

---

### Task 6: Share, save/load, search, filters, and route actions in the UI

**Files:**
- Create: `src/features/share/ShareButton.tsx`
- Create: `src/features/storage/BuildManager.tsx`
- Create: `src/features/tree/TreeToolbar.tsx`
- Modify: `src/app/App.tsx`
- Test: `src/features/share/ShareButton.test.tsx`
- Test: `src/features/storage/BuildManager.test.tsx`
- Test: `src/features/tree/TreeToolbar.test.tsx`

**Interfaces:**
- Share button writes `#b=<encoded-state>` using `encodePlannerState`.
- App bootstrap reads `window.location.hash` once and safely loads valid shared semantic state.
- Toolbar filters are visual-only and never remove invested ranks from semantic state.

- [ ] **Step 1: Write failing share-link component test**

```tsx
it("copies a URL fragment that restores the current semantic build", async () => {
  await user.click(screen.getByRole("button", { name: /share/i }));
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("#b=v1."));
});
```

- [ ] **Step 2: Implement share bootstrap and safe warning UI**

Malformed payloads open an empty planner and show a dismissible warning. Unknown removed node IDs are ignored with a warning; valid remaining ranks load.

- [ ] **Step 3: Implement named build manager**

Support save, rename-by-resave, load, delete, and timestamps. Prevent blank names. Storage errors do not discard current unsaved planner state.

- [ ] **Step 4: Implement die/node search and family filters**

Search Korean/English localized names plus stable tags. Family filters dim nonmatching branches rather than mutating planner state.

- [ ] **Step 5: Wire destination route cost and optimizer apply action**

Selecting a recommendation shows total prerequisite-inclusive incremental cost. Applying it dispatches one `applyRoute` reducer action so one Undo restores the previous build.

- [ ] **Step 6: Run tests and build**

Run `npm test && npm run build`.

- [ ] **Step 7: Commit**

```bash
git add src/app src/features
 git commit -m "feat: add sharing storage and planner tools"
```

---

### Task 7: End-to-end verification and accessibility/responsive hardening

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/planner.spec.ts`
- Modify: `src/app/app.css`
- Modify: affected components from Tasks 5-6 when tests expose issues.

**Interfaces:**
- E2E runs against production-equivalent Vite preview.
- Shared state equality compares semantic ranks/goals, not translated text.

- [ ] **Step 1: Write desktop end-to-end flow**

```ts
test("simulate, recommend, share, and restore", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /verified test node/i }).click();
  await page.getByLabel(/primary die/i).selectOption("devourer");
  await page.getByRole("button", { name: /apply recommendation/i }).click();
  const shared = await page.getByTestId("share-url").textContent();
  const fresh = await context.newPage();
  await fresh.goto(shared!);
  await expect(fresh.getByTestId("semantic-build-hash")).toHaveText(await page.getByTestId("semantic-build-hash").textContent() as string);
});
```

Use stable `data-testid` only for semantic-state verification that has no appropriate user-facing role selector.

- [ ] **Step 2: Add language persistence and invalid-share E2E cases**

Verify that switching to English changes labels but not semantic build hash. Open an intentionally malformed `#b=` payload and verify the planner remains usable with a warning.

- [ ] **Step 3: Add mobile viewport pan/zoom and node interaction case**

Run at a phone viewport such as `390x844`, open a node, change a rank, open the bottom-sheet details, and verify no horizontal page overflow.

- [ ] **Step 4: Fix keyboard focus, reduced-motion, contrast-state redundancy, and responsive overflow issues found by tests**

All clickable non-SVG controls use native interactive elements. SVG nodes expose keyboard-triggerable buttons or equivalent focusable elements with visible focus styling.

- [ ] **Step 5: Run complete verification**

Run:

```bash
npm test
npm run build
npm run test:e2e
```

Expected result: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e src
 git commit -m "test: verify planner end to end"
```

---

### Task 8: GitHub Pages deployment and project documentation

**Files:**
- Create: `.github/workflows/pages.yml`
- Create: `README.md`
- Modify: `vite.config.ts`

**Interfaces:**
- Production base path is `/dicetree/`.
- Workflow uploads `dist/` only after tests and build pass.

- [ ] **Step 1: Configure Vite base path**

Set:

```ts
export default defineConfig({
  base: "/dicetree/"
});
```

Preserve Vitest configuration in the same file or merge through `vitest/config` typing as needed.

- [ ] **Step 2: Add Pages workflow**

The workflow triggers on pushes to `main` and manual dispatch, grants `pages: write` and `id-token: write`, checks out the repository, sets up Node with npm cache, runs `npm ci`, `npm test`, `npm run build`, uploads `dist`, and deploys using official GitHub Pages actions.

- [ ] **Step 3: Add README**

Document:

- what the planner does
- verified/unverified data policy
- Korean/English support
- local-only named builds
- URL-fragment sharing and privacy properties
- `npm ci`, `npm run dev`, `npm test`, `npm run build`, `npm run test:e2e`
- source/data contribution expectations
- public Pages URL format `https://woo642778-art.github.io/dicetree/`

- [ ] **Step 4: Run local release gate**

Run:

```bash
npm test
npm run build
npm run test:e2e
```

Expected result: all pass with a clean working tree except intended README/workflow/config changes.

- [ ] **Step 5: Commit deployment files**

```bash
git add .github README.md vite.config.ts
 git commit -m "ci: deploy tree planner to GitHub Pages"
```

- [ ] **Step 6: Push implementation branch and open a pull request**

Open a PR from `feat/v1-tree-planner` to `main` summarizing verified-data constraints, planner features, test results, and Pages deployment behavior.

- [ ] **Step 7: Review CI before merge**

Do not merge while tests/build are failing. Inspect workflow logs and fix failures on the implementation branch until the PR checks are green.

- [ ] **Step 8: Merge and verify public deployment**

After merge, verify the Pages workflow succeeds and the public URL loads the planner. Verify one generated share link opens the same semantic build in a fresh browser context.

---

## Plan Self-Review

- Spec coverage: tree exploration, verified-data policy, simulation, prerequisites, exact resource accounting, optimizer, spending profiles, local saves, versioned sharing, bilingual UI, mobile interactions, tests, and Pages deployment each map to at least one task.
- Placeholder scan: no implementation step relies on `TBD`, `TODO`, guessed values, or unspecified error handling.
- Type consistency: domain IDs, `PlannerStateV1`, `ResourceTotals`, optimizer recommendation structures, and codec interfaces are defined before UI consumption.
- Scope: the eight tasks are independently reviewable but all contribute to one static V1 planner product; no backend/community subsystem is included.
