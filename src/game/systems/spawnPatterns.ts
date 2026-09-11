/**
 * Hazard and gear layouts the spawner composes runs from. Positions are px
 * relative to the chunk's start x; y values are world coordinates on a 720 px
 * tall stage with the ground at 584. Kept as data so tests and tuning never
 * touch Phaser.
 */

export type PlacementKind = 'crate' | 'puddle' | 'gear';

export interface Placement {
  kind: PlacementKind;
  dx: number;
  y: number;
}

export interface SpawnPattern {
  name: string;
  /** Difficulty budget cost. 0 is safe, 3 is a demanding sequence. */
  score: number;
  /** Horizontal footprint, px. The next chunk starts after this plus the act spacing. */
  length: number;
  placements: readonly Placement[];
}

const GROUND_GEAR_Y = 545;
const CRATE_Y = 562;
const PUDDLE_Y = 576;

export const PATTERNS = {
  rest: {
    name: 'rest',
    score: 0,
    length: 100,
    placements: [
      { kind: 'gear', dx: 0, y: GROUND_GEAR_Y },
      { kind: 'gear', dx: 50, y: GROUND_GEAR_Y },
    ],
  },
  gear_run: {
    name: 'gear_run',
    score: 0,
    length: 140,
    placements: [
      { kind: 'gear', dx: 0, y: GROUND_GEAR_Y },
      { kind: 'gear', dx: 45, y: GROUND_GEAR_Y },
      { kind: 'gear', dx: 90, y: GROUND_GEAR_Y },
    ],
  },
  crate_arc: {
    name: 'crate_arc',
    score: 1,
    length: 120,
    placements: [
      { kind: 'crate', dx: 0, y: CRATE_Y },
      { kind: 'gear', dx: -55, y: 510 },
      { kind: 'gear', dx: 0, y: 450 },
      { kind: 'gear', dx: 55, y: 510 },
    ],
  },
  puddle_bonus: {
    name: 'puddle_bonus',
    score: 1,
    length: 130,
    placements: [
      { kind: 'puddle', dx: 0, y: PUDDLE_Y },
      { kind: 'gear', dx: 0, y: 465 },
      { kind: 'gear', dx: 70, y: 520 },
    ],
  },
  double_crate: {
    name: 'double_crate',
    score: 2,
    length: 130,
    placements: [
      { kind: 'crate', dx: 0, y: CRATE_Y },
      { kind: 'crate', dx: 45, y: CRATE_Y },
      { kind: 'gear', dx: -25, y: 495 },
      { kind: 'gear', dx: 5, y: 435 },
      { kind: 'gear', dx: 40, y: 435 },
      { kind: 'gear', dx: 70, y: 495 },
    ],
  },
  puddle_chain: {
    name: 'puddle_chain',
    score: 2,
    length: 240,
    placements: [
      { kind: 'puddle', dx: 0, y: PUDDLE_Y },
      { kind: 'puddle', dx: 90, y: PUDDLE_Y },
      { kind: 'puddle', dx: 180, y: PUDDLE_Y },
      { kind: 'gear', dx: 45, y: 470 },
      { kind: 'gear', dx: 135, y: 470 },
      { kind: 'gear', dx: 225, y: 500 },
    ],
  },
  crate_puddle_crate: {
    name: 'crate_puddle_crate',
    score: 3,
    length: 500,
    placements: [
      { kind: 'crate', dx: 0, y: CRATE_Y },
      { kind: 'puddle', dx: 220, y: PUDDLE_Y },
      { kind: 'crate', dx: 440, y: CRATE_Y },
      { kind: 'gear', dx: 0, y: 450 },
      { kind: 'gear', dx: 220, y: 470 },
      { kind: 'gear', dx: 440, y: 450 },
    ],
  },
  triple_crate: {
    name: 'triple_crate',
    score: 3,
    length: 180,
    placements: [
      { kind: 'crate', dx: 0, y: CRATE_Y },
      { kind: 'crate', dx: 45, y: CRATE_Y },
      { kind: 'crate', dx: 90, y: CRATE_Y },
      { kind: 'gear', dx: -30, y: 480 },
      { kind: 'gear', dx: 20, y: 420 },
      { kind: 'gear', dx: 70, y: 420 },
      { kind: 'gear', dx: 120, y: 480 },
    ],
  },
} as const satisfies Record<string, SpawnPattern>;

export type PatternName = keyof typeof PATTERNS;

/** Patterns with no hazard, used when the hazard roll fails or the budget is spent. */
export const SAFE_PATTERNS: readonly PatternName[] = ['rest', 'gear_run'];

/** Hazard pattern weights per act (index act - 1). Patterns absent from a table never spawn in that act. */
export const ACT_HAZARD_WEIGHTS: ReadonlyArray<Partial<Record<PatternName, number>>> = [
  { crate_arc: 3, puddle_bonus: 3, double_crate: 1 },
  { crate_arc: 3, puddle_bonus: 2, double_crate: 2, puddle_chain: 2 },
  { crate_arc: 2, puddle_bonus: 2, double_crate: 2, puddle_chain: 2, crate_puddle_crate: 2, triple_crate: 1 },
  { crate_arc: 2, puddle_bonus: 1, double_crate: 2, puddle_chain: 2, crate_puddle_crate: 2, triple_crate: 2 },
  { crate_arc: 3, puddle_bonus: 2, double_crate: 2, puddle_chain: 1, crate_puddle_crate: 1 },
];
