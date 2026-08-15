# Contributing data

Game data must be traceable to a source and must not be guessed. When adding or changing a node, record its verification status and source metadata. A partially verified node may expose only the fields that are actually confirmed. Unverified nodes must remain non-investable and excluded from optimizer scoring.

Before submitting changes, run `npm test`, `npm run build`, and `npm run test:e2e -- --project=chromium --project=mobile`.
