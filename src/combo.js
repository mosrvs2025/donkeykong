import * as THREE from 'three';

// Combos and supers. Stomps, bounces, kills and boss hits build a combo that ranks up (NICE → LEGENDARY)
// and pays out glims when it ends (2.4s without action). Everything you do also fills the Lumen meter;
// when it's full, unleash your hero's super: Kiri's Sunburst, Pip's Acorn Storm, Brom's Earthquake.
const $ = (id) => document.getElementById(id);
const RANKS = [[3, 'NICE', '#bff4ff'], [6, 'GREAT', '#9fffb0'], [10, 'AWESOME', '#ffe060'], [15, 'WILD!', '#ffa040'], [25, 'LEGENDARY', '#ff70d0']];
const SUPERS = {
  kiri: { name: 'SUNBURST', icon: '☀', col: 0xffe080 },
  pip: { name: 'ACORN STORM', icon: '🌰', col: 0xc89050 },
  brom: { name: 'EARTHQUAKE', icon: '⛰', col: 0xffb060 },
};
export class Combo {
  constructor(game) {
    this.game = game; this.n = 0; this.timer = 0; this.rank = -1; this.meter = 0; this.superT = 0; this.best = 0;
    const el = document.createElement('div'); el.id = 'combo'; el.innerHTML = '<b></b><span></span><i></i>'; document.body.appendChild(el); this.el = el;
    const m = document.createElement('div'); m.id = 'lumen'; m.innerHTML = '<div class="lm-bar"><i></i></div><span></span>'; document.getElementById('hud')?.appendChild(m); this.mEl = m;
    const btn = document.createElement('div'); btn.id = 't-super'; btn.className = 'tbtn hidden'; btn.innerHTML = '✸<span>super</span>'; document.getElementById('touch')?.appendChild(btn); this.btn = btn;
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.trySuper(); });
    addEventListener('keydown', (e) => { if ((e.code === 'KeyV' || e.code === 'KeyR') && this.game.state === 'play') this.trySuper(); });
    this.renderMeter();
  }
  get hero() { return this.game.player.hero || 'kiri'; }
  // ── combo events
  event(pts = 1, fill = 3) {
    if (this.game.state !== 'play') return;
    this.n += pts; this.timer = 2.4; this.best = Math.max(this.best, this.n);
    this.fill(fill * (1 + Math.min(this.n, 30) / 15));
    const r = RANKS.reduce((a, x, i) => (this.n >= x[0] ? i : a), -1);
    if (r > this.rank) { this.rank = r; this.rankUp(r); }
    this.render();
  }
  kill() { this.event(1, 7); }
  glim() { this.fill(0.6); }
  rankUp(r) {
    const g = this.game, [, name] = RANKS[r];
    g.audio.play(r >= 3 ? 'shard' : 'checkpoint'); this.el.classList.remove('pop'); void this.el.offsetWidth; this.el.classList.add('pop');
    if (r >= 2) g.fx.burst(g.path.world(g.player.s, g.player.y + 1.5, 0), [0xffe060, 0xffa040, 0xff70d0][r - 2], 30 + r * 10, 8, 0.7, 0.8, 0);
    if (r >= 3) g.shake(0.25);
    this.el.dataset.rank = name;
  }
  end() {
    const g = this.game, n = this.n;
    if (n >= 3) { const bonus = Math.floor(n * (1 + Math.max(0, this.rank) * 0.5)); g.addGlims(bonus, g.path.world(g.player.s, g.player.y + 2, 0)); this.el.querySelector('i').textContent = `+${bonus} ✦`; this.el.classList.add('cash'); setTimeout(() => this.el.classList.remove('cash', 'on'), 1200); }
    else this.el.classList.remove('on');
    this.n = 0; this.rank = -1; this.timer = 0;
  }
  render() {
    if (this.n < 2) return; const R = RANKS[Math.max(0, this.rank)];
    this.el.querySelector('b').textContent = `×${this.n}`; this.el.querySelector('span').textContent = this.rank >= 0 ? R[1] : 'combo';
    this.el.style.setProperty('--rc', this.rank >= 0 ? R[2] : '#ffffff'); this.el.classList.remove('cash'); this.el.querySelector('i').textContent = ''; this.el.classList.add('on');
  }
  // ── Lumen meter
  fill(a) { if (this.superT > 0) return; const was = this.meter >= 100; this.meter = Math.min(100, this.meter + a); if (!was && this.meter >= 100) { this.game.audio.play('bloom'); this.game.hud.toast(`<b>${SUPERS[this.hero].icon} SUPER READY</b> · ${this.game.input.isTouch ? 'tap ✸' : 'press V'}`, 2.4); } this.renderMeter(); }
  renderMeter() {
    const full = this.meter >= 100, S = SUPERS[this.hero] || SUPERS.kiri;
    this.mEl.querySelector('i').style.width = this.meter + '%'; this.mEl.classList.toggle('full', full);
    this.mEl.querySelector('span').textContent = full ? `${S.icon} ${S.name} · ${this.game.input.isTouch ? '✸' : 'V'}` : '';
    this.btn.classList.toggle('hidden', !full);
  }
  trySuper() {
    const g = this.game, p = g.player;
    if (this.meter < 100 || this.superT > 0 || g.state !== 'play' || p.state !== 'normal') return;
    this.meter = 0; this.renderMeter(); this.superT = this.hero === 'pip' ? 3 : 1.2; this.kind = this.hero; this.tick = 0;
    const S = SUPERS[this.kind]; p.invuln = Math.max(p.invuln, this.superT + 1.5);
    g.slowT = 0.5; g.flash(0.5); g.audio.play('win'); g.audio.play('smash');
    g.bosses.card?.('SUPER', S.name, '', 1.4);
    if (this.kind === 'brom') { p.vy = 16; this.quaked = false; } // leap up, then crash down
    if (this.kind === 'kiri') this.burst(14);
  }
  // shared payload: knock out enemies and pull in glims within a radius
  blast(R, col) {
    const g = this.game, p = g.player, E = g.entities;
    for (const e of E.enemies) if (e.alive && Math.hypot(e.s - p.s, e.y - p.y) < R) { E.killEnemy(e, Math.sign(e.s - p.s || 1) * 9, 14); this.event(1, 0); }
    for (const gl of E.glims) if (!gl.taken && Math.hypot(gl.s - p.s, gl.y - p.y) < R) { gl.taken = true; g.collectGlim(gl); }
    const B = g.bosses.active; if (B && B.state !== 'dead' && B.state !== 'intro' && Math.hypot(B.s - p.s, B.y - p.y) < R + 4) { B.flash = 0.6; g.shake(0.5); }
  }
  burst(R) { // Kiri: a ring of sunlight bursting outward
    const g = this.game, p = g.player, f = g.path.frame(p.s), c = g.path.world(p.s, p.y + 1, 0);
    for (let k = 0; k < 3; k++) setTimeout(() => g.fx.ring(c, [0xffe080, 0xffffff, 0xffa040][k], 48, 14 + k * 6, 1, new THREE.Vector3(f.tx, 0, f.tz), new THREE.Vector3(0, 1, 0)), k * 90);
    g.fx.burst(c, 0xfff0a0, 90, 16, 1.1, 1.2, 0); g.shake(0.8); this.blast(R);
  }
  step(h) {
    const g = this.game, p = g.player;
    if (g.input.consume('super')) this.trySuper();
    if (this.timer > 0 && g.state === 'play') { this.timer -= h; if (this.timer <= 0) this.end(); }
    if (p.state === 'dead' && this.n) { this.n = 0; this.rank = -1; this.timer = 0; this.el.classList.remove('on'); }
    if (this.superT <= 0) return;
    this.superT -= h; this.tick += h;
    if (this.kind === 'pip' && this.tick > 0.12) { // Pip: acorns rain all around
      this.tick = 0; const s = p.s + (Math.random() - 0.5) * 24;
      g.fx.burst(g.path.world(s, p.y + 6 + Math.random() * 3, 0), 0xc89050, 6, 3, 0.5, 0.5, -20); g.audio.play('stomp');
      const E = g.entities; for (const e of E.enemies) if (e.alive && Math.abs(e.s - s) < 2.5 && Math.abs(e.y - p.y) < 10) { E.killEnemy(e, 0, 8); this.event(1, 0); }
      for (const gl of E.glims) if (!gl.taken && Math.abs(gl.s - s) < 3 && Math.abs(gl.y - p.y) < 10) { gl.taken = true; g.collectGlim(gl); }
    }
    if (this.kind === 'brom' && !this.quaked && this.tick > 0.35 && (p.grounded || this.tick > 1)) { // Brom: the landing splits the ground
      this.quaked = true; const f = g.path.frame(p.s), c = g.path.world(p.s, p.y + 0.2, 0);
      for (let k = 0; k < 3; k++) g.fx.ring(c, 0xffb060, 50, 12 + k * 8, 1.2, new THREE.Vector3(f.tx, 0, f.tz), new THREE.Vector3(f.nx, 0, f.nz));
      g.fx.burst(c, 0xc8a070, 80, 12, 1, 1, -12); g.shake(1.4); g.audio.play('smash'); this.blast(20);
      for (const o of g.entities.solids) if (o.active && (o.crack === 'beast' || o.crack === 'pound') && Math.abs((o.s0 + o.s1) / 2 - p.s) < 10 && Math.abs(o.y1 - p.y) < 6) g.entities.breakSolid(o);
      for (const t of g.entities.totems) if (Math.abs(t.s - p.s) < 12) g.entities.toggleTotem(t);
    }
    if (this.superT <= 0) this.kind = null;
  }
  update(dt, t) {
    // the meter glows; the hero sparkles while a super is running
    if (this.superT > 0 && Math.random() < dt * 40) { const p = this.game.player; this.game.fx.spawn(this.game.path.world(p.s + (Math.random() - 0.5), p.y + Math.random() * 1.5, 0), new THREE.Vector3(0, 2, 0), SUPERS[this.kind || 'kiri'].col, 0.5, 0.6, 0); }
    if (this._hero !== this.hero) { this._hero = this.hero; this.renderMeter(); }
  }
}
