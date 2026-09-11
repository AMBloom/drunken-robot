import { BUFFS, SWAY } from '../balance.ts';
import type { Rng } from './Rng.ts';

/**
 * Seeded 1-D gradient noise in [-1, 1] with cubic interpolation, so the sway is
 * smooth but never periodic: the player cannot memorise a counter-steer rhythm.
 */
export function noise1d(seed: number): (t: number) => number {
  const gradient = (i: number): number => {
    let h = (i * 374761393 + seed * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return ((h >>> 0) / 4294967296) * 2 - 1;
  };
  return (t: number): number => {
    const i0 = Math.floor(t);
    const f = t - i0;
    const g0 = gradient(i0);
    const g1 = gradient(i0 + 1);
    const s = f * f * (3 - 2 * f);
    const v0 = g0 * f;
    const v1 = g1 * (f - 1);
    // Scale so the envelope reaches roughly +-1
    return (v0 + (v1 - v0) * s) * 2;
  };
}

export class SwayModel {
  private readonly slow: (t: number) => number;
  private readonly fast: (t: number) => number;

  constructor(seed: number) {
    this.slow = noise1d(seed);
    this.fast = noise1d(seed ^ 0x5bd1e995);
  }

  /** Natural drunken torque at time t (seconds) in the given act. */
  torque(t: number, act: number): number {
    const amp = SWAY.amplitude[act - 1] ?? SWAY.amplitude[0];
    return (
      amp *
      (SWAY.slowWeight * this.slow(t * SWAY.slowRate) + SWAY.fastWeight * this.fast(t * SWAY.fastRate + 37))
    );
  }
}

export interface GustEvent {
  kind: 'warning' | 'impulse';
  direction: 'left' | 'right';
  /** For warnings: seconds until the gust lands. For impulses: the angular-velocity kick (signed). */
  value: number;
}

/**
 * Schedules random gusts: a telegraphed warning, then an angular-velocity kick.
 * Deterministic for a given Rng stream.
 */
export class GustScheduler {
  private timeToNext: number;
  private pendingDirection: 'left' | 'right' = 'right';
  private pendingMagnitude = 0;
  private warned = false;
  private readonly rng: Rng;

  constructor(rng: Rng, act = 1) {
    this.rng = rng;
    this.timeToNext = this.rollInterval(act);
  }

  private rollInterval(act: number): number {
    const mean = SWAY.gustIntervalSec[act - 1] ?? SWAY.gustIntervalSec[0];
    return mean * (1 + this.rng.float(-SWAY.gustJitter, SWAY.gustJitter));
  }

  /** Advances the clock and returns any events that fired this step. */
  update(dt: number, act: number, balanceBuffActive: boolean): GustEvent[] {
    const events: GustEvent[] = [];
    this.timeToNext -= dt;

    if (!this.warned && this.timeToNext <= SWAY.gustWarningSec) {
      this.warned = true;
      this.pendingDirection = this.rng.sign() > 0 ? 'right' : 'left';
      const amp = SWAY.amplitude[act - 1] ?? SWAY.amplitude[0];
      let magnitude = this.rng.float(SWAY.gustImpulse[0], SWAY.gustImpulse[1]) * (amp / 1.8);
      if (balanceBuffActive) magnitude *= BUFFS.balance.gustMul;
      this.pendingMagnitude = magnitude;
      events.push({ kind: 'warning', direction: this.pendingDirection, value: Math.max(0, this.timeToNext) });
    }

    if (this.timeToNext <= 0) {
      const signed = this.pendingDirection === 'right' ? this.pendingMagnitude : -this.pendingMagnitude;
      events.push({ kind: 'impulse', direction: this.pendingDirection, value: signed });
      this.warned = false;
      this.timeToNext = this.rollInterval(act);
    }

    return events;
  }
}
