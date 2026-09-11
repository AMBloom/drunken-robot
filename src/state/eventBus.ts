/**
 * EventBus - typed pub/sub between the Phaser game layer and the Tone.js audio layer.
 * Neither side imports the other; they only share this bus and the store.
 */

import type { InstrumentId } from '../audio/types.ts';
import type { StumbleCause } from '../game/balance.ts';

/** Timed buffs plus the shield, which is a stored charge rather than a timer. */
export type BuffType = 'tips' | 'balance' | 'steam' | 'shield';

export interface GameEventMap {
  /** Fired when the robot collects a floating power-up */
  BUFF_ACTIVATED: {
    buff: BuffType;
    duration: number;
  };

  /** Fired when an active buff runs out or is replaced */
  BUFF_DEACTIVATED: {
    buff: BuffType;
  };

  /** Fired when the robot loses balance past critical stability threshold */
  PLAYER_STUMBLE: {
    direction: 'left' | 'right';
    severity: number; // 0.0 to 1.0
    tiltAngle: number; // in radians
    speed: number;
    /** What knocked the robot over; decides the momentum cost. */
    cause: StumbleCause;
  };

  /** Fired GUST_WARNING_SEC before a gust of wind shoves the robot. */
  GUST_WARNING: {
    direction: 'left' | 'right';
    inSec: number;
  };

  /** Fired when a shield charge absorbs a hazard instead of a stumble. */
  SHIELD_BLOCKED: {
    hazardType: 'crate' | 'puddle';
  };

  /** Fired continuously as the player charges accordion bellows pressure */
  BELLOWS_COMPRESS: {
    pressure: number; // 0.0 to 1.0
    isCharging: boolean;
  };

  /** Fired upon releasing a charged accordion jump */
  BELLOWS_BURST: {
    jumpForce: number;
    pressure: number;
  };

  /** Fired when the robot touches down onto the cobblestone ground */
  PLAYER_LAND: {
    impactSpeed: number;
  };

  /** Fired during drunken stagger walking strides */
  PLAYER_STEP: {
    foot: 'left' | 'right';
    stride: number;
  };

  /**
   * Movement telemetry. Not emitted per frame today; reserved for a throttled
   * emitter once the music director consumes it.
   */
  VELOCITY_CHANGE: {
    vx: number;
    vy: number;
    speedRatio: number; // -1.0 to 1.0 normalized
    isGrounded: boolean;
  };

  /** Lean telemetry. Same status as VELOCITY_CHANGE. */
  LEAN_CHANGE: {
    angle: number; // in degrees
    balance: number; // -1.0 (far left) to 1.0 (far right)
  };

  /** Fired when a glowing copper tip (coin/gear) is collected */
  TIP_COLLECTED: {
    totalTips: number;
    momentum: number;
  };

  /** Fired when the robot collides with a street hazard */
  HAZARD_HIT: {
    x: number;
    y: number;
    hazardType: 'crate' | 'puddle';
  };

  /** Fired when busking momentum value changes */
  MOMENTUM_CHANGE: {
    momentum: number;
    previousMomentum: number;
    tier: number;
  };

  /** Fired when momentum crosses into a new ensemble companion tier */
  TIER_CHANGE: {
    tier: number;
    tierName: string;
    activeInstruments: InstrumentId[];
  };

  /** Fired when distance progression transitions into a new narrative Act biome */
  ACT_CHANGE: {
    act: number;
    name: string;
  };

  /** Fired when player begins the journey from the Title screen */
  GAME_START: Record<string, never>;

  /** Fired when the robot runs out of momentum (passed out) after initial grace period */
  GAME_OVER: {
    distanceTraveled: number;
    tips: number;
  };

  /** Fired when the robot reaches home after navigating all 5 acts */
  VICTORY: {
    distanceTraveled: number;
    tips: number;
  };

  /** Fired when the player retries after game over, victory, or from the pause menu */
  RESTART_GAME: Record<string, never>;

  /** Fired when game pause state toggles */
  GAME_PAUSE: {
    isPaused: boolean;
  };
}

export type GameEventType = keyof GameEventMap;
export type GameEventHandler<T extends GameEventType> = (payload: GameEventMap[T]) => void;

/** Handlers are stored erased; `on`/`emit` are the only typed entry points. */
type AnyHandler = (payload: never) => void;

export class EventBus {
  private listeners = new Map<GameEventType, Set<AnyHandler>>();

  /** Subscribe to a game event. Returns an unsubscribe function. */
  public on<T extends GameEventType>(event: T, handler: GameEventHandler<T>): () => void {
    let handlers = this.listeners.get(event);
    if (!handlers) {
      handlers = new Set();
      this.listeners.set(event, handlers);
    }
    handlers.add(handler);
    return () => {
      this.off(event, handler);
    };
  }

  /** Subscribe to a game event for a single delivery. */
  public once<T extends GameEventType>(event: T, handler: GameEventHandler<T>): () => void {
    const wrapper: GameEventHandler<T> = (payload) => {
      this.off(event, wrapper);
      handler(payload);
    };
    return this.on(event, wrapper);
  }

  /** Unsubscribe from a game event. */
  public off<T extends GameEventType>(event: T, handler: GameEventHandler<T>): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.listeners.delete(event);
    }
  }

  /** Emit an event to all subscribers. A throwing handler does not stop the others. */
  public emit<T extends GameEventType>(event: T, payload: GameEventMap[T]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    // Copy so handlers that unsubscribe themselves mid-emit do not skip siblings.
    for (const handler of [...handlers]) {
      try {
        (handler as GameEventHandler<T>)(payload);
      } catch (err) {
        console.error(`[EventBus] Error in handler for event '${event}':`, err);
      }
    }
  }

  /** Number of handlers registered for an event (used by tests). */
  public listenerCount(event: GameEventType): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /** Remove all registered listeners. */
  public clear(): void {
    this.listeners.clear();
  }
}

/** Global singleton instance */
export const eventBus = new EventBus();
