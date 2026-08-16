import {
  getDiceDefinition,
  getPassiveDefinition,
  getTreeNode,
  rd2Constants,
  rd2ProjectileAbilities,
  type RD2Family,
  valueAtRank,
} from "../game-data/rd2Extracted";

export interface DiceSimulationOptions {
  /** Dice dot/level shown in battle. The table has LvAdd fields and Lv7 descriptions. */
  level: number;
  /** In-match Power-Up stage, 1-based. */
  powerUp: number;
  /** Optional persistent Dice Tree ranks by node id. */
  treeRanks?: Record<number, number>;
}

export interface TreeCombatBonuses {
  flatBulletDamage: number;
  bulletDamagePercent: number;
  attackSpeedPercent: number;
  critChancePercent: number;
  critDamagePercent: number;
}

export interface DiceSimulationResult {
  diceType: string;
  level: number;
  powerUp: number;
  attack: number;
  range: number;
  attackInterval: number;
  attacksPerSecond: number;
  bossDamagePercent: number;
  cooldown: number;
  projectileAbility?: {
    id: string;
    value: number;
    duration: number;
    range: number;
    stackMax: number;
    label: { ko: string; en: string };
  };
  treeBonuses: TreeCombatBonuses;
  projectedBulletDamage: number;
  projectedAttacksPerSecond: number;
  projectedBulletDps: number;
  baseCritChancePercent: number;
  baseCritDamagePercent: number;
}

function clampInteger(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function appliesToDice(passiveGroup: string, diceGroup: string) {
  return !passiveGroup || passiveGroup === "None" || passiveGroup === diceGroup;
}

function aggregateTreeBonuses(diceType: string, treeRanks: Record<number, number> = {}): TreeCombatBonuses {
  const dice = getDiceDefinition(diceType);
  const totals: TreeCombatBonuses = {
    flatBulletDamage: 0,
    bulletDamagePercent: 0,
    attackSpeedPercent: 0,
    critChancePercent: 0,
    critDamagePercent: 0,
  };

  for (const [rawId, rawRank] of Object.entries(treeRanks)) {
    const rank = Math.max(0, Math.floor(rawRank));
    if (rank <= 0) continue;
    const node = getTreeNode(Number(rawId));
    if (!node || node.nodeType !== "PLAYER_PASSIVE") continue;
    const passive = getPassiveDefinition(node);
    if (!passive || !appliesToDice(passive.groupInternal, dice.groupInternal)) continue;
    const value = valueAtRank(passive.value, passive.valueRankAdd, Math.min(rank, node.maxRank));
    const kind = passive.kind;

    if (kind === "DiceAttackUp") totals.flatBulletDamage += value;
    else if (/^DiceAttackUpPer/.test(kind) || /AttackUpPer/.test(kind)) totals.bulletDamagePercent += value;
    else if (/AtkSpeedUpPer/.test(kind)) totals.attackSpeedPercent += value;
    else if (/CritPerUpPer/.test(kind)) totals.critChancePercent += value;
    else if (/CritDmgUpPer/.test(kind)) totals.critDamagePercent += value;
  }

  return totals;
}

export function simulateDiceStats(diceType: string, options: DiceSimulationOptions): DiceSimulationResult {
  const dice = getDiceDefinition(diceType);
  const level = clampInteger(options.level, 1, 7);
  const powerUp = clampInteger(options.powerUp, 1, rd2Constants.defenderUpgradeCosts.length + 1);

  const levelSteps = level - 1;
  const powerSteps = powerUp - 1;

  const attack = Math.max(0, dice.attack + dice.attackLevelAdd * levelSteps + dice.attackUpgradeAdd * powerSteps);
  const range = Math.max(0, dice.range + dice.rangeLevelAdd * levelSteps + dice.rangeUpgradeAdd * powerSteps);
  const attackInterval = Math.max(0.01, dice.attackInterval + dice.attackIntervalUpgradeAdd * powerSteps);
  const attacksPerSecond = dice.attackType === "None" || attackInterval <= 0 ? 0 : 1 / attackInterval;
  const bossDamagePercent = Math.max(0, dice.bossAttackPercent + dice.bossAttackPercentUpgradeAdd * powerSteps);
  const cooldown = Math.max(0, dice.cooldown + dice.cooldownLevelAdd * levelSteps);

  const projectile = dice.projectileAbilityId
    ? rd2ProjectileAbilities.find((ability) => ability.id === dice.projectileAbilityId)
    : undefined;
  const projectileAbility = projectile ? {
    id: projectile.id,
    value: projectile.value + projectile.valueLevelAdd * levelSteps + projectile.valueUpgradeAdd * powerSteps,
    duration: projectile.duration + projectile.durationLevelAdd * levelSteps + projectile.durationUpgradeAdd * powerSteps,
    range: projectile.range + projectile.rangeLevelAdd * levelSteps + projectile.rangeUpgradeAdd * powerSteps,
    stackMax: projectile.stackMax + projectile.stackMaxLevelAdd * levelSteps + projectile.stackMaxUpgradeAdd * powerSteps,
    label: projectile.valueLabel,
  } : undefined;

  const treeBonuses = aggregateTreeBonuses(diceType, options.treeRanks);
  // Dice Tree descriptions explicitly call these Bullet DMG / ATK SPD percentage bonuses.
  // We expose the raw bonuses separately and use the straightforward percentage model only for the planner projection.
  const projectedBulletDamage = (attack + treeBonuses.flatBulletDamage) * (1 + treeBonuses.bulletDamagePercent / 100);
  const projectedAttacksPerSecond = attacksPerSecond * (1 + treeBonuses.attackSpeedPercent / 100);
  const projectedBulletDps = projectedBulletDamage * projectedAttacksPerSecond;

  return {
    diceType,
    level,
    powerUp,
    attack,
    range,
    attackInterval,
    attacksPerSecond,
    bossDamagePercent,
    cooldown,
    projectileAbility,
    treeBonuses,
    projectedBulletDamage,
    projectedAttacksPerSecond,
    projectedBulletDps,
    baseCritChancePercent: rd2Constants.playerCritPercent + treeBonuses.critChancePercent,
    baseCritDamagePercent: rd2Constants.playerCritDamagePercent + treeBonuses.critDamagePercent,
  };
}
