import { degreeToMidi, type ChordQuality, type Mode } from './modes.ts';
import { intoRange, pitchClass } from './pitch.ts';

export interface Chord {
  /** 1-based scale degree the chord is built on. */
  degree: number;
  quality: ChordQuality;
  /** Root in octave 3 by default. */
  rootMidi: number;
  /** Root-position tones, ascending, starting at rootMidi. */
  tones: number[];
}

function qualityOf(third: number, fifth: number): ChordQuality {
  if (third === 4 && fifth === 7) return 'maj';
  if (third === 3 && fifth === 7) return 'min';
  if (third === 3 && fifth === 6) return 'dim';
  if (third === 4 && fifth === 8) return 'aug';
  return 'sus';
}

/**
 * Stacks thirds within the mode on a degree. Quality falls out of the mode
 * rather than a hand-written table, so every mode is automatically right
 * (Freygish V is diminished, Hungarian minor V is major, and so on).
 */
export function chordOnDegree(mode: Mode, degree: number, octave = 3, size: 3 | 4 = 3): Chord {
  const root = degreeToMidi(mode, degree, octave);
  const tones = [root];
  for (let k = 1; k < size; k++) tones.push(degreeToMidi(mode, degree + 2 * k, octave));
  const third = tones[1] - root;
  const fifth = tones[2] - root;
  return { degree, quality: qualityOf(third, fifth), rootMidi: root, tones };
}

export function chordPitchClasses(chord: Chord): Set<number> {
  return new Set(chord.tones.map(pitchClass));
}

export function isChordTone(chord: Chord, midi: number): boolean {
  return chordPitchClasses(chord).has(pitchClass(midi));
}

/** Total semitone motion between two voicings of equal size, voice by voice. */
export function voicingDistance(a: readonly number[], b: readonly number[]): number {
  return a.reduce((sum, v, i) => sum + Math.abs(v - (b[i] ?? v)), 0);
}

/**
 * Picks the inversion and octave of `chord` that moves least from the previous
 * voicing while staying inside [low, high]. With no previous voicing it returns
 * a close root-position voicing inside the range.
 */
export function voiceLead(prev: readonly number[] | null, chord: Chord, low = 55, high = 76): number[] {
  const n = chord.tones.length;
  const candidates: number[][] = [];
  for (let inversion = 0; inversion < n; inversion++) {
    const rotated = chord.tones.map((t, i) => (i < inversion ? t + 12 : t)).sort((a, b) => a - b);
    for (let shift = -24; shift <= 24; shift += 12) {
      const v = rotated.map((t) => t + shift);
      if (v[0] >= low && v[n - 1] <= high) candidates.push(v);
    }
  }
  if (candidates.length === 0) {
    return chord.tones.map((t) => intoRange(t, low, high)).sort((a, b) => a - b);
  }
  if (!prev) {
    // Lowest voicing whose bottom note sits in the lower half of the range
    const mid = (low + high) / 2;
    return candidates.sort((a, b) => Math.abs(a[0] - mid + 6) - Math.abs(b[0] - mid + 6))[0];
  }
  return candidates.sort((a, b) => voicingDistance(prev, a) - voicingDistance(prev, b))[0];
}
