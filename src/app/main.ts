import './base.css';
import * as Tone from 'tone';
import { readFlags } from './flags.ts';
import { createAudioBridge } from './audioBridge.ts';
import { createGame } from '../game/engine.ts';

const flags = readFlags();

// Audio graph first so the bridge is listening before any scene emits.
const audio = createAudioBridge();
const game = createGame('game-container', flags);

// Portrait phones get a rotate prompt; the canvas is 16:9 and unplayable tall.
const rotateOverlay = document.getElementById('rotate-overlay');
if (rotateOverlay && flags.coarsePointer && typeof window.matchMedia === 'function') {
  const portrait = window.matchMedia('(orientation: portrait)');
  const sync = (): void => {
    rotateOverlay.hidden = !portrait.matches;
  };
  portrait.addEventListener('change', sync);
  sync();
}

if (flags.test) {
  let bars = 0;
  let steps = 0;
  audio.director.onStep((e) => {
    steps += 1;
    if (e.stepIndex === 0) bars += 1;
  });
  window.__drunkenRobot = {
    get activeScene(): string | null {
      const scenes = game.scene.getScenes(true);
      const street = scenes.find((s) => s.scene.key === 'StreetScene');
      return (street ?? scenes[0])?.scene.key ?? null;
    },
    get audio(): AudioProbe {
      return {
        context: Tone.getContext().state,
        transport: Tone.getTransport().state,
        seconds: Tone.getTransport().seconds,
        bpm: Math.round(Tone.getTransport().bpm.value),
        meter: audio.director.meter,
        mode: audio.director.scale,
        act: audio.director.currentAct,
        bars,
        steps,
      };
    },
  };
}

interface AudioProbe {
  context: string;
  transport: string;
  seconds: number;
  bpm: number;
  meter: string;
  mode: string;
  act: number;
  bars: number;
  steps: number;
}

if (flags.debug) {
  void import('./debug/dashboard.ts').then((m) => m.mountDashboard(audio));
}

declare global {
  interface Window {
    __drunkenRobot?: { readonly activeScene: string | null; readonly audio: AudioProbe };
  }
}
