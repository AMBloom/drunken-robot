import Phaser from 'phaser';

export function drawSky(gfx: Phaser.GameObjects.Graphics): void {
  gfx.fillGradientStyle(0x080912, 0x080912, 0x141826, 0x1c2132, 1);
  gfx.fillRect(0, 0, 1280, 720);

  const moonX = 1050;
  const moonY = 140;
  gfx.fillStyle(0xfef3c7, 0.03);
  gfx.fillCircle(moonX, moonY, 115);
  gfx.fillStyle(0xfef3c7, 0.06);
  gfx.fillCircle(moonX, moonY, 78);
  gfx.fillStyle(0xfef3c7, 0.14);
  gfx.fillCircle(moonX, moonY, 56);

  gfx.fillStyle(0xfef3c7, 0.96);
  gfx.fillCircle(moonX, moonY, 48);
  gfx.fillStyle(0x080912, 1);
  gfx.fillCircle(moonX + 18, moonY - 8, 44);

  const skyMists = [
    { x: 300, y: 340, rx: 420, ry: 100, color: 0x1b2034, alpha: 0.07 },
    { x: 760, y: 370, rx: 460, ry: 110, color: 0x241830, alpha: 0.06 },
    { x: 520, y: 430, rx: 500, ry: 95, color: 0x281f19, alpha: 0.05 },
    { x: 1120, y: 330, rx: 380, ry: 90, color: 0x182030, alpha: 0.07 },
    { x: -50, y: 360, rx: 360, ry: 85, color: 0x182030, alpha: 0.07 },
  ];
  for (const m of skyMists) {
    gfx.fillStyle(m.color, m.alpha);
    gfx.fillEllipse(m.x, m.y, m.rx, m.ry);
  }

  const starCoords: [number, number, number, number][] = [
    [120, 80, 2.0, 0.85],
    [240, 160, 1.4, 0.7],
    [380, 70, 2.2, 0.9],
    [520, 130, 1.2, 0.6],
    [680, 60, 2.0, 0.8],
    [820, 110, 1.4, 0.75],
    [950, 50, 1.8, 0.85],
    [1180, 90, 2.0, 0.9],
    [180, 220, 1.2, 0.6],
    [450, 190, 1.6, 0.7],
    [760, 210, 1.3, 0.65],
    [1120, 200, 1.5, 0.75],
    [60, 150, 1.8, 0.8],
    [310, 110, 1.2, 0.65],
    [600, 150, 1.6, 0.7],
    [890, 85, 2.0, 0.85],
    [1020, 210, 1.3, 0.6],
    [40, 40, 1.5, 0.7],
    [710, 100, 1.9, 0.85],
    [980, 170, 1.3, 0.65],
    [160, 120, 1.0, 0.5],
    [550, 80, 1.5, 0.7],
    [860, 160, 1.2, 0.6],
    [1230, 140, 1.7, 0.8],
  ];
  for (const [sx, sy, sr, sa] of starCoords) {
    gfx.fillStyle(0xffffff, sa);
    gfx.fillCircle(sx, sy, sr);
  }
}
