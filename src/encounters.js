import * as THREE from 'three';
import { getTex } from './textures.js';
import { surfMat } from './world.js';

const glow = (c, i = 2) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i });
const O = 80;

// ═════════════════════════════════════════════════════════════════════
// HOLLOWJAW — the lantern serpent of the Glowdeep pit.
// It can't be killed. Bounce along its back, ram it with Grumbo, avoid it
// from the ceiling with Oru, or sing it to sleep three times — then its body
// becomes a bridge and its lanterns light the whole cave forever.
// ═════════════════════════════════════════════════════════════════════
export class Hollowjaw {
  constructor(game) {
    this.game = game; this.cfg = game.level.hollowjaw; this.path = game.path;
    this.N = 20; this.state = 'dormant'; this.tt = 0; this.lulls = 0; this.lullCool = 0; this.stun = 0;
    const skin = new THREE.MeshStandardMaterial({ color: 0x2a1840, roughness: 0.5, emissive: 0x0a0418 });
    const lantern = glow(0x70ffd0, 2.2);
    this.group = new THREE.Group(); game.scene.add(this.group);
    this.segs = [];
    for (let i = 0; i < this.N; i++) {
      const r = i === 0 ? 1.6 : 1.35 - i * 0.045;
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), skin); b.castShadow = true; g.add(b);
      if (i > 0 && i % 2 === 0) { const l = new THREE.Mesh(new THREE.SphereGeometry(r * 0.28, 8, 6), lantern); l.position.set(0, r * 0.75, r * 0.5); g.add(l); }
      if (i > 0) for (const z of [0.5, -0.5]) { const fin = new THREE.Mesh(new THREE.ConeGeometry(r * 0.3, r * 1.2, 4), new THREE.MeshStandardMaterial({ color: 0x5a2a80, emissive: 0x200a30 })); fin.position.set(0, r * 0.9, z * r); fin.rotation.x = z; g.add(fin); }
      this.group.add(g); this.segs.push({ g, r, s: 0, y: -60 });
    }
    // head details
    const head = this.segs[0].g;
    this.jaw = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.8), skin); this.jaw.position.set(1.3, -0.7, 0); head.add(this.jaw);
    this.eyes = [];
    for (const z of [0.8, -0.8]) for (const x of [0.6, 0.2, -0.2]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), glow(0xfff080, 3)); e.position.set(x + 0.5, 0.7, z); head.add(e); this.eyes.push(e); }
    for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 4), new THREE.MeshStandardMaterial({ color: 0xf0f0ff })); t.position.set(0.8 + i * 0.25, -0.35, 0.6 * (i % 2 ? 1 : -1)); t.rotation.z = Math.PI; head.add(t); }
    this.group.visible = false;
    this.bridge = [];
  }
  head(u, dir) { // position along the arc for normalized time u (0..1 visible)
    const c = this.cfg;
    const k = dir > 0 ? u : 1 - u;
    return { s: c.s0 + (c.s1 - c.s0) * k, y: c.base + (c.peak - c.base) * Math.sin(Math.min(1, Math.max(0, u)) * Math.PI) };
  }
  start() {
    const g = this.game;
    this.state = 'hunt'; this.tt = 0; this.group.visible = true;
    g.hud.banner('HOLLOWJAW', 'the pit is not empty', 3.5); g.audio.play('rumble'); g.shake(0.8);
    g.hud.toast('Its lanterns pulse like the Lumen Song…', 4);
    g.audio.intensity = 0.7;
  }
  onSong(ps, py) {
    if (this.state !== 'hunt' || this.lullCool > 0) return;
    const h = this.segs[0];
    if (Math.hypot(h.s - ps, h.y - py) > 14 || h.y < -22) return;
    this.lulls++; this.lullCool = 2.5; this.stun = 1.6;
    const g = this.game;
    g.audio.play('echo'); g.fx.burst(this.path.world(h.s, h.y, 0), 0x70ffd0, 30, 6, 0.7, 1, 0);
    this.eyes.forEach((e, i) => { if (i < this.lulls * 2) e.material = glow(0x303040, 0.3); });
    if (this.lulls >= 3) this.sleep(); else g.hud.toast(['It shivers, and slows…', 'Its eyes grow heavy…'][this.lulls - 1], 2);
  }
  sleep() {
    const g = this.game, c = this.cfg;
    this.state = 'asleep'; g.stats.hollowjaw = true; g.audio.intensity = 0.1;
    g.hud.banner('HOLLOWJAW SLEEPS', 'its lanterns will light the Glowdeep now', 4); g.audio.motif(3); g.magic.quietFor = 5; g.magic.celebrate();
    // lay the body across the pit as a sleeping bridge
    const a = c.s0 + 7, b = c.s1 - 5;
    for (let i = 0; i < this.N; i++) { const k = i / (this.N - 1); this.segs[i].s = b - (b - a) * k; this.segs[i].y = -3.2 + Math.sin(k * Math.PI) * 3.5; }
    for (let i = 0; i < this.N - 1; i++) {
      const s0 = this.segs[i + 1], s1 = this.segs[i];
      const sol = { s0: Math.min(s0.s, s1.s) - 0.2, s1: Math.max(s0.s, s1.s) + 0.2, y0: 0, y1: 0, active: true, oneway: true, dS: 0, dY: 0, mat: 'grass' };
      sol.y1 = (s0.y + s1.y) / 2 + (s0.r + s1.r) / 2 * 0.8; sol.y0 = sol.y1 - 0.5;
      g.entities.solids.push(sol); this.bridge.push(sol);
    }
    g.fx.burst(this.path.world((a + b) / 2, 2, 0), 0x70ffd0, 80, 12, 0.8, 2, 0);
  }
  reset() { if (this.state === 'hunt') { this.state = 'dormant'; this.group.visible = false; this.lulls = 0; this.eyes.forEach((e) => e.material = glow(0xfff080, 3)); } }
  step(h) {
    const g = this.game, p = g.player, c = this.cfg;
    if (this.state === 'dormant') {
      if (p.s > c.s0 - 4 && p.s < c.s1 && p.y > -12 && p.y < 9 && p.state === 'normal') this.start();
      return;
    }
    if (this.state !== 'hunt') return;
    this.lullCool -= h;
    if (this.stun > 0) this.stun -= h; else this.tt += h;
    const P = c.period, cyc = Math.floor(this.tt / P), dir = cyc % 2 ? -1 : 1;
    const u = (this.tt % P) / P / 0.72;
    for (let i = 0; i < this.N; i++) {
      const ui = u - i * 0.022;
      const pos = ui < 0 || ui > 1 ? { s: this.head(ui < 0 ? 0 : 1, dir).s, y: c.base - 10 } : this.head(ui, dir);
      this.segs[i].s = pos.s; this.segs[i].y = pos.y; this.segs[i].dir = dir;
    }
    // collision with Kiri
    if (p.state !== 'normal' || p.invuln > 0) return;
    const pc = p.y + p.h / 2;
    for (let i = 0; i < this.N; i++) {
      const sg = this.segs[i]; if (sg.y < c.base + 2) continue;
      const dx = Math.max(0, Math.abs(sg.s - p.s) - p.hw), dy = Math.max(0, Math.abs(sg.y - pc) - p.h / 2);
      if (Math.hypot(dx, dy) > sg.r) continue;
      if (p.vy < 0 && p.y > sg.y + sg.r * 0.2) { // bounce along its back
        p.vy = g.input.held.jump ? 17 : 12.5; p.leapReady = true; p.slamming = false; p.squash = -0.35; g.magic.chainEvent(); g.audio.play('stomp', g.magic.chain);
        g.fx.burst(this.path.world(sg.s, sg.y + sg.r, 0), 0x70ffd0, 10, 4, 0.5, 0.4, 0);
        if (!g.stats.jawBounce) { g.stats.jawBounce = true; g.hud.toast('It doesn’t seem to mind being a trampoline…', 2.5); }
        return;
      }
      if (i === 0 && p.mount === 'beast' && p.chargeT > 0) { this.stun = 2.5; g.shake(0.8); g.audio.play('smash'); g.hud.toast('<b>Grumbo rams Hollowjaw!</b> It reels, dazed.', 2.5); p.vs = -p.facing * 6; p.chargeT = 0; return; }
      p.hurt('Hollowjaw!'); return;
    }
  }
  update(dt, t) {
    if (!this.group.visible) return;
    const asleep = this.state === 'asleep';
    for (let i = 0; i < this.N; i++) {
      const sg = this.segs[i], nx = this.segs[Math.max(0, i - 1)], pv = this.segs[Math.min(this.N - 1, i + 1)];
      this.path.place(sg.g, sg.s, sg.y + (asleep ? Math.sin(t * 0.8 + i * 0.3) * 0.08 : 0), -0.5);
      const ang = Math.atan2(nx.y - pv.y, (nx.s - pv.s) || 0.001);
      sg.g.rotation.z = (i === 0 ? Math.atan2(sg.y - this.segs[1].y, (sg.s - this.segs[1].s) || 0.001) : ang);
      sg.g.visible = sg.y > this.cfg.base - 4;
    }
    this.jaw.rotation.z = asleep ? 0 : -0.25 - Math.max(0, Math.sin(t * 6)) * 0.35;
    if (!asleep && Math.random() < dt * 20) { const h = this.segs[Math.floor(Math.random() * this.N)]; if (h.y > this.cfg.base + 2) this.game.fx.spawn(this.path.world(h.s, h.y, 0), new THREE.Vector3(0, 1, 0), 0x70ffd0, 0.4, 0.8, 0); }
  }
}

// ═════════════════════════════════════════════════════════════════════
// THE FINALE — the Lumen Seed was never an object. It was a heartbeat.
// Taking it wakes the Colossus sleeping beneath the temple, and Kiri climbs it.
// ═════════════════════════════════════════════════════════════════════
export class Finale {
  constructor(game) {
    this.game = game; this.path = game.path; this.L = game.level;
    this.state = 'idle'; this.t = 0;
    this.buildColossus(); this.buildPalm(); this.buildHand();
  }
  buildColossus() {
    const stone = new THREE.MeshStandardMaterial({ map: getTex('colossus'), roughness: 1, color: 0xb0aaa0 });
    const moss = new THREE.MeshStandardMaterial({ map: getTex('grass'), color: 0x8fbf80, roughness: 1 });
    const seam = glow(0xffc860, 1.5);
    const C = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), stone); torso.scale.set(34, 46, 22); torso.position.y = 70; C.add(torso);
    const mossTop = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, 1.1), moss); mossTop.scale.set(35, 20, 23); mossTop.position.y = 96; C.add(mossTop);
    const head = new THREE.Group(); head.position.y = 138; C.add(head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), stone); skull.scale.set(20, 22, 18); head.add(skull);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(34, 5, 20), stone); brow.position.set(0, 6, 4); head.add(brow);
    this.eyes = [];
    for (const x of [-7.5, 7.5]) { const e = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12), glow(0xfff0b0, 0)); e.position.set(x, 1, 16.5); head.add(e); this.eyes.push(e); }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 1), glow(0x402808, 1)); mouth.position.set(0, -9, 17.5); head.add(mouth);
    // a forest grows on its crown
    for (let i = 0; i < 14; i++) { const tr = new THREE.Group(); const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1, 10, 6), new THREE.MeshStandardMaterial({ map: getTex('bark') })); tk.position.y = 5; tr.add(tk); const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(4 + Math.random() * 3, 1), moss); cr.position.y = 11; tr.add(cr); const a = Math.random() * Math.PI * 2, r = Math.random() * 14; tr.position.set(Math.cos(a) * r, 18 + Math.random() * 3, Math.sin(a) * r * 0.8); tr.rotation.z = (Math.random() - 0.5) * 0.4; head.add(tr); }
    for (const x of [-1, 1]) {
      const sh = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 12), stone); sh.position.set(x * 38, 100, 0); C.add(sh);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 70, 12), stone); arm.position.set(x * 46, 62, 6); arm.rotation.z = x * 0.18; C.add(arm);
      for (let k = 0; k < 4; k++) { const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 20, 0.6), seam); s2.position.set(x * (44 + k * 1.5), 60 + k * 6, 17); s2.rotation.z = x * 0.2 + k * 0.1; C.add(s2); }
    }
    for (let k = 0; k < 7; k++) { const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 30 + k * 4, 0.8), seam); s2.position.set(-18 + k * 6, 60 + (k % 3) * 8, 21.5); s2.rotation.z = (k - 3) * 0.12; C.add(s2); }
    const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(5, 1), glow(0xffe080, 0)); heart.position.set(0, 82, 20); C.add(heart); this.heart = heart;
    this.path.place(C, 1550 + O, -220, -70); C.rotation.y += 0; // faces the camera side
    this.game.scene.add(C);
    this.C = C; this.baseY = -220; this.topY = -36; this.C.visible = false; this.head = head;
  }
  buildPalm() {
    const pc = this.L.palm; const stone = surfMat('colossus');
    const g = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.BoxGeometry(pc.half * 2 + 1, 2.4, 6), stone); palm.position.y = -1.2; palm.castShadow = palm.receiveShadow = true; g.add(palm);
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 5, 8), stone); f.rotation.z = Math.PI / 2; f.position.set(pc.half + 2.3, 0.2, -2.2 + i * 1.45); f.rotation.y = 0.2 - i * 0.12; g.add(f); }
    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 4, 8), stone); thumb.position.set(-pc.half - 0.5, 0.8, 2.6); thumb.rotation.x = 1; g.add(thumb);
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 60, 10), stone); wrist.position.set(-pc.half - 4, -30, -8); wrist.rotation.z = 0.5; g.add(wrist);
    g.visible = false; this.game.scene.add(g);
    const sol = { s0: pc.s - pc.half, s1: pc.s + pc.half, y0: -60, y1: -60, active: false, dS: 0, dY: 0, mat: 'colossus' };
    this.game.entities.solids.push(sol);
    this.palm = { ...pc, g, sol, y: -40, state: 'down', standT: 0 };
  }
  buildHand() {
    const hd = this.L.hand; const stone = surfMat('colossus');
    const g = new THREE.Group();
    const back = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 5), stone); back.position.y = 1.5; g.add(back);
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 4, 8), stone); f.rotation.z = Math.PI / 2; f.position.set(5, 0.9, -1.8 + i * 1.2); g.add(f); }
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.5, 60, 10), stone); arm.position.set(-8, 25, -12); arm.rotation.z = 0.9; g.add(arm);
    g.visible = false; this.game.scene.add(g);
    this.hand = { ...hd, g, s: hd.s0, active: false, dir: 1 };
  }
  // ───────── the Seed is taken
  start() {
    const game = this.game, p = game.player, A = game.entities.altar;
    this.state = 'rising'; this.t = 0; p.state = 'cutscene'; p.vs = 0;
    if (p.comp) p.dismount(false);
    this.C.visible = true;
    game.audio.play('rumble'); game.audio.intensity = 0; game.magic.quietFor = 9;
    game.hud.banner('THE SEED STIRS', 'it was never an object', 4);
    const look = this.path.world(1550 + O, 50, -70);
    const from = this.path.world(A.s, A.y + 4, 14), to = this.path.world(1510 + O, 20, 95);
    game.director.play({ dur: 9, hold: true,
      pos: (u) => from.clone().lerp(to, u * u * (3 - 2 * u)),
      look: (u) => this.path.world(A.s, A.y + 3, 0).lerp(look, Math.min(1, u * 1.4)) });
    this.seedFrom = A.seed.getWorldPosition(new THREE.Vector3());
  }
  activateClimb() {
    const game = this.game, E = game.entities, M = game.magic;
    for (const o of E.solids) if (o.finale && !(o.crack && o.broken)) { o.active = true; if (o.mesh) o.mesh.visible = true; }
    for (const b of E.bouncers) if (b.finale) { b.hidden = false; b.g.visible = true; }
    for (const gp of E.grapples) if (gp.bondOnly && M.bonds.has(gp.bondOnly)) { gp.hidden = false; gp.g.visible = true; }
    for (const gh of M.ghosts) if (gh.o.finale) gh.g.visible = true;
    this.palm.g.visible = true; this.palm.sol.active = true;
    this.hand.g.visible = true; this.hand.active = true;
    this.state = 'climb';
    game.checkpoint = { s: game.player.s, y: game.player.y };
    const p = game.player; p.state = 'normal'; game.director.script = null;
    game.hud.banner('CLIMB', 'the Colossus has opened its hand', 3.5);
    game.hud.toast('Step onto its palm.', 4);
    game.audio.intensity = 0.55;
    // companions you befriended gather on the temple floor to watch
    let k = 0;
    for (const c of E.companions) if (game.stats.met[c.kind]) { c.state = 'idle'; c.s = 1520 + O + k * 3.2; c.y = -16.4; c.t = 0; c.greeted = false; k++; }
    if (k) setTimeout(() => game.hud.toast(k > 2 ? 'Your friends followed you all the way here.' : 'A friend followed you here.', 3.5), 2500);
  }
  step(h) {
    const game = this.game, p = game.player;
    if (this.state === 'rising') {
      this.t += h;
      const k = Math.min(1, this.t / 7.5), e = k * k * (3 - 2 * k);
      this.C.position.y = this.baseY + (this.topY - this.baseY) * e;
      game.shake(0.35 * (1 - k) + 0.05);
      this.eyes.forEach((x) => x.material.emissiveIntensity = Math.max(0, (k - 0.6) * 8));
      this.heart.material.emissiveIntensity = k * 3;
      const A = game.entities.altar, crown = this.path.world(this.L.crown.s, this.L.crown.y + 3, 0);
      A.seed.position.y = 3 + e * 4;
      if (Math.random() < h * 30) game.fx.spawn(this.path.world(1500 + O + Math.random() * 90, -18, -20 - Math.random() * 60), new THREE.Vector3((Math.random() - 0.5) * 4, 6 + Math.random() * 8, 0), 0xa08060, 2, 2, -4);
      // the palm surfaces beside the altar
      this.palm.y = -40 + Math.min(1, Math.max(0, (this.t - 4) / 3)) * 23.9;
      this.palm.g.visible = this.t > 4;
      if (this.t > 8.8) { this.activateClimb(); this.seedAt = crown; A.seed.visible = false; this.makeCrownSeed(crown); }
      this.placePalm(h); return;
    }
    if (this.state === 'climb') {
      this.placePalm(h);
      // the palm lifts Kiri
      const pm = this.palm;
      if (pm.state === 'down' && p.grounded && p.ground === pm.sol) { pm.standT += h; if (pm.standT > 0.4) { pm.state = 'lift'; pm.t = 0; game.audio.play('rumble'); game.shake(0.4); } }
      // swinging hand
      const hd = this.hand;
      const u = (game.time % hd.period) / hd.period;
      hd.s = hd.s0 + (hd.s1 - hd.s0) * (0.5 - 0.5 * Math.cos(u * Math.PI * 2));
      const warm = Math.sin(u * Math.PI * 2);
      if (p.state === 'normal' && p.invuln <= 0 && Math.abs(hd.s - p.s) < 3.2 + p.hw && p.y < hd.y + 2.8 && p.y + p.h > hd.y + 0.2) { p.hurt('Swatted by the Colossus!'); p.vs = Math.sign(warm || 1) * 12; p.vy = 12; }
      // climb checkpoints
      for (const cp of this.L.finaleCps) if (!cp.on && p.grounded && Math.abs(cp.s - p.s) < 4 && Math.abs(cp.y - p.y) < 0.8) { cp.on = true; game.checkpoint = { s: cp.s, y: cp.y + 0.1 }; game.audio.play('checkpoint'); game.fx.burst(this.path.world(cp.s, cp.y + 1, 0), 0xffd070, 20, 5, 0.6, 1, 0); }
      // slipping off the Colossus is gentle: back to the last handhold
      if (p.state === 'normal' && p.y < game.checkpoint.y - 14 && game.checkpoint.y > 0) {
        if (game.magic.bonds.has('bird') && !(this.solaT > game.time)) { this.solaT = game.time + 20; game.magic.rescueFromFinale(); }
        else game.killPlayer('Kiri slips…');
      }
      // the crown
      const cr = this.L.crown;
      if (p.state === 'normal' && Math.abs(p.s - cr.s) < 2 && Math.abs(p.y - cr.y) < 2.5) game.ending();
    }
  }
  placePalm(h) {
    const pm = this.palm, sol = pm.sol, ps0 = sol.s0, py1 = sol.y1;
    if (this.state === 'climb') {
      if (pm.state === 'down') pm.y = -16.1;
      if (pm.state === 'lift') { pm.t += h; const k = Math.min(1, pm.t / 6), e = k * k * (3 - 2 * k); pm.y = -16.1 + (pm.toY + 16.1) * e; if (k >= 1) pm.state = 'up'; }
    }
    sol.y1 = pm.y; sol.y0 = pm.y - 2.4; sol.dS = 0; sol.dY = sol.y1 - py1; sol.s0 = ps0;
    this.path.place(pm.g, pm.s, pm.y, 0);
  }
  makeCrownSeed(pos) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 2), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe080, emissiveIntensity: 3 })); g.add(core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.08, 6, 40), glow(0xfff0b0, 2.5)); g.add(ring);
    g.position.copy(pos); this.game.scene.add(g); this.crownSeed = g;
  }
  reset() {
    if (this.state !== 'climb') return;
    const pm = this.palm; if (pm.state === 'lift') { pm.state = 'down'; pm.standT = 0; }
    if (pm.state === 'down') pm.standT = 0;
  }
  update(dt, t) {
    if (!this.C.visible) return;
    this.C.position.y += Math.sin(t * 0.35) * 0.01; // breathing
    this.head.rotation.y = Math.sin(t * 0.2) * 0.06;
    this.heart.scale.setScalar(1 + Math.max(0, Math.sin(t * 2.4)) * 0.12);
    const hd = this.hand;
    if (hd.active) { this.path.place(hd.g, hd.s, hd.y, 0.4); }
    if (this.crownSeed) { this.crownSeed.rotation.y = t; this.crownSeed.children[1].rotation.x = t * 1.3; this.crownSeed.position.y = this.seedAt.y + Math.sin(t * 1.5) * 0.3; }
  }
}
