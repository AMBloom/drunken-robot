import type { Chord } from '../theory/chords.ts';
import { isOffbeat, groupOfStep, type Meter } from '../theory/meter.ts';
import { stepInMode, type Mode } from '../theory/modes.ts';
import { intoRange } from '../theory/pitch.ts';
import type { NoteEvent, PercEvent } from './types.ts';

const BASS_LOW = 36; // C2
const BASS_HIGH = 50; // D3

/**
 * Upright bass: root on the downbeat, alternating root and fifth on the
 * other group starts (the oom of oom-pah), and a walking approach note on
 * the final step when the next bar changes chord.
 */
export function bassPattern(
  meter: Meter,
  mode: Mode,
  chord: Chord,
  nextChord: Chord,
  energy: number,
): NoteEvent[] {
  const root = intoRange(chord.rootMidi, BASS_LOW, BASS_HIGH);
  const fifth = intoRange(chord.tones[2], BASS_LOW, BASS_HIGH);
  const notes: NoteEvent[] = [];
  meter.accents.forEach((step, i) => {
    const length = meter.groups[i];
    const midi = i % 2 === 0 ? root : fifth;
    notes.push({
      step,
      offsetSec: 0,
      midi,
      durSteps: Math.max(1, length - 1),
      velocity: i === 0 ? 0.95 : 0.85,
    });
  });
  if (nextChord.degree !== chord.degree && energy > 0.3) {
    const target = intoRange(nextChord.rootMidi, BASS_LOW, BASS_HIGH);
    const approach = stepInMode(mode, target, -1);
    notes.push({ step: meter.steps - 1, offsetSec: 0, midi: approach, durSteps: 1, velocity: 0.7 });
  }
  return notes;
}

/** Offbeat chord comping (the pah): every non-accent step gets the voicing. */
export function compPattern(meter: Meter, voicing: readonly number[], energy: number): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const skipEvery = energy < 0.35 ? 2 : 1; // thin out when the band is tired
  let k = 0;
  for (let step = 0; step < meter.steps; step++) {
    if (!isOffbeat(meter, step)) continue;
    k += 1;
    if (k % skipEvery !== 0) continue;
    for (const midi of voicing) {
      notes.push({ step, offsetSec: 0, midi, durSteps: 1, velocity: 0.62 });
    }
  }
  return notes;
}

/** Guitar strums: rasgueado on the downbeat, stabs on later group starts, an upstroke turnaround. */
export function strumPattern(
  meter: Meter,
  energy: number,
): Array<{ step: number; direction: 'down' | 'up'; velocity: number }> {
  const strums: Array<{ step: number; direction: 'down' | 'up'; velocity: number }> = [];
  meter.accents.forEach((step, i) => {
    strums.push({ step, direction: 'down', velocity: i === 0 ? 0.9 : 0.72 });
  });
  if (energy > 0.45) strums.push({ step: meter.steps - 1, direction: 'up', velocity: 0.6 });
  return strums;
}

export interface PercOptions {
  energy: number;
  tambourine: boolean;
  doubleTime: boolean;
}

/**
 * Street percussion cells. Stomps on the downbeat (and beat 3 in 4/4),
 * castanets on later group starts with an anticipation click inside long
 * groups, shaker on weak steps only when the band has energy, and a
 * tambourine jingle on accents when the tambourine layer is on.
 */
export function percPattern(meter: Meter, opts: PercOptions): PercEvent[] {
  const hits: PercEvent[] = [];
  const push = (step: number, hit: PercEvent['hit'], velocity: number): void => {
    hits.push({ step, offsetSec: 0, hit, velocity });
  };
  for (let step = 0; step < meter.steps; step++) {
    const g = groupOfStep(meter, step);
    const isAccent = g.offset === 0;
    if (step === 0 || (meter.name === '4/4' && step === 4)) push(step, 'stomp', 0.95);
    if (isAccent && step !== 0) push(step, 'castanet', 0.85);
    if (g.length === 3 && g.offset === 2) push(step, 'castanet', 0.55);
    if (!isAccent && opts.energy > 0.5) push(step, 'shaker', 0.3 + opts.energy * 0.3);
    if (isAccent && opts.tambourine) push(step, 'jingle', 0.6);
    if (opts.doubleTime && !isAccent) push(step, 'castanet', 0.5);
  }
  return hits;
}
