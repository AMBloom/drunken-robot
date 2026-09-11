import Phaser from 'phaser';

// Helper function to draw quadratic Bezier curve segments into Phaser Graphics
export function drawQuad(
  gfx: Phaser.GameObjects.Graphics,
  p0x: number,
  p0y: number,
  cx: number,
  cy: number,
  p1x: number,
  p1y: number,
  segments: number = 8,
): void {
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const inv = 1 - t;
    const x = inv * inv * p0x + 2 * inv * t * cx + t * t * p1x;
    const y = inv * inv * p0y + 2 * inv * t * cy + t * t * p1y;
    gfx.lineTo(x, y);
  }
}

// Helper function to draw cubic Bezier curve segments into Phaser Graphics
export function drawCubic(
  gfx: Phaser.GameObjects.Graphics,
  p0x: number,
  p0y: number,
  c1x: number,
  c1y: number,
  c2x: number,
  c2y: number,
  p1x: number,
  p1y: number,
  segments: number = 10,
): void {
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const inv = 1 - t;
    const x = inv * inv * inv * p0x + 3 * inv * inv * t * c1x + 3 * inv * t * t * c2x + t * t * t * p1x;
    const y = inv * inv * inv * p0y + 3 * inv * inv * t * c1y + 3 * inv * t * t * c2y + t * t * t * p1y;
    gfx.lineTo(x, y);
  }
}

/** Alias kept for the act renderers that were written against this name. */
export const bezierCurveTo = drawCubic;

// Helper function to draw smooth closed organic amoebic splines
export function drawSmoothClosedSpline(
  gfx: Phaser.GameObjects.Graphics,
  pts: [number, number][],
  offsetX: number = 0,
  offsetY: number = 0,
): void {
  const len = pts.length;
  const startMidX = (pts[0][0] + pts[1][0]) / 2 + offsetX;
  const startMidY = (pts[0][1] + pts[1][1]) / 2 + offsetY;
  gfx.moveTo(startMidX, startMidY);

  for (let i = 1; i <= len; i++) {
    const p1 = pts[i % len];
    const p2 = pts[(i + 1) % len];
    const prev = pts[(i - 1) % len];
    const p0x = (prev[0] + p1[0]) / 2 + offsetX;
    const p0y = (prev[1] + p1[1]) / 2 + offsetY;
    const p1x = (p1[0] + p2[0]) / 2 + offsetX;
    const p1y = (p1[1] + p2[1]) / 2 + offsetY;
    drawQuad(gfx, p0x, p0y, p1[0] + offsetX, p1[1] + offsetY, p1x, p1y, 6);
  }
}
