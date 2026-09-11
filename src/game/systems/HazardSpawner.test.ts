import { describe, expect, it } from 'vitest';
import { ACT_WALK_SPEED, SPAWN } from '../balance.ts';
import { HazardSpawner, type Chunk } from './HazardSpawner.ts';
import { Rng } from './Rng.ts';

function plan(seed: number, act: number, untilX: number): Chunk[] {
  const spawner = new HazardSpawner(new Rng(seed));
  const chunks: Chunk[] = [];
  while (spawner.upcomingX < untilX) chunks.push(spawner.nextChunk(act));
  return chunks;
}

const hazardsOf = (c: Chunk) => c.placements.filter((p) => p.kind !== 'gear');

describe('HazardSpawner', () => {
  it('is reproducible for a seed and different across seeds', () => {
    const a = plan(1, 2, 20000).map((c) => `${c.x}:${c.pattern}`);
    const b = plan(1, 2, 20000).map((c) => `${c.x}:${c.pattern}`);
    const c = plan(2, 2, 20000).map((c) => `${c.x}:${c.pattern}`);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('places no hazards before the opening stretch', () => {
    for (const c of plan(3, 1, 20000)) {
      if (c.x < SPAWN.firstHazardPx) expect(hazardsOf(c)).toHaveLength(0);
    }
  });

  it('gets denser with each act through act 4', () => {
    const density = (act: number): number => {
      let hazards = 0;
      for (let seed = 1; seed <= 10; seed++) {
        for (const c of plan(seed, act, 60000)) hazards += hazardsOf(c).length;
      }
      return hazards / 10 / 60;
    };
    const d = [1, 2, 3, 4].map(density);
    expect(d[1]).toBeGreaterThan(d[0]);
    expect(d[2]).toBeGreaterThan(d[1]);
    expect(d[3]).toBeGreaterThan(d[2]);
  });

  it('never exceeds the difficulty budget in any 1000 px window', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const chunks = plan(seed, 4, 60000);
      for (let i = 0; i < chunks.length; i++) {
        let sum = 0;
        for (let j = i; j < chunks.length && chunks[j].x - chunks[i].x < 1000; j++) sum += chunks[j].score;
        expect(sum).toBeLessThanOrEqual(SPAWN.maxDifficultyPer1000);
      }
    }
  });

  it('follows a top-score pattern with a rest', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const chunks = plan(seed, 4, 60000);
      for (let i = 0; i < chunks.length - 1; i++) {
        if (chunks[i].score >= SPAWN.restAfterScore) expect(chunks[i + 1].pattern).toBe('rest');
      }
    }
  });

  it('leaves a landing zone after every chunk and spaces power-ups apart', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const chunks = plan(seed, 3, 60000);
      let lastPowerup = -Infinity;
      for (let i = 0; i < chunks.length - 1; i++) {
        const gap = chunks[i + 1].x - (chunks[i].x + chunks[i].length);
        expect(gap).toBeGreaterThanOrEqual(120);
        if (chunks[i].powerup) {
          expect(chunks[i].x - lastPowerup).toBeGreaterThanOrEqual(SPAWN.powerupMinGapPx);
          lastPowerup = chunks[i].x;
        }
      }
    }
  });

  it('supplies roughly one gear per second in every act', () => {
    for (let act = 1; act <= 5; act++) {
      let gears = 0;
      const seeds = 10;
      for (let seed = 1; seed <= seeds; seed++) {
        for (const c of plan(seed, act, 60000)) gears += c.placements.filter((p) => p.kind === 'gear').length;
      }
      const seconds = 60000 / ACT_WALK_SPEED[act - 1];
      const perSecond = gears / seeds / seconds;
      expect(perSecond, `act ${act}`).toBeGreaterThan(0.8);
      expect(perSecond, `act ${act}`).toBeLessThan(1.4);
    }
  });
});
