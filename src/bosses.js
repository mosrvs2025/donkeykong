import * as THREE from 'three';
import { makeSpikeback, makeBuzzmoth, gradGeo } from './models.js';
import { surfMat } from './world.js';

// Every area ends with a guardian. None of them has a health bar you chip away with attacks:
// each one opens up for a moment, and Kiri has to use movement to reach that moment.
const glow = (c, i = 2) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i });

const RAGE = new THREE.Color(0xff3010);
export const BOSSES = {
  bramble: { name: 'THE BRAMBLE KING', sub: 'jump its charge, stomp its belly', kind: 'charger' },
  skyreaver: { name: 'SKYREAVER', sub: 'wait for the dive, then bounce on its head', kind: 'flyer' },
  warden: { name: 'THE STONE WARDEN', sub: 'climb its hands, strike the eye', kind: 'warden' },
  crawler: { name: 'THE FORGE CRAWLER', sub: 'make it crash, then slam its core', kind: 'charger', mech: true },
  angler: { name: 'THE DEEP ANGLER', sub: 'dodge the lunge, dash into the lantern', kind: 'angler' },
  heron: { name: 'THE STORM HERON', sub: 'outfly the lightning, ram it when it tires', kind: 'heron' },
};

export class BossManager {
  constructor(game) {
    this.game = game; this.active = null; this.defeated = new Set();
    // cinematic overlay: letterbox bars + a title card for entrances and defeats
    const el = document.createElement('div'); el.id = 'boss-cine'; el.innerHTML = '<i class="bc-bar t"></i><i class="bc-bar b"></i><div class="bc-card"><small></small><b></b><span></span></div>';
    document.body.appendChild(el); this.cine = el;
  }
  card(kicker, name, sub, dur = 2.6) {
    const el = this.cine; el.querySelector('small').textContent = kicker; el.querySelector('b').textContent = name; el.querySelector('span').textContent = sub;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); clearTimeout(this.cineT); this.cineT = setTimeout(() => el.classList.remove('on'), dur * 1000);
  }
  get busy() { return !!this.active; }
  start(id) {
    const game = this.game, A = game.level.arenas[id]; if (!A) return;
    const def = BOSSES[id];
    const b = new Boss(game, id, def, A); game.addRim?.(b.group);
    this.active = b;
    for (const o of game.level.bounds) if (o.id === id) { o.sol ||= { s0: o.s0, s1: o.s1, y0: o.y0, y1: o.y1, active: false, dS: 0, dY: 0 }; if (!game.entities.solids.includes(o.sol)) game.entities.solids.push(o.sol); o.sol.active = true; }
    this.card('GUARDIAN', def.name, def.sub, 2.8); ['banner', 'toast'].forEach((i) => document.getElementById(i)?.classList.remove('on'));
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
    this.rise = 0; this.rage = false; this.roared = false;
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
    if (this.hp <= 0) { // the finishing blow: slow motion, a white flash, then it comes apart
      this.set('dead'); game.slowT = 1.4; game.flash?.(0.4); document.getElementById('toast')?.classList.remove('on'); game.shake(1.2); game.hitstop?.(0.18); game.audio.play('smash');
      game.fx.burst(this.path.world(this.s, this.y + 2, 0), 0xffe8a0, 50, 14, 0.9, 1, 0);
      game.bosses.cine.classList.add('bars');
    } else if (this.hp === 1 && !this.rage) { // second phase
      this.rage = true; game.hud.toast('<b>It’s enraged!</b> Faster now, watch closely', 2.2); game.audio.play('rumble'); game.shake(0.9);
      game.fx.burst(this.path.world(this.s, this.y + 2, 0), 0xff4020, 60, 12, 1, 1, 0);
    } else game.hud.toast('It’s getting angry…', 1.6);
  }
  spawnProjectile(s, y, vs, vy, r = 0.5, col = 0xff60a0, grav = -20, life = 6) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), glow(col, 2)); this.game.scene.add(m);
    const pr = { s, y, vs, vy, r, m, grav, t: 0, life }; this.projectiles.push(pr); return pr;
  }
  // enraged-only attacks, one per guardian
  shockwaves(col) { const A = this.A; for (const d of [-1, 1]) for (let k = 0; k < 2; k++) this.spawnProjectile(this.s + d * (this.hw + 0.5), A.y + 0.45, d * (9 + k * 4), 0, 0.45, col, 0, 3.2); this.game.audio.play('rumble'); }
  stepProjectiles(h) {
    const floor = this.A.y;
    for (const pr of this.projectiles) {
      pr.t += h; pr.vy += pr.grav * h; pr.s += pr.vs * h; pr.y += pr.vy * h;
      if (this.touches(pr.s, pr.y - pr.r, pr.r, pr.r * 2)) { this.hurtPlayer('Hit!'); pr.dead = true; }
      if ((pr.grav < 0 && pr.y < floor) || pr.t > pr.life || Math.abs(pr.s - this.A.s) > this.A.w + 2) { pr.dead = true; this.game.fx.burst(this.path.world(pr.s, pr.y, 0), 0xff80c0, 8, 4, 0.5, 0.4, -6); }
    }
    for (const pr of this.projectiles) if (pr.dead) this.game.scene.remove(pr.m);
    this.projectiles = this.projectiles.filter((x) => !x.dead);
  }
  step(h) {
    this.t += h; this.stateT += h; this.flash = Math.max(0, this.flash - h);
    if (this.state === 'intro') {
      this.rise = Math.min(1, this.stateT / 1.1);
      if (this.stateT > 1.1 && !this.roared) { this.roared = true; const g = this.game; g.shake(1); g.audio.play('rumble'); g.audio.play('slam');
        { const f = this.path.frame(this.s); g.fx.ring(this.path.world(this.s, this.A.y + 0.2, 0), 0xffe0b0, 40, 18, 0.8, new THREE.Vector3(f.tx, 0, f.tz), new THREE.Vector3(f.nx, 0, f.nz)); } g.fx.burst(this.path.world(this.s, this.y + 2.5, 0), 0xffd090, 50, 12, 1, 1, 0); }
      if (this.stateT > 2.2) this.set('fight');
    }
    else if (this.state === 'dead') {
      const g = this.game, k = this.stateT;
      if (Math.random() < h * 9) { g.fx.burst(this.path.world(this.s + (Math.random() - 0.5) * 5, this.y + Math.random() * 4.5, 0), [0xffe080, 0xffffff, 0xff9050][Math.floor(Math.random() * 3)], 24, 9, 0.9, 0.7, 0); g.audio.play('stomp'); g.shake(0.3); }
      if (k > 2.4 && !this.boomed) { this.boomed = true; g.flash?.(0.45); g.shake(1.4); g.audio.play('smash'); g.audio.play('win');
        g.fx.burst(this.path.world(this.s, this.y + 2, 0), 0xffc860, 90, 16, 1.1, 1.3, 0);
        g.bosses.card('GUARDIAN DEFEATED', this.def.name.replace('THE ', ''), 'the way forward opens', 2.6); }
      if (k > 3.4) { g.bosses.cine.classList.remove('bars'); g.bosses.end(true); }
      return;
    }
    this['step_' + this.def.kind](this.rage ? h * 1.3 : h);
    this.stepProjectiles(h);
  }
  update(dt, t) {
    for (const pr of this.projectiles) this.path.place(pr.m, pr.s, pr.y, 0);
    this.group.visible = this.state !== 'dead' || Math.floor(this.stateT * 12) % 2 === 0;
    const e = this.flash > 0 ? 1 : 0;
    this.group.traverse((o) => { if (o.isMesh && o.material.emissive && !o.userData.keep) { o.material.emissiveIntensity = o.userData.ei ?? (o.userData.ei = o.material.emissiveIntensity); if (e) o.material.emissiveIntensity = 3; } });
    if (this.state === 'intro') { const r = this.rise, e2 = r < 1 ? 1 - Math.pow(1 - r, 3) * Math.cos(r * 9) : 1; this.group.scale.setScalar(Math.max(0.01, e2)); }
    else if (this.state !== 'dead') this.group.scale.setScalar(1);
    if (this.rage && this.state !== 'dead' && !e) this.group.traverse((o) => { if (o.isMesh && o.material.emissive && !o.userData.keep) { o.material.emissive.lerp?.(RAGE, 0.02); o.material.emissiveIntensity = (o.userData.ei || 0.3) + 0.6 + Math.sin(t * 10) * 0.4; } });
    if (this.state === 'dead') { this.group.scale.multiplyScalar(this.stateT > 2.4 ? 0.9 : 0.997); if (Math.random() < dt * 30) this.game.fx.burst(this.path.world(this.s + (Math.random() - 0.5) * 4, this.y + Math.random() * 4, 0), 0xffe080, 4, 6, 0.7, 0.8, 0); }
    this['look_' + this.def.kind]?.(dt, t);
  }

  // ═══════════ CHARGER (Bramble King, Forge Crawler) ═══════════
  build_charger() {
    if (this.def.mech) {
      const iron = new THREE.MeshStandardMaterial({ color: 0x6a5a48, metalness: 0.7, roughness: 0.4 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), iron); body.scale.set(2.6, 1.3, 1.8); body.position.y = 1.5; this.group.add(body);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), glow(0xff8030, 3)); core.position.y = 2.7; core.userData.keep = true; this.group.add(core); this.core = core;
      for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.8, 6), iron); l.position.set(-1.6 + (i % 3) * 1.6, 0.6, i < 3 ? 1.5 : -1.5); l.rotation.x = i < 3 ? 0.6 : -0.6; this.group.add(l); }
      const plate = new THREE.MeshStandardMaterial({ color: 0x8a6a40, metalness: 0.8, roughness: 0.35 });
      for (let i = 0; i < 5; i++) { const pl = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), plate); pl.scale.set(0.9, 0.5, 1.7); pl.position.set(-2 + i * 1, 2.1 - Math.abs(i - 2) * 0.15, 0); this.group.add(pl); }
      for (let i = 0; i < 16; i++) { const rv = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), new THREE.MeshStandardMaterial({ color: 0xd8c090, metalness: 0.9, roughness: 0.2 })); rv.position.set(-2.4 + (i % 8) * 0.7, 1.2 + Math.floor(i / 8) * 0.6, 1.75); this.group.add(rv); }
      for (const z of [1.6, -1.6]) for (let i = 0; i < 3; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.05), glow(0xff7020, 2.5)); v.position.set(-1.2 + i * 0.8, 1.6, z * 1.12); v.userData.keep = true; this.group.add(v); }
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.2, 10), iron); stack.position.set(-1.8, 2.9, 0.5); this.group.add(stack);
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
      if (Math.abs(this.s - A.s) > A.w - this.hw - 0.5) { this.s = A.s + Math.sign(this.s - A.s) * (A.w - this.hw - 0.5); this.set('stun'); this.game.shake(0.9); this.game.audio.play('smash'); if (this.rage) this.shockwaves(this.def.mech ? 0xffa040 : 0x9aff60); if (this.def.mech) for (let i = 0; i < 3 + (3 - this.hp); i++) this.spawnProjectile(A.s + (Math.random() - 0.5) * A.w * 1.6, A.y + 14, 0, 0, 0.7, 0xa08060, -22); }
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
      if (this.y <= A.y) { this.y = A.y; this.set('stuck'); this.game.shake(0.8); if (this.rage) for (let i = 0; i < 6; i++) { const a = -1 + i * 0.4; this.spawnProjectile(this.s, A.y + 1.5, Math.sin(a) * 9, 11 + Math.cos(a) * 3, 0.35, 0xff70d0, -20); } this.game.audio.play('slam'); this.game.fx.burst(this.path.world(this.s, A.y + 0.5, 0), 0xc0a070, 30, 8, 1, 0.8, -10); }
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
    // the Stone Warden: a carved face grown over with moss, a rune-lit brow, vines, a crown of broken pillars
    const stone = surfMat('ruin'), moss = new THREE.MeshStandardMaterial({ color: 0x5a9a3a, roughness: 1, flatShading: true }), dark = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 1 });
    const head = new THREE.Group(); this.group.add(head); this.head = head;
    const b = new THREE.Mesh(new THREE.BoxGeometry(7, 8, 5, 3, 3, 2), stone); head.add(b);
    const cheekL = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 8), stone); cheekL.scale.set(1, 1.2, 0.6); cheekL.position.set(-2.6, -0.8, 2.3); head.add(cheekL); const cheekR = cheekL.clone(); cheekR.position.x = 2.6; head.add(cheekR);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.3, 5.6), stone); brow.position.y = 2.3; head.add(brow);
    const rune = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.18, 0.1), glow(0x40ffd0, 1.8)); rune.position.set(0, 2.3, 2.85); rune.userData.keep = true; head.add(rune);
    for (let i = 0; i < 5; i++) { const g2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), glow(0x40ffd0, 2)); g2.position.set(-2.4 + i * 1.2, 2.3, 2.9); g2.userData.keep = true; head.add(g2); }
    const socket = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.28, 8, 20), stone); socket.position.set(0, 0.8, 2.55); head.add(socket);
    this.eye = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 1), glow(0x40ffd0, 3)); this.eye.position.set(0, 0.8, 2.8); this.eye.userData.keep = true; head.add(this.eye);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(4, 0.55, 0.3), glow(0x103830, 1)); mouth.position.set(0, -2, 2.6); head.add(mouth);
    for (let i = 0; i < 5; i++) { const tth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.3), stone); tth.position.set(-1.6 + i * 0.8, -1.7, 2.65); head.add(tth); }
    // cracks and moss
    for (const [x, y, r] of [[-1.8, -2.6, 0.5], [2.2, 1.2, -0.7], [1.2, -3.2, 0.2]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.1), dark); c.position.set(x, y, 2.56); c.rotation.z = r; head.add(c); }
    for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.6, 0), moss); m.scale.y = 0.45; m.position.set(-3.6 + Math.random() * 7.2, 3 + Math.random() * 1.2, -2.4 + Math.random() * 4.8); head.add(m); }
    for (let i = 0; i < 4; i++) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 1.2 + Math.random() * 1.8, 7), stone); pl.position.set(-2.7 + i * 1.8, 4.6, -0.5); pl.rotation.z = (Math.random() - 0.5) * 0.3; head.add(pl); }
    const vineM = new THREE.MeshStandardMaterial({ color: 0x3a7a2a, roughness: 0.9 });
    for (let i = 0; i < 6; i++) { const L = 2 + Math.random() * 3; const v = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, L, 5), vineM); v.position.set(-3.3 + i * 1.3, 3 - L / 2, 2.5); head.add(v); for (let k = 0; k < 3; k++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), moss); lf.scale.set(1.4, 0.3, 0.8); lf.position.set(-3.3 + i * 1.3 + 0.15, 3 - k * L / 3 - 0.4, 2.6); head.add(lf); } }
    this.hands = [0, 1].map((i) => {
      const g = new THREE.Group();
      const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), stone); palm.scale.set(2.5, 0.85, 2); palm.position.y = 0.8; g.add(palm);
      for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.6, 4, 8), stone); f.position.set(-1.8 + k * 1.2, -0.2, 1.7); f.rotation.x = 0.5; g.add(f); const km = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), moss); km.scale.y = 0.5; km.position.set(-1.8 + k * 1.2, 0.35, 1.5); g.add(km); }
      const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.7, 4, 8), stone); th.position.set(i ? -2.6 : 2.6, 0.4, 0.8); th.rotation.z = i ? -0.9 : 0.9; g.add(th);
      const pr = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 6, 20), glow(0x40ffd0, 1.6)); pr.rotation.x = Math.PI / 2; pr.position.y = 1.62; pr.userData.keep = true; g.add(pr);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
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
      else if (hd.st === 'slam') { hd.y -= 30 * h; if (this.touches(hd.s, hd.y, 2.5, 1.6)) this.hurtPlayer('Crushed!'); if (hd.y <= A.y) { hd.y = A.y; hd.st = 'rest'; hd.t = 0; this.game.shake(0.6); if (this.rage) for (let i = 0; i < 3; i++) this.spawnProjectile(p.s + (i - 1) * 3.2 + (Math.random() - 0.5), A.y + 14 + i * 1.5, 0, 0, 0.6, 0xc8b090, -16); this.game.audio.play('slam'); } }
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
    // the Deep Angler: a bioluminescent abyss-fish with needle teeth, glassy fins and a lantern on a curved stalk
    const skin = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2, emissive: 0x020a14 });
    const body = new THREE.Mesh(gradGeo(new THREE.SphereGeometry(1, 28, 18), 0x14304a, 0x3a6a7a), skin); body.scale.set(3.6, 2.6, 2.4); this.group.add(body);
    const tooth = new THREE.MeshPhysicalMaterial({ color: 0xf4f4ff, roughness: 0.15, transmission: 0.3, thickness: 0.2 });
    for (let i = 0; i < 9; i++) { const t2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9 - (i % 3) * 0.2, 5), tooth); t2.position.set(2.2 + i * 0.22, -0.55, (i % 2 ? 0.9 : -0.9) * (1 - i * 0.06)); t2.rotation.z = Math.PI; this.group.add(t2); }
    const jaw = new THREE.Group(); jaw.position.set(1.4, -0.9, 0); this.group.add(jaw); this.jaw = jaw;
    const jm = new THREE.Mesh(gradGeo(new THREE.SphereGeometry(1, 20, 10), 0x2a4a5a, 0x5a8a8a), skin); jm.scale.set(2.2, 0.55, 1.8); jm.position.set(1.3, -0.3, 0); jaw.add(jm);
    for (let i = 0; i < 8; i++) { const t2 = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.8, 5), tooth); t2.position.set(1.2 + i * 0.26, 0.15, (i % 2 ? 0.8 : -0.8) * (1 - i * 0.05)); jaw.add(t2); }
    const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0x101820, roughness: 0.05, clearcoat: 1 })); eyeW.position.set(2.2, 0.9, 1.65); this.group.add(eyeW);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), glow(0xfff080, 2.4)); iris.position.set(2.42, 0.95, 1.95); iris.userData.keep = true; this.group.add(iris);
    const eye2 = eyeW.clone(); eye2.position.z = -1.65; this.group.add(eye2); const iris2 = iris.clone(); iris2.position.z = -1.95; this.group.add(iris2);
    // glowing spots along the flanks
    for (let i = 0; i < 18; i++) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.09 + (i % 3) * 0.04, 6, 4), glow(i % 4 ? 0x60ffe0 : 0xc080ff, 2.4)); const a = (i / 18) * Math.PI * 2; sp.position.set(-2.5 + (i % 9) * 0.6, -0.4 + Math.sin(i * 1.7) * 0.6, (i < 9 ? 1 : -1) * 2.25); sp.userData.keep = true; this.group.add(sp); }
    const finM = new THREE.MeshPhysicalMaterial({ color: 0x60c0e0, roughness: 0.3, transmission: 0.5, thickness: 0.2, transparent: true, opacity: 0.75, side: THREE.DoubleSide, emissive: 0x103040 });
    for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.08, 1.6 - i * 0.15, 5), skin); sp.position.set(-1.6 + i * 0.6, 2.8, 0); sp.rotation.z = 0.4; this.group.add(sp); }
    const dorsal = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16, 0, Math.PI), finM); dorsal.position.set(-0.4, 2.3, 0); dorsal.scale.set(1.3, 0.8, 1); this.group.add(dorsal);
    for (const z of [1, -1]) { const pf = new THREE.Mesh(new THREE.CircleGeometry(1.2, 14), finM); pf.scale.set(1.2, 0.6, 1); pf.position.set(0.6, -0.8, z * 2.2); pf.rotation.set(z * 0.6, 0, -0.5); this.group.add(pf); }
    // lantern on a curved stalk
    const stalk = new THREE.Group(); this.group.add(stalk); this.stalk = stalk;
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(1.2, 2.4, 0), new THREE.Vector3(2.2, 4.4, 0), new THREE.Vector3(3.6, 4.6, 0), new THREE.Vector3(4.1, 3.9, 0)]);
    stalk.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.09, 6, false), skin));
    this.lantern = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), glow(0x80fff0, 4)); this.lantern.userData.keep = true; this.group.add(this.lantern);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), new THREE.MeshBasicMaterial({ color: 0x80fff0, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false })); this.lantern.add(halo);
    const tail = new THREE.Group(); tail.position.x = -3.4; this.group.add(tail); this.tail = tail;
    for (const z of [1, -1]) { const lobe = new THREE.Mesh(new THREE.CircleGeometry(1.6, 14), finM); lobe.scale.set(1.4, 0.7, 1); lobe.position.set(-1.4, z * 0.9, 0); lobe.rotation.z = z * 0.5; tail.add(lobe); }
    const stem = new THREE.Mesh(gradGeo(new THREE.ConeGeometry(1.2, 2.2, 12), 0x14304a, 0x3a6a7a), skin); stem.rotation.z = Math.PI / 2; stem.position.x = -0.6; tail.add(stem);
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
      if (this.rage) { this.orbT = (this.orbT ?? 1.2) - h; if (this.orbT <= 0) { this.orbT = 1.6; const L = this.lanternPos(), dx = p.s - L.s, dy = p.y + 0.6 - L.y, d = Math.hypot(dx, dy) || 1; this.spawnProjectile(L.s, L.y, dx / d * 7, dy / d * 7, 0.4, 0x80fff0, 0, 3.5); this.game.audio.play('notice'); } }
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
    // the Storm Heron: storm-white plumage fading to slate, an S-curved neck, a crackling crest, layered wings
    const plume = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color(0xc0d8ff), emissive: 0x0a0c18 });
    const fm = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide });
    const feather = (len, wid, top, bot) => { const m = new THREE.Mesh(gradGeo(new THREE.SphereGeometry(1, 12, 6), top, bot, 'x'), fm); m.scale.set(len, 0.06, wid); return m; };
    const body = new THREE.Mesh(gradGeo(new THREE.SphereGeometry(1, 24, 16), 0xf2f6ff, 0x5a6a90), plume); body.scale.set(3, 1.4, 1.4); this.group.add(body);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(2.2, 0.6, 0), new THREE.Vector3(3.2, 1.2, 0), new THREE.Vector3(2.9, 2.2, 0), new THREE.Vector3(3.6, 3.0, 0)]);
    const neck = new THREE.Mesh(gradGeo(new THREE.TubeGeometry(curve, 20, 0.38, 10, false), 0xf2f6ff, 0xc0cce8), plume); this.group.add(neck);
    const head = new THREE.Mesh(gradGeo(new THREE.SphereGeometry(0.7, 16, 12), 0xffffff, 0xd0d8f0), plume); head.position.set(3.9, 3.1, 0); this.group.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.22, 2.2, 8), new THREE.MeshPhysicalMaterial({ color: 0xffc040, roughness: 0.3, clearcoat: 0.6 })); beak.rotation.z = -Math.PI / 2; beak.position.set(5.4, 3.0, 0); this.group.add(beak);
    for (const z of [0.42, -0.42]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), glow(0xa0e0ff, 2.5)); e.position.set(4.2, 3.25, z); e.userData.keep = true; this.group.add(e); }
    this.crest = new THREE.Group(); this.crest.position.set(3.5, 3.6, 0); this.group.add(this.crest);
    const crestM = glow(0x80c0ff, 2.2); for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.6 - i * 0.2, 5), crestM); c.position.set(-0.3 - i * 0.25, 0.4, (i - 1.5) * 0.15); c.rotation.z = 1 + i * 0.12; c.userData.keep = true; this.crest.add(c); }
    this.crest.material = this.crest.children[0].material;
    this.wings = [1, -1].map((z) => { const w = new THREE.Group(); w.position.set(0, 0.5, z * 1.2);
      const cov = feather(1.8, 1.6, 0xe8eeff, 0xb8c4e0); cov.position.z = z * 1.6; w.add(cov);
      for (let i = 0; i < 7; i++) { const f = feather(1.9 - i * 0.08, 0.36, 0x3a4a7a, 0xe8eeff); f.position.set(-0.6 - i * 0.2, -0.02 * i, z * (2.4 + i * 0.42)); f.rotation.y = -z * (i * 0.12 - 0.2); w.add(f); }
      this.group.add(w); return w; });
    for (let i = 0; i < 5; i++) { const f = feather(2.2, 0.35, 0xe8eeff, 0x3a4a7a); f.position.set(-4.2, 0.1, (i - 2) * 0.32); f.rotation.y = (i - 2) * 0.18; this.group.add(f); }
    for (const z of [0.5, -0.5]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x3a3a48 })); leg.position.set(-1.6, -1.8, z); leg.rotation.z = 0.9; this.group.add(leg); }
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
      if (this.boltT <= 0) { this.boltT = 1.6 - (3 - this.hp) * 0.35; this.bolts.push({ s: p.s + p.vs * 0.4, t: 0, m: this.makeBolt() }); if (this.rage) for (const o of [-3.2, 3.2]) this.bolts.push({ s: p.s + o, t: -0.25, m: this.makeBolt() }); }
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
