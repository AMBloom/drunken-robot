import Phaser from 'phaser';
import { CORE_TEXTURES, MIDGROUND_TEXTURES } from '../art/registry.ts';
import { generateTexturesChunked } from '../art/textureFactory.ts';

/**
 * BootScene - generates the procedural textures the game needs, one per frame,
 * behind a small progress bar, then hands off to the title screen.
 *
 * Only the first two acts' midgrounds are built here; StreetScene builds the
 * next one as each act begins and frees the one left behind.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const barW = 360;
    const barH = 10;
    const barX = (width - barW) / 2;
    const barY = height / 2;

    this.cameras.main.setBackgroundColor(0x0a0c14);

    const label = this.add
      .text(width / 2, barY - 28, 'Sketching the streets...', {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: '#f59e0b',
      })
      .setOrigin(0.5);

    const bar = this.add.graphics();
    const drawBar = (ratio: number): void => {
      bar.clear();
      bar.fillStyle(0x18181b, 1);
      bar.fillRoundedRect(barX, barY, barW, barH, 4);
      bar.fillStyle(0xf59e0b, 1);
      bar.fillRoundedRect(barX, barY, Math.max(8, barW * ratio), barH, 4);
    };
    drawBar(0);

    const specs = [...CORE_TEXTURES, MIDGROUND_TEXTURES[1], MIDGROUND_TEXTURES[2]];
    void generateTexturesChunked(this, specs, (done, total) => drawBar(done / total)).then(() => {
      label.destroy();
      bar.destroy();
      this.scene.start('TitleScene');
    });
  }
}
