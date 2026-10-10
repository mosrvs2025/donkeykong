// The world map: an illustrated chart of Thornwild. Kiri walks between levels along
// paths; branches lead to optional worlds. Progress is shown on every node.
const O = 80;
export const LEVELS = [
  { id: 'rootwild', name: 'The Rootwild', sub: 'where the old roads sleep', start: [4, 0], end: 264, endY: 3, wall: -50, boss: 'bramble', theme: 0, at: [120, 470] },
  { id: 'thornwell', name: 'The Thornwell', sub: 'down where the roots drink', start: [42, -599.9], end: 210, endY: -719, wall: 30, theme: 10, at: [205, 525], optional: true, mode: null, deep: true },
  { id: 'canopy', name: 'Canopy of Hands', sub: 'a thousand-year-old grove', start: [266, 3.1], end: 535, endY: 17, wall: 262, boss: 'skyreaver', theme: 1, at: [250, 380] },
  { id: 'skyward', name: 'Skyward Isles', sub: 'a world with no ground', start: [205, 803], end: 905, wall: 190, boss: 'heron', mode: 'fly', theme: 9, at: [300, 175], optional: true, grants: 'sky' },
  { id: 'ruins', name: 'The Weeping Ruins', sub: 'the river remembers', start: [578, 2.1], end: 852, endY: 21.4, wall: 575, boss: 'warden', theme: 2, at: [400, 430] },
  { id: 'sunken', name: 'The Sunken Sanctum', sub: 'the ruins go deeper than the river', start: [300, -410], end: 772, wall: 286, boss: 'angler', mode: 'swim', theme: 8, at: [470, 560], optional: true, grants: 'tide' },
  { id: 'glowdeep', name: 'The Glowdeep', sub: 'something vast is breathing', start: [895, -4.9], end: 1050, endY: -5, wall: 890, boss: 'hollowjaw', theme: 3, at: [560, 360] },
  { id: 'mine', name: 'Sunwright Mine', sub: 'hold on tight', start: [1062, -4.9], end: 1362, endY: -20, wall: 1058, boss: 'crawler', theme: 4, at: [690, 440] },
  { id: 'heart', name: 'Heart of the Seed', sub: 'the end of the road', start: [1366, -19.9], end: null, wall: 1362, theme: 5, at: [820, 300] },
];
export const LINKS = [['rootwild', 'canopy'], ['rootwild', 'thornwell'], ['canopy', 'skyward'], ['canopy', 'ruins'], ['ruins', 'sunken'], ['ruins', 'glowdeep'], ['glowdeep', 'mine'], ['mine', 'heart']];
const UNLOCKS = { rootwild: ['canopy', 'thornwell'], canopy: ['ruins', 'skyward'], ruins: ['glowdeep', 'sunken'], glowdeep: ['mine'], mine: ['heart'] };
export const levelById = (id) => LEVELS.find((l) => l.id === id);

export class WorldMap {
  constructor(game) {
    this.game = game; this.el = document.getElementById('map');
    this.cur = 'rootwild'; this.buddy = null; this.moving = null;
    // touch: drag pans the island, a quick flick walks toward the next level that way, pinch zooms, tap picks
    const ptrs = new Map(); let g0 = null, pinch0 = 0;
    this.el.addEventListener('pointerdown', (e) => {
      const edge = e.target.closest('[data-edge]'); if (edge) { e.preventDefault(); this.tapNode(edge.dataset.edge); return; }
      if (!e.target.closest('button,[data-act],.mp-card') && this.game.map3d) { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.el.setPointerCapture?.(e.pointerId);
        if (ptrs.size === 1) g0 = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, ly: e.clientY, moved: 0 };
        if (ptrs.size === 2) { const [a, b2] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b2.x, a.y - b2.y); g0 = null; } }
      const b = e.target.closest('[data-act]'); if (b) { e.preventDefault(); if (b.dataset.act === 'buddy') this.cycleBuddy(); if (b.dataset.act === 'go') this.play(); if (b.dataset.act === 'shop') this.game.extras.openShop(); if (b.dataset.act === 'daily') this.game.daily.open(); if (b.dataset.act === 'grove') this.game.grove.open(); }
    });
    this.el.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); const M3 = this.game.map3d;
      if (ptrs.size === 2) { const [a, b2] = [...ptrs.values()], d = Math.hypot(a.x - b2.x, a.y - b2.y); if (pinch0 && d) M3.zoomBy(pinch0 / d); pinch0 = d; return; }
      if (g0) { const dx = e.clientX - g0.lx, dy = e.clientY - g0.ly; g0.moved += Math.hypot(dx, dy); g0.lx = e.clientX; g0.ly = e.clientY; if (g0.moved > 12 && performance.now() - g0.t > 120) M3.panBy(dx, dy); }
    });
    const up = (e) => {
      if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); if (ptrs.size) return; pinch0 = 0;
      const g = g0; g0 = null; if (!g) return;
      const dx = e.clientX - g.x, dy = e.clientY - g.y, dt = performance.now() - g.t, d = Math.hypot(dx, dy);
      if (g.moved < 12) { const id = this.game.map3d.pick(e.clientX, e.clientY); if (id) this.tapNode(id); return; }
      if (dt < 280 && d > 50) { this.game.map3d.unpan(); this.key(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp')); }
    };
    this.el.addEventListener('pointerup', up); this.el.addEventListener('pointercancel', up);
    this.el.addEventListener('wheel', (e) => { if (this.open) { e.preventDefault(); this.game.map3d.zoomBy(e.deltaY > 0 ? 1.1 : 0.9); } }, { passive: false });
  }
  progress() { return this.game.progress; }
  unlocked(id) { return this.progress().unlocked.includes(id); }
  unlock(id) { for (const n of UNLOCKS[id] || []) if (!this.unlocked(n)) { this.progress().unlocked.push(n); this.justUnlocked = n; (this.reveals ||= []).push([id, n]); } }
  neighbors(id) { return LINKS.filter((l) => l.includes(id)).map((l) => (l[0] === id ? l[1] : l[0])).filter((n) => this.unlocked(n)); }
  show() {
    this.el.classList.remove('hidden'); this.open = true;
    if (this.progress().levels.rootwild?.clear && !this.unlocked('thornwell')) { this.progress().unlocked.push('thornwell'); this.justUnlocked = 'thornwell'; (this.reveals ||= []).push(['rootwild', 'thornwell']); }
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
    if (id === this.cur) return this.play();
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
    this.game.map3d.unpan();
    this.moving = route; this.game.audio.play('notice');
    this.game.map3d.travel(this.cur, route, (id) => { this.cur = id; this.game.audio.play('glim', 2); this.render(); }, () => { this.moving = null; });
  }
  key(code) {
    if (this.pick?.classList.contains('on')) return;
    if (!this.open || this.moving) return;
    const here = levelById(this.cur);
    const dirs = { ArrowRight: [1, 0], KeyD: [1, 0], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] };
    if (dirs[code]) {
      const [dx, dy] = dirs[code]; let best = null, bs = 0.3;
      for (const n of this.neighbors(this.cur)) { const t = levelById(n); const vx = t.at[0] - here.at[0], vy = t.at[1] - here.at[1], l = Math.hypot(vx, vy); const sc = (vx * dx + vy * dy) / l; if (sc > bs) { bs = sc; best = n; } }
      if (best) this.walk([best]);
    }
    if (code === 'Space' || code === 'Enter' || code === 'KeyZ') this.play();
    if (code === 'KeyC' || code === 'KeyX' || code === 'ShiftLeft') this.cycleBuddy();
    if (code === 'KeyV' || code === 'KeyB') this.game.extras.openShop();
  }
  // Play: if you've been here before, choose where to portal back in
  play() {
    if (!this.unlocked(this.cur)) return;
    const lv = levelById(this.cur), st = this.progress().levels[lv.id] || {}, beacons = (st.beacons || []).slice().sort((a, b) => a.s - b.s);
    if (!st.resume && !beacons.length) return this.enter();
    const g = this.game, el = (this.pick ||= Object.assign(document.createElement('div'), { id: 'portal-pick' })); document.body.appendChild(el);
    const opts = [];
    if (st.resume) opts.push({ label: '▶ Continue where you left off', sub: st.resume.buddy ? `with ${{ beast: 'Grumbo', frog: 'Boing', fish: 'Nuu', oru: 'Oru' }[st.resume.buddy] || 'your friend'}` : '', at: st.resume });
    beacons.forEach((b, i) => opts.push({ label: `⚑ Beacon ${i + 1}`, sub: `${Math.max(0, Math.min(100, Math.round(((b.s - (lv.start[0] + 80)) / Math.max(1, (lv.end ?? lv.start[0] + 300) - lv.start[0])) * 100)))}% of the way`, at: { s: b.s, y: b.y } }));
    opts.push({ label: '↺ Start of the level', sub: '', at: null });
    el.innerHTML = `<div class="pp-card"><div class="pp-kick">PORTAL INTO</div><h2>${lv.name}</h2><div class="pp-list">${opts.map((o, i) => `<button class="${i ? 'ghost' : ''}" data-pp="${i}"><b>${o.label}</b>${o.sub ? `<small>${o.sub}</small>` : ''}</button>`).join('')}</div><button class="ghost small pp-x" data-pp="x">Back</button></div>`;
    el.classList.add('on'); g.audio.play('notice'); el.querySelector('[data-pp="0"]').focus({ preventScroll: true });
    const close = () => { el.classList.remove('on'); removeEventListener('keydown', key, true); };
    const go = (i) => { close(); const o = opts[i]; this.hide(); g.enterLevel(lv, this.buddy, o.at); };
    const key = (e) => { if (e.code === 'Escape') { e.stopPropagation(); close(); } };
    addEventListener('keydown', key, true);
    el.querySelectorAll('[data-pp]').forEach((b) => b.onclick = () => (b.dataset.pp === 'x' ? close() : go(+b.dataset.pp)));
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
        <div class="mp-kicker">${here.optional ? (here.deep ? 'secret depths' : here.mode === 'swim' ? 'underwater world' : 'sky world') : 'world ' + (LEVELS.filter((l) => !l.optional).indexOf(here) + 1)}</div>
        <h2>${here.name}</h2><p class="mp-sub">${here.sub}</p>
        <div class="mp-row"><span class="mp-coins">${'<i class="on">◉</i>'.repeat(cn)}${'<i>○</i>'.repeat(3 - cn)}</span>${md ? `<span>${md}</span>` : ''}${best ? `<span class="mp-best">⏱ ${best}</span>` : ''}</div>
        <div class="mp-found">${g.seeker ? g.seeker.line(here.id) : ''}</div>
        <div class="mp-tags">${st.clear ? '<b class="t ok">✓ cleared</b>' : '<b class="t new">new!</b>'}${here.boss ? (st.boss ? '<b class="t crown">♛ guardian defeated</b>' : '<b class="t boss">♛ guardian awaits</b>') : ''}</div>
      </div>
      <div class="mp-top"><span>✦ ${g.stats.glims}</span><span>◉ ${g.extras ? g.extras.coinCount : 0}</span><span>⚑ ${doneCount}/${LEVELS.length}</span></div>
      <div class="mp-foot">
        <button data-act="buddy" class="alt small">Bring: ${this.buddy ? names[this.buddy] : 'nobody'}</button>
        <button data-act="grove" class="ghost small ${g.grove?.hasNew() ? 'fresh dl-btn' : ''}">🏡 Grove${g.grove?.hasNew() ? ' ✨' : ''}</button>
        <button data-act="shop" class="ghost small">Pim’s Stall</button>
        <button data-act="daily" class="ghost small dl-btn ${g.daily && !g.daily.doneToday() ? 'fresh' : ''}">★ Daily${g.daily && g.daily.streakNow() ? ` 🔥${g.daily.streakNow()}` : ''}</button>
        <button data-act="go">Play ▸</button>
      </div>
      <p class="map-help">${g.input.isTouch ? 'Tap a flag · drag to look around · flick to walk · pinch to zoom' : '←→↑↓ walk · Space play · C companion · B shop'}</p>`;
    g.map3d.refresh(this);
  }
}
