import * as Tone from 'tone';
import { BaseInstrument } from './BaseInstrument.ts';

export interface ClarinetSynthParams {
  volume?: number;
  portamento?: number;
}

/**
 * KlezmerClarinetSynth - single-reed woodwind voice.
 *
 * A pulse wave (odd harmonics, the cylindrical bore) into a 24 dB lowpass
 * whose envelope opens with the reed, then a chalumeau formant peak near
 * 1.5 kHz. The old bandpass removed the fundamental; this keeps it. A tiny
 * breath-noise transient rides each attack. The krekhts (klezmer sob) is a
 * detune scoop so it needs no scheduled cleanup.
 */
export class KlezmerClarinetSynth extends BaseInstrument {
  private readonly synth: Tone.MonoSynth;
  private readonly formant: Tone.Filter;
  private readonly breathNoise: Tone.NoiseSynth;
  private readonly breathFilter: Tone.Filter;
  private readonly breathGain: Tone.Gain;

  private static readonly KREKHTS_SCOOP_CENTS = -300;
  private static readonly KREKHTS_SCOOP_SEC = 0.08;

  constructor(params?: ClarinetSynthParams) {
    super(params?.volume ?? 0);

    this.synth = this.track(
      new Tone.MonoSynth({
        oscillator: { type: 'pulse', width: 0.5 },
        envelope: { attack: 0.032, decay: 0.14, sustain: 0.82, release: 0.16 },
        filter: { Q: 1.2, type: 'lowpass', rolloff: -24 },
        filterEnvelope: {
          attack: 0.03,
          decay: 0.25,
          sustain: 0.65,
          release: 0.2,
          baseFrequency: 900,
          octaves: 2.2,
          exponent: 1.6,
        },
        portamento: params?.portamento ?? 0.035,
        volume: -6,
      }),
    );

    this.formant = this.track(new Tone.Filter({ frequency: 1500, type: 'peaking', gain: 5, Q: 2 }));
    this.synth.connect(this.formant);
    this.formant.connect(this.output);

    this.breathNoise = this.track(
      new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.004, decay: 0.06, sustain: 0 } }),
    );
    this.breathFilter = this.track(new Tone.Filter({ frequency: 3000, type: 'highpass', rolloff: -12 }));
    this.breathGain = this.track(new Tone.Gain(Tone.dbToGain(-26)));
    this.breathNoise.connect(this.breathFilter);
    this.breathFilter.connect(this.breathGain);
    this.breathGain.connect(this.output);
  }

  public triggerAttack(note: Tone.Unit.Frequency, time?: Tone.Unit.Time, velocity = 0.85): void {
    const t = time !== undefined ? Tone.Time(time).toSeconds() : Tone.now();
    this.breathNoise.triggerAttackRelease('32n', t, velocity);
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
    this.breathNoise.triggerAttackRelease('32n', t, velocity);
    this.synth.triggerAttackRelease(note, duration, t, velocity);
  }

  /** Plays a note with a krekhts: a quick upward scoop into the target pitch. */
  public triggerKrekhts(targetNote: string, time?: Tone.Unit.Time, duration: Tone.Unit.Time = '8n'): void {
    const t = time !== undefined ? Tone.Time(time).toSeconds() : Tone.now();
    const detune = this.synth.detune;
    detune.cancelScheduledValues(t);
    detune.setValueAtTime(KlezmerClarinetSynth.KREKHTS_SCOOP_CENTS, t);
    detune.linearRampToValueAtTime(0, t + KlezmerClarinetSynth.KREKHTS_SCOOP_SEC);
    this.triggerAttackRelease(targetNote, duration, t, 0.9);
  }

  public setPortamento(glideSeconds: number): void {
    this.synth.portamento = Math.max(0, Math.min(0.5, glideSeconds));
  }
}
