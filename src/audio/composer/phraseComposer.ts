import type { Rng } from '../../util/Rng.ts';
import { chordOnDegree } from '../theory/chords.ts';
import type { Meter } from '../theory/meter.ts';
import type { Mode } from '../theory/modes.ts';
import type { Bar, Phrase } from './types.ts';

export interface PhraseRequest {
  mode: Mode;
  meter: Meter;
  templates: ReadonlyArray<readonly number[]>;
  /** Absolute index of the phrase's first bar. */
  firstBarIndex: number;
  rng: Rng;
  /** Avoid repeating this template back to back when there is a choice. */
  previousTemplate?: number;
}

/** Builds an eight-bar phrase of chords from a progression template. */
export function composePhrase(req: PhraseRequest): Phrase {
  const { mode, meter, templates, firstBarIndex, rng } = req;
  let templateIndex = rng.between(0, templates.length - 1);
  if (templates.length > 1 && templateIndex === req.previousTemplate) {
    templateIndex = (templateIndex + 1) % templates.length;
  }
  const degrees = templates[templateIndex];
  const chords = degrees.map((d) => chordOnDegree(mode, d, 3));

  const bars: Bar[] = chords.map((chord, i) => ({
    index: firstBarIndex + i,
    phraseBar: i,
    meter,
    chord,
    nextChord: chords[i + 1] ?? chordOnDegree(mode, 1, 3),
    isHalfCadence: i === 3,
    isFullCadence: i === 7,
  }));

  return { bars, mode, meter, templateIndex };
}
