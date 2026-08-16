# Random Dice 2 V3 IPA-Backed Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the screenshot-first V2 planner with an IPA-backed Random Dice 2 Dice Tree, canonical Gold/Stone progression data, and an explainable condition-based combat simulator for every dice discovered in the client.

**Architecture:** Keep untrusted IPA analysis completely offline and deterministic. A Python extraction tool converts static client evidence into checked-in normalized JSON under `src/game-data/`; the React app never parses or executes the IPA. A single TypeScript simulation engine consumes canonical dice/tree/passive/rune/enemy data, delegates only genuinely special mechanics to per-dice modules, and emits both results and calculation traces used by Tree, Simulator, Compare, and optimizer views.

**Tech Stack:** Node >=22.12.0, React 19.2.8, React DOM 19.2.8, TypeScript 7.0.2, Vite 8.1.5, Vitest 4.1.10, Playwright 1.62.1, Python 3.11+ standard library for archive/plist/binary scanning, optional pinned UnityPy only for serialized Unity asset decoding when the target table cannot be read as plain/static data.

## Global Constraints

- The uploaded modified IPA is untrusted input. Never execute the IPA, app binary, injected dylibs, bundled scripts, or dynamic libraries.
- Canonical client fingerprint is SHA-256 `0341bef051315f7827466d23f3e41900d06dfa3d4994c7ecc84a89f4d1e21dd8`; extraction must refuse a mismatched source unless an explicit new-client import flow is used.
- Dice Tree rank-up currencies are only `gold` and `stone` unless a later verified client table proves another currency for a specific node/rank.
- Remove `blueCard`, `redCard`, and `prismCube` from V3 canonical calculations, affordability, recommendations, and visible Dice Tree currency UI.
- Do not reuse the old Random Dice attack-speed formula. Exact attack interval/DPS remains partial until the Random Dice 2 code path is recovered and covered by golden tests.
- Unknown mechanics are never guessed. A mechanic may be displayed as partial, but unverified arithmetic must not enter exact DPS.
- All final numbers must be produced by one shared simulation engine. Tree impact, Simulator, Compare, and optimizer may not maintain separate arithmetic.
- Support Korean and English localization without changing semantic build/simulation state.
- White/pearl first UI, near-black typography, restrained violet/indigo accents, family color concentrated in graph nodes/paths, no generic SaaS card wall or heavy glassmorphism.
- Desktop and mobile must retain pan/zoom/pinch tree navigation; mobile details use bottom sheets.
- Preserve client version/hash/schema/extractor provenance in generated data.
- GitHub Pages deployment occurs only after unit/data/extraction/integration/E2E/visual QA checks pass on `main`.

---

## File Structure

Create or reshape the codebase around these boundaries:

```text
tools/rd2-extract/
  extract.py                 # safe IPA archive entrypoint; never executes client code
  fingerprint.py             # SHA-256/client identity verification
  archive.py                 # zip/plist/static file discovery
  unity_assets.py            # serialized Unity table/text decoding adapter
  il2cpp_scan.py             # metadata/string/static evidence scanner
  normalize.py               # raw records -> canonical JSON schema
  diff_clients.py            # canonical client-to-client structured diff
  tests/
    test_fingerprint.py
    test_normalize.py
    test_no_fake_currency.py
    fixtures/
      mini_raw_records.json
      mini_tree_rows.json

src/game-data/
  types.ts                   # canonical V3 data interfaces
  manifest.json
  dice.json
  tree.json
  passives.json
  runes.json
  enemies.json
  mechanic-evidence.json
  localization.ko.json
  localization.en.json
  load.ts
  validate.ts
  validate.test.ts

src/simulation/
  types.ts
  engine/simulate.ts
  engine/applyGrowth.ts
  engine/applyPassives.ts
  engine/attackInterval.ts
  engine/damageTimeline.ts
  engine/trace.ts
  confidence/resultConfidence.ts
  randomness/binomialRange.ts
  mechanics/registry.ts
  mechanics/genericProjectile.ts
  mechanics/devour.ts
  mechanics/partial.ts
  enemy/presets.ts
  marginal/evaluateNode.ts
  *.test.ts

src/planner-v3/
  types.ts
  reducer.ts
  reducer.test.ts
  selectors.ts

src/features/v3/
  shell/V3Shell.tsx
  tree/TreeCanvasV3.tsx
  tree/TreeNodeV3.tsx
  tree/NodeDetailSheet.tsx
  simulator/SimulatorView.tsx
  simulator/DiceSelector.tsx
  simulator/ConditionControls.tsx
  simulator/EnemyControls.tsx
  simulator/StatPanel.tsx
  simulator/DamageGraph.tsx
  simulator/CalculationDetails.tsx
  compare/CompareView.tsx
  shared/NumberRoll.tsx

src/share/
  codecV3.ts
  codecV3.test.ts
  migrateV2ToV3.ts

src/app/
  App.tsx
  app-v3.css
  motion-v3.css

e2e/
  planner-v3.spec.ts
```

Keep V2 files during migration until V3 state/share restoration and E2E are green; delete or quarantine obsolete V2 resource logic only after the V3 replacement tests pass.

---

### Task 1: Establish V3 canonical types and remove fake currency from the new contract

**Files:**
- Create: `src/game-data/types.ts`
- Create: `src/game-data/load.ts`
- Create: `src/game-data/validate.ts`
- Create: `src/game-data/validate.test.ts`
- Modify later only after migration is green: `src/domain/types.ts`

**Interfaces:**
- Produces: `CanonicalGameData`, `DiceDefinitionV3`, `DiceTreeNodeV3`, `PassiveDefinitionV3`, `RuneDefinitionV3`, `EnemyDefinitionV3`, `GameManifest`, `TreeCost`.
- `TreeCost` is exactly `{ gold: number; stone: number }`.

- [ ] **Step 1: Write the failing schema test**

```ts
import { describe, expect, it } from "vitest";
import { validateCanonicalGameData } from "./validate";

it("rejects non-Gold/Stone Dice Tree currency fields", () => {
  const invalid = {
    manifest: { schemaVersion: 3, clientVersion: "1.0.1", sourceSha256: "x", extractorVersion: "0.1.0", extractedAt: "2026-08-16T00:00:00Z" },
    dice: [], passives: [], runes: [], enemies: [], localization: { ko: {}, en: {} },
    tree: [{ id: "n1", family: "chaos", kind: "passive", position: { x: 0, y: 0 }, prerequisites: [], maxRank: 1, costsByRank: [{ gold: 1000, stone: 0, blueCard: 1 }] }],
  } as never;
  expect(() => validateCanonicalGameData(invalid)).toThrow(/gold.*stone/i);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- src/game-data/validate.test.ts`
Expected: FAIL because V3 canonical types/validator do not exist.

- [ ] **Step 3: Implement the canonical contract**

```ts
export type DiceFamilyV3 = "order" | "chaos" | "magic" | "engineering" | "nature";
export type CalculationConfidence = "verified" | "partial";
export type SourceKindV3 = "ipa-table" | "ipa-localization" | "ipa-asset" | "il2cpp-code-path";
export interface LocalizedTextV3 { ko: string; en: string }
export interface TreeCost { gold: number; stone: number }
export interface GameManifest {
  schemaVersion: 3;
  clientVersion: string;
  sourceSha256: string;
  extractorVersion: string;
  extractedAt: string;
}
export interface DiceTreeNodeV3 {
  id: string;
  family: DiceFamilyV3 | "core";
  kind: "dice" | "passive" | "perk" | "milestone" | "connector";
  position: { x: number; y: number };
  prerequisites: Array<{ nodeId: string; minRank: number }>;
  targetId?: string;
  maxRank: number;
  costsByRank: TreeCost[];
  passiveOrRuneRef?: string;
  nameKey?: string;
  descriptionKey?: string;
  sourceRefs: string[];
}
```

Validator rule: every cost object must have no keys other than `gold` and `stone`; each prerequisite must reference a known node; `costsByRank.length` must be either `maxRank` or a documented zero-cost rank convention encoded explicitly by the extractor.

- [ ] **Step 4: Run schema tests**

Run: `npm test -- src/game-data/validate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game-data
git commit -m "feat: add V3 canonical game data schema"
```

---

### Task 2: Build the safe IPA fingerprint and archive discovery layer

**Files:**
- Create: `tools/rd2-extract/fingerprint.py`
- Create: `tools/rd2-extract/archive.py`
- Create: `tools/rd2-extract/extract.py`
- Create: `tools/rd2-extract/tests/test_fingerprint.py`
- Modify: `.gitignore`

**Interfaces:**
- `sha256_file(path: Path) -> str`
- `assert_client_fingerprint(path: Path, expected_sha256: str) -> str`
- `discover_client_files(ipa_path: Path) -> ClientArchiveIndex`
- No function in this tool executes extracted files.

- [ ] **Step 1: Write fingerprint tests**

```py
from pathlib import Path
from rd2_extract.fingerprint import sha256_file

def test_sha256_file(tmp_path: Path):
    p = tmp_path / "client.bin"
    p.write_bytes(b"rd2")
    assert sha256_file(p) == "87e85f0a55d15cdbbf9c51f06ec6f5f18a6bd05f4f32d1aaa55f9af6a10f74d0"
```

Use Python's `hashlib.sha256` to generate the expected literal once; if the literal above differs from the interpreter result, replace the fixture literal with the interpreter result before committing so the test asserts a real known digest.

- [ ] **Step 2: Run the Python test**

Run: `python3 -m unittest discover tools/rd2-extract/tests -p 'test_*.py'`
Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement safe archive discovery**

```py
from dataclasses import dataclass
from pathlib import Path
from zipfile import ZipFile
import hashlib

EXPECTED_101_SHA256 = "0341bef051315f7827466d23f3e41900d06dfa3d4994c7ecc84a89f4d1e21dd8"

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def list_members(path: Path) -> list[str]:
    with ZipFile(path) as zf:
        return sorted(zf.namelist())
```

`extract.py` accepts `--ipa`, `--out`, and `--allow-new-client`. Default behavior must reject a SHA mismatch. `.gitignore` must include `*.ipa`, `tools/rd2-extract/work/`, and raw extracted app bundles.

- [ ] **Step 4: Verify the uploaded IPA only with read-only tooling**

Run locally in the isolated worktree/container:

```bash
python3 tools/rd2-extract/extract.py --ipa "/mnt/data/Random Dice 2 _ 랜덤 다이스 2 iOS Mod IPA No Jailbreak Cheats 1.0.1 Hacked IPA by iOSGods.com.ipa" --out tools/rd2-extract/work
```

Expected: fingerprint equals the approved 1.0.1 hash; archive index records `global-metadata.dat`, `UnityFramework`, plist, data assets, and localization candidates without executing them.

- [ ] **Step 5: Commit**

```bash
git add .gitignore tools/rd2-extract
git commit -m "feat: add safe Random Dice 2 IPA scanner"
```

---

### Task 3: Normalize raw table evidence into reproducible canonical JSON

**Files:**
- Create: `tools/rd2-extract/normalize.py`
- Create: `tools/rd2-extract/unity_assets.py`
- Create: `tools/rd2-extract/il2cpp_scan.py`
- Create: `tools/rd2-extract/tests/test_normalize.py`
- Create: `tools/rd2-extract/tests/test_no_fake_currency.py`
- Create: `tools/rd2-extract/tests/fixtures/mini_raw_records.json`
- Generate: `src/game-data/manifest.json`, `dice.json`, `tree.json`, `passives.json`, `runes.json`, `enemies.json`, `mechanic-evidence.json`, localization files

**Interfaces:**
- `normalize_records(records, provenance) -> dict[str, object]`
- `build_tree_costs(rank_up_gold_arr, rank_up_stone_arr, max_rank) -> list[TreeCost]`
- `scan_il2cpp_identifiers(metadata_bytes, binary_bytes) -> list[StaticEvidence]`

- [ ] **Step 1: Create a minimal real-shape fixture**

Fixture rows must use the field names already observed in the client, including `RankUpGoldArr`, `RankUpStoneArr`, `Attack`, `Attack_LvAdd`, `Attack_UpAdd`, `Range`, `Range_LvAdd`, `AttackInterval`, and `AttackInterval_UpAdd`. Keep the fixture small and numeric; do not commit the IPA or raw app bundle.

- [ ] **Step 2: Write normalization tests**

```py
from rd2_extract.normalize import build_tree_costs

def test_rank_costs_zip_gold_and_stone_only():
    assert build_tree_costs([2000, 3000], [0, 1], 2) == [
        {"gold": 2000, "stone": 0},
        {"gold": 3000, "stone": 1},
    ]
```

```py
def test_normalized_tree_never_contains_v2_fake_currency(normalized):
    text = __import__("json").dumps(normalized["tree"])
    assert "blueCard" not in text
    assert "redCard" not in text
    assert "prismCube" not in text
```

- [ ] **Step 3: Implement deterministic normalization**

Sort records by stable client ID, normalize numeric arrays without extrapolation, preserve raw IDs in `sourceRefs`, and emit `mechanic-evidence.json` entries like:

```json
{
  "key": "attack-interval-path",
  "symbols": ["GetAttackIntervalByRatio", "GetFinalAttackIntervalWithRuneEffect", "RT_AttackInterval"],
  "confidence": "partial",
  "formula": null,
  "sourceRefs": ["il2cpp:metadata:attack-interval"]
}
```

A symbol name alone must never create a formula.

- [ ] **Step 4: Generate and validate the 1.0.1 dataset**

Run:

```bash
python3 tools/rd2-extract/extract.py --ipa "/mnt/data/Random Dice 2 _ 랜덤 다이스 2 iOS Mod IPA No Jailbreak Cheats 1.0.1 Hacked IPA by iOSGods.com.ipa" --out tools/rd2-extract/work --emit src/game-data
npm test -- src/game-data/validate.test.ts
```

Expected: canonical JSON is deterministic; tree costs contain only Gold/Stone; manifest source hash matches the approved IPA hash.

- [ ] **Step 5: Commit**

```bash
git add tools/rd2-extract src/game-data
git commit -m "feat: generate IPA-backed Random Dice 2 game data"
```

---

### Task 4: Add client-diff protection for future IPA updates

**Files:**
- Create: `tools/rd2-extract/diff_clients.py`
- Create: `tools/rd2-extract/tests/test_diff_clients.py`
- Create: `docs/data/v3-client-1.0.1-extraction.md`

**Interfaces:**
- `diff_canonical(old_dir: Path, new_dir: Path) -> ClientDiff`
- Diff sections: `diceStats`, `treeCosts`, `treeTopology`, `passives`, `runes`, `enemies`, `localization`, `mechanicEvidence`.

- [ ] **Step 1: Write a fixture diff test**

```py
def test_tree_cost_change_is_reported():
    old = {"tree": [{"id": "n1", "costsByRank": [{"gold": 2000, "stone": 0}]}]}
    new = {"tree": [{"id": "n1", "costsByRank": [{"gold": 3000, "stone": 0}]}]}
    diff = diff_documents(old, new)
    assert diff["treeCosts"][0]["nodeId"] == "n1"
```

- [ ] **Step 2: Run and confirm failure**

Run: `python3 -m unittest discover tools/rd2-extract/tests -p 'test_*.py'`

- [ ] **Step 3: Implement stable semantic diffing**

Do not compare JSON text ordering. Index canonical records by ID and report field-level old/new values.

- [ ] **Step 4: Document extraction provenance**

`docs/data/v3-client-1.0.1-extraction.md` must record source SHA, package version, tables successfully normalized, mechanic paths still partial, and the rule that modified-runtime cheat behavior was excluded.

- [ ] **Step 5: Commit**

```bash
git add tools/rd2-extract docs/data/v3-client-1.0.1-extraction.md
git commit -m "feat: add client data diff and provenance report"
```

---

### Task 5: Create V3 planner/simulation state and V2 migration

**Files:**
- Create: `src/planner-v3/types.ts`
- Create: `src/planner-v3/reducer.ts`
- Create: `src/planner-v3/reducer.test.ts`
- Create: `src/share/codecV3.ts`
- Create: `src/share/codecV3.test.ts`
- Create: `src/share/migrateV2ToV3.ts`

**Interfaces:**

```ts
export interface SimulationScenarioState {
  diceId: string;
  diceProgressionLevel: number;
  battleUpgradeLevel: number;
  conditionValues: Record<string, number | boolean | string>;
  enemyPresetId: string;
  enemyHpOverride?: number;
  durationSeconds: number;
}

export interface PlannerStateV3 {
  schemaVersion: 3;
  dataVersion: string;
  ownedRanks: Record<string, number>;
  simulatedRanks: Record<string, number>;
  inventory: { gold: number; stone: number };
  scenario: SimulationScenarioState;
}
```

- [ ] **Step 1: Write migration tests**

A V2 state containing `blueCard`, `redCard`, and `prismCube` must migrate without carrying those values into V3. Known V2 node plans map to V3 rank 1 only when the same node ID exists; unknown IDs are dropped.

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- src/planner-v3/reducer.test.ts src/share/codecV3.test.ts`

- [ ] **Step 3: Implement reducer/history and `v3.` share codec**

Actions: `setOwnedRank`, `setSimulatedRank`, `incrementSimulatedRank`, `decrementSimulatedRank`, `setInventory`, `setScenario`, `undo`, `redo`, `resetSimulation`, `load`.

- [ ] **Step 4: Verify semantic round-trip**

Test: `decodeV3(encodeV3(state))` deeply equals the input state and language is not included in semantic state.

- [ ] **Step 5: Commit**

```bash
git add src/planner-v3 src/share
git commit -m "feat: add V3 planner state and share migration"
```

---

### Task 6: Implement the explainable common stat-growth engine

**Files:**
- Create: `src/simulation/types.ts`
- Create: `src/simulation/engine/trace.ts`
- Create: `src/simulation/engine/applyGrowth.ts`
- Create: `src/simulation/engine/simulate.ts`
- Create: `src/simulation/engine/simulate.test.ts`

**Interfaces:**

```ts
export interface CalculationTraceStep {
  id: string;
  labelKey: string;
  inputValue: number;
  outputValue: number;
  operation: string;
  sourceRefs: string[];
  confidence: "verified" | "partial";
}

export interface SimulationResult {
  confidence: "verified" | "partial";
  finalStats: { attack?: number; attackInterval?: number; attacksPerSecond?: number; range?: number };
  averageDps?: number;
  lowDps?: number;
  highDps?: number;
  damageAt: Record<5 | 10 | 30, number | undefined>;
  expectedKillTime?: number;
  trace: CalculationTraceStep[];
  unresolvedReasons: string[];
}
```

- [ ] **Step 1: Write a deterministic growth fixture test**

Use a fixture dice with attack `100`, verified level growth `+10`, battle upgrade `+20`, and no passives. At progression level 3 and battle upgrade level 2, assert the operation order defined by the fixture and assert trace steps record each transformation.

- [ ] **Step 2: Confirm failure**

Run: `npm test -- src/simulation/engine/simulate.test.ts`

- [ ] **Step 3: Implement only verified generic fields**

The engine must read canonical growth rules such as:

```ts
export interface DiceGrowthRuleV3 {
  stat: "attack" | "attackInterval" | "range" | string;
  mode: "add" | "multiply";
  perStep: number;
  appliesFromStep: number;
  sourceRefs: string[];
  confidence: "verified" | "partial";
}
```

Partial growth rules may appear in the trace as unresolved evidence but may not alter exact values.

- [ ] **Step 4: Run tests**

Expected: deterministic stat/trace tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/simulation
git commit -m "feat: add explainable V3 stat simulation core"
```

---

### Task 7: Recover and gate the Random Dice 2 attack-interval path

**Files:**
- Modify: `tools/rd2-extract/il2cpp_scan.py`
- Modify: `src/game-data/mechanic-evidence.json`
- Create: `src/simulation/engine/attackInterval.ts`
- Create: `src/simulation/engine/attackInterval.test.ts`
- Create: `docs/data/v3-attack-interval-evidence.md`

**Interfaces:**
- `calculateAttackInterval(input: AttackIntervalInput, evidence: AttackIntervalEvidence): VerifiedValue<number>`
- `VerifiedValue<T> = { value?: T; confidence: "verified" | "partial"; sourceRefs: string[]; reason?: string }`

- [ ] **Step 1: Add partial-path behavior test first**

```ts
it("does not guess attack interval when code-path evidence is partial", () => {
  const result = calculateAttackInterval({ baseInterval: 2.7, battleUpgradeDelta: -0.08, speedRatio: 0.05 }, partialEvidence);
  expect(result.confidence).toBe("partial");
  expect(result.value).toBeUndefined();
});
```

- [ ] **Step 2: Extract static evidence around the named functions**

Use IL2CPP metadata offsets, symbol/string references, static disassembly/control-flow inspection, and constants only. Do not execute the binary. Record enough evidence to determine operation order, ratio interpretation, and clamps before changing `confidence` to `verified`.

- [ ] **Step 3: Encode recovered formula as data plus a small evaluator**

Do not hardcode unexplained constants in JSX. `mechanic-evidence.json` stores verified constants/order and `attackInterval.ts` applies them.

- [ ] **Step 4: Add golden interval cases**

At minimum cover base interval, one battle upgrade step, multiple battle upgrade steps, one tree speed passive, combined rune/passive ordering, and any discovered minimum interval clamp.

- [ ] **Step 5: Commit**

```bash
git add tools/rd2-extract src/game-data/mechanic-evidence.json src/simulation/engine/attackInterval* docs/data/v3-attack-interval-evidence.md
git commit -m "feat: verify Random Dice 2 attack interval calculation"
```

If the formula cannot be verified from static evidence, commit the partial gate and evidence document without inventing a formula; exact DPS remains disabled for affected dice.

---

### Task 8: Apply global, family, and dice-specific tree passives through one engine stage

**Files:**
- Create: `src/simulation/engine/applyPassives.ts`
- Create: `src/simulation/engine/applyPassives.test.ts`
- Modify: `src/simulation/engine/simulate.ts`

**Interfaces:**
- `collectActivePassives(treeRanks, tree, passives, runes) -> ActivePassive[]`
- `applyPassives(stats, activePassives, dice) -> { stats; trace; unresolvedReasons }`

- [ ] **Step 1: Write separate scope tests**

Tests must independently prove `global`, `family`, and `diceId` scopes. A Chaos-only speed passive must not alter an Order dice.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/simulation/engine/applyPassives.test.ts`

- [ ] **Step 3: Implement scope resolution from canonical refs**

No strategy tags may decide mechanical scope. Only normalized `PlayerPassiveTable`/`RuneTable` relationships may do so.

- [ ] **Step 4: Add marginal one-rank fixture**

Increment one verified passive rank and assert the engine result changes by the exact canonical delta while unrelated stats remain unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/simulation/engine
git commit -m "feat: apply verified Dice Tree passives in simulation"
```

---

### Task 9: Add mechanic registry and Devour/Predator as the first complex golden module

**Files:**
- Create: `src/simulation/mechanics/registry.ts`
- Create: `src/simulation/mechanics/genericProjectile.ts`
- Create: `src/simulation/mechanics/devour.ts`
- Create: `src/simulation/mechanics/partial.ts`
- Create: `src/simulation/mechanics/devour.test.ts`
- Modify: `src/simulation/engine/simulate.ts`

**Interfaces:**

```ts
export interface ConditionDefinition {
  id: string;
  kind: "number" | "boolean" | "enum";
  labelKey: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number | boolean | string;
}

export interface DiceMechanicRule {
  diceId: string;
  requiredConditions: ConditionDefinition[];
  evaluate(ctx: SimulationContext): MechanicEvaluation;
  confidence: "verified" | "partial";
  evidence: string[];
}
```

- [ ] **Step 1: Register every discovered dice**

Every dice ID must resolve to either a verified generic/mechanic rule or `partialMechanicRule(diceId)`. No dice silently falls through to invented generic DPS.

- [ ] **Step 2: Write Devour partial tests before formula recovery**

Assert identifiers `PredatorDmgPerStack`, `BonusPredatorChance`, and `InstaPredatorHpThreshold` can appear as evidence without producing exact effect damage until their table/code relationships are verified.

- [ ] **Step 3: Recover Devour relationships from serialized rows/static code evidence**

Promote each component independently. If stack damage is verified but instant-kill threshold ordering is not, exact stack damage may be used while the unresolved instant-kill component remains excluded and marks the total result partial.

- [ ] **Step 4: Add a golden Devour fixture**

Fixture must assert input base stats, progression level, battle upgrade level, tree ranks, condition values, enemy HP/category, output hit damage, interval, effect contribution, DPS, and trace source IDs.

- [ ] **Step 5: Commit**

```bash
git add src/simulation/mechanics src/simulation/engine/simulate.ts
git commit -m "feat: add dice mechanic registry and Devour golden module"
```

---

### Task 10: Add statistically grounded low/average/high outcomes

**Files:**
- Create: `src/simulation/randomness/binomialRange.ts`
- Create: `src/simulation/randomness/binomialRange.test.ts`
- Modify: `src/simulation/mechanics/devour.ts`
- Modify: `src/simulation/types.ts`

**Interfaces:**
- `binomialQuantile(n: number, p: number, q: number) -> number`
- `expectedBinomial(n: number, p: number) -> number`
- Use q=`0.1` and q=`0.9` for low/high when the trigger model is verified as independent Bernoulli.

- [ ] **Step 1: Write exact small-distribution tests**

For `n=10`, `p=0.5`, compare quantiles to an explicitly enumerated PMF in the test; do not use random sampling.

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- src/simulation/randomness/binomialRange.test.ts`

- [ ] **Step 3: Implement deterministic CDF/quantile calculation**

Use stable recurrence for small/medium n and a documented deterministic normal approximation only beyond a tested threshold.

- [ ] **Step 4: Gate UI ranges on mechanic evidence**

If independence/state assumptions are not verified, `lowDps` and `highDps` are `undefined` and `unresolvedReasons` contains a localized reason key.

- [ ] **Step 5: Commit**

```bash
git add src/simulation/randomness src/simulation/mechanics/devour.ts src/simulation/types.ts
git commit -m "feat: add deterministic practical DPS ranges"
```

---

### Task 11: Implement enemy presets, damage timeline, and kill time

**Files:**
- Create: `src/simulation/enemy/presets.ts`
- Create: `src/simulation/engine/damageTimeline.ts`
- Create: `src/simulation/engine/damageTimeline.test.ts`
- Modify: `src/simulation/engine/simulate.ts`

**Interfaces:**
- `resolveEnemyScenario(presetId, hpOverride, canonicalEnemies) -> EnemyScenario`
- `buildDamageTimeline(resultParts, durationSeconds) -> DamageTimeline`
- `killTimeSeconds(hp, timelineModel) -> number | undefined`

- [ ] **Step 1: Write normal/boss/custom preset tests**

A custom HP override must never be replaced by a guessed canonical absolute HP. Relative-only client records should require an override.

- [ ] **Step 2: Write 5/10/30 second consistency tests**

For a deterministic 100 DPS fixture: 5s=500, 10s=1000, 30s=3000 and 2500 HP kill time=25s.

- [ ] **Step 3: Implement timeline from the same mechanic output**

Do not multiply the displayed rounded DPS. Use unrounded engine contributions and only format at render time.

- [ ] **Step 4: Add boss multiplier tests using a canonical fixture**

Test the exact operation stage documented by client evidence; if boss ordering is partial, keep kill-time confidence partial.

- [ ] **Step 5: Commit**

```bash
git add src/simulation/enemy src/simulation/engine
git commit -m "feat: add enemy scenarios and damage timeline"
```

---

### Task 12: Replace tag-based recommendation math with marginal verified node value

**Files:**
- Create: `src/simulation/marginal/evaluateNode.ts`
- Create: `src/simulation/marginal/evaluateNode.test.ts`
- Modify: `src/optimizer/recommend.ts`
- Modify: `src/optimizer/recommend.test.ts`

**Interfaces:**

```ts
export interface MarginalNodeResult {
  nodeId: string;
  beforeDps?: number;
  afterDps?: number;
  absoluteGain?: number;
  percentGain?: number;
  cost: { gold: number; stone: number };
  gainPerGold?: number;
  gainPerStone?: number;
  prerequisiteCost: { gold: number; stone: number };
  confidence: "verified" | "partial";
  reasons: string[];
}
```

- [ ] **Step 1: Write one-rank before/after tests**

The evaluator must call `simulate()` twice with identical scenario inputs except one node rank. It must not reproduce formulas locally.

- [ ] **Step 2: Add prerequisite cost tests**

Sum actual Gold/Stone arrays for every missing prerequisite rank. No extrapolated cost is permitted.

- [ ] **Step 3: Implement ranking policy**

Exact ranking requires verified before/after values. Partial candidates may be shown separately as `needs mechanic verification` but cannot outrank verified candidates on fabricated utility.

- [ ] **Step 4: Replace current V2 normalized fake-resource scoring**

Remove any weighting equivalent to `blueCard * 4`, `redCard * 7`, or `prismCube * 6` from the V3 path.

- [ ] **Step 5: Commit**

```bash
git add src/simulation/marginal src/optimizer
git commit -m "feat: rank tree investments by simulated marginal value"
```

---

### Task 13: Build the IPA-backed TreeCanvasV3 and rank interaction model

**Files:**
- Create: `src/features/v3/tree/TreeCanvasV3.tsx`
- Create: `src/features/v3/tree/TreeNodeV3.tsx`
- Create: `src/features/v3/tree/TreeCanvasV3.test.tsx`
- Reuse: `src/features/tree/usePanZoom.ts`
- Modify if necessary: `src/features/tree/usePanZoom.ts`

**Interfaces:**
- Props consume canonical `DiceTreeNodeV3[]`, owned ranks, simulated ranks, selected node ID, recommendation IDs, family/query filters, and callbacks.

- [ ] **Step 1: Write rendering/state tests**

Assert canonical node count renders, prerequisite edges use real node IDs, owned vs simulated ranks have distinct classes, maxed nodes cannot increment, and a locked node cannot exceed prerequisite rules.

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- src/features/v3/tree/TreeCanvasV3.test.tsx`

- [ ] **Step 3: Implement world-space graph from canonical positions**

Use client positions when normalized. If a node has documented fallback position, render it with the same deterministic coordinates from `tree.json`; do not calculate a new random/radial layout in React.

- [ ] **Step 4: Preserve pointer/touch controls**

Verify mouse pan, wheel zoom, pinch zoom, fit tree, jump to family, jump to selected dice, and reduced-motion behavior.

- [ ] **Step 5: Commit**

```bash
git add src/features/v3/tree src/features/tree/usePanZoom.ts
git commit -m "feat: render IPA-backed Dice Tree graph"
```

---

### Task 14: Build a real node detail sheet with costs, effect delta, and selected-dice impact

**Files:**
- Create: `src/features/v3/tree/NodeDetailSheet.tsx`
- Create: `src/features/v3/tree/NodeDetailSheet.test.tsx`
- Create: `src/features/v3/simulator/CalculationDetails.tsx`

**Interfaces:**
- Consumes `DiceTreeNodeV3`, localized names/descriptions, current/next rank, `MarginalNodeResult`, and source refs.

- [ ] **Step 1: Write an information-completeness test**

For a canonical rankable node, assert visible name, `current/max`, current effect, next effect delta when known, next Gold, next Stone, prerequisites, scope, and selected-dice DPS impact when verified.

- [ ] **Step 2: Verify no generic placeholder when canonical data exists**

Test must fail if the rendered text contains the old generic `상세 확인 중`/`details pending` copy for a node with a name/effect in canonical data.

- [ ] **Step 3: Implement side sheet + mobile bottom-sheet semantics**

Keep source/confidence details behind `계산 근거` / `Calculation details`; do not clutter default content with warning badges.

- [ ] **Step 4: Add rank controls**

`−`, `+`, and accessible slider/input update simulated rank only, leave owned rank intact, and respect prerequisites/max rank.

- [ ] **Step 5: Commit**

```bash
git add src/features/v3/tree/NodeDetailSheet* src/features/v3/simulator/CalculationDetails.tsx
git commit -m "feat: add canonical Dice Tree node details"
```

---

### Task 15: Build the all-dice Simulator with dynamic mechanic conditions

**Files:**
- Create: `src/features/v3/simulator/SimulatorView.tsx`
- Create: `src/features/v3/simulator/DiceSelector.tsx`
- Create: `src/features/v3/simulator/ConditionControls.tsx`
- Create: `src/features/v3/simulator/EnemyControls.tsx`
- Create: `src/features/v3/simulator/StatPanel.tsx`
- Create: `src/features/v3/simulator/DamageGraph.tsx`
- Create: `src/features/v3/simulator/SimulatorView.test.tsx`

**Interfaces:**
- All displayed numbers come from `simulate(input, gameData)`.
- `ConditionControls` receives only `mechanicRule.requiredConditions`.

- [ ] **Step 1: Write dice-selection and condition tests**

Selecting a dice with no conditions shows no irrelevant inputs. Selecting Devour shows only condition IDs actually declared by its mechanic module. Search must match Korean and English canonical names.

- [ ] **Step 2: Write result-panel tests**

Assert final attack, interval, attacks/sec, average DPS, valid low/high range, 5/10/30 damage, kill time, and partial-state messaging all come from one `SimulationResult` fixture.

- [ ] **Step 3: Implement enemy preset + editable HP/duration controls**

Preset changes update scenario state; direct HP edit changes kill time without mutating canonical enemy data.

- [ ] **Step 4: Implement graph without a chart dependency**

Use an accessible SVG polyline/path generated from the damage timeline, with a textual 5/10/30 checkpoint fallback. Animate path changes unless `prefers-reduced-motion`.

- [ ] **Step 5: Commit**

```bash
git add src/features/v3/simulator
git commit -m "feat: add all-dice combat simulator UI"
```

---

### Task 16: Add Compare using the exact same simulation engine

**Files:**
- Create: `src/features/v3/compare/CompareView.tsx`
- Create: `src/features/v3/compare/CompareView.test.tsx`

**Interfaces:**
- Compare receives two `SimulationInput` objects and calls the shared `simulate()` engine for both.

- [ ] **Step 1: Write same-dice/different-tree comparison test**

Assert only changed tree ranks account for the result delta.

- [ ] **Step 2: Write different-dice/same-enemy test**

Both sides must use the identical enemy scenario object and duration.

- [ ] **Step 3: Implement delta presentation**

Show absolute/percentage DPS delta, 5/10/30 damage delta, kill-time delta, and confidence differences. If one side is partial, do not present an exact winner badge.

- [ ] **Step 4: Add calculation-details access per side**

Trace viewers must expose the same engine trace used by Simulator.

- [ ] **Step 5: Commit**

```bash
git add src/features/v3/compare
git commit -m "feat: add shared-engine dice comparison view"
```

---

### Task 17: Integrate the V3 shell, navigation, visual system, and remove obsolete currency UI

**Files:**
- Create: `src/features/v3/shell/V3Shell.tsx`
- Create: `src/features/v3/shared/NumberRoll.tsx`
- Create: `src/app/app-v3.css`
- Create: `src/app/motion-v3.css`
- Modify: `src/app/App.tsx`
- Modify: `src/main.tsx`
- Modify: `src/i18n/strings.ts`
- Remove from V3 render path: `src/features/research/CostResearchPanel.tsx`, `src/app/cost-research.css`, `src/tree-data-v2/resources.ts`

**Interfaces:**
- Navigation tabs: `tree | simulator | compare`.
- Header inventory: Gold and Stone only.

- [ ] **Step 1: Write App integration test**

Assert the V3 app defaults to Dice Tree, navigation switches to Simulator/Compare, resource rail contains Gold/Stone, and visible DOM contains none of `파란 재화`, `빨간 재화`, `프리즘 재화`, `Blue`, `Red`, `Prism` as Dice Tree resources.

- [ ] **Step 2: Implement the V3 shell**

Keep the tree as the dominant surface; Simulator/Compare are first-class views, not modal research panels. Desktop details attach as side sheet; mobile details use bottom sheet.

- [ ] **Step 3: Implement motion and reduced-motion rules**

Path draw, node halo, number roll, damage graph morph, and sheet spring must have `@media (prefers-reduced-motion: reduce)` fallbacks with transforms/transitions disabled or shortened to effectively instantaneous state changes.

- [ ] **Step 4: Delete/quarantine V2 fake-resource data after all V3 tests pass**

Remove imports/references from live code. Historical V2 docs may remain as history, but V3 app runtime must not load fake resource definitions or `costEvidence.ts` into calculations.

- [ ] **Step 5: Commit**

```bash
git add src/app src/features/v3 src/main.tsx src/i18n src/tree-data-v2 src/features/research
git commit -m "feat: switch planner UI to V3 IPA-backed experience"
```

---

### Task 18: Complete E2E, visual QA, CI, documentation, and deployment gate

**Files:**
- Create: `e2e/planner-v3.spec.ts`
- Modify: `.github/workflows/pages.yml`
- Modify: `README.md`
- Modify: `docs/data/v3-client-1.0.1-extraction.md`

**Interfaces:**
- CI sequence: install -> unit/data tests -> Python extraction-tool fixture tests -> production build -> Playwright desktop/mobile -> QA screenshots -> Pages artifact -> deploy only on `main`.

- [ ] **Step 1: Add full desktop/mobile E2E flows**

Required scenarios:

```ts
test("tree rank changes selected dice simulation", async ({ page }) => { /* select dice -> select verified node -> +1 rank -> assert DPS/stat delta */ });
test("battle upgrade uses same engine", async ({ page }) => { /* change upgrade -> assert result changes */ });
test("conditions are dice-specific", async ({ page }) => { /* switch dice -> assert relevant controls only */ });
test("custom enemy HP changes kill time", async ({ page }) => { /* edit HP -> assert kill-time delta */ });
test("share restore preserves V3 semantic state", async ({ page, context }) => { /* encode -> fresh page -> equal semantic hash */ });
```

Also retain pan/zoom/pinch and malformed-share coverage.

- [ ] **Step 2: Capture mandatory visual QA**

Screenshots:
- desktop full tree;
- mobile full tree;
- desktop node detail;
- mobile node detail bottom sheet;
- Devour simulator;
- one mechanically different dice simulator;
- Compare view.

Inspect screenshots manually for overlap, clipped controls, fake-resource remnants, unreadable labels, generic empty placeholders, and AI-dashboard visual regressions.

- [ ] **Step 3: Extend CI with Python fixture tests**

Add a step before build:

```yaml
- name: Extraction tool tests
  run: python3 -m unittest discover tools/rd2-extract/tests -p 'test_*.py'
```

Do not require the proprietary IPA in GitHub Actions; CI tests the extractor with checked-in minimal fixtures and validates the checked-in canonical JSON manifest/hash.

- [ ] **Step 4: Run the complete verification suite from a clean checkout**

```bash
npm ci
python3 -m unittest discover tools/rd2-extract/tests -p 'test_*.py'
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Expected: all commands exit 0; browser console has no uncaught application errors; mandatory QA screenshots exist.

- [ ] **Step 5: Update docs and commit**

README must explain:
- V3 data source and static-analysis safety boundary;
- Gold/Stone-only Dice Tree cost model;
- verified vs partial calculations;
- how to import a future client safely;
- how share links preserve semantic state.

```bash
git add e2e .github/workflows/pages.yml README.md docs/data/v3-client-1.0.1-extraction.md
git commit -m "test: verify and document Random Dice 2 V3"
```

- [ ] **Step 6: Final merge/deploy gate**

Open a PR from the V3 implementation branch. Merge only after the PR workflow is fully green. After merge, verify the `main` workflow runs against the merge SHA and both `validate` and `deploy` jobs conclude `success`. Only then report the GitHub Pages V3 deployment as complete.

---

## Plan Self-Review

- Spec coverage: extraction/provenance, corrected currencies, canonical tree/dice/passive/rune/enemy data, all-dice simulation, attack interval verification, Devour golden mechanic, randomness ranges, enemy presets, marginal node value, Tree/Simulator/Compare UI, explainability, version diffing, static-analysis safety, migration/share, mobile/desktop/E2E/visual QA, and Pages deployment are each mapped to tasks above.
- Placeholder scan: unresolved game mechanics are represented as explicit `partial` confidence gates rather than unspecified work. No task instructs the implementer to invent missing formulas.
- Type consistency: all downstream tasks consume the V3 contracts introduced in Tasks 1, 5, and 6. Currency types are consistently `{ gold, stone }`; simulator views consume `SimulationInput`/`SimulationResult`; optimizer consumes the same `simulate()` engine through `evaluateNode()`.
- Scope boundary: full board simulation, matchmaking, merge/summon RNG, positioning AI, and complete multiplayer reproduction remain outside V3 exactly as specified.
