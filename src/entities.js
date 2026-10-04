import * as THREE from 'three';
import { solidMesh, surfMat } from './world.js';
import { surfaceY } from './physics.js';
import * as Models from './models.js';

const glowMat = (c, i = 2) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i });
const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpM = new THREE.Matrix4(), UP = new THREE.Vector3(0, 1, 0);

export const COMPANIONS = {
  beast: { name: 'GRUMBO', title: 'the Horned Beast', make: Models.makeBeast, tip: '<b>Shift</b>: charge — smash cracked walls & anything in your way' },
  frog: { name: 'BOING', title: 'the Giant Tree Frog', make: Models.makeFrog, tip: 'Huge jumps · jump off walls · <b>Shift</b>: tongue-grapple glowing hookblooms' },
  bird: { name: 'SOLA', title: 'the Gliding Bird', make: Models.makeBird, tip: '<b>Space</b> in air: flap · hold to glide · ride the updrafts! (she tires soon)' },
  fish: { name: 'NUU', title: 'the River Otter', make: Models.makeFish, tip: 'Swim fast · <b>Shift</b>: torpedo dash bursts underwater barriers' },
  oru: { name: 'ORU', title: 'the Ancient', make: Models.makeOru, tip: '<b>Shift</b>: invert gravity. Walk the ceiling. See what the ruins hide.' },
};

export class Entities {
  constructor(game) {
    this.game = game; const { scene, path, level } = game;
    this.scene = scene; this.path = path; this.level = level;
    this.group = new THREE.Group(); scene.add(this.group);
    this.t = 0;
    this.solids = level.solids; this.slopes = level.slopes;
    for (const o of this.solids) { o.active = true; o.bs0 = o.s0; o.bs1 = o.s1; o.by0 = o.y0; o.by1 = o.y1; o.dS = 0; o.dY = 0; }
    this.buildDynamicSolids();
    this.buildGlims();
    this.buildShards();
    this.buildBouncers();
    this.buildVines();
    this.buildCompanions();
    this.buildEnemies();
    this.buildMisc();
  }
  place(obj, s, y, d = 0) { this.path.place(obj, s, y, d); return obj; }
  groundUnder(s, y) {
    let best = -Infinity;
    for (const o of this.solids) if (o.active && s >= o.s0 && s <= o.s1 && o.y1 <= y + 0.6 && o.y1 > best) best = o.y1;
    for (const sl of this.slopes) if (s >= sl.s0 && s <= sl.s1) { const ys = surfaceY(sl, s); if (ys <= y + 0.8 && ys > best) best = ys; }
    return best;
  }
  // ───────── dynamic solids
  buildDynamicSolids() {
    this.dyn = [];
    for (const o of this.solids) {
      if (!(o.move || o.collapse || o.crack || o.echo || o.finale) || o.ghost) continue;
      o.depth = o.collapse ? 3.2 : (o.crack ? 4.6 : 4.2);
      const g = solidMesh(this.path, o);
      if (o.crack) { // visible cracks
        const cm = new THREE.MeshBasicMaterial({ color: 0x1a1008 });
        for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9 + Math.random(), 0.05), cm); c.position.set((Math.random() - 0.5) * 0.8, 0.4 + i * (o.y1 - o.y0) / 5, 2.33); c.rotation.z = (Math.random() - 0.5) * 1.5; g.add(c); }
        if (o.crack === 'swim') g.children[0].material = surfMat('ruin', 0x0a2a30);
        if (o.crack === 'song') { g.clear(); const h = o.y1 - o.y0; for (let i = 0; i < 9; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.45 + Math.random() * 0.4, h * (0.5 + Math.random() * 0.6), 5), new THREE.MeshStandardMaterial({ color: 0x3a1450, emissive: 0x8a20c0, emissiveIntensity: 0.9, flatShading: true, roughness: 0.3 })); sp.position.set((Math.random() - 0.5) * 1.6, h * 0.4, (Math.random() - 0.5) * 3.4); sp.rotation.z = (Math.random() - 0.5) * 0.5; g.add(sp); } const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xff40c0, emissiveIntensity: 2.5 })); core.position.y = h * 0.5; g.add(core); o.core = core; }
      }
      if (o.echo) { const rune = new THREE.Mesh(new THREE.BoxGeometry(o.s1 - o.s0 - 0.4, 0.12, 0.1), glowMat(0x40ffd0, 1)); rune.position.set(0, (o.y1 - o.y0) - 0.1, 2.12); g.add(rune); o.rune = rune; o.cur = 0; }
      if (o.finale) { o.active = false; g.visible = false; }
      this.group.add(g); o.mesh = g; o.t = 0; this.dyn.push(o);
    }
  }
  updateDynamicSolids(dt, player) {
    for (const o of this.dyn) {
      const ps0 = o.s0, py1 = o.y1;
      if (o.move) {
        const m = o.move, k = (1 - Math.cos((this.t / m.period) * Math.PI * 2 + (m.phase || 0) * Math.PI)) / 2;
        o.s0 = o.bs0 + m.ds * k; o.s1 = o.bs1 + m.ds * k; o.y0 = o.by0 + m.dy * k; o.y1 = o.by1 + m.dy * k;
      }
      if (o.echo) {
        const target = this.echoState[o.echo.g] ? 1 : 0;
        o.cur += (target - o.cur) * Math.min(1, dt * 3.5);
        if (Math.abs(target - o.cur) < 0.002) o.cur = target;
        o.y0 = o.by0 + o.echo.dy * o.cur; o.y1 = o.by1 + o.echo.dy * o.cur;
        o.rune.material.emissiveIntensity = 0.6 + o.cur * 2.5;
      }
      if (o.collapse) {
        if (o.state === undefined) o.state = 0;
        if (o.state === 0 && player.grounded && player.ground === o) { o.state = 1; o.t = 0; this.game.audio.play('crumble'); }
        if (o.state === 1) { o.t += dt; o.mesh.children[0].position.x = Math.sin(o.t * 60) * 0.05; if (o.t > 0.42) { o.state = 2; o.active = false; o.t = 0; o.vy = 0; } }
        if (o.state === 2) { o.t += dt; o.vy -= 30 * dt; o.mesh.position.y += o.vy * dt; o.mesh.rotation.z += dt * 0.8; if (o.t > 4 && Math.abs(player.s - (o.s0 + o.s1) / 2) > 12) { o.state = 0; o.active = true; o.mesh.rotation.z = 0; o.mesh.children[0].position.x = 0; } }
        if (o.state === 0) this.path.place(o.mesh, (o.s0 + o.s1) / 2, o.y0);
      }
      if (o.crack && !o.active && o.mesh.visible) { o.mesh.visible = false; }
      if (o.core) o.core.rotation.y += dt * 2;
      o.dS = o.s0 - ps0; o.dY = o.y1 - py1;
      if ((o.move || o.echo) && o.mesh) this.path.place(o.mesh, (o.s0 + o.s1) / 2, o.y0);
    }
  }
  breakSolid(o) {
    if (!o.active) return;
    o.active = false; o.mesh.visible = false;
    const c = this.path.world((o.s0 + o.s1) / 2, (o.y0 + o.y1) / 2, 0);
    this.game.fx.burst(c, o.crack === 'song' ? 0xd070ff : 0xb8a078, 40, 12, 1.2, 1.1, -20);
    this.game.fx.burst(c, 0xffffff, 16, 8, 0.8, 0.5, 0);
    this.game.audio.play('smash'); this.game.shake(0.6);
    // debris chunks
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.4, 0), surfMat(o.crack === 'swim' ? 'ruin' : 'stone'));
      m.position.copy(c).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3));
      const v = new THREE.Vector3((Math.random() - 0.2) * 10, Math.random() * 10, (Math.random() - 0.5) * 8);
      this.group.add(m); this.debris.push({ m, v, t: 0, water: o.crack === 'swim' });
    }
  }
  // ───────── glims (common collectible)
  buildGlims() {
    const geo = new THREE.SphereGeometry(0.22, 10, 8); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0) { const k = 1 - y / 0.22 * 0.75; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); p.setY(i, y * 1.9); } }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0xb8ffd0, emissive: 0x60ffa0, emissiveIntensity: 1.6, roughness: 0.2 });
    this.glims = this.level.glims.map((g) => ({ ...g, taken: false, ph: Math.random() * 6, p: this.path.world(g.s, g.y, 0), yaw: this.path.yaw(g.s) }));
    this.glimMesh = new THREE.InstancedMesh(geo, mat, this.glims.length);
    this.glimMesh.frustumCulled = false; this.group.add(this.glimMesh);
    this.totalGlims = this.glims.length;
  }
  updateGlims(dt) {
    const t = this.t;
    for (let i = 0; i < this.glims.length; i++) {
      const g = this.glims[i];
      if (g.taken) { g.k = Math.max(0, (g.k ?? 1) - dt * 5); }
      const sc = g.taken ? g.k : 1;
      tmpV.copy(g.p); tmpV.y += Math.sin(t * 3 + g.ph) * 0.12 + (g.taken ? (1 - g.k) * 1.5 : 0);
      tmpQ.setFromAxisAngle(UP, t * 2.5 + g.ph);
      tmpS.setScalar(sc * (1 + (g.taken ? (1 - g.k) : 0)));
      tmpM.compose(tmpV, tmpQ, tmpS); this.glimMesh.setMatrixAt(i, tmpM);
    }
    this.glimMesh.instanceMatrix.needsUpdate = true;
  }
  // ───────── Sun Shards (relics)
  buildShards() {
    this.shards = this.level.shards.map((sd) => {
      const g = new THREE.Group();
      const col = sd.star ? 0xc080ff : 0xffc040;
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.4, metalness: 0.6, roughness: 0.15, flatShading: true }));
      gem.scale.y = 1.5; g.add(gem);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 6, 30), glowMat(col, 2)); g.add(halo);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 30, 10, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 15; g.add(beam);
      this.place(g, sd.s, sd.y); this.group.add(g);
      return { ...sd, g, gem, halo, taken: false };
    });
  }
  // ───────── bounce plants
  buildBouncers() {
    this.bouncers = this.level.bouncers.map((b) => {
      const g = new THREE.Group(); const top = new THREE.Group(); g.add(top);
      if (b.kind === 'shroom') {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x40d0ff, emissive: 0x2080ff, emissiveIntensity: 1.2 })); cap.scale.y = 0.6; cap.position.y = 0.7; top.add(cap);
        for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), glowMat(0xffffff, 2)); const a = i; d.position.set(Math.cos(a) * 0.7, 1.2, Math.sin(a) * 0.7); top.add(d); }
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0xd8e0f0 })); st.position.y = 0.35; g.add(st);
      } else {
        const petalM = new THREE.MeshStandardMaterial({ color: 0xff5a8a, roughness: 0.5, emissive: 0x401020 });
        for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 6), petalM); p.scale.set(1, 0.25, 0.55); const a = i / 6 * Math.PI * 2; p.position.set(Math.cos(a) * 0.6, 0.55, Math.sin(a) * 0.6); p.rotation.y = -a; p.rotation.z = 0.3; top.add(p); }
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffd040, emissive: 0x805000 })); c.scale.y = 0.5; c.position.y = 0.65; top.add(c);
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0x3a8a30 })); st.position.y = 0.3; g.add(st);
      }
      this.place(g, b.s, b.y); this.group.add(g); if (b.finale) g.visible = false;
      return { ...b, g, top, squash: 0, hidden: !!b.finale };
    });
  }
  // ───────── vines
  buildVines() {
    const vm = new THREE.MeshStandardMaterial({ color: 0x4a7a28, roughness: 0.9 });
    const lm = new THREE.MeshStandardMaterial({ color: 0x5aa03a, side: THREE.DoubleSide });
    this.vines = this.level.vines.map((v) => {
      const pivotG = new THREE.Group(); this.place(pivotG, v.s, v.y);
      const swing = new THREE.Group(); pivotG.add(swing);
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, v.len, 6), vm); rope.position.y = -v.len / 2; swing.add(rope);
      for (let i = 0; i < 8; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), lm); l.position.set(0.1, -i * v.len / 8 - 0.3, 0); l.rotation.set(0, i, 0.6); swing.add(l); }
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 26, 7), surfMat('bark')); top.rotation.x = Math.PI / 2; top.position.z = -9; pivotG.add(top);
      for (let i = 0; i < 4; i++) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + Math.random(), 0), new THREE.MeshStandardMaterial({ color: 0x3a7a2a, flatShading: true })); lf.position.set((Math.random() - 0.5) * 2, 0.4, -2 - i * 4); pivotG.add(lf); }
      this.group.add(pivotG);
      return { ...v, pivotG, swing, ang: 0, av: 0, cool: 0 };
    });
  }
  // ───────── companions (cages + idle waiting + ridden)
  buildCompanions() {
    this.companions = this.level.cages.map((c) => {
      const def = COMPANIONS[c.kind];
      const model = def.make(); this.group.add(model);
      const cage = new THREE.Group();
      const barM = new THREE.MeshStandardMaterial({ color: 0x7a5a30, roughness: 1 });
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 5), barM); bar.position.set(Math.cos(a) * 1.5, 1.5, Math.sin(a) * 1.5); cage.add(bar); }
      for (const y of [0.1, 3]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.14, 6, 20), barM); ring.rotation.x = Math.PI / 2; ring.position.y = y; cage.add(ring); }
      const emb = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), glowMat(0x40ffd0, 1.8)); emb.position.set(0, 3.3, 0); emb.rotation.x = -Math.PI / 2; cage.add(emb);
      const lid = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.2, 10), new THREE.MeshStandardMaterial({ color: 0x5a3a18 })); lid.position.y = 3.6; cage.add(lid);
      this.place(cage, c.s, c.y); this.group.add(cage);
      this.place(model, c.s, c.y);
      return { kind: c.kind, def, model, cage, s: c.s, y: c.y, homeS: c.s, homeY: c.y, state: 'caged', t: 0, facing: 1 };
    });
  }
  // ───────── enemies
  buildEnemies() {
    const make = { snapjaw: Models.makeSnapjaw, spikeback: Models.makeSpikeback, buzzmoth: Models.makeBuzzmoth, eel: Models.makeEel, jelly: makeJelly };
    this.enemies = this.level.enemies.map((e) => {
      const model = make[e.kind](); this.group.add(model);
      const size = { snapjaw: [0.55, 1.0], spikeback: [0.6, 1.1], buzzmoth: [0.55, 0.9], eel: [1.3, 0.8], jelly: [0.8, 1.3] }[e.kind];
      this.place(model, e.s, e.y);
      return { ...e, model, homeS: e.s, homeY: e.y, dir: 1, alive: true, hw: size[0], h: size[1], t: Math.random() * 6, dead: 0, vy: 0, stun: 0 };
    });
  }
  resetEnemies(all) {
    for (const e of this.enemies) { if (!e.alive && (all || e.dead > 1.5)) { e.alive = true; e.s = e.homeS; e.y = e.homeY; e.dead = 0; e.model.visible = true; e.model.rotation.set(0, 0, 0); e.model.scale.setScalar(1); } }
  }
  updateEnemies(dt) {
    const pl = this.game.player;
    for (const e of this.enemies) {
      const m = e.model, ud = m.userData;
      if (!e.alive) {
        e.dead += dt; e.vy -= 40 * dt; e.y += e.vy * dt; e.s += e.dvs * dt;
        this.place(m, e.s, e.y); m.rotation.z = e.dead * 8 * -e.dvs * 0.1; m.rotation.x = e.dead * 6; m.scale.setScalar(Math.max(0, 1 - e.dead * 0.6));
        if (e.dead > 1.5) m.visible = false;
        continue;
      }
      if (Math.abs(e.s - pl.s) > 90 || e.frozen > 0) continue; // sleep far away (or frozen solid)
      e.t += dt;
      if (ud.anim) { const dx = pl.s - e.s, dy = pl.y + 0.8 - e.y; ud.anim(e.t, dt, { near: Math.hypot(dx, dy) < 7, lookX: dx, lookY: THREE.MathUtils.clamp(dy / 5, -1, 1) * Math.sign(dx * (e.dir || 1)) }); }
      if (e.stun > 0) { e.stun -= dt; }
      if (e.kind === 'snapjaw' || e.kind === 'spikeback') {
        const sp = e.kind === 'snapjaw' ? 2.6 : 1.5;
        if (e.stun <= 0 && e.range > 0.2) {
          e.s += e.dir * sp * dt;
          const ahead = e.s + e.dir * (e.hw + 0.2);
          const g = this.groundUnder(ahead, e.y);
          if (Math.abs(e.s - e.homeS) > e.range / 2 || g < e.y - 0.5) { e.dir *= -1; e.s += e.dir * sp * dt * 2; }
        }
        // stay on (possibly moving) ground
        const g2 = this.groundUnder(e.s, e.y + 0.5); if (g2 > -1e6 && Math.abs(g2 - e.y) < 1) e.y = g2;
        this.place(m, e.s, e.y); m.rotation.y += e.dir < 0 ? Math.PI : 0;
        const w = e.t * (e.kind === 'snapjaw' ? 14 : 9);
        ud.legs.forEach((l, i) => l.rotation.z = Math.sin(w + i * Math.PI) * 0.6);
        ud.body.position.y = Math.abs(Math.sin(w)) * 0.06;
        if (ud.jaw) { const o = Math.max(0, Math.sin(e.t * 5)) * 0.5; ud.jaw.rotation.z = -o; ud.top.rotation.z = o * 0.6; }
        if (e.stun > 0) m.rotation.z = Math.PI * 0.9;
      } else if (e.kind === 'buzzmoth') {
        e.y = e.homeY + Math.sin(e.t * 2.2) * e.range; e.s = e.homeS + Math.sin(e.t * 0.9) * 1.2 * Math.min(1, e.range);
        this.place(m, e.s, e.y - 0.3);
        const face = Math.cos(e.t * 0.9) > 0 ? 0 : Math.PI; m.rotation.y += face + (pl.s < e.s ? Math.PI : 0) * 0;
        ud.wings.forEach((w, i) => w.rotation.x = Math.sin(e.t * 40) * 0.9 * (i ? -1 : 1));
      } else if (e.kind === 'jelly') {
        e.y = e.homeY + Math.sin(e.t * 1.1) * e.range; e.s = e.homeS + Math.sin(e.t * 0.4) * 1.5;
        this.place(m, e.s, e.y); const pulse = 1 + Math.sin(e.t * 4) * 0.12; ud.body.scale.set(pulse, 2 - pulse, pulse);
        ud.legs.forEach((l, i) => l.rotation.z = Math.sin(e.t * 4 + i) * 0.3);
      } else if (e.kind === 'eel') {
        const ph = e.t * 0.7; e.s = e.homeS + Math.sin(ph) * e.range; e.y = e.homeY + Math.sin(e.t * 2) * 0.6;
        this.place(m, e.s, e.y); m.rotation.y += Math.cos(ph) > 0 ? 0 : Math.PI;
        ud.segs.forEach((sg, i) => sg.rotation.y = Math.sin(e.t * 6 - i * 0.8) * 0.4);
      }
    }
  }
  killEnemy(e, dvs = 3, vy = 10) {
    if (!e.alive) return;
    e.alive = false; e.dead = 0; e.vy = vy; e.dvs = dvs;
    const p = this.path.world(e.s, e.y + 0.5, 0);
    this.game.fx.burst(p, 0xffe070, 14, 7, 0.7, 0.6, -10);
    this.game.fx.burst(p, 0xffffff, 6, 4, 1.0, 0.25, 0);
    this.game.stats.enemies++;
  }
  // ───────── misc: checkpoints, portals, grapples, updrafts, blooms, totems, carts, chase, altar
  buildMisc() {
    this.debris = [];
    this.echoState = {};
    // checkpoints: Sunwright beacons
    this.checkpoints = this.level.checkpoints.map((c) => {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 3, 6), new THREE.MeshStandardMaterial({ color: 0x8a7a50, metalness: 0.6, roughness: 0.4 })); pole.position.y = 1.5; g.add(pole);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), new THREE.MeshStandardMaterial({ color: 0x405060, emissive: 0x000000 })); gem.position.y = 3.3; g.add(gem);
      this.place(g, c.s, c.y, -2.2); this.group.add(g);
      return { ...c, g, gem, on: false };
    });
    // portals
    this.portals = this.level.portals.map((p) => {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.15, 8, 40), glowMat(p.kind === 'sky' ? 0xffd070 : 0x70e0ff, 2.5)); g.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), new THREE.ShaderMaterial({ transparent: true, uniforms: { t: { value: 0 } }, depthWrite: false,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform float t; varying vec2 vUv; void main(){ vec2 c = vUv - 0.5; float r = length(c); float a = atan(c.y, c.x); float sw = sin(a * 5.0 + r * 20.0 - t * 5.0) * 0.5 + 0.5; vec3 col = mix(vec3(1.0,0.8,0.4), vec3(0.4,0.9,1.0), sw); gl_FragColor = vec4(col, (1.0 - r * 2.0) * 0.9); }' }));
      g.add(disc);
      this.place(g, p.s, p.y + 0.8, 0); this.group.add(g);
      return { ...p, g, disc };
    });
    // grapple hookblooms
    this.grapples = this.level.grapples.map((gp) => {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), glowMat(0xff70c0, 2)); g.add(core);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.06, 6, 24), glowMat(0xff70c0, 1.5)); g.add(ring);
      for (let i = 0; i < 5; i++) { const pt = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.7, 4), new THREE.MeshStandardMaterial({ color: 0x40a040 })); const a = i / 5 * Math.PI * 2; pt.position.set(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0); pt.rotation.z = a - Math.PI / 2; g.add(pt); }
      this.place(g, gp.s, gp.y); this.group.add(g); if (gp.bondOnly) g.visible = false;
      return { ...gp, g, ring, hidden: !!gp.bondOnly };
    });
    // updraft columns
    this.updrafts = this.level.updrafts.map((u) => {
      const h = u.y1 - u.y0;
      const m = new THREE.Mesh(new THREE.CylinderGeometry((u.s1 - u.s0) / 2, (u.s1 - u.s0) / 2 * 1.3, h, 16, 1, true), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform float t; varying vec2 vUv; void main(){ float s = sin(vUv.x * 40.0 + vUv.y * 10.0 - t * 8.0) * 0.5 + 0.5; float a = s * 0.12 * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.7, vUv.y); gl_FragColor = vec4(0.8, 1.0, 0.95, a); }' }));
      const g = new THREE.Group(); m.position.y = h / 2; g.add(m); this.place(g, (u.s0 + u.s1) / 2, u.y0); this.group.add(g);
      return { ...u, m };
    });
    // lumen blooms + their light bridges
    this.blooms = this.level.blooms.map((b) => {
      const g = new THREE.Group();
      const petals = [];
      for (let i = 0; i < 8; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 6), new THREE.MeshStandardMaterial({ color: 0xa0fff0, emissive: 0x40d0c0, emissiveIntensity: 0.6, transparent: true, opacity: 0.9 })); p.scale.set(1, 0.2, 0.4); const a = i / 8 * Math.PI * 2; p.position.set(Math.cos(a) * 0.7, 1.4, Math.sin(a) * 0.7); p.rotation.y = -a; p.rotation.z = 0.6; g.add(p); petals.push(p); }
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), glowMat(0xffffff, 2)); core.position.y = 1.5; g.add(core);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.4, 6), new THREE.MeshStandardMaterial({ color: 0x2a8a60 })); st.position.y = 0.7; g.add(st);
      this.place(g, b.s, b.y); this.group.add(g);
      const pieces = [];
      const n = Math.ceil((b.b1 - b.b0) / 3);
      for (let i = 0; i < n; i++) {
        const s0 = b.b0 + i * (b.b1 - b.b0) / n, s1 = b.b0 + (i + 1) * (b.b1 - b.b0) / n;
        const sol = { s0: s0 - 0.1, s1: s1 + 0.1, y0: b.by - 0.4, y1: b.by, active: false, mat: 'glyph', dS: 0, dY: 0, bloom: true };
        this.solids.push(sol);
        const pm = new THREE.Mesh(new THREE.BoxGeometry(s1 - s0 - 0.15, 0.35, 3), new THREE.MeshStandardMaterial({ color: 0x80fff0, emissive: 0x40e0d0, emissiveIntensity: 1.4, transparent: true, opacity: 0.8 }));
        const pg = new THREE.Group(); pm.position.y = -0.2; pg.add(pm); this.place(pg, (s0 + s1) / 2, b.by); pg.visible = false; this.group.add(pg);
        pieces.push({ sol, pg, pm, delay: i * 0.09 });
      }
      return { ...b, g, petals, core, pieces, timer: -1 };
    });
    // echo totems
    this.totems = this.level.totems.map((t) => {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.2, 1.4), surfMat('glyph', 0x0a2a28)); b.position.y = 1.6; b.castShadow = true; g.add(b);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), glowMat(0x40ffd0, 1)); face.position.set(0, 2.2, 0.72); g.add(face);
      const topm = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.8, 4), surfMat('glyph')); topm.position.y = 3.6; topm.rotation.y = Math.PI / 4; g.add(topm);
      this.place(g, t.s, t.y, -0.2); this.group.add(g);
      this.echoState[t.group] = false;
      return { ...t, g, face, cool: 0 };
    });
    // mine carts
    this.carts = this.level.carts.map((c) => {
      const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
      const iron = new THREE.MeshStandardMaterial({ color: 0x6a5040, metalness: 0.6, roughness: 0.5 });
      const tub = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 1.8), iron); tub.position.y = 0.9; body.add(tub);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 2.0), new THREE.MeshStandardMaterial({ color: 0xc09040, metalness: 0.8, roughness: 0.3 })); rim.position.y = 1.45; body.add(rim);
      const wheels = []; for (const [x, z] of [[0.7, 0.95], [-0.7, 0.95], [0.7, -0.95], [-0.7, -0.95]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.15, 12), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8 })); w.rotation.x = Math.PI / 2; w.position.set(x, 0.32, z); body.add(w); wheels.push(w); }
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), glowMat(0xffc060, 3)); lamp.position.set(1.15, 1.2, 0); body.add(lamp);
      this.place(g, c.s, c.y); this.group.add(g);
      return { ...c, g, body, wheels, homeS: c.s, homeY: c.y, used: false };
    });
    // chase boulder
    this.chases = this.level.chases.map((c) => {
      const R = 4.2;
      const g = new THREE.Group();
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(R, 2), new THREE.MeshStandardMaterial({ map: surfMat('temple').map, roughness: 0.9, flatShading: true, emissive: 0x201000 }));
      const pp = rock.geometry.attributes.position; for (let i = 0; i < pp.count; i++) { const k = 1 + (Math.sin(i * 7.3) * 0.5 + 0.5) * 0.08; pp.setXYZ(i, pp.getX(i) * k, pp.getY(i) * k, pp.getZ(i) * k); } rock.geometry.computeVertexNormals();
      rock.castShadow = true; g.add(rock);
      const band = new THREE.Mesh(new THREE.TorusGeometry(R * 1.02, 0.25, 6, 40), glowMat(0xffa030, 2.5)); rock.add(band);
      g.visible = false; this.group.add(g);
      return { ...c, maxSpeed: c.speed, R, g, rock, state: 'idle', s: c.start, y: -20, vy: 0, speed: 0, roll: 0 };
    });
    // altar & Lumen Seed
    if (this.level.altar) {
      const a = this.level.altar; const g = new THREE.Group();
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 1.6, 8), surfMat('temple')); ped.position.y = 0.8; g.add(ped);
      const seed = new THREE.Group(); seed.position.y = 3;
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 2), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe080, emissiveIntensity: 3 })); seed.add(core);
      for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 6), new THREE.MeshStandardMaterial({ color: 0x70ffc0, emissive: 0x30c080, emissiveIntensity: 1.5 })); p.scale.set(0.3, 1, 0.5); const ang = i / 6 * Math.PI * 2; p.position.set(Math.cos(ang) * 0.8, 0, Math.sin(ang) * 0.8); p.rotation.z = Math.cos(ang) * -0.5; p.rotation.x = Math.sin(ang) * 0.5; seed.add(p); }
      g.add(seed);
      this.place(g, a.s, a.y); this.group.add(g);
      this.altar = { ...a, g, seed, done: false };
    }
  }
  toggleTotem(t) {
    if (t.cool > 0) return;
    t.cool = 1.0;
    this.echoState[t.group] = !this.echoState[t.group];
    this.game.audio.play('flip'); this.game.shake(0.4);
    const p = this.path.world(t.s, t.y + 2, 0);
    this.game.fx.burst(p, 0x40ffd0, 40, 10, 0.8, 1, 0);
    this.game.stats.echo = true;
  }
  triggerBloom(b) {
    if (b.timer < 0) this.game.audio.play('bloom');
    b.timer = 0;
  }
  update(dt) {
    this.t += dt;
    const t = this.t, pl = this.game.player;
    this.updateDynamicSolids(dt, pl);
    this.updateGlims(dt);
    this.updateEnemies(dt);
    for (const s of this.shards) {
      if (s.taken) { s.k = (s.k || 0) + dt; s.g.scale.setScalar(Math.max(0, 1 - s.k * 1.5)); s.g.position.y += dt * 4; continue; }
      s.gem.rotation.y = t * 2; s.halo.rotation.x = t * 1.3; s.halo.rotation.y = t * 0.7; s.gem.position.y = Math.sin(t * 2) * 0.15;
    }
    for (const b of this.bouncers) { b.squash = Math.max(0, b.squash - dt * 4); const k = Math.sin(b.squash * 12) * b.squash; b.top.scale.set(1 + k * 0.4, 1 - k * 0.6, 1 + k * 0.4); }
    for (const v of this.vines) {
      if (!v.held) { v.av += -Math.sin(v.ang) * 40 / v.len * dt; v.av *= 0.99; v.ang += v.av * dt; v.ang += (Math.sin(t * 0.8 + v.s) * 0.05 - v.ang) * dt * 0.5; }
      v.swing.rotation.z = v.ang; v.cool = Math.max(0, v.cool - dt);
    }
    for (const c of this.checkpoints) if (c.on) { c.gem.rotation.y = t * 2; }
    for (const p of this.portals) { p.disc.material.uniforms.t.value = t; p.g.children[0].rotation.z = t; }
    for (const g of this.grapples) { g.ring.rotation.z = t * 2; const near = pl.mount === 'frog' && Math.hypot(g.s - pl.s, g.y - pl.y) < 11.5; g.ring.scale.setScalar(near ? 1.3 + Math.sin(t * 10) * 0.1 : 1); g.ring.material.emissiveIntensity = near ? 4 : 1.5; }
    for (const u of this.updrafts) {
      u.m.material.uniforms.t.value = t;
      if (Math.abs(pl.s - u.s0) < 60 && Math.random() < dt * 30) {
        const p = this.path.world(u.s0 + Math.random() * (u.s1 - u.s0), u.y0 + Math.random() * 4, (Math.random() - 0.5) * 3);
        this.game.fx.spawn(p, new THREE.Vector3(0, 12 + Math.random() * 6, 0), 0xe0fff0, 0.35, 1.8, 0);
      }
    }
    for (const b of this.blooms) {
      b.core.material.emissiveIntensity = 1.5 + Math.sin(t * 4) * 0.8;
      b.petals.forEach((p, i) => p.rotation.x = Math.sin(t * 2 + i) * 0.2);
      if (b.timer >= 0) {
        b.timer += dt;
        const life = 7.5;
        for (const pc of b.pieces) {
          const on = b.timer >= pc.delay && b.timer < life + pc.delay;
          if (on && !pc.sol.active) { pc.sol.active = true; pc.pg.visible = true; pc.pm.scale.set(0.01, 1, 0.01); const w = this.path.world((pc.sol.s0 + pc.sol.s1) / 2, pc.sol.y1, 0); this.game.fx.burst(w, 0x80fff0, 5, 3, 0.5, 0.5, 0); }
          if (pc.sol.active) { const k = Math.min(1, pc.pm.scale.x + dt * 6); pc.pm.scale.set(k, 1, k); const rem = life + pc.delay - b.timer; pc.pm.visible = rem > 2 || Math.sin(b.timer * 30) > 0; }
          if (!on && pc.sol.active && b.timer > pc.delay) { pc.sol.active = false; pc.pg.visible = false; }
        }
        if (b.timer > life + 3) b.timer = -1;
      }
    }
    for (const tt of this.totems) { tt.cool = Math.max(0, tt.cool - dt); tt.face.material.emissiveIntensity = (this.echoState[tt.group] ? 3 : 1) + Math.sin(t * 3) * 0.4; }
    for (const c of this.companions) this.updateCompanion(c, dt);
    for (const d of this.debris) { d.t += dt; d.v.y -= (d.water ? 6 : 30) * dt; d.v.multiplyScalar(d.water ? 0.96 : 1); d.m.position.addScaledVector(d.v, dt); d.m.rotation.x += dt * 3; if (d.t > 2.5) d.m.visible = false; }
    this.debris = this.debris.filter((d) => d.t <= 2.5 || (this.group.remove(d.m), false));
    for (const c of this.chases) this.updateChase(c, dt);
    if (this.altar && !this.altar.done) { this.altar.seed.rotation.y = t; this.altar.seed.position.y = 3 + Math.sin(t * 1.5) * 0.25; }
    if (this.game.world.colossus) {
      const col = this.game.world.colossus, inside = pl.s > 960 + 80 && pl.s < 1046 + 80 && pl.y > 12.5;
      col.open += ((inside ? 1 : 0) - col.open) * dt * 0.8;
    }
  }
  updateCompanion(c, dt) {
    c.t += dt;
    const ud = c.model.userData; if (c.state !== 'ridden') ud.anim?.(c.t, dt);
    if (c.state === 'caged') {
      this.place(c.model, c.s, c.y + 0.1); ud.body.position.y = Math.abs(Math.sin(c.t * 3)) * 0.1;
      c.model.rotation.y += Math.sin(c.t * 0.7) * 0.6;
      c.cage.rotation.y = this.path.yaw(c.s) + Math.sin(c.t * 2) * 0.03;
      if (c.kind === 'oru') { ud.rings.forEach((r, i) => { r.rotation.x = c.t * (1 + i); r.rotation.y = c.t * 0.7; }); ud.body.position.y = 0.3 + Math.sin(c.t * 2) * 0.2; }
    } else if (c.state === 'idle') {
      this.place(c.model, c.s, c.y); ud.body.position.y = Math.abs(Math.sin(c.t * 2.5)) * 0.15 + Math.sin((c.hop || 0) * Math.PI) * 0.8; c.model.rotation.y += c.facing < 0 ? Math.PI : 0;
      if (ud.head) ud.head.rotation.y = Math.sin(c.t * 0.8) * 0.4;
      if (c.kind === 'oru') ud.rings.forEach((r, i) => { r.rotation.x = c.t * (1 + i); r.rotation.y = c.t * 0.7; });
    } else if (c.state === 'fleeing') {
      c.s += c.fleeDir * 11 * dt; c.fy += c.fvy * dt; c.fvy -= 25 * dt; if (c.fy < c.y) { c.fy = c.y; c.fvy = 6; }
      this.place(c.model, c.s, c.fy, 2 * c.t); c.model.rotation.y += c.fleeDir < 0 ? Math.PI : 0;
      ud.legs.forEach((l, i) => l.rotation.z = Math.sin(c.t * 20 + i * Math.PI) * 0.8);
      if (c.t > 1.8) { c.state = 'idle'; c.s = c.homeS; c.y = c.homeY; c.t = 0; c.model.visible = true; }
    }
  }
  updateChase(c, dt) {
    const pl = this.game.player;
    if (c.state === 'idle') { if (pl.s > c.s0 && pl.s < c.end && pl.y > -30) { c.state = 'roll'; c.s = c.start; c.speed = 4; c.y = -20; c.vy = 0; c.g.visible = true; this.game.onChaseStart(); } return; }
    if (c.state === 'done') return;
    c.speed = Math.min(c.speed + dt * 3, c.maxSpeed || 9.4);
    // rubber-band a touch so it stays menacing but fair
    const gap = pl.s - c.s;
    const sp = c.speed * (gap > 16 ? 1.25 : 1);
    c.s += sp * dt;
    const gy = this.groundUnder(c.s, c.y + 3);
    if (c.s > c.end || gy < c.y - 3) { c.vy -= 40 * dt; c.y += c.vy * dt; if (c.s > c.end && c.y < -60) { c.state = 'done'; c.g.visible = false; this.game.onChaseEnd(); } }
    else { c.y += (gy - c.y) * Math.min(1, dt * 12); c.vy = 0; }
    c.roll += sp * dt / c.R;
    this.place(c.g, c.s, c.y + c.R, 0); c.rock.rotation.z = -c.roll;
    if (Math.random() < dt * 20) this.game.fx.spawn(this.path.world(c.s - c.R * 0.5, c.y + 0.3, (Math.random() - 0.5) * 3), new THREE.Vector3((Math.random() - 0.5) * 4, 3 + Math.random() * 4, (Math.random() - 0.5) * 4), 0xc09060, 1.2, 1, -6);
    this.game.shake(Math.max(0, 0.35 - Math.abs(gap) * 0.01));
    if (pl.s - pl.hw < c.s + c.R * 0.85 && pl.y < c.y + c.R * 2 && pl.state !== 'dead') this.game.killPlayer('Flattened!');
  }
  resetChase() { for (const c of this.chases) { c.state = 'idle'; c.g.visible = false; c.s = c.start; } }
  resetCart() { for (const c of this.carts) { c.used = false; c.s = c.homeS; c.y = c.homeY; this.place(c.g, c.s, c.y); c.g.rotation.x = 0; c.body.rotation.z = 0; c.g.visible = true; } }
}

export function makeJelly() {
  // a glassy bell with a glowing heart, a frilled rim, ribbon arms and long curling tentacles
  const root = new THREE.Group(); const b = new THREE.Group(); root.add(b);
  const bellM = new THREE.MeshPhysicalMaterial({ color: 0xffa0f0, emissive: 0xc040b0, emissiveIntensity: 0.6, transmission: 0.55, thickness: 0.6, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 14, 0, Math.PI * 2, 0, Math.PI / 1.9), bellM); bell.position.y = 0.9; b.add(bell);
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffd0ff, emissiveIntensity: 2.6 })); heart.scale.y = 0.7; heart.position.y = 1.2; b.add(heart);
  for (let i = 0; i < 4; i++) { const lobe = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 14), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xff70d0, emissiveIntensity: 2 })); lobe.rotation.x = Math.PI / 2; lobe.position.set(Math.cos(i * Math.PI / 2) * 0.32, 1.05, Math.sin(i * Math.PI / 2) * 0.32); b.add(lobe); }
  // frilled rim: a wavy torus
  const fr = new THREE.TorusGeometry(0.88, 0.06, 6, 48); const fp = fr.attributes.position; for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), y = fp.getY(i), a = Math.atan2(y, x); fp.setZ(i, fp.getZ(i) + Math.sin(a * 12) * 0.06); } fr.computeVertexNormals();
  const frill = new THREE.Mesh(fr, new THREE.MeshStandardMaterial({ color: 0xffc0f8, emissive: 0xff60d0, emissiveIntensity: 1.2, transparent: true, opacity: 0.8 })); frill.rotation.x = Math.PI / 2; frill.position.y = 0.92; b.add(frill);
  // ribbon arms (centre) and tentacles (rim) as curving tubes on pivots (legs[] sway them)
  const legs = [], tm = new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffa0f0, emissiveIntensity: 1.5, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, rr = 0.78, pv = new THREE.Group(); pv.position.set(Math.cos(a) * rr, 0.9, Math.sin(a) * rr); b.add(pv);
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.08, -0.6, 0.05), new THREE.Vector3(-0.08, -1.2, -0.05), new THREE.Vector3(0.06, -1.9, 0)]);
    pv.add(new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.03, 5, false), tm)); legs.push(pv);
  }
  const ribM = new THREE.MeshPhysicalMaterial({ color: 0xffd0f8, emissive: 0xff80e0, emissiveIntensity: 0.8, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) { const pv = new THREE.Group(); pv.position.set((i - 1) * 0.18, 0.9, 0); b.add(pv); const rib = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 1.4, 1, 8), ribM); const rp = rib.geometry.attributes.position; for (let k = 0; k < rp.count; k++) rp.setX(k, rp.getX(k) + Math.sin(rp.getY(k) * 5 + i) * 0.08); rib.position.y = -0.7; rib.rotation.y = i * 1.1; pv.add(rib); legs.push(pv); }
  root.userData = { body: b, legs };
  return root;
}
