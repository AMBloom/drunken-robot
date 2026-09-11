import * as Tone from 'tone';
import type { AudioEngineState } from './types.ts';

/**
 * AudioEngine - Web Audio Context and Master Signal Chain Manager
 *
 * Adheres to Tone.js 15+ best practices:
 * - Requires explicit user gesture before audio context unlock
 * - Manages master limiter and safety headroom to prevent digital clipping
 * - Coordinates Tone.Transport clock lifecycle and global BPM
 */
export class AudioEngine {
  private static instance: AudioEngine | null = null;

  private _state: AudioEngineState = 'uninitialized';
  private masterLimiter: Tone.Limiter | null = null;
  private masterVolume: Tone.Volume | null = null;
  private stateListeners: Set<(state: AudioEngineState) => void> = new Set();

  private constructor() {
    this.updateState();
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public get state(): AudioEngineState {
    return this._state;
  }

  public get isReady(): boolean {
    return this._state === 'running';
  }

  /**
   * Initializes the Web Audio context upon user gesture.
   * Safe to call multiple times; will resume suspended context.
   */
  public async init(): Promise<void> {
    if (this._state === 'running') {
      return;
    }

    try {
      // Tone.start() unlocks the AudioContext in response to a user interaction
      await Tone.start();
      this.ensureMasterChain();

      // Configure Tone.Transport defaults
      Tone.getTransport().bpm.value = 120;
      Tone.getTransport().timeSignature = 4;

      this.updateState();
      this.bindContextEvents();
    } catch (error) {
      console.error('[AudioEngine] Failed to initialize Web Audio context:', error);
      this.updateState();
      throw error;
    }
  }

  /**
   * Builds masterVolume -> masterLimiter -> destination on first use. Tone nodes can be
   * created while the context is still suspended, so this is safe at module load; it
   * guarantees every synth and channel strip is behind the limiter rather than falling
   * back to the raw destination when constructed before init().
   */
  private ensureMasterChain(): Tone.Volume {
    if (!this.masterVolume || !this.masterLimiter) {
      this.masterLimiter = new Tone.Limiter(-1).toDestination();
      this.masterVolume = new Tone.Volume(0).connect(this.masterLimiter);
    }
    return this.masterVolume;
  }

  /**
   * Returns the master input node where all instrument synths and buses should connect.
   */
  public getMasterBus(): Tone.ToneAudioNode {
    return this.ensureMasterChain();
  }

  /**
   * Starts the Tone.Transport global clock.
   */
  public startTransport(): void {
    if (Tone.getContext().state !== 'running') {
      console.warn(
        '[AudioEngine] Cannot start transport while audio context is suspended. Call init() first.',
      );
      return;
    }
    if (Tone.getTransport().state !== 'started') {
      Tone.getTransport().start();
    }
  }

  /**
   * Pauses the Tone.Transport global clock.
   */
  public pauseTransport(): void {
    if (Tone.getTransport().state === 'started') {
      Tone.getTransport().pause();
    }
  }

  /**
   * Stops and rewinds the Tone.Transport clock to position 0:0:0.
   */
  public stopTransport(): void {
    Tone.getTransport().stop();
    Tone.getTransport().position = '0:0:0';
  }

  /**
   * Sets the global playback BPM.
   * @param bpm Beats per minute (e.g. 60 - 240)
   * @param rampTime Optional smooth ramp duration in seconds
   */
  public setBpm(bpm: number, rampTime = 0.05): void {
    const clampedBpm = Math.max(30, Math.min(300, bpm));
    if (rampTime > 0) {
      Tone.getTransport().bpm.rampTo(clampedBpm, rampTime);
    } else {
      Tone.getTransport().bpm.value = clampedBpm;
    }
  }

  /**
   * Gets the current BPM.
   */
  public getBpm(): number {
    return Tone.getTransport().bpm.value;
  }

  /**
   * Sets master output volume in decibels (-60 to +6 dB).
   */
  public setMasterVolume(decibels: number, rampTime = 0.05): void {
    const master = this.ensureMasterChain();
    const clampedDb = Math.max(-60, Math.min(6, decibels));
    if (rampTime > 0) {
      master.volume.rampTo(clampedDb, rampTime);
    } else {
      master.volume.value = clampedDb;
    }
  }

  /**
   * Subscribes a listener to audio engine state transitions.
   * Returns an unsubscribe callback.
   */
  public subscribe(listener: (state: AudioEngineState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this._state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private updateState(): void {
    const rawContextState = Tone.getContext().rawContext?.state;
    let newState: AudioEngineState = 'uninitialized';

    if (rawContextState === 'running') {
      newState = 'running';
    } else if (rawContextState === 'suspended') {
      newState = 'suspended';
    } else if (rawContextState === 'closed') {
      newState = 'closed';
    }

    if (this._state !== newState) {
      this._state = newState;
      this.notifyListeners();
    }
  }

  private bindContextEvents(): void {
    const rawContext = Tone.getContext().rawContext;
    if (rawContext && 'onstatechange' in rawContext) {
      rawContext.addEventListener('statechange', () => {
        this.updateState();
      });
    }
  }

  private notifyListeners(): void {
    for (const listener of this.stateListeners) {
      try {
        listener(this._state);
      } catch (e) {
        console.error('[AudioEngine] Error in state listener:', e);
      }
    }
  }
}

export const audioEngine = AudioEngine.getInstance();
