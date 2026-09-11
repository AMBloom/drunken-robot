import { chordOnDegree } from './theory/chords.ts';
import { MODES, degreeToMidi, scaleMidis } from './theory/modes.ts';
import { midiToNote } from './theory/pitch.ts';
import type { ScaleDefinition, ScaleName } from './types.ts';

/**
 * Compatibility view of the theory layer's modes for code that thinks in
 * note names (the debug keyboard). New code should use theory/ directly.
 */
export const SCALES: Record<ScaleName, ScaleDefinition> = Object.fromEntries(
  Object.values(MODES).map((m) => [
    m.name,
    {
      name: m.name,
      displayName: m.displayName,
      root: 'D',
      intervals: m.intervals,
      characteristicMood: m.mood,
    },
  ]),
) as unknown as Record<ScaleName, ScaleDefinition>;

/** Seven ascending note names of the mode in an octave. */
export function getScaleNotes(scaleName: ScaleName, octave = 4): string[] {
  return scaleMidis(MODES[scaleName], octave).map(midiToNote);
}

/** 1-indexed degree to a note name; degrees past 7 wrap upward. */
export function getScaleDegreeNote(scaleName: ScaleName, degree: number, baseOctave = 4): string {
  return midiToNote(degreeToMidi(MODES[scaleName], degree, baseOctave));
}

/** Root-position triad on a degree as note names. */
export function getTriadChord(scaleName: ScaleName, degree: number, octave = 4): string[] {
  return chordOnDegree(MODES[scaleName], degree, octave).tones.map(midiToNote);
}
