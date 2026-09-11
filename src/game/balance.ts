/**
 * Every gameplay tunable in one place. Arrays are indexed by act - 1.
 * Nothing here imports Phaser or Tone so tests can simulate the economy.
 */

export const ACT_COUNT = 5;
export const ACT_DURATION_SEC = 120;

/** Forward walk speed per act, px/s. The robot walks a little faster each act. */
export const ACT_WALK_SPEED = [180, 190, 200, 215, 230] as const;

/** Distance at which each act begins: each act lasts ACT_DURATION_SEC at its speed. */
export const ACT_MIN_DISTANCE: readonly number[] = ACT_WALK_SPEED.reduce<number[]>((acc, speed, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + ACT_WALK_SPEED[i - 1] * ACT_DURATION_SEC);
  void speed;
  return acc;
}, []);

export const VICTORY_DISTANCE =
  ACT_MIN_DISTANCE[ACT_COUNT - 1] + ACT_WALK_SPEED[ACT_COUNT - 1] * ACT_DURATION_SEC;

/** Display only: 60 px reads as one metre. */
export const METERS_PER_PX = 1 / 60;

export const MOMENTUM = {
  start: 40,
  max: 100,
  /** Base decay per second, per act. */
  decayBase: [0.7, 0.85, 1.0, 1.1, 1.0] as const,
  /**
   * Extra decay per second per point of momentum. This is what stops momentum
   * pinning at 100: income and decay meet at an equilibrium that depends on
   * how many gears the player collects.
   */
  decayProportional: 0.015,
  gearValue: 3,
  tipsBuffMultiplier: 2,
  stumbleCost: { balance: 8, puddle: 10, crate: 15 } as const,
  /** No death before this much run time, so a bad first seconds is survivable. */
  deathGraceSec: 10,
  /** HUD pulses below this. */
  dangerThreshold: 15,
} as const;

export type StumbleCause = keyof typeof MOMENTUM.stumbleCost;

export const TIER = {
  /** Cumulative tips needed to reach each tier. Tips are never spent. */
  tipCost: [0, 20, 60, 130, 240] as const,
  /** Current momentum needed to hold each tier. */
  momentumGate: [0, 25, 40, 55, 70] as const,
  /** A tier is lost only after momentum sits this far under its gate... */
  dropHysteresis: 10,
  /** ...for this long, so a brief dip does not silence an instrument. */
  dropDwellSec: 2,
} as const;

export const SPAWN = {
  /** No hazards in the first stretch of a run. */
  firstHazardPx: 900,
  /** Gap between chunk starts, [min, max] per act, px. */
  chunkSpacing: [
    [340, 460],
    [340, 470],
    [340, 470],
    [300, 420],
    [340, 480],
  ] as const,
  /** Chance a chunk carries a hazard at all, per act. */
  hazardChance: [0.55, 0.65, 0.75, 0.85, 0.7] as const,
  /** Sum of pattern difficulty scores allowed inside any 1000 px window. */
  maxDifficultyPer1000: 5,
  /** Any pattern with this score is always followed by a rest chunk. */
  restAfterScore: 3,
  powerupMinGapPx: 1600,
  powerupChance: 0.5,
  /** Weights for tips, balance, steam, shield per act. */
  powerupWeights: [
    { tips: 5, balance: 2, steam: 2, shield: 1 },
    { tips: 4, balance: 3, steam: 2, shield: 2 },
    { tips: 3, balance: 3, steam: 3, shield: 2 },
    { tips: 2, balance: 3, steam: 2, shield: 3 },
    { tips: 4, balance: 2, steam: 3, shield: 1 },
  ] as const,
} as const;

export const SWAY = {
  /** Torque amplitude per act. */
  amplitude: [1.0, 1.4, 1.8, 2.3, 2.0] as const,
  /** Stability threshold (radians) per act; past it the robot stumbles. */
  stabilityThreshold: [0.55, 0.5, 0.45, 0.4, 0.35] as const,
  /** Two noise octaves: slow lean and quicker jitter. */
  slowRate: 0.35,
  fastRate: 1.1,
  slowWeight: 0.6,
  fastWeight: 0.4,
  /** Mean seconds between gusts per act, jittered by gustJitter. */
  gustIntervalSec: [9, 8, 7, 5.5, 6] as const,
  gustJitter: 0.4,
  /** Angular-velocity kick range, scaled by act amplitude / 1.8. */
  gustImpulse: [0.9, 1.6] as const,
  /** Warning lead time before a gust lands. */
  gustWarningSec: 0.4,
} as const;

export const BUFFS = {
  tips: { duration: 10, magnetRadius: 90 },
  balance: { duration: 10, thresholdMul: 1.5, gustMul: 0.5 },
  steam: { duration: 8, jumpMul: 1.6 },
  shield: { charges: 1 },
} as const;
