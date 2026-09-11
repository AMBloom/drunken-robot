import type { Rng } from '../../util/Rng.ts';
import { humanizeNotes, humanizePerc } from '../composer/humanize.ts';
import { MelodyLine } from '../composer/melody.ts';
import { applyOrnaments, ORNAMENT_PROFILES } from '../composer/ornaments.ts';
import { bassPattern, compPattern, percPattern, strumPattern } from '../composer/rhythmPatterns.ts';
import type { Bar, BarScore, NoteEvent, PercEvent, Phrase, VoiceScore } from '../composer/types.ts';
import { voiceLead } from '../theory/chords.ts';
import { isOffbeat } from '../theory/meter.ts';
import { stepInMode } from '../theory/modes.ts';
import { intoRange } from '../theory/pitch.ts';
import type { InstrumentId } from '../types.ts';
import { dynamicFor, type FinalePhase } from './dynamics.ts';

export interface ArrangementState {
  act: number;
  recruited: ReadonlySet<InstrumentId>;
  /** Instruments that were recruited since the last bar; they get a fill this bar. */
  joining: ReadonlySet<InstrumentId>;
  /** 0..1, from momentum. */
  energy: number;
  tambourine: boolean;
  doubleTime: boolean;
  finale: FinalePhase;
}

const REGISTERS = {
  accordionLead: { low: 62, high: 81 },
  violin: { low: 67, high: 88 },
  clarinet: { low: 60, high: 84 },
  accordionComp: { low: 55, high: 74 },
  accordionBass: { low: 43, high: 57 },
} as const;

/**
 * Turns a bar of harmony into parts for whoever is currently in the band.
 * Roles shift as instruments join: the accordion carries lead, chords, and
 * left-hand bass alone; hands the bass to the upright bass, the downbeat to
 * the guitar, and the lead to the violin (antecedent) and clarinet
 * (consequent) as they arrive.
 */
export class Arranger {
  private readonly rng: Rng;
  private readonly leads: Record<'accordion' | 'violin' | 'clarinet', MelodyLine>;
  private prevVoicing: number[] | null = null;

  constructor(rng: Rng) {
    this.rng = rng;
    this.leads = {
      accordion: new MelodyLine({ ...REGISTERS.accordionLead, density: 0.55, leapChance: 0.15 }, 69),
      violin: new MelodyLine({ ...REGISTERS.violin, density: 0.65, leapChance: 0.25 }, 74),
      clarinet: new MelodyLine({ ...REGISTERS.clarinet, density: 0.6, leapChance: 0.2 }, 71),
    };
  }

  reset(): void {
    this.prevVoicing = null;
    this.leads.accordion.reset(69);
    this.leads.violin.reset(74);
    this.leads.clarinet.reset(71);
  }

  arrangeBar(bar: Bar, phrase: Phrase, state: ArrangementState, bpm: number): BarScore {
    const { meter, chord } = bar;
    const mode = phrase.mode;
    const has = (id: InstrumentId): boolean => state.recruited.has(id);
    const dyn = dynamicFor(state.act, state.energy, bar.phraseBar, state.finale);
    const voices: VoiceScore[] = [];

    // Shared chord voicing for this bar, voice-led from the last
    const voicing = voiceLead(
      this.prevVoicing,
      chord,
      REGISTERS.accordionComp.low,
      REGISTERS.accordionComp.high,
    );
    this.prevVoicing = voicing;

    // Who leads: violin on the antecedent, clarinet on the consequent, accordion otherwise.
    const violinLeads = has('violin') && (bar.phraseBar < 4 || !has('clarinet'));
    const clarinetLeads = has('clarinet') && !violinLeads;
    const lead: 'violin' | 'clarinet' | 'accordion' = violinLeads
      ? 'violin'
      : clarinetLeads
        ? 'clarinet'
        : 'accordion';
    const lassu = state.finale === 'lassu';

    const leadNotes = this.leads[lead].nextBar(bar, phrase, this.rng);
    if (lassu) thinTo(leadNotes, 0.4, this.rng);
    applyOrnaments(leadNotes, bar, ORNAMENT_PROFILES[lead], this.rng);
    if (state.joining.has(lead) && lead !== 'accordion') this.addLeadFill(leadNotes, bar, mode, lead);

    // Accordion
    const accordion: NoteEvent[] = [];
    if (lead === 'accordion') {
      accordion.push(...leadNotes);
    } else if (!lassu) {
      // Counter-line: a sustained chord tone a third-ish under the lead's first note on the downbeat
      const first = leadNotes[0];
      if (first) {
        const under = intoRange(
          stepInMode(mode, first.midi, -2),
          REGISTERS.accordionComp.low,
          REGISTERS.accordionComp.high,
        );
        accordion.push({ step: 0, offsetSec: 0, midi: under, durSteps: meter.groups[0], velocity: 0.55 });
      }
    }
    if (!lassu) {
      let comp = compPattern(meter, voicing, state.energy);
      if (has('guitar'))
        comp = comp.filter((n) => n.step % 2 === 1 && isOffbeat(meter, n.step) && n.step % 4 === 1);
      accordion.push(
        ...comp.map((n) => ({ ...n, velocity: n.velocity * (lead === 'accordion' ? 0.85 : 1) })),
      );
      if (!has('bass')) {
        // Left-hand bass buttons until the upright arrives
        for (const n of bassPattern(meter, mode, chord, bar.nextChord, state.energy)) {
          accordion.push({
            ...n,
            midi: intoRange(n.midi, REGISTERS.accordionBass.low, REGISTERS.accordionBass.high),
            velocity: n.velocity * 0.8,
          });
        }
      }
    }
    voices.push({ voice: 'accordion', notes: this.finish(accordion, bar, dyn) });

    if (lassu) {
      // Lassú: accordion and violin only, rubato and hushed
      if (has('violin') && lead !== 'violin') {
        voices.push({
          voice: 'violin',
          notes: this.finish(this.sustainedHarmony(leadNotes, bar, mode, REGISTERS.violin), bar, dyn),
        });
      } else if (lead === 'violin') {
        voices.push({ voice: 'violin', notes: this.finish(leadNotes, bar, dyn) });
      }
      return { bar, voices, bpm };
    }

    if (has('bass')) {
      const notes = bassPattern(meter, mode, chord, bar.nextChord, state.energy);
      if (state.joining.has('bass')) this.addBassFill(notes, bar, mode);
      voices.push({ voice: 'bass', notes: this.finish(notes, bar, dyn) });
    }

    if (has('percussion')) {
      const perc = percPattern(meter, {
        energy: state.energy,
        tambourine: state.tambourine,
        doubleTime: state.doubleTime,
      });
      if (state.joining.has('percussion')) {
        perc.unshift(
          { step: 0, offsetSec: 0, hit: 'castanet', velocity: 0.7 },
          { step: 0.5, offsetSec: 0, hit: 'castanet', velocity: 0.8 },
          { step: 1, offsetSec: 0, hit: 'castanet', velocity: 0.9 },
        );
      }
      for (const h of perc) h.velocity *= 0.7 + 0.3 * dyn;
      voices.push({ voice: 'percussion', notes: [], perc: humanizePerc(perc, meter, this.rng) });
    }

    if (has('guitar')) {
      const strums = strumPattern(meter, state.energy).map((s) => ({
        ...s,
        velocity: s.velocity * (0.6 + 0.4 * dyn),
      }));
      if (state.joining.has('guitar')) strums.push({ step: 0.5, direction: 'up', velocity: 0.8 });
      voices.push({ voice: 'guitar', notes: [], strums });
    }

    if (has('violin')) {
      const notes =
        lead === 'violin' ? leadNotes : this.sustainedHarmony(leadNotes, bar, mode, REGISTERS.violin);
      voices.push({ voice: 'violin', notes: this.finish(notes, bar, dyn) });
    }

    if (has('clarinet')) {
      const notes =
        lead === 'clarinet' ? leadNotes : this.sustainedHarmony(leadNotes, bar, mode, REGISTERS.clarinet);
      voices.push({ voice: 'clarinet', notes: this.finish(notes, bar, dyn) });
    }

    return { bar, voices, bpm };
  }

  /** The non-leading melodic instrument holds a chord tone under the lead on strong steps. */
  private sustainedHarmony(
    lead: readonly NoteEvent[],
    bar: Bar,
    mode: Phrase['mode'],
    register: { low: number; high: number },
  ): NoteEvent[] {
    const out: NoteEvent[] = [];
    for (const step of bar.meter.accents) {
      const anchor = lead.find((n) => n.step === step) ?? lead[0];
      if (!anchor) continue;
      let midi = stepInMode(mode, anchor.midi, -2);
      // Prefer a chord tone; drop to the sixth below if the third is not one
      if (!bar.chord.tones.some((t) => (t - midi) % 12 === 0)) midi = stepInMode(mode, anchor.midi, -5);
      midi = intoRange(midi, register.low, register.high);
      const g = bar.meter.accents.indexOf(step);
      out.push({ step, offsetSec: 0, midi, durSteps: bar.meter.groups[g], velocity: 0.5 });
    }
    return out;
  }

  /** A quick ascending run into the downbeat when a melodic instrument joins. */
  private addLeadFill(notes: NoteEvent[], bar: Bar, mode: Phrase['mode'], lead: 'violin' | 'clarinet'): void {
    const first = notes[0];
    if (!first) return;
    if (lead === 'clarinet') {
      first.ornament = 'krekhts';
      return;
    }
    let midi = first.midi;
    for (let i = 4; i >= 1; i--) {
      midi = stepInMode(mode, midi, -1);
      notes.push({ step: -i * 0.25, offsetSec: 0, midi, durSteps: 0.25, velocity: 0.5 + (4 - i) * 0.1 });
    }
    void bar;
  }

  /** Two sixteenth approach notes sliding up into the root when the bass joins. */
  private addBassFill(notes: NoteEvent[], bar: Bar, mode: Phrase['mode']): void {
    const root = notes[0]?.midi;
    if (root === undefined) return;
    notes.push(
      { step: -0.5, offsetSec: 0, midi: stepInMode(mode, root, -2), durSteps: 0.25, velocity: 0.6 },
      { step: -0.25, offsetSec: 0, midi: stepInMode(mode, root, -1), durSteps: 0.25, velocity: 0.7 },
    );
    void bar;
  }

  private finish(notes: NoteEvent[], bar: Bar, dyn: number): NoteEvent[] {
    humanizeNotes(notes, bar.meter, this.rng, true);
    for (const n of notes) n.velocity = Math.max(0.05, Math.min(1, n.velocity * (0.55 + 0.45 * dyn)));
    return notes;
  }
}

/** Drops weak-step notes at random until roughly `keep` of the bar remains. */
function thinTo(notes: NoteEvent[], keep: number, rng: Rng): void {
  for (let i = notes.length - 1; i >= 0; i--) {
    if (notes[i].step !== 0 && rng.next() > keep) notes.splice(i, 1);
  }
}

export type { PercEvent };
