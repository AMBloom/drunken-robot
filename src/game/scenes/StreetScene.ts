import Phaser from 'phaser';
import { Robot, type RobotContext, type RobotInputs } from '../entities/Robot.ts';
import { store } from '../../state/store.ts';
import { eventBus, type BuffType } from '../../state/eventBus.ts';
import { ensureActTextures, releaseActTextures } from '../art/textureFactory.ts';
import { ACT_WALK_SPEED, BUFFS } from '../balance.ts';
import { HazardSpawner, type Chunk } from '../systems/HazardSpawner.ts';
import { Rng } from '../systems/Rng.ts';
import { InputController } from '../systems/InputController.ts';
import type { AppFlags } from '../../app/flags.ts';
import {
  HUD_REGISTRY_KEY,
  SceneKeys,
  type EndSceneData,
  type HudTelemetry,
  type RunOutcome,
} from './keys.ts';

interface ParallaxLayer {
  name: 'sky' | 'distant' | 'midground' | 'street' | 'foreground';
  tileSprite: Phaser.GameObjects.TileSprite;
  scrollSpeedFactor: number;
  currentTint: number;
}

const POWERUP_TEXTURES: Record<BuffType, string> = {
  tips: 'powerup_sunflower',
  balance: 'powerup_brandy',
  steam: 'powerup_steam',
  shield: 'powerup_shield',
};

const POWERUP_LABELS: Record<BuffType, [string, string]> = {
  tips: ['2X TIPS! 🌻', '#fbbf24'],
  balance: ['+50% STABILITY! 🍾', '#34d399'],
  steam: ['STEAM JUMP! 💨', '#fef3c7'],
  shield: ['SHIELD! 🛡️', '#38bdf8'],
};

/**
 * StreetScene - the run itself: parallax world, robot, spawner, collisions.
 * Readouts live in HudScene, the pause menu in PauseScene, and both outcomes
 * in EndScene, so this scene only owns the world.
 */
export class StreetScene extends Phaser.Scene {
  private static readonly GROUND_Y = 584;
  private static readonly SPAWN_LOOKAHEAD_PX = 1100;
  private static readonly HAZARD_SPECS = {
    crate: { width: 38, height: 38 },
    puddle: { width: 52, height: 14 },
  } as const;

  private layers: ParallaxLayer[] = [];
  private robot!: Robot;
  private groundPlatform!: Phaser.GameObjects.Rectangle;
  private tipsGroup!: Phaser.Physics.Arcade.Group;
  private hazardsGroup!: Phaser.Physics.Arcade.Group;
  private powerupsGroup!: Phaser.Physics.Arcade.Group;
  private spawner!: HazardSpawner;

  private inputController!: InputController;
  private flags: AppFlags | undefined;
  private keyP?: Phaser.Input.Keyboard.Key;
  private keyEsc?: Phaser.Input.Keyboard.Key;

  private isRunOver = false;
  private isPaused = false;
  private restartRequested = false;
  private unsubscribers: Array<() => void> = [];

  constructor() {
    super({ key: SceneKeys.Street });
  }

  create(): void {
    const { width, height } = this.scale;
    this.layers = [];
    this.isRunOver = false;
    this.isPaused = false;
    this.restartRequested = false;

    // Tear down anything left from a previous run *before* registering new listeners.
    this.cleanupListeners();
    this.physics.resume();

    this.flags = this.registry.get('flags') as AppFlags | undefined;
    const reduced = this.flags?.reducedMotion ?? false;
    const seed = store.getState().seed;
    const rng = new Rng(seed);
    this.spawner = new HazardSpawner(rng.fork('spawner'));

    // 1. Parallax layers pinned to the camera
    const initialAct = store.getState().activeAct || 1;
    ensureActTextures(this, initialAct);
    ensureActTextures(this, initialAct + 1);
    const addLayer = (name: ParallaxLayer['name'], key: string, factor: number): void => {
      const tileSprite = this.add.tileSprite(0, 0, width, height, key).setOrigin(0, 0).setScrollFactor(0);
      this.layers.push({ name, tileSprite, scrollSpeedFactor: factor, currentTint: 0xffffff });
    };
    addLayer('sky', 'bg_sky', 0.1);
    addLayer('distant', 'bg_distant', 0.25);
    addLayer('midground', `bg_midground_act${initialAct}`, 0.55);
    addLayer('street', 'bg_street', 1.0);
    // Reduced motion halves the fast foreground layer, the most vection-inducing one
    addLayer('foreground', 'bg_foreground', reduced ? 0.6 : 1.25);

    // 2. Ground platform at the curb baseline
    this.groundPlatform = this.add
      .rectangle(0, StreetScene.GROUND_Y, 500000, 60, 0x000000, 0)
      .setOrigin(0, 0);
    this.physics.add.existing(this.groundPlatform, true);

    // 3. Object groups
    const groupConfig = { allowGravity: false, immovable: true };
    this.tipsGroup = this.physics.add.group(groupConfig);
    this.hazardsGroup = this.physics.add.group(groupConfig);
    this.powerupsGroup = this.physics.add.group(groupConfig);

    // 4. Robot
    this.robot = new Robot(this, 320, 520, rng.fork('robot').between(0, 0x7fffffff));
    this.physics.add.collider(this.robot, this.groundPlatform);
    this.physics.add.overlap(this.robot, this.tipsGroup, (_r, obj) =>
      this.handleCollectTip(obj as Phaser.Physics.Arcade.Sprite),
    );
    this.physics.add.overlap(this.robot, this.hazardsGroup, (_r, obj) =>
      this.handleHitHazard(obj as Phaser.Physics.Arcade.Sprite),
    );
    this.physics.add.overlap(this.robot, this.powerupsGroup, (_r, obj) =>
      this.handleCollectPowerup(obj as Phaser.Physics.Arcade.Sprite),
    );

    // 5. Camera
    this.cameras.main.startFollow(this.robot, true, 0.08, 0.08, -140, 50);
    this.cameras.main.setBounds(0, 0, Number.MAX_SAFE_INTEGER, 720);

    // 6. Input
    this.setupInputControls();

    // 7. Bus listeners
    this.unsubscribers = [
      eventBus.on('ACT_CHANGE', (p) => this.handleActTransition(p.act)),
      eventBus.on('GAME_OVER', () => this.handleGameOver()),
      eventBus.on('VICTORY', () => this.handleVictory()),
      eventBus.on('GAME_PAUSE', (p) => this.handlePauseChange(p.isPaused)),
      // Every stumble costs momentum; the cause decides how much.
      eventBus.on('PLAYER_STUMBLE', (p) => store.applyStumblePenalty(p.cause)),
    ];
    this.events.once('shutdown', () => {
      this.cleanupListeners();
      this.scene.stop(SceneKeys.Hud);
      this.scene.stop(SceneKeys.Pause);
    });

    this.applyInstantActPalette(initialAct);

    // 8. Readouts live in their own scene on top of this one
    this.scene.launch(SceneKeys.Hud);
  }

  private setupInputControls(): void {
    this.inputController = new InputController(this, this.flags?.coarsePointer ?? false);
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    this.keyP = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.keyEsc = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyP.on('down', () => this.togglePause());
    this.keyEsc.on('down', () => this.togglePause());
  }

  // ---------------------------------------------------------------
  // Acts and palette
  // ---------------------------------------------------------------

  private applyInstantActPalette(act: number): void {
    const actDef = store.getActDefinition(act);
    this.layers.find((l) => l.name === 'midground')?.tileSprite.setTexture(`bg_midground_act${act}`);
    for (const layer of this.layers) {
      const tint = actDef.visualPalette[layer.name] ?? 0xffffff;
      layer.tileSprite.setTint(tint);
      layer.currentTint = tint;
    }
  }

  private handleActTransition(act: number): void {
    const actDef = store.getActDefinition(act);

    // Keep only the current and next midgrounds resident (each is a 2560x720 texture).
    ensureActTextures(this, act);
    // Build the following act's midground a little later, off the transition frame,
    // and free the previous one once the tint tween has finished.
    this.time.delayedCall(1200, () => ensureActTextures(this, act + 1));
    this.time.delayedCall(3000, () => releaseActTextures(this, act - 1));

    this.layers.find((l) => l.name === 'midground')?.tileSprite.setTexture(`bg_midground_act${act}`);

    for (const layer of this.layers) {
      const fromColor = Phaser.Display.Color.ValueToColor(layer.currentTint);
      const targetHex = actDef.visualPalette[layer.name] ?? 0xffffff;
      const toColor = Phaser.Display.Color.ValueToColor(targetHex);
      const progress = { t: 0 };
      this.tweens.add({
        targets: progress,
        t: 1,
        duration: 2500,
        ease: 'Quad.easeInOut',
        onUpdate: () => {
          const c = Phaser.Display.Color.Interpolate.ColorWithColor(
            fromColor,
            toColor,
            100,
            Math.round(progress.t * 100),
          );
          const hex = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
          layer.tileSprite.setTint(hex);
          layer.currentTint = hex;
        },
        onComplete: () => {
          layer.tileSprite.setTint(targetHex);
          layer.currentTint = targetHex;
        },
      });
    }
  }

  // ---------------------------------------------------------------
  // Spawning: the planner decides, this materialises
  // ---------------------------------------------------------------

  private fillStreetAhead(): void {
    const act = store.getState().activeAct || 1;
    while (this.spawner.upcomingX < this.robot.x + StreetScene.SPAWN_LOOKAHEAD_PX) {
      this.materialize(this.spawner.nextChunk(act), act);
    }
  }

  private materialize(chunk: Chunk, act: number): void {
    for (const p of chunk.placements) {
      const x = chunk.x + p.dx;
      if (p.kind === 'gear') {
        this.createTip(x, p.y);
      } else {
        this.spawnHazard(x, p.y, p.kind, `hazard_${p.kind}_act${act}`);
      }
    }
    if (chunk.powerup) {
      this.createPowerup(chunk.x + chunk.powerup.dx, chunk.powerup.y, chunk.powerup.kind);
    }
  }

  private spawnHazard(x: number, y: number, kind: 'crate' | 'puddle', textureKey: string): void {
    const spec = StreetScene.HAZARD_SPECS[kind];
    const hazard = this.hazardsGroup.create(x, y, textureKey) as Phaser.Physics.Arcade.Sprite;
    hazard.setOrigin(0.5, 0.5);
    (hazard.body as Phaser.Physics.Arcade.Body | null)?.setSize(spec.width, spec.height);
    hazard.setData('hazardType', kind);
  }

  private createTip(x: number, y: number): void {
    const tip = this.tipsGroup.create(x, y, 'item_tip_gear') as Phaser.Physics.Arcade.Sprite;
    tip.setOrigin(0.5, 0.5);
    (tip.body as Phaser.Physics.Arcade.Body | null)?.setSize(22, 22);
    if (this.flags?.reducedMotion) return;
    this.tweens.add({
      targets: tip,
      y: y - 6,
      duration: 800 + (x % 400),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createPowerup(x: number, y: number, kind: BuffType): void {
    const powerup = this.powerupsGroup.create(x, y, POWERUP_TEXTURES[kind]) as Phaser.Physics.Arcade.Sprite;
    powerup.setOrigin(0.5, 0.5);
    (powerup.body as Phaser.Physics.Arcade.Body | null)?.setSize(28, 28);
    powerup.setData('buffType', kind);
    this.tweens.add({
      targets: powerup,
      y: y - 28,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Destroys a pooled sprite and any tweens still targeting it. */
  private destroyEntity(sprite: Phaser.GameObjects.GameObject): void {
    this.tweens.killTweensOf(sprite);
    sprite.destroy();
  }

  private recycleOffscreenEntities(): void {
    const despawnX = this.cameras.main.scrollX - 250;
    for (const group of [this.tipsGroup, this.hazardsGroup, this.powerupsGroup]) {
      for (const child of [...group.getChildren()]) {
        const sprite = child as Phaser.Physics.Arcade.Sprite;
        if (sprite.x < despawnX) this.destroyEntity(sprite);
      }
    }
  }

  /** Under the tips buff, nearby gears drift toward the robot. */
  private applyMagnet(dt: number): void {
    if (store.getState().activeBuff !== 'tips') return;
    const radius = BUFFS.tips.magnetRadius;
    const rx = this.robot.x;
    const ry = this.robot.y - 40;
    for (const child of this.tipsGroup.getChildren()) {
      const tip = child as Phaser.Physics.Arcade.Sprite;
      if (!tip.active) continue;
      const dx = rx - tip.x;
      const dy = ry - tip.y;
      if (dx * dx + dy * dy > radius * radius) continue;
      this.tweens.killTweensOf(tip);
      tip.x += dx * Math.min(1, 9 * dt);
      tip.y += dy * Math.min(1, 9 * dt);
    }
  }

  // ---------------------------------------------------------------
  // Collisions
  // ---------------------------------------------------------------

  private handleCollectTip(tip: Phaser.Physics.Arcade.Sprite): void {
    if (!tip.active) return;
    const { x, y } = tip;
    tip.disableBody(true, true);
    this.destroyEntity(tip);
    store.addTips(1);
    this.floatText(x, y - 10, '+1 ⚙️', '#fbbf24', 15, 600, 28);
  }

  private handleCollectPowerup(powerup: Phaser.Physics.Arcade.Sprite): void {
    if (!powerup.active) return;
    const { x, y } = powerup;
    const buff = powerup.getData('buffType') as BuffType;
    powerup.disableBody(true, true);
    this.destroyEntity(powerup);
    store.activateBuff(buff);
    const [text, color] = POWERUP_LABELS[buff];
    this.floatText(x, y - 15, text, color, 17, 900, 45, '#18181b');
  }

  private handleHitHazard(hazard: Phaser.Physics.Arcade.Sprite): void {
    if (!hazard.active || hazard.getData('hit')) return;
    hazard.setData('hit', true);
    const { x, y } = hazard;
    const hazardType = (hazard.getData('hazardType') as 'crate' | 'puddle' | undefined) ?? 'crate';

    if (store.consumeShield()) {
      hazard.setTint(0x38bdf8);
      this.tweens.add({
        targets: hazard,
        alpha: 0,
        y: y - 45,
        angle: 75,
        scaleX: 0.6,
        scaleY: 0.6,
        duration: 400,
        ease: 'Cubic.easeIn',
        onComplete: () => this.destroyEntity(hazard),
      });
      eventBus.emit('SHIELD_BLOCKED', { hazardType });
      this.floatText(x, y - 25, 'BLOCKED! 🛡️', '#38bdf8', 16, 650, 33, '#082f49');
      return;
    }

    hazard.setTint(0xef4444);
    this.robot.triggerStumble(0.85, hazardType);
    if (!this.flags?.reducedMotion) this.cameras.main.shake(180, 0.005);
    eventBus.emit('HAZARD_HIT', { x, y, hazardType });
    this.floatText(x, y - 25, 'STUMBLE! ⚠️', '#ef4444', 15, 750, 25);
  }

  private floatText(
    x: number,
    y: number,
    text: string,
    color: string,
    size: number,
    duration: number,
    rise: number,
    stroke?: string,
  ): void {
    const label = this.add
      .text(x, y, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${size}px`,
        color,
        fontStyle: 'bold',
        stroke,
        strokeThickness: stroke ? 3 : 0,
      })
      .setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: label,
      y: y - rise,
      alpha: 0,
      duration,
      ease: 'Power2',
      onComplete: () => label.destroy(),
    });
  }

  // ---------------------------------------------------------------
  // Frame loop
  // ---------------------------------------------------------------

  override update(time: number, delta: number): void {
    if (this.isRunOver || this.isPaused) return;

    const dt = Math.min(delta / 1000, 0.1);
    store.decayMomentum(dt);

    const inputs: RobotInputs = this.inputController.read();

    const state = store.getState();
    const ctx: RobotContext = {
      activeAct: state.activeAct,
      activeBuff: state.activeBuff,
      shielded: state.shieldCharges > 0,
      walkSpeed: ACT_WALK_SPEED[state.activeAct - 1] ?? ACT_WALK_SPEED[0],
      reducedMotion: this.flags?.reducedMotion ?? false,
    };
    this.robot.update(time, delta, inputs, ctx);

    this.fillStreetAhead();
    this.applyMagnet(dt);
    this.recycleOffscreenEntities();

    const scrollX = this.cameras.main.scrollX;
    for (const layer of this.layers) {
      layer.tileSprite.tilePositionX = scrollX * layer.scrollSpeedFactor;
    }
    store.updateDistance(scrollX);

    // One coalesced store notification per frame, then publish telemetry for the HUD
    store.flush();
    const telemetry: HudTelemetry = {
      bellowsPressure: this.robot.getBellowsPressure(),
      stabilityRatio: this.robot.getStabilityRatio(),
      isStumbling: this.robot.getIsStumbling(),
      wobbleAngle: this.robot.getWobbleAngle(),
      stabilityThreshold: this.robot.getDynamicStabilityThreshold(),
    };
    this.registry.set(HUD_REGISTRY_KEY, telemetry);
  }

  // ---------------------------------------------------------------
  // Run lifecycle
  // ---------------------------------------------------------------

  /**
   * The single restart path: resumes anything paused, kills every tween so
   * nothing outlives the scene, resets the run, and tells the audio layer to
   * start over from Act 1.
   */
  public restartRun(): void {
    if (this.restartRequested) return;
    this.restartRequested = true;

    this.scene.stop(SceneKeys.Pause);
    if (this.scene.isPaused()) this.scene.resume();
    this.physics.resume();
    this.tweens.killAll();
    store.setPaused(false);
    store.reset();
    eventBus.emit('RESTART_GAME', {});
    this.scene.restart();
  }

  private endData(outcome: RunOutcome): EndSceneData {
    const s = store.getState();
    return {
      outcome,
      distanceTraveled: s.distanceTraveled,
      tips: s.tips,
      tier: s.momentumTier,
      tierName: s.tierName,
      act: s.activeAct,
      actName: s.actName,
      elapsedSec: store.getElapsedTime(),
      seed: s.seed,
    };
  }

  private handleGameOver(): void {
    if (this.isRunOver) return;
    this.isRunOver = true;
    this.physics.pause();

    // Face-plant, then hand off to the end screen
    this.tweens.add({
      targets: this.robot,
      angle: 85,
      y: StreetScene.GROUND_Y,
      duration: 750,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.cameras.main.fade(500, 5, 7, 14);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start(SceneKeys.End, this.endData('gameover'));
        });
      },
    });
  }

  private handleVictory(): void {
    if (this.isRunOver) return;
    this.isRunOver = true;
    this.robot.body.setVelocity(0, 0);
    this.cameras.main.fade(1200, 10, 14, 24);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SceneKeys.End, this.endData('victory'));
    });
  }

  public togglePause(): void {
    if (this.isRunOver) return;
    store.togglePause();
  }

  private handlePauseChange(paused: boolean): void {
    if (this.isRunOver || this.isPaused === paused) return;
    this.isPaused = paused;
    if (paused) {
      // scene.pause() freezes update, physics, tweens, and timers together.
      this.scene.launch(SceneKeys.Pause);
      this.scene.pause();
    } else {
      this.scene.stop(SceneKeys.Pause);
      this.scene.resume();
    }
  }

  private cleanupListeners(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers = [];
    this.keyP?.removeAllListeners();
    this.keyEsc?.removeAllListeners();
  }
}
