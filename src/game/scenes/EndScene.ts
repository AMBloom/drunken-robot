import Phaser from 'phaser';
import { store } from '../../state/store.ts';
import { eventBus } from '../../state/eventBus.ts';
import { SceneKeys, type EndSceneData } from './keys.ts';
import { formatMetres } from './HudScene.ts';

const FONT_SANS = 'system-ui, -apple-system, sans-serif';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * EndScene - closes a run. Victory shows the robot home on the dawn stoop;
 * game over shows it face down in the gutter. Both share the scorecard and
 * the play-again flow.
 */
export class EndScene extends Phaser.Scene {
  private runData!: EndSceneData;
  private isRestarting = false;

  constructor() {
    super({ key: SceneKeys.End });
  }

  init(data: EndSceneData): void {
    this.runData = data;
    this.isRestarting = false;
  }

  create(): void {
    const { width, height } = this.scale;
    const victory = this.runData.outcome === 'victory';

    if (victory) {
      this.drawDawn(width, height);
    } else {
      this.drawGutter(width, height);
    }

    this.drawScorecard(victory);
  }

  private drawDawn(width: number, height: number): void {
    const skyGfx = this.add.graphics();
    skyGfx.fillGradientStyle(0x3b0764, 0x581c87, 0x831843, 0x9a3412, 1);
    skyGfx.fillRect(0, 0, width, height);

    const sunGfx = this.add.graphics();
    sunGfx.fillStyle(0xfef08a, 0.12);
    sunGfx.fillCircle(width / 2 + 180, 360, 280);
    sunGfx.fillStyle(0xfde68a, 0.25);
    sunGfx.fillCircle(width / 2 + 180, 360, 140);
    sunGfx.fillStyle(0xfef08a, 0.85);
    sunGfx.fillCircle(width / 2 + 180, 360, 52);

    this.drawGround(width, height, 0x27272a, 0x18181b, 0xfef08a);

    const stoopX = width / 2 + 180;
    const stoopY = 560;

    const houseGfx = this.add.graphics();
    houseGfx.fillStyle(0x271911, 0.95);
    houseGfx.fillRect(stoopX - 110, stoopY - 260, 220, 260);
    houseGfx.fillStyle(0x18110b, 1);
    houseGfx.fillRect(stoopX - 55, stoopY - 190, 110, 190);
    houseGfx.fillCircle(stoopX, stoopY - 190, 55);

    const doorGlow = this.add.graphics();
    doorGlow.fillGradientStyle(0xfef3c7, 0xfef3c7, 0xf59e0b, 0xd97706, 0.9, 0.9, 0.95, 0.95);
    doorGlow.fillRect(stoopX - 48, stoopY - 182, 96, 182);
    doorGlow.fillCircle(stoopX, stoopY - 182, 48);

    const lanternX = stoopX - 85;
    const lanternY = stoopY - 210;
    const lanternGlow = this.add.graphics();
    lanternGlow.fillStyle(0xfef08a, 0.22);
    lanternGlow.fillCircle(lanternX, lanternY, 90);
    lanternGlow.fillStyle(0xf59e0b, 0.45);
    lanternGlow.fillCircle(lanternX, lanternY, 40);
    lanternGlow.fillStyle(0xffffff, 0.95);
    lanternGlow.fillCircle(lanternX, lanternY, 8);
    this.tweens.add({
      targets: lanternGlow,
      alpha: { from: 0.85, to: 1.0 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.drawRestingRobot(stoopX - 25, stoopY);
  }

  private drawGutter(width: number, height: number): void {
    const skyGfx = this.add.graphics();
    skyGfx.fillGradientStyle(0x05070e, 0x05070e, 0x111827, 0x1f2937, 1);
    skyGfx.fillRect(0, 0, width, height);

    // A lone street lamp over the gutter
    const lampX = width / 2 + 200;
    const lamp = this.add.graphics();
    lamp.fillStyle(0xfbbf24, 0.08);
    lamp.fillCircle(lampX, 300, 260);
    lamp.fillStyle(0xfbbf24, 0.16);
    lamp.fillCircle(lampX, 300, 120);
    lamp.fillStyle(0x27272a, 1);
    lamp.fillRect(lampX - 4, 300, 8, 260);
    lamp.fillStyle(0xfef3c7, 0.9);
    lamp.fillCircle(lampX, 300, 14);

    this.drawGround(width, height, 0x1f2937, 0x0f172a, 0x64748b);

    // Puddle and the collapsed robot
    const rx = width / 2 + 160;
    const ry = 584;
    const puddle = this.add.graphics();
    puddle.fillStyle(0x0b1120, 0.9);
    puddle.fillEllipse(rx + 10, ry + 6, 170, 22);
    puddle.fillStyle(0xfbbf24, 0.12);
    puddle.fillEllipse(rx + 30, ry + 4, 60, 8);

    const robot = this.add.container(rx, ry - 14).setRotation(Math.PI / 2 - 0.15);
    const gfx = this.add.graphics();
    gfx.fillStyle(0x382c23, 1);
    gfx.fillRoundedRect(-22, -62, 44, 52, 6);
    gfx.lineStyle(2, 0x18120e, 1);
    gfx.strokeRoundedRect(-22, -62, 44, 52, 6);
    gfx.fillStyle(0x991b1b, 1);
    gfx.fillRect(-18, -48, 36, 32);
    gfx.fillStyle(0xfef3c7, 1);
    for (let p = -14; p <= 14; p += 7) gfx.fillRect(p, -48, 3, 32);
    gfx.fillStyle(0x3f3f46, 1);
    gfx.fillCircle(0, -78, 12);
    gfx.fillStyle(0x92400e, 0.5);
    gfx.fillCircle(0, -78, 6);
    robot.add(gfx);

    // Faint steam still leaking out
    const steam = this.add.graphics();
    steam.fillStyle(0x9ca3af, 0.25);
    steam.fillCircle(rx - 60, ry - 30, 8);
    steam.fillCircle(rx - 68, ry - 46, 11);
    this.tweens.add({
      targets: steam,
      y: -30,
      alpha: { from: 0.25, to: 0 },
      duration: 2600,
      repeat: -1,
      ease: 'Sine.easeOut',
    });
  }

  private drawGround(width: number, height: number, top: number, bottom: number, highlight: number): void {
    const ground = this.add.graphics();
    ground.fillStyle(0x3f3f46, 1);
    ground.fillRect(0, 560, width, 24);
    ground.fillGradientStyle(top, top, bottom, bottom, 1);
    ground.fillRect(0, 584, width, height - 584);
    ground.fillStyle(highlight, 0.35);
    ground.fillRect(0, 560, width, 2);
  }

  private drawRestingRobot(x: number, y: number): void {
    const robotContainer = this.add.container(x, y);
    const robotGfx = this.add.graphics();
    robotGfx.fillStyle(0x0a0a0f, 0.65);
    robotGfx.fillEllipse(0, 0, 75, 18);
    robotGfx.fillStyle(0x382c23, 1);
    robotGfx.fillRoundedRect(-22, -62, 44, 52, 6);
    robotGfx.lineStyle(2, 0x18120e, 1);
    robotGfx.strokeRoundedRect(-22, -62, 44, 52, 6);
    robotGfx.fillStyle(0x991b1b, 1);
    robotGfx.fillRect(-18, -48, 36, 32);
    robotGfx.fillStyle(0xfef3c7, 1);
    for (let p = -14; p <= 14; p += 7) robotGfx.fillRect(p, -48, 3, 32);
    robotGfx.fillStyle(0x78350f, 1);
    robotGfx.fillCircle(0, -78, 12);
    robotGfx.fillStyle(0xf59e0b, 0.85);
    robotGfx.fillCircle(0, -78, 7);

    const steamGfx = this.add.graphics();
    steamGfx.fillStyle(0xfde68a, 0.4);
    steamGfx.fillCircle(12, -92, 6);
    steamGfx.fillCircle(18, -104, 9);
    steamGfx.fillCircle(24, -118, 13);
    this.tweens.add({
      targets: steamGfx,
      y: -15,
      alpha: { from: 0.4, to: 0.05 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    robotContainer.add([robotGfx, steamGfx]);
  }

  private drawScorecard(victory: boolean): void {
    const { width } = this.scale;
    const panelX = width / 2 - 320;
    const accent = victory ? 0xd97706 : 0xef4444;

    const bannerBg = this.add.graphics();
    bannerBg.fillStyle(0x0f172a, 0.86);
    bannerBg.fillRoundedRect(panelX - 240, 70, 480, 500, 16);
    bannerBg.lineStyle(2, accent, 0.9);
    bannerBg.strokeRoundedRect(panelX - 240, 70, 480, 500, 16);

    this.add
      .text(panelX, 105, victory ? '★ JOURNEY COMPLETE ★' : '✖ JOURNEY CUT SHORT ✖', {
        fontFamily: FONT_SANS,
        fontSize: '15px',
        fontStyle: 'bold',
        color: victory ? '#fbbf24' : '#fca5a5',
        letterSpacing: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(panelX, 148, victory ? 'REACHED HOME' : 'PASSED OUT', {
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: victory ? '#fef3c7' : '#fecaca',
        stroke: '#18110b',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(
        panelX,
        192,
        victory
          ? 'The clockwork wanderer finally rests by the warm hearth.'
          : 'Out of rhythm and out of momentum, the automaton\nlies down on the rain-slick cobblestones.',
        {
          fontFamily: FONT_SANS,
          fontSize: '15px',
          color: '#cbd5e1',
          fontStyle: 'italic',
          align: 'center',
          wordWrap: { width: 420 },
        },
      )
      .setOrigin(0.5);

    const statsBox = this.add.graphics();
    statsBox.fillStyle(0x1e293b, 0.7);
    statsBox.fillRoundedRect(panelX - 210, 236, 420, 224, 12);
    statsBox.lineStyle(1, 0x475569, 0.8);
    statsBox.strokeRoundedRect(panelX - 210, 236, 420, 224, 12);

    const d = this.runData;
    const stats = [
      { label: 'Tips busked', value: `${d.tips} ⚙️`, color: '#fef08a' },
      { label: 'Distance', value: formatMetres(d.distanceTraveled), color: '#67e8f9' },
      { label: 'Time on the road', value: formatTime(d.elapsedSec), color: '#c4b5fd' },
      { label: victory ? 'Final act' : 'Fell in', value: `Act ${d.act}: ${d.actName}`, color: '#f472b6' },
      { label: 'Ensemble', value: d.tierName, color: '#a7f3d0' },
      { label: 'Seed', value: `${d.seed}  (add ?seed=${d.seed} to replay)`, color: '#94a3b8' },
    ];
    stats.forEach((st, idx) => {
      const rowY = 252 + idx * 34;
      this.add.text(panelX - 190, rowY, st.label, {
        fontFamily: FONT_SANS,
        fontSize: '14px',
        color: '#94a3b8',
      });
      this.add
        .text(panelX + 190, rowY, st.value, {
          fontFamily: FONT_SANS,
          fontSize: '14px',
          fontStyle: 'bold',
          color: st.color,
          align: 'right',
        })
        .setOrigin(1, 0);
    });

    // Play again
    const btnY = 510;
    const btnBg = this.add.graphics();
    btnBg.fillStyle(victory ? 0x059669 : 0xd97706, 1);
    btnBg.fillRoundedRect(panelX - 145, btnY - 24, 290, 48, 24);
    btnBg.lineStyle(2, victory ? 0xa7f3d0 : 0xfde68a, 0.9);
    btnBg.strokeRoundedRect(panelX - 145, btnY - 24, 290, 48, 24);
    const btnLabel = this.add
      .text(panelX, btnY, victory ? '↻  PLAY AGAIN' : '↻  TRY AGAIN', {
        fontFamily: FONT_SANS,
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#ffffff',
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: [btnBg, btnLabel],
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(panelX, btnY + 44, 'SPACE or ENTER', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#64748b',
      })
      .setOrigin(0.5);

    const restart = (): void => this.restart();
    this.add
      .zone(panelX, btnY, 310, 56)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', restart);

    // Delay the keys so a jump held at the moment of death cannot skip this screen.
    this.time.delayedCall(500, () => {
      this.input.keyboard?.once('keyup-SPACE', restart);
      this.input.keyboard?.once('keydown-ENTER', restart);
    });
  }

  private restart(): void {
    if (this.isRestarting) return;
    this.isRestarting = true;

    store.reset();
    eventBus.emit('RESTART_GAME', {});

    this.cameras.main.fade(600, 10, 14, 24);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SceneKeys.Street);
    });
  }
}
