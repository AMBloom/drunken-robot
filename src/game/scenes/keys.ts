export const SceneKeys = {
  Boot: 'BootScene',
  Title: 'TitleScene',
  Street: 'StreetScene',
  Hud: 'HudScene',
  Pause: 'PauseScene',
  End: 'EndScene',
} as const;

/** Per-frame telemetry StreetScene publishes on the registry for HudScene. */
export interface HudTelemetry {
  bellowsPressure: number;
  stabilityRatio: number;
  isStumbling: boolean;
  wobbleAngle: number;
  stabilityThreshold: number;
}

export const HUD_REGISTRY_KEY = 'hud';

export type RunOutcome = 'victory' | 'gameover';

/** Data handed to EndScene. */
export interface EndSceneData {
  outcome: RunOutcome;
  distanceTraveled: number;
  tips: number;
  tier: number;
  tierName: string;
  act: number;
  actName: string;
  elapsedSec: number;
  seed: number;
}
