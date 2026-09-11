/**
 * Audio System Domain Types
 * The Drunken Robot's Journey Home
 */

import type { MeterName } from './theory/meter.ts';
import type { ModeName } from './theory/modes.ts';

export type AudioEngineState = 'uninitialized' | 'suspended' | 'running' | 'closed';

/** Scales are modes from the theory layer. */
export type ScaleName = ModeName;

/** Meters come from the theory layer. */
export type MeterType = MeterName;

export type InstrumentId = 'accordion' | 'bass' | 'percussion' | 'guitar' | 'violin' | 'clarinet';

export type EnsemblePreset = 'solo_accordion' | 'rhythm_duo' | 'tavern_trio' | 'full_balkan_band';

export interface ScaleDefinition {
  name: ScaleName;
  displayName: string;
  root: string;
  intervals: readonly number[]; // semitone intervals from root
  characteristicMood: string;
}

export interface AccordionParams {
  /** Dynamic bellows pressure: 0.0 (idle/gentle) to 1.0 (hard squeeze) */
  bellowsPressure: number;
  /** Musette beating detune in cents (0 - 25) */
  musetteDetune: number;
  /** Output volume in decibels */
  volume: number;
}

export interface InstrumentChannelState {
  id: InstrumentId;
  name: string;
  displayName: string;
  role: string;
  color: string;
  recruited: boolean;
  muted: boolean;
  solo: boolean;
  volume: number; // in dB (-60 to +6)
  pan: number; // -1 (left) to +1 (right)
}

export interface ConductorStepEvent {
  /** Current step index in the bar (0-indexed) */
  stepIndex: number;
  /** Total eighth-note steps in the current bar (e.g. 8 for 4/4, 7 for 7/8) */
  totalSteps: number;
  /** Absolute bar index */
  measureCount: number;
  /** Whether this step is an accented group start */
  isAccent: boolean;
  /** Sub-beat group index within the additive bar */
  groupIndex: number;
  /** Sub-beat group length (e.g. 3, 2, or 2 in 3+2+2) */
  groupLength: number;
  /** Active meter */
  meter: MeterType;
  /** Active mode */
  scale: ScaleName;
  /** Note triggered on the accordion, if any */
  note?: string;
  /** Per-instrument triggered notes or descriptions */
  triggers?: Partial<Record<InstrumentId, string>>;
}

export interface ConductorListener {
  (event: ConductorStepEvent): void;
}
