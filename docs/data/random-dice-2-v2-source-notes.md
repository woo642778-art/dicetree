# Random Dice 2 V2 data source notes

Updated: 2026-08-15

## Canonical source policy

The V2 planner uses the user-provided in-game screenshots as the primary source for tree geometry, visible rank labels, visible costs, resource icons, and family directions. Official 111% store listings are used for product-level progression statements. Community material is stored as strategy context unless a numerical field can be cross-checked against a clear current-game screenshot or a second current source.

No Random Dice: Defense (the original game) cost table is copied into Random Dice 2 canonical data.

## User screenshot observations

The center hub explicitly labels the five families and directions:

- 자연 / Nature: upper branch
- 혼돈 / Chaos: left branch
- 질서 / Order: right branch
- 공학 / Engineering: lower-left branch
- 마법 / Magic: lower-right branch

The resource bar visibly contains four independent resources. Gold is textually identifiable. The blue card-like, red card-like, and prism/cube-like resources are visually distinct, but their official Korean/English names are not legible in the supplied tree overview. V2 therefore keeps neutral display labels until a current official/detail screenshot confirms the names.

Visible screenshot costs transcribed into V2 include 2,000, 3,000, 4,000, 5,000, 8,000, 15,000, 30,000, 50,000, and 100,000 gold, with several nodes also showing 1/5/8/10/12/20 units of non-gold resources. These are stored as *node-specific observed next costs*. They are not extrapolated into a universal level cost formula.

Visible rank examples include 1/15, 2/50, 4/50, 5/100, 16/50, 17/50, and MAX.

## Official current-game references

- Apple App Store: https://apps.apple.com/kr/app/random-dice-2/id6748432502
- Google Play: https://play.google.com/store/apps/details?id=com.percent.aos.randomdice2

Both official listings describe customizable growth paths and strategy-first progression. They do not provide a public node-by-node cost table.

## Why V2 does not fabricate a level-cost ladder

The overview screenshots show the cost for the currently displayed/next rank of many nodes, but do not show every rank of a 50- or 100-rank node. Public web search on 2026-08-15 heavily mixes Random Dice 2 with the original Random Dice, so legacy tables are not safe to reuse. V2 represents observed next-rank costs exactly and leaves missing ranks source-gated.

When a future screenshot shows the same node at another current rank, the dataset can add another rank-specific observed cost without changing the UI architecture.
