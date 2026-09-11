import * as Tone from 'tone';
import { audioEngine } from './engine.ts';
import type { EnsemblePreset, InstrumentChannelState, InstrumentId } from './types.ts';

export interface ChannelStrip {
  inputGain: Tone.Gain;
  muteGain: Tone.Gain;
  soloNode: Tone.Solo;
  volumeNode: Tone.Volume;
  pannerNode: Tone.Panner;
  state: InstrumentChannelState;
}

const DEFAULT_CHANNEL_CONFIGS: Record<
  InstrumentId,
  Omit<InstrumentChannelState, 'recruited' | 'muted' | 'solo' | 'volume' | 'pan'>
> = {
  accordion: {
    id: 'accordion',
    name: 'Accordion',
    displayName: "Melinda's Accordion",
    role: 'Lead Melody & Bellows Swells',
    color: '#f59e0b',
  },
  bass: {
    id: 'bass',
    name: 'Upright Bass',
    displayName: "Pavel's Double Bass",
    role: 'Grounding Rhythmic Sub-Pulse',
    color: '#d97706',
  },
  percussion: {
    id: 'percussion',
    name: 'Street Percussion',
    displayName: 'Tavern Castanets & Stomp',
    role: 'Polyrhythms & Syncopated Accents',
    color: '#ef4444',
  },
  guitar: {
    id: 'guitar',
    name: 'Flamenco Guitar',
    displayName: "Mateo's Flamenco Guitar",
    role: 'Rasgueado Comping & Chords',
    color: '#eab308',
  },
  violin: {
    id: 'violin',
    name: 'Gypsy Violin',
    displayName: "Elena's Gypsy Violin",
    role: 'Lyrical Lead & Vibrato Flourishes',
    color: '#a855f7',
  },
  clarinet: {
    id: 'clarinet',
    name: 'Klezmer Clarinet',
    displayName: "Yitzhak's Klezmer Clarinet",
    role: 'Woody Counterpoint & Krekhts Glides',
    color: '#06b6d4',
  },
};

const DEFAULT_PANS: Record<InstrumentId, number> = {
  bass: 0.0,
  accordion: -0.25,
  guitar: 0.25,
  percussion: 0.35,
  violin: -0.4,
  clarinet: 0.4,
};

const DEFAULT_VOLUMES: Record<InstrumentId, number> = {
  accordion: -2,
  bass: -1,
  percussion: 0,
  guitar: -3,
  violin: -3,
  clarinet: -3,
};

/**
 * EnsembleMixer - Additive 6-Track Busking Console
 *
 * Coordinates channel strips, companion recruitment, solo/mute busing,
 * and dynamic spatial panning.
 */
export class EnsembleMixer {
  private channels: Map<InstrumentId, ChannelStrip> = new Map();
  private listeners: Set<(channels: InstrumentChannelState[]) => void> = new Set();

  constructor() {
    const instrumentIds: InstrumentId[] = ['accordion', 'bass', 'percussion', 'guitar', 'violin', 'clarinet'];

    instrumentIds.forEach((id) => {
      const isDefaultRecruited = id === 'accordion'; // Accordion unlocked from start

      const inputGain = new Tone.Gain(1.0);
      const muteGain = new Tone.Gain(isDefaultRecruited ? 1.0 : 0.0);
      const soloNode = new Tone.Solo();
      const volumeNode = new Tone.Volume(DEFAULT_VOLUMES[id]);
      const pannerNode = new Tone.Panner(DEFAULT_PANS[id]);

      // Routing: Input -> Mute Gate -> Solo Node -> Volume -> Panner -> Master Bus
      inputGain.connect(muteGain);
      muteGain.connect(soloNode);
      soloNode.connect(volumeNode);
      volumeNode.connect(pannerNode);
      pannerNode.connect(audioEngine.getMasterBus());

      const state: InstrumentChannelState = {
        ...DEFAULT_CHANNEL_CONFIGS[id],
        recruited: isDefaultRecruited,
        muted: false,
        solo: false,
        volume: DEFAULT_VOLUMES[id],
        pan: DEFAULT_PANS[id],
      };

      this.channels.set(id, {
        inputGain,
        muteGain,
        soloNode,
        volumeNode,
        pannerNode,
        state,
      });
    });
  }

  public getChannelInput(id: InstrumentId): Tone.ToneAudioNode {
    const channel = this.channels.get(id);
    if (!channel) {
      throw new Error(`[EnsembleMixer] Channel ${id} not found.`);
    }
    return channel.inputGain;
  }

  public getChannelState(id: InstrumentId): InstrumentChannelState | undefined {
    return this.channels.get(id)?.state;
  }

  public getAllChannels(): InstrumentChannelState[] {
    return Array.from(this.channels.values()).map((c) => ({ ...c.state }));
  }

  public isInstrumentActive(id: InstrumentId): boolean {
    const channel = this.channels.get(id);
    if (!channel) return false;
    return channel.state.recruited && !channel.state.muted;
  }

  /**
   * Sets recruitment (unlock) status for an instrument companion.
   */
  public setRecruited(id: InstrumentId, recruited: boolean): void {
    const channel = this.channels.get(id);
    if (!channel) return;

    channel.state.recruited = recruited;
    this.updateChannelGains(id);
    this.notifyListeners();
  }

  /**
   * Sets Mute state for an instrument channel.
   */
  public setMute(id: InstrumentId, muted: boolean): void {
    const channel = this.channels.get(id);
    if (!channel) return;

    channel.state.muted = muted;
    this.updateChannelGains(id);
    this.notifyListeners();
  }

  /**
   * Sets Solo state for an instrument channel.
   */
  public setSolo(id: InstrumentId, solo: boolean): void {
    const channel = this.channels.get(id);
    if (!channel) return;

    channel.state.solo = solo;
    channel.soloNode.solo = solo;
    this.notifyListeners();
  }

  /**
   * Sets channel volume in decibels (-60 to +6 dB).
   */
  public setVolume(id: InstrumentId, db: number, rampTime = 0.05): void {
    const channel = this.channels.get(id);
    if (!channel) return;

    const clampedDb = Math.max(-60, Math.min(6, db));
    channel.state.volume = clampedDb;
    if (rampTime > 0) {
      channel.volumeNode.volume.rampTo(clampedDb, rampTime);
    } else {
      channel.volumeNode.volume.value = clampedDb;
    }
    this.notifyListeners();
  }

  /**
   * Sets channel stereo pan (-1 left, 0 center, +1 right).
   */
  public setPan(id: InstrumentId, pan: number, rampTime = 0.05): void {
    const channel = this.channels.get(id);
    if (!channel) return;

    const clampedPan = Math.max(-1, Math.min(1, pan));
    channel.state.pan = clampedPan;
    if (rampTime > 0) {
      channel.pannerNode.pan.rampTo(clampedPan, rampTime);
    } else {
      channel.pannerNode.pan.value = clampedPan;
    }
    this.notifyListeners();
  }

  /**
   * Applies an ensemble orchestration preset.
   */
  public applyPreset(preset: EnsemblePreset): void {
    switch (preset) {
      case 'solo_accordion':
        this.setRecruited('accordion', true);
        this.setRecruited('bass', false);
        this.setRecruited('percussion', false);
        this.setRecruited('guitar', false);
        this.setRecruited('violin', false);
        this.setRecruited('clarinet', false);
        break;
      case 'rhythm_duo':
        this.setRecruited('accordion', true);
        this.setRecruited('bass', true);
        this.setRecruited('percussion', true);
        this.setRecruited('guitar', false);
        this.setRecruited('violin', false);
        this.setRecruited('clarinet', false);
        break;
      case 'tavern_trio':
        this.setRecruited('accordion', true);
        this.setRecruited('bass', true);
        this.setRecruited('percussion', true);
        this.setRecruited('guitar', true);
        this.setRecruited('violin', true);
        this.setRecruited('clarinet', false);
        break;
      case 'full_balkan_band':
        this.setRecruited('accordion', true);
        this.setRecruited('bass', true);
        this.setRecruited('percussion', true);
        this.setRecruited('guitar', true);
        this.setRecruited('violin', true);
        this.setRecruited('clarinet', true);
        break;
    }

    // Unmute all recruited instruments when applying preset
    this.channels.forEach((channel) => {
      channel.state.muted = false;
      channel.state.solo = false;
      channel.soloNode.solo = false;
      this.updateChannelGains(channel.state.id);
    });

    this.notifyListeners();
  }

  public subscribe(listener: (channels: InstrumentChannelState[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllChannels());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Ramps a channel to silence starting at an audio-context time. */
  public fadeOut(id: InstrumentId, startTime: number, seconds: number): void {
    const channel = this.channels.get(id);
    if (!channel) return;
    channel.muteGain.gain.cancelScheduledValues(startTime);
    channel.muteGain.gain.setValueAtTime(channel.muteGain.gain.value, startTime);
    channel.muteGain.gain.linearRampToValueAtTime(0, startTime + seconds);
  }

  /** Puts a channel back to whatever its recruit/mute state says. */
  public restoreChannel(id: InstrumentId): void {
    this.updateChannelGains(id);
  }

  private updateChannelGains(id: InstrumentId): void {
    const channel = this.channels.get(id);
    if (!channel) return;

    const shouldHear = channel.state.recruited && !channel.state.muted;
    const targetGain = shouldHear ? 1.0 : 0.0;
    channel.muteGain.gain.rampTo(targetGain, 0.03);
  }

  private notifyListeners(): void {
    const all = this.getAllChannels();
    for (const listener of this.listeners) {
      try {
        listener(all);
      } catch (err) {
        console.error('[EnsembleMixer] Error in listener:', err);
      }
    }
  }

  public dispose(): void {
    this.channels.forEach((channel) => {
      channel.inputGain.dispose();
      channel.muteGain.dispose();
      channel.soloNode.dispose();
      channel.volumeNode.dispose();
      channel.pannerNode.dispose();
    });
    this.channels.clear();
    this.listeners.clear();
  }
}
