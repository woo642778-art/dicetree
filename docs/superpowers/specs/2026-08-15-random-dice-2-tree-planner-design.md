# Random Dice 2 Tree Planner Design

Date: 2026-08-15
Status: Approved design, pending written-spec review
Repository: `woo642778-art/dicetree`
Deployment target: GitHub Pages

## 1. Product goal

Build a public, login-free Random Dice 2 tree planner that lets players inspect the full tree, simulate investments without spending in-game resources, calculate required resources, optimize routes for a chosen dealer/support focus, compare marginal upgrade efficiency, and share a complete build through a URL.

The interaction model should preserve the reference site's tree-first experience: most of the viewport is an explorable tree canvas with pan and zoom. The product extends that experience into a functional planner rather than a read-only tree viewer.

The first release is a static web application. It has no backend, accounts, database, comments, or server-side build storage.

## 2. Hard product constraints

1. Only verified game data may be treated as factual.
2. Unverified nodes remain visible as `미확인` / `Unverified` placeholders and are excluded from optimization calculations.
3. The default language is Korean, with an English switch.
4. Build sharing works without login or server storage.
5. The site must be usable by anyone who receives the public GitHub Pages URL.
6. A shared build must restore the same selected nodes, node ranks, planner inputs, and recommendation context regardless of the viewer's UI language.
7. The application must work on desktop and mobile, including mouse-wheel zoom, drag pan, pinch zoom, and touch interactions.
8. Patch-sensitive formulas or values that have not been verified must never be silently presented as exact.

## 3. V1 user journeys

### 3.1 Explore the tree

A player opens the site and immediately sees the tree canvas. They can pan, zoom, filter by tree family, search for a die or node, inspect node details, and distinguish verified from unverified data.

### 3.2 Simulate a build

A player clicks a node to invest one rank, increases or decreases ranks in the detail panel, and sees prerequisites enforced. The planner updates total spent resources and remaining route costs in real time. Undo, redo, and reset are available.

### 3.3 Optimize for a target

A player chooses one or more focus dice, such as Devourer as the primary dealer and Corruption as a secondary die, then selects role emphasis, game mode if supported by verified data, spending profile, and optional budget. The app highlights an efficient next route and explains why each recommended investment was selected.

### 3.4 Compare upgrade efficiency

Where the game formula and node effects are verified, a player can compare upgrades such as bullet damage versus family attack speed. The comparison shows marginal expected benefit, affected focus dice, prerequisite cost, resource efficiency, and confidence level. If exact formulas are not verified, the UI explicitly labels the result as heuristic rather than exact DPS.

### 3.5 Save locally and share

A player can save named builds in the browser. Pressing Share creates a versioned URL fragment containing the current planner state. Opening that URL restores the build without a backend.

## 4. Information architecture and layout

### 4.1 Top bar

The top bar contains:

- product name
- Korean / English language switch
- undo
- redo
- reset
- local save/load
- share-link action
- compact help/about entry

### 4.2 Main tree canvas

The center of the application is a large SVG-based tree canvas. It supports pan and zoom and remains visually sharp at different scales. Families branch in the same spatial directions as the verified in-game/reference layout whenever that geometry is known.

Node appearance has explicit states:

- verified and available
- verified but prerequisite-locked
- invested, with current rank
- optimizer-recommended
- search/focus-highlighted
- unverified

Unverified nodes must be visually distinct and cannot be invested in or used as optimizer path vertices unless their prerequisite relationship itself has been verified and is needed only for visual continuity. The optimizer must not assign them an effect value.

### 4.3 Goal panel

A collapsible side panel lets the user configure optimization goals:

- primary focus die
- optional secondary focus dice
- role weighting: dealer, support, balanced
- spending profile: free-to-play, light spender, spender
- optional resource budget
- current build state, taken directly from the simulated tree
- optional advanced inputs supported by verified formulas

### 4.4 Node and analysis panel

Selecting a node shows:

- localized node name and description
- family
- verification status
- current rank / maximum rank
- next-rank effect
- next-rank cost
- prerequisite chain
- affected dice or mechanics when known
- source metadata
- optimizer score breakdown when applicable

The same panel hosts side-by-side comparisons between candidate upgrades.

### 4.5 Resource summary

A persistent compact summary shows resources already spent by the simulated build. When a recommendation or destination node is selected, it also shows the additional cost of the required route and whether it fits the user's stated budget.

## 5. Technical architecture

Use React, TypeScript, and Vite. The app is a client-only single-page application built for GitHub Pages.

Recommended package boundaries:

- `src/tree-data/`: versioned tree and dice data
- `src/domain/`: domain types, prerequisite rules, cost calculations, stat/effect evaluation
- `src/optimizer/`: route search, marginal utility scoring, profile weighting, explanations
- `src/share/`: serialization, version migration, URL-fragment encoding/decoding
- `src/storage/`: local build persistence
- `src/i18n/`: Korean and English strings
- `src/components/`: reusable UI components
- `src/features/tree/`: tree canvas and interactions
- `src/features/planner/`: goal/profile controls and build state
- `src/features/analysis/`: efficiency comparison and recommendation explanations

No component should own game-balance constants. UI components consume typed domain data.

## 6. Tree data model

Each node is represented by stable, language-neutral identifiers. A node record contains fields equivalent to:

```ts
interface TreeNodeDefinition {
  id: string;
  family: DiceFamily;
  position: { x: number; y: number };
  maxRank: number;
  prerequisites: Array<{ nodeId: string; minRank: number }>;
  levels: Array<{
    rank: number;
    costs: Partial<Record<ResourceType, number>>;
    effects: EffectDefinition[];
  }>;
  localizationKey: string;
  verification: VerificationMetadata;
  tags: string[];
}
```

Verification metadata includes:

- `status`: verified or unverified
- game/version context when known
- source label
- source URL when publishable
- date checked
- optional notes about ambiguity

A die record separately stores family, role tags, mechanic tags, and relationships to effects. This prevents tree geometry from being tightly coupled to optimizer logic.

## 7. Verified-data policy

The site must distinguish data confidence at the field level where necessary. A node may have a verified location and cost while its damage formula remains unverified.

Rules:

- verified values may participate in exact calculations
- partially verified records may participate only through their verified fields
- unverified values are never assigned inferred numeric values
- optimizer explanations include confidence labels
- exact wording such as `DPS +0.80%` is only shown when the relevant formula and inputs are verified
- otherwise the UI uses labels such as `estimated`, `heuristic`, or `insufficient verified formula data`

The dataset should be patch-versioned so future balance updates can preserve old data for migrations or comparison without silently rewriting historical shared builds.

## 8. Build-state model

Runtime planner state is separate from definitions. It stores only user choices and stable IDs:

```ts
interface PlannerStateV1 {
  schemaVersion: 1;
  dataVersion: string;
  ranks: Record<string, number>;
  goals: {
    primaryDieId?: string;
    secondaryDieIds: string[];
    role: "dealer" | "support" | "balanced";
    spendingProfile: "f2p" | "light" | "spender";
    budget?: Partial<Record<ResourceType, number>>;
  };
}
```

UI language is not part of the build's semantic state. A Korean player can share a build with an English-language user without changing the build itself.

## 9. Node investment rules

Incrementing a rank is allowed only if its verified prerequisites are satisfied. Decrementing a rank must not leave downstream invested nodes in an invalid state.

For V1, when a decrement would invalidate descendants, the UI presents the resulting rollback set before applying it rather than leaving an inconsistent tree.

Costs are calculated from the exact ranks purchased, not by multiplying a single displayed cost unless the data confirms a constant cost per rank.

Undo and redo operate on semantic planner actions and cover node-rank changes, resets, optimizer-applied routes, and build loads.

## 10. Recommendation engine

The optimizer is deterministic and explainable. It does not use an opaque AI model in V1.

### 10.1 Candidate generation

At each step, candidates are verified investments reachable from the current state. A candidate may represent a single next rank or a prerequisite path plus destination rank when evaluating route efficiency.

### 10.2 Marginal utility

Each verified effect is evaluated against the selected focus dice and role. The domain layer maps effects to supported utility dimensions, including examples such as:

- direct bullet damage
- family attack speed
- die-specific damage
- support uptime or amplification
- economy/summoning value
- survivability/control where verified
- broad utility affecting multiple selected dice

No unsupported mechanic receives an invented numeric multiplier.

### 10.3 Spending profiles

Profiles change objective weights rather than changing factual node values.

`free-to-play` prioritizes marginal value per scarce resource, low prerequisite overhead, and reuse across multiple viable dice/decks.

`light spender` balances resource efficiency, focus-die power, and medium-term flexibility.

`spender` places more weight on ceiling, focus-die specialization, and expensive prerequisite paths when they produce a stronger verified end state.

These weights are configuration data and must be testable and visible in explanation output at a human-readable level.

### 10.4 Route scoring

For a route, the optimizer aggregates verified marginal utility and divides or discounts it by total incremental route cost using resource-normalization weights appropriate to the selected spending profile. It also accounts for how many selected focus dice receive the effect and whether the effect aligns with dealer/support weighting.

The engine returns both a score and an explanation object. The UI must never display a recommendation without a human-readable rationale such as:

- affects both selected Chaos dice
- lower prerequisite cost than alternative
- higher verified marginal damage per gold
- selected because the free-to-play profile values broad reuse

### 10.5 Exact DPS comparisons

Exact arithmetic is isolated in effect evaluators. For example, comparing bullet damage with attack speed is only enabled as an exact DPS comparison if the attack-speed and damage formulas for the current game version are verified. Otherwise the optimizer can still compare known qualitative coverage and costs, but labels the result heuristic.

## 11. Share links

V1 uses the URL fragment so GitHub Pages does not require server-side rewrite rules and shared links do not send build state to a server.

Canonical form:

`https://<pages-host>/dicetree/#b=<encoded-state>`

The encoded payload contains only semantic `PlannerStateV1` data and a checksum/version marker. It does not embed localized labels or the full static dataset.

Encoding is deterministic and URL-safe. The decoder validates schema version, bounds, IDs, ranks, and payload integrity. Invalid or unknown payloads fail safely and offer to open an empty planner instead of crashing.

When a future schema is introduced, explicit migrations convert older supported states forward.

## 12. Local persistence

Named builds are stored in `localStorage` with a small versioned index. Each saved build includes:

- user-provided name
- planner state
- created timestamp
- last modified timestamp

A corrupted saved entry does not prevent other builds from loading. Storage failures are surfaced non-destructively.

## 13. Internationalization

Korean is the default locale and English is the alternate locale. All UI labels and data display names use translation keys rather than being embedded in components.

Game terms whose official English localization is not verified may use a clearly maintained translation mapping, but the underlying IDs remain stable and language-neutral.

The locale preference is stored separately from shared build state.

## 14. Responsive behavior

Desktop prioritizes the tree canvas with collapsible left/right panels. Mobile uses the tree canvas as the primary surface and presents goal/node details through drawers or bottom sheets so the canvas remains usable.

Minimum interaction requirements:

- mouse drag pan
- wheel zoom centered on pointer
- touch drag pan
- pinch zoom
- keyboard-accessible node selection and controls where practical
- visible focus states
- readable contrast for recommendation, investment, lock, and verification states without relying on color alone

## 15. Visual direction

The site uses a dark, game-adjacent presentation with the tree as the visual centerpiece. It should feel related to the reference planner's spatial browsing model but must not copy proprietary artwork or UI assets without permission.

Tree-family identity can use distinct accents, icon treatments, labels, and branch geometry. Verified/unverified and selected/recommended states must remain legible at low zoom.

Animations should be functional and restrained: node investment feedback, route highlighting, panel transitions, and smooth pan/zoom. Reduced-motion preferences are respected.

## 16. Error handling

The application must recover cleanly from:

- malformed shared URLs
- unknown schema versions
- shared node IDs removed by a future data patch
- invalid ranks
- incomplete verification data
- localStorage quota or corruption
- impossible prerequisite graphs in development data

Production behavior favors preserving valid portions of user state and clearly reporting ignored or incompatible parts.

Dataset validation runs at build/test time and rejects duplicate IDs, invalid prerequisite references, impossible rank bounds, malformed level tables, and graph cycles unless a future verified mechanic explicitly requires them.

## 17. Testing strategy

### Unit tests

Cover:

- prerequisite validation
- increment/decrement and cascade behavior
- per-rank and route resource totals
- verified-effect evaluators
- optimizer candidate generation
- spending-profile weighting
- deterministic recommendation ordering
- serialization round trips
- schema migration and malformed payload rejection
- localization key coverage
- dataset integrity checks

### Component tests

Cover:

- node state rendering
- rank controls
- budget/resource summaries
- optimizer explanations
- language switching
- unverified-node restrictions

### End-to-end tests

Cover at minimum:

1. open fresh planner
2. invest a valid route
3. verify cost totals
4. select a focus die and profile
5. apply a recommendation
6. generate a share URL
7. open the URL in a fresh browser context
8. verify semantic build equality
9. switch language and verify the build remains unchanged
10. verify mobile pan/zoom and node interaction

## 18. GitHub Pages deployment

Vite is configured with the repository Pages base path. A GitHub Actions workflow builds the site from the selected production branch and deploys the generated static assets to GitHub Pages.

The workflow must run tests and a production build before deployment. A failed test or build blocks deployment.

The final public URL should be documented in the repository README after the first successful Pages deployment.

## 19. V1 scope

V1 includes:

- full explorable tree geometry to the extent positions are known
- verified and unverified node states
- direct simulated investment and rank adjustment
- prerequisite enforcement
- live resource accounting
- undo/redo/reset
- die search and family filters
- focus-die selection
- dealer/support/balanced role weighting
- free-to-play/light-spender/spender profiles
- deterministic explainable route recommendations
- supported exact efficiency comparisons where formulas are verified
- local named builds
- versioned URL sharing
- Korean/English UI
- responsive desktop/mobile interactions
- automated tests
- GitHub Pages deployment

## 20. Explicit non-goals for V1

V1 does not include:

- user accounts
- cloud build database
- comments or community voting
- public build ranking
- server-side analytics tied to identity
- automated scraping as a source of truth
- guessed values for unrevealed nodes
- opaque AI-generated optimization decisions
- copying copyrighted game/reference-site artwork into the repository without authorization

These can be considered after the static planner and verified dataset are reliable.

## 21. Acceptance criteria

The V1 implementation is complete when all of the following are true:

1. A new visitor can navigate the tree on desktop and mobile.
2. Verified nodes can be simulated with correct prerequisites and costs from the available verified dataset.
3. Unverified nodes are clearly marked and cannot silently influence recommendations.
4. A player can select a focus die, role, and spending profile and receive an explainable deterministic recommended route.
5. Resource totals update correctly for direct and recommended investments.
6. A player can save and restore named builds locally.
7. A generated share URL restores the same semantic build in a fresh browser session.
8. Korean and English switching does not alter build state.
9. Invalid shared state fails safely.
10. Automated unit/component/end-to-end checks required by the implementation plan pass.
11. GitHub Actions produces a successful production build and deploys it to the repository's public GitHub Pages site.
