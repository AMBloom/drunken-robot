# Project Bible: The Drunken Robot's Journey Home

**Version:** 1.1.0
**Author:** AMBloom
**Target Environment:** Any modern browser | Node.js 22+ for development
**Core Tech Stack:** Vite, Phaser 4, Tone.js, Vanilla TypeScript
**Repository:** `SamReeves/drunken-robot` (canonical), live at https://drunkenrobot.whalegames.net

## 1. Executive Summary & Vision

An interactive web app and immersive music-based art game honoring the style and personality of gypsy folk musician Melinda West. The player guides a misanthropic but lovable clockwork robot, recently kicked out of a tavern, on a drunken journey home through eclectic European streets.

The core experience is part generative folk music sandbox, part _Universal Paperclips_ incremental progression, and part side-scrolling platformer. The player curates an interactive musical listening experience unique to every playthrough, where the robot's physical movements are inextricably tied to an evolving, generative Balkan/Romani folk soundtrack.

## 2. Gameplay & Mechanics

- **The Drunken Stagger:** The robot moves with a physics-based, wobbly sway. Movement compresses and expands the accordion strapped to his chest, driving the musical chords.
- **Audio-Driven Actions:** Stumbling triggers syncopated rhythm shifts. Accordion bellows bursts (jumping/dashing) create acoustic shockwaves that interact with the environment.
- **Busking & Incremental Economy:** Strolling past eccentric street patrons (e.g., cats in bowler hats, tavern patrons) yields tips (copper gears/coins). Tips are spent at street corners to tune the accordion or unlock companion instruments.

## 3. Audio Architecture (The Gypsy Folk Engine)

The soundtrack is a hybrid procedural engine utilizing Tone.js to modulate tempo, rhythm, and instrumentation dynamically based on player state.

- **Modal Scales:** D Phrygian Dominant (Spanish Gypsy) and D Harmonic Minor.
- **Dynamic Meters:** Standard walking operates on a 4/4 czárdás rhythm (oom-pah). Stumbling warps the time signature into asymmetrical Balkan meters (7/8 or 9/8).
- **Additive Ensemble:**
- _Accordion:_ Lead melody & bellows swells (unlocked by default).
- _Upright Bass:_ Grounding rhythmic pulse (unlocked via tips/momentum).
- _Castanets/Percussion:_ Polyrhythms for passing hazards.
- _Flamenco Guitar:_ Syncopated comping for crowded zones.
- _Violin:_ Melodic ornamentation for high-multiplier combos.

## 4. Art Direction & Aesthetics

A high-contrast visual juxtaposition of two distinct styles:

- **The Player Layer (Sketchbook Expressionism):** The robot and interactive items (tips, hazards) are drawn with raw, shaky 6B pencil lines on a cream texture. The robot features mismatched scrap metal, a glowing amber vacuum tube eye, and an accordion bound with weathered leather and Melinda's signature red poppy/sunflower motifs.
- **The Environment Layer (Watercolor Impressionism):** Backgrounds are soft, diffused watercolor and ink washes. Smooth gradients, leaning architecture, and rich, saturated colors create a warm, inviting contrast to the chaotic player sprite.

## 5. Narrative Biomes (The 5 Acts)

The robot's journey progresses through five distinct zones, each shifting the visual palette and dominant musical motif.

| Act         | Environment                                                                  | Visual Palette                           | Musical Motif & Audio Shifts                                                   |
| ----------- | ---------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| **Act I**   | **The Tavern Exit:** Steamy windows, rainy cobblestones, discarded tankards. | Deep Amber, Burnt Sienna, Soot Black     | Intimate, raw Czárdás. Rowdy accordion lead, simple kick drum.                 |
| **Act II**  | **The Crooked Canals:** Misty waterways, stone bridges, laundry lines.       | Indigo Blue, Moss Green, Tarnished Brass | Melancholic Klezmer Waltzes (3/4 & 7/8). Flowing upright bass, searing violin. |
| **Act III** | **The Marketplace:** Shuttered stalls, paper lanterns, street cats.          | Crimson, Ochre, Paprika                  | Polyrhythmic Balkan Chaos. Rapid rasgueado (flamenco guitar), castanets.       |
| **Act IV**  | **The Industrial Noir:** Iron frameworks, electric signs, danger.            | Charcoal Black, Deep Violet, Neon Cyan   | Suspenseful Noir-Folk. Dissonant synth chords clash with folk instruments.     |
| **Act V**   | **The Sunrise Overlook:** Chimney smoke, waking songbirds, distant rooftops. | Lavender Mist, Rose Gold, Soft Peach     | Triumphant Full Ensemble. Major key modulation, 180 BPM czárdás finale.        |

## 6. System Architecture Rules

1. **State Independence:** `src/state/store.ts` is the single source of truth.
2. **Decoupled Bridge:** Phaser (graphics) and Tone.js (audio) NEVER directly instantiate each other. They communicate strictly via typed events over an `eventBus` (e.g., `PLAYER_STUMBLE` -> shifts Tone.js meter).
3. **Responsive Scaling:** Phaser canvas uses `Scale.FIT` to support both mobile touch and desktop displays.

## 7. Toolchain & Workspace

- **Engine / Frontend:** Phaser 4, Tone.js 15, Vite 8, TypeScript.
- **Quality:** ESLint (type-checked), Prettier, Vitest (theory, composer, economy, spawner, sway, store), Playwright end-to-end.
- **Art & Audio:** everything is procedural in code; there are no image or sample assets.
- **Version Control & Deploy:** Git on GitHub; `deploy.yml` builds `main` and publishes to the `deploy` branch, served by DigitalOcean App Platform at https://drunkenrobot.whalegames.net.

## 8. Where things live

- `src/audio/theory` modes, chords, meters, progressions; `src/audio/composer` melody, rhythm cells, ornaments, humanization; `src/audio/arrangement` who plays what; `src/audio/scheduling` tick-based bar scheduler; `src/audio/director.ts` game events to music.
- `src/game/balance.ts` every gameplay number; `src/game/systems` seeded RNG, economy, spawner, sway, input; `src/game/art` procedural textures; `src/game/scenes` Boot, Title, Street, Hud, Pause, End.
- `src/state` store and event bus; `src/app` composition root, flags, audio bridge, `?debug=1` studio.

See `README.md` for how to play and how to run it.
