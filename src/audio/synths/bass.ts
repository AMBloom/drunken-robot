import * as Tone from 'tone';
import { BaseInstrument } from './BaseInstrument.ts';

export interface BassSynthParams {
  volume?: number;
  decay?: number;
  bodyResonance?: number;
}

/**
 * UprightBassSynth - plucked double bass voice.
 *
 * A slightly detuned pair of sawtooth/triangle-ish voices (fat triangle)
 * with a pluck filter envelope, a peaking body resonance near 180 Hz, and a
 * short brown-noise finger transient so each note starts with a thump.
 */
export class UprightBassSynth extends BaseInstrument {
  private readonly synth: Tone.MonoSynth;
  private readonly bodyFilter: Tone.Filter;
  private readonly fingerNoise: Tone.NoiseSynth;
  private readonly fingerFilter: Tone.Filter;
  private readonly fingerGain: Tone.Gain;

  constructor(params?: BassSynthParams) {
    super(params?.volume ?? 0);

    this.synth = this.track(
      new Tone.MonoSynth({
        oscillator: { type: 'fattriangle', spread: 12, count: 2 },
        envelope: { attack: 0.006, decay: params?.decay ?? 0.42, sustain: 0.18, release: 0.28 },
        filter: { Q: 1.8, type: 'lowpass', rolloff: -24 },
        filterEnvelope: {
          attack: 0.004,
          decay: 0.3,
          sustain: 0.12,
          release: 0.25,
          baseFrequency: 80,
          octaves: 3.0,
          exponent: 2,
        },
        volume: -2,
      }),
    );

    this.bodyFilter = this.track(
      new Tone.Filter({ frequency: 180, type: 'peaking', gain: params?.bodyResonance ?? 4.5, Q: 1.8 }),
    );
    this.synth.connect(this.bodyFilter);
    this.bodyFilter.connect(this.output);

    this.fingerNoise = this.track(
      new Tone.NoiseSynth({
        noise: { type: 'brown' },
        envelope: { attack: 0.001, decay: 0.014, sustain: 0 },
      }),
    );
    this.fingerFilter = this.track(new Tone.Filter({ frequency: 400, type: 'highpass', rolloff: -12 }));
    this.fingerGain = this.track(new Tone.Gain(Tone.dbToGain(-14)));
    this.fingerNoise.connect(this.fingerFilter);
    this.fingerFilter.connect(this.fingerGain);
    this.fingerGain.connect(this.output);
  }

  public triggerAttack(note: Tone.Unit.Frequency, time?: Tone.Unit.Time, velocity = 0.85): void {
    const t = time !== undefined ? Tone.Time(time).toSeconds() : Tone.now();
    this.fingerNoise.triggerAttackRelease('64n', t, velocity);
    this.synth.triggerAttack(note, t, velocity);
  }

  public triggerRelease(time?: Tone.Unit.Time): void {
    this.synth.triggerRelease(time);
  }

  public triggerAttackRelease(
    note: Tone.Unit.Frequency,
    duration: Tone.Unit.Time,
    time?: Tone.Unit.Time,
    velocity = 0.85,
  ): void {
    const t = time !== undefined ? Tone.Time(time).toSeconds() : Tone.now();
    this.fingerNoise.triggerAttackRelease('64n', t, velocity);
    this.synth.triggerAttackRelease(note, duration, t, velocity);
  }
}
