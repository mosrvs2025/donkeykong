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
      const n = e.target.closest('[data-node]'); if (n) { e.preventDefault(); this.tapNode(n.dataset.node); }
      const b = e.target.closest('[data-act]'); if (b) { e.preventDefault(); if (b.dataset.act === 'buddy') this.cycleBuddy(); if (b.dataset.act === 'go') this.enter(); if (b.dataset.act === 'shop') this.game.extras.openShop(); }
    });
  }
  progress() { return this.game.progress; }
  unlocked(id) { return this.progress().unlocked.includes(id); }
  unlock(id) { for (const n of UNLOCKS[id] || []) if (!this.unlocked(n)) { this.progress().unlocked.push(n); this.justUnlocked = n; } }
  neighbors(id) { return LINKS.filter((l) => l.includes(id)).map((l) => (l[0] === id ? l[1] : l[0])).filter((n) => this.unlocked(n)); }
  show() {
    this.el.classList.remove('hidden'); this.open = true; this.render();
    if (this.justUnlocked) { const n = levelById(this.justUnlocked); setTimeout(() => this.game.hud.toast(`New path: <b>${n.name}</b>${n.optional ? ' (optional)' : ''}`, 3), 400); this.justUnlocked = null; }
  }
  hide() { this.el.classList.add('hidden'); this.open = false; }
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
  walk(route) { this.moving = route; this.step(); }
  step() {
    if (!this.moving || !this.moving.length) { this.moving = null; return; }
    this.cur = this.moving.shift(); this.game.audio.play('glim', 2); this.render();
    setTimeout(() => this.step(), 220);
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
    const lines = LINKS.map(([a, b]) => { const A = levelById(a).at, B = levelById(b).at, open = this.unlocked(a) && this.unlocked(b); const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2 - 30; return `<path d="M${A[0]} ${A[1]} Q${mx} ${my} ${B[0]} ${B[1]}" class="mp ${open ? 'open' : ''} ${levelById(b).optional ? 'opt' : ''}"/>`; }).join('');
    const nodes = LEVELS.map((l) => {
      const st = P.levels[l.id] || {}, un = this.unlocked(l.id), here = l.id === this.cur;
      const cls = `mn ${un ? 'un' : ''} ${st.clear ? 'clear' : ''} ${here ? 'here' : ''} ${l.optional ? 'opt' : ''} ${l.mode || ''}`;
      const icon = l.mode === 'swim' ? '≈' : l.mode === 'fly' ? '☁' : l.id === 'heart' ? '✦' : st.clear ? '✓' : '';
      const cn = g.extras ? g.extras.levelCoins(l.id).filter((c) => c.taken).length : 0;
      const md = { gold: '🥇', silver: '🥈', bronze: '🥉' }[st.medal] || '';
      return `<g data-node="${l.id}" class="${cls}" transform="translate(${l.at[0]} ${l.at[1]})"><circle r="30" class="hit"/><circle r="17" class="ring"/><circle r="11" class="core"/><text class="ic" y="4">${icon}</text>${st.boss ? '<text class="crown" y="-24">♛</text>' : ''}${md ? `<text class="medal" x="24" y="-12">${md}</text>` : ''}<text class="nm" y="42">${un ? l.name : '? ? ?'}</text>${un ? `<text class="coins" y="57">${'◉'.repeat(cn)}${'○'.repeat(3 - cn)}</text>` : ''}</g>`;
    }).join('');
    const here = levelById(this.cur), st = P.levels[here.id] || {};
    const kiri = `<g class="kiri" transform="translate(${here.at[0]} ${here.at[1] - 22})"><circle r="8" fill="#e0873a"/><circle cx="3" cy="-2" r="1.6" fill="#111"/><path d="M-7 3 q-9 2 -10 -6" stroke="#f6dcb0" stroke-width="3" fill="none"/></g>`;
    this.el.innerHTML = `<div class="map-inner">
      <div class="map-head"><div class="kicker">Thornwild</div><h2>${here.name}</h2><p class="map-sub">${here.sub}${here.optional ? ' · optional world' : ''}</p>
        <p class="map-stats">${st.clear ? 'cleared' : 'not yet cleared'}${st.boss ? ' · guardian defeated' : ''}${st.best ? ` · best ${Math.floor(st.best / 60)}:${String(Math.floor(st.best % 60)).padStart(2, '0')}` : ''}</p></div>
      <svg viewBox="0 0 940 640" class="map-svg" preserveAspectRatio="xMidYMid meet">
        <defs><radialGradient id="sea" cx="50%" cy="55%" r="70%"><stop offset="0" stop-color="#153a34"/><stop offset="1" stop-color="#050f0d"/></radialGradient></defs>
        <rect width="940" height="640" fill="url(#sea)"/>
        <path class="land" d="M60 520 C40 420 120 330 210 330 C260 250 360 250 430 300 C500 250 620 260 660 320 C740 300 860 250 900 320 C930 420 860 520 760 530 C680 600 520 610 440 590 C340 620 180 610 60 520Z"/>
        <path class="land sky" d="M230 190 C230 150 290 130 330 150 C370 130 420 160 400 200 C390 230 250 230 230 190Z"/>
        <path class="land deep" d="M410 560 C420 530 520 530 540 560 C550 600 420 610 410 560Z"/>
        <g class="deco"><circle cx="820" cy="300" r="60" class="glowseed"/><text x="150" y="560">the Rootwild</text><text x="610" y="560">the old mines</text><text x="250" y="130">above the canopy</text><text x="560" y="625">below the river</text></g>
        ${lines}${nodes}${kiri}
      </svg>
      <div class="map-foot">
        <button data-act="buddy" class="alt small">Bring: ${this.buddy ? names[this.buddy] : 'nobody'}</button>
        <button data-act="shop" class="ghost small">Pim’s Stall · ${g.stats.glims} ✦</button>
        <button data-act="go">Enter ▸</button>
      </div>
      <p class="map-help">${g.input.isTouch ? 'Tap a level to walk there, tap again to enter' : '←→↑↓ walk · Space enter · C companion · B shop'}</p>
    </div>`;
  }
}
