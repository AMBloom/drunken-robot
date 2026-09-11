import { describe, expect, it } from 'vitest';
import { SWAY } from '../balance.ts';
import { Rng } from './Rng.ts';
import { GustScheduler, SwayModel, noise1d } from './sway.ts';

describe('noise1d', () => {
  it('stays within [-1, 1] and is continuous', () => {
    const n = noise1d(11);
    let prev = n(0);
    let min = Infinity;
    let max = -Infinity;
    let maxJump = 0;
    for (let t = 0; t < 200; t += 0.001) {
      const v = n(t);
      min = Math.min(min, v);
      max = Math.max(max, v);
      maxJump = Math.max(maxJump, Math.abs(v - prev));
      prev = v;
    }
    expect(min).toBeGreaterThanOrEqual(-1);
    expect(max).toBeLessThanOrEqual(1);
    expect(maxJump).toBeLessThan(0.02);
  });

  it('is deterministic per seed', () => {
    expect(noise1d(3)(12.34)).toBe(noise1d(3)(12.34));
    expect(noise1d(3)(12.34)).not.toBe(noise1d(4)(12.34));
  });

  it('is not periodic like the old sine sway', () => {
    const n = noise1d(8);
    const period = (2 * Math.PI) / 3.2;
    const diffs = [];
    for (let k = 1; k <= 20; k++) diffs.push(Math.abs(n(k * period) - n(0)));
    expect(Math.max(...diffs)).toBeGreaterThan(0.2);
  });
});

describe('SwayModel', () => {
  it('scales with act amplitude', () => {
    const m = new SwayModel(1);
    const rms = (act: number): number => {
      let s = 0;
      const N = 5000;
      for (let i = 0; i < N; i++) s += m.torque(i * 0.02, act) ** 2;
      return Math.sqrt(s / N);
    };
    expect(rms(5)).toBeGreaterThan(rms(1) * 1.5);
  });
});

describe('GustScheduler', () => {
  it('warns before every impulse and respects the interval bounds', () => {
    const g = new GustScheduler(new Rng(21), 1);
    const dt = 1 / 60;
    let t = 0;
    let lastImpulse = 0;
    let warningsSinceImpulse = 0;
    const intervals: number[] = [];
    while (t < 300) {
      for (const e of g.update(dt, 1, false)) {
        if (e.kind === 'warning') {
          warningsSinceImpulse += 1;
          expect(e.value).toBeLessThanOrEqual(SWAY.gustWarningSec + dt);
        } else {
          expect(warningsSinceImpulse).toBe(1);
          warningsSinceImpulse = 0;
          if (lastImpulse > 0) intervals.push(t - lastImpulse);
          lastImpulse = t;
        }
      }
      t += dt;
    }
    const mean = SWAY.gustIntervalSec[0];
    expect(intervals.length).toBeGreaterThan(20);
    for (const i of intervals) {
      expect(i).toBeGreaterThan(mean * (1 - SWAY.gustJitter) - dt * 2);
      expect(i).toBeLessThan(mean * (1 + SWAY.gustJitter) + dt * 2);
    }
  });

  it('halves gust magnitude under the balance buff', () => {
    const collect = (buff: boolean): number[] => {
      const g = new GustScheduler(new Rng(5), 3);
      const out: number[] = [];
      for (let i = 0; i < 60 * 120; i++) {
        for (const e of g.update(1 / 60, 3, buff)) if (e.kind === 'impulse') out.push(Math.abs(e.value));
      }
      return out;
    };
    const plain = collect(false);
    const buffed = collect(true);
    expect(buffed.length).toBe(plain.length);
    buffed.forEach((v, i) => expect(v).toBeCloseTo(plain[i] * 0.5, 6));
  });
});
