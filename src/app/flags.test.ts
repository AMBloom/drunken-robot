import { describe, expect, it } from 'vitest';
import { readFlags } from './flags.ts';

describe('readFlags', () => {
  it('defaults everything off with an empty query', () => {
    const f = readFlags('');
    expect(f).toEqual({ debug: false, seed: null, reducedMotion: false, coarsePointer: false, test: false });
  });

  it('parses debug, seed, motion and test flags', () => {
    const f = readFlags('?debug=1&seed=4242&motion=reduce&test=1');
    expect(f.debug).toBe(true);
    expect(f.seed).toBe(4242);
    expect(f.reducedMotion).toBe(true);
    expect(f.test).toBe(true);
  });

  it('rejects non-numeric seeds', () => {
    expect(readFlags('?seed=abc').seed).toBeNull();
    expect(readFlags('?seed=12x').seed).toBeNull();
  });
});
