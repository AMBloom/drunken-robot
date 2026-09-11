import Phaser from 'phaser';
import { drawQuad } from '../primitives.ts';

export function drawDistant(gfx: Phaser.GameObjects.Graphics): void {
  gfx.fillGradientStyle(0x0e111a, 0x0e111a, 0x181e2b, 0x181e2b, 0, 0, 0.35, 0.35);
  gfx.fillRect(0, 360, 1280, 360);

  const distMists = [
    { x: 260, y: 510, rx: 360, ry: 75, color: 0x182030, alpha: 0.22 },
    { x: 740, y: 495, rx: 400, ry: 80, color: 0x201c2e, alpha: 0.18 },
    { x: 1140, y: 520, rx: 340, ry: 70, color: 0x161e2c, alpha: 0.2 },
    { x: -20, y: 525, rx: 320, ry: 65, color: 0x182030, alpha: 0.18 },
  ];
  for (const dm of distMists) {
    gfx.fillStyle(dm.color, dm.alpha);
    gfx.fillEllipse(dm.x, dm.y, dm.rx, dm.ry);
  }

  const distStructures = [
    { x: 0, w: 110, h: 260, peak: 45, style: 'gable', chimney: false },
    { x: 100, w: 75, h: 365, peak: 85, style: 'spire', chimney: false },
    { x: 170, w: 120, h: 240, peak: 35, style: 'mansard', chimney: true },
    { x: 280, w: 105, h: 310, peak: 55, style: 'gable', chimney: true },
    { x: 375, w: 85, h: 395, peak: 95, style: 'spire', chimney: false },
    { x: 450, w: 140, h: 280, peak: 40, style: 'dome', chimney: true },
    { x: 580, w: 115, h: 320, peak: 60, style: 'gable', chimney: true },
    { x: 685, w: 90, h: 350, peak: 80, style: 'spire', chimney: false },
    { x: 765, w: 130, h: 265, peak: 35, style: 'mansard', chimney: true },
    { x: 885, w: 110, h: 330, peak: 65, style: 'gable', chimney: true },
    { x: 985, w: 80, h: 380, peak: 90, style: 'spire', chimney: false },
    { x: 1055, w: 125, h: 275, peak: 40, style: 'dome', chimney: true },
    { x: 1170, w: 95, h: 305, peak: 50, style: 'gable', chimney: true },
    { x: 1255, w: 90, h: 340, peak: 70, style: 'spire', chimney: false },
  ];

  gfx.fillStyle(0x131722, 1);
  for (const b of distStructures) {
    const topY = 720 - b.h;
    gfx.beginPath();
    gfx.moveTo(b.x, 720);

    if (b.style === 'spire') {
      gfx.lineTo(b.x + b.w * 0.2, topY + b.peak);
      gfx.lineTo(b.x + b.w * 0.5, topY);
      gfx.lineTo(b.x + b.w * 0.8, topY + b.peak);
    } else if (b.style === 'dome') {
      gfx.lineTo(b.x + 8, topY + b.peak);
      drawQuad(gfx, b.x + 8, topY + b.peak, b.x + b.w * 0.5, topY - 12, b.x + b.w - 8, topY + b.peak, 8);
    } else if (b.style === 'mansard') {
      gfx.lineTo(b.x + 14, topY + b.peak);
      gfx.lineTo(b.x + b.w * 0.3, topY);
      gfx.lineTo(b.x + b.w * 0.7, topY);
      gfx.lineTo(b.x + b.w - 14, topY + b.peak);
    } else {
      gfx.lineTo(b.x + 5, topY + b.peak);
      gfx.lineTo(b.x + b.w * 0.5, topY);
      gfx.lineTo(b.x + b.w - 5, topY + b.peak);
    }

    gfx.lineTo(b.x + b.w, 720);
    gfx.closePath();
    gfx.fillPath();

    if (b.chimney) {
      gfx.fillRect(b.x + b.w * 0.65, topY - 16, 12, 24);
    }
  }

  gfx.fillGradientStyle(0x111622, 0x111622, 0x161c29, 0x161c29, 0, 0, 0.45, 0.45);
  gfx.fillRect(0, 560, 1280, 160);

  const baseMists = [
    { x: 180, y: 620, rx: 280, ry: 45, alpha: 0.16 },
    { x: 540, y: 610, rx: 340, ry: 50, alpha: 0.18 },
    { x: 920, y: 625, rx: 320, ry: 48, alpha: 0.15 },
    { x: 1240, y: 615, rx: 260, ry: 42, alpha: 0.17 },
  ];
  for (const bm of baseMists) {
    gfx.fillStyle(0x1c2436, bm.alpha);
    gfx.fillEllipse(bm.x, bm.y, bm.rx, bm.ry);
  }
}
