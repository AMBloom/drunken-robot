import type { Rng } from '../../util/Rng.ts';
import { groupOfStep, stepStrength, type Meter } from '../theory/meter.ts';
import type { NoteEvent, PercEvent } from './types.ts';

/** Approximate normal deviate via the sum of three uniforms. */
export function gauss(rng: Rng): number {
  return (rng.next() + rng.next() + rng.next() - 1.5) * 2;
}

export const HUMANIZE = {
  timingJitterSec: 0.006,
  velocityJitter: 0.08,
  /** Long groups in aksak meters land a touch late; waltz beat 2 leans early. */
  longGroupLateSec: 0.008,
  waltzSecondBeatEarlySec: 0.006,
  accentWeight: { downbeat: 1.0, strong: 0.92, weak: 0.8 } as const,
} as const;

/** Meter feel offset in seconds for a step, before random jitter. */
export function feelOffset(meter: Meter, step: number): number {
  const g = groupOfStep(meter, step);
  if (meter.name === '3/4' && step === 2) return -HUMANIZE.waltzSecondBeatEarlySec;
  if (g.length === 3 && g.offset === 0 && step !== 0) return HUMANIZE.longGroupLateSec;
  return 0;
}

/** Applies accent shaping, meter feel, and small random jitter in place. */
export function humanizeNotes(notes: NoteEvent[], meter: Meter, rng: Rng, feel = true): NoteEvent[] {
  for (const n of notes) {
    const weight = HUMANIZE.accentWeight[stepStrength(meter, n.step)];
    n.velocity = clamp(n.velocity * weight * (1 + gauss(rng) * HUMANIZE.velocityJitter), 0.05, 1);
    n.offsetSec += (feel ? feelOffset(meter, n.step) : 0) + gauss(rng) * HUMANIZE.timingJitterSec;
  }
  return notes;
}

export function humanizePerc(hits: PercEvent[], meter: Meter, rng: Rng): PercEvent[] {
  for (const h of hits) {
    h.velocity = clamp(h.velocity * (1 + gauss(rng) * HUMANIZE.velocityJitter), 0.05, 1);
    h.offsetSec += feelOffset(meter, h.step) + gauss(rng) * HUMANIZE.timingJitterSec * 0.6;
  }
  return hits;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
