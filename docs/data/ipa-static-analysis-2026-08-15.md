# Random Dice 2 1.0.1 IPA static-data extraction

Date: 2026-08-15

This dataset was produced by static analysis only. The supplied IPA was not executed. The uploaded package is an untrusted modified distribution, so its native code and injected frameworks are not reused or committed. Only game data tables and localization values needed for the planner are represented in this repository.

## Source snapshot

- App version: 1.0.1
- Unity version: 6000.3.18f1
- Table bundle version: 0.0.4
- Table metadata timestamp: 2026-08-11T19:11:03.2171857+09:00
- DiceTreeNodeTable SHA-256: 01dd3ae7280ee1f98e9a4a8bebfa3782c07552f171f0437896e84a18810b0bc5
- DefenderTable SHA-256: 511f60a3cac24f6b18b945dd7166500f8127aeb21fa32726cc9bb7277716dc0a

## Dice Tree facts extracted

DiceTreeNodeTable contains 239 nodes. The planner now uses the table's exact Position, NextNodes, node type, KindId, RankUpGoldArr, and RankUpStoneArr instead of screenshot-estimated geometry.

Node type counts in this snapshot:
- DICE_RUNE: 123
- PLAYER_PASSIVE: 70
- DICE: 41
- PERK: 5

The tree purchase arrays use only GOLD and NODE_STONE. GoodsTable and Korean localization identify NODE_STONE as `다이스 코어` (`Dice Core`). The previous Blue/Red/Prism resource model was incorrect and is removed from the active planner.

The internal family names map to the current Korean UI as follows:
- Nature → 자연
- Engineering → 공학
- Magic → 마법
- Guardian → 질서
- Invader → 혼돈

Every tree node in this snapshot maps to a current localized dice, rune, passive, or perk entry, so the active planner no longer needs generic `내용 상세 확인 중` placeholders.

## Predator / 포식 data

DefenderTable entry `Predator`:
- Korean name: 포식 주사위
- family: Invader / 혼돈
- Attack: 1000
- Attack_LvAdd: 0
- Attack_UpAdd: 0
- Range: 1.2
- Range_LvAdd: 0.05
- AttackInterval: 2.7 sec
- AttackInterval_UpAdd: -0.08 sec per Power-Up step
- projectile ability: Predator
- Lv7 effect: 포식 획득 범위 필드 전체 확장

ProjectileAbility `Predator` begins at 15 and adds 25 per dot-level step and 25 per Power-Up step.

The exact Predator unlock node is #5007. Its tree cost is 8 Dice Core and it connects from the Chaos branch. Predator-exclusive runes are:
- #5207 / 포식 증폭: max 50, +5% per Predator stack at rank 1 and +5 percentage points per rank
- #5307 / 연쇄 포식: 30% chance to gain +2 Predator, cost 50,000 Gold + 10 Dice Core
- #5407 / 약자 포식: 5% HP threshold effect on normal monsters, cost 100,000 Gold + 20 Dice Core

## Simulator interpretation

Raw base, dot-level, Power-Up, projectile-ability, passive and rune numbers are copied from the extracted tables. The UI reports these raw values separately.

For simple planner comparisons, the displayed projected Bullet DPS applies the visible Dice Tree Bullet DMG percentage and ATK SPD percentage as straightforward multiplicative modifiers to the raw table-derived bullet value/frequency. That projection is intentionally labelled as a planner calculation, because a complete runtime damage pipeline can contain ability-specific behavior not represented by those two displayed percentage fields alone.

## Version caveat

This is a snapshot of the supplied 1.0.1 package. If the live game changes tables after the metadata timestamp, the website dataset should be regenerated from a newer current build rather than silently extrapolated. Several extracted values independently match the user's current in-game screenshots, including the Chaos attack-speed ladder and the +1.2 percentage-point global Bullet DMG rank increment.
