/**
 * Meters are described in eighth-note steps with their additive grouping.
 * Accents fall on group starts; the first is the downbeat.
 */
export type MeterName = '4/4' | '3/4' | '7/8_322' | '7/8_223' | '9/8_2223' | '5/8_LURCH';

export interface Meter {
  name: MeterName;
  label: string;
  /** Eighth-note steps per bar. */
  steps: number;
  /** Additive grouping in eighths, e.g. [3, 2, 2]. */
  groups: readonly number[];
  /** Step indices that start a group (the accents). */
  accents: readonly number[];
  /** Transport time signature for display and '1m' style durations. */
  timeSignature: readonly [number, number];
}

function build(name: MeterName, label: string, groups: number[], timeSignature: [number, number]): Meter {
  const accents: number[] = [];
  let at = 0;
  for (const g of groups) {
    accents.push(at);
    at += g;
  }
  return { name, label, steps: at, groups, accents, timeSignature };
}

export const METERS: Record<MeterName, Meter> = {
  '4/4': build('4/4', '4/4 czárdás', [2, 2, 2, 2], [4, 4]),
  '3/4': build('3/4', '3/4 waltz', [2, 2, 2], [3, 4]),
  '7/8_322': build('7/8_322', '7/8 (3+2+2)', [3, 2, 2], [7, 8]),
  '7/8_223': build('7/8_223', '7/8 (2+2+3)', [2, 2, 3], [7, 8]),
  '9/8_2223': build('9/8_2223', '9/8 (2+2+2+3)', [2, 2, 2, 3], [9, 8]),
  '5/8_LURCH': build('5/8_LURCH', '5/8 lurch (2+3)', [2, 3], [5, 8]),
};

/** Seconds per eighth-note step at a quarter-note tempo. */
export function stepDurationSec(bpm: number): number {
  return 60 / bpm / 2;
}

export function barDurationSec(meter: Meter, bpm: number): number {
  return meter.steps * stepDurationSec(bpm);
}

/** Which group a step belongs to, and the step's position inside it. */
export function groupOfStep(meter: Meter, step: number): { index: number; length: number; offset: number } {
  let index = 0;
  for (let i = 0; i < meter.accents.length; i++) {
    if (step >= meter.accents[i]) index = i;
  }
  return { index, length: meter.groups[index], offset: step - meter.accents[index] };
}

export type StepStrength = 'downbeat' | 'strong' | 'weak';

export function stepStrength(meter: Meter, step: number): StepStrength {
  if (step === 0) return 'downbeat';
  return meter.accents.includes(step) ? 'strong' : 'weak';
}

/** In 4/4 the beats are the group starts (0,2,4,6); the "and"s are the offbeats. */
export function isOffbeat(meter: Meter, step: number): boolean {
  return !meter.accents.includes(step);
}
