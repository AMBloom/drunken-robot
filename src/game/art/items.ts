import Phaser from 'phaser';

export function drawTipGear(gfx: Phaser.GameObjects.Graphics): void {
  const cx = 16;
  const cy = 16;

  gfx.fillStyle(0xf59e0b, 0.3);
  gfx.fillCircle(cx, cy, 15);
  gfx.fillStyle(0xfbbf24, 0.45);
  gfx.fillCircle(cx, cy, 11);

  gfx.fillStyle(0xb45309, 1);
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const tx = cx + Math.cos(angle) * 9;
    const ty = cy + Math.sin(angle) * 9;
    gfx.fillCircle(tx, ty, 3.2);
  }

  gfx.fillStyle(0xd97706, 1);
  gfx.fillCircle(cx, cy, 8.5);

  gfx.lineStyle(1.5, 0x18181b, 0.95);
  gfx.strokeCircle(cx, cy, 8.5);

  gfx.fillStyle(0x18181b, 1);
  gfx.fillCircle(cx, cy, 3.2);
  gfx.fillStyle(0xfef08a, 1);
  gfx.fillCircle(cx - 0.5, cy - 0.5, 1.2);
}
