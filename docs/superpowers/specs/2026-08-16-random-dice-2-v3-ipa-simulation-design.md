# Random Dice 2 Tree Planner V3: IPA-Backed Simulation Design

Date: 2026-08-16
Branch: `spec/v3-ipa-simulation`
Status: conversation design approved, pending written spec review

## 1. Product goal

V3 replaces screenshot-first approximation with an IPA-backed canonical data pipeline and a real combat-stat simulator. The product must resemble the in-game Dice Tree closely while allowing users to simulate permanent tree investment and in-battle dice upgrades for every supported dice.

The primary user flow is:

**choose a dice -> inspect or edit its real Dice Tree route -> simulate permanent ranks -> select in-battle upgrade state and dice-specific conditions -> choose an enemy preset -> view final stats, practical DPS, damage over time, kill time, and marginal value of additional tree investment.**

V3 must never fill missing mechanics with invented values. If a field or formula cannot be proven from the current client data or a verified execution path, it remains partial and is excluded from exact outputs.

## 2. Source of truth and provenance

The canonical source for V3 is the user-provided Random Dice 2 iOS IPA, analyzed statically without executing its modified code.

Observed file identity:

- client package label: Random Dice 2 / version-marked 1.0.1 modified IPA
- SHA-256: `0341bef051315f7827466d23f3e41900d06dfa3d4994c7ecc84a89f4d1e21dd8`
- Unity/IL2CPP layout is present, including `global-metadata.dat` and `UnityFramework`

Static metadata confirms the presence of game-data and calculation identifiers including:

- `DiceTreeNodeTable`
- `PlayerPassiveTable`
- `DefenderTable`
- `DefenderSkillTable`
- `RuneTable`
- `ProjectileAbilityTable`
- `MinionTable`
- `VersusWaveTable`
- `RankUpGoldArr`
- `RankUpStoneArr`
- `GetAttackIntervalByRatio`
- `GetFinalAttackIntervalWithRuneEffect`
- `RT_AttackInterval`
- `PredatorDmgPerStack`
- `BonusPredatorChance`
- `InstaPredatorHpThreshold`

The modified IPA may contain third-party cheat/injection frameworks. Those modifications are not part of the website data model. V3 uses only game tables, localization, assets, and stat/mechanic evidence that can be attributed to the Random Dice 2 client itself.

Every extracted canonical dataset must carry provenance metadata:

```ts
interface ExtractionProvenance {
  clientVersion: string;
  sourceSha256: string;
  extractedAt: string;
  extractorVersion: string;
  sourceKind: "ipa-table" | "ipa-localization" | "ipa-asset" | "il2cpp-code-path";
}
```

Future clients must be diffed rather than silently overwriting V3 values.

## 3. Correction to V2 resource assumptions

The V2 screenshot-derived model incorrectly treated blue/red/prism-like header resources as Dice Tree rank-up currencies. V3 explicitly removes that assumption.

Dice Tree investment must be modeled from the actual rank-up arrays exposed by the client:

- `RankUpGoldArr`
- `RankUpStoneArr`

No blue-card, red-card, prism, ticket, or other invented Dice Tree currency may appear unless a later verified client table proves that it is used by a specific node/rank.

The V3 migration must delete or quarantine V2 cost observations that depended on the incorrect resource interpretation so they cannot influence route affordability, recommendations, or UI labels.

## 4. Canonical extraction model

V3 separates raw extraction from normalized product data.

### 4.1 Raw extracted records

Raw records preserve client identifiers and values with minimal interpretation.

```ts
interface RawGameRecord {
  table: string;
  rowId: string | number;
  fields: Record<string, unknown>;
  provenance: ExtractionProvenance;
}
```

### 4.2 Normalized dice data

```ts
interface DiceDefinition {
  id: string;
  numericId?: number;
  name: LocalizedText;
  family?: DiceFamily;
  iconAsset?: string;
  baseStats: DiceBaseStats;
  levelGrowth: DiceGrowthRule[];
  battleUpgradeGrowth: DiceGrowthRule[];
  mechanicRuleId?: string;
  sourceRefs: SourceRef[];
}

interface DiceBaseStats {
  attack?: number;
  attackInterval?: number;
  range?: number;
  bossMultiplier?: number;
  critRelated?: Record<string, number>;
  extra: Record<string, number | string | boolean>;
}
```

Fields such as `Attack`, `Attack_LvAdd`, `Attack_UpAdd`, `Range`, `Range_LvAdd`, `AttackInterval`, and `AttackInterval_UpAdd` are normalized only after their semantic role is verified.

### 4.3 Normalized Dice Tree data

```ts
interface DiceTreeNode {
  id: string;
  family: DiceFamily | "core";
  kind: "dice" | "passive" | "perk" | "milestone" | "connector";
  position: { x: number; y: number };
  prerequisites: string[];
  targetId?: string;
  maxRank: number;
  goldCostByRank: number[];
  stoneCostByRank: number[];
  passiveOrRuneRef?: string;
  localizedName?: LocalizedText;
  localizedDescription?: LocalizedText;
  sourceRefs: SourceRef[];
}
```

Tree position and prerequisites should come from client data where available. Screenshot geometry becomes a cross-check and visual reference, not the primary canonical topology source.

## 5. Tree reconstruction and in-game fidelity

The main Dice Tree canvas must be rebuilt from the IPA-derived graph.

Requirements:

- use real node IDs and prerequisite edges;
- use client position fields when available, otherwise preserve a deterministic topology reconstruction and compare against the supplied in-game screenshots;
- show actual max ranks and rank-by-rank Gold/Stone costs;
- use actual localized node/passive names and descriptions whenever present;
- use actual dice icons or safely extracted game assets when practical;
- distinguish current rank, simulated additional ranks, reachable nodes, locked nodes, maxed nodes, and recommended route;
- support pan, wheel zoom, pinch zoom, fit tree, jump to family, jump to selected dice, undo, redo, and reset simulation.

Selecting a node must never show a generic `details pending` panel when canonical information exists. The detail sheet should show:

- node/passive name;
- current simulated rank / max rank;
- current effect;
- next-rank effect delta;
- next Gold cost;
- next Stone cost;
- prerequisites;
- affected dice/family/global scope;
- impact on the currently selected dice when calculable;
- source/calculation confidence only in the secondary provenance view.

## 6. Simulation scope

V3 supports all dice discovered in the current client, not only Predator/Devour.

The common engine handles universally structured stats. Dice-specific rules handle mechanics that cannot be represented by a generic attack-times-speed formula.

```ts
interface SimulationInput {
  diceId: string;
  diceProgressionLevel: number;
  battleUpgradeLevel: number;
  treeRanks: Record<string, number>;
  conditionValues: Record<string, number | boolean | string>;
  enemy: EnemyScenario;
  durationSeconds: number;
}
```

The simulator must expose only conditions required by the selected dice. Examples include dot count, elapsed time, kill count, adjacent dice count, debuff state, stack count, or other mechanic-specific inputs discovered in client data/code paths.

Irrelevant controls must not appear.

## 7. Calculation pipeline

The calculator is an explainable staged pipeline.

1. Load raw base stats from `DefenderTable` or the corresponding canonical dice table.
2. Apply verified permanent dice-level growth.
3. Apply verified in-battle upgrade growth.
4. Apply global/family/dice-specific tree passives from `PlayerPassiveTable`, `RuneTable`, and linked tree nodes.
5. Apply dice-specific mechanic rules from verified tables and IL2CPP calculation paths.
6. Apply enemy category, boss modifiers, HP, and scenario-specific rules.
7. Produce final attack interval, attacks per second, hit damage, effect damage, practical DPS, cumulative damage, and kill time.
8. Produce a contribution trace showing how each stage changed the output.

The exact operation order is part of the canonical mechanic rule. Multiplicative and additive bonuses must not be rearranged for convenience.

## 8. Attack-speed and interval correctness

Attack-speed handling is a critical V3 requirement.

The website must not reuse the previously assumed Random Dice interval-reduction formula unless the Random Dice 2 code path proves it.

Static metadata exposes calculation identifiers such as `GetAttackIntervalByRatio`, `GetFinalAttackIntervalWithRuneEffect`, and `RT_AttackInterval`. V3 implementation must recover enough of these paths to establish:

- what ratio means;
- whether bonuses are additive or multiplicative;
- clamping/minimum interval behavior;
- order of rune/passive effects;
- interaction with battle upgrade interval changes;
- interaction with dice-specific mechanics.

Until a path is verified, affected exact DPS outputs are marked partial rather than guessed.

## 9. Dice-specific mechanic modules

The engine uses a shared contract with per-dice modules.

```ts
interface DiceMechanicRule {
  diceId: string;
  requiredConditions: ConditionDefinition[];
  evaluate(ctx: SimulationContext): MechanicEvaluation;
  confidence: "verified" | "partial";
  evidence: SourceRef[];
}
```

Predator/Devour is the first golden-reference complex dice because static metadata exposes dedicated identifiers such as `PredatorDmgPerStack`, `BonusPredatorChance`, and `InstaPredatorHpThreshold`.

However, these names alone are not sufficient to invent formulas. Each module must be connected to either a verified serialized table relationship or a recovered runtime calculation path before it contributes to `verified` DPS.

All other dice use the same rule framework, allowing condition-driven inputs without implementing a full board simulator.

## 10. Enemy presets

The selected interaction model is **preset + editable values**.

Presets:

- normal;
- elite/special when the client distinguishes one;
- boss;
- custom.

`MinionTable`, `VersusWaveTable`, and related wave/boss records should populate actual categories and values where recoverable. The user can always override HP and duration.

If the client exposes relative HP scaling but the absolute scenario HP cannot be fully reconstructed, the preset must show which component is verified and require a user-entered HP rather than inventing an absolute value.

## 11. Randomness and practical DPS

The selected presentation is **average + low/high outcome range**.

The range must be statistically meaningful, not an arbitrary percentage around average.

For mechanics with a verified independent/random trigger model, calculate:

- expected value;
- approximately 10th-percentile outcome;
- approximately 90th-percentile outcome.

Use exact distributions when tractable and deterministic approximations when mathematically equivalent. If a mechanic has complex state dependence that cannot be represented reliably, display `condition dependent` or `partial simulation` instead of fabricated confidence bands.

Outputs include:

- final attack damage;
- final attack interval;
- attacks per second;
- average DPS;
- low / average / high practical DPS when valid;
- 5-second cumulative damage;
- 10-second cumulative damage;
- 30-second cumulative damage;
- expected kill time;
- contribution breakdown.

## 12. Marginal tree-value analysis

Every rankable node that affects the selected dice should be able to answer:

- stat before investment;
- stat after one additional rank;
- practical DPS before/after;
- absolute and percentage gain;
- Gold/Stone cost;
- gain per Gold;
- gain per Stone where meaningful;
- prerequisite cost to reach the node.

This enables a real optimization layer rather than tag-based recommendations.

A route recommendation may say that one node is preferable to another only when both candidate effects are sufficiently verified for the selected dice/scenario. Partial mechanics receive a confidence penalty or are omitted from exact rankings.

## 13. UI/UX architecture

The interface must feel like an extended Random Dice 2 progression screen, not a generic analytics dashboard.

Primary navigation:

- Dice Tree;
- Simulator;
- Compare.

### 13.1 Dice Tree

The tree remains the dominant visual surface. White/pearl UI chrome surrounds a family-colored in-game-style graph. Invested paths gain an illuminated core; simulated-only additions are visually distinct from owned ranks; recommended paths use restrained emphasis.

Desktop node details use an attached side sheet. Mobile uses a bottom sheet so the tree remains full-width.

### 13.2 Simulator

The simulator contains:

- searchable dice selector;
- permanent progression controls;
- in-battle upgrade selector;
- selected-tree summary;
- dice-specific condition controls;
- enemy preset and editable HP/duration;
- final in-game-style stat panel;
- practical DPS graph and time checkpoints;
- effect contribution breakdown.

### 13.3 Compare

Compare allows two tree/rule configurations for the same dice or two dice under the same enemy scenario. It must share the same calculation engine and must not maintain separate arithmetic.

## 14. Visual direction and motion

Use a premium white-first companion aesthetic with game-specific visual language.

Required characteristics:

- warm white/pearl surfaces;
- near-black typography;
- restrained violet/indigo system accent;
- family colors concentrated in tree nodes and paths;
- token-like nodes rather than generic circles;
- subtle material depth instead of heavy glassmorphism;
- animated path draw on recommendation changes;
- short node halo/pulse on selection;
- rolling stat-number transitions;
- morphing damage graph;
- spring detail sheets;
- reduced-motion support.

Avoid stock AI/SaaS patterns: repeated generic cards, unnecessary gradients, large marketing hero sections, random neon, decorative charts, and excessive iconography.

## 15. Explainability and confidence

Every final numeric output has an internal contribution trace.

```ts
interface CalculationTraceStep {
  id: string;
  label: LocalizedText;
  inputValue: number;
  outputValue: number;
  operation: string;
  sourceRefs: SourceRef[];
  confidence: "verified" | "partial";
}
```

The default UI stays clean, but an `계산 근거` / `Calculation details` action exposes the trace. This allows debugging discrepancies against in-game screenshots without cluttering ordinary use.

## 16. Data versioning and updates

Generated canonical data is checked into the repository in a reproducible format. Suggested layout:

```text
src/game-data/
  manifest.json
  dice.json
  tree.json
  passives.json
  runes.json
  enemies.json
  localization.ko.json
  localization.en.json
src/simulation/
  engine/
  mechanics/
  confidence/
tools/rd2-extract/
```

`manifest.json` contains source SHA-256, client version, extraction timestamp, schema version, and extractor version.

When a new IPA/client appears, extraction produces a structured diff showing changed dice stats, passive values, tree costs, topology, localization, and mechanic parameters before the canonical dataset is updated.

## 17. Security and static-analysis constraint

The uploaded package is modified. V3 extraction therefore treats it as untrusted input.

Implementation rules:

- do not execute the IPA, injected dylibs, app binary, or bundled scripts;
- do not load untrusted dynamic libraries;
- use archive parsing, asset parsing, IL2CPP metadata inspection, disassembly/static control-flow inspection, and deterministic conversion only;
- ignore iGameGod/cheat-specific functionality and any altered runtime behavior unrelated to canonical tables;
- keep extracted evidence paths so suspicious values can be compared against future clean clients.

## 18. Testing strategy

V3 is not complete until the following layers pass.

### Extraction tests

- expected tables/identifiers are discoverable;
- extraction output is deterministic for the same IPA hash;
- malformed/missing tables fail loudly;
- no V2 fake resource types enter canonical tree costs.

### Data validation tests

- every prerequisite references a known node;
- rank-cost array lengths are consistent with rank semantics;
- localized IDs resolve where available;
- dice/rune/passive references are internally valid;
- duplicate IDs and impossible rank values fail validation.

### Simulation unit tests

- additive/multiplicative ordering is fixture-tested;
- attack interval path has golden tests;
- battle upgrade levels have golden tests;
- global/family/dice-only passive scopes are tested separately;
- percentile calculations are deterministic.

### Complex-dice golden tests

Predator/Devour is mandatory as the first complex golden fixture. Additional mechanic classes must each have at least one golden dice fixture.

### Integration and E2E

- changing a tree rank updates the selected dice stats immediately;
- changing battle upgrade state updates the same shared engine output;
- condition controls appear only for relevant dice;
- enemy preset and custom HP produce consistent kill-time changes;
- share/restore preserves semantic simulation state;
- desktop and mobile pan/zoom/detail-sheet flows work;
- console has no uncaught application errors.

### Visual QA

Capture and inspect at minimum:

- desktop full tree;
- mobile full tree;
- node detail sheet;
- Predator/Devour simulator;
- another mechanically different dice simulator;
- comparison view.

## 19. V3 acceptance criteria

V3 may be presented as complete only when all of the following are true:

1. Incorrect blue/red/prism Dice Tree currencies are removed from canonical calculations and UI.
2. The tree is generated from IPA-backed node/topology data or a clearly documented deterministic fallback when client position data is unavailable.
3. Rank-by-rank Gold and Stone costs come from the client arrays rather than extrapolation.
4. Existing client dice are discoverable through one canonical dice registry.
5. Korean names/descriptions come from client localization whenever available.
6. Permanent tree ranks and in-battle upgrade levels are combined by one explainable calculation engine.
7. Dice-specific condition controls are generated from mechanic definitions.
8. Predator/Devour has a verified or explicitly partial mechanic module with no invented formula.
9. Average/low/high outputs are statistically grounded when shown.
10. 5/10/30-second damage and kill-time results are generated from the same engine as displayed DPS.
11. Tree-node marginal value can be calculated for sufficiently verified effects.
12. Unknown mechanic paths are visibly partial and excluded from false precision.
13. Client version/hash provenance is preserved in generated game data.
14. Unit, data, extraction, integration, desktop E2E, mobile E2E, and visual QA checks pass before merge.
15. GitHub Pages deployment is performed only after the final `main` workflow succeeds.

## 20. Explicit non-goals for V3

V3 does not attempt to recreate the entire Random Dice 2 board simulation, matchmaking, summoning RNG, merge decisions, unit positioning AI, wave movement, or every multiplayer interaction.

It is a high-fidelity **stat, tree, and condition-based combat simulator**, not a full reimplementation of the game engine.

A future board simulator may build on the same canonical data and mechanic modules without changing the V3 product contract.

## 21. Implementation principle

Accuracy takes priority over coverage claims. The site should expose everything that can be supported by the client while making unresolved formula paths explicit. A partially simulated dice with proven inputs is preferable to a fully populated but guessed DPS model.
