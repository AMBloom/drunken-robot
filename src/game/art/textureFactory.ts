import type Phaser from 'phaser';
import { ACT_COUNT, MIDGROUND_TEXTURES, type TextureSpec } from './registry.ts';

/** Renders one spec into the scene's texture manager, skipping keys that already exist. */
export function generateTexture(scene: Phaser.Scene, spec: TextureSpec): void {
  if (scene.textures.exists(spec.key)) return;
  const gfx = scene.make.graphics({ x: 0, y: 0 }, false);
  spec.draw(gfx);
  gfx.generateTexture(spec.key, spec.width, spec.height);
  gfx.destroy();
}

/**
 * Generates a list of specs one per frame so the boot screen can show progress
 * instead of freezing on a single synchronous burst. Resolves when all are done.
 */
export function generateTexturesChunked(
  scene: Phaser.Scene,
  specs: readonly TextureSpec[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve) => {
    let index = 0;
    const step = (): void => {
      if (index >= specs.length) {
        resolve();
        return;
      }
      generateTexture(scene, specs[index]);
      index += 1;
      onProgress?.(index, specs.length);
      scene.time.delayedCall(0, step);
    };
    step();
  });
}

/** Makes sure the midground for `act` is resident. No-op for out-of-range acts. */
export function ensureActTextures(scene: Phaser.Scene, act: number): void {
  const spec = MIDGROUND_TEXTURES[act];
  if (!spec) return;
  generateTexture(scene, spec);
}

/** Frees the midground for `act`. Call only for acts the player has left behind. */
export function releaseActTextures(scene: Phaser.Scene, act: number): void {
  if (act < 1 || act > ACT_COUNT) return;
  const spec = MIDGROUND_TEXTURES[act];
  if (spec && scene.textures.exists(spec.key)) {
    scene.textures.remove(spec.key);
  }
}
