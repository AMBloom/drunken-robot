import type { Rng } from '../../util/Rng.ts';
import type { Bar, NoteEvent } from './types.ts';

export type OrnamentRole = 'lead' | 'counter' | 'comp';

export interface OrnamentProfile {
  mordent: number;
  krekhts: number;
  grace: number;
}

/** How often each instrument decorates, as a probability per eligible note. */
export const ORNAMENT_PROFILES: Record<'accordion' | 'violin' | 'clarinet', OrnamentProfile> = {
  accordion: { mordent: 0.12, krekhts: 0, grace: 0.05 },
  violin: { mordent: 0.15, krekhts: 0.08, grace: 0.2 },
  clarinet: { mordent: 0.1, krekhts: 0.3, grace: 0.1 },
};

/**
 * Tags notes with ornaments the synth layer will realise: a mordent on long
 * strong notes, a krekhts (the klezmer sob) into the first note of a
 * consequent phrase or a cadence, and grace notes on downbeats.
 */
export function applyOrnaments(
  notes: NoteEvent[],
  bar: Bar,
  profile: OrnamentProfile,
  rng: Rng,
): NoteEvent[] {
  for (const n of notes) {
    const strong = bar.meter.accents.includes(n.step);
    if (n.step === 0 && (bar.phraseBar === 4 || bar.isFullCadence) && rng.next() < profile.krekhts) {
      n.ornament = 'krekhts';
    } else if (strong && n.durSteps >= 2 && rng.next() < profile.mordent) {
      n.ornament = 'mordent';
    } else if (n.step === 0 && rng.next() < profile.grace) {
      n.ornament = 'grace';
    }
  }
  return notes;
}
