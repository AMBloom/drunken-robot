import Phaser from 'phaser';
import { store } from '../../state/store.ts';
import { SceneKeys } from './keys.ts';
import type { StreetScene } from './StreetScene.ts';
import { formatClock, formatMetres } from './HudScene.ts';

/**
 * PauseScene - launched on top of a paused StreetScene. Resume and restart
 * both go through the store or StreetScene so there is one source of truth.
 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.Pause });
  }

  create(): void {
    const { width, height } = this.scale;

    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x05070e, 0.85);
    backdrop.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;

    const card = this.add.graphics();
    card.fillStyle(0x18181b, 0.96);
    card.fillRoundedRect(cx - 250, cy - 170, 500, 340, 16);
    card.lineStyle(2, 0xf59e0b, 0.9);
    card.strokeRoundedRect(cx - 250, cy - 170, 500, 340, 16);

    this.add
      .text(cx, cy - 122, 'PAUSED', {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#f59e0b',
        letterSpacing: 2,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 78, 'The automaton rests its weary brass gears.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    const state = store.getState();
    this.add
      .text(
        cx,
        cy - 40,
        `Act ${state.activeAct}: ${state.actName}  •  ${formatMetres(state.distanceTraveled)}  •  ${formatClock(store.getElapsedTime())}  •  ${state.tips} ⚙️`,
        { fontFamily: 'monospace', fontSize: '14px', color: '#fbbf24' },
      )
      .setOrigin(0.5);

    this.addButton(cx, cy + 20, '▶  RESUME', 0xd97706, () => store.setPaused(false));
    this.addButton(cx, cy + 78, '↻  RESTART JOURNEY', 0x3f3f46, () => this.restart());

    this.add
      .text(cx, cy + 132, '[P] or [ESC] resume   •   [R] restart', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#9ca3af',
      })
      .setOrigin(0.5);

    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-P', () => store.setPaused(false));
    keyboard?.on('keydown-ESC', () => store.setPaused(false));
    keyboard?.on('keydown-R', () => this.restart());
  }

  private addButton(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const w = 280;
    const h = 44;
    const bg = this.add.graphics();
    bg.fillStyle(color, 0.95);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    bg.lineStyle(2, 0xfde68a, 0.6);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    this.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
        letterSpacing: 1,
      })
      .setOrigin(0.5);
    this.add.zone(x, y, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', onClick);
  }

  private restart(): void {
    const street = this.scene.get(SceneKeys.Street) as StreetScene;
    street.restartRun();
  }
}
