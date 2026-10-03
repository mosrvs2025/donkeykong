import { LEVELS } from './map.js';
// Where is everything? Classifies every collectible by level, counts what's found, and points the
// way to what's still out there (pause menu + world-map card). Some come with a gentle nudge.
const O = 80;
const NUDGE = [
  { s: 1015, y: 56.4, t: 'high inside the Colossus: bring Oru and walk the ceiling' },
  { s: 1030, y: 55.5, t: 'high inside the Colossus: bring Oru and walk the ceiling' },
  { s: 1540, y: 105.6, t: 'at the very top of the final climb' },
  { s: 830, y: 25, t: 'above the Lumen Bloom’s light bridge: touch the bloom, then run' },
  { s: 238, y: -5.6, t: 'deep in the first chasm, near the sleeping hill' },
  { s: 1197, y: -10.2, t: 'over a gap on the cart ride: jump late' },
  { s: 102, y: -614.8, t: 'a hidden alcove high on the bare east wall: climb-kick up it' },
];
export function levelOf(s, y) {
  const ls = s - O;
  if (y > 700) return 'skyward';
  if (y < -520) return 'thornwell';
  if (y < -250) return 'sunken';
  if (y > 150) return null; // hidden worlds (sky shrine, dreaming grove)
  if (y < -100) return null; // the Starwell
  let best = null;
  for (const l of LEVELS) { if (l.optional) continue; const end = l.end ?? 99999; if (ls >= l.wall && ls <= end + 4) best = l.id; }
  return best;
}
export class Seeker {
  constructor(game) { this.game = game; }
  all() {
    const g = this.game, out = [];
    for (const c of g.extras.coins) out.push({ kind: 'coin', name: 'Seed Coin', s: c.s, y: c.y, taken: c.taken, lv: c.lv });
    for (const sh of g.entities.shards) out.push({ kind: 'shard', name: sh.star ? 'Star Shard' : 'Sun Shard', s: sh.s, y: sh.y, taken: !!sh.taken, lv: levelOf(sh.s, sh.y) });
    for (const e of g.magic.echoStones) out.push({ kind: 'echo', name: 'Echo', s: e.s, y: e.y, taken: !!e.taken, lv: levelOf(e.s, e.y) });
    for (const it of out) it.nudge = NUDGE.find((n) => Math.abs(n.s + O - it.s) < 1.5 && Math.abs(n.y - it.y) < 1.5)?.t;
    return out;
  }
  tally(lv) {
    const list = this.all().filter((i) => i.lv === lv), c = (k) => { const a = list.filter((i) => i.kind === k); return a.length ? `${a.filter((i) => i.taken).length}/${a.length}` : null; };
    return { coin: c('coin'), shard: c('shard'), echo: c('echo'), list };
  }
  line(lv) { const t = this.tally(lv), parts = []; if (t.coin) parts.push(`◉ ${t.coin} coins`); if (t.shard) parts.push(`◆ ${t.shard} shards`); if (t.echo) parts.push(`❋ ${t.echo} echoes`); return parts.join(' · '); }
  // pause-menu list for the level being played
  pauseHTML() {
    const g = this.game, lv = g.currentLevel; if (!lv) return '';
    const p = g.player, t = this.tally(lv.id), miss = t.list.filter((i) => !i.taken).sort((a, b) => Math.hypot(a.s - p.s, a.y - p.y) - Math.hypot(b.s - p.s, b.y - p.y));
    const ic = { coin: '◉', shard: '◆', echo: '❋' };
    const rows = miss.map((i) => { const ds = i.s - p.s, dy = i.y - p.y, d = Math.round(Math.hypot(ds, dy));
      const dir = `${Math.abs(ds) > 2 ? (ds > 0 ? '→' : '←') : ''}${Math.abs(dy) > 2 ? (dy > 0 ? '↑' : '↓') : ''}` || '•';
      return `<li><b>${ic[i.kind]} ${i.name}</b> <span class="sk-dir">${dir} ${d}m</span>${i.nudge ? `<small>${i.nudge}</small>` : ''}</li>`; }).join('');
    return `<div class="seek"><div class="sk-head">${lv.name}: ${this.line(lv.id) || 'nothing to collect'}</div>${miss.length ? `<ul>${rows}</ul>` : '<p class="sk-done">Everything here is found ✦</p>'}</div>`;
  }
}
