import Phaser from 'phaser';

export function drawPowerupSunflower(gfx: Phaser.GameObjects.Graphics): void {
  const cx = 16;
  const cy = 16;

  // 1. Golden Sunflower: 2x Tip Multiplier
  // Radiant golden halo
  gfx.fillStyle(0xf59e0b, 0.25);
  gfx.fillCircle(cx, cy, 15);
  gfx.fillStyle(0xfbbf24, 0.35);
  gfx.fillCircle(cx, cy, 12);

  // Sunflower golden petals (10 radiating petals)
  gfx.fillStyle(0xfbbf24, 1);
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5;
    const px = cx + Math.cos(angle) * 9.5;
    const py = cy + Math.sin(angle) * 9.5;
    gfx.fillCircle(px, py, 3.2);
  }
  // Inner petal highlight ring
  gfx.fillStyle(0xf59e0b, 1);
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 + Math.PI / 10;
    const px = cx + Math.cos(angle) * 7.5;
    const py = cy + Math.sin(angle) * 7.5;
    gfx.fillCircle(px, py, 2.4);
  }

  // Roasted seed center disk
  gfx.fillStyle(0x451a03, 1);
  gfx.fillCircle(cx, cy, 5.5);
  gfx.lineStyle(1.2, 0x18181b, 0.95);
  gfx.strokeCircle(cx, cy, 5.5);

  // Spiraled golden pollen dots
  gfx.fillStyle(0xfde68a, 1);
  gfx.fillCircle(cx, cy, 1.2);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    gfx.fillCircle(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, 0.9);
  }
}

export function drawPowerupBrandy(gfx: Phaser.GameObjects.Graphics): void {
  const cx = 16;
  const cy = 16;

  // 2. Flask of Gypsy Brandy: +50% Balance Stability
  // Amber spirit aura
  gfx.fillStyle(0xd97706, 0.22);
  gfx.fillCircle(cx, cy, 14.5);
  gfx.fillStyle(0xf59e0b, 0.3);
  gfx.fillCircle(cx, cy + 2, 11);

  // Flask glass bulbous silhouette
  gfx.fillStyle(0x1c1917, 0.9);
  gfx.fillRoundedRect(7, 10, 18, 17, 6);

  // Rich amber brandy liquor fill
  gfx.fillStyle(0xb45309, 1);
  gfx.fillRoundedRect(8, 14, 16, 12, 4);
  gfx.fillStyle(0xd97706, 0.9);
  gfx.fillRect(9, 14, 14, 4);

  // Meniscus liquid shine line
  gfx.lineStyle(1, 0xfef08a, 0.85);
  gfx.strokeLineShape(new Phaser.Geom.Line(9, 14, 23, 14));

  // Flask neck
  gfx.fillStyle(0x27272a, 1);
  gfx.fillRect(13, 6, 6, 5);

  // Brass neck band
  gfx.fillStyle(0xf59e0b, 1);
  gfx.fillRect(12, 9, 8, 2);

  // Turned wood / cork bung stopper
  gfx.fillStyle(0x78350f, 1);
  gfx.fillRoundedRect(12, 2.5, 8, 4.5, 1.5);

  // Glass specular reflection glint
  gfx.lineStyle(1.5, 0xffffff, 0.65);
  gfx.strokeLineShape(new Phaser.Geom.Line(9, 13, 10, 22));

  // Outer sketch contour
  gfx.lineStyle(1.2, 0x18181b, 0.95);
  gfx.strokeRoundedRect(7, 10, 18, 17, 6);
}

export function drawPowerupSteam(gfx: Phaser.GameObjects.Graphics): void {
  const cx = 16;
  const cy = 16;

  // 3. Glowing Blue Steam Cog: Super Jump + Hazard Invulnerability
  // Electric cyan outer vapor halo
  gfx.fillStyle(0x06b6d4, 0.28);
  gfx.fillCircle(cx, cy, 15);
  gfx.fillStyle(0x22d3ee, 0.4);
  gfx.fillCircle(cx, cy, 11);

  // 8 clockwork gear teeth
  gfx.fillStyle(0x0e7490, 1);
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const tx = cx + Math.cos(angle) * 10;
    const ty = cy + Math.sin(angle) * 10;
    gfx.fillCircle(tx, ty, 3.0);
  }

  // Main gear body & high-voltage rim
  gfx.fillStyle(0x0891b2, 1);
  gfx.fillCircle(cx, cy, 8.8);
  gfx.lineStyle(1.5, 0x67e8f9, 0.95);
  gfx.strokeCircle(cx, cy, 8.8);

  // Center steam aperture
  gfx.fillStyle(0x164e63, 1);
  gfx.fillCircle(cx, cy, 4.8);

  // Glowing white-hot steam core nozzle
  gfx.fillStyle(0xe0f2fe, 1);
  gfx.fillCircle(cx, cy, 2.8);
  gfx.fillStyle(0xffffff, 1);
  gfx.fillCircle(cx - 0.5, cy - 0.5, 1.4);

  // 4 steam relief vent pinholes
  gfx.fillStyle(0x67e8f9, 0.9);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    gfx.fillCircle(cx + Math.cos(a) * 6.5, cy + Math.sin(a) * 6.5, 0.9);
  }
}

/** Brass shield: a riveted disc with a cyan glow, for the one-hit hazard shield. */
export function drawPowerupShield(gfx: Phaser.GameObjects.Graphics): void {
  const cx = 16;
  const cy = 16;
  gfx.fillStyle(0x06b6d4, 0.18);
  gfx.fillCircle(cx, cy, 15);
  gfx.fillStyle(0x0e7490, 1);
  gfx.fillCircle(cx, cy, 11);
  gfx.fillStyle(0xb45309, 1);
  gfx.beginPath();
  gfx.moveTo(cx, cy - 10);
  gfx.lineTo(cx + 8, cy - 6);
  gfx.lineTo(cx + 7, cy + 4);
  gfx.lineTo(cx, cy + 10);
  gfx.lineTo(cx - 7, cy + 4);
  gfx.lineTo(cx - 8, cy - 6);
  gfx.closePath();
  gfx.fillPath();
  gfx.lineStyle(1.5, 0x18181b, 0.95);
  gfx.strokePath();
  gfx.fillStyle(0xfbbf24, 0.95);
  gfx.fillCircle(cx, cy - 6, 1.4);
  gfx.fillCircle(cx + 5, cy - 3, 1.4);
  gfx.fillCircle(cx - 5, cy - 3, 1.4);
  gfx.fillCircle(cx, cy + 4, 1.4);
  gfx.lineStyle(1.2, 0x67e8f9, 0.9);
  gfx.strokeCircle(cx, cy, 11);
}
