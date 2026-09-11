/**
 * Pitch is MIDI throughout the engine; names are produced only at trigger time.
 * Middle C is 60, so the game's root D4 is 62.
 */

export const ROOT_D4 = 62;

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const OFFSETS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function midiToNote(midi: number): string {
  const m = Math.round(midi);
  const octave = Math.floor(m / 12) - 1;
  return `${NAMES[((m % 12) + 12) % 12]}${octave}`;
}

/** Accepts C4, C#4, Db4, Bb3 and so on. */
export function noteToMidi(note: string): number {
  const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(note.trim());
  if (!match) throw new Error(`[pitch] Bad note name: ${note}`);
  const letter = match[1].toUpperCase();
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  const octave = Number(match[3]);
  return (octave + 1) * 12 + OFFSETS[letter] + accidental;
}

export function pitchClass(midi: number): number {
  return ((Math.round(midi) % 12) + 12) % 12;
}

/** Clamps by octave shifts until the pitch sits inside [low, high]. */
export function intoRange(midi: number, low: number, high: number): number {
  let m = midi;
  while (m < low) m += 12;
  while (m > high) m -= 12;
  return m;
}
