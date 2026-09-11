import * as Tone from 'tone';

/**
 * Shared output stage and lifecycle for every ensemble instrument.
 *
 * Subclasses build their voice graph in the constructor, connect it into
 * `this.output`, and register every node they create with `track()` so
 * `dispose()` can tear the whole graph down. Instruments never connect to
 * the master bus themselves; the mixer owns routing via `connect()`.
 */
export abstract class BaseInstrument {
  protected readonly output: Tone.Volume;
  private readonly ownedNodes: Array<{ dispose(): unknown }> = [];

  protected constructor(volumeDb: number) {
    this.output = new Tone.Volume(volumeDb);
  }

  /** Registers nodes for disposal. Returns the first argument for inline use. */
  protected track<T extends { dispose(): unknown }>(node: T, ...more: Array<{ dispose(): unknown }>): T {
    this.ownedNodes.push(node, ...more);
    return node;
  }

  /** Sets output level in decibels. */
  public setVolume(decibels: number, rampTime = 0.05): void {
    if (rampTime > 0) {
      this.output.volume.rampTo(decibels, rampTime);
    } else {
      this.output.volume.value = decibels;
    }
  }

  /** Routes the output to a destination, replacing any previous routing. */
  public connect(destination: Tone.ToneAudioNode): this {
    this.output.disconnect();
    this.output.connect(destination);
    return this;
  }

  /** Disposes every tracked node and the output stage. */
  public dispose(): void {
    for (const node of this.ownedNodes) {
      node.dispose();
    }
    this.ownedNodes.length = 0;
    this.output.dispose();
  }
}
