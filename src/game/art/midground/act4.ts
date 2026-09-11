import Phaser from 'phaser';

// Act 4: The Industrial Noir — Tall narrow factory smokestacks and riveted iron cross-braces
export function drawMidgroundAct4(gfx: Phaser.GameObjects.Graphics): void {
  interface IndustrialStructure {
    type: 'factory' | 'smokestack' | 'tower' | 'viaduct';
    x: number;
    w: number;
    h: number;
    smokestackH?: number;
    crossBraces?: { xRel: number; yRel: number; w: number; h: number }[];
    sawtoothBays?: number;
  }

  const industrialStructures: IndustrialStructure[] = [
    {
      type: 'factory',
      x: 0,
      w: 180,
      h: 470,
      sawtoothBays: 2,
      crossBraces: [
        { xRel: 20, yRel: 180, w: 60, h: 65 },
        { xRel: 100, yRel: 180, w: 60, h: 65 },
      ],
    },
    {
      type: 'smokestack',
      x: 180,
      w: 130,
      h: 580,
      smokestackH: 580,
    },
    {
      type: 'factory',
      x: 310,
      w: 200,
      h: 450,
      sawtoothBays: 3,
      crossBraces: [
        { xRel: 25, yRel: 160, w: 70, h: 70 },
        { xRel: 105, yRel: 160, w: 70, h: 70 },
      ],
    },
    {
      type: 'tower',
      x: 510,
      w: 170,
      h: 520,
      crossBraces: [
        { xRel: 20, yRel: 120, w: 130, h: 90 },
        { xRel: 20, yRel: 230, w: 130, h: 90 },
      ],
    },
    {
      type: 'factory',
      x: 680,
      w: 155,
      h: 430,
      crossBraces: [{ xRel: 25, yRel: 150, w: 105, h: 75 }],
    },
    {
      type: 'smokestack',
      x: 835,
      w: 135,
      h: 590,
      smokestackH: 590,
    },
    {
      type: 'factory',
      x: 970,
      w: 210,
      h: 485,
      crossBraces: [
        { xRel: 30, yRel: 170, w: 70, h: 75 },
        { xRel: 110, yRel: 170, w: 70, h: 75 },
      ],
    },
    {
      type: 'factory',
      x: 1180,
      w: 160,
      h: 440,
      crossBraces: [{ xRel: 20, yRel: 140, w: 120, h: 70 }],
    },
    {
      type: 'tower',
      x: 1340,
      w: 190,
      h: 525,
      crossBraces: [
        { xRel: 25, yRel: 140, w: 140, h: 95 },
        { xRel: 25, yRel: 255, w: 140, h: 95 },
      ],
    },
    {
      type: 'smokestack',
      x: 1530,
      w: 130,
      h: 575,
      smokestackH: 575,
    },
    {
      type: 'factory',
      x: 1660,
      w: 200,
      h: 460,
      sawtoothBays: 3,
      crossBraces: [
        { xRel: 25, yRel: 170, w: 70, h: 70 },
        { xRel: 105, yRel: 170, w: 70, h: 70 },
      ],
    },
    {
      type: 'factory',
      x: 1860,
      w: 165,
      h: 505,
      crossBraces: [{ xRel: 20, yRel: 160, w: 125, h: 80 }],
    },
    {
      type: 'factory',
      x: 2025,
      w: 175,
      h: 445,
      crossBraces: [{ xRel: 25, yRel: 150, w: 125, h: 75 }],
    },
    {
      type: 'viaduct',
      x: 2200,
      w: 365,
      h: 495,
      crossBraces: [
        { xRel: 30, yRel: 180, w: 90, h: 85 },
        { xRel: 140, yRel: 180, w: 90, h: 85 },
        { xRel: 250, yRel: 180, w: 90, h: 85 },
      ],
    },
  ];

  for (const ind of industrialStructures) {
    const topY = 720 - ind.h;

    // Dark soot iron/brick wash
    gfx.fillGradientStyle(0x212530, 0x212530, 0x0c0e14, 0x0c0e14, 0.95, 0.95, 1.0, 1.0);

    if (ind.type === 'smokestack') {
      // Tall, narrow tapering industrial smokestack
      const stackWBase = 36;
      const stackWTop = 24;
      const stackXCenter = ind.x + ind.w / 2;
      const stackTopY = 720 - (ind.smokestackH ?? 580);

      // Smokestack body
      gfx.beginPath();
      gfx.moveTo(stackXCenter - stackWBase / 2, 720);
      gfx.lineTo(stackXCenter - stackWTop / 2, stackTopY);
      gfx.lineTo(stackXCenter + stackWTop / 2, stackTopY);
      gfx.lineTo(stackXCenter + stackWBase / 2, 720);
      gfx.closePath();
      gfx.fillPath();

      // Corbelled iron rim cap at top
      gfx.fillStyle(0x0e1017, 1);
      gfx.fillRect(stackXCenter - stackWTop / 2 - 4, stackTopY - 6, stackWTop + 8, 8);

      // Iron reinforcement banding rings
      gfx.fillStyle(0x181a22, 1);
      for (let ringY = stackTopY + 45; ringY < 680; ringY += 55) {
        const t = (ringY - stackTopY) / (720 - stackTopY);
        const currW = stackWTop + (stackWBase - stackWTop) * t;
        gfx.fillRect(stackXCenter - currW / 2 - 2, ringY, currW + 4, 4);
      }

      // Billowing dark industrial smoke clouds
      gfx.fillStyle(0x18181b, 0.25);
      gfx.fillCircle(stackXCenter + 12, stackTopY - 18, 16);
      gfx.fillStyle(0x27272a, 0.18);
      gfx.fillCircle(stackXCenter + 28, stackTopY - 36, 26);
      gfx.fillStyle(0x3f3f46, 0.12);
      gfx.fillCircle(stackXCenter + 52, stackTopY - 58, 38);
    } else {
      // Factory Building with Sawtooth roof or industrial parapet
      gfx.beginPath();
      gfx.moveTo(ind.x, 720);

      if (ind.sawtoothBays) {
        // Sawtooth roofline with vertical skylights
        const bayW = ind.w / ind.sawtoothBays;
        for (let b = 0; b < ind.sawtoothBays; b++) {
          const bx = ind.x + b * bayW;
          gfx.lineTo(bx, topY + 45);
          gfx.lineTo(bx + bayW * 0.75, topY);
          gfx.lineTo(bx + bayW, topY + 45);
        }
      } else {
        gfx.lineTo(ind.x, topY);
        gfx.lineTo(ind.x + ind.w, topY);
      }

      gfx.lineTo(ind.x + ind.w, 720);
      gfx.closePath();
      gfx.fillPath();

      // Industrial cross-bracing (riveted steel X-braces)
      if (ind.crossBraces) {
        for (const cb of ind.crossBraces) {
          const cbx = ind.x + cb.xRel;
          const cby = topY + cb.yRel;

          // Recessed bay window frame
          gfx.fillStyle(0x0e1017, 0.95);
          gfx.fillRect(cbx, cby, cb.w, cb.h);

          // Cold electric cyan / purple industrial window glow
          gfx.fillStyle(0x06b6d4, 0.2);
          gfx.fillRect(cbx + 3, cby + 3, cb.w - 6, cb.h - 6);

          // Riveted Iron X-Cross-Braces
          gfx.lineStyle(3, 0x27272a, 1);
          gfx.beginPath();
          gfx.moveTo(cbx, cby);
          gfx.lineTo(cbx + cb.w, cby + cb.h);
          gfx.moveTo(cbx + cb.w, cby);
          gfx.lineTo(cbx, cby + cb.h);
          gfx.strokePath();

          // Rivet plates at corners and center intersection
          gfx.fillStyle(0x52525b, 1);
          gfx.fillCircle(cbx + cb.w / 2, cby + cb.h / 2, 4);
          gfx.fillCircle(cbx + 4, cby + 4, 2.5);
          gfx.fillCircle(cbx + cb.w - 4, cby + 4, 2.5);
          gfx.fillCircle(cbx + 4, cby + cb.h - 4, 2.5);
          gfx.fillCircle(cbx + cb.w - 4, cby + cb.h - 4, 2.5);
        }
      }
    }
  }
}
