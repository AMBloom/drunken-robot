import Phaser from 'phaser';
import { eventBus, type BuffType } from '../../state/eventBus.ts';
import { BUFFS, SWAY, type StumbleCause } from '../balance.ts';
import { Rng } from '../systems/Rng.ts';
import { GustScheduler, SwayModel } from '../systems/sway.ts';
import { RobotRenderer, type SteamParticle } from './RobotRenderer.ts';

export interface RobotInputs {
  left: boolean;
  right: boolean;
  jump: boolean;
}

/**
 * Per-frame snapshot of the game state the robot depends on. The scene builds
 * one of these each update so the entity never reads the store itself.
 */
export interface RobotContext {
  activeAct: number;
  activeBuff: Exclude<BuffType, 'shield'> | null;
  shielded: boolean;
  /** Forward auto-walk speed for the current act, px/s. */
  walkSpeed: number;
  /** Skip the 360° stumble spin and other large motion. */
  reducedMotion: boolean;
}

/**
 * Robot - the drunken automaton's physics and control.
 *
 * Auto-walks forward while a seeded noise field tilts it; the player
 * counter-steers with left/right torque. Random gusts shove it after a short
 * warning. Holding jump charges the bellows; releasing fires the jump.
 */
export class Robot extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body;

  private static readonly MAX_WALK_SPEED = 240;
  private static readonly TORQUE_FORCE = 5.6;
  private static readonly SPRING_STIFFNESS = 6.0;
  private static readonly DAMPING = 3.2;
  private static readonly BASE_JUMP_FORCE = 390;
  private static readonly MAX_JUMP_BOOST = 410;
  private static readonly COYOTE_DURATION = 0.14;
  private static readonly STUMBLE_DURATION = 1.35;
  private static readonly STUMBLE_GRACE = 1.2;

  // Balance
  private wobbleAngle = 0;
  private wobbleAngularVel = 0;
  private elapsed = 0;
  private isStumbling = false;
  private stumbleTimer = 0;
  private stumbleCooldown = 0;
  private stumbleDirection: 'left' | 'right' = 'right';
  public spinAngleOffset = 0;
  private spinTween?: Phaser.Tweens.Tween;
  private readonly sway: SwayModel;
  private readonly gusts: GustScheduler;

  // Bellows and jump
  private bellowsPressure = 0;
  private isChargingBellows = false;
  private wasGrounded = true;
  private coyoteTimer = 0;

  // Gait
  private stridePhase = 0;
  private lastFootStep: 'left' | 'right' = 'left';

  private readonly steamParticles: SteamParticle[] = [];
  private readonly renderer: RobotRenderer;
  private readonly fx: Rng;
  private ctx: RobotContext = {
    activeAct: 1,
    activeBuff: null,
    shielded: false,
    walkSpeed: 180,
    reducedMotion: false,
  };

  constructor(scene: Phaser.Scene, x: number, y: number, seed: number) {
    super(scene, x, y);
    scene.add.existing(this);
    scene.physics.world.enable(this);

    // Origin is at ground contact between the feet
    this.body.setSize(46, 88);
    this.body.setOffset(-23, -88);
    this.body.setCollideWorldBounds(false);
    this.body.setDragX(350);
    this.body.setMaxVelocity(Robot.MAX_WALK_SPEED + 120, 850);
    this.body.setBounce(0.04, 0.04);

    const rng = new Rng(seed);
    this.sway = new SwayModel(seed);
    this.gusts = new GustScheduler(rng.fork('gusts'));
    this.fx = rng.fork('fx');

    this.renderer = new RobotRenderer(scene, this);
    this.render(0);
  }

  public getBellowsPressure(): number {
    return this.bellowsPressure;
  }

  public getWobbleAngle(): number {
    return this.wobbleAngle;
  }

  public getIsStumbling(): boolean {
    return this.isStumbling;
  }

  public getDynamicStabilityThreshold(): number {
    const base = SWAY.stabilityThreshold[this.ctx.activeAct - 1] ?? SWAY.stabilityThreshold[0];
    return this.ctx.activeBuff === 'balance' ? base * BUFFS.balance.thresholdMul : base;
  }

  public getStabilityRatio(): number {
    return Phaser.Math.Clamp(Math.abs(this.wobbleAngle) / this.getDynamicStabilityThreshold(), 0, 1);
  }

  public update(_time: number, delta: number, inputs: RobotInputs, ctx: RobotContext): void {
    this.ctx = ctx;
    const dt = Math.min(delta / 1000, 0.1);
    this.elapsed += dt;
    const grounded = Boolean(this.body.blocked.down || this.body.touching.down);

    this.coyoteTimer = grounded ? Robot.COYOTE_DURATION : Math.max(0, this.coyoteTimer - dt);
    const canJump = grounded || this.coyoteTimer > 0;

    if (!this.wasGrounded && grounded) {
      eventBus.emit('PLAYER_LAND', { impactSpeed: Math.abs(this.body.velocity.y) });
      this.wobbleAngularVel += (this.fx.next() - 0.5) * 3.5;
      this.spawnSteam(0, -78, 6, 40);
    }
    this.wasGrounded = grounded;

    this.handleBellowsJump(dt, inputs, canJump);
    this.handleHorizontalMovement(dt, inputs, grounded);
    this.updateSteam(dt);
    this.render(grounded ? this.body.velocity.x : 0);
  }

  private handleBellowsJump(dt: number, inputs: RobotInputs, canJump: boolean): void {
    if (inputs.jump) {
      this.isChargingBellows = true;
      this.bellowsPressure = Math.min(1.0, this.bellowsPressure + dt * 1.55);
      eventBus.emit('BELLOWS_COMPRESS', { pressure: this.bellowsPressure, isCharging: true });
      if (this.fx.next() < 0.25) this.spawnSteam(6, -82, 3, 20);
      return;
    }

    if (!this.isChargingBellows) return;

    if (canJump) {
      const jumpMul = this.ctx.activeBuff === 'steam' ? BUFFS.steam.jumpMul : 1;
      const jumpForce = Robot.BASE_JUMP_FORCE * jumpMul + this.bellowsPressure * Robot.MAX_JUMP_BOOST;
      this.body.setVelocityY(-jumpForce);
      this.coyoteTimer = 0;
      this.body.velocity.x += Math.sin(this.wobbleAngle) * 160;
      eventBus.emit('BELLOWS_BURST', { jumpForce, pressure: this.bellowsPressure });
      this.spawnSteam(0, -82, 10, 75);
    }

    this.isChargingBellows = false;
    this.bellowsPressure = 0;
    eventBus.emit('BELLOWS_COMPRESS', { pressure: 0, isCharging: false });
  }

  private handleHorizontalMovement(dt: number, inputs: RobotInputs, grounded: boolean): void {
    if (this.isStumbling) {
      this.stumbleTimer -= dt;
      this.body.setVelocityX(this.stumbleDirection === 'right' ? 50 : 30);
      this.wobbleAngle = Math.sin(this.stumbleTimer * 18) * 0.42;
      if (this.stumbleTimer <= 0) {
        this.isStumbling = false;
        this.spinAngleOffset = 0;
        this.stumbleCooldown = Robot.STUMBLE_GRACE;
      }
      return;
    }

    if (this.stumbleCooldown > 0) this.stumbleCooldown -= dt;

    // Constant forward walk; keep forward momentum while airborne
    const walk = this.ctx.walkSpeed;
    this.body.setVelocityX(grounded ? walk : Math.max(walk, this.body.velocity.x));

    // Footsteps
    this.stridePhase += dt * 6.5;
    const gait = Math.sin(this.stridePhase) > 0 ? 'right' : 'left';
    if (gait !== this.lastFootStep && grounded && Math.abs(this.body.velocity.x) > 30) {
      this.lastFootStep = gait;
      eventBus.emit('PLAYER_STEP', {
        foot: gait,
        stride: Math.abs(this.body.velocity.x) / Robot.MAX_WALK_SPEED,
      });
    }

    // Gusts: warn, then shove
    for (const gust of this.gusts.update(dt, this.ctx.activeAct, this.ctx.activeBuff === 'balance')) {
      if (gust.kind === 'warning') {
        eventBus.emit('GUST_WARNING', { direction: gust.direction, inSec: gust.value });
      } else {
        this.wobbleAngularVel += gust.value;
        this.spawnSteam(gust.direction === 'right' ? -10 : 10, -60, 5, 50);
      }
    }

    // Torques: seeded noise sway plus player counter-steer, on a spring-damper
    const naturalSway = this.sway.torque(this.elapsed, this.ctx.activeAct);
    let control = 0;
    if (inputs.left) control -= Robot.TORQUE_FORCE;
    if (inputs.right) control += Robot.TORQUE_FORCE;
    const spring = -this.wobbleAngle * Robot.SPRING_STIFFNESS;
    this.wobbleAngularVel =
      (this.wobbleAngularVel + (spring + naturalSway + control) * dt) * (1 - dt * Robot.DAMPING);
    this.wobbleAngle += this.wobbleAngularVel * dt;

    if (
      Math.abs(this.wobbleAngle) > this.getDynamicStabilityThreshold() &&
      this.stumbleCooldown <= 0 &&
      grounded
    ) {
      this.triggerStumble();
    }
  }

  /** Knocks the robot over. Natural balance failures use the defaults; hazards pass their kind. */
  public triggerStumble(severityOverride?: number, cause: StumbleCause = 'balance'): void {
    if (this.isStumbling) return;

    this.isStumbling = true;
    this.stumbleTimer = Robot.STUMBLE_DURATION;
    this.stumbleDirection = this.wobbleAngle >= 0 ? 'right' : 'left';
    this.body.setVelocityY(-210);

    this.spinTween?.stop();
    this.spinAngleOffset = 0;
    if (this.ctx.reducedMotion) {
      // A short alpha flash instead of a full spin
      this.scene.tweens.add({ targets: this, alpha: { from: 0.35, to: 1 }, duration: 200 });
    } else {
      this.spinTween = this.scene.tweens.add({
        targets: this,
        spinAngleOffset: this.stumbleDirection === 'right' ? Math.PI * 2 : -Math.PI * 2,
        duration: 850,
        ease: 'Cubic.easeOut',
      });
    }

    const threshold = this.getDynamicStabilityThreshold();
    const severity =
      severityOverride ?? Phaser.Math.Clamp((Math.abs(this.wobbleAngle) - threshold) / 0.12 + 0.45, 0.4, 1.0);

    eventBus.emit('PLAYER_STUMBLE', {
      direction: this.stumbleDirection,
      severity,
      tiltAngle: this.wobbleAngle,
      speed: Math.abs(this.body.velocity.x),
      cause,
    });

    this.spawnSteam(this.stumbleDirection === 'right' ? 8 : -8, -80, 8, 60);
  }

  private spawnSteam(x: number, y: number, count: number, maxSpeed: number): void {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (this.fx.next() - 0.5) * 1.2;
      const speed = 20 + this.fx.next() * maxSpeed;
      this.steamParticles.push({
        x: x + (this.fx.next() - 0.5) * 8,
        y: y + (this.fx.next() - 0.5) * 6,
        radius: 3 + this.fx.next() * 5,
        alpha: 0.85,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.4 + this.fx.next() * 0.5,
      });
    }
  }

  private updateSteam(dt: number): void {
    for (let i = this.steamParticles.length - 1; i >= 0; i--) {
      const p = this.steamParticles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.radius += dt * 4;
      p.alpha = Math.max(0, 0.85 * (1 - p.life / p.maxLife));
      if (p.life >= p.maxLife) this.steamParticles.splice(i, 1);
    }
  }

  private render(vx: number): void {
    this.renderer.draw(this, {
      wobbleAngle: this.wobbleAngle,
      spinAngleOffset: this.spinAngleOffset,
      stridePhase: this.stridePhase,
      pulsePhase: this.elapsed * 3.2,
      vx,
      bellowsRatio: this.bellowsPressure,
      activeBuff: this.ctx.activeBuff,
      shielded: this.ctx.shielded,
      steam: this.steamParticles,
    });
  }
}
