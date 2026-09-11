import * as Tone from 'tone';
import { Rng } from '../util/Rng.ts';
import { eventBus, type BuffType } from '../state/eventBus.ts';
import { store } from '../state/store.ts';
import { Arranger, type ArrangementState } from './arrangement/arranger.ts';
import type { FinalePhase } from './arrangement/dynamics.ts';
import { composePhrase } from './composer/phraseComposer.ts';
import type { BarScore, NoteEvent, Phrase, VoiceScore } from './composer/types.ts';
import { audioEngine } from './engine.ts';
import { EnsembleMixer } from './mixer.ts';
import { BarScheduler, type BarPlayback } from './scheduling/barScheduler.ts';
import { AccordionSynth } from './synths/accordion.ts';
import { UprightBassSynth } from './synths/bass.ts';
import { KlezmerClarinetSynth } from './synths/clarinet.ts';
import { FlamencoGuitarSynth } from './synths/guitar.ts';
import { PercussionSynth } from './synths/percussion.ts';
import { GypsyViolinSynth } from './synths/violin.ts';
import { voiceLead } from './theory/chords.ts';
import { METERS, type MeterName } from './theory/meter.ts';
import { MODES, stepInMode, type ModeName } from './theory/modes.ts';
import { midiToNote } from './theory/pitch.ts';
import { ACT_MUSIC, FRISS_TEMPLATES } from './theory/progressions.ts';
import type { ConductorListener, ConductorStepEvent, InstrumentId } from './types.ts';

const ALL_INSTRUMENTS: InstrumentId[] = ['accordion', 'bass', 'percussion', 'guitar', 'violin', 'clarinet'];
const RESTING_BELLOWS_PRESSURE = 0.75;
const LASSU_BARS = 8;
const ACCEL_BARS = 8;
const LASSU_BPM = 80;

interface ActRequest {
  act: number;
}

/**
 * MusicDirector - owns the synths, composes the music one bar ahead, and
 * translates game events into musical decisions. It replaces the fixed step
 * table: every bar is generated from the act's mode, meter, progression,
 * the band currently recruited, and the player's energy.
 */
export class MusicDirector {
  public readonly mixer: EnsembleMixer;
  public readonly accordion: AccordionSynth;
  public readonly bass: UprightBassSynth;
  public readonly percussion: PercussionSynth;
  public readonly guitar: FlamencoGuitarSynth;
  public readonly violin: GypsyViolinSynth;
  public readonly clarinet: KlezmerClarinetSynth;

  private readonly scheduler: BarScheduler;
  private arranger: Arranger;
  private rng: Rng;
  private listeners = new Set<ConductorListener>();
  private detachers: Array<() => void> = [];

  // Musical state
  private act = 1;
  private modeName: ModeName = ACT_MUSIC[1].mode;
  private meterName: MeterName = ACT_MUSIC[1].meters[0];
  private meterCycle = 0;
  private targetBpm = ACT_MUSIC[1].bpm;
  private phrase: Phrase | null = null;
  private phraseCount = 0;
  private pendingAct: ActRequest | null = null;
  private modeOverride: ModeName | null = null;
  private meterOverride: MeterName | null = null;
  private lurchBars = 0;
  private finale: FinalePhase = 'none';
  private finaleBar = 0;
  private energy = 0.4;
  private energyTarget = 0.4;
  private recruited = new Set<InstrumentId>(['accordion']);
  private joining = new Set<InstrumentId>();
  private tambourine = false;
  private doubleTime = false;
  private currentChordVoicing: number[] = [62, 66, 69];

  constructor(mixer?: EnsembleMixer, seed = 1) {
    this.mixer = mixer ?? new EnsembleMixer();
    this.accordion = new AccordionSynth();
    this.bass = new UprightBassSynth();
    this.percussion = new PercussionSynth();
    this.guitar = new FlamencoGuitarSynth();
    this.violin = new GypsyViolinSynth();
    this.clarinet = new KlezmerClarinetSynth();
    this.accordion.connect(this.mixer.getChannelInput('accordion'));
    this.bass.connect(this.mixer.getChannelInput('bass'));
    this.percussion.connect(this.mixer.getChannelInput('percussion'));
    this.guitar.connect(this.mixer.getChannelInput('guitar'));
    this.violin.connect(this.mixer.getChannelInput('violin'));
    this.clarinet.connect(this.mixer.getChannelInput('clarinet'));

    this.rng = new Rng(seed);
    this.arranger = new Arranger(this.rng.fork('arranger'));
    this.scheduler = new BarScheduler({
      nextScore: (i) => this.nextScore(i),
      play: (score, playback, at) => this.play(score, playback, at),
      onStep: (score, step, time) => this.emitStep(score, step, time),
      onBarStart: (score, time) => this.onBarStart(score, time),
    });
  }

  // -------------------------------------------------------------
  // Public API (also used by the debug dashboard)
  // -------------------------------------------------------------

  get meter(): MeterName {
    return this.meterOverride ?? this.meterName;
  }

  get scale(): ModeName {
    return this.modeOverride ?? this.modeName;
  }

  get currentAct(): number {
    return this.act;
  }

  /** Subscribes to game and store events. Returns a detach function. */
  attach(): () => void {
    this.detach();
    const on = eventBus.on.bind(eventBus);
    this.detachers = [
      store.subscribe((state) => this.syncRecruitment(new Set(state.activeInstruments))),
      on('ACT_CHANGE', (p) => this.requestAct(p.act)),
      on('MOMENTUM_CHANGE', (p) => {
        this.energyTarget = p.momentum / 100;
      }),
      on('PLAYER_STUMBLE', (p) => this.onStumble(p.severity)),
      on('PLAYER_STEP', (p) => this.onFootstep(p.stride)),
      on('PLAYER_LAND', (p) => {
        if (audioEngine.isReady && p.impactSpeed > 250)
          this.percussion.triggerStomp(undefined, Math.min(1, p.impactSpeed / 700));
      }),
      on('BELLOWS_COMPRESS', (e) => {
        if (e.isCharging) this.accordion.setBellowsPressure(Math.max(0.1, e.pressure), 0.02);
        else this.accordion.setBellowsPressure(RESTING_BELLOWS_PRESSURE, 0.15);
      }),
      on('BELLOWS_BURST', (e) => {
        if (!audioEngine.isReady) return;
        this.accordion.triggerAttackRelease(
          this.currentChordVoicing.map(midiToNote),
          '8n',
          undefined,
          0.6 + e.pressure * 0.4,
        );
      }),
      on('TIP_COLLECTED', () => {
        if (audioEngine.isReady) this.percussion.triggerCastanet(undefined, 0.6);
      }),
      on('BUFF_ACTIVATED', (e) => this.onBuff(e.buff, true)),
      on('BUFF_DEACTIVATED', (e) => this.onBuff(e.buff, false)),
      on('HAZARD_HIT', (e) => this.onHazard(e.hazardType)),
      on('SHIELD_BLOCKED', () => {
        if (!audioEngine.isReady) return;
        this.percussion.triggerMetal(undefined, 0.9);
        this.percussion.triggerStomp(undefined, 0.6);
      }),
      on('GAME_START', () => {
        void audioEngine.init().then(() => this.start());
      }),
      on('RESTART_GAME', () => this.restart()),
      on('GAME_OVER', () => this.onGameOver()),
      on('VICTORY', () => this.onVictory()),
      on('GAME_PAUSE', (p) => (p.isPaused ? this.pause() : this.start())),
    ];
    return () => this.detach();
  }

  detach(): void {
    for (const off of this.detachers) off();
    this.detachers = [];
  }

  /** Starts (or resumes) playback. Safe to call repeatedly. */
  start(): void {
    if (!audioEngine.isReady) return;
    audioEngine.startTransport();
    this.scheduler.start();
  }

  pause(): void {
    audioEngine.pauseTransport();
  }

  /** Stops, rewinds, and forgets the phrase so the next start is bar 1, beat 1. */
  stop(): void {
    this.scheduler.reset();
    Tone.getTransport().cancel(0);
    audioEngine.stopTransport();
    this.releaseAll();
    this.phrase = null;
    this.phraseCount = 0;
    this.lurchBars = 0;
    this.meterOverride = null;
    this.modeOverride = null;
    this.arranger.reset();
  }

  restart(): void {
    this.stop();
    this.applyAct(store.getState().activeAct || 1);
    this.start();
  }

  setBpm(bpm: number): void {
    this.targetBpm = Math.max(30, Math.min(300, bpm));
    audioEngine.setBpm(this.targetBpm, 0.05);
  }

  getBpm(): number {
    return audioEngine.getBpm();
  }

  /** Dashboard override: the meter takes effect on the next bar. */
  setMeter(meter: MeterName): void {
    this.meterOverride = meter;
  }

  /** Dashboard override: the mode takes effect on the next phrase. */
  setScale(mode: ModeName): void {
    this.modeOverride = mode;
    this.phrase = null;
  }

  onStep(listener: ConductorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  audition(id: InstrumentId): void {
    const chord = this.currentChordVoicing.map(midiToNote);
    switch (id) {
      case 'accordion':
        this.accordion.triggerAttackRelease(chord, '4n', undefined, 0.85);
        break;
      case 'bass':
        this.bass.triggerAttackRelease('D2', '4n', undefined, 0.95);
        break;
      case 'percussion':
        this.percussion.triggerStomp(undefined, 0.95);
        this.percussion.triggerCastanet(undefined, 0.85);
        break;
      case 'guitar':
        this.guitar.strumChord(chord, undefined, 'down', 0.018, '4n');
        break;
      case 'violin':
        this.violin.triggerAttackRelease(midiToNote(this.currentChordVoicing[2] + 12), '2n', undefined, 0.9);
        break;
      case 'clarinet':
        this.clarinet.triggerKrekhts('D5', undefined, '4n');
        break;
    }
  }

  dispose(): void {
    this.detach();
    this.stop();
    this.listeners.clear();
    for (const s of [this.accordion, this.bass, this.percussion, this.guitar, this.violin, this.clarinet])
      s.dispose();
    this.mixer.dispose();
  }

  // -------------------------------------------------------------
  // Composition
  // -------------------------------------------------------------

  private nextScore(barIndex: number): BarScore {
    // Act changes land on a bar boundary; the phrase restarts.
    if (this.pendingAct) {
      this.applyAct(this.pendingAct.act);
      this.pendingAct = null;
    }

    if (
      !this.phrase ||
      this.phrase.bars.every((b) => b.index < barIndex) ||
      this.phrase.bars[0].index > barIndex
    ) {
      this.phrase = this.composeNextPhrase(barIndex);
    }
    let bar = this.phrase.bars.find((b) => b.index === barIndex) ?? this.phrase.bars[0];

    // A stumble lurches the band into 5/8 for a bar or two, then it recovers.
    let meter = this.meterOverride ? METERS[this.meterOverride] : bar.meter;
    if (this.lurchBars > 0) {
      meter = METERS['5/8_LURCH'];
      this.lurchBars -= 1;
    }
    if (meter !== bar.meter) bar = { ...bar, meter };

    // Energy follows momentum slowly; tempo breathes with it.
    this.energy += (this.energyTarget - this.energy) * 0.25;
    const bpm = this.bpmForBar(bar.phraseBar);

    const state: ArrangementState = {
      act: this.act,
      recruited: this.recruited,
      joining: new Set(this.joining),
      energy: this.energy,
      tambourine: this.tambourine,
      doubleTime: this.doubleTime,
      finale: this.finale,
    };
    this.joining.clear();

    const score = this.arranger.arrangeBar(bar, this.phrase, state, bpm);
    this.currentChordVoicing = voiceLead(this.currentChordVoicing, bar.chord, 57, 76);
    this.advanceFinale();
    return score;
  }

  private composeNextPhrase(firstBarIndex: number): Phrase {
    const music = ACT_MUSIC[this.act];
    const friss = this.finale === 'accel' || this.finale === 'friss';
    const modeName = this.modeOverride ?? (friss ? 'D_MAJOR' : this.modeName);
    const meterName = this.meterName;
    const templates = friss ? FRISS_TEMPLATES : music.templates;
    const phrase = composePhrase({
      mode: MODES[modeName],
      meter: METERS[meterName],
      templates,
      firstBarIndex,
      rng: this.rng,
      previousTemplate: this.phrase?.templateIndex,
    });
    this.phraseCount += 1;
    // Acts with several meters alternate per phrase
    this.meterCycle = (this.meterCycle + 1) % music.meters.length;
    this.meterName = this.finale === 'none' ? music.meters[this.meterCycle] : '4/4';
    return phrase;
  }

  private bpmForBar(phraseBar: number): number {
    if (this.finale === 'lassu') return LASSU_BPM;
    if (this.finale === 'accel') {
      const t = this.finaleBar / ACCEL_BARS;
      return LASSU_BPM + (ACT_MUSIC[5].bpm - LASSU_BPM) * t;
    }
    const breathe = 0.94 + 0.12 * this.energy;
    void phraseBar;
    return this.targetBpm * breathe;
  }

  private advanceFinale(): void {
    if (this.finale === 'none' || this.finale === 'friss') return;
    this.finaleBar += 1;
    if (this.finale === 'lassu' && this.finaleBar >= LASSU_BARS) {
      this.finale = 'accel';
      this.finaleBar = 0;
      this.phrase = null; // switch to friss templates in D major
    } else if (this.finale === 'accel' && this.finaleBar >= ACCEL_BARS) {
      this.finale = 'friss';
      this.finaleBar = 0;
    }
  }

  private requestAct(act: number): void {
    if (!this.scheduler.isRunning) {
      this.applyAct(act);
      return;
    }
    this.pendingAct = { act };
  }

  private applyAct(act: number): void {
    const music = ACT_MUSIC[act] ?? ACT_MUSIC[1];
    this.act = act;
    this.modeName = music.mode;
    this.meterCycle = 0;
    this.meterName = music.meters[0];
    this.targetBpm = music.bpm;
    this.modeOverride = null;
    this.meterOverride = null;
    this.phrase = null;
    this.finale = act === 5 ? 'lassu' : 'none';
    this.finaleBar = 0;
    if (act === 5) this.arranger.reset();
  }

  // -------------------------------------------------------------
  // Playback
  // -------------------------------------------------------------

  private onBarStart(score: BarScore, time: number): void {
    const transport = Tone.getTransport();
    transport.timeSignature = [...score.bar.meter.timeSignature];
    const barSec = (score.bar.meter.steps * 30) / score.bpm;
    if (this.finale === 'accel') {
      transport.bpm.rampTo(score.bpm, barSec, time);
    } else if (Math.abs(transport.bpm.value - score.bpm) > 0.5) {
      transport.bpm.rampTo(score.bpm, Math.min(barSec, 1.5), time);
    }
  }

  private play(
    score: BarScore,
    playback: BarPlayback,
    at: (step: number, offsetSec?: number) => string,
  ): void {
    const transport = Tone.getTransport();
    const stepSec = 30 / score.bpm;
    const mode = this.phrase?.mode ?? MODES[this.modeName];
    const schedule = (step: number, offsetSec: number, cb: (time: number) => void): void => {
      this.scheduler.track(transport.scheduleOnce(cb, at(step, offsetSec)));
    };
    void playback;

    for (const voice of score.voices) {
      if (!this.recruited.has(voice.voice)) continue;
      switch (voice.voice) {
        case 'accordion':
          this.playNotes(voice.notes, stepSec, schedule, (n, t, dur) =>
            this.accordion.triggerAttackRelease(midiToNote(n.midi), dur, t, n.velocity),
          );
          break;
        case 'bass':
          this.playNotes(voice.notes, stepSec, schedule, (n, t, dur) =>
            this.bass.triggerAttackRelease(midiToNote(n.midi), dur, t, n.velocity),
          );
          break;
        case 'violin':
          this.playMelodic(voice, stepSec, schedule, mode, (note, dur, t, vel) =>
            this.violin.triggerAttackRelease(note, dur, t, vel),
          );
          break;
        case 'clarinet':
          this.playMelodic(voice, stepSec, schedule, mode, (note, dur, t, vel) =>
            this.clarinet.triggerAttackRelease(note, dur, t, vel),
          );
          break;
        case 'percussion':
          for (const h of voice.perc ?? []) {
            schedule(h.step, h.offsetSec, (t) => this.percussion.trigger(h.hit, t, h.velocity));
          }
          break;
        case 'guitar':
          for (const s of voice.strums ?? []) {
            const chord = this.currentChordVoicing.map(midiToNote);
            schedule(s.step, 0, (t) =>
              this.guitar.strumChord(
                chord,
                t,
                s.direction,
                s.direction === 'down' ? 0.016 : 0.012,
                '8n',
                s.velocity,
              ),
            );
          }
          break;
      }
    }
  }

  private playNotes(
    notes: readonly NoteEvent[],
    stepSec: number,
    schedule: (step: number, offsetSec: number, cb: (time: number) => void) => void,
    trigger: (n: NoteEvent, time: number, durSec: number) => void,
  ): void {
    for (const n of notes) {
      const dur = Math.max(0.05, n.durSteps * stepSec * 0.92);
      schedule(n.step, n.offsetSec, (t) => trigger(n, t, dur));
    }
  }

  /** Melodic voices realise ornaments: mordents, grace notes, and the clarinet's krekhts. */
  private playMelodic(
    voice: VoiceScore,
    stepSec: number,
    schedule: (step: number, offsetSec: number, cb: (time: number) => void) => void,
    mode: Phrase['mode'],
    trigger: (note: string, durSec: number, time: number, velocity: number) => void,
  ): void {
    for (const n of voice.notes) {
      const dur = Math.max(0.05, n.durSteps * stepSec * 0.92);
      const note = midiToNote(n.midi);
      switch (n.ornament) {
        case 'mordent': {
          const upper = midiToNote(stepInMode(mode, n.midi, 1));
          const t16 = stepSec / 2;
          schedule(n.step, n.offsetSec, (t) => {
            trigger(note, t16 * 0.9, t, n.velocity);
            trigger(upper, t16 * 0.9, t + t16, n.velocity * 0.85);
            trigger(note, Math.max(0.05, dur - 2 * t16), t + 2 * t16, n.velocity);
          });
          break;
        }
        case 'grace': {
          const below = midiToNote(stepInMode(mode, n.midi, -1));
          const t32 = stepSec / 4;
          schedule(n.step, n.offsetSec - t32, (t) => {
            trigger(below, t32 * 0.9, t, n.velocity * 0.7);
            trigger(note, dur, t + t32, n.velocity);
          });
          break;
        }
        case 'krekhts':
          if (voice.voice === 'clarinet') {
            schedule(n.step, n.offsetSec, (t) => this.clarinet.triggerKrekhts(note, t, dur));
          } else {
            schedule(n.step, n.offsetSec, (t) => trigger(note, dur, t, n.velocity));
          }
          break;
        default:
          schedule(n.step, n.offsetSec, (t) => trigger(note, dur, t, n.velocity));
      }
    }
  }

  private emitStep(score: BarScore, step: number, time: number): void {
    const meter = score.bar.meter;
    const groupIndex = meter.accents.filter((a) => a <= step).length - 1;
    const triggers: Partial<Record<InstrumentId, string>> = {};
    for (const v of score.voices) {
      if (!this.recruited.has(v.voice)) continue;
      const hit =
        v.notes.find((n) => Math.floor(n.step) === step) ?? v.perc?.find((p) => Math.floor(p.step) === step);
      const strum = v.strums?.find((s) => Math.floor(s.step) === step);
      if (hit || strum)
        triggers[v.voice] = hit && 'midi' in hit ? midiToNote(hit.midi) : hit ? hit.hit : 'strum';
    }
    const event: ConductorStepEvent = {
      stepIndex: step,
      totalSteps: meter.steps,
      measureCount: score.bar.index,
      isAccent: meter.accents.includes(step),
      groupIndex: Math.max(0, groupIndex),
      groupLength: meter.groups[Math.max(0, groupIndex)],
      meter: meter.name,
      scale: this.scale,
      note: triggers.accordion,
      triggers,
    };
    void time;
    for (const l of this.listeners) {
      try {
        l(event);
      } catch (err) {
        console.error('[MusicDirector] step listener failed:', err);
      }
    }
  }

  // -------------------------------------------------------------
  // Game reactions
  // -------------------------------------------------------------

  private syncRecruitment(active: Set<InstrumentId>): void {
    for (const id of ALL_INSTRUMENTS) {
      const shouldBe = active.has(id);
      const current = this.mixer.getChannelState(id);
      if (current && current.recruited !== shouldBe) this.mixer.setRecruited(id, shouldBe);
      if (shouldBe && !this.recruited.has(id)) this.joining.add(id);
    }
    this.recruited = new Set(active);
  }

  private onStumble(severity: number): void {
    if (!audioEngine.isReady) return;
    this.percussion.triggerStomp(undefined, 0.95);
    this.percussion.triggerCastanet(undefined, 0.9);
    // A dissonant bII stab, then a bar or two of lurching 5/8
    const stab = this.currentChordVoicing.map((m) => midiToNote(m + 1));
    this.accordion.triggerAttackRelease(stab, '16n', undefined, 0.7);
    this.lurchBars = Math.max(this.lurchBars, 1 + Math.round(severity));
  }

  private onFootstep(stride: number): void {
    if (!audioEngine.isReady || Tone.getTransport().state !== 'started') return;
    const next = Tone.getTransport().nextSubdivision('16n');
    this.scheduler.track(
      Tone.getTransport().scheduleOnce((t) => this.percussion.triggerRim(t, 0.18 + stride * 0.12), next),
    );
  }

  private onBuff(buff: BuffType, on: boolean): void {
    switch (buff) {
      case 'tips':
        this.tambourine = on;
        if (on && audioEngine.isReady) this.percussion.triggerMetal(undefined, 0.8);
        break;
      case 'steam':
        this.doubleTime = on;
        if (on && audioEngine.isReady) this.percussion.triggerStomp(undefined, 0.9);
        break;
      case 'balance':
        if (on && audioEngine.isReady) {
          this.accordion.triggerAttackRelease(
            this.currentChordVoicing.map(midiToNote),
            '4n',
            undefined,
            0.85,
          );
        }
        break;
      case 'shield':
        if (on && audioEngine.isReady) {
          this.percussion.triggerMetal(undefined, 0.8);
          this.percussion.triggerCastanet(undefined, 0.7);
        }
        break;
    }
  }

  private onHazard(kind: 'crate' | 'puddle'): void {
    if (!audioEngine.isReady) return;
    if (kind === 'crate') {
      const now = Tone.now();
      for (let i = 0; i < 3; i++) this.percussion.triggerCastanet(now + i * 0.04, 0.9 - i * 0.15);
      this.bass.triggerAttackRelease('D1', '8n', now, 0.95);
    } else {
      this.percussion.triggerShaker(undefined, 0.9);
      if (this.recruited.has('violin')) this.violin.triggerSlideDown(undefined, 0.7);
    }
  }

  /** The band trails off one instrument at a time over about a bar, then the bass drops. */
  private onGameOver(): void {
    if (!audioEngine.isReady) {
      this.pause();
      return;
    }
    const order: InstrumentId[] = ['clarinet', 'violin', 'guitar', 'percussion', 'accordion', 'bass'];
    const now = Tone.now();
    order.forEach((id, i) => {
      this.mixer.fadeOut(id, now + i * 0.18, 0.35);
    });
    this.percussion.triggerStomp(now, 0.95);
    this.bass.triggerAttackRelease('D1', '2n', now + 0.9, 0.9);
    setTimeout(() => {
      this.pause();
      for (const id of order) this.mixer.restoreChannel(id);
    }, 1800);
  }

  private onVictory(): void {
    if (audioEngine.isReady) {
      const chord = this.currentChordVoicing.map(midiToNote);
      this.accordion.triggerAttackRelease([...chord, 'D5'], '1m', undefined, 0.95);
      this.violin.triggerAttackRelease('D5', '1m', undefined, 0.9);
      this.percussion.triggerStomp(undefined, 0.85);
    }
    this.pause();
  }

  private releaseAll(): void {
    this.accordion.releaseAll();
    this.guitar.releaseAll();
    this.bass.triggerRelease();
    this.violin.triggerRelease();
    this.clarinet.triggerRelease();
  }
}
