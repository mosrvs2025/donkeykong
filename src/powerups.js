import * as THREE from 'three';
import { surfMat } from './world.js';

// Lumen Blocks you bump from below, and the power-ups they hold:
// Ember Bloom (bouncing fire seeds that burn critters and thorn thickets),
// Frost Lily (bolts that freeze critters into ice you can stand on),
// Bubble Wisp (a shield that pops instead of losing a heart).
// Taking a hit costs your power-up first, the way it should.
const glow = (c, i = 2) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i });
export const POWERS = {
  ember: { name: 'EMBER BLOOM', sub: 'Shift throws fire seeds · burn the brambles', color: 0xff7a30, icon: '🔥' },
  frost: { name: 'FROST LILY', sub: 'Shift freezes critters into ice you can stand on', color: 0x8fe8ff, icon: '❄' },
  bubble: { name: 'BUBBLE WISP', sub: 'a shield that pops instead of a heart', color: 0xb8a0ff, icon: '◯' },
};

export class Powers {
  constructor(game) {
    this.game = game; this.path = game.path; this.power = null; this.cool = 0;
    this.group = new THREE.Group(); game.scene.add(this.group);
    this.shots = []; this.items = []; this.ice = [];
    this.blocks = game.level.blocks.map((o) => {
      const g = new THREE.Group();
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), surfMat('glyph', 0x0a2a28)); cube.castShadow = true; g.add(cube);
      const mark = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), glow(o.block === 'glims' ? 0x80ffb0 : POWERS[o.block].color, 2.2)); mark.position.z = 0.78; g.add(mark);
      const mark2 = mark.clone(); mark2.position.z = -0.78; g.add(mark2);
      this.path.place(g, (o.s0 + o.s1) / 2, o.y0 + 0.75, 0); this.group.add(g);
      return { o, g, cube, mark, marks: [mark, mark2], spent: false, bump: 0, baseY: g.position.y };
    });
    // the shield bubble and fire/frost aura follow Kiri
    this.bubble = new THREE.Mesh(new THREE.SphereGeometry(1.2, 20, 14), new THREE.MeshBasicMaterial({ color: 0xc8b0ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.bubble.visible = false; this.group.add(this.bubble);
  }
  give(kind) {
    const game = this.game, P = POWERS[kind];
    this.power = kind; game.audio.play('mount'); game.audio.play('bloom');
    game.hud.banner(P.name, P.sub, 2.5); game.hud.power(kind);
    game.fx.burst(this.path.world(game.player.s, game.player.y + 1, 0), P.color, 30, 6, 0.7, 0.8, 0);
  }
  lose() {
    const game = this.game, p = game.player;
    game.fx.burst(this.path.world(p.s, p.y + 1, 0), POWERS[this.power].color, 30, 7, 0.7, 0.7, -4);
    game.audio.play(this.power === 'bubble' ? 'splash' : 'dismount');
    this.power = null; game.hud.power(null); p.invuln = 1.5;
  }
  // called by the player when the action button is pressed; returns true if it was used
  tryShoot() {
    const game = this.game, p = game.player;
    if (!this.power || this.power === 'bubble' || p.mount || p.cart || p.inWater || this.cool > 0) return false;
    this.cool = this.power === 'ember' ? 0.28 : 0.45;
    const fire = this.power === 'ember';
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(fire ? 0.28 : 0.24, 0), glow(fire ? 0xff8a30 : 0xbff4ff, 3));
    this.group.add(m);
    this.shots.push({ kind: this.power, m, s: p.s + p.facing * 0.7, y: p.y + 0.9, vs: p.facing * (fire ? 13 : 20) + p.vs * 0.3, vy: fire ? 3 : 0, t: 0, bounces: 0 });
    game.audio.play(fire ? 'roll' : 'tongue');
    return true;
  }
  // Pip's acorn sling (works with or without a power-up)
  shootAcorn() {
    const game = this.game, p = game.player; if (p.inWater) return false;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshStandardMaterial({ color: 0x8a5a2a, roughness: 0.6 }));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5a3a1a })); cap.position.y = 0.05; m.add(cap);
    this.group.add(m); this.shots.push({ kind: 'acorn', m, s: p.s + p.facing * 0.6, y: p.y + 0.8, vs: p.facing * 21 + p.vs * 0.2, vy: 2, t: 0, bounces: 0 });
    game.audio.play('tongue'); return true;
  }
  step(h) {
    const game = this.game, p = game.player, E = game.entities;
    this.cool -= h;
    // bumping a block from below
    if (p.hitCeil && p.ceilSolid && p.ceilSolid.block) {
      const b = this.blocks.find((x) => x.o === p.ceilSolid);
      if (b && !b.spent) this.bumpBlock(b);
      else if (b && b.bump <= 0) { b.bump = 0.5; game.audio.play('land'); }
    }
    // shots
    for (const sh of this.shots) {
      sh.t += h;
      if (sh.kind === 'acorn') sh.vy -= 9 * h;
      if (sh.kind === 'ember') {
        sh.vy -= 38 * h;
        const g = E.groundUnder(sh.s, sh.y + 0.3);
        if (sh.vy < 0 && sh.y + sh.vy * h <= g + 0.28) { sh.y = g + 0.28; sh.vy = 9; sh.bounces++; }
      }
      sh.s += sh.vs * h; sh.y += sh.vy * h;
      // walls stop shots; thorn thickets burn
      for (const o of E.solids) {
        if (!o.active || o.oneway || sh.s < o.s0 || sh.s > o.s1 || sh.y < o.y0 || sh.y > o.y1) continue;
        if (o.crack === 'fire' && sh.kind === 'ember') { E.breakSolid(o); game.fx.burst(this.path.world(sh.s, sh.y, 0), 0xff7a30, 40, 8, 0.8, 1, 2); game.hud.toast('The brambles burn away!', 2); }
        sh.dead = true; break;
      }
      for (const e of E.enemies) {
        if (sh.dead || !e.alive || e.frozen > 0) continue;
        if (Math.abs(e.s - sh.s) < e.hw + 0.3 && sh.y > e.y - 0.2 && sh.y < e.y + e.h + 0.3) {
          if (sh.kind === 'ember') E.killEnemy(e, Math.sign(sh.vs) * 5, 9);
          else if (sh.kind === 'acorn') { if (e.kind === 'spikeback') e.stun = 2; else E.killEnemy(e, Math.sign(sh.vs) * 4, 8); game.audio.play('stomp', 1); }
          else this.freeze(e);
          sh.dead = true;
        }
      }
      if (sh.t > (sh.kind === 'ember' ? 2.4 : sh.kind === 'acorn' ? 0.7 : 1.1) || sh.bounces > 4) sh.dead = true;
      if (sh.dead) { game.fx.burst(this.path.world(sh.s, sh.y, 0), sh.kind === 'ember' ? 0xff9a40 : sh.kind === 'acorn' ? 0xc8a070 : 0xcff8ff, 10, 4, 0.5, 0.4, 0); this.group.remove(sh.m); }
    }
    this.shots = this.shots.filter((x) => !x.dead);
    // frozen critters thaw
    for (const ic of this.ice) {
      ic.t -= h;
      if (ic.t < 1.2) ic.m.position.x += Math.sin(ic.t * 60) * 0.01;
      if (ic.t <= 0) { ic.sol.active = false; this.group.remove(ic.m); ic.e.frozen = 0; game.fx.burst(this.path.world(ic.e.s, ic.e.y + 0.6, 0), 0xcff8ff, 16, 5, 0.5, 0.5, -8); game.audio.play('crumble'); ic.dead = true; }
    }
    this.ice = this.ice.filter((x) => !x.dead);
    // power-up items rising out of blocks, then waiting to be grabbed
    for (const it of this.items) {
      it.t += h;
      if (it.t < 0.6) it.y += h * 3;
      else { // float down beside the block, and drift toward Kiri when close
        const ds = p.s - it.s, dy = p.y + 0.8 - it.y;
        if (Math.hypot(ds, dy) < 9) { it.s += ds * h * 2.5; it.y += dy * h * 2.5; } // drifts down to Kiri
        else { const g = this.game.entities.groundUnder(it.s, it.y) + 0.6; if (it.y > g) it.y = Math.max(g, it.y - h * 4); }
      }
      if (Math.abs(it.s - p.s) < 1 + p.hw && it.y > p.y - 0.8 && it.y < p.y + p.h + 0.6 && p.state === 'normal') { this.give(it.kind); it.dead = true; this.group.remove(it.m); }
    }
    this.items = this.items.filter((x) => !x.dead);
  }
  bumpBlock(b) {
    const game = this.game;
    b.spent = true; b.bump = 0.5; game.audio.play('stomp', 3); game.shake(0.15);
    b.marks.forEach((m) => { m.material = glow(0x303838, 0.3); });
    const s = (b.o.s0 + b.o.s1) / 2, y = b.o.y1;
    if (b.o.block === 'glims') { game.addGlims(5, this.path.world(s, y + 0.5, 0)); game.fx.burst(this.path.world(s, y + 0.5, 0), 0x9fffc0, 20, 5, 0.5, 0.7, -8); game.audio.play('glim', 4); return; }
    const kind = b.o.block, P = POWERS[kind];
    const m = new THREE.Group();
    const petals = new THREE.MeshStandardMaterial({ color: P.color, emissive: P.color, emissiveIntensity: 1.2 });
    for (let i = 0; i < 5; i++) { const pt = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), petals); pt.scale.set(1, 0.3, 0.6); const a = i / 5 * Math.PI * 2; pt.position.set(Math.cos(a) * 0.28, 0, Math.sin(a) * 0.28); pt.rotation.y = -a; m.add(pt); }
    m.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glow(0xffffff, 2)));
    this.group.add(m);
    this.items.push({ kind, m, s, y: y - 0.3, t: 0 });
  }
  freeze(e) {
    const game = this.game;
    e.frozen = 6;
    const m = new THREE.Mesh(new THREE.BoxGeometry(e.hw * 2 + 0.6, e.h + 0.6, 2.2), new THREE.MeshStandardMaterial({ color: 0xcff8ff, transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.1, emissive: 0x2a5a70 }));
    const G = new THREE.Group(); m.position.y = (e.h + 0.6) / 2 - 0.3; G.add(m); this.path.place(G, e.s, e.y, 0); this.group.add(G);
    const sol = { s0: e.s - e.hw - 0.3, s1: e.s + e.hw + 0.3, y0: e.y - 0.3, y1: e.y + e.h + 0.3, active: true, dS: 0, dY: 0 };
    game.entities.solids.push(sol);
    this.ice.push({ e, m: G, sol, t: 6 });
    game.audio.play('tongue'); game.fx.burst(this.path.world(e.s, e.y + 0.6, 0), 0xcff8ff, 20, 5, 0.6, 0.6, 0);
  }
  reset() { for (const sh of this.shots) this.group.remove(sh.m); this.shots = []; }
  update(dt, t) {
    const game = this.game, p = game.player;
    for (const b of this.blocks) {
      if (b.bump > 0) b.bump -= dt;
      const k = Math.max(0, b.bump) / 0.5; b.g.position.y = b.baseY + Math.sin(k * Math.PI) * 0.45;
      if (!b.spent) b.marks.forEach((m) => { m.rotation.y = t * 2; m.material.emissiveIntensity = 1.8 + Math.sin(t * 4) * 0.6; });
    }
    for (const sh of this.shots) { this.path.place(sh.m, sh.s, sh.y, 0.2); sh.m.rotation.x += dt * 12; if (sh.kind === 'acorn') sh.m.rotation.z += dt * 20;
      if (sh.kind === 'ember' && Math.random() < dt * 40) game.fx.spawn(this.path.world(sh.s, sh.y, 0.2), new THREE.Vector3(0, 1.5, 0), 0xff9a40, 0.35, 0.3, 0); }
    for (const it of this.items) { this.path.place(it.m, it.s, it.y + Math.sin(t * 3) * 0.1, 0.3); it.m.rotation.y = t * 2; }
    const pw = this.power;
    this.bubble.visible = pw === 'bubble' && p.state !== 'dead';
    if (this.bubble.visible) { this.path.place(this.bubble, p.s, p.y + p.h / 2, 0); this.bubble.scale.setScalar(1 + Math.sin(t * 5) * 0.04); }
    if ((pw === 'ember' || pw === 'frost') && Math.random() < dt * 14) game.fx.spawn(this.path.world(p.s + (Math.random() - 0.5) * 0.8, p.y + Math.random() * p.h, 0.3), new THREE.Vector3(0, 1.2, 0), POWERS[pw].color, 0.3, 0.5, 0);
  }
}
