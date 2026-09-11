import Phaser from 'phaser';
import { store } from '../../state/store.ts';
import { eventBus } from '../../state/eventBus.ts';
import { ACT_COUNT, ACT_MIN_DISTANCE, METERS_PER_PX, MOMENTUM, TIER, VICTORY_DISTANCE } from '../balance.ts';
import { HUD_REGISTRY_KEY, SceneKeys, type HudTelemetry } from './keys.ts';
import type { AppFlags } from '../../app/flags.ts';
import { touchLayout } from '../systems/TouchControls.ts';

const FONT_SANS = 'system-ui, sans-serif';
const FONT_MONO = 'monospace';

export function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatMetres(px: number): string {
  return `${Math.floor(px * METERS_PER_PX)} m`;
}

/**
 * HudScene - runs in parallel with StreetScene and draws every on-screen readout.
 *
 * Slow-changing state comes from the store; per-frame telemetry (bellows,
 * balance) comes from the registry entry StreetScene writes each update.
 * Nothing is conveyed by colour alone: the momentum bar has tier ticks, the
 * balance needle changes shape in the danger band, and badges carry text.
 */
export class HudScene extends Phaser.Scene {
  private actBadgeBg!: Phaser.GameObjects.Graphics;
  private actBadgeText!: Phaser.GameObjects.Text;
  private tipsText!: Phaser.GameObjects.Text;
  private momentumText!: Phaser.GameObjects.Text;
  private progressionGfx!: Phaser.GameObjects.Graphics;
  private journeyGfx!: Phaser.GameObjects.Graphics;
  private journeyText!: Phaser.GameObjects.Text;
  private gustText!: Phaser.GameObjects.Text;
  private bellowsBar!: Phaser.GameObjects.Graphics;
  private balanceGauge!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private buffBadgeBg!: Phaser.GameObjects.Graphics;
  private buffBadgeText!: Phaser.GameObjects.Text;
  private shieldText!: Phaser.GameObjects.Text;
  private bannerContainer!: Phaser.GameObjects.Container;
  private bannerTitle!: Phaser.GameObjects.Text;
  private bannerSub!: Phaser.GameObjects.Text;
  private unsubscribers: Array<() => void> = [];
  private gustUntil = 0;

  private static readonly TOUCH_HINT =
    'Hold left / right side to balance   •   Hold the bellows button to jump';
  private static readonly CONTROLS_HINT =
    'A / D (← / →) : Balance   •   Hold SPACE : Accordion Jump   •   P : Pause';

  constructor() {
    super({ key: SceneKeys.Hud });
  }

  create(): void {
    const { width, height } = this.scale;
    const flags = this.registry.get('flags') as AppFlags | undefined;
    const touch = flags?.coarsePointer ?? false;
    if (touch) this.drawTouchGuides(width, height);

    // Act badge (top left)
    this.actBadgeBg = this.add.graphics();
    this.drawBadgeBg(0xf59e0b);
    const act = store.getCurrentActDefinition();
    this.actBadgeText = this.add.text(32, 26, `ACT ${act.act}: ${act.name.toUpperCase()}`, {
      fontFamily: FONT_SANS,
      fontSize: '15px',
      color: '#f59e0b',
      fontStyle: 'bold',
    });
    this.tipsText = this.add.text(32, 48, '⚙️ 0', {
      fontFamily: FONT_MONO,
      fontSize: '14px',
      color: '#fbbf24',
      fontStyle: 'bold',
    });
    this.momentumText = this.add.text(110, 48, '', {
      fontFamily: FONT_MONO,
      fontSize: '14px',
      color: '#9ca3af',
    });
    this.progressionGfx = this.add.graphics();

    // Journey readout (top centre): distance, clock, act segments
    this.journeyGfx = this.add.graphics();
    this.journeyText = this.add
      .text(width / 2, 30, '', {
        fontFamily: FONT_MONO,
        fontSize: '15px',
        color: '#e5e7eb',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);
    this.gustText = this.add
      .text(width / 2, 72, '', {
        fontFamily: FONT_SANS,
        fontSize: '18px',
        color: '#fef3c7',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setVisible(false);

    // Controls hint and gauges (top right)
    this.statusText = this.add
      .text(width - 20, 20, touch ? HudScene.TOUCH_HINT : HudScene.CONTROLS_HINT, {
        fontFamily: FONT_MONO,
        fontSize: '14px',
        color: '#d1d5db',
        backgroundColor: 'rgba(18, 19, 22, 0.88)',
        padding: { x: 12, y: 7 },
      })
      .setOrigin(1, 0);
    this.bellowsBar = this.add.graphics();
    this.balanceGauge = this.add.graphics();

    // Buff badge and shield count (under act badge)
    this.buffBadgeBg = this.add.graphics();
    this.buffBadgeText = this.add.text(32, 100, '', {
      fontFamily: FONT_MONO,
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.shieldText = this.add.text(32, 132, '', {
      fontFamily: FONT_MONO,
      fontSize: '14px',
      color: '#67e8f9',
      fontStyle: 'bold',
    });

    // Seed (bottom right, small)
    this.add
      .text(width - 16, height - 12, `seed ${store.getState().seed}`, {
        fontFamily: FONT_MONO,
        fontSize: '13px',
        color: '#6b7280',
      })
      .setOrigin(1, 1);

    // Act transition banner (centre)
    this.bannerContainer = this.add
      .container(width / 2, 240)
      .setAlpha(0)
      .setDepth(100);
    const bannerBg = this.add.graphics();
    bannerBg.fillStyle(0x090a0f, 0.92);
    bannerBg.lineStyle(2, 0xf59e0b, 0.95);
    bannerBg.fillRoundedRect(-260, -48, 520, 96, 10);
    bannerBg.strokeRoundedRect(-260, -48, 520, 96, 10);
    this.bannerTitle = this.add
      .text(0, -18, '', { fontFamily: FONT_SANS, fontSize: '22px', color: '#fef08a', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.bannerSub = this.add
      .text(0, 16, '', { fontFamily: FONT_MONO, fontSize: '14px', color: '#9ca3af' })
      .setOrigin(0.5);
    this.bannerContainer.add([bannerBg, this.bannerTitle, this.bannerSub]);

    this.unsubscribers = [
      eventBus.on('ACT_CHANGE', (p) => this.announceAct(p.act, p.name)),
      eventBus.on('GUST_WARNING', (p) => this.showGust(p.direction, p.inSec)),
    ];
    this.events.once('shutdown', () => {
      for (const off of this.unsubscribers) off();
      this.unsubscribers = [];
    });
  }

  override update(time: number): void {
    const state = store.getState();
    const telemetry = this.registry.get(HUD_REGISTRY_KEY) as HudTelemetry | undefined;
    const { width } = this.scale;

    this.tipsText.setText(`⚙️ ${state.tips}`);
    this.momentumText.setText(`⚡ ${Math.round(state.momentum)}%  ${state.tierName}`);
    this.drawMomentumBar(state.momentum, state.momentumTier, time);
    this.drawJourney(state.distanceTraveled, state.activeAct);

    if (this.gustText.visible && time > this.gustUntil) this.gustText.setVisible(false);

    // Bellows and balance
    const barX = width - 260;
    const barY = 62;
    const barW = 240;
    const barH = 14;
    const pressure = telemetry?.bellowsPressure ?? 0;

    this.bellowsBar.clear();
    this.bellowsBar.fillStyle(0x18181b, 0.85);
    this.bellowsBar.fillRoundedRect(barX, barY, barW, barH, 4);
    this.bellowsBar.lineStyle(1, 0x3f3f46, 0.8);
    this.bellowsBar.strokeRoundedRect(barX, barY, barW, barH, 4);
    if (pressure > 0.01) {
      this.bellowsBar.fillStyle(0xf59e0b, 0.95);
      this.bellowsBar.fillRoundedRect(barX + 2, barY + 2, Math.max(4, (barW - 4) * pressure), barH - 4, 2);
    }

    const gaugeY = barY + 20;
    this.balanceGauge.clear();
    this.balanceGauge.fillStyle(0x18181b, 0.85);
    this.balanceGauge.fillRoundedRect(barX, gaugeY, barW, 10, 3);
    this.balanceGauge.fillStyle(0x52525b, 0.8);
    this.balanceGauge.fillRect(barX + barW / 2 - 1, gaugeY, 2, 10);
    // Danger band edges
    this.balanceGauge.fillStyle(0x7f1d1d, 0.6);
    this.balanceGauge.fillRect(barX + 4, gaugeY, 26, 10);
    this.balanceGauge.fillRect(barX + barW - 30, gaugeY, 26, 10);
    if (telemetry) {
      const threshold = telemetry.stabilityThreshold || 1;
      const needleOffset = (telemetry.wobbleAngle / threshold) * (barW / 2 - 8);
      const needleX = Phaser.Math.Clamp(barX + barW / 2 + needleOffset, barX + 4, barX + barW - 4);
      const inDanger = telemetry.isStumbling || telemetry.stabilityRatio > 0.75;
      const needleColor = telemetry.isStumbling ? 0xef4444 : inDanger ? 0xf59e0b : 0x10b981;
      this.balanceGauge.fillStyle(needleColor, 1);
      if (inDanger) {
        // Triangle in the danger band, so the state reads without colour
        this.balanceGauge.fillTriangle(needleX, gaugeY - 2, needleX - 5, gaugeY + 9, needleX + 5, gaugeY + 9);
      } else {
        this.balanceGauge.fillCircle(needleX, gaugeY + 5, 4);
      }
    }

    // Status line
    const hint = (this.registry.get('flags') as AppFlags | undefined)?.coarsePointer
      ? HudScene.TOUCH_HINT
      : HudScene.CONTROLS_HINT;
    if (telemetry?.isStumbling) {
      this.statusText.setText('⚠️ STUMBLE! Rhythm warped, recovering...').setColor('#ef4444');
    } else if (pressure > 0) {
      this.statusText
        .setText(`💨 Charging bellows: ${Math.round(pressure * 100)}%  (release to jump)`)
        .setColor('#f59e0b');
    } else {
      this.statusText.setText(hint).setColor('#d1d5db');
    }

    // Buff badge
    this.buffBadgeBg.clear();
    if (state.activeBuff && state.buffTimeRemaining > 0) {
      const remaining = Math.ceil(state.buffTimeRemaining);
      const style = HudScene.BUFF_STYLES[state.activeBuff];
      const badgeX = 20;
      const badgeY = 96;
      const badgeW = 250;
      const badgeH = 30;
      this.buffBadgeBg.fillStyle(style.fill, 0.92);
      this.buffBadgeBg.fillRoundedRect(badgeX, badgeY, badgeW, badgeH, 6);
      this.buffBadgeBg.lineStyle(1.5, style.stroke, 0.9);
      this.buffBadgeBg.strokeRoundedRect(badgeX, badgeY, badgeW, badgeH, 6);
      const ratio = Phaser.Math.Clamp(state.buffTimeRemaining / (state.buffDuration || 1), 0, 1);
      this.buffBadgeBg.fillStyle(style.stroke, 0.7);
      this.buffBadgeBg.fillRoundedRect(badgeX + 4, badgeY + badgeH - 4, (badgeW - 8) * ratio, 2, 1);
      this.buffBadgeText
        .setText(`${style.label} (${remaining}s)`)
        .setColor(style.text)
        .setPosition(badgeX + 10, badgeY + 7)
        .setVisible(true);
    } else {
      this.buffBadgeText.setVisible(false);
    }

    this.shieldText
      .setText(state.shieldCharges > 0 ? `🛡️ SHIELD ×${state.shieldCharges}` : '')
      .setY(state.activeBuff ? 134 : 100);
  }

  private static readonly BUFF_STYLES = {
    tips: { label: '🌻 2X TIPS + MAGNET', stroke: 0xf59e0b, fill: 0x271900, text: '#fbbf24' },
    balance: { label: '🍾 STEADY LEGS', stroke: 0x10b981, fill: 0x022c22, text: '#34d399' },
    steam: { label: '💨 STEAM JUMP', stroke: 0xe5e7eb, fill: 0x1f2937, text: '#fef3c7' },
  } as const;

  /** Faint zone markers for thumbs: a centre divider and the bellows button. */
  private drawTouchGuides(width: number, height: number): void {
    const layout = touchLayout(width, height);
    const g = this.add.graphics().setDepth(-1);
    g.lineStyle(1, 0xffffff, 0.08);
    g.lineBetween(width / 2, height * 0.25, width / 2, height - 20);
    const b = layout.bellows;
    g.fillStyle(0xf59e0b, 0.12);
    g.fillRoundedRect(b.x, b.y, b.size, b.size, 24);
    g.lineStyle(2, 0xf59e0b, 0.5);
    g.strokeRoundedRect(b.x, b.y, b.size, b.size, 24);
    this.add
      .text(b.x + b.size / 2, b.y + b.size / 2, '💨\nJUMP', {
        fontFamily: FONT_SANS,
        fontSize: '16px',
        color: '#fef3c7',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0.7);
  }

  private drawBadgeBg(strokeColor: number): void {
    this.actBadgeBg.clear();
    this.actBadgeBg.fillStyle(0x121316, 0.92);
    this.actBadgeBg.lineStyle(1, strokeColor, 0.85);
    this.actBadgeBg.fillRoundedRect(20, 20, 320, 70, 8);
    this.actBadgeBg.strokeRoundedRect(20, 20, 320, 70, 8);
  }

  private drawMomentumBar(momentum: number, tier: number, time: number): void {
    const g = this.progressionGfx;
    const x = 32;
    const y = 72;
    const w = 296;
    const h = 8;
    g.clear();
    g.fillStyle(0x18181b, 0.9);
    g.fillRoundedRect(x, y, w, h, 2);

    if (momentum > 0) {
      const danger = momentum < MOMENTUM.dangerThreshold;
      const pulse = danger ? 0.6 + 0.4 * Math.abs(Math.sin(time / 120)) : 1;
      const color = danger ? 0xef4444 : tier >= 3 ? 0xa855f7 : tier >= 1 ? 0xf59e0b : 0x10b981;
      g.fillStyle(color, 0.95 * pulse);
      g.fillRoundedRect(x, y, Math.max(4, w * (momentum / 100)), h, 2);
    }

    // Tier gates as tick marks; filled when that tier is held
    for (let t = 1; t < TIER.momentumGate.length; t++) {
      const tx = x + (w * TIER.momentumGate[t]) / 100;
      g.fillStyle(t <= tier ? 0xfef3c7 : 0x52525b, 1);
      g.fillRect(tx - 1, y - 3, 2, h + 6);
    }
  }

  private drawJourney(distance: number, act: number): void {
    const { width } = this.scale;
    const g = this.journeyGfx;
    const barW = 260;
    const x = width / 2 - barW / 2;
    const y = 56;
    const segW = barW / ACT_COUNT;

    this.journeyText.setText(`${formatMetres(distance)}   •   ${formatClock(store.getElapsedTime())}`);

    g.clear();
    for (let i = 0; i < ACT_COUNT; i++) {
      const start = ACT_MIN_DISTANCE[i];
      const end = i + 1 < ACT_COUNT ? ACT_MIN_DISTANCE[i + 1] : VICTORY_DISTANCE;
      const fill = Phaser.Math.Clamp((distance - start) / (end - start), 0, 1);
      g.fillStyle(0x18181b, 0.9);
      g.fillRoundedRect(x + i * segW, y, segW - 3, 6, 2);
      if (fill > 0) {
        g.fillStyle(i + 1 === act ? 0xf59e0b : 0xa16207, 1);
        g.fillRoundedRect(x + i * segW, y, Math.max(3, (segW - 3) * fill), 6, 2);
      }
    }
  }

  private showGust(direction: 'left' | 'right', inSec: number): void {
    this.gustText.setText(direction === 'right' ? '💨 GUST →' : '← GUST 💨').setVisible(true);
    this.gustUntil = this.time.now + (inSec + 0.5) * 1000;
    this.gustText.setScale(1);
    this.tweens.add({ targets: this.gustText, scaleX: 1.15, scaleY: 1.15, duration: 200, yoyo: true });
  }

  private announceAct(act: number, name: string): void {
    const actDef = store.getActDefinition(act);
    this.actBadgeText.setText(`ACT ${act}: ${name.toUpperCase()}`);
    this.tweens.add({
      targets: this.actBadgeText,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 200,
      yoyo: true,
      ease: 'Quad.easeInOut',
    });
    this.drawBadgeBg(0xfbbf24);
    this.time.delayedCall(800, () => this.drawBadgeBg(0xf59e0b));

    // The first act's announcement happens before the run is visible; no banner for it.
    if (act === 1) return;

    this.bannerTitle.setText(`ACT ${act}: ${name.toUpperCase()}`);
    this.bannerSub.setText(actDef.subtitle);
    this.bannerContainer.setY(220);
    this.tweens.killTweensOf(this.bannerContainer);
    this.tweens.add({
      targets: this.bannerContainer,
      alpha: { from: 0, to: 1 },
      y: 240,
      duration: 450,
      ease: 'Cubic.easeOut',
      hold: 2000,
      yoyo: true,
    });
  }
}
