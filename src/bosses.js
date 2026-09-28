import * as THREE from 'three';
import { makeSpikeback, makeBuzzmoth } from './models.js';
import { surfMat } from './world.js';

// Every area ends with a guardian. None of them has a health bar you chip away with attacks:
// each one opens up for a moment, and Kiri has to use movement to reach that moment.
const glow = (c, i = 2) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i });

export const BOSSES = {
  bramble: { name: 'THE BRAMBLE KING', sub: 'jump its charge, stomp its belly', kind: 'charger' },
  skyreaver: { name: 'SKYREAVER', sub: 'wait for the dive, then bounce on its head', kind: 'flyer' },
  warden: { name: 'THE STONE WARDEN', sub: 'climb its hands, strike the eye', kind: 'warden' },
  crawler: { name: 'THE FORGE CRAWLER', sub: 'make it crash, then slam its core', kind: 'charger', mech: true },
  angler: { name: 'THE DEEP ANGLER', sub: 'dodge the lunge, dash into the lantern', kind: 'angler' },
  heron: { name: 'THE STORM HERON', sub: 'outfly the lightning, ram it when it tires', kind: 'heron' },
};

export class BossManager {
  constructor(game) { this.game = game; this.active = null; this.defeated = new Set(); }
  get busy() { return !!this.active; }
  start(id) {
    const game = this.game, A = game.level.arenas[id]; if (!A) return;
    const def = BOSSES[id];
    const b = new Boss(game, id, def, A);
    this.active = b;
    for (const o of game.level.bounds) if (o.id === id) { o.sol ||= { s0: o.s0, s1: o.s1, y0: o.y0, y1: o.y1, active: false, dS: 0, dY: 0 }; if (!game.entities.solids.includes(o.sol)) game.entities.solids.push(o.sol); o.sol.active = true; }
    game.hud.banner(def.name, def.sub, 3.5);
    game.audio.intensity = 1; game.audio.play('rumble'); game.shake(0.6);
    game.hud.bossBar(3, def.name);
  }
  end(won) {
    const game = this.game, b = this.active; if (!b) return;
    for (const o of game.level.bounds) if (o.id === b.id && o.sol) o.sol.active = false;
    b.dispose();
    this.active = null; game.hud.bossBar(0);
    game.audio.intensity = 0.2;
    if (won) { this.defeated.add(b.id); game.onBossDefeated(b.id); }
  }
  reset() { if (this.active) { const id = this.active.id; this.end(false); this.pendingRestart = id; } }
  step(h) {
    if (this.active) this.active.step(h);
    const game = this.game, p = game.player;
    // in-level arenas (underwater, sky) begin when Kiri crosses their gate
    if (!this.active && game.currentLevel) {
      const lv = game.currentLevel;
      if (lv.boss && !this.defeated.has(lv.boss) && !lv.bossDone) {
        const A = game.level.arenas[lv.boss];
        if (A && A.gate && p.s > A.gate && Math.abs(p.y - A.y) < 80 && p.state === 'normal') this.start(lv.boss);
      }
    }
  }
  update(dt, t) { if (this.active) this.active.update(dt, t); }
}

class Boss {
  constructor(game, id, def, A) {
    this.game = game; this.id = id; this.def = def; this.A = A; this.path = game.path;
    this.hp = 3; this.t = 0; this.state = 'intro'; this.stateT = 0; this.flash = 0;
    this.s = A.s; this.y = A.y; this.dir = -1; this.vs = 0; this.projectiles = [];
    this.group = new THREE.Group(); game.scene.add(this.group);
    this['build_' + def.kind]();
  }
  dispose() { this.game.scene.remove(this.group); for (const p of this.projectiles) this.game.scene.remove(p.m); }
  set(state) { this.state = state; this.stateT = 0; }
  get p() { return this.game.player; }
  touches(s, y, hw, h) { const p = this.p; return Math.abs(p.s - s) < hw + p.hw && p.y < y + h && p.y + p.h > y; }
  stompedOn(s, topY, hw) { const p = this.p; return p.vy < 0 && Math.abs(p.s - s) < hw + p.hw && p.y > topY - 1.2 && p.y < topY + 0.6; }
  bounce(v = 16) { const p = this.p; p.vy = v; p.leapReady = true; p.slamming = false; p.squash = -0.35; this.game.magic.chainEvent(); }
  hurtPlayer(msg) { const p = this.p; if (p.invuln <= 0 && p.state === 'normal') p.hurt(msg); }
  hit() {
    const game = this.game;
    this.hp--; this.flash = 0.6; game.shake(0.7); game.audio.play('smash'); game.hitstop?.(0.08);
    game.fx.burst(this.path.world(this.s, this.y + 2, 0), 0xfff0a0, 40, 10, 0.9, 0.9, -6);
    game.hud.bossBar(this.hp, this.def.name);
    if (this.hp <= 0) { this.set('dead'); game.audio.play('win'); game.hud.banner(this.def.name.replace('THE ', '') + ' FALLS', 'the way forward opens', 3); }
    else game.hud.toast(this.hp === 2 ? 'It’s getting angry…' : 'One more!', 1.6);
  }
  spawnProjectile(s, y, vs, vy, r = 0.5, col = 0xff60a0, grav = -20) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), glow(col, 2)); this.game.scene.add(m);
    this.projectiles.push({ s, y, vs, vy, r, m, grav, t: 0 });
  }
  stepProjectiles(h) {
    const floor = this.A.y;
    for (const pr of this.projectiles) {
      pr.t += h; pr.vy += pr.grav * h; pr.s += pr.vs * h; pr.y += pr.vy * h;
      if (this.touches(pr.s, pr.y - pr.r, pr.r, pr.r * 2)) { this.hurtPlayer('Hit!'); pr.dead = true; }
      if ((pr.grav < 0 && pr.y < floor) || pr.t > 6) { pr.dead = true; this.game.fx.burst(this.path.world(pr.s, pr.y, 0), 0xff80c0, 8, 4, 0.5, 0.4, -6); }
    }
    for (const pr of this.projectiles) if (pr.dead) this.game.scene.remove(pr.m);
    this.projectiles = this.projectiles.filter((x) => !x.dead);
  }
  step(h) {
    this.t += h; this.stateT += h; this.flash = Math.max(0, this.flash - h);
    if (this.state === 'intro') { if (this.stateT > 1.6) this.set('fight'); }
    else if (this.state === 'dead') { if (this.stateT > 2.5) this.game.bosses.end(true); return; }
    this['step_' + this.def.kind](h);
    this.stepProjectiles(h);
  }
  update(dt, t) {
    for (const pr of this.projectiles) this.path.place(pr.m, pr.s, pr.y, 0);
    this.group.visible = this.state !== 'dead' || Math.floor(this.stateT * 12) % 2 === 0;
    const e = this.flash > 0 ? 1 : 0;
    this.group.traverse((o) => { if (o.isMesh && o.material.emissive && !o.userData.keep) { o.material.emissiveIntensity = o.userData.ei ?? (o.userData.ei = o.material.emissiveIntensity); if (e) o.material.emissiveIntensity = 3; } });
    if (this.state === 'dead') { this.group.scale.multiplyScalar(0.985); if (Math.random() < dt * 30) this.game.fx.burst(this.path.world(this.s + (Math.random() - 0.5) * 4, this.y + Math.random() * 4, 0), 0xffe080, 4, 6, 0.7, 0.8, 0); }
    this['look_' + this.def.kind]?.(dt, t);
  }

  // ═══════════ CHARGER (Bramble King, Forge Crawler) ═══════════
  build_charger() {
    if (this.def.mech) {
      const iron = new THREE.MeshStandardMaterial({ color: 0x6a5a48, metalness: 0.7, roughness: 0.4 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), iron); body.scale.set(2.6, 1.3, 1.8); body.position.y = 1.5; this.group.add(body);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), glow(0xff8030, 3)); core.position.y = 2.7; core.userData.keep = true; this.group.add(core); this.core = core;
      for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.8, 6), iron); l.position.set(-1.6 + (i % 3) * 1.6, 0.6, i < 3 ? 1.5 : -1.5); l.rotation.x = i < 3 ? 0.6 : -0.6; this.group.add(l); }
      const drill = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2, 8), new THREE.MeshStandardMaterial({ color: 0xc0c0c8, metalness: 0.9, roughness: 0.2 })); drill.rotation.z = -Math.PI / 2; drill.position.set(3, 1.4, 0); this.group.add(drill); this.drill = drill;
    } else {
      const m = makeSpikeback(); m.scale.setScalar(2.4); this.group.add(m); this.model = m;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.5, 6, 1, true), glow(0xffd040, 1.5)); crown.position.set(1.2, 2.7, 0); this.group.add(crown);
    }
    this.hw = 2.2; this.h = 2.2;
  }
  step_charger(h) {
    const A = this.A, p = this.p, speed = 11 + (3 - this.hp) * 3.5;
    if (this.state === 'fight') this.set('wind');
    if (this.state === 'wind') { this.dir = p.s > this.s ? 1 : -1; if (this.stateT > 0.9 - (3 - this.hp) * 0.15) this.set('charge'); }
    else if (this.state === 'charge') {
      this.s += this.dir * speed * h;
      if (Math.random() < h * 30) this.game.fx.spawn(this.path.world(this.s - this.dir * 2, this.y + 0.3, (Math.random() - 0.5) * 2), new THREE.Vector3(0, 3, 0), this.def.mech ? 0xffa040 : 0xc0a070, 0.9, 0.6, 0);
      if (Math.abs(this.s - A.s) > A.w - this.hw - 0.5) { this.s = A.s + Math.sign(this.s - A.s) * (A.w - this.hw - 0.5); this.set('stun'); this.game.shake(0.9); this.game.audio.play('smash'); if (this.def.mech) for (let i = 0; i < 3 + (3 - this.hp); i++) this.spawnProjectile(A.s + (Math.random() - 0.5) * A.w * 1.6, A.y + 14, 0, 0, 0.7, 0xa08060, -22); }
      if (this.touches(this.s, this.y, this.hw, this.h)) { if (p.y > this.y + this.h - 0.6 && p.vy < 0) this.bounce(14); else this.hurtPlayer(this.def.mech ? 'Drilled!' : 'Trampled!'); }
    } else if (this.state === 'stun') {
      if (this.stompedOn(this.s, this.y + 1.4, this.hw) || (p.slamming && Math.abs(p.s - this.s) < this.hw + 1)) { this.bounce(17); this.hit(); if (this.hp > 0) this.set('recover'); return; }
      if (this.stateT > 2.4) this.set('recover');
    } else if (this.state === 'recover') { if (this.stateT > 0.7) this.set('wind'); }
  }
  look_charger(dt, t) {
    this.path.place(this.group, this.s, this.y, 0);
    this.group.rotation.y += this.dir < 0 ? Math.PI : 0;
    const stunned = this.state === 'stun';
    if (this.model) {
      const u = this.model.userData;
      this.model.rotation.z = stunned ? Math.PI : 0; this.model.position.y = stunned ? 2.6 : 0;
      u.legs.forEach((l, i) => l.rotation.z = this.state === 'charge' ? Math.sin(t * 30 + i * Math.PI) * 0.9 : stunned ? Math.sin(t * 20 + i) * 0.6 : 0);
      if (this.state === 'wind') this.group.position.y += Math.abs(Math.sin(t * 20)) * 0.15;
    } else {
      this.group.rotation.z = stunned ? 0.5 : 0;
      this.drill.rotation.x += dt * (this.state === 'charge' ? 30 : 4);
      this.core.material.emissiveIntensity = stunned ? 5 + Math.sin(t * 20) * 2 : 2;
    }
  }

  // ═══════════ FLYER (Skyreaver) ═══════════
  build_flyer() {
    const m = makeBuzzmoth(); m.scale.setScalar(4.2); this.group.add(m); this.model = m;
    for (const z of [0.6, -0.6]) { const horn = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.2, 5), new THREE.MeshStandardMaterial({ color: 0x301020 })); horn.position.set(1.8, 3.6, z); horn.rotation.z = -0.6; this.group.add(horn); }
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2; this.game.scene.add(this.shadow); this.projectiles.push({ s: 0, y: -999, vs: 0, vy: 0, r: 0, m: this.shadow, grav: 0, t: -1e9, keep: true });
    this.y = this.A.y + 9; this.hw = 2.2; this.h = 2.4;
  }
  step_flyer(h) {
    const A = this.A, p = this.p;
    if (this.state === 'fight') this.set('hover');
    if (this.state === 'hover') {
      this.s = A.s + Math.sin(this.t * 0.8) * (A.w - 6); this.y = A.y + 9 + Math.sin(this.t * 2) * 1.2;
      if (this.hp < 3 && Math.random() < h * (this.hp === 1 ? 1.2 : 0.6)) this.spawnProjectile(this.s, this.y, (Math.random() - 0.5) * 6, 2, 0.45, 0xa0ff60);
      if (this.stateT > 3.2 - (3 - this.hp) * 0.5) { this.target = p.s; this.set('aim'); }
    } else if (this.state === 'aim') {
      this.s += (this.target - this.s) * Math.min(1, h * 3); if (this.stateT > 0.9) this.set('dive');
    } else if (this.state === 'dive') {
      this.y -= 26 * h;
      if (this.touches(this.s, this.y, this.hw, this.h)) this.hurtPlayer('Skewered!');
      if (this.y <= A.y) { this.y = A.y; this.set('stuck'); this.game.shake(0.8); this.game.audio.play('slam'); this.game.fx.burst(this.path.world(this.s, A.y + 0.5, 0), 0xc0a070, 30, 8, 1, 0.8, -10); }
    } else if (this.state === 'stuck') {
      if (this.stompedOn(this.s, this.y + 2.6, this.hw)) { this.bounce(17); this.hit(); if (this.hp > 0) this.set('rise'); return; }
      if (this.touches(this.s, this.y, this.hw * 0.8, 2) && !(p.y > this.y + 2)) { p.vs = Math.sign(p.s - this.s || 1) * 8; }
      if (this.stateT > 2.3) this.set('rise');
    } else if (this.state === 'rise') { this.y += 12 * h; if (this.y > A.y + 9) this.set('hover'); }
  }
  look_flyer(dt, t) {
    this.path.place(this.group, this.s, this.y, 0);
    this.group.rotation.y += this.p.s < this.s ? Math.PI : 0;
    const u = this.model.userData; const fast = this.state === 'stuck' ? 6 : 40;
    u.wings.forEach((w, i) => w.rotation.x = Math.sin(t * fast) * 0.9 * (i ? -1 : 1));
    if (this.state === 'stuck') this.group.rotation.z = 0.6;
    const sh = this.projectiles.find((x) => x.keep); if (sh) { sh.s = this.state === 'aim' ? this.target : this.s; sh.y = this.A.y + 0.05; sh.m.material.opacity = this.state === 'aim' ? 0.6 : 0.25; sh.m.scale.setScalar(this.state === 'aim' ? 1 + Math.sin(t * 20) * 0.1 : 0.8); }
  }

  // ═══════════ WARDEN (Stone Warden) ═══════════
  build_warden() {
    const stone = surfMat('ruin');
    const head = new THREE.Group(); this.group.add(head); this.head = head;
    const b = new THREE.Mesh(new THREE.BoxGeometry(7, 8, 5), stone); head.add(b);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.3, 5.6), stone); brow.position.y = 2.3; head.add(brow);
    this.eye = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), glow(0x40ffd0, 3)); this.eye.position.set(0, 0.8, 2.8); this.eye.userData.keep = true; head.add(this.eye);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 0.3), glow(0x103830, 1)); mouth.position.set(0, -2, 2.6); head.add(mouth);
    this.hands = [0, 1].map((i) => {
      const g = new THREE.Group(); const palm = new THREE.Mesh(new THREE.BoxGeometry(5, 1.6, 4), stone); palm.position.y = 0.8; g.add(palm);
      for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), stone); f.position.set(-1.8 + k * 1.2, -0.3, 1.6); g.add(f); }
      this.group.add(g);
      const sol = { s0: 0, s1: 0, y0: -999, y1: -998, active: true, dS: 0, dY: 0 };
      this.game.entities.solids.push(sol);
      return { g, sol, s: this.A.s + (i ? 12 : -12), y: this.A.y + 7, st: 'hover', t: i * 1.4 };
    });
    this.eyeS = this.A.s; this.eyeY = this.A.y + 9.5;
  }
  dispose_warden() { for (const hd of this.hands) hd.sol.active = false; }
  step_warden(h) {
    const A = this.A, p = this.p, fast = 1 + (3 - this.hp) * 0.35;
    this.eyeS = A.s + Math.sin(this.t * 0.5) * 10; this.eyeY = A.y + 9.5 + Math.sin(this.t * 1.3) * 0.6;
    for (const hd of this.hands) {
      hd.t += h * fast;
      const ps0 = hd.sol.s0, py1 = hd.sol.y1;
      if (hd.st === 'hover') { hd.s += (p.s - hd.s) * Math.min(1, h * 2) * 0.8; hd.y = A.y + 7; if (hd.t > 2.2) { hd.st = 'slam'; hd.t = 0; } }
      else if (hd.st === 'slam') { hd.y -= 30 * h; if (this.touches(hd.s, hd.y, 2.5, 1.6)) this.hurtPlayer('Crushed!'); if (hd.y <= A.y) { hd.y = A.y; hd.st = 'rest'; hd.t = 0; this.game.shake(0.6); this.game.audio.play('slam'); } }
      else if (hd.st === 'rest') { if (hd.t > 2.2) { hd.st = 'lift'; hd.t = 0; } }
      else if (hd.st === 'lift') { hd.y += 6 * h; if (hd.y >= A.y + 7) { hd.st = 'hover'; hd.t = 0; } }
      Object.assign(hd.sol, { s0: hd.s - 2.5, s1: hd.s + 2.5, y0: hd.y, y1: hd.y + 1.6, active: this.state !== 'dead' });
      hd.sol.dS = hd.sol.s0 - ps0; hd.sol.dY = hd.st === 'slam' ? 0 : hd.sol.y1 - py1;
    }
    if (this.state === 'fight' && this.cool <= 0 && Math.hypot(p.s - this.eyeS, p.y + p.h / 2 - this.eyeY) < 1.9) { this.hit(); this.bounce(10); p.vs = Math.sign(p.s - this.eyeS || 1) * 8; this.cool = 1.5; }
    this.cool = (this.cool || 0) - h;
    if (this.state === 'dead') this.dispose_warden();
  }
  look_warden(dt, t) {
    this.path.place(this.head, this.eyeS, this.eyeY - 0.8, -3); this.head.rotation.y = 0; this.head.rotation.z = Math.sin(t * 0.7) * 0.05;
    this.path.place(this.group, 0, 0, 0); this.group.position.set(0, 0, 0); this.group.rotation.set(0, 0, 0);
    this.path.place(this.head, this.eyeS, this.eyeY - 0.8, -3);
    for (const hd of this.hands) this.path.place(hd.g, hd.s, hd.y, 0);
    this.eye.material.emissiveIntensity = this.cool > 0 ? 0.5 : 2.5 + Math.sin(t * 4);
  }

  // ═══════════ ANGLER (underwater) ═══════════
  build_angler() {
    const skin = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.5, emissive: 0x020810 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), skin); body.scale.set(3.6, 2.6, 2.4); this.group.add(body);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 3), skin); jaw.position.set(2.6, -1.4, 0); this.group.add(jaw); this.jaw = jaw;
    for (let i = 0; i < 8; i++) { const tth = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.7, 4), new THREE.MeshStandardMaterial({ color: 0xf0f0ff })); tth.position.set(2 + i * 0.3, -0.8, (i % 2 ? 0.8 : -0.8)); tth.rotation.z = Math.PI; this.group.add(tth); }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), glow(0xfff080, 2)); eye.position.set(2.2, 0.9, 1.6); this.group.add(eye);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4, 5), skin); stalk.position.set(2.4, 3.4, 0); stalk.rotation.z = -0.6; this.group.add(stalk); this.stalk = stalk;
    this.lantern = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 10), glow(0x80fff0, 4)); this.lantern.userData.keep = true; this.group.add(this.lantern);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(2, 3, 4), skin); tail.rotation.z = Math.PI / 2; tail.position.x = -4.6; this.group.add(tail); this.tail = tail;
    this.y = this.A.y + 12; this.hw = 3.2; this.h = 4.4;
  }
  lanternPos() { const droop = this.state === 'stun' ? 1 : 0; return { s: this.s + this.dir * (4.2 - droop * 1.2), y: this.y + 3.8 - droop * 3.2 }; }
  step_angler(h) {
    const A = this.A, p = this.p;
    if (this.state === 'fight') this.set('stalk');
    if (this.state === 'stalk') {
      this.dir = p.s > this.s ? 1 : -1;
      this.s += this.dir * (2 + (3 - this.hp)) * h; this.y += ((p.y - 1) - this.y) * h * 0.8;
      this.y = Math.max(A.y + 1, Math.min(A.y + 76 - 70 + 70, this.y));
      if (this.stateT > 3.5 - (3 - this.hp) * 0.6) { this.tgt = { s: p.s, y: p.y }; this.set('tell'); this.game.audio.play('notice'); }
    } else if (this.state === 'tell') { if (this.stateT > 0.7) this.set('lunge'); }
    else if (this.state === 'lunge') {
      const dx = this.tgt.s - this.s, dy = this.tgt.y - this.y, d = Math.hypot(dx, dy) || 1;
      this.s += (dx / d) * 26 * h; this.y += (dy / d) * 26 * h * 0.5;
      const hitWall = Math.abs(this.s - A.s) > A.w - 4;
      if (hitWall || this.stateT > 1.4) { if (hitWall) { this.s = A.s + Math.sign(this.s - A.s) * (A.w - 4); this.set('stun'); this.game.shake(0.9); this.game.audio.play('smash'); } else this.set('stalk'); }
    } else if (this.state === 'stun') {
      const L = this.lanternPos();
      if (Math.hypot(p.s - L.s, p.y + p.h / 2 - L.y) < 2 && (p.dashT > 0 || p.vy < 0)) { this.hit(); p.vs = -this.dir * 10; p.dashT = 0; if (this.hp > 0) this.set('stalk'); return; }
      if (this.stateT > 3) this.set('stalk');
    }
    if (this.state !== 'stun' && this.state !== 'dead' && this.touches(this.s, this.y - this.h / 2, this.hw, this.h)) this.hurtPlayer('Chomped by the deep!');
  }
  look_angler(dt, t) {
    this.path.place(this.group, this.s, this.y, -0.5);
    this.group.rotation.y += this.dir < 0 ? Math.PI : 0;
    this.jaw.rotation.z = this.state === 'lunge' || this.state === 'tell' ? -0.6 : -0.15 + Math.sin(t * 2) * 0.1;
    this.tail.rotation.y = Math.sin(t * (this.state === 'lunge' ? 20 : 5)) * 0.4;
    const droop = this.state === 'stun' ? 1 : 0;
    this.lantern.position.set(4.2 - droop * 1.2, 3.8 - droop * 3.2, 0);
    this.lantern.material.emissiveIntensity = this.state === 'stun' ? 6 + Math.sin(t * 15) * 2 : this.state === 'tell' ? 8 : 3;
  }

  // ═══════════ HERON (sky) ═══════════
  build_heron() {
    const white = new THREE.MeshStandardMaterial({ color: 0xe8eef8, roughness: 0.6, emissive: 0x101420 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a3050 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), white); body.scale.set(3, 1.4, 1.4); this.group.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 3.5, 6), white); neck.position.set(2.6, 1.6, 0); neck.rotation.z = -0.7; this.group.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), white); head.position.set(3.8, 2.9, 0); this.group.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.25, 2, 6), new THREE.MeshStandardMaterial({ color: 0xffc040 })); beak.rotation.z = -Math.PI / 2; beak.position.set(5.2, 2.9, 0); this.group.add(beak);
    this.crest = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.6, 5), glow(0x80c0ff, 2)); this.crest.position.set(3.4, 3.8, 0); this.crest.rotation.z = 0.8; this.crest.userData.keep = true; this.group.add(this.crest);
    this.wings = [1, -1].map((z) => { const w = new THREE.Group(); w.position.set(0, 0.5, z * 1.2); const m = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 5.5), white); m.position.z = z * 2.7; w.add(m); const tip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 2), dark); tip.position.set(-0.4, 0, z * 5.6); w.add(tip); this.group.add(w); return w; });
    this.bolts = [];
    this.y = this.A.y + 12; this.hw = 3; this.h = 2.8;
  }
  step_heron(h) {
    const A = this.A, p = this.p;
    if (this.state === 'fight') this.set('soar');
    if (this.state === 'soar') {
      const k = this.t * 0.7; this.s = A.s + Math.sin(k) * (A.w - 8); this.y = A.y + 12 + Math.sin(k * 2) * 6;
      this.dir = Math.cos(k) > 0 ? 1 : -1;
      this.boltT = (this.boltT || 0) - h;
      if (this.boltT <= 0) { this.boltT = 1.6 - (3 - this.hp) * 0.35; this.bolts.push({ s: p.s + p.vs * 0.4, t: 0, m: this.makeBolt() }); }
      if (this.stateT > 6) this.set('tired');
    } else if (this.state === 'tired') {
      this.y += ((A.y + 4) - this.y) * h * 2; this.s += (A.s - this.s) * h;
      if (Math.hypot(p.s - this.s, p.y + p.h / 2 - this.y) < 3.4 && (p.dashT > 0 || p.slamming)) { this.hit(); p.vs = -p.facing * 8; p.vy = 10; p.dashT = 0; if (this.hp > 0) this.set('soar'); return; }
      if (this.stateT > 3.2) this.set('soar');
    }
    if (this.state === 'soar' && this.touches(this.s, this.y - 1, this.hw, this.h)) this.hurtPlayer('Buffeted!');
    for (const b of this.bolts) {
      b.t += h;
      if (b.t > 0.9 && b.t < 1.15 && Math.abs(p.s - b.s) < 1.4 + p.hw) this.hurtPlayer('Lightning!');
      if (b.t > 0.9 && !b.boom) { b.boom = true; this.game.audio.play('slam'); this.game.fx.burst(this.path.world(b.s, p.y + 1, 0), 0xc0e0ff, 16, 8, 0.7, 0.4, 0); }
      if (b.t > 1.3) { b.dead = true; this.game.scene.remove(b.m); }
    }
    this.bolts = this.bolts.filter((b) => !b.dead);
  }
  makeBolt() {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 90, 0.3), new THREE.MeshBasicMaterial({ color: 0xc0e0ff, transparent: true, opacity: 0.25 }));
    this.game.scene.add(m); return m;
  }
  look_heron(dt, t) {
    this.path.place(this.group, this.s, this.y, -1);
    this.group.rotation.y += this.dir < 0 ? Math.PI : 0;
    const tired = this.state === 'tired';
    this.wings.forEach((w, i) => w.rotation.x = (i ? -1 : 1) * (tired ? 0.3 + Math.sin(t * 4) * 0.1 : Math.sin(t * 7) * 0.7));
    this.crest.material.emissiveIntensity = tired ? 6 + Math.sin(t * 16) * 2 : 1.5;
    for (const b of this.bolts) { this.path.place(b.m, b.s, this.A.y + 20, 0); b.m.material.opacity = b.t < 0.9 ? 0.15 + b.t * 0.3 : 1; b.m.scale.x = b.t < 0.9 ? 1 : 4; }
  }
  dispose_heron() { for (const b of this.bolts) this.game.scene.remove(b.m); }
}
const _dispose = Boss.prototype.dispose;
Boss.prototype.dispose = function () { this.dispose_warden && this.def.kind === 'warden' && this.dispose_warden(); this.def.kind === 'heron' && this.dispose_heron(); _dispose.call(this); };
