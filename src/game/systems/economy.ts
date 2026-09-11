import { MOMENTUM, TIER, type StumbleCause } from '../balance.ts';

type BuffLike = 'tips' | 'balance' | 'steam' | 'shield' | null;

/** Momentum lost per second at a given level in a given act. */
export function decayRate(momentum: number, act: number): number {
  const base = MOMENTUM.decayBase[act - 1] ?? MOMENTUM.decayBase[0];
  return base + MOMENTUM.decayProportional * momentum;
}

/** Momentum gained per gear, doubled under the tips buff. */
export function gearValue(activeBuff: BuffLike): number {
  return MOMENTUM.gearValue * (activeBuff === 'tips' ? MOMENTUM.tipsBuffMultiplier : 1);
}

export function stumbleCost(cause: StumbleCause): number {
  return MOMENTUM.stumbleCost[cause];
}

/** Highest tier whose tip and momentum requirements are both met right now. */
export function eligibleTier(tips: number, momentum: number): number {
  let tier = 0;
  for (let t = 0; t < TIER.tipCost.length; t++) {
    if (tips >= TIER.tipCost[t] && momentum >= TIER.momentumGate[t]) tier = t;
  }
  return tier;
}

/** True when momentum is far enough under the tier's gate that the drop clock should run. */
export function isBelowDropLine(momentum: number, tier: number): boolean {
  if (tier <= 0) return false;
  return momentum < TIER.momentumGate[tier] - TIER.dropHysteresis;
}

/**
 * Resolves the tier for this frame. Promotion is immediate; demotion requires
 * momentum to sit under the drop line for TIER.dropDwellSec, tracked by the
 * caller as `dwellBelowSec`.
 */
export function computeTier(tips: number, momentum: number, prevTier: number, dwellBelowSec: number): number {
  const eligible = eligibleTier(tips, momentum);
  if (eligible >= prevTier) return eligible;
  if (isBelowDropLine(momentum, prevTier) && dwellBelowSec >= TIER.dropDwellSec) {
    return eligible;
  }
  return prevTier;
}
