import * as Tone from 'tone';
import type { BarScore } from '../composer/types.ts';

export interface BarPlayback {
  /** Absolute transport tick where the bar starts. */
  startTick: number;
  /** Ticks per eighth-note step. */
  stepTicks: number;
  /** Ticks per second at the bar's tempo, for humanization offsets. */
  ticksPerSec: number;
}

export interface SchedulerHooks {
  /** Produces the score for a bar index. Called one bar ahead. */
  nextScore: (barIndex: number) => BarScore;
  /** Schedules the bar's sounds. `at(step, offsetSec)` gives the transport time string for a step. */
  play: (score: BarScore, playback: BarPlayback, at: (step: number, offsetSec?: number) => string) => void;
  /** Fired at each step, on the audio clock, for readouts. */
  onStep?: (score: BarScore, step: number, time: number) => void;
  /** Fired when a bar begins; the director applies tempo and meter here. */
  onBarStart?: (score: BarScore, time: number) => void;
}

/**
 * Drives the Transport bar by bar in ticks, so tempo ramps stretch the music
 * instead of drifting it. Each bar is composed and scheduled one bar ahead;
 * meter and tempo changes therefore land exactly on a downbeat.
 */
export class BarScheduler {
  private readonly hooks: SchedulerHooks;
  private barIndex = 0;
  private nextBarTick = 0;
  private running = false;
  private scheduledIds: number[] = [];

  constructor(hooks: SchedulerHooks) {
    this.hooks = hooks;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Begins from the transport's current tick, composing the first two bars. */
  start(): void {
    if (this.running) return;
    this.running = true;
    const transport = Tone.getTransport();
    // Give the first bar a short lead so the very first notes are not in the past.
    this.nextBarTick = Math.ceil(transport.ticks + transport.PPQ / 4);
    this.scheduleBar(this.barIndex);
  }

  /** Cancels everything and rewinds to bar 0. Caller stops/rewinds the transport. */
  reset(): void {
    const transport = Tone.getTransport();
    for (const id of this.scheduledIds) transport.clear(id);
    this.scheduledIds = [];
    this.running = false;
    this.barIndex = 0;
    this.nextBarTick = 0;
  }

  private scheduleBar(index: number): void {
    const transport = Tone.getTransport();
    const score = this.hooks.nextScore(index);
    const stepTicks = transport.PPQ / 2;
    const startTick = this.nextBarTick;
    const ticksPerSec = (score.bpm / 60) * transport.PPQ;
    const playback: BarPlayback = { startTick, stepTicks, ticksPerSec };
    const at = (step: number, offsetSec = 0): string =>
      `${Math.max(0, Math.round(startTick + step * stepTicks + offsetSec * ticksPerSec))}i`;

    // Bar start: tempo/meter application, then schedule the *next* bar (one-bar lookahead).
    this.scheduledIds.push(
      transport.scheduleOnce((time) => {
        this.hooks.onBarStart?.(score, time);
        if (this.running) this.scheduleBar(index + 1);
      }, at(0)),
    );

    if (this.hooks.onStep) {
      for (let s = 0; s < score.bar.meter.steps; s++) {
        this.scheduledIds.push(
          transport.scheduleOnce((time) => {
            Tone.getDraw().schedule(() => this.hooks.onStep?.(score, s, time), time);
          }, at(s)),
        );
      }
    }

    this.hooks.play(score, playback, at);

    this.barIndex = index + 1;
    this.nextBarTick = startTick + score.bar.meter.steps * stepTicks;

    // Drop ids of events that have already fired to keep the list small.
    if (this.scheduledIds.length > 2000) this.scheduledIds.splice(0, 1000);
  }

  /** Registers an extra one-off event inside the managed set so reset() clears it. */
  track(id: number): void {
    this.scheduledIds.push(id);
  }
}
