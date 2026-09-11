import * as Tone from 'tone';
import { BaseInstrument } from './BaseInstrument.ts';

export type PercussionSoundType = 'castanet' | 'stomp' | 'shaker' | 'metal' | 'jingle' | 'rim';

export interface PercussionSynthParams {
  volume?: number;
}

/**
 * PercussionSynth - street percussion kit.
 *
 * Castanets (filtered pink noise click), boot stomp (membrane kick), shaker
 * (white noise brush), and a metal jingle for tambourine-style accents.
 */
export class PercussionSynth extends BaseInstrument {
  private readonly castanetNoise: Tone.NoiseSynth;
  private readonly castanetFilter: Tone.Filter;
  private readonly stompMembrane: Tone.MembraneSynth;
  private readonly shakerNoise: Tone.NoiseSynth;
  private readonly metalSynth: Tone.MetalSynth;
  private readonly rimNoise: Tone.NoiseSynth;
  private readonly rimFilter: Tone.Filter;

  constructor(params?: PercussionSynthParams) {
    super(params?.volume ?? 0);

    this.castanetFilter = this.track(new Tone.Filter({ frequency: 2800, type: 'bandpass', Q: 4.0 }));
    this.castanetNoise = this.track(
      new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.04, sustain: 0 },
        volume: 3,
      }),
    );
    this.castanetNoise.connect(this.castanetFilter);

    this.stompMembrane = this.track(
      new Tone.MembraneSynth({
        pitchDecay: 0.04,
        octaves: 3.5,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.002, decay: 0.22, sustain: 0.01, release: 0.2 },
        volume: -2,
      }),
    );

    this.shakerNoise = this.track(
      new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.005, decay: 0.065, sustain: 0 },
        volume: -6,
      }),
    );

    this.metalSynth = this.track(
      new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.08, release: 0.05 },
        harmonicity: 4.8,
        modulationIndex: 28,
        resonance: 4000,
        octaves: 1.2,
        volume: -14,
      }),
    );
    this.metalSynth.frequency.value = 380;

    // Rim / knock: a short bright click for footsteps
    this.rimFilter = this.track(new Tone.Filter({ frequency: 1800, type: 'bandpass', Q: 3 }));
    this.rimNoise = this.track(
      new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.03, sustain: 0 },
        volume: -4,
      }),
    );
    this.rimNoise.connect(this.rimFilter);
    this.rimFilter.connect(this.output);

    this.castanetFilter.connect(this.output);
    this.stompMembrane.connect(this.output);
    this.shakerNoise.connect(this.output);
    this.metalSynth.connect(this.output);
  }

  public triggerCastanet(time?: Tone.Unit.Time, velocity = 0.85): void {
    this.castanetNoise.triggerAttackRelease('32n', time, velocity);
  }

  public triggerStomp(time?: Tone.Unit.Time, velocity = 0.9): void {
    this.stompMembrane.triggerAttackRelease('D1', '8n', time, velocity);
  }

  public triggerShaker(time?: Tone.Unit.Time, velocity = 0.6): void {
    this.shakerNoise.triggerAttackRelease('16n', time, velocity);
  }

  public triggerMetal(time?: Tone.Unit.Time, velocity = 0.5): void {
    this.metalSynth.triggerAttackRelease(380, '32n', time, velocity);
  }

  public triggerRim(time?: Tone.Unit.Time, velocity = 0.3): void {
    this.rimNoise.triggerAttackRelease('64n', time, velocity);
  }

  public trigger(type: PercussionSoundType, time?: Tone.Unit.Time, velocity?: number): void {
    switch (type) {
      case 'castanet':
        this.triggerCastanet(time, velocity);
        break;
      case 'stomp':
        this.triggerStomp(time, velocity);
        break;
      case 'shaker':
        this.triggerShaker(time, velocity);
        break;
      case 'metal':
      case 'jingle':
        this.triggerMetal(time, velocity);
        break;
      case 'rim':
        this.triggerRim(time, velocity);
        break;
    }
  }
}
