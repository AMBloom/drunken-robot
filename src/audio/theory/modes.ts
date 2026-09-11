import { ROOT_D4, pitchClass } from './pitch.ts';

/**
 * The modes the engine composes in. All rooted on D so acts modulate by
 * colour rather than key: Freygish (Phrygian dominant) for the tavern,
 * harmonic minor for the canals, Misheberakh for the market, Hungarian
 * minor for the noir act, and D major for the sunrise friss.
 */
export type ModeName = 'D_FREYGISH' | 'D_HARMONIC_MINOR' | 'D_MISHEBERAKH' | 'D_HUNGARIAN_MINOR' | 'D_MAJOR';

export type ChordQuality = 'maj' | 'min' | 'dim' | 'aug' | 'sus';

export interface Mode {
  name: ModeName;
  displayName: string;
  /** Semitone offsets from the root, seven degrees. */
  intervals: readonly [number, number, number, number, number, number, number];
  mood: string;
}

export const MODES: Record<ModeName, Mode> = {
  D_FREYGISH: {
    name: 'D_FREYGISH',
    displayName: 'D Freygish (Phrygian dominant)',
    intervals: [0, 1, 4, 5, 7, 8, 10],
    mood: 'The Balkan and klezmer sound: a flat second pulling down onto a bright major third.',
  },
  D_HARMONIC_MINOR: {
    name: 'D_HARMONIC_MINOR',
    displayName: 'D Harmonic minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    mood: 'Melancholy minor with a raised leading tone that leans hard into the tonic.',
  },
  D_MISHEBERAKH: {
    name: 'D_MISHEBERAKH',
    displayName: 'D Misheberakh (altered Dorian)',
    intervals: [0, 2, 3, 6, 7, 9, 10],
    mood: 'Klezmer Dorian with a raised fourth: restless, dancing, a little sly.',
  },
  D_HUNGARIAN_MINOR: {
    name: 'D_HUNGARIAN_MINOR',
    displayName: 'D Hungarian (gypsy) minor',
    intervals: [0, 2, 3, 6, 7, 8, 11],
    mood: 'Harmonic minor with a raised fourth: two augmented seconds, the czárdás colour.',
  },
  D_MAJOR: {
    name: 'D_MAJOR',
    displayName: 'D Major',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    mood: 'Sunrise. The friss modulates here for the finale.',
  },
};

/** Root of the mode in a given octave (D4 = 62 in octave 4). */
export function rootMidi(octave = 4): number {
  return ROOT_D4 + (octave - 4) * 12;
}

/**
 * Maps a 1-based degree to MIDI. Degrees beyond 7 wrap upward (8 is the
 * octave), degrees below 1 wrap downward, so melodic arithmetic never has to
 * think about octave boundaries.
 */
export function degreeToMidi(mode: Mode, degree: number, octave = 4): number {
  const zero = degree - 1;
  const octaveShift = Math.floor(zero / 7);
  const index = ((zero % 7) + 7) % 7;
  return rootMidi(octave) + octaveShift * 12 + mode.intervals[index];
}

/** All seven degrees of the mode in one octave, ascending. */
export function scaleMidis(mode: Mode, octave = 4): number[] {
  return mode.intervals.map((i) => rootMidi(octave) + i);
}

export function isInMode(mode: Mode, midi: number): boolean {
  const pc = pitchClass(midi - ROOT_D4);
  return mode.intervals.includes(pc);
}

/** The degree (1-7) of a pitch in the mode, or null when it is not a mode tone. */
export function degreeOf(mode: Mode, midi: number): number | null {
  const pc = pitchClass(midi - ROOT_D4);
  const index = mode.intervals.indexOf(pc);
  return index === -1 ? null : index + 1;
}

/** Snaps any pitch to the nearest mode tone (ties resolve downward). */
export function nearestModeMidi(mode: Mode, midi: number): number {
  for (let d = 0; d <= 6; d++) {
    if (isInMode(mode, midi - d)) return midi - d;
    if (isInMode(mode, midi + d)) return midi + d;
  }
  return midi;
}

/** Moves along the mode by `steps` scale degrees from a mode tone. */
export function stepInMode(mode: Mode, midi: number, steps: number): number {
  const degree = degreeOf(mode, midi);
  if (degree === null) return stepInMode(mode, nearestModeMidi(mode, midi), steps);
  const octave = Math.floor((midi - rootMidi(4) - mode.intervals[degree - 1]) / 12) + 4;
  return degreeToMidi(mode, degree + steps, octave);
}
