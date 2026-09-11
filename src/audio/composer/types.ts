import type { Chord } from '../theory/chords.ts';
import type { Meter } from '../theory/meter.ts';
import type { Mode } from '../theory/modes.ts';
import type { InstrumentId } from '../types.ts';

export type Ornament = 'mordent' | 'krekhts' | 'grace' | 'slide';

/** One pitched note inside a bar. `step` is an eighth-note index; `offsetSec` is humanization. */
export interface NoteEvent {
  step: number;
  offsetSec: number;
  midi: number;
  durSteps: number;
  velocity: number;
  ornament?: Ornament;
}

export type PercHit = 'stomp' | 'castanet' | 'shaker' | 'jingle' | 'rim';

export interface PercEvent {
  step: number;
  offsetSec: number;
  hit: PercHit;
  velocity: number;
}

export interface Bar {
  /** Absolute bar index since the run started. */
  index: number;
  /** 0..7 inside the phrase. */
  phraseBar: number;
  meter: Meter;
  chord: Chord;
  nextChord: Chord;
  isHalfCadence: boolean;
  isFullCadence: boolean;
}

export interface Phrase {
  bars: Bar[];
  mode: Mode;
  meter: Meter;
  templateIndex: number;
}

export interface VoiceScore {
  voice: InstrumentId;
  notes: NoteEvent[];
  perc?: PercEvent[];
  /** Guitar: steps that should be strummed as chords rather than played as notes. */
  strums?: Array<{ step: number; direction: 'down' | 'up'; velocity: number }>;
}

export interface BarScore {
  bar: Bar;
  voices: VoiceScore[];
  bpm: number;
}
