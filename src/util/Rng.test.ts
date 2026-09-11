import { describe, expect, it } from 'vitest';
import { Rng } from './Rng.ts';

describe('Rng', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const a = Array.from({ length: 5 }, () => new Rng(42).next());
    const b = Array.from({ length: 5 }, () => new Rng(42).next());
    const c = Array.from({ length: 5 }, () => new Rng(43).next());
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('between() stays inclusive of both bounds', () => {
    const rng = new Rng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(rng.between(3, 6));
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it('weighted() follows the weights within 3 percent', () => {
    const rng = new Rng(99);
    const counts = { a: 0, b: 0, c: 0 };
    const n = 20000;
    for (let i = 0; i < n; i++) counts[rng.weighted({ a: 1, b: 2, c: 7 })] += 1;
    expect(Math.abs(counts.a / n - 0.1)).toBeLessThan(0.03);
    expect(Math.abs(counts.b / n - 0.2)).toBeLessThan(0.03);
    expect(Math.abs(counts.c / n - 0.7)).toBeLessThan(0.03);
  });

  it('fork() yields independent but reproducible streams', () => {
    const x = new Rng(5).fork('spawner').next();
    const y = new Rng(5).fork('spawner').next();
    const z = new Rng(5).fork('sway').next();
    expect(x).toBe(y);
    expect(x).not.toBe(z);
  });
});
