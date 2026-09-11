import type Phaser from 'phaser';
import { drawSky } from './layers/sky.ts';
import { drawDistant } from './layers/distant.ts';
import { drawStreet } from './layers/street.ts';
import { drawForeground } from './layers/foreground.ts';
import { drawTipGear } from './items.ts';
import { drawPowerupSunflower, drawPowerupBrandy, drawPowerupSteam, drawPowerupShield } from './powerups.ts';
import {
  drawCrateAct1,
  drawCrateAct2,
  drawCrateAct3,
  drawCrateAct4,
  drawCrateAct5,
  drawPuddleAct1,
  drawPuddleAct2,
  drawPuddleAct3,
  drawPuddleAct4,
  drawPuddleAct5,
} from './hazards.ts';
import { drawMidgroundAct1 } from './midground/act1.ts';
import { drawMidgroundAct2 } from './midground/act2.ts';
import { drawMidgroundAct3 } from './midground/act3.ts';
import { drawMidgroundAct4 } from './midground/act4.ts';
import { drawMidgroundAct5 } from './midground/act5.ts';

export interface TextureSpec {
  key: string;
  width: number;
  height: number;
  draw: (gfx: Phaser.GameObjects.Graphics) => void;
}

/** Textures every run needs, generated once at boot. */
export const CORE_TEXTURES: TextureSpec[] = [
  { key: 'bg_sky', width: 1280, height: 720, draw: drawSky },
  { key: 'bg_distant', width: 1280, height: 720, draw: drawDistant },
  { key: 'bg_street', width: 1280, height: 720, draw: drawStreet },
  { key: 'bg_foreground', width: 1280, height: 720, draw: drawForeground },
  { key: 'item_tip_gear', width: 32, height: 32, draw: drawTipGear },
  { key: 'powerup_sunflower', width: 32, height: 32, draw: drawPowerupSunflower },
  { key: 'powerup_brandy', width: 32, height: 32, draw: drawPowerupBrandy },
  { key: 'powerup_steam', width: 32, height: 32, draw: drawPowerupSteam },
  { key: 'powerup_shield', width: 32, height: 32, draw: drawPowerupShield },
  { key: 'hazard_crate_act1', width: 44, height: 44, draw: drawCrateAct1 },
  { key: 'hazard_crate_act2', width: 44, height: 44, draw: drawCrateAct2 },
  { key: 'hazard_crate_act3', width: 44, height: 44, draw: drawCrateAct3 },
  { key: 'hazard_crate_act4', width: 44, height: 44, draw: drawCrateAct4 },
  { key: 'hazard_crate_act5', width: 44, height: 44, draw: drawCrateAct5 },
  { key: 'hazard_puddle_act1', width: 60, height: 18, draw: drawPuddleAct1 },
  { key: 'hazard_puddle_act2', width: 60, height: 18, draw: drawPuddleAct2 },
  { key: 'hazard_puddle_act3', width: 60, height: 18, draw: drawPuddleAct3 },
  { key: 'hazard_puddle_act4', width: 60, height: 18, draw: drawPuddleAct4 },
  { key: 'hazard_puddle_act5', width: 60, height: 18, draw: drawPuddleAct5 },
];

/** The 2560x720 midground for each act. Generated on demand; only two are resident at a time. */
export const MIDGROUND_TEXTURES: Record<number, TextureSpec> = {
  1: { key: 'bg_midground_act1', width: 2560, height: 720, draw: drawMidgroundAct1 },
  2: { key: 'bg_midground_act2', width: 2560, height: 720, draw: drawMidgroundAct2 },
  3: { key: 'bg_midground_act3', width: 2560, height: 720, draw: drawMidgroundAct3 },
  4: { key: 'bg_midground_act4', width: 2560, height: 720, draw: drawMidgroundAct4 },
  5: { key: 'bg_midground_act5', width: 2560, height: 720, draw: drawMidgroundAct5 },
};

export const ACT_COUNT = 5;
