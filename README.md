# The Drunken Robot's Journey Home 🪗 🤖

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Phaser](https://img.shields.io/badge/Phaser-4-38bdf8?style=for-the-badge)
![Tone.js](https://img.shields.io/badge/Tone.js-15-ff00ff?style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=Vite&logoColor=white)

A music-driven side-scroller honoring the style and personality of gypsy folk musician Melinda West. Guide a misanthropic but lovable clockwork robot, recently kicked out of a tavern, on a drunken, stumbling journey home through misty European streets. The soundtrack is composed live, bar by bar, from what is happening on screen.

**Play it:** https://drunkenrobot.whalegames.net

## 🎮 How to play

- **Balance:** A / D or ← / → counter-steer the robot's sway. The sway is seeded noise, not a rhythm you can memorise, and gusts of wind shove you after a short warning.
- **Accordion jump:** hold SPACE to squeeze the bellows, release to leap crates and puddles. The squeeze is audible.
- **Busking:** collect copper gears for tips and momentum. Momentum decays faster the more you have, so it settles where your collecting puts it. Stumbles cost momentum; crates cost the most.
- **Recruit the band:** each instrument needs cumulative tips _and_ momentum to join, and leaves again if momentum stays low. You start with the solo accordion and can earn the full six-piece band by the end.
- **Power-ups:** sunflower (2× tips and a gear magnet), brandy (steadier legs, half-strength gusts), steam (bigger jumps), shield (absorbs one hazard, stacks with a timed buff).
- **Pause:** P or ESC. Restart from the pause menu with R.
- **Phones:** hold the left or right half of the screen to balance, hold the bellows button to jump. Landscape only.

Runs are seeded. Add `?seed=1234` to the URL to replay a street; the seed shows on the title, HUD, and end screen.

## 🎵 The music engine

Nothing is pre-recorded and nothing is a fixed loop. Each bar is composed one bar ahead:

- **Modes rooted on D:** Freygish (Phrygian dominant) for the tavern, harmonic minor for the canals, Misheberakh for the market, Hungarian minor for the industrial noir, and D major for the sunrise friss.
- **Meters:** 4/4 czárdás, 3/4 waltz, 7/8 in both 3+2+2 and 2+2+3, 9/8 (2+2+2+3), and a 5/8 lurch the band falls into when you stumble.
- **Harmony:** eight-bar progressions with a half cadence at bar 4 and a full cadence at bar 8, chords voiced by least motion.
- **Melody:** chord tones on strong steps, stepwise fills, a motif from bars 1–2 that returns in bars 5–6, mordents, grace notes, and the klezmer krekhts.
- **Arrangement:** the solo accordion plays lead, chords, and left-hand bass; the upright bass, guitar, percussion, violin, and clarinet each take over a role with a fill as they join.
- **Reaction:** momentum sets energy (density, dynamics, ±6% tempo); footsteps are quantised rim hits; the act 5 finale is a hushed lassú, an accelerando, then a full-band friss.

All six instruments are synthesised with Tone.js: dual-reed FM accordion with bellows-driven filtering, Karplus-Strong guitar strings with rasgueado, formant-shaped violin with delayed vibrato and bow noise, pulse-wave clarinet with a chalumeau formant, a plucked upright bass with a finger thump, and a street-percussion kit.

## 🎨 Visuals

Everything is drawn procedurally in code, no image assets: sketchbook-style robot with a pleated accordion and an amber vacuum-tube eye, five watercolor-style parallax biomes, and per-act hazards.

## 🛠️ Development

Requires Node.js 22 (see `.nvmrc`) and npm.

```bash
git clone https://github.com/SamReeves/drunken-robot.git
cd drunken-robot
npm ci
npm run dev          # http://localhost:3000
```

Useful scripts:

```bash
npm run typecheck    # tsc
npm run lint         # eslint
npm run format       # prettier
npm test             # vitest: theory, composer, economy, spawner, sway, store
npm run test:e2e     # playwright: boots the built game headless
npm run build        # typecheck + vite build into dist/
```

Add `?debug=1` to the URL for the audio studio: mixer, transport, meter and mode switches, metronome, and an accordion keyboard. Toggle it with the backtick key.

### Layout

```
src/app        composition root, flags, audio bridge, debug dashboard
src/audio      theory/ composer/ arrangement/ scheduling/ synths/ director.ts
src/game       balance.ts, art/ (procedural textures), scenes/, entities/, systems/
src/state      store and event bus
src/util       seeded RNG
tests/e2e      playwright smoke tests
```

### Deploy

Every push to `main` is built by GitHub Actions and published to the `deploy` branch, which DigitalOcean App Platform serves as a static site.

This repository is a fork of `AMBloom/drunken-robot` where the current round of improvements is being developed and hosted. The work will be offered back upstream as a pull request once it is complete.

## 📜 Credits

- **Original design & engineering:** Andrew Bloom (@AMBloom)
- **Musical inspiration:** Melinda West
- Built with **Phaser 4** and **Tone.js**.
