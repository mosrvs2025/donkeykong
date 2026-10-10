import { levelById } from './map.js';

// Getting around a level: warp between lit beacons (press ↑ at one), relight beacons you've
// already found when you come back, and walk "onward" from a cleared level straight into the next.
const NEXT = { rootwild: 'canopy', canopy: 'ruins', ruins: 'glowdeep', glowdeep: 'mine', mine: 'heart' };
export class LevelNav {
  constructor(game) { this.game = game; this.near = null; }
  beaconsHere() {
    const g = this.game, lv = g.currentLevel; if (!lv) return [];
    return ((g.progress.levels[lv.id] || {}).beacons || []).slice().sort((a, b) => a.s - b.s);
  }
  // light the beacons you've already found in this level (called on entering a level)
  relight() {
    const saved = this.beaconsHere();
    for (const cp of this.game.entities.checkpoints) {
      const on = saved.some((b) => Math.abs(b.s - cp.s) < 1 && Math.abs(b.y - cp.y) < 1);
      cp.on = on; cp.gem.material.emissive.setHex(on ? 0x40ffd0 : 0x000000); cp.gem.material.emissiveIntensity = on ? 2.5 : 1;
    }
  }
  // per physics step: ↑ at a lit beacon opens the warp list (when there's somewhere to go)
  step() {
    const g = this.game, p = g.player, I = g.input;
    this.near = null;
    if (g.state !== 'play' || p.state !== 'normal' || !p.grounded || p.cart || g.bosses.busy) return;
    const cp = g.entities.checkpoints.find((c) => c.on && Math.abs(c.s - p.s) < 1.6 && Math.abs(c.y - p.y) < 3);
    if (cp && this.beaconsHere().length > 1) { this.near = cp; if (I.peek('up') && !g.magic.nearWay) { I.consume('up'); this.open(cp); } }
  }
  open(here) {
    const g = this.game, lv = g.currentLevel, list = this.beaconsHere(), start = lv.start[0] + 80, end = (lv.end ?? lv.start[0] + 300) + 80;
    const el = (this.el ||= Object.assign(document.createElement('div'), { id: 'portal-pick' })); document.body.appendChild(el);
    const pct = (s) => Math.max(0, Math.min(100, Math.round((s - start) / Math.max(1, end - start) * 100)));
    el.innerHTML = `<div class="pp-card"><div class="pp-kick">BEACON WARP</div><h2>${lv.name}</h2><div class="pp-list">${list.map((b, i) => {
      const isHere = Math.abs(b.s - here.s) < 1;
      return `<button class="${isHere ? 'ghost' : ''}" data-bw="${i}" ${isHere ? 'disabled' : ''}><b>⚑ Beacon ${i + 1}${isHere ? ' · you are here' : ''}</b><small>${pct(b.s)}% of the way</small></button>`; }).join('')}</div>
      <button class="ghost small pp-x" data-bw="x">Stay here</button></div>`;
    g.state = 'paused'; el.classList.add('on'); g.audio.play('notice');
    el.querySelector('[data-bw]:not([disabled])')?.focus({ preventScroll: true });
    const close = () => { el.classList.remove('on'); removeEventListener('keydown', key, true); g.state = 'play'; g.last = performance.now(); };
    const key = (e) => { if (e.code === 'Escape') { e.stopPropagation(); close(); } };
    addEventListener('keydown', key, true);
    el.querySelectorAll('[data-bw]').forEach((b) => b.onclick = () => { if (b.dataset.bw === 'x') return close(); close(); this.warp(list[+b.dataset.bw]); });
  }
  warp(b) {
    const g = this.game, p = g.player, from = g.path.world(p.s, p.y + 1, 0);
    g.fx.burst(from, 0x40ffd0, 40, 8, 0.8, 0.8, 0); g.audio.play('portal');
    p.reset(b.s, b.y + 0.1); g.checkpoint = { s: b.s, y: b.y }; p.invuln = Math.max(p.invuln, 1);
    g.snapTheme = true; g.director.update(0.016, p, true); g.flash(0.3);
    g.fx.burst(g.path.world(b.s, b.y + 1.5, 0), 0x40ffd0, 50, 8, 0.8, 1, 0);
  }
  next(lv) { const n = NEXT[lv?.id]; return n && this.game.map.unlocked(n) ? levelById(n) : null; }
  onward(lv) {
    const g = this.game, n = this.next(lv); if (!n) return g.finishClear();
    g.clearOpen = 0; clearTimeout(g._clearT); document.getElementById('clear').classList.remove('on'); g.clearing = false;
    g.leaveToMap(); g.map.cur = n.id; g.map.hide(); g.enterLevel(n, null);
  }
}
