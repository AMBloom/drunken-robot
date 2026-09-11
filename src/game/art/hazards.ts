import Phaser from 'phaser';
import { drawQuad, drawSmoothClosedSpline } from './primitives.ts';

export function drawCrateAct1(gfx: Phaser.GameObjects.Graphics): void {
  // ---------------------------------------------------------
  // Act 1: Tavern Beer Keg / Wine Barrel (44x44)
  // ---------------------------------------------------------
  // Barrel bulging body
  gfx.fillStyle(0x451a03, 1);
  gfx.beginPath();
  gfx.moveTo(8, 4);
  drawQuad(gfx, 8, 4, 3, 22, 8, 40, 6);
  gfx.lineTo(36, 40);
  drawQuad(gfx, 36, 40, 41, 22, 36, 4, 6);
  gfx.closePath();
  gfx.fillPath();

  // Wood staves fill
  gfx.fillStyle(0x78350f, 1);
  gfx.fillRect(9, 6, 26, 32);

  // Stave vertical seams
  gfx.lineStyle(1, 0x3d1704, 0.8);
  gfx.strokeLineShape(new Phaser.Geom.Line(16, 5, 15, 39));
  gfx.strokeLineShape(new Phaser.Geom.Line(22, 4, 22, 40));
  gfx.strokeLineShape(new Phaser.Geom.Line(28, 5, 29, 39));

  // Iron hoops
  gfx.fillStyle(0x1c1917, 1);
  gfx.fillRect(6, 8, 32, 4);
  gfx.fillRect(4, 18, 36, 4);
  gfx.fillRect(4, 26, 36, 4);
  gfx.fillRect(6, 34, 32, 4);

  // Brass bung & rivets
  gfx.fillStyle(0xf59e0b, 1);
  gfx.fillCircle(22, 22, 2.5);
  gfx.fillCircle(8, 20, 1.2);
  gfx.fillCircle(36, 20, 1.2);
}

export function drawCrateAct2(gfx: Phaser.GameObjects.Graphics): void {
  // ---------------------------------------------------------
  // Act 2: Waterlogged Canal Fish Crate with Rope Netting (44x44)
  // ---------------------------------------------------------
  // Water-soaked dark timber box
  gfx.fillStyle(0x1c2826, 1);
  gfx.fillRect(4, 4, 36, 36);

  gfx.fillStyle(0x2d3a36, 1);
  gfx.fillRect(6, 6, 32, 32);

  // Horizontal wet planks
  gfx.lineStyle(1.5, 0x131e1c, 0.9);
  gfx.strokeLineShape(new Phaser.Geom.Line(6, 16, 38, 16));
  gfx.strokeLineShape(new Phaser.Geom.Line(6, 27, 38, 27));

  // Criss-cross hemp rope netting
  gfx.lineStyle(2, 0xd97706, 0.95);
  gfx.strokeLineShape(new Phaser.Geom.Line(5, 5, 39, 39));
  gfx.strokeLineShape(new Phaser.Geom.Line(39, 5, 5, 39));
  gfx.strokeLineShape(new Phaser.Geom.Line(5, 22, 39, 22));

  // Green algae / seaweed corner accents
  gfx.fillStyle(0x10b981, 0.85);
  gfx.fillCircle(8, 36, 3.5);
  gfx.fillCircle(35, 8, 3);
}

export function drawCrateAct3(gfx: Phaser.GameObjects.Graphics): void {
  // ---------------------------------------------------------
  // Act 3: Marketplace Burlap Spice Sack (44x44)
  // ---------------------------------------------------------
  // Bulging burlap sack silhouette
  const sackPts: [number, number][] = [
    [22, 4],
    [28, 12],
    [38, 22],
    [36, 38],
    [22, 40],
    [8, 38],
    [6, 22],
    [16, 12],
  ];
  gfx.fillStyle(0x78350f, 1);
  gfx.beginPath();
  drawSmoothClosedSpline(gfx, sackPts);
  gfx.closePath();
  gfx.fillPath();

  gfx.fillStyle(0x92400e, 1);
  gfx.fillCircle(22, 26, 13);

  // Tied rope neck cinch
  gfx.fillStyle(0xf59e0b, 1);
  gfx.fillRect(16, 11, 12, 4);

  // Spilling golden saffron/paprika dust
  gfx.fillStyle(0xfbbf24, 0.95);
  gfx.fillCircle(22, 6, 3.5);
  gfx.fillCircle(32, 35, 3);
  gfx.fillCircle(36, 37, 2);

  // Coarse burlap cross-hatching
  gfx.lineStyle(1, 0x451a03, 0.5);
  gfx.strokeLineShape(new Phaser.Geom.Line(14, 20, 30, 20));
  gfx.strokeLineShape(new Phaser.Geom.Line(12, 28, 32, 28));
}

export function drawCrateAct4(gfx: Phaser.GameObjects.Graphics): void {
  // ---------------------------------------------------------
  // Act 4: Industrial Riveted Steel Container with Caution Stripes (44x44)
  // ---------------------------------------------------------
  // Dark gunmetal steel plate
  gfx.fillStyle(0x18181b, 1);
  gfx.fillRect(4, 4, 36, 36);

  gfx.fillStyle(0x27272a, 1);
  gfx.fillRect(6, 6, 32, 32);

  // Diagonal hazard warning stripes across center band
  gfx.fillStyle(0xeab308, 0.95);
  gfx.fillRect(6, 16, 32, 12);

  gfx.fillStyle(0x09090b, 1);
  gfx.beginPath();
  gfx.moveTo(8, 28);
  gfx.lineTo(14, 28);
  gfx.lineTo(20, 16);
  gfx.lineTo(14, 16);
  gfx.closePath();
  gfx.fillPath();
  gfx.beginPath();
  gfx.moveTo(20, 28);
  gfx.lineTo(26, 28);
  gfx.lineTo(32, 16);
  gfx.lineTo(26, 16);
  gfx.closePath();
  gfx.fillPath();

  // Perimeter riveted steel brackets
  gfx.fillStyle(0x71717a, 1);
  gfx.fillCircle(8, 8, 1.8);
  gfx.fillCircle(36, 8, 1.8);
  gfx.fillCircle(8, 36, 1.8);
  gfx.fillCircle(36, 36, 1.8);

  gfx.lineStyle(1.5, 0x09090b, 1);
  gfx.strokeRect(4, 4, 36, 36);
}

export function drawCrateAct5(gfx: Phaser.GameObjects.Graphics): void {
  // ---------------------------------------------------------
  // Act 5: Sunrise Overlook Polished Mahogany Travel Trunk (44x44)
  // ---------------------------------------------------------
  // Rich polished mahogany body with domed trunk lid
  gfx.fillStyle(0x451a03, 1);
  gfx.fillRect(4, 14, 36, 26);
  gfx.beginPath();
  gfx.moveTo(4, 14);
  drawQuad(gfx, 4, 14, 22, 6, 40, 14, 6);
  gfx.closePath();
  gfx.fillPath();

  gfx.fillStyle(0x78350f, 1);
  gfx.fillRect(6, 16, 32, 22);

  // Gilded brass corner clasps
  gfx.fillStyle(0xfbbf24, 1);
  gfx.fillRect(4, 14, 6, 6);
  gfx.fillRect(34, 14, 6, 6);
  gfx.fillRect(4, 34, 6, 6);
  gfx.fillRect(34, 34, 6, 6);

  // Vertical reinforcing brass straps
  gfx.fillStyle(0xd97706, 1);
  gfx.fillRect(14, 10, 4, 29);
  gfx.fillRect(26, 10, 4, 29);

  // Center ornate lock plate
  gfx.fillStyle(0xfef08a, 1);
  gfx.fillCircle(22, 24, 3);
  gfx.fillStyle(0x18181b, 1);
  gfx.fillRect(21, 24, 2, 3);
}

export function drawPuddleAct1(gfx: Phaser.GameObjects.Graphics): void {
  const puddlePts: [number, number][] = [
    [7, 9],
    [13, 4.5],
    [24, 3],
    [37, 3.5],
    [49, 5.5],
    [55, 9.5],
    [48, 14],
    [35, 15.5],
    [21, 15],
    [11, 13],
  ];

  // ---------------------------------------------------------
  // Act 1: Murky Tavern Rainwater with Amber Glint (60x18)
  // ---------------------------------------------------------
  gfx.fillStyle(0x090a0f, 0.85);
  gfx.beginPath();
  drawSmoothClosedSpline(gfx, puddlePts);
  gfx.closePath();
  gfx.fillPath();

  gfx.fillStyle(0x162032, 0.92);
  gfx.beginPath();
  drawSmoothClosedSpline(gfx, puddlePts, 0, -0.5);
  gfx.closePath();
  gfx.fillPath();

  gfx.fillStyle(0xf59e0b, 0.38);
  gfx.beginPath();
  gfx.moveTo(27, 9);
  drawQuad(gfx, 27, 9, 39, 7.5, 48, 10.5, 8);
  drawQuad(gfx, 48, 10.5, 38, 12, 27, 9, 8);
  gfx.closePath();
  gfx.fillPath();

  gfx.lineStyle(1.5, 0x0f172a, 0.85);
  gfx.beginPath();
  drawSmoothClosedSpline(gfx, puddlePts);
  gfx.closePath();
  gfx.strokePath();
}

export function drawPuddleAct2(gfx: Phaser.GameObjects.Graphics): void {
  const puddlePts: [number, number][] = [
    [7, 9],
    [13, 4.5],
    [24, 3],
    [37, 3.5],
    [49, 5.5],
    [55, 9.5],
    [48, 14],
    [35, 15.5],
    [21, 15],
    [11, 13],
  ];

  // ---------------------------------------------------------
  // Act 2: Canal Brackish Water Spill with Emerald Algae (60x18)
  // ---------------------------------------------------------
  gfx.fillStyle(0x05120e, 0.85);
  gfx.beginPath();
  drawSmoothClosedSpline(gfx, puddlePts);
  gfx.closePath();
  gfx.fillPath();

  gfx.fillStyle(0x0e281e, 0.92);
  gfx.beginPath();
  drawSmoothClosedSpline(gfx, puddlePts, 0, -0.5);
  gfx.closePath();
  gfx.fillPath();

  // Emerald canal algae sheen
  gfx.fillStyle(0x10b981, 0.45);
  gfx.beginPath();
  gfx.moveTo(18, 8);
  drawQuad(gfx, 18, 8, 32, 5.5, 46, 8.5, 8);
  drawQuad(gfx, 46, 8.5, 32, 11, 18, 8, 8);
  gfx.closePath();
  gfx.fillPath();

  gfx.lineStyle(1.5, 0x041f17, 0.85);
  gfx.beginPath();
  drawSmoothClosedSpline(gfx, puddlePts);
  gfx.closePath();
  gfx.strokePath();
}

export function drawPuddleAct3(gfx: Phaser.GameObjects.Graphics): void {
  const puddlePts: [number, number][] = [
    [7, 9],
    [13, 4.5],
    [24, 3],
    [37, 3.5],
    [49, 5.5],
    [55, 9.5],
    [48, 14],
    [35, 15.5],
    [21, 15],
    [11, 13],
  ];

  // ---------------------------------------------------------
  // Act 3: Marketplace Spilled Wine / Spice Dye Puddle (60x18)
  // ---------------------------------------------------------
  gfx.fillStyle(0x1a060b, 0.85);
  gfx.beginPath();
  drawSmoothClosedSpline(gfx, puddlePts);
  gfx.closePath();
  gfx.fillPath();

  // Deep madder / wine core
  gfx.fillStyle(0x3b0716, 0.92);
  gfx.beginPath();
  drawSmoothClosedSpline(gfx, puddlePts, 0, -0.5);
  gfx.closePath();
  gfx.fillPath();

  // Magenta & saffron turmeric oil sheen
  gfx.fillStyle(0xec4899, 0.4);
  gfx.beginPath();
  gfx.moveTo(16, 7);
  drawQuad(gfx, 16, 7, 28, 4.5, 40, 7.5, 8);
  drawQuad(gfx, 40, 7.5, 28, 9.5, 16, 7, 8);
  gfx.closePath();
  gfx.fillPath();

  gfx.fillStyle(0xf59e0b, 0.35);
  gfx.beginPath();
  gfx.moveTo(27, 9);
  drawQuad(gfx, 27, 9, 39, 7.5, 48, 10.5, 8);
  drawQuad(gfx, 48, 10.5, 38, 12, 27, 9, 8);
  gfx.closePath();
  gfx.fillPath();

  gfx.lineStyle(1.5, 0x24040d, 0.85);
  gfx.beginPath();
  drawSmoothClosedSpline(gfx, puddlePts);
  gfx.closePath();
  gfx.strokePath();
}

export function drawPuddleAct4(gfx: Phaser.GameObjects.Graphics): void {
  const puddlePts: [number, number][] = [
    [7, 9],
    [13, 4.5],
    [24, 3],
    [37, 3.5],
    [49, 5.5],
    [55, 9.5],
    [48, 14],
    [35, 15.5],
    [21, 15],
    [11, 13],
  ];

  // ---------------------------------------------------------
  // Act 4: Industrial Machine Oil Sump / Chemical Pool (60x18)
  // ---------------------------------------------------------
  // Jet black motor oil core
  gfx.fillStyle(0x050508, 0.9);
  gfx.beginPath();
  drawSmoothClosedSpline(gfx, puddlePts);
  gfx.closePath();
  gfx.fillPath();

  gfx.fillStyle(0x0f1118, 0.95);
  gfx.beginPath();
  drawSmoothClosedSpline(gfx, puddlePts, 0, -0.5);
  gfx.closePath();
  gfx.fillPath();

  // Iridescent neon cyan and purple toxic fuel sheen
  gfx.fillStyle(0x06b6d4, 0.45);
  gfx.beginPath();
  gfx.moveTo(15, 8);
  drawQuad(gfx, 15, 8, 28, 5, 42, 8, 8);
  drawQuad(gfx, 42, 8, 28, 10, 15, 8, 8);
  gfx.closePath();
  gfx.fillPath();

  gfx.fillStyle(0xc084fc, 0.4);
  gfx.beginPath();
  gfx.moveTo(24, 10);
  drawQuad(gfx, 24, 10, 36, 8, 50, 11, 8);
  drawQuad(gfx, 50, 11, 36, 13, 24, 10, 8);
  gfx.closePath();
  gfx.fillPath();

  gfx.lineStyle(1.5, 0x06070a, 0.85);
  gfx.beginPath();
  drawSmoothClosedSpline(gfx, puddlePts);
  gfx.closePath();
  gfx.strokePath();
}

export function drawPuddleAct5(gfx: Phaser.GameObjects.Graphics): void {
  const puddlePts: [number, number][] = [
    [7, 9],
    [13, 4.5],
    [24, 3],
    [37, 3.5],
    [49, 5.5],
    [55, 9.5],
    [48, 14],
    [35, 15.5],
    [21, 15],
    [11, 13],
  ];

  // ---------------------------------------------------------
  // Act 5: Sunrise Terrace Clear Dew Pool with Dawn Highlights (60x18)
  // ---------------------------------------------------------
  // Crystalline clean water base
  gfx.fillStyle(0x13121d, 0.85);
  gfx.beginPath();
  drawSmoothClosedSpline(gfx, puddlePts);
  gfx.closePath();
  gfx.fillPath();

  gfx.fillStyle(0x1e2436, 0.92);
  gfx.beginPath();
  drawSmoothClosedSpline(gfx, puddlePts, 0, -0.5);
  gfx.closePath();
  gfx.fillPath();

  // Sparkling golden sunrise and rose sky reflection
  gfx.fillStyle(0xfef08a, 0.45);
  gfx.beginPath();
  gfx.moveTo(20, 8);
  drawQuad(gfx, 20, 8, 34, 5.5, 48, 8.5, 8);
  drawQuad(gfx, 48, 8.5, 34, 11, 20, 8, 8);
  gfx.closePath();
  gfx.fillPath();

  gfx.fillStyle(0xf472b6, 0.35);
  gfx.beginPath();
  gfx.moveTo(14, 9);
  drawQuad(gfx, 14, 9, 25, 7, 36, 10, 8);
  drawQuad(gfx, 36, 10, 25, 12, 14, 9, 8);
  gfx.closePath();
  gfx.fillPath();

  gfx.lineStyle(1.5, 0x111625, 0.85);
  gfx.beginPath();
  drawSmoothClosedSpline(gfx, puddlePts);
  gfx.closePath();
  gfx.strokePath();
}
