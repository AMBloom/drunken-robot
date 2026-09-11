import * as Tone from 'tone';
import { BaseInstrument } from './BaseInstrument.ts';

export interface GuitarSynthParams {
  volume?: number;
}

const STRING_COUNT = 6;

/**
 * FlamencoGuitarSynth - six Karplus-Strong plucked strings.
 *
 * Each string is a PluckSynth behind its own gain (PluckSynth has no
 * velocity), so strums assign chord tones to strings round-robin and shape
 * each pluck's level. A hard downstroke becomes a rasgueado: three quick
 * strokes with a rising velocity ramp, as the fingers fan across the strings.
 */
export class FlamencoGuitarSynth extends BaseInstrument {
  private readonly strings: Array<{ pluck: Tone.PluckSynth; gain: Tone.Gain }> = [];
  private readonly bodyFilter: Tone.Filter;
  private readonly bodyResonance: Tone.Filter;
  private nextString = 0;

  private static readonly RASGUEADO_THRESHOLD = 0.85;
  private static readonly RASGUEADO_STROKE_GAP = 0.045;

  constructor(params?: GuitarSynthParams) {
    super(params?.volume ?? 0);

    // Soundboard: a gentle lowpass plus a body resonance around 220 Hz
    this.bodyResonance = this.track(new Tone.Filter({ frequency: 220, type: 'peaking', gain: 4, Q: 1.5 }));
    this.bodyFilter = this.track(new Tone.Filter({ frequency: 3400, type: 'lowpass', rolloff: -12, Q: 0.8 }));
    this.bodyResonance.connect(this.bodyFilter);
    this.bodyFilter.connect(this.output);

    for (let i = 0; i < STRING_COUNT; i++) {
      const pluck = this.track(new Tone.PluckSynth({ attackNoise: 1.2, dampening: 3200, resonance: 0.92 }));
      const gain = this.track(new Tone.Gain(0.8));
      pluck.connect(gain);
      gain.connect(this.bodyResonance);
      this.strings.push({ pluck, gain });
    }
  }

  private pluckAt(note: Tone.Unit.Frequency, time: number, velocity: number): void {
    const s = this.strings[this.nextString];
    this.nextString = (this.nextString + 1) % STRING_COUNT;
    s.gain.gain.setValueAtTime(Math.max(0.05, Math.min(1, velocity)), time);
    s.pluck.triggerAttack(note, time);
  }

  public triggerAttack(
    notes: Tone.Unit.Frequency | Tone.Unit.Frequency[],
    time?: Tone.Unit.Time,
    velocity = 0.8,
  ): void {
    const t = time !== undefined ? Tone.Time(time).toSeconds() : Tone.now();
    for (const n of Array.isArray(notes) ? notes : [notes]) this.pluckAt(n, t, velocity);
  }

  /** Plucked strings ring out on their own; release is a no-op kept for API symmetry. */
  public triggerRelease(_notes?: Tone.Unit.Frequency | Tone.Unit.Frequency[], _time?: Tone.Unit.Time): void {
    void _notes;
    void _time;
  }

  public triggerAttackRelease(
    notes: Tone.Unit.Frequency | Tone.Unit.Frequency[],
    _duration: Tone.Unit.Time,
    time?: Tone.Unit.Time,
    velocity = 0.8,
  ): void {
    void _duration;
    this.triggerAttack(notes, time, velocity);
  }

  /**
   * Strums chord notes with a per-string stagger. A hard downstroke (velocity
   * above the rasgueado threshold) fans three strokes.
   * @param direction 'down' plays low to high; 'up' plays high to low.
   * @param speed seconds between strings (0.012 to 0.020 is natural).
   */
  public strumChord(
    notes: string[],
    time?: Tone.Unit.Time,
    direction: 'down' | 'up' = 'down',
    speed = 0.016,
    _duration: Tone.Unit.Time = '8n',
    velocity = 0.8,
  ): void {
    void _duration;
    const baseTime = time !== undefined ? Tone.Time(time).toSeconds() : Tone.now();
    const strokes =
      direction === 'down' && velocity >= FlamencoGuitarSynth.RASGUEADO_THRESHOLD ? [0.55, 0.75, 1.0] : [1.0];
    strokes.forEach((strokeVel, k) => {
      const strokeTime = baseTime + k * FlamencoGuitarSynth.RASGUEADO_STROKE_GAP;
      const ordered = direction === 'down' || k > 0 ? [...notes] : [...notes].reverse();
      ordered.forEach((note, index) => {
        const v = velocity * strokeVel * (0.85 + 0.15 * (index / Math.max(1, ordered.length - 1)));
        this.pluckAt(note, strokeTime + index * speed, v);
      });
    });
  }

  public releaseAll(_time?: Tone.Unit.Time): void {
    void _time;
  }
}
