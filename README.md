# Random Dice 2 Tree Planner

A public, login-free Random Dice 2 tree planner for previewing upgrades, tracking simulated resource spend, comparing verified upgrade data, and sharing a complete build in the URL.

Public URL after GitHub Pages deploy: **https://woo642778-art.github.io/dicetree/**

## Data integrity policy

This project intentionally separates what is known from what is merely visible or still hidden in-game.

- Verified or partially verified numeric values include an explicit source/date note.
- Hidden tree slots are rendered as **미확인 / Unverified** and never receive invented damage, attack-speed, resource, or prerequisite values.
- An observed upgrade may be compared as an immediate step even when its full prerequisite route is unknown. The UI labels that limitation.
- Exact DPS is shown only when the relevant game formula has been verified. Otherwise recommendations are explicitly heuristic.

The initial dataset is deliberately conservative and uses user-provided in-game screenshots for the observed all-dice bullet-damage and Chaos attack-speed upgrade steps. More nodes can be promoted from `unverified` to `partial`/`verified` as reliable evidence is added.

## Features

- Pan/zoom SVG tree on desktop and mobile
- Five family filters and search
- Virtual node investment with live resource totals
- Primary/secondary die focus and dealer/support/balanced goals
- F2P, light-spender, and spender recommendation profiles
- Explainable deterministic recommendations, never opaque AI scores
- Korean default UI with English toggle
- Local named builds via `localStorage`
- Login-free share URLs using `#b=v1...` state payloads
- Safe handling of removed/unknown nodes in older links
- GitHub Actions validation and Pages deployment

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

## Adding verified data

Edit `src/tree-data/nodes.ts` and `src/tree-data/dice.ts`. Every numeric level must carry verification metadata and explicit `costsKnown` / `effectsKnown` values. Run:

```bash
npm run lint:data
npm test
npm run build
```

Do not infer hidden ranks, prerequisite chains, or formulas from visual similarity alone.
