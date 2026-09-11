import Phaser from 'phaser';
import { traceRoofPath } from '../roofs.ts';
import { drawQuad } from '../primitives.ts';

// Act 1: The Tavern Exit — Steep sagging gables, half-timber beams (Fachwerk), smoking chimneys, tavern signs
export function drawMidgroundAct1(gfx: Phaser.GameObjects.Graphics): void {
  interface WindowDef {
    xRel: number;
    yRel: number;
    w: number;
    h: number;
    arched?: boolean;
    lit: boolean;
    amberTint?: number;
  }

  interface MidBuildingDef {
    name: string;
    x: number;
    w: number;
    h: number;
    roofHeight: number;
    roofType: 'gable' | 'gambrel' | 'mansard' | 'spire' | 'shed' | 'bell';
    sag: number;
    lean: number;
    hasSign?: boolean;
    signText?: string;
    hasLantern?: boolean;
    chimney: { xRel: number; w: number; h: number; style: 'pot' | 'brick' | 'pipe' };
    timberBeams: { x1: number; y1: number; x2: number; y2: number; warp: number }[];
    windows: WindowDef[];
  }

  const midBuildings: MidBuildingDef[] = [
    {
      name: 'The Drunken Accordion Tavern',
      x: 0,
      w: 180,
      h: 445,
      roofHeight: 80,
      roofType: 'gambrel',
      sag: 7,
      lean: -3,
      hasSign: true,
      signText: 'ZINC',
      hasLantern: true,
      chimney: { xRel: 135, w: 22, h: 42, style: 'brick' },
      timberBeams: [
        { x1: 15, y1: 140, x2: 165, y2: 240, warp: 4 },
        { x1: 165, y1: 140, x2: 15, y2: 240, warp: -3 },
        { x1: 12, y1: 250, x2: 168, y2: 250, warp: 3 },
      ],
      windows: [
        { xRel: 24, yRel: 120, w: 32, h: 44, lit: true, amberTint: 0xf59e0b },
        { xRel: 118, yRel: 125, w: 32, h: 44, lit: true, amberTint: 0xfbbf24 },
        { xRel: 22, yRel: 195, w: 34, h: 42, lit: true, amberTint: 0xd97706 },
        { xRel: 72, yRel: 190, w: 34, h: 42, lit: true, amberTint: 0xf59e0b },
        { xRel: 122, yRel: 200, w: 32, h: 42, lit: false },
      ],
    },
    {
      name: 'The Crooked Garret',
      x: 175,
      w: 135,
      h: 485,
      roofHeight: 90,
      roofType: 'gable',
      sag: 9,
      lean: -5,
      chimney: { xRel: 95, w: 16, h: 48, style: 'pipe' },
      timberBeams: [
        { x1: 12, y1: 110, x2: 122, y2: 195, warp: -4 },
        { x1: 122, y1: 110, x2: 12, y2: 195, warp: 5 },
        { x1: 10, y1: 210, x2: 125, y2: 210, warp: 3 },
        { x1: 15, y1: 300, x2: 120, y2: 300, warp: -2 },
      ],
      windows: [
        { xRel: 48, yRel: 115, w: 28, h: 36, arched: true, lit: true, amberTint: 0xfef08a },
        { xRel: 22, yRel: 220, w: 26, h: 38, lit: true, amberTint: 0xf59e0b },
        { xRel: 78, yRel: 225, w: 28, h: 38, lit: false },
        { xRel: 50, yRel: 315, w: 30, h: 42, lit: true, amberTint: 0xd97706 },
      ],
    },
    {
      name: 'The Stepped Gable House',
      x: 305,
      w: 160,
      h: 420,
      roofHeight: 70,
      roofType: 'gable',
      sag: 4,
      lean: 2,
      chimney: { xRel: 25, w: 20, h: 38, style: 'brick' },
      timberBeams: [
        { x1: 15, y1: 160, x2: 145, y2: 160, warp: 3 },
        { x1: 15, y1: 260, x2: 145, y2: 260, warp: -2 },
      ],
      windows: [
        { xRel: 32, yRel: 100, w: 26, h: 36, arched: true, lit: true, amberTint: 0xfbbf24 },
        { xRel: 95, yRel: 100, w: 26, h: 36, arched: true, lit: true, amberTint: 0xf59e0b },
        { xRel: 28, yRel: 180, w: 30, h: 42, lit: true, amberTint: 0xfef08a },
        { xRel: 95, yRel: 182, w: 30, h: 42, lit: false },
        { xRel: 58, yRel: 275, w: 36, h: 48, lit: true, amberTint: 0xd97706 },
      ],
    },
    {
      name: 'The Timber Jetty Inn',
      x: 460,
      w: 195,
      h: 465,
      roofHeight: 85,
      roofType: 'gable',
      sag: 8,
      lean: 4,
      hasLantern: true,
      chimney: { xRel: 145, w: 24, h: 45, style: 'brick' },
      timberBeams: [
        { x1: 10, y1: 110, x2: 185, y2: 220, warp: 5 },
        { x1: 185, y1: 110, x2: 10, y2: 220, warp: -5 },
        { x1: 8, y1: 230, x2: 188, y2: 230, warp: 3 },
        { x1: 20, y1: 320, x2: 175, y2: 320, warp: -3 },
      ],
      windows: [
        { xRel: 30, yRel: 120, w: 30, h: 40, lit: true, amberTint: 0xf59e0b },
        { xRel: 80, yRel: 118, w: 30, h: 40, lit: true, amberTint: 0xfbbf24 },
        { xRel: 130, yRel: 124, w: 30, h: 40, lit: false },
        { xRel: 25, yRel: 240, w: 34, h: 44, lit: true, amberTint: 0xfef08a },
        { xRel: 128, yRel: 245, w: 34, h: 44, lit: true, amberTint: 0xd97706 },
      ],
    },
    {
      name: 'The Clock / Belfry Tower',
      x: 650,
      w: 115,
      h: 540,
      roofHeight: 110,
      roofType: 'spire',
      sag: 3,
      lean: -2,
      chimney: { xRel: 10, w: 12, h: 25, style: 'pipe' },
      timberBeams: [
        { x1: 10, y1: 160, x2: 105, y2: 160, warp: 2 },
        { x1: 10, y1: 280, x2: 105, y2: 280, warp: -2 },
      ],
      windows: [
        { xRel: 38, yRel: 125, w: 38, h: 38, arched: true, lit: true, amberTint: 0xfef08a },
        { xRel: 25, yRel: 200, w: 24, h: 48, arched: true, lit: false },
        { xRel: 65, yRel: 200, w: 24, h: 48, arched: true, lit: false },
        { xRel: 42, yRel: 310, w: 28, h: 40, lit: true, amberTint: 0xf59e0b },
      ],
    },
    {
      name: 'The Mansard Atelier',
      x: 760,
      w: 175,
      h: 435,
      roofHeight: 75,
      roofType: 'mansard',
      sag: 5,
      lean: 3,
      chimney: { xRel: 130, w: 18, h: 40, style: 'pot' },
      timberBeams: [
        { x1: 15, y1: 145, x2: 160, y2: 145, warp: 3 },
        { x1: 15, y1: 245, x2: 160, y2: 245, warp: -3 },
      ],
      windows: [
        { xRel: 65, yRel: 95, w: 42, h: 34, lit: true, amberTint: 0xfef08a },
        { xRel: 25, yRel: 165, w: 32, h: 44, lit: true, amberTint: 0xfbbf24 },
        { xRel: 115, yRel: 168, w: 32, h: 44, lit: true, amberTint: 0xf59e0b },
        { xRel: 70, yRel: 260, w: 36, h: 46, lit: false },
      ],
    },
    {
      name: 'The Bohemian Tenement',
      x: 930,
      w: 165,
      h: 475,
      roofHeight: 80,
      roofType: 'gable',
      sag: 7,
      lean: -4,
      chimney: { xRel: 30, w: 24, h: 44, style: 'pot' },
      timberBeams: [
        { x1: 12, y1: 130, x2: 152, y2: 215, warp: -4 },
        { x1: 152, y1: 130, x2: 12, y2: 215, warp: 4 },
        { x1: 10, y1: 230, x2: 155, y2: 230, warp: 2 },
        { x1: 12, y1: 330, x2: 152, y2: 330, warp: -2 },
      ],
      windows: [
        { xRel: 24, yRel: 140, w: 26, h: 36, lit: true, amberTint: 0xd97706 },
        { xRel: 68, yRel: 135, w: 26, h: 36, lit: true, amberTint: 0xf59e0b },
        { xRel: 112, yRel: 142, w: 26, h: 36, lit: false },
        { xRel: 26, yRel: 240, w: 28, h: 38, lit: false },
        { xRel: 70, yRel: 244, w: 28, h: 38, lit: true, amberTint: 0xfbbf24 },
        { xRel: 114, yRel: 238, w: 28, h: 38, lit: true, amberTint: 0xf59e0b },
      ],
    },
    {
      name: 'The Leaning Gable Workshop',
      x: 1090,
      w: 145,
      h: 445,
      roofHeight: 85,
      roofType: 'gable',
      sag: 9,
      lean: -6,
      hasLantern: true,
      chimney: { xRel: 100, w: 16, h: 36, style: 'pipe' },
      timberBeams: [
        { x1: 10, y1: 125, x2: 135, y2: 125, warp: 3 },
        { x1: 12, y1: 220, x2: 132, y2: 310, warp: -4 },
      ],
      windows: [
        { xRel: 52, yRel: 135, w: 34, h: 42, lit: true, amberTint: 0xfef08a },
        { xRel: 22, yRel: 230, w: 28, h: 38, lit: true, amberTint: 0xf59e0b },
        { xRel: 88, yRel: 235, w: 28, h: 38, lit: false },
      ],
    },
    {
      name: 'The Archway House',
      x: 1230,
      w: 185,
      h: 450,
      roofHeight: 75,
      roofType: 'gable',
      sag: 6,
      lean: 2,
      hasSign: true,
      signText: 'VINS',
      chimney: { xRel: 135, w: 22, h: 40, style: 'brick' },
      timberBeams: [
        { x1: 15, y1: 140, x2: 170, y2: 140, warp: 3 },
        { x1: 15, y1: 240, x2: 170, y2: 240, warp: -2 },
      ],
      windows: [
        { xRel: 30, yRel: 150, w: 32, h: 42, lit: true, amberTint: 0xfbbf24 },
        { xRel: 78, yRel: 146, w: 32, h: 42, lit: true, amberTint: 0xfef08a },
        { xRel: 124, yRel: 152, w: 32, h: 42, lit: true, amberTint: 0xd97706 },
      ],
    },
    {
      name: 'The Apothecary',
      x: 1410,
      w: 140,
      h: 465,
      roofHeight: 85,
      roofType: 'gable',
      sag: 7,
      lean: 3,
      chimney: { xRel: 25, w: 20, h: 46, style: 'brick' },
      timberBeams: [
        { x1: 12, y1: 120, x2: 128, y2: 205, warp: 4 },
        { x1: 128, y1: 120, x2: 12, y2: 205, warp: -4 },
        { x1: 10, y1: 220, x2: 130, y2: 220, warp: 2 },
      ],
      windows: [
        { xRel: 48, yRel: 110, w: 32, h: 38, arched: true, lit: true, amberTint: 0x10b981 },
        { xRel: 24, yRel: 235, w: 28, h: 40, lit: true, amberTint: 0xf59e0b },
        { xRel: 82, yRel: 238, w: 28, h: 40, lit: true, amberTint: 0xfbbf24 },
      ],
    },
    {
      name: 'The Weathered Granary',
      x: 1545,
      w: 175,
      h: 395,
      roofHeight: 65,
      roofType: 'shed',
      sag: 8,
      lean: -3,
      chimney: { xRel: 120, w: 16, h: 32, style: 'pipe' },
      timberBeams: [
        { x1: 15, y1: 110, x2: 160, y2: 110, warp: 4 },
        { x1: 15, y1: 200, x2: 160, y2: 200, warp: -3 },
        { x1: 20, y1: 115, x2: 155, y2: 280, warp: 3 },
      ],
      windows: [
        { xRel: 35, yRel: 125, w: 30, h: 34, lit: false },
        { xRel: 105, yRel: 130, w: 30, h: 34, lit: true, amberTint: 0xd97706 },
      ],
    },
    {
      name: 'The Conical Turret Villa',
      x: 1715,
      w: 160,
      h: 480,
      roofHeight: 95,
      roofType: 'spire',
      sag: 5,
      lean: 2,
      hasLantern: true,
      chimney: { xRel: 25, w: 18, h: 42, style: 'pot' },
      timberBeams: [
        { x1: 12, y1: 150, x2: 148, y2: 150, warp: 2 },
        { x1: 12, y1: 250, x2: 148, y2: 250, warp: -3 },
      ],
      windows: [
        { xRel: 35, yRel: 165, w: 28, h: 40, arched: true, lit: true, amberTint: 0xfef08a },
        { xRel: 95, yRel: 165, w: 28, h: 40, arched: true, lit: true, amberTint: 0xf59e0b },
        { xRel: 40, yRel: 270, w: 30, h: 42, lit: false },
        { xRel: 98, yRel: 272, w: 30, h: 42, lit: true, amberTint: 0xfbbf24 },
      ],
    },
    {
      name: 'The Twin Gable Duplex',
      x: 1870,
      w: 185,
      h: 455,
      roofHeight: 80,
      roofType: 'gable',
      sag: 7,
      lean: -2,
      chimney: { xRel: 85, w: 22, h: 46, style: 'brick' },
      timberBeams: [
        { x1: 15, y1: 135, x2: 170, y2: 135, warp: 3 },
        { x1: 15, y1: 235, x2: 170, y2: 235, warp: -2 },
      ],
      windows: [
        { xRel: 25, yRel: 145, w: 26, h: 36, lit: true, amberTint: 0xf59e0b },
        { xRel: 60, yRel: 145, w: 26, h: 36, lit: false },
        { xRel: 105, yRel: 142, w: 26, h: 36, lit: true, amberTint: 0xfbbf24 },
        { xRel: 140, yRel: 142, w: 26, h: 36, lit: true, amberTint: 0xd97706 },
      ],
    },
    {
      name: "The Bookbinder's Shanty",
      x: 2050,
      w: 140,
      h: 430,
      roofHeight: 70,
      roofType: 'shed',
      sag: 8,
      lean: 5,
      chimney: { xRel: 95, w: 14, h: 36, style: 'pipe' },
      timberBeams: [
        { x1: 10, y1: 120, x2: 125, y2: 210, warp: -3 },
        { x1: 125, y1: 120, x2: 10, y2: 210, warp: 4 },
      ],
      windows: [
        { xRel: 42, yRel: 130, w: 32, h: 38, lit: true, amberTint: 0xfef08a },
        { xRel: 35, yRel: 235, w: 30, h: 40, lit: true, amberTint: 0xf59e0b },
      ],
    },
    {
      name: 'The Old Bell Gable Cottage',
      x: 2185,
      w: 170,
      h: 440,
      roofHeight: 75,
      roofType: 'bell',
      sag: 6,
      lean: -2,
      hasSign: true,
      signText: 'CAFE',
      chimney: { xRel: 25, w: 20, h: 40, style: 'pot' },
      timberBeams: [
        { x1: 15, y1: 145, x2: 155, y2: 145, warp: 3 },
        { x1: 15, y1: 245, x2: 155, y2: 245, warp: -2 },
      ],
      windows: [
        { xRel: 72, yRel: 100, w: 26, h: 26, arched: true, lit: true, amberTint: 0xfef08a },
        { xRel: 28, yRel: 165, w: 32, h: 42, lit: true, amberTint: 0xfbbf24 },
        { xRel: 110, yRel: 168, w: 32, h: 42, lit: true, amberTint: 0xf59e0b },
      ],
    },
    {
      name: 'The Riverside Watchpost',
      x: 2350,
      w: 215,
      h: 490,
      roofHeight: 90,
      roofType: 'spire',
      sag: 4,
      lean: 2,
      hasLantern: true,
      chimney: { xRel: 170, w: 22, h: 42, style: 'brick' },
      timberBeams: [
        { x1: 15, y1: 150, x2: 195, y2: 150, warp: 3 },
        { x1: 15, y1: 260, x2: 195, y2: 260, warp: -3 },
      ],
      windows: [
        { xRel: 40, yRel: 165, w: 30, h: 42, arched: true, lit: true, amberTint: 0xf59e0b },
        { xRel: 135, yRel: 165, w: 30, h: 42, arched: true, lit: true, amberTint: 0xfef08a },
        { xRel: 88, yRel: 275, w: 34, h: 46, lit: true, amberTint: 0xd97706 },
      ],
    },
  ];

  for (const mb of midBuildings) {
    const bTop = 720 - mb.h;
    const roofPeakY = bTop;
    const eaveY = bTop + mb.roofHeight;
    const peakX = mb.x + mb.w / 2 + mb.lean;
    const leftEaveX = mb.x + 6 + mb.lean * 0.7;
    const rightEaveX = mb.x + mb.w - 6 + mb.lean * 0.7;

    gfx.fillGradientStyle(0x382c23, 0x382c23, 0x140e0a, 0x140e0a, 0.92, 0.92, 1.0, 1.0);
    gfx.beginPath();
    gfx.moveTo(mb.x, 720);
    gfx.lineTo(leftEaveX, eaveY);

    traceRoofPath(gfx, mb, { leftEaveX, rightEaveX, eaveY, peakX, roofPeakY }, true);

    gfx.lineTo(mb.x + mb.w, 720);
    gfx.closePath();
    gfx.fillPath();

    gfx.fillGradientStyle(0x18120e, 0x18120e, 0x0c0806, 0x0c0806, 0, 0, 0.55, 0.55);
    gfx.fillRect(mb.x, 640, mb.w, 80);

    gfx.lineStyle(3.5, 0x140e0b, 0.95);
    gfx.beginPath();
    gfx.moveTo(leftEaveX, eaveY);
    traceRoofPath(gfx, mb, { leftEaveX, rightEaveX, eaveY, peakX, roofPeakY }, false);
    gfx.strokePath();

    const chX = mb.x + mb.chimney.xRel;
    const chY = roofPeakY - mb.chimney.h + 15;
    gfx.fillStyle(0x1a130f, 1);
    gfx.fillRect(chX, chY, mb.chimney.w, mb.chimney.h);

    if (mb.chimney.style === 'brick') {
      gfx.fillStyle(0x120d0a, 1);
      gfx.fillRect(chX - 3, chY - 4, mb.chimney.w + 6, 6);
    } else if (mb.chimney.style === 'pot') {
      gfx.fillStyle(0x5c2b09, 1);
      gfx.fillRect(chX + 2, chY - 8, 6, 8);
      gfx.fillRect(chX + mb.chimney.w - 8, chY - 8, 6, 8);
    } else {
      gfx.fillStyle(0x0a0c10, 1);
      gfx.fillRect(chX - 2, chY - 5, mb.chimney.w + 4, 4);
    }

    gfx.fillStyle(0x475569, 0.08);
    gfx.fillCircle(chX + mb.chimney.w / 2 + 6, chY - 14, 8);
    gfx.fillStyle(0x475569, 0.05);
    gfx.fillCircle(chX + mb.chimney.w / 2 + 16, chY - 28, 13);
    gfx.fillStyle(0x475569, 0.03);
    gfx.fillCircle(chX + mb.chimney.w / 2 + 30, chY - 45, 18);

    for (const beam of mb.timberBeams) {
      const bx1 = mb.x + beam.x1;
      const by1 = bTop + beam.y1;
      const bx2 = mb.x + beam.x2;
      const by2 = bTop + beam.y2;
      const midBX = (bx1 + bx2) / 2;
      const midBY = (by1 + by2) / 2 + beam.warp;

      gfx.lineStyle(2.5, 0x181310, 0.88);
      gfx.beginPath();
      gfx.moveTo(bx1, by1);
      drawQuad(gfx, bx1, by1, midBX, midBY, bx2, by2, 8);
      gfx.strokePath();
    }

    for (const win of mb.windows) {
      const wx = mb.x + win.xRel;
      const wy = bTop + win.yRel;

      gfx.fillStyle(0x110d0a, 0.95);
      if (win.arched) {
        gfx.fillRect(wx - 2, wy + win.w / 2 - 2, win.w + 4, win.h - win.w / 2 + 4);
        gfx.fillCircle(wx + win.w / 2, wy + win.w / 2, win.w / 2 + 2);
      } else {
        gfx.fillRect(wx - 3, wy - 3, win.w + 6, win.h + 6);
      }

      if (win.lit) {
        const amberColor = win.amberTint ?? 0xf59e0b;
        gfx.fillStyle(amberColor, 0.95);
        if (win.arched) {
          gfx.fillRect(wx, wy + win.w / 2, win.w, win.h - win.w / 2);
          gfx.fillCircle(wx + win.w / 2, wy + win.w / 2, win.w / 2);
        } else {
          gfx.fillRect(wx, wy, win.w, win.h);
        }

        gfx.fillStyle(amberColor, 0.12);
        gfx.fillCircle(wx + win.w / 2, wy + win.h / 2, Math.max(win.w, win.h) * 0.85);

        gfx.fillStyle(0x1c1511, 0.95);
        gfx.fillRect(wx + Math.floor(win.w / 2) - 1, wy, 2, win.h);
        gfx.fillRect(wx, wy + Math.floor(win.h / 2) - 1, win.w, 2);
      } else {
        gfx.fillStyle(0x1c1714, 0.95);
        if (win.arched) {
          gfx.fillRect(wx, wy + win.w / 2, win.w, win.h - win.w / 2);
          gfx.fillCircle(wx + win.w / 2, wy + win.w / 2, win.w / 2);
        } else {
          gfx.fillRect(wx, wy, win.w, win.h);
        }
        gfx.fillStyle(0x120d0a, 0.8);
        gfx.fillRect(wx + Math.floor(win.w / 2) - 1, wy, 2, win.h);
      }
    }

    if (mb.hasSign) {
      const signX = mb.x + mb.w - 38;
      const signY = bTop + mb.roofHeight + 85;

      gfx.lineStyle(2, 0x111113, 0.95);
      gfx.beginPath();
      gfx.moveTo(signX - 8, signY);
      gfx.lineTo(signX + 34, signY);
      gfx.strokePath();

      gfx.fillStyle(0x5c2b09, 1);
      gfx.fillRect(signX - 4, signY + 3, 36, 22);
      gfx.fillStyle(0xfbbf24, 0.95);
      gfx.fillRect(signX, signY + 7, 28, 14);

      gfx.fillStyle(0x451a03, 1);
      gfx.fillRect(signX + 4, signY + 12, 20, 4);
    }

    if (mb.hasLantern) {
      const lanX = mb.x + 14;
      const lanY = bTop + mb.roofHeight + 95;

      gfx.lineStyle(1.5, 0x18181b, 1);
      gfx.beginPath();
      gfx.moveTo(mb.x, lanY - 8);
      gfx.lineTo(lanX + 4, lanY - 8);
      gfx.lineTo(lanX + 4, lanY);
      gfx.strokePath();

      gfx.fillStyle(0x090a0f, 1);
      gfx.fillRect(lanX, lanY, 9, 13);
      gfx.fillStyle(0xfef08a, 0.95);
      gfx.fillRect(lanX + 1.5, lanY + 2, 6, 8);

      gfx.fillStyle(0xf59e0b, 0.22);
      gfx.fillCircle(lanX + 4.5, lanY + 6, 24);
      gfx.fillStyle(0xf59e0b, 0.08);
      gfx.fillCircle(lanX + 4.5, lanY + 6, 48);
    }
  }
}
