import { SPAWN } from '../balance.ts';
import type { Rng } from './Rng.ts';
import {
  ACT_HAZARD_WEIGHTS,
  PATTERNS,
  SAFE_PATTERNS,
  type PatternName,
  type Placement,
} from './spawnPatterns.ts';

export type PowerupKind = 'tips' | 'balance' | 'steam' | 'shield';

export interface PowerupPlacement {
  kind: PowerupKind;
  dx: number;
  y: number;
}

export interface Chunk {
  /** World x where the chunk starts. */
  x: number;
  pattern: PatternName;
  score: number;
  length: number;
  placements: readonly Placement[];
  powerup: PowerupPlacement | null;
}

/**
 * Plans the street ahead as a sequence of chunks. Pure and deterministic for
 * a given Rng: the scene only materialises what this returns.
 *
 * Rules: no hazards before SPAWN.firstHazardPx; per-act hazard chance and
 * spacing; a difficulty budget per 1000 px; a forced rest after any
 * top-score pattern; at most one power-up per SPAWN.powerupMinGapPx.
 */
export class HazardSpawner {
  private nextX: number;
  private lastPowerupX = -Infinity;
  private forceRest = false;
  private recent: Array<{ x: number; score: number }> = [];
  private readonly rng: Rng;

  constructor(rng: Rng, startX = 750) {
    this.rng = rng;
    this.nextX = startX;
  }

  /** World x at which the next chunk will be placed. */
  get upcomingX(): number {
    return this.nextX;
  }

  nextChunk(act: number): Chunk {
    const x = this.nextX;
    const actIndex = Math.min(Math.max(act, 1), ACT_HAZARD_WEIGHTS.length) - 1;
    const name = this.choosePattern(x, actIndex);
    const pattern = PATTERNS[name];

    this.recent.push({ x, score: pattern.score });
    this.recent = this.recent.filter((r) => x - r.x < 1000);
    this.forceRest = pattern.score >= SPAWN.restAfterScore;

    const powerup = this.maybePowerup(x, pattern.length, actIndex);

    const [minGap, maxGap] = SPAWN.chunkSpacing[actIndex];
    this.nextX = x + pattern.length + this.rng.between(minGap, maxGap);

    return {
      x,
      pattern: name,
      score: pattern.score,
      length: pattern.length,
      placements: pattern.placements,
      powerup,
    };
  }

  private choosePattern(x: number, actIndex: number): PatternName {
    if (x < SPAWN.firstHazardPx || this.forceRest) return 'rest';
    if (this.rng.next() >= SPAWN.hazardChance[actIndex]) return this.rng.pick(SAFE_PATTERNS);

    const spent = this.recent.reduce((sum, r) => sum + r.score, 0);
    const budget = SPAWN.maxDifficultyPer1000 - spent;
    const table = ACT_HAZARD_WEIGHTS[actIndex];
    const affordable = Object.fromEntries(
      Object.entries(table).filter(([key]) => PATTERNS[key as PatternName].score <= budget),
    ) as Partial<Record<PatternName, number>>;
    if (Object.keys(affordable).length === 0) return this.rng.pick(SAFE_PATTERNS);
    return this.rng.weighted(affordable as Record<PatternName, number>);
  }

  private maybePowerup(x: number, length: number, actIndex: number): PowerupPlacement | null {
    if (x - this.lastPowerupX < SPAWN.powerupMinGapPx) return null;
    if (this.rng.next() >= SPAWN.powerupChance) return null;
    this.lastPowerupX = x;
    return {
      kind: this.rng.weighted(SPAWN.powerupWeights[actIndex]),
      dx: length / 2,
      y: this.rng.between(410, 490),
    };
  }
}
