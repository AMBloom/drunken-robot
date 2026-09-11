import Phaser from 'phaser';
import type { BuffType } from '../../state/eventBus.ts';

export interface SteamParticle {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

/** Everything the renderer needs from the robot's physics state for one frame. */
export interface RobotVisualState {
  wobbleAngle: number;
  spinAngleOffset: number;
  stridePhase: number;
  pulsePhase: number;
  vx: number;
  bellowsRatio: number;
  activeBuff: Exclude<BuffType, 'shield'> | null;
  shielded: boolean;
  steam: readonly SteamParticle[];
}

/**
 * Draws the robot in the sketchbook style: shaky charcoal outlines, a pleated
 * accordion that breathes with the bellows, and an amber vacuum-tube eye.
 * Pure rendering; the Robot entity owns physics and calls draw() each frame.
 */
export class RobotRenderer {
  private readonly shadowGfx: Phaser.GameObjects.Graphics;
  private readonly limbsGfx: Phaser.GameObjects.Graphics;
  private readonly chassisGfx: Phaser.GameObjects.Graphics;
  private readonly accordionGfx: Phaser.GameObjects.Graphics;
  private readonly eyeGfx: Phaser.GameObjects.Graphics;
  private readonly steamGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
    this.shadowGfx = scene.add.graphics();
    this.limbsGfx = scene.add.graphics();
    this.chassisGfx = scene.add.graphics();
    this.accordionGfx = scene.add.graphics();
    this.eyeGfx = scene.add.graphics();
    this.steamGfx = scene.add.graphics();
    container.add([
      this.shadowGfx,
      this.limbsGfx,
      this.chassisGfx,
      this.accordionGfx,
      this.eyeGfx,
      this.steamGfx,
    ]);
  }

  draw(container: Phaser.GameObjects.Container, s: RobotVisualState): void {
    const crouchSquashY = 1.0 - s.bellowsRatio * 0.22;
    const crouchSpreadX = 1.0 + s.bellowsRatio * 0.14;
    container.setRotation(s.wobbleAngle + s.spinAngleOffset);
    container.setScale(crouchSpreadX, crouchSquashY);

    // Ground shadow
    this.shadowGfx.clear();
    this.shadowGfx.fillStyle(0x0a0c10, 0.55);
    this.shadowGfx.fillEllipse(0, -2, 44 * crouchSpreadX, 10);

    // Legs and boots
    this.limbsGfx.clear();
    const legSpread = Math.sin(s.stridePhase) * 14 * (Math.abs(s.vx) > 10 ? 1 : 0.2);
    this.limbsGfx.lineStyle(4, 0x18181b, 1);
    this.limbsGfx.lineBetween(-10, -32, -12 - legSpread, -6);
    this.limbsGfx.fillStyle(0x3f3f46, 1);
    this.limbsGfx.fillRect(-20 - legSpread, -6, 16, 6);
    this.limbsGfx.lineBetween(10, -32, 12 + legSpread, -6);
    this.limbsGfx.fillStyle(0x3f3f46, 1);
    this.limbsGfx.fillRect(4 + legSpread, -6, 16, 6);

    // Chassis
    this.chassisGfx.clear();
    this.chassisGfx.fillStyle(0x92400e, 1);
    this.chassisGfx.beginPath();
    this.chassisGfx.moveTo(-20, -32);
    this.chassisGfx.lineTo(-24, -72);
    this.chassisGfx.lineTo(18, -76);
    this.chassisGfx.lineTo(22, -34);
    this.chassisGfx.closePath();
    this.chassisGfx.fillPath();
    this.chassisGfx.lineStyle(3, 0x18181b, 0.95);
    this.chassisGfx.strokePath();
    this.chassisGfx.fillStyle(0xb45309, 1);
    this.chassisGfx.fillRect(-18, -68, 14, 18);
    this.chassisGfx.lineStyle(1.5, 0x18181b, 0.9);
    this.chassisGfx.strokeRect(-18, -68, 14, 18);
    this.chassisGfx.fillStyle(0xfbbf24, 0.9);
    this.chassisGfx.fillCircle(-15, -65, 1.5);
    this.chassisGfx.fillCircle(-7, -65, 1.5);
    this.chassisGfx.fillCircle(-15, -53, 1.5);
    this.chassisGfx.fillCircle(-7, -53, 1.5);
    this.chassisGfx.fillStyle(0x27272a, 1);
    this.chassisGfx.fillRect(4, -84, 8, 10);
    this.chassisGfx.fillStyle(0xd97706, 1);
    this.chassisGfx.fillRect(2, -87, 12, 4);

    // Accordion
    this.accordionGfx.clear();
    const accordionY = -56;
    const foldCount = 5;
    const accordionWidth = 32 + s.bellowsRatio * 8;
    const foldSpacing = accordionWidth / foldCount;
    const leftX = -accordionWidth / 2;
    for (let i = 0; i < foldCount; i++) {
      const fx = leftX + i * foldSpacing;
      const isEven = i % 2 === 0;
      const topOffset = (isEven ? -10 : -7) - Math.sin(s.wobbleAngle) * (i - 2) * 3;
      const botOffset = (isEven ? 10 : 7) + Math.sin(s.wobbleAngle) * (i - 2) * 3;
      this.accordionGfx.fillStyle(isEven ? 0x292524 : 0x44403c, 1);
      this.accordionGfx.fillRect(fx, accordionY + topOffset, foldSpacing + 1, botOffset - topOffset);
      this.accordionGfx.fillStyle(0xef4444, 0.9);
      this.accordionGfx.fillRect(fx, accordionY + topOffset + 1, foldSpacing + 1, 2);
      this.accordionGfx.fillStyle(0xfbbf24, 0.9);
      this.accordionGfx.fillRect(fx, accordionY + botOffset - 3, foldSpacing + 1, 2);
      this.accordionGfx.lineStyle(1.5, 0x18181b, 0.85);
      this.accordionGfx.lineBetween(fx, accordionY + topOffset, fx, accordionY + botOffset);
    }
    this.accordionGfx.fillStyle(0x78350f, 1);
    this.accordionGfx.fillRect(leftX - 4, accordionY - 11, 4, 22);
    this.accordionGfx.fillRect(leftX + accordionWidth, accordionY - 11, 4, 22);

    // Eye, auras
    this.eyeGfx.clear();
    const eyeX = 4;
    const eyeY = -66;
    const pulse = 0.75 + Math.sin(s.pulsePhase * 2) * 0.25 + s.bellowsRatio * 0.8;
    const steamBuff = s.activeBuff === 'steam';

    if (s.shielded) {
      this.eyeGfx.fillStyle(0x06b6d4, 0.18 * pulse);
      this.eyeGfx.fillCircle(0, -48, 42);
      this.eyeGfx.lineStyle(1.5, 0x67e8f9, 0.55 * pulse);
      this.eyeGfx.strokeCircle(0, -48, 42);
    }
    if (steamBuff) {
      this.eyeGfx.lineStyle(2, 0xfef3c7, 0.45 * pulse);
      this.eyeGfx.strokeEllipse(0, -20, 40, 14);
    } else if (s.activeBuff === 'balance') {
      this.eyeGfx.lineStyle(1.5, 0xf59e0b, 0.65);
      this.eyeGfx.strokeEllipse(0, -8, 38, 12);
    } else if (s.activeBuff === 'tips') {
      this.eyeGfx.fillStyle(0xfbbf24, 0.18 * pulse);
      this.eyeGfx.fillCircle(0, -48, 36);
    }

    this.eyeGfx.fillStyle(0x18181b, 0.85);
    this.eyeGfx.fillCircle(eyeX, eyeY, 8);
    this.eyeGfx.lineStyle(2, s.shielded ? 0x22d3ee : 0xd97706, 0.9);
    this.eyeGfx.strokeCircle(eyeX, eyeY, 8);
    this.eyeGfx.fillStyle(s.shielded ? 0x06b6d4 : 0xf59e0b, 0.25 * pulse);
    this.eyeGfx.fillCircle(eyeX, eyeY, 16 + s.bellowsRatio * 8);
    this.eyeGfx.fillStyle(s.shielded ? 0xe0f2fe : 0xfef08a, 1);
    this.eyeGfx.fillCircle(eyeX, eyeY, 4);
    this.eyeGfx.fillStyle(0xffffff, 0.95);
    this.eyeGfx.fillCircle(eyeX - 1, eyeY - 1, 1.8);

    // Steam
    this.steamGfx.clear();
    const steamColor = steamBuff ? 0xfef3c7 : s.shielded ? 0x67e8f9 : 0xfef3c7;
    for (const p of s.steam) {
      this.steamGfx.fillStyle(steamColor, p.alpha * 0.45);
      this.steamGfx.fillCircle(p.x, p.y, p.radius);
    }
  }
}
