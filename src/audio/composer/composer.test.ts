import { describe, expect, it } from 'vitest';
import { Rng } from '../../util/Rng.ts';
import { chordOnDegree, isChordTone } from '../theory/chords.ts';
import { METERS } from '../theory/meter.ts';
import { MODES, isInMode } from '../theory/modes.ts';
import { ACT_MUSIC } from '../theory/progressions.ts';
import { HUMANIZE, humanizeNotes } from './humanize.ts';
import { MelodyLine } from './melody.ts';
import { applyOrnaments, ORNAMENT_PROFILES } from './ornaments.ts';
import { composePhrase } from './phraseComposer.ts';
import { bassPattern, compPattern, percPattern } from './rhythmPatterns.ts';
import type { NoteEvent, Phrase } from './types.ts';

const LEAD = { low: 62, high: 84, density: 0.6, leapChance: 0.2 };

function phraseFor(act: number, seed: number, meterIndex = 0): Phrase {
  const music = ACT_MUSIC[act];
  return composePhrase({
    mode: MODES[music.mode],
    meter: METERS[music.meters[meterIndex]],
    templates: music.templates,
    firstBarIndex: 0,
    rng: new Rng(seed),
  });
}

function melodyFor(phrase: Phrase, seed: number): NoteEvent[][] {
  const line = new MelodyLine(LEAD, 69);
  const rng = new Rng(seed);
  return phrase.bars.map((bar) => line.nextBar(bar, phrase, rng));
}

describe('composePhrase', () => {
  it('produces eight bars with chords in the mode and cadence flags', () => {
    const p = phraseFor(1, 3);
    expect(p.bars).toHaveLength(8);
    expect(p.bars[3].isHalfCadence).toBe(true);
    expect(p.bars[7].isFullCadence).toBe(true);
    expect(p.bars[7].chord.degree).toBe(1);
    for (const b of p.bars) for (const t of b.chord.tones) expect(isInMode(p.mode, t)).toBe(true);
  });

  it('is deterministic per seed', () => {
    expect(phraseFor(3, 9).templateIndex).toBe(phraseFor(3, 9).templateIndex);
  });
});

describe('MelodyLine', () => {
  it('keeps every note inside the mode and the register, in every act', () => {
    for (let act = 1; act <= 5; act++) {
      for (let seed = 1; seed <= 8; seed++) {
        const phrase = phraseFor(act, seed);
        for (const bar of melodyFor(phrase, seed)) {
          for (const n of bar) {
            expect(isInMode(phrase.mode, n.midi), `act ${act} seed ${seed}`).toBe(true);
            expect(n.midi).toBeGreaterThanOrEqual(LEAD.low);
            expect(n.midi).toBeLessThanOrEqual(LEAD.high);
            expect(n.durSteps).toBeGreaterThanOrEqual(1);
            expect(n.step + n.durSteps).toBeLessThanOrEqual(phrase.meter.steps);
          }
        }
      }
    }
  });

  it('puts chord tones on the strong steps of non-motif bars', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const phrase = phraseFor(1, seed);
      const bars = melodyFor(phrase, seed);
      for (const [i, bar] of bars.entries()) {
        if (i === 4 || i === 5) continue; // motif replay is allowed to bend the rule
        for (const n of bar) {
          if (phrase.meter.accents.includes(n.step)) {
            expect(isChordTone(phrase.bars[i].chord, n.midi), `seed ${seed} bar ${i} step ${n.step}`).toBe(
              true,
            );
          }
        }
      }
    }
  });

  it('ends the phrase on the tonic', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const phrase = phraseFor(2, seed);
      const last = melodyFor(phrase, seed)[7];
      const finalStrong = last.filter((n) => phrase.meter.accents.includes(n.step)).pop();
      expect(finalStrong && (finalStrong.midi - 62) % 12).toBe(0);
    }
  });

  it('replays the opening motif contour in bars 5 and 6', () => {
    const phrase = phraseFor(1, 4);
    const bars = melodyFor(phrase, 4);
    const contour = (notes: NoteEvent[], root: number) => notes.map((n) => `${n.step}:${n.midi - root}`);
    const a = contour(bars[0], phrase.bars[0].chord.rootMidi);
    const b = contour(bars[4], phrase.bars[4].chord.rootMidi);
    // Same steps and, where the mode allows it, the same intervals above the chord root
    expect(bars[4].map((n) => n.step)).toEqual(bars[0].map((n) => n.step));
    const matches = a.filter((x, i) => x === b[i]).length;
    expect(matches / a.length).toBeGreaterThan(0.6);
  });

  it('is deterministic per seed and varies across seeds', () => {
    const p = phraseFor(3, 11);
    const x = JSON.stringify(melodyFor(p, 11));
    const y = JSON.stringify(melodyFor(p, 11));
    const z = JSON.stringify(melodyFor(p, 12));
    expect(x).toBe(y);
    expect(x).not.toBe(z);
  });
});

describe('rhythm patterns', () => {
  it('bass roots the downbeat and alternates root/fifth on group starts', () => {
    const mode = MODES.D_FREYGISH;
    const chord = chordOnDegree(mode, 1, 3);
    const next = chordOnDegree(mode, 2, 3);
    const notes = bassPattern(METERS['7/8_322'], mode, chord, next, 0.7);
    expect(notes[0].step).toBe(0);
    expect((notes[0].midi - chord.rootMidi) % 12).toBe(0);
    expect(notes.map((n) => n.step).slice(0, 3)).toEqual([0, 3, 5]);
    expect(notes[notes.length - 1].step).toBe(6); // walking approach into the chord change
    for (const n of notes) expect(n.midi).toBeLessThanOrEqual(50);
  });

  it('comp lands on offbeats only', () => {
    const notes = compPattern(METERS['4/4'], [62, 66, 69], 0.8);
    expect(new Set(notes.map((n) => n.step))).toEqual(new Set([1, 3, 5, 7]));
  });

  it('percussion stomps the downbeat and keeps the aksak lilt without a shaker at low energy', () => {
    const quiet = percPattern(METERS['7/8_322'], { energy: 0.3, tambourine: false, doubleTime: false });
    expect(quiet.some((h) => h.hit === 'shaker')).toBe(false);
    expect(quiet.find((h) => h.step === 0)?.hit).toBe('stomp');
    expect(quiet.filter((h) => h.hit === 'castanet').map((h) => h.step)).toEqual([2, 3, 5]);
    const loud = percPattern(METERS['7/8_322'], { energy: 0.9, tambourine: true, doubleTime: false });
    expect(loud.some((h) => h.hit === 'shaker')).toBe(true);
    expect(loud.some((h) => h.hit === 'jingle')).toBe(true);
  });
});

describe('humanize and ornaments', () => {
  it('keeps jitter small and velocities in range', () => {
    const phrase = phraseFor(4, 2);
    const rng = new Rng(2);
    for (const bar of melodyFor(phrase, 2)) {
      for (const n of humanizeNotes(bar, phrase.meter, rng)) {
        expect(Math.abs(n.offsetSec)).toBeLessThan(HUMANIZE.timingJitterSec * 4 + HUMANIZE.longGroupLateSec);
        expect(n.velocity).toBeGreaterThanOrEqual(0.05);
        expect(n.velocity).toBeLessThanOrEqual(1);
      }
    }
  });

  it('gives the clarinet krekhts on consequent openings and cadences only', () => {
    const phrase = phraseFor(2, 5);
    const bars = melodyFor(phrase, 5);
    const rng = new Rng(5);
    let krekhts = 0;
    bars.forEach((notes, i) => {
      for (const n of applyOrnaments(notes, phrase.bars[i], ORNAMENT_PROFILES.clarinet, rng)) {
        if (n.ornament === 'krekhts') {
          krekhts += 1;
          expect(n.step).toBe(0);
          expect(i === 4 || i === 7).toBe(true);
        }
      }
    });
    expect(krekhts).toBeLessThanOrEqual(2);
  });
});
