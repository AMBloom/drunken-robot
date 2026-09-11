import * as Tone from 'tone';
import { BaseInstrument } from './BaseInstrument.ts';

export interface ViolinSynthParams {
  volume?: number;
  vibratoFrequency?: number;
  vibratoDepth?: number;
  portamento?: number;
}

/**
 * GypsyViolinSynth - bowed folk violin voice.
 *
 * Sawtooth core with a bow-bite attack, then a formant stack (a 24 dB
 * lowpass plus body peaks near 280 Hz, 1.1 kHz, and 3.2 kHz) that keeps the
 * fundamental instead of a bandpass that threw it away. Vibrato is delayed:
 * it swells in over the first ~150 ms of each note, as a player's does. A
 * short pink-noise bow transient sits under each attack.
 */
export class GypsyViolinSynth extends BaseInstrument {
  private readonly synth: Tone.Synth;
  private readonly vibratoLfo: Tone.LFO;
  private readonly vibratoDepth: Tone.Gain;
  private readonly bowNoise: Tone.NoiseSynth;
  private readonly bowFilter: Tone.Filter;
  private readonly bowGain: Tone.Gain;
  private readonly stack: Tone.Filter[];

  private static readonly VIBRATO_DELAY_SEC = 0.12;
  private static readonly VIBRATO_SWELL_SEC = 0.2;

  constructor(params?: ViolinSynthParams) {
    super(params?.volume ?? 0);

    this.synth = this.track(
      new Tone.Synth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.045, decay: 0.12, sustain: 0.85, release: 0.18 },
        portamento: params?.portamento ?? 0.04,
        volume: -6,
      }),
    );

    // Vibrato LFO -> depth gain -> detune, so the depth can swell per note
    const vibratoFreq = params?.vibratoFrequency ?? 5.5;
    const vibratoCents = params?.vibratoDepth ?? 18;
    this.vibratoLfo = this.track(new Tone.LFO(vibratoFreq, -vibratoCents, vibratoCents));
    this.vibratoDepth = this.track(new Tone.Gain(0));
    this.vibratoLfo.connect(this.vibratoDepth);
    this.vibratoDepth.connect(this.synth.detune);
    this.vibratoLfo.start();

    // Formant stack
    this.stack = [
      this.track(new Tone.Filter({ frequency: 280, type: 'peaking', gain: 6, Q: 2 })),
      this.track(new Tone.Filter({ frequency: 1100, type: 'peaking', gain: 4, Q: 2 })),
      this.track(new Tone.Filter({ frequency: 3200, type: 'peaking', gain: 3, Q: 2.5 })),
      this.track(new Tone.Filter({ frequency: 3500, type: 'lowpass', rolloff: -24, Q: 0.7 })),
    ];
    this.synth.connect(this.stack[0]);
    for (let i = 0; i < this.stack.length - 1; i++) this.stack[i].connect(this.stack[i + 1]);
    this.stack[this.stack.length - 1].connect(this.output);

    // Bow transient: pink noise through a bandpass at low level, mixed in after the stack
    this.bowNoise = this.track(
      new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.005, decay: 0.08, sustain: 0 } }),
    );
    this.bowFilter = this.track(new Tone.Filter({ frequency: 2500, type: 'bandpass', Q: 1.2 }));
    this.bowGain = this.track(new Tone.Gain(Tone.dbToGain(-22)));
    this.bowNoise.connect(this.bowFilter);
    this.bowFilter.connect(this.bowGain);
    this.bowGain.connect(this.output);
  }

  private swellVibrato(t: number): void {
    const g = this.vibratoDepth.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0, t);
    g.setValueAtTime(0, t + GypsyViolinSynth.VIBRATO_DELAY_SEC);
    g.linearRampToValueAtTime(1, t + GypsyViolinSynth.VIBRATO_DELAY_SEC + GypsyViolinSynth.VIBRATO_SWELL_SEC);
  }

  public triggerAttack(note: Tone.Unit.Frequency, time?: Tone.Unit.Time, velocity = 0.85): void {
    const t = time !== undefined ? Tone.Time(time).toSeconds() : Tone.now();
    this.swellVibrato(t);
    this.bowNoise.triggerAttackRelease('32n', t, velocity * 0.8);
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
    this.swellVibrato(t);
    this.bowNoise.triggerAttackRelease('32n', t, velocity * 0.8);
    this.synth.triggerAttackRelease(note, duration, t, velocity);
  }

  /** A short falling slide, for a splash into a puddle. */
  public triggerSlideDown(time?: Tone.Unit.Time, velocity = 0.7): void {
    const t = time !== undefined ? Tone.Time(time).toSeconds() : Tone.now();
    const detune = this.synth.detune;
    detune.cancelScheduledValues(t);
    detune.setValueAtTime(0, t);
    detune.linearRampToValueAtTime(-700, t + 0.35);
    detune.setValueAtTime(0, t + 0.4);
    this.synth.triggerAttackRelease('A4', 0.35, t, velocity);
  }

  public setVibrato(frequency: number, depthCents: number): void {
    this.vibratoLfo.frequency.value = frequency;
    this.vibratoLfo.min = -depthCents;
    this.vibratoLfo.max = depthCents;
  }

  public setPortamento(glideSeconds: number): void {
    this.synth.portamento = Math.max(0, Math.min(0.5, glideSeconds));
  }

  public override dispose(): void {
    this.vibratoLfo.stop();
    super.dispose();
  }
}
