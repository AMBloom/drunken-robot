import Phaser from 'phaser';
import { drawQuad } from '../primitives.ts';

// Act 5: The Sunrise Overlook — Ornate balconies, cupolas, and open balustrades
export function drawMidgroundAct5(gfx: Phaser.GameObjects.Graphics): void {
  interface OverlookStructure {
    x: number;
    w: number;
    h: number;
    hasCupola?: boolean;
    cupolaW?: number;
    cupolaH?: number;
    balcony?: { xRel: number; yRel: number; w: number; h: number };
    balustrades?: { xRel: number; yRel: number; w: number; h: number };
    windows?: { xRel: number; yRel: number; w: number; h: number; pediment?: 'triangular' | 'rounded' }[];
  }

  const overlookStructures: OverlookStructure[] = [
    {
      x: 0,
      w: 190,
      h: 480,
      balcony: { xRel: 25, yRel: 240, w: 140, h: 22 },
      balustrades: { xRel: 10, yRel: 40, w: 170, h: 18 },
      windows: [
        { xRel: 35, yRel: 120, w: 32, h: 56, pediment: 'triangular' },
        { xRel: 80, yRel: 120, w: 32, h: 56, pediment: 'rounded' },
        { xRel: 125, yRel: 120, w: 32, h: 56, pediment: 'triangular' },
      ],
    },
    {
      x: 185,
      w: 155,
      h: 565,
      hasCupola: true,
      cupolaW: 75,
      cupolaH: 85,
      balcony: { xRel: 20, yRel: 320, w: 115, h: 20 },
    },
    {
      x: 335,
      w: 205,
      h: 470,
      balcony: { xRel: 30, yRel: 230, w: 145, h: 22 },
      balustrades: { xRel: 15, yRel: 35, w: 175, h: 18 },
    },
    {
      x: 535,
      w: 175,
      h: 515,
      hasCupola: true,
      cupolaW: 85,
      cupolaH: 90,
      balcony: { xRel: 25, yRel: 280, w: 125, h: 20 },
    },
    {
      x: 705,
      w: 195,
      h: 455,
      balustrades: { xRel: 15, yRel: 30, w: 165, h: 18 },
      balcony: { xRel: 35, yRel: 210, w: 125, h: 22 },
    },
    {
      x: 895,
      w: 160,
      h: 585,
      hasCupola: true,
      cupolaW: 80,
      cupolaH: 95,
      balcony: { xRel: 25, yRel: 340, w: 110, h: 20 },
    },
    {
      x: 1050,
      w: 200,
      h: 480,
      balcony: { xRel: 35, yRel: 240, w: 130, h: 22 },
      balustrades: { xRel: 15, yRel: 40, w: 170, h: 18 },
    },
    {
      x: 1245,
      w: 170,
      h: 445,
      balustrades: { xRel: 15, yRel: 30, w: 140, h: 18 },
      balcony: { xRel: 25, yRel: 210, w: 120, h: 20 },
    },
    {
      x: 1410,
      w: 185,
      h: 545,
      hasCupola: true,
      cupolaW: 90,
      cupolaH: 90,
      balcony: { xRel: 30, yRel: 300, w: 125, h: 20 },
    },
    {
      x: 1590,
      w: 175,
      h: 465,
      balustrades: { xRel: 15, yRel: 35, w: 145, h: 18 },
      balcony: { xRel: 25, yRel: 225, w: 125, h: 22 },
    },
    {
      x: 1760,
      w: 195,
      h: 520,
      hasCupola: true,
      cupolaW: 85,
      cupolaH: 95,
      balcony: { xRel: 30, yRel: 290, w: 135, h: 20 },
    },
    {
      x: 1950,
      w: 165,
      h: 455,
      balustrades: { xRel: 15, yRel: 35, w: 135, h: 18 },
      balcony: { xRel: 20, yRel: 220, w: 125, h: 20 },
    },
    {
      x: 2110,
      w: 175,
      h: 555,
      hasCupola: true,
      cupolaW: 80,
      cupolaH: 90,
      balcony: { xRel: 25, yRel: 310, w: 125, h: 20 },
    },
    {
      x: 2280,
      w: 285,
      h: 495,
      balustrades: { xRel: 20, yRel: 40, w: 245, h: 20 },
      balcony: { xRel: 40, yRel: 250, w: 205, h: 22 },
    },
  ];

  for (const os of overlookStructures) {
    const topY = 720 - os.h;

    // 1. Facade Base: Elegant Neoclassical / Dawn Rose Sandstone
    gfx.fillGradientStyle(0x3e2837, 0x3e2837, 0x191018, 0x191018, 0.92, 0.92, 1.0, 1.0);
    gfx.beginPath();
    gfx.moveTo(os.x, 720);
    gfx.lineTo(os.x, topY + 40);
    gfx.lineTo(os.x + os.w, topY + 40);
    gfx.lineTo(os.x + os.w, 720);
    gfx.closePath();
    gfx.fillPath();

    // 2. Classical Domed Cupolas with Gilded Finials
    if (os.hasCupola) {
      const cW = os.cupolaW ?? 80;
      const cH = os.cupolaH ?? 85;
      const cXCenter = os.x + os.w / 2;
      const cBaseY = topY + 40;
      const cTopY = cBaseY - cH;

      // Cupola drum / base arcade
      gfx.fillStyle(0x2d1c28, 1);
      gfx.fillRect(cXCenter - cW / 2 + 6, cBaseY - 25, cW - 12, 25);

      // Curved dome profile using drawQuad
      gfx.fillStyle(0xd97706, 0.95);
      gfx.beginPath();
      gfx.moveTo(cXCenter - cW / 2, cBaseY - 25);
      drawQuad(gfx, cXCenter - cW / 2, cBaseY - 25, cXCenter - cW * 0.35, cTopY, cXCenter, cTopY, 8);
      drawQuad(gfx, cXCenter, cTopY, cXCenter + cW * 0.35, cTopY, cXCenter + cW / 2, cBaseY - 25, 8);
      gfx.closePath();
      gfx.fillPath();

      // Gilded pinnacle finial spire
      gfx.fillStyle(0xfbbf24, 1);
      gfx.fillRect(cXCenter - 2, cTopY - 22, 4, 22);
      gfx.fillCircle(cXCenter, cTopY - 22, 4);
    }

    // 3. Rooftop Open Balustrades (Classical Baluster Pillars)
    if (os.balustrades) {
      const bX = os.x + os.balustrades.xRel;
      const bY = topY + os.balustrades.yRel;
      const bW = os.balustrades.w;
      const bH = os.balustrades.h;

      // Top coping rail & bottom base plinth
      gfx.fillStyle(0x4c3343, 1);
      gfx.fillRect(bX, bY, bW, 4);
      gfx.fillRect(bX, bY + bH - 3, bW, 3);

      // Open balusters
      const balusterSpacing = 12;
      gfx.fillStyle(0x6b495f, 1);
      for (let bx = bX + 6; bx < bX + bW - 6; bx += balusterSpacing) {
        gfx.fillRect(bx - 1.5, bY + 4, 3, bH - 7);
        gfx.fillCircle(bx, bY + bH / 2, 2.5);
      }
    }

    // 4. Ornate Cantilevered Wrought-Iron Balconies
    if (os.balcony) {
      const balX = os.x + os.balcony.xRel;
      const balY = topY + os.balcony.yRel;
      const balW = os.balcony.w;
      const balH = os.balcony.h;

      // Balcony cantilever stone base corbels
      gfx.fillStyle(0x2a1725, 1);
      gfx.fillRect(balX - 4, balY + balH - 4, balW + 8, 6);
      gfx.fillRect(balX + 10, balY + balH + 2, 12, 10);
      gfx.fillRect(balX + balW - 22, balY + balH + 2, 12, 10);

      // Ornate wrought-iron filigree railing with scrolls
      gfx.lineStyle(2, 0x18181b, 0.95);
      gfx.strokeRect(balX, balY, balW, balH - 4);

      // Decorative iron balusters & gold-tipped finials
      gfx.fillStyle(0xfbbf24, 0.85);
      for (let ix = balX + 8; ix < balX + balW; ix += 14) {
        gfx.lineStyle(1.5, 0x18181b, 0.9);
        gfx.lineBetween(ix, balY, ix, balY + balH - 4);
        gfx.fillCircle(ix, balY - 1, 2);
      }
    }

    // 5. Windows with classical pediments
    if (os.windows) {
      for (const win of os.windows) {
        const wx = os.x + win.xRel;
        const wy = topY + win.yRel;

        gfx.fillStyle(0xfef08a, 0.92);
        gfx.fillRect(wx, wy, win.w, win.h);

        // Classical pediment above window
        gfx.fillStyle(0x4c3343, 1);
        if (win.pediment === 'triangular') {
          gfx.beginPath();
          gfx.moveTo(wx - 4, wy - 2);
          gfx.lineTo(wx + win.w / 2, wy - 16);
          gfx.lineTo(wx + win.w + 4, wy - 2);
          gfx.closePath();
          gfx.fillPath();
        } else {
          gfx.beginPath();
          gfx.moveTo(wx - 4, wy - 2);
          drawQuad(gfx, wx - 4, wy - 2, wx + win.w / 2, wy - 20, wx + win.w + 4, wy - 2, 6);
          gfx.closePath();
          gfx.fillPath();
        }
      }
    }
  }
}
