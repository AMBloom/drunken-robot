import { ACT_MUSIC } from '../theory/progressions.ts';

export type FinalePhase = 'none' | 'lassu' | 'accel' | 'friss';

/**
 * Overall loudness for a bar, 0..1. Each act has a base dynamic; the band's
 * energy (momentum) swings it; phrases crescendo into their cadence; the
 * finale's lassú is hushed and the friss is full.
 */
export function dynamicFor(act: number, energy: number, phraseBar: number, finale: FinalePhase): number {
  const base = ACT_MUSIC[act]?.dynamic ?? 0.6;
  let d = base * (0.8 + 0.4 * energy);
  if (phraseBar >= 6) d += 0.08;
  if (finale === 'lassu') d = 0.45;
  if (finale === 'accel') d = 0.6 + 0.3 * (phraseBar / 7);
  if (finale === 'friss') d = 0.95;
  return Math.max(0.2, Math.min(1, d));
}
