# Tests

`npm test` builds the game, serves it with Vite's preview server, and drives it headlessly with
Playwright through `window.__game.stepSim()` (deterministic physics stepping). It checks:

- movement (Sprout Dash) and ground pound on ↓ for Kiri, Pip and Brom
- hero vaults: pounding through a cracked floor, Pip-only tunnels, bouncing back out
- combos ranking up and paying out, and Kiri's Sunburst super
- every guardian's enraged attack

First-time setup:

```bash
npm i -D playwright
npx playwright install chromium
npm test
```
