import Phaser from 'phaser';
import { drawQuad } from '../primitives.ts';

// Act 2: The Crooked Canals — Venetian arched stone bridges spanning water gaps, flat docks with mooring poles, canal palazzos
export function drawMidgroundAct2(gfx: Phaser.GameObjects.Graphics): void {
  interface CanalStructure {
    type: 'palazzo' | 'bridge' | 'dock' | 'tower';
    x: number;
    w: number;
    h: number;
    roofType?: 'venetian_gable' | 'campanile' | 'terrace' | 'mansard';
    bridgeArch?: { archW: number; archH: number };
    dockPosts?: number[];
    windows?: { xRel: number; yRel: number; w: number; h: number; trefoil?: boolean; lit: boolean }[];
  }

  const canalStructures: CanalStructure[] = [
    {
      type: 'palazzo',
      x: 0,
      w: 185,
      h: 465,
      roofType: 'venetian_gable',
      windows: [
        { xRel: 28, yRel: 130, w: 26, h: 48, trefoil: true, lit: true },
        { xRel: 72, yRel: 130, w: 26, h: 48, trefoil: true, lit: true },
        { xRel: 118, yRel: 130, w: 26, h: 48, trefoil: true, lit: false },
        { xRel: 45, yRel: 240, w: 32, h: 44, trefoil: false, lit: true },
        { xRel: 105, yRel: 240, w: 32, h: 44, trefoil: false, lit: false },
      ],
    },
    {
      type: 'bridge',
      x: 180,
      w: 175,
      h: 360,
      bridgeArch: { archW: 110, archH: 65 },
    },
    {
      type: 'dock',
      x: 350,
      w: 190,
      h: 430,
      dockPosts: [30, 85, 145],
    },
    {
      type: 'tower',
      x: 535,
      w: 155,
      h: 520,
      roofType: 'campanile',
    },
    {
      type: 'palazzo',
      x: 685,
      w: 195,
      h: 445,
      roofType: 'terrace',
      windows: [
        { xRel: 30, yRel: 140, w: 24, h: 42, trefoil: true, lit: false },
        { xRel: 75, yRel: 140, w: 24, h: 42, trefoil: true, lit: true },
        { xRel: 125, yRel: 140, w: 24, h: 42, trefoil: true, lit: true },
      ],
    },
    {
      type: 'bridge',
      x: 875,
      w: 170,
      h: 370,
      bridgeArch: { archW: 105, archH: 70 },
    },
    {
      type: 'palazzo',
      x: 1040,
      w: 195,
      h: 480,
      roofType: 'venetian_gable',
      windows: [
        { xRel: 35, yRel: 120, w: 28, h: 48, trefoil: true, lit: true },
        { xRel: 80, yRel: 120, w: 28, h: 48, trefoil: true, lit: true },
        { xRel: 125, yRel: 120, w: 28, h: 48, trefoil: true, lit: false },
      ],
    },
    {
      type: 'dock',
      x: 1230,
      w: 175,
      h: 425,
      dockPosts: [25, 75, 135],
    },
    {
      type: 'tower',
      x: 1400,
      w: 160,
      h: 530,
      roofType: 'campanile',
    },
    {
      type: 'bridge',
      x: 1555,
      w: 180,
      h: 365,
      bridgeArch: { archW: 115, archH: 60 },
    },
    {
      type: 'palazzo',
      x: 1730,
      w: 190,
      h: 450,
      roofType: 'terrace',
      windows: [
        { xRel: 32, yRel: 135, w: 26, h: 44, trefoil: true, lit: true },
        { xRel: 82, yRel: 135, w: 26, h: 44, trefoil: true, lit: false },
        { xRel: 132, yRel: 135, w: 26, h: 44, trefoil: true, lit: true },
      ],
    },
    {
      type: 'palazzo',
      x: 1915,
      w: 170,
      h: 475,
      roofType: 'venetian_gable',
      windows: [
        { xRel: 30, yRel: 145, w: 30, h: 46, trefoil: true, lit: true },
        { xRel: 95, yRel: 145, w: 30, h: 46, trefoil: true, lit: false },
      ],
    },
    {
      type: 'dock',
      x: 2080,
      w: 180,
      h: 430,
      dockPosts: [35, 90, 145],
    },
    {
      type: 'palazzo',
      x: 2255,
      w: 310,
      h: 465,
      roofType: 'terrace',
      windows: [
        { xRel: 40, yRel: 130, w: 28, h: 48, trefoil: true, lit: true },
        { xRel: 95, yRel: 130, w: 28, h: 48, trefoil: true, lit: true },
        { xRel: 150, yRel: 130, w: 28, h: 48, trefoil: true, lit: false },
        { xRel: 215, yRel: 130, w: 28, h: 48, trefoil: true, lit: true },
      ],
    },
  ];

  for (const cs of canalStructures) {
    const topY = 720 - cs.h;

    // Deep waterlogged moss-green stone gradient
    gfx.fillGradientStyle(0x1a332d, 0x1a332d, 0x0c1c17, 0x0c1c17, 0.92, 0.92, 1.0, 1.0);

    if (cs.type === 'bridge') {
      const arch = cs.bridgeArch ?? { archW: 100, archH: 60 };
      const bridgeArchLeft = cs.x + (cs.w - arch.archW) / 2;
      const bridgeArchRight = bridgeArchLeft + arch.archW;
      const archCenterY = 640 - arch.archH;

      // 1. Dark Water Canal Cut beneath the bridge
      gfx.fillStyle(0x061118, 1);
      gfx.fillRect(cs.x, 560, cs.w, 160);

      // Water reflection wash
      gfx.fillStyle(0x10b981, 0.15);
      gfx.fillRect(cs.x + 8, 620, cs.w - 16, 25);

      // 2. Venetian Humpback Stone Bridge Body
      gfx.fillGradientStyle(0x2d4a3e, 0x2d4a3e, 0x162a22, 0x162a22, 0.95, 0.95, 1.0, 1.0);
      gfx.beginPath();
      gfx.moveTo(cs.x, 720);
      gfx.lineTo(cs.x, 570);
      // Humpback crest curve
      drawQuad(gfx, cs.x, 570, cs.x + cs.w / 2, 510, cs.x + cs.w, 570, 10);
      gfx.lineTo(cs.x + cs.w, 720);
      gfx.lineTo(bridgeArchRight, 640);
      // Curved under-arch
      drawQuad(gfx, bridgeArchRight, 640, cs.x + cs.w / 2, archCenterY, bridgeArchLeft, 640, 10);
      gfx.lineTo(cs.x, 720);
      gfx.closePath();
      gfx.fillPath();

      // 3. Stone Balustrade on Bridge Crest
      gfx.lineStyle(3, 0x0f1c16, 0.95);
      gfx.beginPath();
      gfx.moveTo(cs.x, 570);
      drawQuad(gfx, cs.x, 570, cs.x + cs.w / 2, 510, cs.x + cs.w, 570, 10);
      gfx.strokePath();

      // Keystone block at apex of bridge arch
      gfx.fillStyle(0x3e5f50, 1);
      gfx.fillRect(cs.x + cs.w / 2 - 8, archCenterY - 6, 16, 14);
    } else if (cs.type === 'dock') {
      // Flat dock warehouse with timber decking
      gfx.beginPath();
      gfx.moveTo(cs.x, 720);
      gfx.lineTo(cs.x, topY + 40);
      gfx.lineTo(cs.x + cs.w / 2, topY);
      gfx.lineTo(cs.x + cs.w, topY + 40);
      gfx.lineTo(cs.x + cs.w, 720);
      gfx.closePath();
      gfx.fillPath();

      // Flat wooden dock stage at water edge (y = 560 to 585)
      gfx.fillStyle(0x382415, 1);
      gfx.fillRect(cs.x - 4, 565, cs.w + 8, 16);
      gfx.fillStyle(0x78350f, 0.85);
      gfx.fillRect(cs.x - 2, 565, cs.w + 4, 3);

      // Mooring Posts (Briccole: wooden poles with spiral rope wrap)
      if (cs.dockPosts) {
        for (const postXRel of cs.dockPosts) {
          const px = cs.x + postXRel;
          gfx.fillStyle(0x27170b, 1);
          gfx.fillRect(px, 510, 8, 85);
          // Spiral rope binding
          gfx.lineStyle(1.5, 0xd97706, 0.85);
          gfx.beginPath();
          gfx.moveTo(px - 1, 528);
          gfx.lineTo(px + 9, 532);
          gfx.moveTo(px - 1, 538);
          gfx.lineTo(px + 9, 542);
          gfx.moveTo(px - 1, 548);
          gfx.lineTo(px + 9, 552);
          gfx.strokePath();
        }
      }

      // Arched water boathouse door
      gfx.fillStyle(0x0a1410, 1);
      gfx.fillRect(cs.x + 35, 470, cs.w - 70, 95);
      gfx.fillCircle(cs.x + cs.w / 2, 470, (cs.w - 70) / 2);
    } else if (cs.type === 'tower') {
      // Tall Venetian Campanile (Bell Tower)
      gfx.fillRect(cs.x, topY, cs.w, cs.h);

      // Pyramidal copper spire roof with verdigris patina
      gfx.fillStyle(0x10b981, 0.95);
      gfx.beginPath();
      gfx.moveTo(cs.x - 4, topY);
      gfx.lineTo(cs.x + cs.w / 2, topY - 75);
      gfx.lineTo(cs.x + cs.w + 4, topY);
      gfx.closePath();
      gfx.fillPath();

      // Open belfry arcade
      gfx.fillStyle(0x091410, 1);
      gfx.fillRect(cs.x + 18, topY + 25, cs.w - 36, 50);
      gfx.fillCircle(cs.x + cs.w / 2, topY + 25, (cs.w - 36) / 2);

      // Hanging bronze bell silhouette
      gfx.fillStyle(0xd97706, 0.8);
      gfx.fillCircle(cs.x + cs.w / 2, topY + 45, 10);
    } else {
      // Palazzo facade with Venetian pointed / trefoil windows
      gfx.beginPath();
      gfx.moveTo(cs.x, 720);
      gfx.lineTo(cs.x, topY + 30);

      if (cs.roofType === 'venetian_gable') {
        // Venetian Gothic stepped or crest roof
        gfx.lineTo(cs.x + 20, topY + 30);
        gfx.lineTo(cs.x + 20, topY + 10);
        gfx.lineTo(cs.x + cs.w / 2, topY - 15);
        gfx.lineTo(cs.x + cs.w - 20, topY + 10);
        gfx.lineTo(cs.x + cs.w - 20, topY + 30);
      } else {
        // Balustrade terrace roofline
        gfx.lineTo(cs.x, topY);
        gfx.lineTo(cs.x + cs.w, topY);
      }
      gfx.lineTo(cs.x + cs.w, 720);
      gfx.closePath();
      gfx.fillPath();

      // Water-level landing steps at bottom
      gfx.fillStyle(0x1e362c, 0.95);
      gfx.fillRect(cs.x, 565, cs.w, 15);

      // Venetian Windows
      if (cs.windows) {
        for (const win of cs.windows) {
          const wx = cs.x + win.xRel;
          const wy = topY + win.yRel;

          if (win.trefoil) {
            // Venetian Gothic pointed trefoil window
            gfx.fillStyle(0x0e1b16, 0.95);
            gfx.fillRect(wx - 2, wy + 10, win.w + 4, win.h - 10);
            gfx.fillCircle(wx + win.w / 2, wy + 10, win.w / 2 + 2);

            gfx.fillStyle(win.lit ? 0x2dd4bf : 0x0f2922, 0.95);
            gfx.fillRect(wx, wy + 10, win.w, win.h - 10);
            gfx.fillCircle(wx + win.w / 2, wy + 10, win.w / 2);

            if (win.lit) {
              gfx.fillStyle(0x2dd4bf, 0.15);
              gfx.fillCircle(wx + win.w / 2, wy + win.h / 2, win.w);
            }
          } else {
            gfx.fillStyle(win.lit ? 0xf59e0b : 0x14201c, 0.9);
            gfx.fillRect(wx, wy, win.w, win.h);
          }
        }
      }
    }

    // Emerald waterline algae wash
    gfx.fillStyle(0x10b981, 0.18);
    gfx.fillRect(cs.x, 620, cs.w, 35);
  }
}
