import Phaser from 'phaser';

export function drawStreet(gfx: Phaser.GameObjects.Graphics): void {
  gfx.fillStyle(0x181c24, 1);
  gfx.fillRect(0, 560, 1280, 24);

  let curbX = 0;
  const curbWidths = [85, 70, 95, 80, 75, 90, 85, 100, 70, 80, 90, 85, 75, 95, 85];
  for (let i = 0; curbX < 1280; i++) {
    const cw = curbWidths[i % curbWidths.length];
    const isAlt = i % 2 === 0;

    gfx.fillStyle(isAlt ? 0x242a35 : 0x1f242e, 1);
    gfx.fillRect(curbX, 560, cw, 24);

    gfx.fillStyle(0x4b5568, 0.55);
    gfx.fillRect(curbX + 3, 560, cw - 6, 3);

    gfx.fillStyle(0x0e1117, 0.95);
    gfx.fillRect(curbX + cw - 2, 560, 2, 24);

    curbX += cw;
  }

  gfx.fillStyle(0x0e1014, 1);
  gfx.fillRect(0, 584, 1280, 136);

  const cobblestonePalettes = [0x242934, 0x1b1e26, 0x28231f, 0x1e222a, 0x2b2723, 0x181a21];

  let seed = 42891;
  const deterministicRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const rowConfigs = [
    { y: 588, h: 17 },
    { y: 609, h: 18 },
    { y: 631, h: 19 },
    { y: 654, h: 20 },
    { y: 678, h: 21 },
    { y: 703, h: 22 },
  ];

  for (let r = 0; r < rowConfigs.length; r++) {
    const cfg = rowConfigs[r];
    const rowY = cfg.y;
    const baseH = cfg.h;
    const initialOffset = r % 2 === 0 ? -28 : -48;
    let currX = initialOffset;

    while (currX < 1320) {
      const randVal = deterministicRandom();
      const randVal2 = deterministicRandom();
      const randVal3 = deterministicRandom();
      const randVal4 = deterministicRandom();

      const stoneW = Math.round(28 + randVal * 24);
      const stoneH = Math.round(baseH + (randVal2 - 0.5) * 3);
      const jitterY = (randVal3 - 0.5) * 3;
      const gap = Math.round(3 + randVal4 * 3);

      const colorIndex = Math.floor(deterministicRandom() * cobblestonePalettes.length);
      const stoneColor = cobblestonePalettes[colorIndex];
      const stoneAlpha = 0.72 + deterministicRandom() * 0.24;
      const cornerRadius = Math.round(3 + deterministicRandom() * 3);

      gfx.fillStyle(stoneColor, stoneAlpha);
      gfx.fillRoundedRect(currX, rowY + jitterY, stoneW, stoneH, cornerRadius);

      const highlightW = Math.max(8, stoneW - 10);
      const hasAmberReflection = deterministicRandom() > 0.82;

      if (hasAmberReflection) {
        gfx.fillStyle(0xf59e0b, 0.18);
        gfx.fillRect(currX + 4, rowY + jitterY + 2, highlightW, 2.5);
      } else {
        gfx.fillStyle(0x64748b, 0.32);
        gfx.fillRect(currX + 4, rowY + jitterY + 2, highlightW, 2);
      }

      if (currX < 0) {
        gfx.fillStyle(stoneColor, stoneAlpha);
        gfx.fillRoundedRect(currX + 1280, rowY + jitterY, stoneW, stoneH, cornerRadius);
        gfx.fillStyle(hasAmberReflection ? 0xf59e0b : 0x64748b, hasAmberReflection ? 0.18 : 0.32);
        gfx.fillRect(currX + 1280 + 4, rowY + jitterY + 2, highlightW, 2);
      } else if (currX + stoneW > 1280) {
        gfx.fillStyle(stoneColor, stoneAlpha);
        gfx.fillRoundedRect(currX - 1280, rowY + jitterY, stoneW, stoneH, cornerRadius);
        gfx.fillStyle(hasAmberReflection ? 0xf59e0b : 0x64748b, hasAmberReflection ? 0.18 : 0.32);
        gfx.fillRect(currX - 1280 + 4, rowY + jitterY + 2, highlightW, 2);
      }

      currX += stoneW + gap;
    }
  }
}
