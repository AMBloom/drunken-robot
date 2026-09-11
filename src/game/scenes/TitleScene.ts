import Phaser from 'phaser';
import { audioEngine } from '../../audio/engine.ts';
import { eventBus } from '../../state/eventBus.ts';
import { store } from '../../state/store.ts';
import type { AppFlags } from '../../app/flags.ts';

/**
 * TitleScene - Entry Title & Audio Context Unlock Screen
 * The Drunken Robot's Journey Home - Sprint 4.2
 *
 * Provides a moody, atmospheric European watercolor title screen.
 * Safely unlocks the Web Audio / Tone.js context upon explicit player gesture,
 * starts the Conductor, and transitions seamlessly to StreetScene.
 */
export class TitleScene extends Phaser.Scene {
  private isStarting = false;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    this.isStarting = false;
    const { width, height } = this.scale;

    // 1. Muted Procedural Parallax Background
    if (this.textures.exists('bg_sky')) {
      const sky = this.add.image(0, 0, 'bg_sky').setOrigin(0, 0);
      sky.setDisplaySize(width, height);
      sky.setTint(0x94a3b8);
    }

    if (this.textures.exists('bg_distant')) {
      const distant = this.add.image(0, 0, 'bg_distant').setOrigin(0, 0);
      distant.setDisplaySize(width, height);
      distant.setTint(0x71717a);
      distant.setAlpha(0.85);
    }

    // 2. Atmospheric Watercolor Vignette Overlay
    const vignette = this.add.graphics();
    vignette.fillGradientStyle(0x05070e, 0x05070e, 0x090d1a, 0x121828, 0.75, 0.75, 0.88, 0.88);
    vignette.fillRect(0, 0, width, height);

    // Subtle warm tavern amber glow from the lower left
    const tavernGlow = this.add.graphics();
    tavernGlow.fillStyle(0xf59e0b, 0.08);
    tavernGlow.fillCircle(160, 480, 260);
    tavernGlow.fillStyle(0xf59e0b, 0.14);
    tavernGlow.fillCircle(160, 480, 140);

    // 3. Floating Ambient Embers / Street Lamp Dust Particles
    for (let i = 0; i < 18; i++) {
      const px = Phaser.Math.Between(40, width - 40);
      const py = Phaser.Math.Between(100, height - 120);
      const dot = this.add.circle(
        px,
        py,
        Phaser.Math.FloatBetween(1.2, 2.5),
        0xfef08a,
        Phaser.Math.FloatBetween(0.2, 0.6),
      );
      this.tweens.add({
        targets: dot,
        y: py - Phaser.Math.Between(20, 60),
        alpha: { from: dot.alpha, to: 0.1 },
        duration: Phaser.Math.Between(2200, 4500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // 4. Header Badge
    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(0x18181b, 0.85);
    badgeBg.lineStyle(1, 0xd97706, 0.6);
    badgeBg.fillRoundedRect(width / 2 - 170, 72, 340, 28, 14);
    badgeBg.strokeRoundedRect(width / 2 - 170, 72, 340, 28, 14);

    this.add
      .text(width / 2, 86, 'A GENERATIVE BALKAN FOLK ODYSSEY', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fbbf24',
        letterSpacing: 2,
      })
      .setOrigin(0.5);

    // 5. Main Game Title (Gothic / Bohemian Aesthetic)
    const titleText = this.add
      .text(width / 2, 175, "THE DRUNKEN ROBOT'S\nJOURNEY HOME", {
        fontFamily: 'Georgia, serif',
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#fef3c7',
        align: 'center',
        lineSpacing: 10,
        stroke: '#18110b',
        strokeThickness: 8,
        shadow: {
          offsetX: 0,
          offsetY: 6,
          color: 'rgba(0, 0, 0, 0.8)',
          blur: 16,
          fill: true,
        },
      })
      .setOrigin(0.5);

    // Subtle gentle float animation on the title
    this.tweens.add({
      targets: titleText,
      y: 172,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 6. Subtitle & Dedication
    this.add
      .text(width / 2, 260, 'Interactive European Gypsy-Jazz & Accordion Engine', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '18px',
        color: '#fcd34d',
        fontStyle: 'italic',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 292, 'Inspired by the musical spirit of Melinda West', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        color: '#94a3b8',
        align: 'center',
      })
      .setOrigin(0.5);

    // 7. Interactive Call-To-Action Button / Banner
    const btnContainer = this.add.container(width / 2, 380);

    const btnGlow = this.add.graphics();
    btnGlow.fillStyle(0xd97706, 0.25);
    btnGlow.fillRoundedRect(-195, -35, 390, 70, 35);

    const btnBg = this.add.graphics();
    btnBg.fillGradientStyle(0xd97706, 0xd97706, 0x92400e, 0x78350f, 1);
    btnBg.fillRoundedRect(-185, -28, 370, 56, 28);
    btnBg.lineStyle(2, 0xfde68a, 0.9);
    btnBg.strokeRoundedRect(-185, -28, 370, 56, 28);

    const btnLabel = this.add
      .text(0, 0, '🔊 CLICK TO BEGIN JOURNEY', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
        letterSpacing: 2,
        shadow: {
          offsetX: 0,
          offsetY: 2,
          color: '#000000',
          blur: 4,
          fill: true,
        },
      })
      .setOrigin(0.5);

    btnContainer.add([btnGlow, btnBg, btnLabel]);

    // Button pulse animation
    this.tweens.add({
      targets: [btnGlow, btnBg, btnLabel],
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Make button area interactive
    const hitArea = this.add
      .zone(width / 2, 380, 390, 70)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // 8. Controls Guide Box
    const controlsBox = this.add.graphics();
    controlsBox.fillStyle(0x0f172a, 0.75);
    controlsBox.fillRoundedRect(width / 2 - 340, 460, 680, 115, 12);
    controlsBox.lineStyle(1, 0x334155, 0.8);
    controlsBox.strokeRoundedRect(width / 2 - 340, 460, 680, 115, 12);

    this.add
      .text(width / 2, 482, '— STREET PERFORMANCE CONTROLS —', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#94a3b8',
        letterSpacing: 1.5,
      })
      .setOrigin(0.5);

    const guideLines = [
      '🕹️  A / D  or  ← / → : Drunken Stagger & Balance Sway (Momentum)',
      '💨  SPACE (Hold & Release) : Charge & Burst Accordion Bellows Jump',
      '🪙  COLLECT TIPS : Increase Momentum & Recruit the Full 6-Piece Balkan Ensemble',
    ];

    guideLines.forEach((line, idx) => {
      this.add
        .text(width / 2, 510 + idx * 20, line, {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '13px',
          color: '#e2e8f0',
        })
        .setOrigin(0.5);
    });

    // 9. Run seed: from ?seed= if given, otherwise fresh. Shown so a run can be shared and replayed.
    const flags = this.registry.get('flags') as AppFlags | undefined;
    const seed = flags?.seed ?? Math.floor(Math.random() * 1_000_000);
    this.add
      .text(width / 2, 626, `Seed ${seed}   •   add ?seed=${seed} to the URL to replay this street`, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#6b7280',
      })
      .setOrigin(0.5);

    // 10. Audio Notice Footer
    this.add
      .text(width / 2, 650, '🎧 Headphones recommended for spatial gypsy-jazz audio and musette beating', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        color: '#64748b',
      })
      .setOrigin(0.5);

    // 10. Pointer & Keyboard Click Listeners for Web Audio Unlock
    const startJourney = async (): Promise<void> => {
      if (this.isStarting) return;
      this.isStarting = true;

      btnLabel.setText('⏳ TUNING INSTRUMENTS...');

      // Safe Web Audio unlock on user gesture
      try {
        await audioEngine.init();
      } catch (err) {
        console.warn('[TitleScene] Audio context init warning:', err);
      }

      // Fresh run state. startRun() announces Act 1 so the conductor picks up the
      // act's scale/meter/bpm instead of playing its constructor defaults.
      store.startRun(seed);
      eventBus.emit('GAME_START', {});

      // Fade camera smoothly to StreetScene
      this.cameras.main.fade(600, 10, 14, 24);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('StreetScene');
      });
    };

    hitArea.on('pointerdown', startJourney);
    this.input.keyboard?.once('keydown-SPACE', startJourney);
    this.input.keyboard?.once('keydown-ENTER', startJourney);
  }
}
