# Architecture

Thornwild is a plain ES-module Three.js game bundled by Vite. There are no asset files:
models, textures, sound effects and music are all generated in code.

## The big idea: route space

The whole adventure is one long curved road (`src/path.js`). Gameplay happens in **route
space** `(s, y)`, where `s` is the distance along the road and `y` is the height. A third
coordinate `d` places scenery in front of or behind the road. `path.world(s, y, d)` turns route
coordinates into a 3D position, and `path.place(obj, s, y, d)` positions and orients an object.

Level data uses `s` with an offset of `O = 80` (level `s = 0` sits on the second control point).

## Main loop (`src/main.js`)

`Game` owns everything. Each frame:
1. Physics runs at a fixed **1/120 s** step (`entities.update`, `player.step`, `bosses.step`, …).
2. Visuals update once per frame (`player.render`, `world.update`, effects, UI).
3. The composer renders: RenderPass → GTAO → Bloom → Output → Cine grade → SMAA.

States: `title`, `map`, `play`, `paused` (the Journal), `story`, `photo`, `mini`, `travel`, `end`, `clash`.
The map, the Grove, mini-games and Seed Clash swap the render pass's scene and camera.

For automated tests, `game.stepSim(seconds, keys, presses)` advances the simulation
deterministically. `window.__game` is exposed for debugging.

## Files

| File | What it does |
|---|---|
| `main.js` | The Game: loop, states, level flow, results card, saving, glue between systems |
| `path.js` | The road curve and route-space ↔ world conversion |
| `physics.js` | Axis-separated AABB collision in route space, moving platforms, slopes |
| `level.js` | **All level data**: ground, platforms, enemies, collectibles, hints, vaults, arenas |
| `world.js` | Builds the visible world from level data: terrain meshes, sky, themes, vegetation, landmarks |
| `entities.js` | Live level objects: enemies, glims, companions in cages, portals, totems, blooms, carts |
| `player.js` | The hero: movement, abilities, heroes (Kiri/Pip/Brom), riding companions, animation |
| `models.js` | Procedural character models (heroes, companions, critters) |
| `bosses.js` | The six guardians: build, fight logic, cinematics, enraged attacks |
| `camera.js` | The "director" camera: follow, zones, cinematic shots, shake |
| `magic.js` | Shrines and abilities, the Lumen Song, waystones, trials, airborne chains, the Starwell |
| `encounters.js` | Big set pieces (Hollowjaw, the finale) |
| `worlds.js` | The Sunken Sanctum and Skyward Isles: decor, currents, storms |
| `thornwell.js` | The Thornwell depths: thorn hazards, cave visuals, foreground fronds |
| `powerups.js` | Lumen Blocks and power-ups (ember, frost, bubble, acorns) |
| `minigames.js` | Root Hollow 3D mini-games |
| `extras.js` | Seed Coins, Pim's Stall / wardrobe (3D try-on), medals, photo mode |
| `skills.js` | The Lumen Tree skills and charm slots |
| `journal.js` | The Zelda-style pause Journal (Quest, Gear, Lumen Tree, Abilities, Team, System) |
| `prompts.js` | Floating "what is this / what to press" callouts above interactive objects |
| `combo.js` | Combo counter, ranks, the Lumen meter and hero supers |
| `daily.js` | The daily challenge and streaks |
| `grove.js` | Kiri's Grove, the home island that grows with Seed Coins |
| `ghost.js` | Ghost race recording and playback |
| `goals.js` | Level goal gates |
| `seeker.js` | Collectible tally per level and "still to find" hints |
| `evolve.js` | Evolutions and hero unlocks, derived from progress |
| `eggs.js` | Easter eggs (shh) |
| `ambience.js` | Butterflies and other ambient life |
| `map.js` / `map3d.js` | World map UI and the 3D island diorama |
| `clash.js` | Seed Clash, the 4-player brawler |
| `coop.js` | Local co-op (Lumi the wisp as player 2) |
| `story.js` | Storybook prologue and chapter lines |
| `audio.js` | Synthesized sound effects and per-area music |
| `fx.js` / `gfx.js` | Particles, image-based lighting, ambient occlusion, contact shadows |
| `textures.js` | Procedural canvas textures |
| `input.js` | Keyboard, gamepad and touch (floating joystick) |
| `menu.js` | Title screen, save slots, settings storage |

## Saving

Saves live in `localStorage` under the `thornwild.` prefix, with three save slots. Progress
(levels, coins, outfits, skills, the daily streak, grove growth) is stored on `game.progress`.
Settings are stored separately and shared by the title menu and the Journal.
