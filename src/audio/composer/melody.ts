import type { Rng } from '../../util/Rng.ts';
import { chordPitchClasses } from '../theory/chords.ts';
import { stepStrength, type Meter } from '../theory/meter.ts';
import { degreeToMidi, isInMode, nearestModeMidi, stepInMode, type Mode } from '../theory/modes.ts';
import { intoRange, pitchClass } from '../theory/pitch.ts';
import type { Bar, NoteEvent, Phrase } from './types.ts';

export interface MelodyOptions {
  /** Inclusive MIDI register. */
  low: number;
  high: number;
  /** 0..1: how many weak steps get notes. */
  density: number;
  /** Chance of a leap (3rd or 4th) on a strong step instead of the nearest chord tone. */
  leapChance: number;
}

interface MotifNote {
  step: number;
  /** Semitones above the chord root at the time. */
  interval: number;
  durSteps: number;
}

/**
 * A stateful lead line. Strong steps land on chord tones, weak steps fill
 * stepwise toward the next target, bars 0-1 of a phrase are remembered as a
 * motif that bars 4-5 replay against their own chords, and cadence bars
 * resolve to the tonic (full) or the cadence chord's root (half).
 */
export class MelodyLine {
  private lastMidi: number;
  private direction = 1;
  private motif: MotifNote[][] = [];
  private readonly opts: MelodyOptions;

  constructor(opts: MelodyOptions, startMidi: number) {
    this.opts = opts;
    this.lastMidi = startMidi;
  }

  reset(startMidi: number): void {
    this.lastMidi = startMidi;
    this.motif = [];
  }

  nextBar(bar: Bar, phrase: Phrase, rng: Rng): NoteEvent[] {
    const { meter, chord } = bar;
    const mode = phrase.mode;

    if (bar.phraseBar === 0) this.motif = [];

    // Consequent bars 4-5 replay the antecedent's opening motif on the new chord.
    if ((bar.phraseBar === 4 || bar.phraseBar === 5) && this.motif[bar.phraseBar - 4]) {
      const notes = this.replayMotif(this.motif[bar.phraseBar - 4], bar, mode);
      if (notes.length) {
        this.lastMidi = notes[notes.length - 1].midi;
        return notes;
      }
    }

    const targets = this.chooseTargets(bar, mode, rng);
    const notes = this.fill(targets, meter, mode, rng);

    if (bar.phraseBar === 0 || bar.phraseBar === 1) {
      this.motif[bar.phraseBar] = notes.map((n) => ({
        step: n.step,
        interval: n.midi - chord.rootMidi,
        durSteps: n.durSteps,
      }));
    }
    if (notes.length) this.lastMidi = notes[notes.length - 1].midi;
    return notes;
  }

  /** Picks a chord tone for every strong step; cadences override the last one. */
  private chooseTargets(bar: Bar, mode: Mode, rng: Rng): Map<number, number> {
    const { meter, chord } = bar;
    const targets = new Map<number, number>();
    const chordPcs = chordPitchClasses(chord);
    let prev = this.lastMidi;

    for (const step of meter.accents) {
      let midi: number;
      if (rng.next() < this.opts.leapChance) {
        // Leap a third or fourth, then the next weak steps will walk back.
        const leap = (rng.next() < 0.5 ? 2 : 3) * (rng.next() < 0.5 ? 1 : -1);
        midi = this.nearestChordTone(chordPcs, stepInMode(mode, prev, leap), mode);
      } else {
        midi = this.nearestChordTone(chordPcs, prev + this.direction * rng.between(0, 2), mode);
      }
      midi = intoRange(midi, this.opts.low, this.opts.high);
      if (midi === prev && rng.next() < 0.6) {
        midi = this.nearestChordTone(chordPcs, stepInMode(mode, prev, this.direction * 2), mode);
        midi = intoRange(midi, this.opts.low, this.opts.high);
      }
      targets.set(step, midi);
      this.direction = midi >= prev ? 1 : -1;
      if (rng.next() < 0.15) this.direction *= -1;
      prev = midi;
    }

    const lastStrong = meter.accents[meter.accents.length - 1];
    if (bar.isFullCadence) {
      targets.set(lastStrong, this.closestOctave(degreeToMidi(mode, 1, 4), prev));
    } else if (bar.isHalfCadence) {
      targets.set(lastStrong, this.closestOctave(chord.rootMidi, prev));
    }
    return targets;
  }

  /** Walks weak steps stepwise toward the next target; leaves gaps by density. */
  private fill(targets: Map<number, number>, meter: Meter, mode: Mode, rng: Rng): NoteEvent[] {
    const notes: NoteEvent[] = [];
    const strongSteps = [...targets.keys()].sort((a, b) => a - b);

    for (let i = 0; i < strongSteps.length; i++) {
      const step = strongSteps[i];
      const midi = targets.get(step)!;
      const nextStrong = strongSteps[i + 1] ?? meter.steps;
      const nextTarget = targets.get(nextStrong) ?? midi;
      const gap = nextStrong - step;

      // Decide which weak steps in this group sound
      const weakSteps: number[] = [];
      for (let s = step + 1; s < nextStrong; s++) {
        if (rng.next() < this.opts.density) weakSteps.push(s);
      }

      const firstSounding = weakSteps[0] ?? nextStrong;
      notes.push({ step, offsetSec: 0, midi, durSteps: firstSounding - step, velocity: 0.85 });

      // Fill stepwise from the strong note toward the next target
      let current = midi;
      for (let k = 0; k < weakSteps.length; k++) {
        const s = weakSteps[k];
        const remaining = weakSteps.length - k;
        const distanceDeg = this.degreeDistance(mode, current, nextTarget);
        let next: number;
        if (distanceDeg === 0) {
          next = stepInMode(mode, current, rng.next() < 0.5 ? 1 : -1); // neighbour tone
        } else {
          const dir = distanceDeg > 0 ? 1 : -1;
          const stepSize = Math.abs(distanceDeg) > remaining ? Math.min(2, Math.abs(distanceDeg)) : 1;
          next = stepInMode(mode, current, dir * stepSize);
        }
        next = intoRange(next, this.opts.low, this.opts.high);
        const until = weakSteps[k + 1] ?? nextStrong;
        notes.push({ step: s, offsetSec: 0, midi: next, durSteps: until - s, velocity: 0.72 });
        current = next;
      }
      void gap;
    }
    return notes;
  }

  private replayMotif(motif: MotifNote[], bar: Bar, mode: Mode): NoteEvent[] {
    return motif.map((m) => {
      let midi = bar.chord.rootMidi + m.interval;
      if (!isInMode(mode, midi)) midi = nearestModeMidi(mode, midi);
      midi = intoRange(midi, this.opts.low, this.opts.high);
      const strength = stepStrength(bar.meter, m.step);
      return {
        step: Math.min(m.step, bar.meter.steps - 1),
        offsetSec: 0,
        midi,
        durSteps: Math.max(1, Math.min(m.durSteps, bar.meter.steps - m.step)),
        velocity: strength === 'weak' ? 0.72 : 0.85,
      };
    });
  }

  private nearestChordTone(chordPcs: Set<number>, around: number, mode: Mode): number {
    for (let d = 0; d <= 12; d++) {
      if (chordPcs.has(pitchClass(around - d)) && isInMode(mode, around - d)) return around - d;
      if (chordPcs.has(pitchClass(around + d)) && isInMode(mode, around + d)) return around + d;
    }
    return around;
  }

  private closestOctave(midi: number, near: number): number {
    let m = midi;
    while (m - near > 6) m -= 12;
    while (near - m > 6) m += 12;
    return intoRange(m, this.opts.low, this.opts.high);
  }

  /** Signed distance in scale degrees between two mode tones. */
  private degreeDistance(mode: Mode, from: number, to: number): number {
    if (from === to) return 0;
    const dir = to > from ? 1 : -1;
    let m = from;
    let n = 0;
    while ((dir > 0 && m < to) || (dir < 0 && m > to)) {
      m = stepInMode(mode, m, dir);
      n += dir;
      if (Math.abs(n) > 24) break;
    }
    return n;
  }
}
