import { describe, expect, it, vi } from 'vitest';
import { EventBus } from './eventBus.ts';

describe('EventBus', () => {
  it('delivers payloads to subscribers and stops after off()', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const off = bus.on('ACT_CHANGE', handler);

    bus.emit('ACT_CHANGE', { act: 2, name: 'Canals' });
    expect(handler).toHaveBeenCalledWith({ act: 2, name: 'Canals' });

    off();
    bus.emit('ACT_CHANGE', { act: 3, name: 'Market' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount('ACT_CHANGE')).toBe(0);
  });

  it('once() fires a single time', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.once('GAME_START', handler);
    bus.emit('GAME_START', {});
    bus.emit('GAME_START', {});
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('isolates a throwing handler from its siblings', () => {
    const bus = new EventBus();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const second = vi.fn();
    bus.on('GAME_PAUSE', () => {
      throw new Error('boom');
    });
    bus.on('GAME_PAUSE', second);

    bus.emit('GAME_PAUSE', { isPaused: true });
    expect(second).toHaveBeenCalledWith({ isPaused: true });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('lets a handler unsubscribe itself mid-emit without skipping others', () => {
    const bus = new EventBus();
    const calls: string[] = [];
    const offA = bus.on('VICTORY', () => {
      calls.push('a');
      offA();
    });
    bus.on('VICTORY', () => calls.push('b'));
    bus.emit('VICTORY', { distanceTraveled: 1, tips: 1 });
    expect(calls).toEqual(['a', 'b']);
  });

  it('clear() drops every listener', () => {
    const bus = new EventBus();
    bus.on('TIP_COLLECTED', vi.fn());
    bus.on('HAZARD_HIT', vi.fn());
    bus.clear();
    expect(bus.listenerCount('TIP_COLLECTED')).toBe(0);
    expect(bus.listenerCount('HAZARD_HIT')).toBe(0);
  });
});
