# Random Dice 2 Attack Interval Static Analysis

Date: 2026-08-16
Client: 1.0.1 modified IPA
Source SHA-256: `0341bef051315f7827466d23f3e41900d06dfa3d4994c7ecc84a89f4d1e21dd8`

## Confirmed client evidence

The client data and IL2CPP metadata expose all of the following concepts:

- per-dice `AttackInterval` values in `DefenderTable`;
- per-battle-upgrade `AttackInterval_UpAdd` values for affected dice;
- family-wide and dice-specific ATK SPD percentage passives/runes;
- IL2CPP identifiers `GetAttackIntervalByRatio`, `GetFinalAttackIntervalWithRuneEffect`, and `RT_AttackInterval`.

The raw base interval is safe to expose as a client table value. For example, Predator / 포식 has `AttackInterval = 2.7` and `AttackInterval_UpAdd = -0.08`.

## What is not yet promoted to a formula

The current static evidence does not independently prove the complete ratio transformation and operation order well enough to choose among superficially plausible formulas such as:

- subtracting a percentage directly from the base interval;
- dividing the interval by `1 + speed ratio`;
- multiplying the interval by `1 - speed ratio`;
- applying a clamp or minimum interval before or after rune/passive effects.

The presence of `GetAttackIntervalByRatio` is evidence that a ratio conversion exists, but a method name is not proof of its arithmetic.

Likewise, `AttackInterval_UpAdd` is stored as a direct-looking numeric delta, but V3 does not assume when that delta is applied relative to percentage modifiers until the runtime path is sufficiently recovered.

## V3 behavior

`src/simulation/engine/attackInterval.ts` implements an evidence gate:

- raw positive base interval with no unresolved speed modifier -> verified interval and attacks/second;
- non-zero ATK SPD percentage without a verified ratio formula -> interval is `null`, confidence is `partial`;
- non-zero `AttackInterval_UpAdd` contribution while its operation order is partial -> interval is `null`, confidence is `partial`;
- a future verified implementation must be registered explicitly; the resolver intentionally throws rather than silently choosing a percentage formula.

This means the website can already display client-native base interval values while refusing to present false exact DPS for builds whose attack speed depends on unresolved percentage math.

## Promotion requirement

The attack-speed path may be promoted to `verified` only after static code-path evidence establishes:

1. ratio units and sign;
2. additive versus multiplicative stacking;
3. order relative to `AttackInterval_UpAdd`;
4. rune/passive order;
5. minimum interval or clamping behavior;
6. at least two golden examples whose expected intervals match the recovered operation sequence.

Until then, the old Random Dice / screenshot-era attack-speed assumption is not part of V3 canonical arithmetic.
