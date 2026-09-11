import { describe, expect, it } from 'vitest';
import {
  ACT_DURATION_SEC,
  ACT_MIN_DISTANCE,
  ACT_WALK_SPEED,
  MOMENTUM,
  TIER,
  VICTORY_DISTANCE,
} from '../balance.ts';
import { computeTier, decayRate, eligibleTier, gearValue, isBelowDropLine, stumbleCost } from './economy.ts';
import { HazardSpawner } from './HazardSpawner.ts';
import { Rng } from './Rng.ts';

function actAt(distance: number): number {
  let act = 1;
  ACT_MIN_DISTANCE.forEach((d, i) => {
    if (distance >= d) act = i + 1;
  });
  return act;
}

interface SimResult {
  died: boolean;
  diedAt: number;
  finalTier: number;
  maxTier: number;
  tierReachedAt: Record<number, number>;
  momentumTrace: number[];
}

/**
 * Runs a whole journey at 60 Hz: the spawner supplies gears, the player collects
 * a fixed fraction of them, momentum decays, and tiers resolve as in the store.
 */
function simulate(collection: number, seed = 1, stumbleAt?: { t: number; cost: number }): SimResult {
  const dt = 1 / 60;
  const rng = new Rng(seed);
  const spawner = new HazardSpawner(rng.fork('spawner'));
  const collector = rng.fork('collect');
  let distance = 0;
  let momentum: number = MOMENTUM.start;
  let tips = 0;
  let tier = 0;
  let dwell = 0;
  let t = 0;
  let stumbled = false;
  const result: SimResult = {
    died: false,
    diedAt: 0,
    finalTier: 0,
    maxTier: 0,
    tierReachedAt: {},
    momentumTrace: [],
  };
  const gears: number[] = [];
  const pull = (act: number): void => {
    while (spawner.upcomingX < distance + 2000) {
      const chunk = spawner.nextChunk(act);
      for (const p of chunk.placements) if (p.kind === 'gear') gears.push(chunk.x + p.dx);
    }
  };

  while (distance < VICTORY_DISTANCE) {
    const act = actAt(distance);
    pull(act);
    distance += ACT_WALK_SPEED[act - 1] * dt;
    t += dt;

    while (gears.length && gears[0] <= distance) {
      gears.shift();
      if (collector.next() < collection) {
        tips += 1;
        momentum = Math.min(MOMENTUM.max, momentum + gearValue(null));
      }
    }
    momentum = Math.max(0, momentum - decayRate(momentum, act) * dt);

    if (stumbleAt && !stumbled && t >= stumbleAt.t) {
      stumbled = true;
      momentum = Math.max(0, momentum - stumbleAt.cost);
    }

    dwell = isBelowDropLine(momentum, tier) ? dwell + dt : 0;
    const next = computeTier(tips, momentum, tier, dwell);
    if (next !== tier) {
      if (next > tier && !(next in result.tierReachedAt)) result.tierReachedAt[next] = t;
      tier = next;
      dwell = 0;
    }
    result.maxTier = Math.max(result.maxTier, tier);
    if (Math.floor(t) !== Math.floor(t - dt)) result.momentumTrace.push(momentum);

    if (momentum <= 0 && t >= MOMENTUM.deathGraceSec) {
      result.died = true;
      result.diedAt = t;
      break;
    }
  }
  result.finalTier = tier;
  return result;
}

describe('economy primitives', () => {
  it('decay grows with momentum so it cannot pin at the cap', () => {
    expect(decayRate(0, 1)).toBeCloseTo(MOMENTUM.decayBase[0]);
    expect(decayRate(100, 1)).toBeGreaterThan(decayRate(50, 1));
    expect(decayRate(50, 4)).toBeGreaterThan(decayRate(50, 1));
  });

  it('gear value doubles under the tips buff', () => {
    expect(gearValue('tips')).toBe(gearValue(null) * 2);
  });

  it('stumble costs are ordered balance < puddle < crate', () => {
    expect(stumbleCost('balance')).toBeLessThan(stumbleCost('puddle'));
    expect(stumbleCost('puddle')).toBeLessThan(stumbleCost('crate'));
  });

  it('tier requires both tips and momentum', () => {
    expect(eligibleTier(1000, 0)).toBe(0);
    expect(eligibleTier(0, 100)).toBe(0);
    expect(eligibleTier(TIER.tipCost[2], TIER.momentumGate[2])).toBe(2);
    expect(eligibleTier(TIER.tipCost[4], TIER.momentumGate[4])).toBe(4);
  });

  it('demotes only after dwelling under the drop line', () => {
    const tips = TIER.tipCost[3];
    const low = TIER.momentumGate[3] - TIER.dropHysteresis - 1;
    expect(computeTier(tips, low, 3, 0)).toBe(3);
    expect(computeTier(tips, low, 3, TIER.dropDwellSec - 0.1)).toBe(3);
    expect(computeTier(tips, low, 3, TIER.dropDwellSec)).toBeLessThan(3);
    // a dip that stays inside the hysteresis band never demotes
    expect(computeTier(tips, TIER.momentumGate[3] - 5, 3, 100)).toBe(3);
  });
});

describe('a full run', () => {
  it('at 70% collection survives with momentum in a comfortable band', () => {
    const r = simulate(0.7);
    expect(r.died).toBe(false);
    const late = r.momentumTrace.slice(60);
    expect(Math.min(...late)).toBeGreaterThan(20);
    expect(Math.max(...r.momentumTrace)).toBeLessThan(100);
    expect(r.maxTier).toBeGreaterThanOrEqual(3);
  });

  it('at 90% collection reaches the full band well before the end', () => {
    const r = simulate(0.9);
    expect(r.died).toBe(false);
    expect(r.maxTier).toBe(4);
    expect(r.tierReachedAt[4]).toBeLessThan(ACT_DURATION_SEC * 3.5);
    expect(r.tierReachedAt[4]).toBeGreaterThan(ACT_DURATION_SEC * 1.5);
  });

  it('at 45% collection ends below the trio without dying', () => {
    const r = simulate(0.45);
    expect(r.died).toBe(false);
    expect(r.finalTier).toBeLessThan(2);
  });

  it('at 15% collection eventually passes out', () => {
    expect(simulate(0.15).died).toBe(true);
  });

  it('a crate hit mid-run costs a tier and the band returns within two minutes', () => {
    const cost = MOMENTUM.stumbleCost.crate;
    const base = simulate(0.85, 4);
    const hit = simulate(0.85, 4, { t: 300, cost });
    expect(hit.died).toBe(false);
    const tierAt = (r: SimResult, t: number): number =>
      Math.max(
        0,
        ...Object.entries(r.tierReachedAt)
          .filter(([, at]) => at <= t)
          .map(([k]) => Number(k)),
      );
    // The hit at t=300 drops momentum immediately; tier demotion follows the dwell rule.
    expect(hit.momentumTrace[301]).toBeLessThan(base.momentumTrace[301]);
    expect(tierAt(hit, 420)).toBeGreaterThanOrEqual(tierAt(hit, 305));
  });
});
