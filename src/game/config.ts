import Phaser from 'phaser';
import type { AppFlags } from '../app/flags.ts';
import { BootScene } from './scenes/BootScene.ts';
import { TitleScene } from './scenes/TitleScene.ts';
import { StreetScene } from './scenes/StreetScene.ts';
import { HudScene } from './scenes/HudScene.ts';
import { PauseScene } from './scenes/PauseScene.ts';
import { EndScene } from './scenes/EndScene.ts';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export function buildGameConfig(parent: string, flags: AppFlags): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#0d0e12',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    render: {
      pixelArt: false,
      antialias: true,
      antialiasGL: true,
      roundPixels: true,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 1200 },
        debug: false,
      },
    },
    input: {
      activePointers: 3,
    },
    scene: [BootScene, TitleScene, StreetScene, HudScene, PauseScene, EndScene],
    // Reduced motion is read by scenes through the registry; keep the flag on the config too.
    callbacks: {
      preBoot: (game) => {
        game.registry.set('flags', flags);
      },
    },
  };
}
