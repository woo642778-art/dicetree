# Random Dice 2 Tree Planner

A public, login-free Random Dice 2 Dice Tree planner focused on screenshot-sourced topology, simulated progression costs, explainable route recommendations, and shareable builds.

Public site: **https://woo642778-art.github.io/dicetree/**

## V2 principles

The planner does not pretend that every hidden value is known.

- Tree geometry can be known even when a node's effect is not.
- Rank, cost, effect, identity, prerequisites, and family each carry their own confidence state.
- Clear in-game screenshots are the primary source for current Random Dice 2 numeric values.
- Current official 111% material is preferred for game-level rules and terminology.
- Community strategy is stored separately from canonical game facts.
- Random Dice: Defense upgrade tables are **not** reused as Random Dice 2 progression data.
- Exact DPS is never claimed when the Random Dice 2 formula is not verified.

## What the V2 dataset currently contains

- 100+ screenshot-mapped structural nodes, including grey locked/unknown slots
- Five central family directions: Nature, Chaos, Order, Engineering, Magic
- Four observed tree resources: Gold plus the blue-card, red-card, and prism/cube-like resources
- Screenshot-observed node costs including 2,000 through 100,000 Gold and mixed-resource gates
- Screenshot-observed rank examples such as 5/100, 17/50, and 1/15 where the labels can be associated safely
- Earlier detail evidence for the all-dice bullet-damage and Chaos attack-speed upgrade steps
- Separate community strategy notes for Devour, Corruption, Taeguk, early Magic utility, and Engineering routes

The non-Gold resource icons are real observed resources, but their official current-game names are not yet verified. The UI therefore uses neutral labels rather than inventing names.

## Rank-by-rank cost policy

A photographed price is stored as the **observed next-step cost at that photographed rank**. It is not repeated across all remaining ranks.

For example, if a screenshot confirms a node at 5/100 and shows the next cost, that creates one evidence point. If another current screenshot later shows the same node at 6/100, the second point can be added. Over time this produces a real cost ladder rather than an inferred one.

See:

- `docs/data/cost-evidence-matrix.md`
- `docs/data/random-dice-2-v2-source-notes.md`
- `docs/data/community-research-2026-08-15.md`

## Features

- White-first responsive game-companion UI
- Screenshot-calibrated SVG Dice Tree with locked structural slots
- Mouse pan/wheel zoom and mobile touch pan/pinch
- Family filters and search
- Virtual next-step investment planning
- Four-resource inventory/spend/remaining calculations
- Focus-die and progression-profile recommendation weighting
- Separate canonical facts and community strategy notes
- Korean default UI and English toggle
- Login-free V2 share URLs
- Safe malformed/older-state handling
- Reduced-motion accessibility support
- Automated unit/component, production build, desktop/mobile browser, console-error, and screenshot QA in GitHub Actions

## Development

Requires Node.js 22.12+.

```bash
npm install
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The Vite base path is `/dicetree/` for GitHub Pages.

## Adding current-game data

Canonical current-game data lives under `src/tree-data-v2/`.

A new numeric field should include:

1. the exact value visible in the source,
2. the specific node/rank context when known,
3. a `SourceRef`,
4. field-level confidence,
5. no extrapolation beyond what the source proves.

Community opinions belong under `src/strategy/` and must not mutate canonical costs/effects.

Before merging data changes, run the full validation suite and browser QA. The repository workflow also stores desktop/mobile screenshots as Actions artifacts for manual visual review.
