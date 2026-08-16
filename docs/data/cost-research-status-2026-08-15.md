# Random Dice 2 cost research status — 2026-08-15

## Scope

The user asked the planner to fill level-by-level resource requirements by researching current players and public material because they do not know the full cost progression themselves.

## Canonical-data rule

A Random Dice 2 rank cost is canonical only when one of the following is true:

1. the current-game value is clearly visible in a user-provided screenshot;
2. a current Random Dice 2 public screenshot/detail panel clearly shows the same value; or
3. two independent current-game sources agree and can be traced.

One observed next-rank price is never extrapolated across an unseen 1→50 or 1→100 ladder.

## Official current-game context

111%'s current Google Play listing describes Random Dice 2 as removing the shop/gacha progression loop and allowing players to grow/evolve dice through their own progression paths. The listing confirms the progression concept but does not publish a Dice Tree rank-cost table. The current App Store listing likewise describes customizable growth paths without exposing node-price tables.

Official current sources checked:

- Google Play: `https://play.google.com/store/apps/details?id=com.percent.aos.randomdice2`
- Apple App Store: `https://apps.apple.com/kr/app/random-dice-2/id6748432502`

## Current community research

Current Random Dice 2 community leads retained for manual/current-game cross-checking:

- Engineering tree share: `https://m.dcinside.com/board/randomdice2/317`
- Devour operation discussion: `https://m.dcinside.com/board/randomdice2/653`
- Resource-efficient/F2P route discussion: `https://m.dcinside.com/board/randomdice2/1517`
- Devour vs Taeguk discussion: `https://m.dcinside.com/board/randomdice2/643`
- Near-full-tree lead: `https://m.dcinside.com/board/randomdice2/1515`
- Magic tree data lead: `https://m.dcinside.com/board/randomdice2/496`
- Order route leads: `https://m.dcinside.com/board/randomdice2/386` and `https://m.dcinside.com/board/randomdice2/389`
- Nature tree lead: `https://m.dcinside.com/board/randomdice2/380`

Search-engine indexing for the newly launched game remains incomplete. Direct DCInside pages are also intermittently blocked to automated retrieval. These URLs are therefore treated as research leads until the relevant text/image is actually retrieved or independently reproduced in a current-game capture.

## Legacy-source exclusion

Search results frequently return Random Dice: Defense instead of Random Dice 2. Legacy pages contain useful historical material for dice names, Taeguk mechanics, Gear/Adapt/Summon deck lineage, class-up prices, fields, and other systems, but those numbers are not imported into Random Dice 2's canonical Dice Tree data.

Examples intentionally excluded from RD2 cost calculations include old Random Dice class-up tables and old Taeguk/Gear guides. They may be retained only as historical strategy context if clearly labelled.

## Current confirmed/observed cost coverage

The structured registry in `src/tree-data-v2/costEvidence.ts` currently captures all defensible cost observations from the supplied current-game screenshots and earlier current-game node-detail evidence. It includes exact photographed transitions such as 5→6 on several 5/100 nodes, 2→3 on a 2/50 node, 4→5 on a 4/50 node, 17→18 on a 17/50 node, 1→2 on a 1/15 node, plus one-time/milestone costs such as 15,000, 30,000, 50,000 and 100,000 gold and multiple secondary-resource gates.

The 16/50 area is deliberately marked partial because a nearby `5,000 + 10` label is visible but the overview alone does not prove that it belongs to that exact rank transition.

## What could not be honestly filled yet

No trustworthy public source located in this research pass provides a complete current Random Dice 2 `1→50`, `1→100`, or equivalent per-rank Dice Tree cost sequence. Therefore `completeLadders` remains zero. The public site exposes this limitation instead of fabricating missing rows.

## Update mechanism

Each newly verified rank transition is appended as a new `RankCostEvidence` entry with its source IDs and confidence. The planner can then expose the observation immediately without changing unrelated node data or guessing intermediate ranks.
