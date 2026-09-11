import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUFFS, MOMENTUM, TIER } from '../game/balance.ts';
import { eventBus, type GameEventMap } from './eventBus.ts';
import { ACT_DEFINITIONS, GameStore, VICTORY_DISTANCE } from './store.ts';

describe('GameStore', () => {
  let store: GameStore;

  beforeEach(() => {
    eventBus.clear();
    store = new GameStore();
    store.startRun(1234);
  });

  it('startRun() announces Act 1 and stores the seed', () => {
    const onAct = vi.fn();
    eventBus.on('ACT_CHANGE', onAct);
    store.startRun(99);
    expect(onAct).toHaveBeenCalledWith({ act: 1, name: ACT_DEFINITIONS[0].name });
    expect(store.getState().seed).toBe(99);
    expect(store.getState().momentum).toBe(MOMENTUM.start);
    expect(store.getState().momentumTier).toBe(0);
  });

  it('reset() replays the same seed', () => {
    store.startRun(7);
    store.addTips(3);
    store.reset();
    expect(store.getState().seed).toBe(7);
    expect(store.getState().tips).toBe(0);
  });

  it('advances acts at each minDistance threshold, in order', () => {
    const acts: number[] = [];
    eventBus.on('ACT_CHANGE', (e) => acts.push(e.act));
    for (const def of ACT_DEFINITIONS.slice(1)) {
      store.updateDistance(def.minDistance - 1);
      store.updateDistance(def.minDistance);
    }
    expect(acts).toEqual([2, 3, 4, 5]);
    expect(store.getState().activeAct).toBe(5);
  });

  it('triggers victory once distance reaches VICTORY_DISTANCE', () => {
    const onVictory = vi.fn();
    eventBus.on('VICTORY', onVictory);
    store.updateDistance(VICTORY_DISTANCE - 1);
    expect(onVictory).not.toHaveBeenCalled();
    store.updateDistance(VICTORY_DISTANCE);
    expect(onVictory).toHaveBeenCalledTimes(1);
    expect(store.getState().victory).toBe(true);
  });

  it('does not end the game on zero momentum inside the grace period', () => {
    const onGameOver = vi.fn();
    eventBus.on('GAME_OVER', onGameOver);
    store.adjustMomentum(-100);
    expect(store.getState().momentum).toBe(0);
    expect(onGameOver).not.toHaveBeenCalled();

    for (let i = 0; i < MOMENTUM.deathGraceSec - 1; i++) store.decayMomentum(1);
    expect(onGameOver).not.toHaveBeenCalled();

    store.decayMomentum(1);
    expect(onGameOver).toHaveBeenCalledTimes(1);
    expect(store.getState().game_over).toBe(true);
  });

  it('coalesces high-frequency mutations into one notification per flush()', () => {
    const listener = vi.fn();
    store.subscribe(listener);
    listener.mockClear();

    for (let i = 0; i < 60; i++) {
      store.decayMomentum(1 / 60);
      store.updateDistance(i * 3);
    }
    expect(listener).not.toHaveBeenCalled();

    store.flush();
    expect(listener).toHaveBeenCalledTimes(1);
    store.flush();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('promotes a tier as soon as tips and momentum both qualify, and notifies immediately', () => {
    const listener = vi.fn();
    const onTier = vi.fn<(e: GameEventMap['TIER_CHANGE']) => void>();
    store.subscribe(listener);
    listener.mockClear();
    eventBus.on('TIER_CHANGE', onTier);

    // Momentum alone is not enough
    store.adjustMomentum(60);
    expect(onTier).not.toHaveBeenCalled();

    // Enough tips for tier 1 (momentum is already above its gate)
    store.addTips(TIER.tipCost[1]);
    expect(onTier).toHaveBeenCalledTimes(1);
    expect(onTier.mock.calls[0][0].tier).toBe(1);
    expect(listener).toHaveBeenCalled();
  });

  it('demotes only after momentum dwells under the drop line', () => {
    store.addTips(TIER.tipCost[2]);
    store.adjustMomentum(100);
    expect(store.getState().momentumTier).toBe(2);

    // Drop far below the tier-2 gate
    store.adjustMomentum(-100 + TIER.momentumGate[2] - TIER.dropHysteresis - 5);
    expect(store.getState().momentumTier).toBe(2);

    // Not yet: dwell is under the requirement
    store.decayMomentum(TIER.dropDwellSec / 2);
    expect(store.getState().momentumTier).toBe(2);

    store.decayMomentum(TIER.dropDwellSec / 2 + 0.05);
    expect(store.getState().momentumTier).toBeLessThan(2);
  });

  it('charges the stumble cost for its cause', () => {
    const before = store.getState().momentum;
    store.applyStumblePenalty('crate');
    expect(store.getState().momentum).toBe(before - MOMENTUM.stumbleCost.crate);
  });

  it('ignores tips, decay, and distance while paused', () => {
    store.setPaused(true);
    const before = store.getState().momentum;
    store.addTips(3);
    store.decayMomentum(5);
    store.updateDistance(5000);
    expect(store.getState().tips).toBe(0);
    expect(store.getState().momentum).toBe(before);
    expect(store.getState().distanceTraveled).toBe(0);
  });

  it('cannot pause after game over', () => {
    store.adjustMomentum(-100);
    for (let i = 0; i <= MOMENTUM.deathGraceSec; i++) store.decayMomentum(1);
    expect(store.getState().game_over).toBe(true);
    store.setPaused(true);
    expect(store.isPaused()).toBe(false);
  });

  it('doubles gear value under the tips buff and expires it', () => {
    const onDeactivate = vi.fn();
    eventBus.on('BUFF_DEACTIVATED', onDeactivate);
    const before = store.getState().momentum;
    store.activateBuff('tips');
    store.addTips(1);
    expect(store.getState().momentum).toBe(before + MOMENTUM.gearValue * MOMENTUM.tipsBuffMultiplier);
    store.updateBuffTimer(BUFFS.tips.duration - 0.5);
    expect(store.getState().activeBuff).toBe('tips');
    store.updateBuffTimer(0.6);
    expect(store.getState().activeBuff).toBeNull();
    expect(onDeactivate).toHaveBeenCalledWith({ buff: 'tips' });
  });

  it('stacks shield charges and spends them one at a time', () => {
    expect(store.consumeShield()).toBe(false);
    store.activateBuff('shield');
    store.activateBuff('shield');
    expect(store.getState().shieldCharges).toBe(2);
    expect(store.consumeShield()).toBe(true);
    expect(store.consumeShield()).toBe(true);
    expect(store.consumeShield()).toBe(false);
  });

  it('keeps a shield while a timed buff is active', () => {
    store.activateBuff('shield');
    store.activateBuff('steam');
    expect(store.getState().shieldCharges).toBe(1);
    expect(store.getState().activeBuff).toBe('steam');
  });
});
