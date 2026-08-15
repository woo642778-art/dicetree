# Random Dice 2 Tree Planner V2 Rebuild Design

Date: 2026-08-15
Branch: `feat/v2-rebuild`
Status: design approved in conversation, pending final spec review

## 1. Product goal

V2 replaces the prototype-oriented V1 with a data-first planner that resembles the real Random Dice 2 growth tree closely enough to be useful for actual progression decisions. The product must prioritize game fidelity, source traceability, practical route planning, and a polished custom visual identity over rapid placeholder coverage.

The planner is not allowed to fill gaps with invented names, effects, costs, ranks, formulas, or strategies. Unknown information remains unknown, but V2 distinguishes *what* is unknown instead of marking the entire node as unknown.

## 2. Source hierarchy

Data confidence is determined per field, not per node.

Priority order:

1. User-provided in-game screenshots from the current conversation.
2. Official Random Dice 2 store/product material from 111% and platform stores.
3. Current Random Dice 2 community screenshots and guides that can be cross-checked.
4. Legacy Random Dice material only as historical context or a hypothesis, never as Random Dice 2 fact.
5. Unverified inference is never displayed as confirmed data.

The official product description explicitly presents Random Dice 2 around customizable growth routes and strategy, so the tree planner is directly aligned with the game's intended progression system. Public search results are currently noisy and frequently return the original Random Dice instead of Random Dice 2, so screenshot-first reconstruction is mandatory.

## 3. User-provided screenshot findings

The supplied images establish a much stronger structural baseline than V1.

### 3.1 Tree topology

The game tree is a large graph centered on a main Dice Tree hub, with five major families radiating from the center. The visible family counters around the center correspond to the previously identified categories:

- Order / 질서
- Chaos / 혼돈
- Magic / 마법
- Engineering / 공학
- Nature / 자연

The graph contains:

- large square dice unlock/evolution nodes,
- small circular passive/stat nodes,
- large circular milestone nodes,
- end-cap nodes,
- branching prerequisite lines,
- high-cost late-game nodes,
- rankable stat nodes with current/max rank labels,
- some nodes whose identity is visible but detailed effect text is not.

V2 must reconstruct the graph from the screenshots rather than laying out a synthetic radial tree.

### 3.2 Visible resource system

The screenshot header clearly shows four progression-resource slots:

- blue ticket/card-like resource,
- red ticket/card-like resource,
- prism/cube-like resource,
- gold.

Until their official names are verified, internal IDs may be used while the UI displays a neutral label such as `이름 확인 중` with the actual icon. The user-facing site must not invent official currency names.

Visible node costs include multiple denominations such as 2,000, 3,000, 4,000, 5,000, 8,000, 15,000, 30,000, 50,000, and 100,000 gold, sometimes paired with another resource amount. These are image-observed values and should be captured node by node where legible instead of generalized into one pricing table.

### 3.3 Node states

The in-game screenshots visually separate:

- already acquired paths,
- currently reachable nodes,
- locked but visible nodes,
- distant unselected branches,
- invested rank progression such as `5/100`, `17/50`, `1/15`, `1/20`, and `MAX`.

V2 must reflect these distinct states. A greyed node does not automatically mean its identity is unknown.

### 3.4 Detail panel reference

The reference screenshot demonstrates a strong interaction model:

- selected node icon and name,
- rank indicator,
- node effect description,
- next rank / next effect comparison,
- prerequisite count,
- acquisition state,
- primary acquire/invest action,
- branch reset and full-tree reset controls.

V2 will adopt this information hierarchy while using an original visual design.

## 4. Data-confidence model

Each field receives a confidence state:

- `verified`: directly confirmed by a clear screenshot or reliable current source.
- `observed`: visually legible in a screenshot but not independently cross-checked.
- `partial`: identity/topology known but one or more numerical details missing.
- `inferred`: structural inference only, never used in exact calculations.
- `unknown`: no trustworthy value.

A node may therefore be `verified` for position and prerequisites, `observed` for cost, `partial` for rank count, and `unknown` for effect formula.

The interface should communicate this subtly. It must not cover the tree with large warning badges. Exact calculations simply omit unavailable fields and the detail sheet states what remains unverified.

## 5. V2 node schema

```ts
interface TreeNodeV2 {
  id: string;
  family: "order" | "chaos" | "magic" | "engineering" | "nature" | "core";
  kind: "dice" | "stat" | "milestone" | "capstone" | "connector";
  position: { x: number; y: number };
  prerequisites: string[];
  name: LocalizedField<string>;
  iconAsset?: string;
  maxRank?: SourcedField<number>;
  costsByRank?: SourcedField<ResourceCost[]>[];
  effectsByRank?: SourcedField<NodeEffect[]>[];
  affectedDice?: SourcedField<string[]>;
  tags: string[];
  sources: SourceRef[];
  fieldConfidence: Record<string, Confidence>;
}
```

The dataset is separated from rendering and optimizer logic.

## 6. Tree reconstruction workflow

V2 reconstruction is performed in passes.

### Pass A: geometry

Use the supplied full-tree screenshots to map the real center, major branch axes, square nodes, circular nodes, branch joins, and endpoints. Normalize positions to a world coordinate system so desktop and mobile render the same tree.

### Pass B: visible node metadata

Transcribe all legible visible values:

- node rank,
- max rank,
- gold cost,
- secondary resource amount,
- recognizable dice icon,
- family membership,
- prerequisite relation.

### Pass C: detailed effects

Populate exact names/effects only from node-detail screenshots or cross-verified current sources.

### Pass D: strategy annotations

Strategy tags are separate from canonical node data. Examples:

- main DPS,
- attack speed,
- bullet damage,
- economy,
- summon consistency,
- support utility,
- family-wide effect,
- single-die specialization,
- late-game capstone.

This prevents community strategy opinions from contaminating factual game data.

## 7. Recommendation engine V2

V2 recommendation is route-based and prerequisite-aware.

### 7.1 Inputs

- focus dice, including at minimum Devour/포식, Taeguk/태극, Corruption/부패 when their nodes are known,
- optional secondary dice,
- role: DPS / support / balanced,
- mode when verified,
- current resource inventory,
- already invested nodes/ranks,
- progression profile: resource-conservative / balanced / maximum-ceiling,
- optional spending preference for user convenience, but actual calculations use inventory rather than assuming that spending directly buys power.

### 7.2 Scoring

Each candidate route receives separate scores rather than one opaque number:

- direct focus-dice relevance,
- whole-deck relevance,
- marginal combat benefit,
- economy/progression benefit,
- prerequisite overhead,
- verified resource cost,
- flexibility / reuse across decks,
- confidence penalty for incomplete data.

The engine never displays exact DPS gain when the formula or effect relationship is unverified.

### 7.3 Output

The planner shows:

- best next node,
- next 5 recommended investments,
- route to selected target,
- full incremental resource cost,
- nodes affordable with current inventory,
- why each recommendation is ranked there,
- which values are exact and which are qualitative.

The previously discussed bullet-damage-versus-attack-speed comparison is supported as a dedicated comparison module only when the required formula and affected-dice scope are confirmed.

## 8. Currency and cost UX

The user can enter current inventory for all known resources. The header shows compact resource pills inspired by the game rather than generic analytics counters.

Always visible:

- current inventory,
- spent in simulation,
- remaining,
- target-route required amount,
- shortage amount.

Unknown resource names retain their observed icon and a neutral temporary label until confirmed.

## 9. Visual direction

V2 abandons the dark generic dashboard aesthetic.

### 9.1 Brand language

- warm white / pearl white primary surface,
- very light cool grey structure,
- near-black typography,
- violet/indigo as the main tree-energy accent,
- restrained gold for milestones and recommendation emphasis,
- family-specific accents used only in nodes and paths,
- custom iconography and spacing rather than stock dashboard conventions.

The target is a premium game companion site, not an AI-generated SaaS dashboard.

### 9.2 Things explicitly avoided

- heavy glassmorphism,
- excessive gradients,
- generic dark analytics cards,
- repeated rounded rectangles for every piece of information,
- random neon borders,
- large AI-style hero copy,
- decorative charts unrelated to decisions,
- generic Lucide icon overload.

### 9.3 Main desktop layout

Top navigation is a clean white bar with compact brand mark, Tree, Builds, Strategy, Share, language, and resource inventory.

The tree occupies most of the viewport. A slim contextual rail contains goal settings. Selecting a node opens a premium side sheet with the detailed progression information. Panels should feel attached to the canvas rather than partitioning the screen into three permanent dashboard columns.

### 9.4 Mobile layout

The canvas remains primary. Goal/settings and details are bottom sheets. The tree supports true pinch zoom and pan. Resource totals remain in a horizontally scrollable compact top rail.

## 10. Motion system

Motion is subtle but visible.

- route highlight draws progressively along edges,
- selected node uses a short scale and halo pulse,
- detail sheet uses spring-like slide motion,
- resource totals animate between values,
- recommended nodes receive a slow restrained orbit/highlight,
- hover raises nodes slightly on pointer devices,
- zoom transitions interpolate instead of snapping,
- all nonessential motion respects `prefers-reduced-motion`.

No continuous high-intensity animation across the whole tree.

## 11. Node appearance

Nodes should resemble collectible game tokens rather than plain SVG circles.

- dice nodes: framed square/rounded-square tile using the actual observed icon when available,
- stat nodes: compact circular token with effect glyph,
- milestone nodes: larger ringed medallion,
- locked nodes: low-contrast pearl/grey treatment, not total opacity loss,
- invested path: luminous violet line with a thin white core,
- recommended path: violet-to-gold emphasis applied only to the recommended sequence,
- selected node: crisp elevated border and short halo animation.

## 12. Search and navigation

Search indexes both Korean and English names simultaneously. Filters include family, node type, effect tag, confirmed-data level, and affected dice.

Controls:

- fit full tree,
- reset view,
- zoom,
- jump to family,
- jump to focus dice,
- route to node,
- undo/redo simulated investment.

## 13. Share and storage

Keep the login-free V1 architecture.

Share payload includes:

- invested ranks,
- current resources if user opts in,
- target dice,
- recommendation profile,
- optional route target,
- schema version.

Language is presentation-only and must not mutate semantic build state.

Local named builds remain in browser storage.

## 14. Data provenance UI

Every detail sheet exposes a small `자료` action. It shows source type and confidence without overwhelming the default screen.

Examples:

- `게임 스크린샷에서 확인`
- `현재 수치 상세 캡처 필요`
- `공개 자료와 교차 확인됨`

The planner must never imply that community guidance is official.

## 15. V2 acceptance criteria

V2 is not complete until all of the following hold:

1. Tree geometry is reconstructed from the supplied screenshots and is recognizably aligned with the game rather than V1's synthetic layout.
2. Visible screenshot-derived costs/ranks are transcribed where legible.
3. Unknown data is field-level, not whole-node blanket uncertainty.
4. At least the known central and major branch nodes are navigable.
5. Resource inventory and simulated spending support every observed resource type.
6. Recommendations are prerequisite-aware, budget-aware, confidence-aware, and explainable.
7. Korean/English presentation remains isolated from semantic build state.
8. Desktop and mobile tree navigation works with pointer/touch/pinch.
9. The new UI is white-first, custom, responsive, and does not resemble V1's generic dark dashboard.
10. Motion works and reduced-motion mode is respected.
11. Share links restore the same semantic build in a fresh browser context.
12. Unit/component tests, production build, desktop E2E, mobile E2E, console-error checks, and screenshot-based visual QA all pass before merge.

## 16. Known limitations at design freeze

The supplied full-tree screenshots are sufficient to substantially improve topology, visible ranks, and visible costs, but they do not expose exact effect descriptions for every node. V2 therefore treats the current screenshot set as the authoritative geometry baseline and continues to accept future detail-panel screenshots as incremental factual data patches.

Current public web search is especially noisy because search results frequently surface the original Random Dice. Legacy sources may help identify terminology or strategy lineage but cannot be copied into Random Dice 2 canonical data without current-game confirmation.

## 17. Implementation principle

V2 prioritizes correctness of the visible tree and confidence-aware partial coverage over pretending to have complete data. A node with a correct icon, correct location, correct cost, and unknown effect is useful. A fully populated node with invented details is not.
