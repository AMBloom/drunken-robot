import type { MeterName } from './meter.ts';
import type { ModeName } from './modes.ts';

/**
 * Eight-bar templates as scale degrees. Bars 1-4 are the antecedent and end
 * on a half cadence (a non-tonic chord); bars 5-8 are the consequent and end
 * on the tonic. Roman numerals are given in comments for the mode's chord
 * qualities as derived by chordOnDegree().
 */
export interface ActMusic {
  mode: ModeName;
  /** Meters the act cycles through, one per phrase. */
  meters: readonly MeterName[];
  bpm: number;
  /** Base dynamic 0..1 before energy shaping. */
  dynamic: number;
  templates: ReadonlyArray<readonly [number, number, number, number, number, number, number, number]>;
}

export const ACT_MUSIC: Record<number, ActMusic> = {
  // Tavern: Freygish. I bII I I | iv I bII I  (bII is major, iv minor, bVII major)
  1: {
    mode: 'D_FREYGISH',
    meters: ['4/4'],
    bpm: 120,
    dynamic: 0.55,
    templates: [
      [1, 2, 1, 2, 4, 1, 2, 1],
      [1, 1, 2, 7, 4, 2, 7, 1],
      [1, 2, 4, 2, 1, 7, 2, 1],
    ],
  },
  // Canals: harmonic minor, waltz alternating with 7/8. i iv V i | i VI V i
  2: {
    mode: 'D_HARMONIC_MINOR',
    meters: ['3/4', '7/8_322'],
    bpm: 115,
    dynamic: 0.4,
    templates: [
      [1, 4, 5, 5, 1, 6, 5, 1],
      [1, 1, 4, 5, 6, 4, 5, 1],
      [1, 6, 4, 5, 1, 4, 5, 1],
    ],
  },
  // Market: Misheberakh in 9/8 with 7/8 (2+2+3). i II i bVII | i II bVII i
  3: {
    mode: 'D_MISHEBERAKH',
    meters: ['9/8_2223', '7/8_223'],
    bpm: 138,
    dynamic: 0.75,
    templates: [
      [1, 2, 1, 7, 1, 2, 7, 1],
      [1, 7, 2, 2, 1, 2, 7, 1],
      [1, 2, 3, 2, 1, 7, 2, 1],
    ],
  },
  // Noir: Hungarian minor in 7/8. i VI V i | i ii V i  (V is major, VI major)
  4: {
    mode: 'D_HUNGARIAN_MINOR',
    meters: ['7/8_322'],
    bpm: 126,
    dynamic: 0.5,
    templates: [
      [1, 6, 5, 5, 1, 2, 5, 1],
      [1, 2, 5, 6, 1, 5, 6, 1],
      [1, 5, 1, 2, 6, 5, 5, 1],
    ],
  },
  // Sunrise: starts Freygish lassú, the friss modulates to D major (see finale in the director).
  5: {
    mode: 'D_FREYGISH',
    meters: ['4/4'],
    bpm: 180,
    dynamic: 0.9,
    templates: [
      [1, 2, 1, 7, 4, 1, 2, 1],
      [1, 4, 1, 2, 1, 7, 2, 1],
    ],
  },
};

/** The friss: D major czárdás templates used once the finale accelerates. */
export const FRISS_TEMPLATES: ActMusic['templates'] = [
  [1, 5, 1, 5, 4, 1, 5, 1],
  [1, 4, 5, 5, 1, 4, 5, 1],
  [1, 6, 4, 5, 1, 4, 5, 1],
];
