import * as THREE from 'three';
import { makeHero } from './models.js';
import { store } from './menu.js';
// Ghost runs: every level records your run (10 samples a second, route space). Beat your best and
// it becomes the ghost that races you next time, with a live ahead/behind readout.
const O = 80, DT = 0.1;
const $ = (id) => document.getElementById(id);
export class Ghosts {
  constructor(game) { this.game = game; this.on = store.get('ghostOn') !== '0'; this.model = null; this.rec = null; this.best = null; }
  load(id) { try { return JSON.parse(store.get('ghost.' + id) || 'null'); } catch { return null; } }
  start(lv) {
    this.lv = lv; this.rec = []; this.acc = 0; this.t = 0;
    this.best = this.load(lv.id);
    if (this.model) { this.game.scene.remove(this.model); this.model = null; }
    if (this.best && this.on) {
      const m = makeHero(this.best.hero || 'kiri');
      m.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.32; o.material.depthWrite = false; if (o.material.emissive) { o.material.emissive.setHex(0x60d8ff); o.material.emissiveIntensity = 0.6; } o.castShadow = false; } });
      this.game.scene.add(m); this.model = m;
    }
    $('ghost-chip')?.classList.toggle('hidden', !this.model);
  }
  stop() { if (this.model) { this.game.scene.remove(this.model); this.model = null; } $('ghost-chip')?.classList.add('hidden'); this.rec = null; }
  toggle() { this.on = !this.on; store.set('ghostOn', this.on ? '1' : '0'); if (!this.on) { if (this.model) this.game.scene.remove(this.model); this.model = null; $('ghost-chip')?.classList.add('hidden'); } return this.on; }
  // called on level clear: returns { delta, newGhost } for the results card
  finish(time) {
    const lv = this.lv, prev = this.best; if (!lv || !this.rec) return null;
    const out = { delta: prev ? time - prev.time : null, newGhost: false };
    if (!prev || time < prev.time) { store.set('ghost.' + lv.id, JSON.stringify({ time, hero: this.game.player.hero || 'kiri', d: this.rec })); out.newGhost = true; }
    this.stop(); return out;
  }
  update(dt) {
    const g = this.game, p = g.player; if (!this.rec || g.state !== 'play' || !g.currentLevel) return;
    if (p.state === 'cutscene' && !this.t) return;
    this.t += dt; this.acc += dt;
    if (this.acc >= DT) { this.acc -= DT; this.rec.push([+(p.s - O).toFixed(2), +p.y.toFixed(2), p.facing > 0 ? 1 : 0]); }
    const m = this.model, b = this.best; if (!m || !b) return;
    const d = b.d, f = this.t / DT, i = Math.floor(f);
    if (i >= d.length - 1) { m.visible = false; $('ghost-chip').textContent = 'ghost finished'; return; }
    const a = d[i], c = d[i + 1], k = f - i, s = a[0] + (c[0] - a[0]) * k + O, y = a[1] + (c[1] - a[1]) * k;
    m.visible = Math.abs(y - p.y) < 60; g.path.place(m, s, y, -0.6); if (!a[2]) m.rotation.y += Math.PI;
    const ud = m.userData, run = Math.abs(c[0] - a[0]) / DT;
    ud.legs.forEach((l, j) => l.rotation.z = run > 0.5 ? Math.sin(this.t * 14 + j * Math.PI) * 0.7 : 0);
    const ahead = s - p.s, chip = $('ghost-chip');
    if (Math.abs(y - p.y) < 30) chip.textContent = Math.abs(ahead) < 1.5 ? 'neck and neck with your ghost' : ahead > 0 ? `ghost ahead · ${Math.round(ahead)}m` : `you lead · ${Math.round(-ahead)}m`;
    chip.classList.toggle('lead', ahead < -1.5);
  }
}
