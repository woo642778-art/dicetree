# Random Dice 2 Tree Planner V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the public Random Dice 2 planner around screenshot-derived topology, field-level provenance, four observed progression resources, route-aware recommendations, and a custom white-first premium UI.

**Architecture:** Keep React + TypeScript + Vite and the existing static GitHub Pages deployment. Replace V1’s coarse node model with a V2 sourced-field model, split canonical tree facts from community strategy notes, render a screenshot-calibrated world-coordinate graph, and keep share/local storage versioned so V1 links can be migrated safely.

**Tech Stack:** React 19, TypeScript, Vite, SVG, Vitest, Testing Library, Playwright, CSS animations/transitions, GitHub Pages.

## Global Constraints

- User screenshots from 2026-08-15 are the primary geometry source.
- Never invent node names, effects, rank values, costs, resource names, or formulas.
- Confidence is field-level: verified, observed, partial, inferred, unknown.
- Four observed resources must be represented even when three official names remain unverified.
- Community strategy is stored separately from canonical game facts.
- Exact DPS is shown only when the relevant game formula and affected-dice scope are verified.
- Korean is default; English presentation must not mutate semantic build state.
- Login-free URL sharing and local named builds remain supported.
- Desktop mouse and mobile touch/pinch navigation are required.
- UI is white-first and custom; dark generic dashboard styling is removed.
- All nonessential motion respects prefers-reduced-motion.

---

### Task 1: V2 sourced data model and resource schema

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/domain/provenance.ts`
- Create: `src/domain/provenance.test.ts`
- Modify: `src/domain/costs.ts`
- Modify: `src/domain/costs.test.ts`

**Interfaces:**
- Produces `Confidence`, `SourceRef`, `SourcedField<T>`, `TreeNodeV2`, `ResourceId`, `ResourceInventory`, `PlannerStateV2`.
- `ResourceId` values are `gold`, `blueCard`, `redCard`, `prismCube`.

- [ ] Write failing tests that reject invented exact values with `confidence: unknown`, preserve observed screenshot costs, and sum four-resource costs.
- [ ] Run `npm test -- src/domain/provenance.test.ts src/domain/costs.test.ts` and confirm failure.
- [ ] Implement V2 types and cost helpers while retaining V1 compatibility types only for migration.
- [ ] Run the same tests and confirm pass.
- [ ] Commit `feat: add sourced V2 tree data model`.

### Task 2: Source registry and screenshot-derived topology dataset

**Files:**
- Create: `src/tree-data-v2/sources.ts`
- Create: `src/tree-data-v2/resources.ts`
- Create: `src/tree-data-v2/nodes.ts`
- Create: `src/tree-data-v2/dice.ts`
- Create: `src/tree-data-v2/validate.ts`
- Create: `src/tree-data-v2/validate.test.ts`
- Create: `docs/data/random-dice-2-v2-source-notes.md`

**Interfaces:**
- Produces `treeNodesV2`, `diceV2`, `resourceDefinitions`, `sourceRegistry`, `validateV2Dataset()`.
- Geometry uses normalized world coordinates calibrated to the two supplied full-tree screenshots.

- [ ] Write failing validation tests for duplicate IDs, broken prerequisites, impossible rank/cost arrays, unknown exact fields, and missing source IDs on observed/verified values.
- [ ] Run `npm test -- src/tree-data-v2/validate.test.ts` and confirm failure.
- [ ] Transcribe the visible center hub, five family trunks, visible square dice nodes, passive circles, rank labels, and legible costs from the supplied screenshots. Use neutral internal IDs for nodes whose official name is not visible.
- [ ] Record source notes for every screenshot-derived field and separate community/guide references from screenshot facts.
- [ ] Add only current-game public data that can be corroborated. Legacy Random Dice sources are recorded only as historical context and never copied into canonical values.
- [ ] Run the validation test and confirm pass.
- [ ] Commit `data: reconstruct V2 tree topology from screenshots`.

### Task 3: Community research import for costs and strategy

**Files:**
- Create: `src/strategy/strategyNotes.ts`
- Create: `src/strategy/strategyNotes.test.ts`
- Create: `docs/data/community-research-2026-08-15.md`
- Modify: `src/tree-data-v2/nodes.ts`
- Modify: `src/tree-data-v2/dice.ts`

**Interfaces:**
- Produces `strategyNotes`, keyed by dice/node/family, with `sourceIds`, `confidence`, `roleTags`, and `summary`.

- [ ] Write a failing test proving community strategy cannot change canonical node costs/effects.
- [ ] Search current Random Dice 2 community posts, guides, screenshots, and store material for node costs, rank progression, Devour/포식, Taeguk/태극, Corruption/부패, Engineering/Magic early routes, and resource usage.
- [ ] Cross-check each numerical value against a second current source or a clear screenshot before promoting it to canonical `observed/verified` data.
- [ ] Store single-source strategy claims only as community notes with visible provenance.
- [ ] Document unresolved fields explicitly instead of guessing.
- [ ] Run `npm test -- src/strategy/strategyNotes.test.ts src/tree-data-v2/validate.test.ts` and confirm pass.
- [ ] Commit `data: add sourced Random Dice 2 strategy research`.

### Task 4: Planner state V2, migration, and resource simulation

**Files:**
- Modify: `src/planner/plannerReducer.ts`
- Modify: `src/planner/plannerReducer.test.ts`
- Modify: `src/planner/selectors.ts`
- Modify: `src/share/codec.ts`
- Modify: `src/share/codec.test.ts`
- Modify: `src/share/migrate.ts`
- Modify: `src/storage/buildStorage.ts`
- Modify: `src/storage/buildStorage.test.ts`

**Interfaces:**
- Planner supports four-resource inventory, ranks, goals, route target, and schemaVersion 2.
- Share codec round-trips semantic V2 state and migrates valid V1 links.

- [ ] Write failing reducer/share/storage tests for four-resource spending, insufficient-budget warnings, migration, and language-independent semantic hashes.
- [ ] Run targeted tests and confirm failure.
- [ ] Implement V2 state, selectors, migration, URL encoding, and local persistence.
- [ ] Run targeted tests and confirm pass.
- [ ] Commit `feat: migrate planner state and sharing to V2`.

### Task 5: Prerequisite-aware, confidence-aware recommendation engine

**Files:**
- Modify: `src/optimizer/recommend.ts`
- Modify: `src/optimizer/scoreCandidate.ts`
- Modify: `src/optimizer/profileWeights.ts`
- Modify: `src/optimizer/recommend.test.ts`
- Create: `src/optimizer/explain.ts`

**Interfaces:**
- Recommendations return best next node, next 5 investments, prerequisite-inclusive route, verified incremental cost, affordability, confidence, and explanatory factors.

- [ ] Write failing tests for Devour + Corruption shared-family relevance, Taeguk specialization, prerequisite overhead, budget constraints, and confidence penalties.
- [ ] Confirm tests fail.
- [ ] Implement multi-factor scoring that never produces exact DPS when formulas are unverified.
- [ ] Confirm tests pass.
- [ ] Commit `feat: add explainable V2 route optimizer`.

### Task 6: White-first design system and application shell

**Files:**
- Replace: `src/app/app.css`
- Replace: `src/app/accessibility.css`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`
- Create: `src/app/tokens.css`
- Create: `src/features/planner/ResourceRail.tsx`
- Create: `src/features/planner/PlannerDrawer.tsx`

**Interfaces:**
- Desktop: white top bar + primary canvas + slim contextual rail + node side sheet.
- Mobile: compact top rail + canvas + bottom sheets.

- [ ] Write failing component tests for the white shell, resource rail, mobile sheet controls, and absence of V1 permanent three-column layout classes.
- [ ] Confirm failure.
- [ ] Implement pearl-white visual system, restrained violet/gold accents, typography, spacing, compact resource pills, drawers/sheets, and reduced-motion overrides.
- [ ] Confirm component tests pass.
- [ ] Commit `feat: redesign planner with custom white interface`.

### Task 7: Screenshot-calibrated interactive tree renderer

**Files:**
- Replace: `src/features/tree/TreeCanvas.tsx`
- Modify: `src/features/tree/TreeCanvas.test.tsx`
- Modify: `src/features/tree/usePanZoom.ts`
- Create: `src/features/tree/TreeNodeToken.tsx`
- Create: `src/features/tree/TreeEdge.tsx`
- Create: `src/features/tree/FamilyNavigator.tsx`

**Interfaces:**
- Renders V2 node kinds and real screenshot-derived positions.
- Supports pan, wheel zoom, pinch zoom, fit tree, family jump, focus-dice jump, selected path, invested path, and recommended path.

- [ ] Write failing renderer tests for screenshot-derived coordinates, five family trunks, field-level confidence styling, selected/recommended path classes, and keyboard selection.
- [ ] Confirm failure.
- [ ] Implement token-style nodes, luminous active lines, subtle recommendation motion, hover/selection elevation, pan/zoom interpolation, and mobile touch behavior.
- [ ] Confirm tests pass.
- [ ] Commit `feat: render screenshot-calibrated V2 dice tree`.

### Task 8: Premium node detail sheet, provenance, and strategy UI

**Files:**
- Replace: `src/features/analysis/NodePanel.tsx`
- Replace: `src/features/analysis/RecommendationPanel.tsx`
- Create: `src/features/analysis/SourceDrawer.tsx`
- Create: `src/features/analysis/StrategyCard.tsx`
- Modify: `src/i18n/strings.ts`

**Interfaces:**
- Detail sheet shows known node identity/effect/cost/rank separately from missing fields.
- `자료` drawer lists screenshot/current-public/community provenance and confidence.

- [ ] Write failing component tests for partial node information, resource cost rows, source drawer, and qualitative recommendation explanation.
- [ ] Confirm failure.
- [ ] Implement detail/strategy UI without blanket `미확인` labels.
- [ ] Confirm tests pass.
- [ ] Commit `feat: add sourced node details and strategy explanations`.

### Task 9: Full browser QA, visual QA, and deployment

**Files:**
- Replace: `e2e/planner.spec.ts`
- Modify: `.github/workflows/pages.yml`
- Modify: `README.md`

**Interfaces:**
- CI proves unit/component suite, production build, desktop/mobile E2E, console error checks, screenshot artifacts, and Pages deploy.

- [ ] Add E2E for node investment, four-resource spending, best-route recommendation, share/restore, Korean/English isolation, mouse pan/zoom, real mobile touch, bottom sheets, no horizontal overflow, and malformed share state.
- [ ] Run `npm test` and require zero failures.
- [ ] Run `npm run build` and require exit 0.
- [ ] Run `npm run test:e2e -- --project=chromium --project=mobile` and require zero failures except intentional project skips.
- [ ] Inspect desktop and mobile screenshots for clipping, overlap, generic-dashboard regressions, and tree readability.
- [ ] Update README with data-confidence and source-contribution rules.
- [ ] Open PR from `feat/v2-rebuild` to `main`, require green CI, merge, and verify GitHub Pages deployment plus the public URL.
