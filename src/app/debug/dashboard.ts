import './dashboard.css';
import { audioEngine } from '../../audio/engine.ts';
import { SCALES, getScaleNotes } from '../../audio/scales.ts';
import { METERS } from '../../audio/theory/meter.ts';
import { MODES } from '../../audio/theory/modes.ts';
import type {
  ConductorStepEvent,
  EnsemblePreset,
  InstrumentChannelState,
  InstrumentId,
  MeterType,
  ScaleName,
} from '../../audio/types.ts';
import { eventBus } from '../../state/eventBus.ts';
import { store } from '../../state/store.ts';
import type { AudioBridge } from '../audioBridge.ts';

/**
 * Audio studio dashboard. Loaded only with ?debug=1, as its own chunk.
 * It observes the same store and event bus as the audio bridge and drives the
 * conductor/mixer directly for auditioning. Toggle with the backtick key.
 */

const TEMPLATE = (): string => `
<div class="sidebar-inner">
  <header class="app-header">
    <div class="header-badge">Debug • Audio Studio</div>
    <h1>The Drunken Robot</h1>
    <p class="subtitle">Gypsy Folk Engine &amp; Studio Mixer</p>
    <button id="btn-close-dashboard" class="btn btn-secondary btn-sm" title="Hide (backtick)">Hide</button>
  </header>

  <main class="control-panel">
    <section class="card status-card">
      <div class="status-header">
        <span class="label">Engine State</span>
        <span id="audio-status-badge" class="badge badge-suspended">Suspended</span>
      </div>
      <div class="unlock-actions">
        <button id="btn-unlock" class="btn btn-primary btn-large">🔊 Initialize &amp; Unlock Engine</button>
      </div>
    </section>

    <section class="card transport-card">
      <h2>Clock &amp; Transport Controls</h2>
      <div class="transport-buttons">
        <button id="btn-play" class="btn btn-success" disabled>▶ Start</button>
        <button id="btn-pause" class="btn btn-secondary" disabled>⏸ Pause</button>
        <button id="btn-stop" class="btn btn-danger" disabled>⏹ Stop</button>
      </div>
      <div class="tempo-control">
        <div class="slider-header">
          <label for="bpm-slider">Tempo (BPM)</label>
          <span id="bpm-val" class="value-display">120 BPM</span>
        </div>
        <input type="range" id="bpm-slider" min="60" max="180" value="120" step="1" />
      </div>
      <div class="meter-control">
        <span class="label">Time Signature / Meter</span>
        <div class="button-group" role="radiogroup" aria-label="Meter Selection">
          ${Object.values(METERS)
            .map((m) => `<button class="btn btn-toggle" data-meter="${m.name}">${m.label}</button>`)
            .join('')}
        </div>
      </div>
    </section>

    <section class="card visualizer-card">
      <h2>Rhythmic Metronome</h2>
      <div class="meter-info">
        <span id="measure-display" class="info-tag">Measure: 0</span>
        <span id="meter-display" class="info-tag">Meter: -</span>
        <span id="last-note-display" class="info-tag note-tag">Last: -</span>
      </div>
      <div id="beat-led-strip" class="beat-led-strip"></div>
    </section>

    <section class="card scale-card">
      <h2>Modal Scales &amp; Harmony</h2>
      <div class="scale-selectors">
        ${Object.values(MODES)
          .map(
            (m) =>
              `<button class="btn btn-toggle" data-scale="${m.name}">${m.displayName.replace('D ', '')}</button>`,
          )
          .join('')}
      </div>
      <p id="scale-description" class="scale-desc"></p>
    </section>

    <section class="card mixer-card">
      <div class="card-header-flex">
        <h2>Additive Ensemble Mixer</h2>
        <div class="ensemble-presets">
          <button class="btn btn-sm btn-preset" data-preset="solo_accordion">Solo</button>
          <button class="btn btn-sm btn-preset" data-preset="rhythm_duo">Duo</button>
          <button class="btn btn-sm btn-preset" data-preset="tavern_trio">Trio</button>
          <button class="btn btn-sm btn-preset" data-preset="full_balkan_band">Band</button>
        </div>
      </div>
      <p class="hint">Toggle recruitment, channel volume, pan, mute, and audition voices.</p>
      <div id="mixer-rack" class="mixer-rack"></div>
    </section>

    <section class="card synth-card">
      <h2>Procedural Accordion (Dual FM)</h2>
      <div class="slider-group">
        <div class="slider-header">
          <label for="bellows-slider">Bellows Pressure</label>
          <span id="bellows-val" class="value-display">75%</span>
        </div>
        <input type="range" id="bellows-slider" min="5" max="100" value="75" step="1" />
        <small class="hint">Modulates FM overtones and filter cutoff.</small>
      </div>
      <div class="slider-group">
        <div class="slider-header">
          <label for="musette-slider">Musette Detune</label>
          <span id="musette-val" class="value-display">+6 Cents</span>
        </div>
        <input type="range" id="musette-slider" min="0" max="25" value="6" step="1" />
        <small class="hint">Beating frequency between physical reed voices.</small>
      </div>
    </section>

    <section class="card keyboard-card">
      <h2>Accordion Scale Keys</h2>
      <p class="hint">Click or touch keys to audition notes on the accordion synth.</p>
      <div id="virtual-keyboard" class="keyboard-keys"></div>
    </section>
  </main>
</div>`;

function q<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`[dashboard] Missing element ${selector}`);
  return el;
}

export function mountDashboard(bridge: AudioBridge): void {
  const { mixer, director } = bridge;
  const { accordion } = director;

  const aside = document.createElement('aside');
  aside.id = 'debug-dashboard';
  aside.className = 'sidebar';
  aside.innerHTML = TEMPLATE();
  document.body.appendChild(aside);

  const statusBadge = q<HTMLSpanElement>(aside, '#audio-status-badge');
  const btnUnlock = q<HTMLButtonElement>(aside, '#btn-unlock');
  const btnPlay = q<HTMLButtonElement>(aside, '#btn-play');
  const btnPause = q<HTMLButtonElement>(aside, '#btn-pause');
  const btnStop = q<HTMLButtonElement>(aside, '#btn-stop');
  const bpmSlider = q<HTMLInputElement>(aside, '#bpm-slider');
  const bpmVal = q<HTMLSpanElement>(aside, '#bpm-val');
  const meterBtns = aside.querySelectorAll<HTMLButtonElement>('[data-meter]');
  const scaleBtns = aside.querySelectorAll<HTMLButtonElement>('[data-scale]');
  const scaleDesc = q<HTMLParagraphElement>(aside, '#scale-description');
  const presetBtns = aside.querySelectorAll<HTMLButtonElement>('[data-preset]');
  const mixerRack = q<HTMLDivElement>(aside, '#mixer-rack');
  const bellowsSlider = q<HTMLInputElement>(aside, '#bellows-slider');
  const bellowsVal = q<HTMLSpanElement>(aside, '#bellows-val');
  const musetteSlider = q<HTMLInputElement>(aside, '#musette-slider');
  const musetteVal = q<HTMLSpanElement>(aside, '#musette-val');
  const measureDisplay = q<HTMLSpanElement>(aside, '#measure-display');
  const meterDisplay = q<HTMLSpanElement>(aside, '#meter-display');
  const lastNoteDisplay = q<HTMLSpanElement>(aside, '#last-note-display');
  const beatLedStrip = q<HTMLDivElement>(aside, '#beat-led-strip');
  const virtualKeyboard = q<HTMLDivElement>(aside, '#virtual-keyboard');

  // Visibility
  const setVisible = (visible: boolean): void => {
    aside.classList.toggle('hidden', !visible);
  };
  q<HTMLButtonElement>(aside, '#btn-close-dashboard').addEventListener('click', () => setVisible(false));
  window.addEventListener('keydown', (e) => {
    if (e.key === '`') setVisible(aside.classList.contains('hidden'));
  });

  // Engine state
  audioEngine.subscribe((state) => {
    const running = state === 'running';
    statusBadge.textContent = running ? 'Running' : state === 'suspended' ? 'Suspended' : state;
    statusBadge.className = `badge ${running ? 'badge-running' : 'badge-suspended'}`;
    btnUnlock.textContent = running ? '✓ Engine Unlocked' : '🔊 Initialize & Unlock Engine';
    btnUnlock.disabled = running;
    btnPlay.disabled = !running;
    btnPause.disabled = !running;
    btnStop.disabled = !running;
  });
  btnUnlock.addEventListener('click', () => {
    void audioEngine.init().catch((err: unknown) => console.error('[dashboard] unlock failed:', err));
  });

  // Transport
  const showPlaying = (playing: boolean): void => {
    btnPlay.classList.toggle('active', playing);
    btnPause.classList.toggle('active', !playing);
  };
  btnPlay.addEventListener('click', () => {
    store.setPaused(false);
    director.start();
    showPlaying(true);
  });
  btnPause.addEventListener('click', () => {
    store.setPaused(true);
    director.pause();
    showPlaying(false);
  });
  btnStop.addEventListener('click', () => {
    director.stop();
    resetLeds();
    measureDisplay.textContent = 'Measure: 0';
    lastNoteDisplay.textContent = 'Last: -';
  });
  bpmSlider.addEventListener('input', () => {
    const bpm = Number(bpmSlider.value);
    bpmVal.textContent = `${bpm} BPM`;
    director.setBpm(bpm);
  });
  const syncBpm = (bpm: number): void => {
    bpmSlider.value = String(bpm);
    bpmVal.textContent = `${bpm} BPM`;
  };

  // Meter
  function updateMeterLeds(meter: MeterType): void {
    beatLedStrip.innerHTML = '';
    const def = METERS[meter];
    const total = def.steps;
    const accents = def.accents;
    for (let i = 0; i < total; i++) {
      const node = document.createElement('div');
      node.className = `led-node${accents.includes(i) ? ' accent' : ''}`;
      node.id = `led-step-${i}`;
      const light = document.createElement('div');
      light.className = 'led-light';
      const label = document.createElement('span');
      label.className = 'led-label';
      label.textContent = `${i + 1}`;
      node.append(light, label);
      beatLedStrip.appendChild(node);
    }
  }
  const syncMeter = (meter: MeterType): void => {
    const btn = Array.from(meterBtns).find((b) => b.dataset.meter === meter);
    meterBtns.forEach((b) => b.classList.toggle('active', b === btn));
    meterDisplay.textContent = `Meter: ${btn?.textContent?.trim() ?? meter}`;
    updateMeterLeds(meter);
  };
  meterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const meter = btn.dataset.meter as MeterType;
      director.setMeter(meter);
      syncMeter(meter);
    });
  });
  function resetLeds(): void {
    beatLedStrip.querySelectorAll('.active-step').forEach((n) => n.classList.remove('active-step'));
  }

  // Scale and keyboard
  function renderVirtualKeyboard(scaleName: ScaleName): void {
    virtualKeyboard.innerHTML = '';
    scaleDesc.textContent = SCALES[scaleName].characteristicMood;
    getScaleNotes(scaleName, 4).forEach((note, index) => {
      const keyBtn = document.createElement('button');
      keyBtn.type = 'button';
      keyBtn.className = 'key-btn';
      const noteName = document.createElement('span');
      noteName.className = 'note-name';
      noteName.textContent = note;
      const degree = document.createElement('span');
      degree.className = 'degree';
      degree.textContent = `Deg ${index + 1}`;
      keyBtn.append(noteName, degree);

      const noteOn = (e: Event): void => {
        e.preventDefault();
        keyBtn.classList.add('pressed');
        void audioEngine.init().then(() => accordion.triggerAttack(note, undefined, 0.85));
      };
      const noteOff = (e: Event): void => {
        e.preventDefault();
        keyBtn.classList.remove('pressed');
        accordion.triggerRelease(note);
      };
      keyBtn.addEventListener('pointerdown', noteOn);
      keyBtn.addEventListener('pointerup', noteOff);
      keyBtn.addEventListener('pointerleave', noteOff);
      keyBtn.addEventListener('pointercancel', noteOff);
      virtualKeyboard.appendChild(keyBtn);
    });
  }
  const syncScale = (scale: ScaleName): void => {
    scaleBtns.forEach((b) => b.classList.toggle('active', b.dataset.scale === scale));
    renderVirtualKeyboard(scale);
  };
  scaleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const scale = btn.dataset.scale as ScaleName;
      director.setScale(scale);
      syncScale(scale);
    });
  });

  // Presets
  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      presetBtns.forEach((b) => b.classList.toggle('active', b === btn));
      mixer.applyPreset(btn.dataset.preset as EnsemblePreset);
    });
  });

  // Mixer rack
  function flashChannelLed(id: InstrumentId): void {
    const led = aside.querySelector<HTMLDivElement>(`#activity-led-${id}`);
    if (!led) return;
    led.classList.add('active');
    setTimeout(() => led.classList.remove('active'), 120);
  }

  function auditionInstrument(id: InstrumentId): void {
    director.audition(id);
    flashChannelLed(id);
  }

  function renderMixerRack(channels: InstrumentChannelState[]): void {
    mixerRack.innerHTML = '';
    for (const ch of channels) {
      const strip = document.createElement('div');
      strip.className = `channel-strip ${ch.recruited ? 'recruited' : 'locked'}`;

      const header = document.createElement('div');
      header.className = 'channel-header';
      const titleRow = document.createElement('div');
      titleRow.className = 'channel-title-row';
      const name = document.createElement('span');
      name.className = 'channel-name';
      name.textContent = ch.name;
      name.title = ch.displayName;
      name.style.borderLeft = `3px solid ${ch.color}`;
      name.style.paddingLeft = '4px';
      const led = document.createElement('div');
      led.className = 'channel-activity-led';
      led.id = `activity-led-${ch.id}`;
      titleRow.append(name, led);
      const role = document.createElement('div');
      role.className = 'channel-role';
      role.textContent = ch.role;
      header.append(titleRow, role);

      const btnRecruit = document.createElement('button');
      btnRecruit.type = 'button';
      btnRecruit.className = `btn-recruit ${ch.recruited ? 'recruited' : 'locked'}`;
      btnRecruit.textContent = ch.recruited ? '✓ Active' : '+ Recruit';
      btnRecruit.addEventListener('click', () => mixer.setRecruited(ch.id, !ch.recruited));

      const muteSoloRow = document.createElement('div');
      muteSoloRow.className = 'channel-mute-solo-row';
      const btnMute = document.createElement('button');
      btnMute.type = 'button';
      btnMute.className = `btn-mute ${ch.muted ? 'active' : ''}`;
      btnMute.textContent = 'M';
      btnMute.addEventListener('click', () => mixer.setMute(ch.id, !ch.muted));
      const btnSolo = document.createElement('button');
      btnSolo.type = 'button';
      btnSolo.className = `btn-solo ${ch.solo ? 'active' : ''}`;
      btnSolo.textContent = 'S';
      btnSolo.addEventListener('click', () => mixer.setSolo(ch.id, !ch.solo));
      muteSoloRow.append(btnMute, btnSolo);

      const faders = document.createElement('div');
      faders.className = 'channel-faders';
      faders.append(
        makeFader(
          'Vol',
          String(ch.volume),
          '-40',
          '6',
          '1',
          (v) => `${v}dB`,
          (v) => mixer.setVolume(ch.id, v),
        ),
        makeFader('Pan', String(ch.pan), '-1', '1', '0.05', formatPan, (v) => mixer.setPan(ch.id, v)),
      );

      const btnAudition = document.createElement('button');
      btnAudition.type = 'button';
      btnAudition.className = 'btn-audition';
      btnAudition.textContent = '▶ Audition';
      btnAudition.addEventListener('click', () => {
        void audioEngine.init().then(() => auditionInstrument(ch.id));
      });

      strip.append(header, btnRecruit, muteSoloRow, faders, btnAudition);
      mixerRack.appendChild(strip);
    }
  }

  function formatPan(p: number): string {
    return p === 0 ? 'C' : p < 0 ? `L${Math.round(-p * 100)}` : `R${Math.round(p * 100)}`;
  }

  function makeFader(
    label: string,
    value: string,
    min: string,
    max: string,
    step: string,
    format: (v: number) => string,
    onInput: (v: number) => void,
  ): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'fader-group';
    const header = document.createElement('div');
    header.className = 'fader-label-row';
    const name = document.createElement('span');
    name.textContent = label;
    const val = document.createElement('span');
    val.className = 'fader-val';
    val.textContent = format(Number(value));
    header.append(name, val);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;
    input.addEventListener('input', () => {
      const v = Number(input.value);
      val.textContent = format(v);
      onInput(v);
    });
    group.append(header, input);
    return group;
  }

  mixer.subscribe(renderMixerRack);

  // Accordion sliders
  bellowsSlider.addEventListener('input', () => {
    const percent = Number(bellowsSlider.value);
    bellowsVal.textContent = `${percent}%`;
    accordion.setBellowsPressure(percent / 100);
  });
  musetteSlider.addEventListener('input', () => {
    const cents = Number(musetteSlider.value);
    musetteVal.textContent = `+${cents} Cents`;
    accordion.setMusetteDetune(cents);
  });

  // Conductor step readout
  director.onStep((event: ConductorStepEvent) => {
    measureDisplay.textContent = `Measure: ${event.measureCount + 1}`;
    meterDisplay.textContent = `Meter: ${event.meter} (${event.totalSteps}/8)`;
    if (event.note) lastNoteDisplay.textContent = `Last: ${event.note}`;
    if (beatLedStrip.children.length !== event.totalSteps) updateMeterLeds(event.meter);
    resetLeds();
    aside.querySelector(`#led-step-${event.stepIndex}`)?.classList.add('active-step');
    if (event.triggers) {
      for (const id of Object.keys(event.triggers) as InstrumentId[]) {
        if (mixer.isInstrumentActive(id)) flashChannelLed(id);
      }
    }
  });

  // Mirror what the audio bridge does, for the readouts
  eventBus.on('BELLOWS_COMPRESS', (e) => {
    const pct = Math.round((e.isCharging ? e.pressure : 0.75) * 100);
    bellowsSlider.value = String(pct);
    bellowsVal.textContent = `${pct}%`;
  });
  eventBus.on('BELLOWS_BURST', () => flashChannelLed('accordion'));
  eventBus.on('TIP_COLLECTED', () => flashChannelLed('percussion'));
  eventBus.on('PLAYER_LAND', () => flashChannelLed('percussion'));
  eventBus.on('PLAYER_STUMBLE', () => {
    flashChannelLed('percussion');
    syncMeter('5/8_LURCH');
  });
  eventBus.on('TIER_CHANGE', (e) => {
    e.activeInstruments.forEach(flashChannelLed);
    if (e.tier >= 2) {
      const audio = store.getCurrentActDefinition().audioConfig;
      syncMeter(audio.meter);
      syncBpm(audio.bpm);
    }
  });
  eventBus.on('ACT_CHANGE', (p) => {
    const { scale, meter, bpm } = store.getActDefinition(p.act).audioConfig;
    syncScale(scale);
    syncMeter(meter);
    syncBpm(bpm);
  });
  eventBus.on('GAME_START', () => showPlaying(true));
  eventBus.on('RESTART_GAME', () => showPlaying(true));
  eventBus.on('GAME_OVER', () => showPlaying(false));
  eventBus.on('VICTORY', () => showPlaying(false));
  eventBus.on('GAME_PAUSE', (p) => showPlaying(!p.isPaused));

  // Initial state
  syncMeter(director.meter);
  syncScale(director.scale);
  syncBpm(Math.round(director.getBpm()));
}
