# Level design

All gameplay geometry lives in `src/level.js` inside `buildLevel()`. Coordinates are `(s, y)`:
distance along the road and height. The helpers add the route offset for you.

## Building blocks

```js
ground(s0, s1, y, mat)                 // solid ground from y-40 up to y
plat(s0, s1, y, mat, thickness, extra) // a platform whose top is at y
oneway(s0, s1, y)                      // jump up through, land on top
mplat(s0, s1, y, ds, dy, period)       // moving platform
collapse(s0, s1, y, pieces)            // planks that fall when stood on
slope(s0, s1, yStart, yEnd)
water(s0, s1, y0, y1)
vine(s, y, length) · bouncer(s, y, power) · grapple(s, y) · updraft(s0, s1, y0, y1)
glim(s, y) · line(...) · arc(...) · ring(...)   // collectibles
enemy(kind, s, y, range)              // snapjaw, spikeback, buzzmoth, jelly, eel
checkpoint(s, y) · portal(s, y, toS, toY, kind)
theme(s, index, name, subtitle)       // switches biome + shows the area banner
hint(s0, s1, text, cond, y0, y1)      // a tip shown once inside an s-range AND height band
cam(s0, s1, { dist, height, fov })    // camera zone
```

`extra` on solids can make them special, for example `{ crack: 'beast' }` (Brom's roll or
Grumbo's charge breaks it), `{ crack: 'pound' }` (any ground pound breaks it),
`{ crack: 'fire' }` (an Ember shot), `{ crack: 'swim' }` (a Tide Form dash) and
`{ crack: 'song' }` (the Lumen Song).

> Tip: hints check height too. Give hints in the deep or sky worlds their own `y0`/`y1` band so
> they never pop up on the main road above or below.

## Hero vaults

`vault(kind, s, y, mat)` carves a secret room under a flat stretch of ground:
- `'pound'`: a cracked floor; any ground pound drops you in.
- `'pip'`: a shaft with a tunnel too low for anyone but Pip.
- `'brom'`: a shaft walled off by a cracked wall only Brom's roll can smash.

Every vault gets glims inside, a bounce flower so nobody gets stuck, and a floating prompt.
Add a matching entry to `SECRETS` in `main.js` so finding it counts as a secret.

## Levels on the world map

The map's level list is `LEVELS` in `src/map.js`: start position, end, boss, theme and map
position. Seed Coins per level are in `COINS` in `src/extras.js` (three each; they also grow
the Grove).

## Checking your work

```bash
npm run build && npm run preview
# then open http://localhost:4173/?autostart&level=rootwild
```

In the browser console, `__game.player.reset(s + 80, y)` teleports, and
`__game.stepSim(1, { right: true })` simulates a second of holding right.
