// The world map: an illustrated chart of Thornwild. Kiri walks between levels along
// paths; branches lead to optional worlds. Progress is shown on every node.
const O = 80;
export const LEVELS = [
  { id: 'rootwild', name: 'The Rootwild', sub: 'where the old roads sleep', start: [4, 0], end: 264, endY: 3, wall: -50, boss: 'bramble', theme: 0, at: [120, 470] },
  { id: 'canopy', name: 'Canopy of Hands', sub: 'a thousand-year-old grove', start: [266, 3.1], end: 535, endY: 17, wall: 262, boss: 'skyreaver', theme: 1, at: [250, 380] },
  { id: 'skyward', name: 'Skyward Isles', sub: 'a world with no ground', start: [205, 803], end: 905, wall: 190, boss: 'heron', mode: 'fly', theme: 9, at: [300, 175], optional: true, grants: 'sky' },
  { id: 'ruins', name: 'The Weeping Ruins', sub: 'the river remembers', start: [578, 2.1], end: 852, endY: 21.4, wall: 575, boss: 'warden', theme: 2, at: [400, 430] },
  { id: 'sunken', name: 'The Sunken Sanctum', sub: 'the ruins go deeper than the river', start: [300, -410], end: 772, wall: 286, boss: 'angler', mode: 'swim', theme: 8, at: [470, 560], optional: true, grants: 'tide' },
  { id: 'glowdeep', name: 'The Glowdeep', sub: 'something vast is breathing', start: [895, -4.9], end: 1050, endY: -5, wall: 890, boss: 'hollowjaw', theme: 3, at: [560, 360] },
  { id: 'mine', name: 'Sunwright Mine', sub: 'hold on tight', start: [1062, -4.9], end: 1362, endY: -20, wall: 1058, boss: 'crawler', theme: 4, at: [690, 440] },
  { id: 'heart', name: 'Heart of the Seed', sub: 'the end of the road', start: [1366, -19.9], end: null, wall: 1362, theme: 5, at: [820, 300] },
];
export const LINKS = [['rootwild', 'canopy'], ['canopy', 'skyward'], ['canopy', 'ruins'], ['ruins', 'sunken'], ['ruins', 'glowdeep'], ['glowdeep', 'mine'], ['mine', 'heart']];
const UNLOCKS = { rootwild: ['canopy'], canopy: ['ruins', 'skyward'], ruins: ['glowdeep', 'sunken'], glowdeep: ['mine'], mine: ['heart'] };
export const levelById = (id) => LEVELS.find((l) => l.id === id);

export class WorldMap {
  constructor(game) {
    this.game = game; this.el = document.getElementById('map');
    this.cur = 'rootwild'; this.buddy = null; this.moving = null;
    this.el.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('button') && this.game.map3d) { const id = this.game.map3d.pick(e.clientX, e.clientY); if (id) { e.preventDefault(); this.tapNode(id); } }
      const b = e.target.closest('[data-act]'); if (b) { e.preventDefault(); if (b.dataset.act === 'buddy') this.cycleBuddy(); if (b.dataset.act === 'go') this.enter(); if (b.dataset.act === 'shop') this.game.extras.openShop(); }
    });
  }
  progress() { return this.game.progress; }
  unlocked(id) { return this.progress().unlocked.includes(id); }
  unlock(id) { for (const n of UNLOCKS[id] || []) if (!this.unlocked(n)) { this.progress().unlocked.push(n); this.justUnlocked = n; (this.reveals ||= []).push([id, n]); } }
  neighbors(id) { return LINKS.filter((l) => l.includes(id)).map((l) => (l[0] === id ? l[1] : l[0])).filter((n) => this.unlocked(n)); }
  show() {
    this.el.classList.remove('hidden'); this.open = true;
    const M3 = this.game.map3d; M3.enter(); this.render();
    for (const [a, b] of this.reveals || []) M3.reveal(a, b); this.reveals = [];
    if (this.justUnlocked) { const n = levelById(this.justUnlocked); setTimeout(() => this.game.hud.toast(`New path: <b>${n.name}</b>${n.optional ? ' (optional)' : ''}`, 3), 400); this.justUnlocked = null; }
  }
  hide() { this.el.classList.add('hidden'); this.open = false; this.game.map3d.exit(); }
  buddies() { return ['beast', 'frog', 'bird', 'fish', 'oru'].filter((k) => this.game.stats.met[k]); }
  cycleBuddy() {
    const list = [null, ...this.buddies()]; const i = list.indexOf(this.buddy); this.buddy = list[(i + 1) % list.length];
    this.game.audio.play('notice'); this.render();
  }
  tapNode(id) {
    if (!this.unlocked(id)) { this.game.audio.play('dismount'); return; }
    if (id === this.cur) return this.enter();
    // walk along the graph to the tapped node
    const route = this.route(this.cur, id); if (route) this.walk(route);
  }
  route(a, b) {
    const prev = { [a]: null }, q = [a];
    while (q.length) { const n = q.shift(); if (n === b) break; for (const m of this.neighbors(n)) if (!(m in prev)) { prev[m] = n; q.push(m); } }
    if (!(b in prev)) return null;
    const r = []; for (let n = b; n !== a; n = prev[n]) r.unshift(n); return r;
  }
  walk(route) {
    this.moving = route; this.game.audio.play('notice');
    this.game.map3d.travel(this.cur, route, (id) => { this.cur = id; this.game.audio.play('glim', 2); this.render(); }, () => { this.moving = null; });
  }
  key(code) {
    if (!this.open || this.moving) return;
    const here = levelById(this.cur);
    const dirs = { ArrowRight: [1, 0], KeyD: [1, 0], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] };
    if (dirs[code]) {
      const [dx, dy] = dirs[code]; let best = null, bs = 0.3;
      for (const n of this.neighbors(this.cur)) { const t = levelById(n); const vx = t.at[0] - here.at[0], vy = t.at[1] - here.at[1], l = Math.hypot(vx, vy); const sc = (vx * dx + vy * dy) / l; if (sc > bs) { bs = sc; best = n; } }
      if (best) this.walk([best]);
    }
    if (code === 'Space' || code === 'Enter' || code === 'KeyZ') this.enter();
    if (code === 'KeyC' || code === 'KeyX' || code === 'ShiftLeft') this.cycleBuddy();
    if (code === 'KeyV' || code === 'KeyB') this.game.extras.openShop();
  }
  enter() { if (!this.unlocked(this.cur)) return; this.hide(); this.game.enterLevel(levelById(this.cur), this.buddy); }
  render() {
    const P = this.progress(), g = this.game;
    const names = { beast: 'Grumbo', frog: 'Boing', bird: 'Sola', fish: 'Nuu', oru: 'Oru' };
    const here = levelById(this.cur), st = P.levels[here.id] || {};
    const cn = g.extras ? g.extras.levelCoins(here.id).filter((c) => c.taken).length : 0;
    const md = { gold: '🥇', silver: '🥈', bronze: '🥉' }[st.medal] || '';
    const best = st.best ? `${Math.floor(st.best / 60)}:${String(Math.floor(st.best % 60)).padStart(2, '0')}` : '';
    const doneCount = LEVELS.filter((l) => P.levels[l.id]?.clear).length;
    this.el.innerHTML = `
      <div class="mp-card">
        <div class="mp-kicker">${here.optional ? (here.mode === 'swim' ? 'underwater world' : 'sky world') : 'world ' + (LEVELS.filter((l) => !l.optional).indexOf(here) + 1)}</div>
        <h2>${here.name}</h2><p class="mp-sub">${here.sub}</p>
        <div class="mp-row"><span class="mp-coins">${'<i class="on">◉</i>'.repeat(cn)}${'<i>○</i>'.repeat(3 - cn)}</span>${md ? `<span>${md}</span>` : ''}${best ? `<span class="mp-best">⏱ ${best}</span>` : ''}</div>
        <div class="mp-tags">${st.clear ? '<b class="t ok">✓ cleared</b>' : '<b class="t new">new!</b>'}${here.boss ? (st.boss ? '<b class="t crown">♛ guardian defeated</b>' : '<b class="t boss">♛ guardian awaits</b>') : ''}</div>
      </div>
      <div class="mp-top"><span>✦ ${g.stats.glims}</span><span>◉ ${g.extras ? g.extras.coinCount : 0}</span><span>⚑ ${doneCount}/${LEVELS.length}</span></div>
      <div class="mp-foot">
        <button data-act="buddy" class="alt small">Bring: ${this.buddy ? names[this.buddy] : 'nobody'}</button>
        <button data-act="shop" class="ghost small">Pim’s Stall</button>
        <button data-act="go">Play ▸</button>
      </div>
      <p class="map-help">${g.input.isTouch ? 'Tap a flag to walk there · tap again to play' : '←→↑↓ walk · Space play · C companion · B shop'}</p>`;
    g.map3d.refresh(this);
  }
}
