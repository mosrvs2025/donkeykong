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

## Code layout
- `src/level.js`: the whole level as data, in route space (s = distance along the path, y = height)
- `src/path.js`: the curved route through the 3D world
- `src/physics.js`: AABB collision in route space
- `src/player.js`: character controller, companions, vines, cart, swimming, animation
- `src/entities.js`: enemies, collectibles, interactables, the boulder chase
- `src/world.js`: terrain, vegetation, landmarks, sky, and water
- `src/camera.js`: the zone-based camera director and scripted shots
- `src/fx.js`, `src/audio.js`: particles and fully synthesized sound and music

Debug: add `?autostart&s=<distance>&y=<height>` to the URL to start at any point in the level.
