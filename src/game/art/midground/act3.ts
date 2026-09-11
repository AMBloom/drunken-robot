import Phaser from 'phaser';
import { bezierCurveTo } from '../primitives.ts';

// Act 3: The Marketplace — Sweeping canvas awnings using bezierCurveTo and market stalls
export function drawMidgroundAct3(gfx: Phaser.GameObjects.Graphics): void {
  interface MarketBuilding {
    x: number;
    w: number;
    h: number;
    roofPeak: number;
    awning: { yRel: number; w: number; h: number; stripe1: number; stripe2: number; sag: number };
    stallShelves?: boolean;
    lanterns?: { xRel: number; yRel: number; color: number }[];
  }

  const marketBuildings: MarketBuilding[] = [
    {
      x: 0,
      w: 180,
      h: 450,
      roofPeak: 70,
      awning: { yRel: 340, w: 165, h: 45, stripe1: 0xb91c1c, stripe2: 0xf59e0b, sag: 18 },
      stallShelves: true,
      lanterns: [
        { xRel: 25, yRel: 330, color: 0xf59e0b },
        { xRel: 145, yRel: 330, color: 0xf97316 },
      ],
    },
    {
      x: 175,
      w: 160,
      h: 420,
      roofPeak: 65,
      awning: { yRel: 320, w: 150, h: 42, stripe1: 0xc2410c, stripe2: 0xfef08a, sag: 16 },
      stallShelves: true,
      lanterns: [{ xRel: 80, yRel: 310, color: 0xfbbf24 }],
    },
    {
      x: 330,
      w: 195,
      h: 490,
      roofPeak: 95,
      awning: { yRel: 360, w: 180, h: 48, stripe1: 0x991b1b, stripe2: 0xf59e0b, sag: 20 },
      stallShelves: true,
      lanterns: [
        { xRel: 35, yRel: 350, color: 0xf59e0b },
        { xRel: 155, yRel: 350, color: 0xfbbf24 },
      ],
    },
    {
      x: 520,
      w: 155,
      h: 410,
      roofPeak: 60,
      awning: { yRel: 300, w: 145, h: 40, stripe1: 0xb45309, stripe2: 0xfef3c7, sag: 15 },
      stallShelves: true,
    },
    {
      x: 670,
      w: 185,
      h: 520,
      roofPeak: 110,
      awning: { yRel: 380, w: 170, h: 46, stripe1: 0x7f1d1d, stripe2: 0xfbbf24, sag: 18 },
      lanterns: [{ xRel: 90, yRel: 360, color: 0xf59e0b }],
    },
    {
      x: 850,
      w: 170,
      h: 440,
      roofPeak: 75,
      awning: { yRel: 330, w: 155, h: 44, stripe1: 0xb91c1c, stripe2: 0xfef08a, sag: 17 },
      stallShelves: true,
    },
    {
      x: 1015,
      w: 190,
      h: 465,
      roofPeak: 80,
      awning: { yRel: 350, w: 175, h: 48, stripe1: 0xc2410c, stripe2: 0xf59e0b, sag: 19 },
      stallShelves: true,
      lanterns: [
        { xRel: 30, yRel: 340, color: 0xf97316 },
        { xRel: 160, yRel: 340, color: 0xfbbf24 },
      ],
    },
    {
      x: 1200,
      w: 160,
      h: 405,
      roofPeak: 60,
      awning: { yRel: 305, w: 145, h: 40, stripe1: 0x991b1b, stripe2: 0xfef3c7, sag: 16 },
      stallShelves: true,
    },
    {
      x: 1355,
      w: 180,
      h: 480,
      roofPeak: 85,
      awning: { yRel: 360, w: 165, h: 45, stripe1: 0xb45309, stripe2: 0xf59e0b, sag: 18 },
      stallShelves: true,
    },
    {
      x: 1530,
      w: 165,
      h: 430,
      roofPeak: 70,
      awning: { yRel: 325, w: 150, h: 42, stripe1: 0xb91c1c, stripe2: 0xfef08a, sag: 17 },
      stallShelves: true,
    },
    {
      x: 1690,
      w: 190,
      h: 510,
      roofPeak: 100,
      awning: { yRel: 375, w: 175, h: 48, stripe1: 0x7f1d1d, stripe2: 0xf59e0b, sag: 20 },
      stallShelves: true,
      lanterns: [
        { xRel: 40, yRel: 360, color: 0xfbbf24 },
        { xRel: 150, yRel: 360, color: 0xf59e0b },
      ],
    },
    {
      x: 1875,
      w: 160,
      h: 415,
      roofPeak: 65,
      awning: { yRel: 310, w: 145, h: 42, stripe1: 0xc2410c, stripe2: 0xfef3c7, sag: 16 },
      stallShelves: true,
    },
    {
      x: 2030,
      w: 185,
      h: 470,
      roofPeak: 80,
      awning: { yRel: 350, w: 170, h: 46, stripe1: 0xb91c1c, stripe2: 0xf59e0b, sag: 18 },
      stallShelves: true,
    },
    {
      x: 2210,
      w: 355,
      h: 460,
      roofPeak: 75,
      awning: { yRel: 345, w: 330, h: 46, stripe1: 0x991b1b, stripe2: 0xfef08a, sag: 19 },
      stallShelves: true,
      lanterns: [
        { xRel: 60, yRel: 330, color: 0xf59e0b },
        { xRel: 280, yRel: 330, color: 0xfbbf24 },
      ],
    },
  ];

  for (const mb of marketBuildings) {
    const topY = 720 - mb.h;

    // 1. Facade Base: Rich terracotta/crimson bazaar wash
    gfx.fillGradientStyle(0x421818, 0x421818, 0x1a0a0a, 0x1a0a0a, 0.92, 0.92, 1.0, 1.0);
    gfx.beginPath();
    gfx.moveTo(mb.x, 720);
    gfx.lineTo(mb.x + 8, topY + mb.roofPeak);
    gfx.lineTo(mb.x + mb.w / 2, topY);
    gfx.lineTo(mb.x + mb.w - 8, topY + mb.roofPeak);
    gfx.lineTo(mb.x + mb.w, 720);
    gfx.closePath();
    gfx.fillPath();

    // 2. Sweeping Canvas Awnings using bezierCurveTo
    const awn = mb.awning;
    const awnX = mb.x + 8;
    const awnY = topY + awn.yRel;
    const awnW = awn.w;
    const awnH = awn.h;

    // Scalloped billowed canvas canopy using bezierCurveTo
    const stripes = 8;
    const stripeW = awnW / stripes;

    for (let s = 0; s < stripes; s++) {
      const sx1 = awnX + s * stripeW;
      const sx2 = sx1 + stripeW;
      const color = s % 2 === 0 ? awn.stripe1 : awn.stripe2;

      gfx.fillStyle(color, 0.95);
      gfx.beginPath();
      gfx.moveTo(sx1, awnY);
      // Top forward slope
      bezierCurveTo(
        gfx,
        sx1,
        awnY,
        sx1 + 4,
        awnY + awnH * 0.4,
        sx1 + stripeW * 0.2,
        awnY + awnH * 0.8,
        sx1,
        awnY + awnH,
        6,
      );
      // Scalloped ruffled bottom hem
      bezierCurveTo(
        gfx,
        sx1,
        awnY + awnH,
        (sx1 + sx2) / 2,
        awnY + awnH + 8,
        (sx1 + sx2) / 2,
        awnY + awnH + 8,
        sx2,
        awnY + awnH,
        6,
      );
      // Back upward slope
      bezierCurveTo(
        gfx,
        sx2,
        awnY + awnH,
        sx2 - stripeW * 0.2,
        awnY + awnH * 0.8,
        sx2 - 4,
        awnY + awnH * 0.4,
        sx2,
        awnY,
        6,
      );
      gfx.closePath();
      gfx.fillPath();
    }

    // Wooden awning support posts
    gfx.lineStyle(2, 0x241008, 0.9);
    gfx.beginPath();
    gfx.moveTo(awnX + 2, awnY + awnH);
    gfx.lineTo(awnX + 2, 580);
    gfx.moveTo(awnX + awnW - 2, awnY + awnH);
    gfx.lineTo(awnX + awnW - 2, 580);
    gfx.strokePath();

    // Market stall counter & merchandise crates underneath awning
    if (mb.stallShelves) {
      gfx.fillStyle(0x27140b, 1);
      gfx.fillRect(awnX + 10, 520, awnW - 20, 55);
      // Display goods / spice baskets
      gfx.fillStyle(0xf59e0b, 0.85);
      gfx.fillCircle(awnX + 25, 515, 8);
      gfx.fillStyle(0xef4444, 0.85);
      gfx.fillCircle(awnX + 50, 515, 7);
      gfx.fillStyle(0x10b981, 0.85);
      gfx.fillCircle(awnX + 75, 515, 8);
    }

    // Hanging paper/brass lanterns
    if (mb.lanterns) {
      for (const lan of mb.lanterns) {
        const lx = mb.x + lan.xRel;
        const ly = topY + lan.yRel;

        gfx.lineStyle(1, 0x18181b, 0.9);
        gfx.beginPath();
        gfx.moveTo(lx, ly - 10);
        gfx.lineTo(lx, ly);
        gfx.strokePath();

        gfx.fillStyle(lan.color, 0.95);
        gfx.fillCircle(lx, ly + 5, 6);
        gfx.fillStyle(lan.color, 0.2);
        gfx.fillCircle(lx, ly + 5, 20);
      }
    }
  }
}
