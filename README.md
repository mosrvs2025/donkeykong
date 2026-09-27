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

## Code layout
- `src/level.js`: the whole level as data, in route space (s = distance along the path, y = height)
- `src/path.js`: the curved route through the 3D world
- `src/physics.js`: AABB collision in route space
- `src/player.js`: character controller, companions, vines, cart, swimming, animation
- `src/entities.js`: enemies, collectibles, interactables, the boulder chase
- `src/world.js`: terrain, vegetation, landmarks, sky, and water
- `src/camera.js`: the zone-based camera director and scripted shots
- `src/magic.js`: abilities, shrines, waystones, ghostwood, echoes, trials, Mossback, hidden worlds, companion personality
- `src/fx.js`, `src/audio.js`: particles and fully synthesized sound and music

Debug: add `?autostart&s=<distance>&y=<height>` to the URL to start at any point in the level.
