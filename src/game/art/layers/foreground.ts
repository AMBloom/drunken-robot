import Phaser from 'phaser';

export function drawForeground(gfx: Phaser.GameObjects.Graphics): void {
  const lampX = 980;

  gfx.fillStyle(0x0e1014, 1);
  gfx.fillRect(lampX, 410, 14, 170);
  gfx.fillRect(lampX - 6, 570, 26, 14);
  gfx.fillRect(lampX - 10, 360, 34, 52);

  gfx.fillStyle(0xfef08a, 0.95);
  gfx.fillRect(lampX - 5, 370, 24, 34);

  gfx.fillStyle(0xf59e0b, 0.22);
  gfx.fillCircle(lampX + 7, 387, 85);
  gfx.fillStyle(0xf59e0b, 0.08);
  gfx.fillCircle(lampX + 7, 387, 165);

  gfx.fillGradientStyle(0x000000, 0x000000, 0x181e2b, 0x181e2b, 0, 0, 0.28, 0.28);
  gfx.fillRect(0, 640, 1280, 80);
}
