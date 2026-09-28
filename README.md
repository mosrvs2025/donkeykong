# Thornwild: The Lumen Seed

An original 2.5D cinematic jungle platformer built with Three.js. You play **Kiri**, a ring-tailed tinkerer, on one continuous journey through six connected biomes to find the Lumen Seed of the vanished Sunwright civilization.

```bash
npm install
npm run dev      # local development
npm run build    # production build to dist/ (Vercel-ready, see vercel.json)
```

## Controls
| Keyboard | Action |
|---|---|
| ← → / A D | run |
| Space (hold = higher) | jump |
| Shift / X | roll on the ground · slam in the air · companion ability |
| ↑ ↓ | swim / climb vines |
| ↓ + Shift | hop off a companion |
| M / P | mute / pause |

On touch devices, on-screen buttons appear automatically.

## The journey
The Rootwild → Canopy of Hands → The Weeping Ruins → The Glowdeep → Sunwright Mine (cart ride) → Heart of the Seed (boulder chase) → the altar.

**Companions:** Grumbo the Horned Beast (charges, smashes cracked walls), Boing the Tree Frog (huge jumps, wall jumps, tongue grapple), Sola the Gliding Bird (flaps, glides, rides updrafts, but only for a limited time), Nuu the River Otter (fast swimming, a torpedo dash that bursts barriers), and Oru the Ancient (inverts gravity).

**Signature mechanics:** *Echo Totems* (slam one to shift the ruins into a new layout) and *Lumen Blooms* (touch one and a bridge of light grows across a chasm, then fades).

**Collectibles:** glims (every 100 gives you a heart), 5 Sun Shards, a hidden Star Heart, and 7 secret areas.

## Round two: the world beneath the world
- **Awakened abilities**, each found at a Sunwright shrine: **Wisp Leap** (air redirect), **Lumen Song** (hold ↑: reveals ghostwood, opens sealed doors, lulls critters, opens dawnblooms) and **Rootgrip** (cling to and climb glowing moss).
- **Combos with companions**: Grumbo + Leap = Horn Comet (an air-charge that smashes walls). Boing + Leap = a sky-high second jump. Sola + double-tap = Sunflare (a burst that gives her back 3s of stamina). Bounces, vines, grapples and wall kicks all restore the leap, so skilled players can chain for a long time. An on-screen "airborne ×N" counter tracks the chain.
- **Backtracking**: six waystones (↑ to travel), a door at the very start that only the song opens, ghostwood above the canopy, and a mossy root in the Rootwild.
- **Hidden worlds**: *The Starwell*, an underground lake mirroring a star field with a sleeping starwhale, and *The Dreaming Grove*, an eternal moonlit night of giant moon-flowers.
- **Echoes**: 8 lore stones that tell the Sunwrights' story in single lines.
- **Wind Trials**: two ring chains to clear without touching the ground. The rewards are cosmetic: a sunlight scarf and a stardust trail.
- **Set-pieces**: the hill at the bottom of the vine chasm is a sleeping Mossback that wakes and carries you, and Sola catches Kiri when a fall in the canopy would be fatal.
- **Companion personality**: they notice secrets (with a "!"), get nervous around danger, have idle habits, greet you, sing along and celebrate with you.
- **The world wakes**: Sunwright faces, god rays, dawnblooms and the music (a warm pad layer) respond to your progress. A five-note Lumen motif grows more complete with each awakening.

Debug: `?autostart&abilities` grants all three abilities.

## Round three: everything connects
- **The finale is the surprise.** The Lumen Seed was never an object. Taking it wakes a Colossus sleeping beneath the temple. It offers Kiri its palm, and the last act is a climb up its body that uses every ability: moss climbs, song-melted blight, ghostwood, bounce spores, and dodging its other hand as it sweeps across. Companions you've met follow you and wait for you at the top.
- **Three endings.** *The Seed Awakens*, *The World Remembers* (all abilities, 5+ echoes and 2+ bonds make all of Thornwild bloom at dawn), and *Starfall* (find everything). The ending poem is built from the echoes you found. The end screen lists cryptic hints about what's still out there.
- **Hollowjaw** is a lantern serpent in the Glowdeep pit that can't be killed. You can bounce along its back, ram it with Grumbo, avoid it along the ceiling with Oru, or sing it to sleep three times. Once asleep, its body stays behind as a bridge and its light permanently brightens the cave.
- **Companion bonds**: five charms, each claimable only by bringing that companion back to an earlier place. Grumbo's is behind a wall at the very start. Boing's is up the hookblooms above the ghostwood. Sola's is on the highest perch. Nuu's is sealed at the bottom of the Starwell. Oru's is on the mine ceiling. Bonds change the finale: with Boing's bond, hookblooms give a shortcut up the climb, and with Sola's, she catches you if you fall.
- **Mastery**: Comet Leap (roll, jump, then leap) and Lumen Float (hold the song in mid-air) are undocumented. Other additions: bouncing along Hollowjaw's back, a run timer with your best time saved, and **Wisp Mode** after your first clear (start with every ability awake).
- **Fixed**: a scale bug that made the Glowdeep render black.

## Round four: a world map, levels, bosses and new worlds
- **World map**: an illustrated chart of Thornwild. Walk Kiri between levels (arrows or tap), choose which befriended companion to bring along, and enter. Progress, abilities, relics and bosses are saved in the browser.
- **Eight levels**, each ending at an exit. The main route: Rootwild → Canopy → Weeping Ruins → Glowdeep → Sunwright Mine → Heart of the Seed. Optional branches: Skyward Isles (after the Canopy) and the Sunken Sanctum (after the Ruins).
- **A guardian at the end of each area**, each beaten with movement rather than attacks:
  - **Bramble King:** jump its charges; it slams into the wall and flips over, then stomp its belly.
  - **Skyreaver:** watch its shadow; it dives and gets stuck in the ground, then bounce on its head.
  - **Stone Warden:** its hands slam and become platforms; climb them to strike its eye.
  - **Hollowjaw:** sing it to sleep to pass the Glowdeep.
  - **Forge Crawler:** make it crash, dodge falling rocks, then slam its core.
  - **Deep Angler:** dodge its lunge; when it hits the wall its lantern droops, so dash into it.
  - **Storm Heron:** outfly the lightning columns and ram it when it tires.
  - **The Colossus** remains the finale.
- **The Sunken Sanctum** is an underwater world. Kiri gains **Tide Form**: he swims freely and dashes, and currents carry him. It has jellyfish, eels, and a drowned temple. Tide Form stays afterwards, so Kiri can dash through Nuu's seal in the Weeping Ruins himself.
- **Skyward Isles** is a flight world on Sola: steer with ↑↓, flap, dash, ride wind streams and avoid storm clouds. Clearing it evolves Kiri into **Sky Form**, which lets Wisp Leap work twice in mid-air everywhere.
- Waystones and the pause menu return you to the map. Touch players get a pause button.

Debug: `?autostart&level=<id>` starts in a level (rootwild, canopy, skyward, ruins, sunken, glowdeep, mine, heart).

## Round five: presentation, saves, story and co-op
- **Title screen**: an animated 3D backdrop with Continue, New Game, Save Slots, Players (1 or 2), Settings, and How to Play. It supports keyboard, mouse, touch and gamepad.
- **Three save slots** show your current area, levels cleared, echoes, bonds, glims and play time. Slots can be erased. The pause menu adds Save and Save & Quit.
- **Storybook prologue** on a new journey: letterboxed narration over camera shots of Thornwild (skippable). Each chapter opens with its own line of narration the first time you enter.
- **Graphics**: a cinematic finishing pass (colour grading tinted by each area, vignette, film grain, subtle lens fringing), fresnel rim lighting on characters, companions, critters and guardians, and a Low/Medium/High quality setting plus a volume slider and music toggle.
- **Local co-op**: Player 2 is **Lumi**, a wisp who flies freely around Kiri (IJKL + O, or a second gamepad). Lumi collects glims, and her Lumen Pulse stuns critters and pops flyers. Pulsing next to Kiri refreshes Kiri's Wisp Leap and boosts Kiri upward. It also counts as a song for Hollowjaw and wakes nearby ghostwood.
- **Gamepad support**: stick/d-pad to move, A jump, X action, Y hop off, Start pause.

## Round six: the complete package
- **Seed Coins**: three hidden in every level (24 in all), shown under each node on the world map and on the level-clear card.
- **Pim's Travelling Stall** on the world map (press B, or tap the button): spend glims on Heart Containers, the Lumen Compass (points to the nearest Seed Coin), hats and scarf colours. The best items also need Seed Coins. Hats appear on Kiri in-game.
- **Time medals**: gold, silver or bronze per level based on clear time, shown on the map.
- **Photo mode** (F, or from the pause menu): freeze the action, orbit and zoom the camera, and choose Natural, Storybook, Moonlight or Vivid. The HUD hides.
- **Assist options** in Settings: no damage, and a slower game speed.
- **Feel**: nearby glims drift into Kiri, a burst of light when Kiri falls, and a burst when Kiri reforms at a checkpoint.

## Round seven: Root Hollows, mini-games, blocks and power-ups
- **Root Hollows** are glowing hollow stumps hidden in levels, Thornwild's answer to warp pipes. Stand on one and press ↓ to dive into a secret mini-game, then pop back out where you were. There are four: in the Rootwild behind a bramble thicket, in the Canopy by the waystone, on the Weeping Ruins cliff, and in the Glowdeep.
- **Three mini-games in true 3D**, each with a gold target, glim payouts and a saved best score. Your first gold wins the Party Hat.
  - **Glimstorm** (and a night version in the Glowdeep): run and jump around a floating island in full 3D, catching falling glims (gold ones are worth 5) and dodging thorn bombs by their red shadows.
  - **Sky Drop**: freefall through the clouds, steering through rings and around falling rocks, with streak bonuses.
  - **Echo Stones**: four singing standing stones. Watch the song, then repeat it with ←↑→↓, and it grows longer every round.
- **Lumen Blocks**: Sunwright cubes you jump into from below. They hold glims or power-ups.
- **Power-ups** (taking a hit costs the power-up before a heart):
  - **Ember Bloom:** Shift throws bouncing fire seeds that defeat critters and burn thorn thickets.
  - **Frost Lily:** Shift fires frost bolts that freeze critters into ice blocks you can stand on for a few seconds.
  - **Bubble Wisp:** a shield that pops instead of costing a heart.

## Code layout
- `src/level.js`: the whole level as data, in route space (s = distance along the path, y = height)
- `src/path.js`: the curved route through the 3D world
- `src/physics.js`: AABB collision in route space
- `src/player.js`: character controller, companions, vines, cart, swimming, animation
- `src/entities.js`: enemies, collectibles, interactables, the boulder chase
- `src/world.js`: terrain, vegetation, landmarks, sky, and water
- `src/camera.js`: the zone-based camera director and scripted shots
- `src/powerups.js`, `src/minigames.js`: Lumen Blocks, power-ups, Root Hollows and the 3D mini-games
- `src/extras.js`: Seed Coins, shop, hats, medals, compass, photo mode
- `src/menu.js`, `src/story.js`, `src/coop.js`: title menus and save slots, the prologue and chapter lines, local co-op
- `src/map.js`: world map and level definitions
- `src/bosses.js`: the area guardians
- `src/worlds.js`: underwater and sky world decor, currents, storms
- `src/encounters.js`: Hollowjaw and the Colossus finale
- `src/magic.js`: abilities, shrines, waystones, ghostwood, echoes, trials, Mossback, hidden worlds, companion personality
- `src/fx.js`, `src/audio.js`: particles and fully synthesized sound and music

Debug: add `?autostart&s=<distance>&y=<height>` to the URL to start at any point in the level.
