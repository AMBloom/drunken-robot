import type { InstrumentId, MeterType, ScaleName } from '../audio/types.ts';
import {
  ACT_MIN_DISTANCE,
  BUFFS,
  MOMENTUM,
  VICTORY_DISTANCE as BALANCE_VICTORY_DISTANCE,
  type StumbleCause,
} from '../game/balance.ts';
import { computeTier, decayRate, gearValue, isBelowDropLine, stumbleCost } from '../game/systems/economy.ts';
import { eventBus, type BuffType } from './eventBus.ts';

export interface GameState {
  tips: number;
  momentum: number; // 0.0 to 100.0
  momentumTier: number; // 0 to 4
  tierName: string;
  activeInstruments: InstrumentId[];
  distanceTraveled: number;
  activeAct: number; // 1 to 5
  actName: string;
  game_over: boolean;
  victory: boolean;
  isPaused: boolean;
  /** Timed buff, if any. The shield is separate so it can stack with one. */
  activeBuff: Exclude<BuffType, 'shield'> | null;
  buffTimeRemaining: number;
  buffDuration: number;
  shieldCharges: number;
  seed: number;
}

export interface TierDefinition {
  tier: number;
  name: string;
  instruments: InstrumentId[];
}

export interface ActDefinition {
  act: number;
  name: string;
  subtitle: string;
  minDistance: number;
  visualPalette: {
    sky: number;
    distant: number;
    midground: number;
    street: number;
    foreground: number;
  };
  audioConfig: {
    scale: ScaleName;
    meter: MeterType;
    bpm: number;
    description: string;
  };
}

export const VICTORY_DISTANCE = BALANCE_VICTORY_DISTANCE;

export const ACT_DEFINITIONS: ActDefinition[] = [
  {
    act: 1,
    name: 'The Tavern Exit',
    subtitle: 'Steamy windows & rainy cobblestones',
    minDistance: ACT_MIN_DISTANCE[0],
    visualPalette: {
      sky: 0xd9c4a8, // soot-warmed night
      distant: 0xc9a26b, // burnt sienna haze
      midground: 0xf2c98a, // deep amber lamplight
      street: 0xe8d7c0, // rain-slick cobbles
      foreground: 0xf5d9a6, // amber mist
    },
    audioConfig: {
      scale: 'D_FREYGISH',
      meter: '4/4',
      bpm: 120,
      description: 'Intimate, raw Czárdás. Rowdy accordion lead, simple kick drum.',
    },
  },
  {
    act: 2,
    name: 'The Crooked Canals',
    subtitle: 'Misty waterways & stone bridges',
    minDistance: ACT_MIN_DISTANCE[1],
    visualPalette: {
      sky: 0x1e3a5f,
      distant: 0x1b4332,
      midground: 0x2d6a4f,
      street: 0xbbf7d0,
      foreground: 0x52b788,
    },
    audioConfig: {
      scale: 'D_HARMONIC_MINOR',
      meter: '3/4',
      bpm: 115,
      description: 'Melancholic Klezmer Waltzes. Flowing upright bass, searing violin.',
    },
  },
  {
    act: 3,
    name: 'The Marketplace',
    subtitle: 'Shuttered stalls & paper lanterns',
    minDistance: ACT_MIN_DISTANCE[2],
    visualPalette: {
      sky: 0x4c0519,
      distant: 0x881337,
      midground: 0xb91c1c,
      street: 0xfed7aa,
      foreground: 0xf97316,
    },
    audioConfig: {
      scale: 'D_MISHEBERAKH',
      meter: '9/8_2223',
      bpm: 138,
      description: 'Polyrhythmic Balkan Chaos. Rapid rasgueado (flamenco guitar), castanets.',
    },
  },
  {
    act: 4,
    name: 'The Industrial Noir',
    subtitle: 'Iron frameworks & electric signs',
    minDistance: ACT_MIN_DISTANCE[3],
    visualPalette: {
      sky: 0x09090b,
      distant: 0x2e1065,
      midground: 0x581c87,
      street: 0x06b6d4,
      foreground: 0x22d3ee,
    },
    audioConfig: {
      scale: 'D_HUNGARIAN_MINOR',
      meter: '7/8_322',
      bpm: 126,
      description: 'Suspenseful Noir-Folk. Dissonant chords clashing with folk instruments.',
    },
  },
  {
    act: 5,
    name: 'The Sunrise Overlook',
    subtitle: 'Chimney smoke & waking songbirds',
    minDistance: ACT_MIN_DISTANCE[4],
    visualPalette: {
      sky: 0x701a75,
      distant: 0xc084fc,
      midground: 0xfb7185,
      street: 0xfed7aa,
      foreground: 0xfef08a,
    },
    audioConfig: {
      scale: 'D_FREYGISH',
      meter: '4/4',
      bpm: 180,
      description: 'Triumphant Full Ensemble. Major key modulation, 180 BPM czárdás finale.',
    },
  },
];

/** Who is playing at each tier. Requirements live in balance.ts (TIER). */
export const TIERS: TierDefinition[] = [
  { tier: 0, name: 'Solo Accordion', instruments: ['accordion'] },
  { tier: 1, name: 'Rhythm Duo', instruments: ['accordion', 'bass'] },
  { tier: 2, name: 'Tavern Trio', instruments: ['accordion', 'bass', 'percussion'] },
  { tier: 3, name: 'Quartet', instruments: ['accordion', 'bass', 'percussion', 'guitar'] },
  {
    tier: 4,
    name: 'Full Balkan Band',
    instruments: ['accordion', 'bass', 'percussion', 'guitar', 'violin', 'clarinet'],
  },
];

function freshState(seed: number): GameState {
  return {
    tips: 0,
    momentum: MOMENTUM.start,
    momentumTier: 0,
    tierName: TIERS[0].name,
    activeInstruments: [...TIERS[0].instruments],
    distanceTraveled: 0,
    activeAct: 1,
    actName: ACT_DEFINITIONS[0].name,
    game_over: false,
    victory: false,
    isPaused: false,
    activeBuff: null,
    buffTimeRemaining: 0,
    buffDuration: 0,
    shieldCharges: 0,
    seed,
  };
}

export class GameStore {
  private elapsedTime = 0;
  /** Seconds momentum has spent under the current tier's drop line. */
  private dropDwellSec = 0;
  private state: GameState = freshState(0);
  private listeners: Set<(state: Readonly<GameState>) => void> = new Set();
  private dirty = false;

  /**
   * Returns the live state object. Callers must treat it as read-only;
   * it is replaced wholesale on reset(), so do not cache it across runs.
   */
  public getState(): Readonly<GameState> {
    return this.state;
  }

  public getElapsedTime(): number {
    return this.elapsedTime;
  }

  public isPaused(): boolean {
    return this.state.isPaused;
  }

  public setPaused(isPaused: boolean): void {
    if (this.state.game_over || this.state.victory) return;
    if (this.state.isPaused === isPaused) return;
    this.state.isPaused = isPaused;
    eventBus.emit('GAME_PAUSE', { isPaused });
    this.notify();
  }

  public togglePause(): boolean {
    if (this.state.game_over || this.state.victory) return false;
    this.setPaused(!this.state.isPaused);
    return this.state.isPaused;
  }

  // -------------------------------------------------------------
  // Buffs
  // -------------------------------------------------------------

  /** Applies a collected power-up. Shields stack as charges; timed buffs replace each other. */
  public activateBuff(type: BuffType): void {
    if (this.state.game_over || this.state.victory) return;

    if (type === 'shield') {
      this.state.shieldCharges += BUFFS.shield.charges;
      eventBus.emit('BUFF_ACTIVATED', { buff: 'shield', duration: 0 });
      this.notify();
      return;
    }

    if (this.state.activeBuff && this.state.activeBuff !== type) {
      eventBus.emit('BUFF_DEACTIVATED', { buff: this.state.activeBuff });
    }
    const duration = BUFFS[type].duration;
    this.state.activeBuff = type;
    this.state.buffTimeRemaining = duration;
    this.state.buffDuration = duration;
    eventBus.emit('BUFF_ACTIVATED', { buff: type, duration });
    this.notify();
  }

  public deactivateBuff(): void {
    if (!this.state.activeBuff) return;
    const prev = this.state.activeBuff;
    this.state.activeBuff = null;
    this.state.buffTimeRemaining = 0;
    this.state.buffDuration = 0;
    eventBus.emit('BUFF_DEACTIVATED', { buff: prev });
    this.notify();
  }

  /** Spends one shield charge if there is one. Returns whether a hazard was absorbed. */
  public consumeShield(): boolean {
    if (this.state.shieldCharges <= 0) return false;
    this.state.shieldCharges -= 1;
    if (this.state.shieldCharges === 0) {
      eventBus.emit('BUFF_DEACTIVATED', { buff: 'shield' });
    }
    this.notify();
    return true;
  }

  public updateBuffTimer(dt: number): void {
    if (this.state.isPaused || this.state.game_over || this.state.victory) return;
    if (!this.state.activeBuff) return;
    this.state.buffTimeRemaining -= dt;
    if (this.state.buffTimeRemaining <= 0) {
      this.deactivateBuff();
    } else {
      this.markDirty();
    }
  }

  // -------------------------------------------------------------
  // Momentum and tiers
  // -------------------------------------------------------------

  public addTips(count = 1): void {
    if (this.state.isPaused || this.state.game_over || this.state.victory) return;
    this.state.tips += count;
    this.adjustMomentum(gearValue(this.state.activeBuff) * count);
    eventBus.emit('TIP_COLLECTED', { totalTips: this.state.tips, momentum: this.state.momentum });
  }

  public adjustMomentum(delta: number): void {
    if (this.state.isPaused || this.state.game_over || this.state.victory) return;

    const prevMomentum = this.state.momentum;
    const newMomentum = Math.max(0, Math.min(MOMENTUM.max, prevMomentum + delta));
    this.state.momentum = newMomentum;
    this.resolveTier();

    if (newMomentum !== prevMomentum) {
      eventBus.emit('MOMENTUM_CHANGE', {
        momentum: newMomentum,
        previousMomentum: prevMomentum,
        tier: this.state.momentumTier,
      });
    }

    if (this.elapsedTime >= MOMENTUM.deathGraceSec && newMomentum <= 0) {
      this.triggerGameOver();
    }
  }

  public applyStumblePenalty(cause: StumbleCause): void {
    this.adjustMomentum(-stumbleCost(cause));
  }

  /** Per-frame tick: clock, buff timers, and momentum decay. */
  public decayMomentum(dt: number): void {
    if (this.state.isPaused || this.state.game_over || this.state.victory) return;
    this.elapsedTime += dt;
    this.updateBuffTimer(dt);
    this.dropDwellSec = isBelowDropLine(this.state.momentum, this.state.momentumTier)
      ? this.dropDwellSec + dt
      : 0;

    if (this.state.momentum > 0) {
      this.adjustMomentum(-decayRate(this.state.momentum, this.state.activeAct) * dt);
    } else {
      this.resolveTier();
      if (this.elapsedTime >= MOMENTUM.deathGraceSec) this.triggerGameOver();
    }
    this.markDirty();
  }

  private resolveTier(): void {
    const prevTier = this.state.momentumTier;
    const tier = computeTier(this.state.tips, this.state.momentum, prevTier, this.dropDwellSec);
    if (tier === prevTier) return;

    const def = TIERS[tier];
    this.state.momentumTier = tier;
    this.state.tierName = def.name;
    this.state.activeInstruments = [...def.instruments];
    this.dropDwellSec = 0;

    eventBus.emit('TIER_CHANGE', {
      tier,
      tierName: def.name,
      activeInstruments: [...def.instruments],
    });
    this.notify();
  }

  // -------------------------------------------------------------
  // Progress
  // -------------------------------------------------------------

  public updateDistance(scrollX: number): void {
    if (this.state.isPaused || this.state.game_over || this.state.victory) return;
    const distance = Math.max(0, Math.floor(scrollX));
    if (distance === this.state.distanceTraveled) return;
    this.state.distanceTraveled = distance;
    this.markDirty();
    this.checkActProgression();
    if (this.state.distanceTraveled >= VICTORY_DISTANCE) this.triggerVictory();
  }

  public getActDefinition(act: number): ActDefinition {
    return ACT_DEFINITIONS.find((a) => a.act === act) ?? ACT_DEFINITIONS[0];
  }

  public getCurrentActDefinition(): ActDefinition {
    return this.getActDefinition(this.state.activeAct);
  }

  private triggerGameOver(): void {
    if (this.state.game_over || this.state.victory) return;
    this.state.game_over = true;
    eventBus.emit('GAME_OVER', { distanceTraveled: this.state.distanceTraveled, tips: this.state.tips });
    this.notify();
  }

  private triggerVictory(): void {
    if (this.state.victory || this.state.game_over) return;
    this.state.victory = true;
    eventBus.emit('VICTORY', { distanceTraveled: this.state.distanceTraveled, tips: this.state.tips });
    this.notify();
  }

  private checkActProgression(): void {
    const prevAct = this.state.activeAct;
    let matched = ACT_DEFINITIONS[0];
    for (const def of ACT_DEFINITIONS) {
      if (this.state.distanceTraveled >= def.minDistance) matched = def;
    }
    if (matched.act === prevAct) return;
    this.state.activeAct = matched.act;
    this.state.actName = matched.name;
    eventBus.emit('ACT_CHANGE', { act: matched.act, name: matched.name });
    this.notify();
  }

  // -------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------

  /** Begins a run with the given seed. Announces Act 1 so audio and visuals apply its config. */
  public startRun(seed: number): void {
    this.elapsedTime = 0;
    this.dropDwellSec = 0;
    this.state = freshState(seed);
    eventBus.emit('ACT_CHANGE', { act: ACT_DEFINITIONS[0].act, name: ACT_DEFINITIONS[0].name });
    this.notify();
  }

  /** Restarts with the same seed, so "try again" replays the same street. */
  public reset(): void {
    this.startRun(this.state.seed);
  }

  public subscribe(listener: (state: Readonly<GameState>) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Marks the state as changed without notifying. High-frequency mutations
   * (decay, buff timers, distance) use this; the scene calls flush() once per
   * frame so subscribers see at most one update per frame.
   */
  private markDirty(): void {
    this.dirty = true;
  }

  /** Delivers a pending coalesced update, if any. Call once per frame. */
  public flush(): void {
    if (!this.dirty) return;
    this.notify();
  }

  /** Immediate notification for discrete transitions (tier, act, pause, buffs, game over). */
  private notify(): void {
    this.dirty = false;
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[GameStore] Error in subscriber callback:', err);
      }
    }
  }
}

export const store = new GameStore();
