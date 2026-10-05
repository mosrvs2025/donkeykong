// Automated gameplay checks. Builds are served with Vite's preview server and driven headlessly
// through `window.__game.stepSim`, which advances the physics deterministically.
// Usage: npm test   (needs Playwright, see tests/README.md)
import { preview } from 'vite';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { try { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); } catch { console.error('Playwright not found. Run: npm i -D playwright && npx playwright install chromium'); process.exit(1); } }

const server = await preview({ preview: { port: 4174, strictPort: false }, logLevel: 'silent' });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${info ? `  (${info})` : ''}`); if (!ok) failed++; };

async function level(id, fn, arg) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${url}?autostart&level=${id}`); await page.waitForFunction(() => window.__game?.state === 'play', null, { timeout: 30000 });
  const out = await page.evaluate(fn, arg); await page.close(); return { ...out, errors };
}
const setup = 'const g = __game, pl = g.player; g.introT = 0; g.director.script = null; g.evoAll = true;';

// movement: dash, wall cling
{ const r = await level('rootwild', new Function(`${setup}
  pl.reset(10 + 80, 0.05); g.stepSim(0.3, {}); const s0 = pl.s; g.stepSim(0.25, { right: true }, ['dash']); const dash = pl.s - s0;
  return { dash };`));
  check('Sprout Dash moves the hero forward', r.dash > 3, `moved ${r.dash.toFixed(1)}`); check('no page errors (movement)', !r.errors.length, r.errors[0]); }

// ground pound with ↓ for every hero
{ const r = await level('rootwild', new Function(`${setup} const out = {};
  for (const h of ['kiri', 'pip', 'brom']) { pl.setHero(h, false); pl.reset(10 + 80, 0.05); g.stepSim(0.3, {}); g.stepSim(0.25, { jump: true }, ['jump']); g.stepSim(0.02, {}, ['down']); out[h] = pl.slamming && pl.vy < -20; }
  return out;`));
  for (const h of ['kiri', 'pip', 'brom']) check(`ground pound on ↓ (${h})`, r[h]); }

// hero vaults: the cracked floor gives way; only Pip fits the tunnel; Kiri bounces back out
{ const r = await level('rootwild', new Function(`${setup} const out = {};
  const v = g.level.vaults.find((x) => x.kind === 'pound' && x.s0 === 203 + 80);
  pl.setHero('kiri', false); pl.reset(v.cs, v.y + 0.05); g.stepSim(0.3, {}); g.stepSim(0.2, { jump: true }, ['jump']); g.stepSim(0.05, {}, ['down']); g.stepSim(1.5, {}); out.inside = Math.abs(pl.y - v.y0) < 0.3;
  for (let i = 0; i < 30; i++) g.stepSim(0.05, i < 8 || i > 12 ? { left: true } : {}); out.out = pl.y >= v.y - 0.1;
  const t = g.level.vaults.find((x) => x.kind === 'pip' && x.s0 === 147 + 80);
  for (const h of ['kiri', 'pip']) { pl.setHero(h, false); pl.reset(t.s0 + 3.3, t.y0 + 0.1); g.stepSim(0.3, {}); g.stepSim(1.2, { right: true }); out[h] = pl.s - t.s0; }
  return out;`));
  check('cracked floor: pounding drops into the vault', r.inside); check('bounce flower gets you back out', r.out);
  check('tiny tunnel blocks Kiri', r.kiri < 4.5, r.kiri?.toFixed(1)); check('tiny tunnel lets Pip through', r.pip > 7, r.pip?.toFixed(1)); }

// combos pay out; supers knock out nearby critters
{ const r = await level('rootwild', new Function(`${setup} const C = g.combo, out = {};
  for (let i = 0; i < 11; i++) g.magic.chainEvent(); out.rank = C.rank; const gl = g.stats.glims; g.stepSim(2.6, {}); out.paid = g.stats.glims - gl;
  pl.reset(56 + 80, 1.7); g.stepSim(0.3, {}); const near = () => g.entities.enemies.filter((e) => e.alive && Math.hypot(e.s - pl.s, e.y - pl.y) < 14).length;
  out.before = near(); C.meter = 100; C.trySuper(); g.stepSim(1.5, {}); out.after = near(); return out;`));
  check('combo ranks up to AWESOME', r.rank >= 2); check('combo pays out glims', r.paid > 0, `+${r.paid}`); check('Sunburst clears nearby critters', r.after < r.before || r.before === 0, `${r.before} → ${r.after}`); }

// every guardian's enraged attack fires without errors
{ const r = await level('rootwild', new Function(`${setup} const out = {};
  for (const id of ['bramble', 'crawler', 'skyreaver', 'warden', 'angler', 'heron']) { const A = g.level.arenas[id]; pl.reset(A.s - 6, A.y + (id === 'heron' ? 6 : id === 'angler' ? 3 : 0.1));
    g.bosses.start(id); const B = g.bosses.active; B.set('fight'); B.hp = 1; B.rage = true; let n = 0;
    for (let i = 0; i < 90; i++) { pl.invuln = 999; g.stepSim(0.1, {}); if (!g.bosses.active) break; n = Math.max(n, B.projectiles.length + (B.bolts?.length || 0)); }
    out[id] = n; g.bosses.end(false); }
  return out;`));
  for (const id of ['bramble', 'crawler', 'skyreaver', 'warden', 'angler', 'heron']) check(`enraged attack: ${id}`, r[id] > 0);
  check('no page errors (bosses)', !r.errors.length, r.errors[0]); }

await browser.close(); await new Promise((res) => server.httpServer.close(res));
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed ✓');
process.exit(failed ? 1 : 0);
