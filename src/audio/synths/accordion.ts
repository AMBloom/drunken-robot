import * as Tone from 'tone';
import type { AccordionParams } from '../types.ts';
import { BaseInstrument } from './BaseInstrument.ts';

/**
 * AccordionSynth - dual FM free-reed voice.
 *
 * Two polyphonic FM voices, the second detuned by a few cents so the pair beat
 * like a musette register. Bellows pressure drives a lowpass filter and an air
 * gain through audio-rate signals, so it can be updated every frame cheaply.
 * The FM modulation index also follows pressure, but that requires touching
 * every voice via `PolySynth.set()`, so it is rate-limited.
 */
export class AccordionSynth extends BaseInstrument {
  private readonly centerVoice: Tone.PolySynth<Tone.FMSynth>;
  private readonly musetteVoice: Tone.PolySynth<Tone.FMSynth>;
  private readonly bellowsFilter: Tone.Filter;
  private readonly bellowsGain: Tone.Gain;

  private currentBellowsPressure = 0.75;
  private currentMusetteDetune = 6; // cents
  private lastModIndexApplied = -1;
  private lastModIndexTime = -Infinity;

  /** Minimum interval between PolySynth.set() calls for the modulation index. */
  private static readonly MOD_INDEX_UPDATE_INTERVAL_SEC = 0.25;
  private static readonly MOD_INDEX_MIN_DELTA = 0.3;

  constructor(customParams?: Partial<AccordionParams>) {
    super(customParams?.volume ?? -3);

    this.centerVoice = this.track(
      new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1.0,
        modulationIndex: 3.0,
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.035, decay: 0.1, sustain: 0.9, release: 0.12 },
        modulation: { type: 'triangle' },
        modulationEnvelope: { attack: 0.04, decay: 0.2, sustain: 0.8, release: 0.15 },
        volume: -4,
      }),
    );

    this.musetteVoice = this.track(
      new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1.0,
        modulationIndex: 2.8,
        detune: this.currentMusetteDetune,
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.04, decay: 0.1, sustain: 0.85, release: 0.12 },
        modulation: { type: 'triangle' },
        modulationEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.75, release: 0.15 },
        volume: -5,
      }),
    );

    this.bellowsFilter = this.track(
      new Tone.Filter({ frequency: 2400, type: 'lowpass', rolloff: -24, Q: 1.2 }),
    );
    this.bellowsGain = this.track(new Tone.Gain(0.85));

    this.centerVoice.connect(this.bellowsFilter);
    this.musetteVoice.connect(this.bellowsFilter);
    this.bellowsFilter.connect(this.bellowsGain);
    this.bellowsGain.connect(this.output);

    if (customParams?.bellowsPressure !== undefined) {
      this.setBellowsPressure(customParams.bellowsPressure);
    }
    if (customParams?.musetteDetune !== undefined) {
      this.setMusetteDetune(customParams.musetteDetune);
    }
  }

  /**
   * Sets bellows air pressure in [0.05, 1.0]. Safe to call every frame: the
   * filter and gain are signal ramps; the modulation index is rate-limited.
   */
  public setBellowsPressure(pressure: number, rampTime = 0.05): void {
    const clamped = Math.max(0.05, Math.min(1.0, pressure));
    this.currentBellowsPressure = clamped;

    // Cutoff sweeps from 600 Hz (soft, closed) to 8500 Hz (open, brassy).
    const targetFreq = 600 + Math.pow(clamped, 1.6) * 7900;
    const targetGain = 0.15 + clamped * 0.85;

    if (rampTime > 0) {
      this.bellowsFilter.frequency.rampTo(targetFreq, rampTime);
      this.bellowsGain.gain.rampTo(targetGain, rampTime);
    } else {
      this.bellowsFilter.frequency.value = targetFreq;
      this.bellowsGain.gain.value = targetGain;
    }

    // Modulation index 1.2 (mellow) to 6.0 (metallic rasp), applied sparingly.
    const targetModIndex = 1.2 + clamped * 4.8;
    const now = Tone.now();
    const elapsed = now - this.lastModIndexTime;
    const delta = Math.abs(targetModIndex - this.lastModIndexApplied);
    if (
      elapsed >= AccordionSynth.MOD_INDEX_UPDATE_INTERVAL_SEC &&
      delta >= AccordionSynth.MOD_INDEX_MIN_DELTA
    ) {
      this.centerVoice.set({ modulationIndex: targetModIndex });
      this.musetteVoice.set({ modulationIndex: targetModIndex * 0.95 });
      this.lastModIndexApplied = targetModIndex;
      this.lastModIndexTime = now;
    }
  }

  public getBellowsPressure(): number {
    return this.currentBellowsPressure;
  }

  /** Musette detune in cents: 0 dry, 6 to 12 sweet folk, 20 wide and wet. */
  public setMusetteDetune(cents: number): void {
    const clamped = Math.max(0, Math.min(30, cents));
    this.currentMusetteDetune = clamped;
    this.musetteVoice.set({ detune: clamped });
  }

  public getMusetteDetune(): number {
    return this.currentMusetteDetune;
  }

  public triggerAttack(
    notes: Tone.Unit.Frequency | Tone.Unit.Frequency[],
    time?: Tone.Unit.Time,
    velocity = 0.8,
  ): void {
    this.centerVoice.triggerAttack(notes, time, velocity);
    this.musetteVoice.triggerAttack(notes, time, velocity * 0.9);
  }

  public triggerRelease(notes: Tone.Unit.Frequency | Tone.Unit.Frequency[], time?: Tone.Unit.Time): void {
    this.centerVoice.triggerRelease(notes, time);
    this.musetteVoice.triggerRelease(notes, time);
  }

  public triggerAttackRelease(
    notes: Tone.Unit.Frequency | Tone.Unit.Frequency[],
    duration: Tone.Unit.Time,
    time?: Tone.Unit.Time,
    velocity = 0.8,
  ): void {
    this.centerVoice.triggerAttackRelease(notes, duration, time, velocity);
    this.musetteVoice.triggerAttackRelease(notes, duration, time, velocity * 0.9);
  }

  public releaseAll(time?: Tone.Unit.Time): void {
    this.centerVoice.releaseAll(time);
    this.musetteVoice.releaseAll(time);
  }
}
