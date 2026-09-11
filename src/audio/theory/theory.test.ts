import { describe, expect, it } from 'vitest';
import { chordOnDegree, isChordTone, voiceLead, voicingDistance } from './chords.ts';
import { METERS, barDurationSec, groupOfStep, stepStrength } from './meter.ts';
import { MODES, degreeOf, degreeToMidi, isInMode, nearestModeMidi, scaleMidis, stepInMode } from './modes.ts';
import { ROOT_D4, midiToNote, noteToMidi, pitchClass } from './pitch.ts';
import { ACT_MUSIC, FRISS_TEMPLATES } from './progressions.ts';

describe('pitch', () => {
  it('round-trips note names', () => {
    expect(midiToNote(62)).toBe('D4');
    expect(noteToMidi('D4')).toBe(62);
    expect(noteToMidi('Eb4')).toBe(63);
    expect(noteToMidi('C#3')).toBe(49);
    expect(midiToNote(noteToMidi('Bb3'))).toBe('A#3');
  });
});

describe('modes', () => {
  it('every seventh degree sits a seventh ABOVE the root, never below (the old octave-table bug)', () => {
    for (const mode of Object.values(MODES)) {
      const notes = scaleMidis(mode, 4);
      for (let i = 1; i < notes.length; i++) expect(notes[i]).toBeGreaterThan(notes[i - 1]);
      expect(degreeToMidi(mode, 7, 4)).toBeGreaterThan(ROOT_D4);
      expect(degreeToMidi(mode, 8, 4)).toBe(ROOT_D4 + 12);
      expect(degreeToMidi(mode, 0, 4)).toBe(degreeToMidi(mode, 7, 3));
    }
  });

  it('has the right intervals for the emblematic modes', () => {
    expect(MODES.D_FREYGISH.intervals).toEqual([0, 1, 4, 5, 7, 8, 10]);
    expect(MODES.D_HUNGARIAN_MINOR.intervals).toEqual([0, 2, 3, 6, 7, 8, 11]);
    expect(MODES.D_MISHEBERAKH.intervals).toEqual([0, 2, 3, 6, 7, 9, 10]);
  });

  it('classifies, snaps, and steps within a mode', () => {
    const mode = MODES.D_FREYGISH;
    expect(isInMode(mode, noteToMidi('F#4'))).toBe(true);
    expect(isInMode(mode, noteToMidi('F4'))).toBe(false);
    expect(degreeOf(mode, noteToMidi('A5'))).toBe(5);
    expect(nearestModeMidi(mode, noteToMidi('F4'))).toBe(noteToMidi('F#4'));
    expect(stepInMode(mode, noteToMidi('C5'), 1)).toBe(noteToMidi('D5'));
    expect(stepInMode(mode, noteToMidi('D4'), -1)).toBe(noteToMidi('C4'));
  });
});

describe('chords', () => {
  it('derives qualities from the mode', () => {
    expect(chordOnDegree(MODES.D_FREYGISH, 1).quality).toBe('maj');
    expect(chordOnDegree(MODES.D_FREYGISH, 2).quality).toBe('maj');
    expect(chordOnDegree(MODES.D_FREYGISH, 4).quality).toBe('min');
    expect(chordOnDegree(MODES.D_FREYGISH, 5).quality).toBe('dim');
    expect(chordOnDegree(MODES.D_HARMONIC_MINOR, 1).quality).toBe('min');
    expect(chordOnDegree(MODES.D_HARMONIC_MINOR, 5).quality).toBe('maj');
    expect(chordOnDegree(MODES.D_HUNGARIAN_MINOR, 5).quality).toBe('maj');
    expect(chordOnDegree(MODES.D_MAJOR, 1).quality).toBe('maj');
  });

  it('builds ascending root-position tones', () => {
    const c = chordOnDegree(MODES.D_HARMONIC_MINOR, 5, 3);
    expect(c.tones.map(midiToNote)).toEqual(['A3', 'C#4', 'E4']);
    expect(isChordTone(c, noteToMidi('C#5'))).toBe(true);
    expect(isChordTone(c, noteToMidi('D4'))).toBe(false);
  });

  it('voice-leads with little motion and no crossing', () => {
    const mode = MODES.D_FREYGISH;
    let prev: number[] | null = null;
    const degrees = [1, 2, 1, 4, 1, 7, 2, 1];
    for (const d of degrees) {
      const v = voiceLead(prev, chordOnDegree(mode, d));
      expect(v).toEqual([...v].sort((a, b) => a - b));
      expect(v[0]).toBeGreaterThanOrEqual(55);
      expect(v[v.length - 1]).toBeLessThanOrEqual(76);
      if (prev) expect(voicingDistance(prev, v)).toBeLessThanOrEqual(6);
      prev = v;
    }
  });
});

describe('meters', () => {
  it('steps equal the sum of groups and accents start each group', () => {
    for (const m of Object.values(METERS)) {
      expect(m.steps).toBe(m.groups.reduce((a, b) => a + b, 0));
      expect(m.accents[0]).toBe(0);
      expect(m.accents.length).toBe(m.groups.length);
    }
    expect(METERS['9/8_2223'].groups).toEqual([2, 2, 2, 3]);
    expect(METERS['7/8_322'].accents).toEqual([0, 3, 5]);
  });

  it('computes bar durations from the quarter-note tempo', () => {
    expect(barDurationSec(METERS['4/4'], 120)).toBeCloseTo(2);
    expect(barDurationSec(METERS['7/8_322'], 120)).toBeCloseTo(1.75);
    expect(barDurationSec(METERS['3/4'], 120)).toBeCloseTo(1.5);
  });

  it('locates steps in groups and grades their strength', () => {
    const m = METERS['7/8_322'];
    expect(groupOfStep(m, 4)).toEqual({ index: 1, length: 2, offset: 1 });
    expect(stepStrength(m, 0)).toBe('downbeat');
    expect(stepStrength(m, 3)).toBe('strong');
    expect(stepStrength(m, 6)).toBe('weak');
  });
});

describe('progressions', () => {
  it('every template is eight bars, ends on the tonic, and half-cadences at bar 4', () => {
    const all = [...Object.values(ACT_MUSIC).flatMap((a) => a.templates), ...FRISS_TEMPLATES];
    for (const t of all) {
      expect(t).toHaveLength(8);
      expect(t[7]).toBe(1);
      expect(t[3]).not.toBe(1);
      for (const d of t) expect(d).toBeGreaterThanOrEqual(1);
      for (const d of t) expect(d).toBeLessThanOrEqual(7);
    }
  });

  it('acts 1 to 5 are all defined with at least one meter', () => {
    for (let act = 1; act <= 5; act++) {
      expect(ACT_MUSIC[act].meters.length).toBeGreaterThan(0);
      expect(pitchClass(noteToMidi('D4'))).toBe(2);
    }
  });
});
