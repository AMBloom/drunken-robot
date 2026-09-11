import Phaser from 'phaser';
import type { AppFlags } from '../app/flags.ts';
import { buildGameConfig } from './config.ts';

let gameInstance: Phaser.Game | null = null;

/** Creates the Phaser game once and mounts it into the container. */
export function createGame(containerId: string, flags: AppFlags): Phaser.Game {
  if (gameInstance) return gameInstance;
  if (!document.getElementById(containerId)) {
    throw new Error(`[engine] Container #${containerId} not found in DOM.`);
  }
  gameInstance = new Phaser.Game(buildGameConfig(containerId, flags));
  gameInstance.registry.set('flags', flags);
  return gameInstance;
}

export function getGame(): Phaser.Game | null {
  return gameInstance;
}

export function destroyGame(): void {
  if (gameInstance) {
    gameInstance.destroy(true);
    gameInstance = null;
  }
}
