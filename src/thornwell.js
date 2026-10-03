import * as THREE from 'three';
import { getTex } from './textures.js';

// The Thornwell: thorn hazards (anywhere a level defines L.spikes) and the look of the deep cave:
// a carved back wall, glowing crystals and roots, drifting spirit-wisps, and dark foreground
// silhouettes in front of the camera for that layered, Ori-like depth.
const TOP = -560, BOT = -790, S0 = 22, S1 = 216;
export class Thornwell {
  constructor(game) {
    this.game = game; this.path = game.path; const O = 80;
    this.group = new THREE.Group(); game.scene.add(this.group);
    this.spikes = game.level.spikes || [];
    this.buildThorns();
    this.buildCave(O);
    this.buildFronds(O);
  }
  // daytime forests: dark fern silhouettes near the camera, framing the bottom of the screen
  buildFronds(O) {
    const P = this.path, E = this.game.entities, geo = new THREE.ConeGeometry(0.45, 2.6, 4); geo.translate(0, 1.3, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0x06140c }), list = [];
    const rnd = (i) => { const x = Math.sin(i * 57.3) * 43758.5; return x - Math.floor(x); };
    for (let s = -40; s < 540; s += 9 + rnd(s) * 14) {
      const gy = E.groundUnder(s + O, 60); if (!(gy > -20 && gy < 60)) continue;
      for (let k = 0; k < 5; k++) list.push([s + O + (rnd(s + k) - 0.5) * 3, gy - 0.6, 7 + rnd(s * 2 + k) * 2.5, (k - 2) * 0.35 + (rnd(k + s) - 0.5) * 0.3, 0.6 + rnd(s + k * 3) * 0.8]);
    }
    const m = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D();
    list.forEach((q, i) => { P.place(o, q[0], q[1], q[2]); o.rotateZ(q[3]); o.scale.set(0.6, q[4], 0.25); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    this.game.scene.add(m); this.fronds = m;
  }
  buildThorns() {
    const P = this.path, list = [];
    for (const k of this.spikes) {
      const horiz = k.dir === 'up' || k.dir === 'down', len = horiz ? k.s1 - k.s0 : k.y1 - k.y0, n = Math.max(2, Math.round(len / 0.42));
      for (let i = 0; i < n; i++) for (let row = 0; row < 3; row++) {
        const t = (i + 0.5 + (row % 2) * 0.5) / n; if (t > 1) continue;
        const s = horiz ? k.s0 + (k.s1 - k.s0) * t : (k.dir === 'right' ? k.s0 : k.s1);
        const y = horiz ? (k.dir === 'up' ? k.y0 : k.y1) : k.y0 + (k.y1 - k.y0) * t;
        list.push({ s, y, d: (row - 1) * 0.7, dir: k.dir, sc: 0.7 + ((i * 7 + row * 3) % 5) * 0.12 });
      }
    }
    if (!list.length) return;
    const geo = new THREE.ConeGeometry(0.17, 0.75, 5); geo.translate(0, 0.37, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x5a2448, roughness: 0.45, emissive: 0x2a0418, emissiveIntensity: 1 });
    const m = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D();
    const rot = { up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };
    list.forEach((q, i) => { P.place(o, q.s, q.y, q.d); o.rotateZ(rot[q.dir] + Math.sin(i * 1.7) * 0.18); o.scale.set(1, q.sc, 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.castShadow = true; this.group.add(m);
    // a faint warning glow along each thorn strip
    const gm = new THREE.MeshBasicMaterial({ color: 0xff3a70, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const k of this.spikes) { const w = Math.max(0.6, k.s1 - k.s0), h = Math.max(0.6, k.y1 - k.y0); const g = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.6, h + 0.6), gm); P.place(g, (k.s0 + k.s1) / 2, (k.y0 + k.y1) / 2, -0.9); this.group.add(g); }
  }
  buildCave(O) {
    const P = this.path, G = this.group;
    // carved back wall, in strips that follow the route's curve
    const tex = getTex('cave').clone(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 40); tex.needsUpdate = true;
    const wall = new THREE.MeshStandardMaterial({ map: tex, color: 0x7a909a, roughness: 1, emissive: 0x0a2228, emissiveIntensity: 1 });
    for (let s = S0 + O; s < S1 + O; s += 12) { const m = new THREE.Mesh(new THREE.PlaneGeometry(12.6, TOP - BOT), wall); P.place(m, s + 6, (TOP + BOT) / 2, -6); m.receiveShadow = true; G.add(m); }
    // glowing crystal clusters and hanging spirit-roots on the back wall
    const rnd = (i) => { const x = Math.sin(i * 91.7) * 43758.5; return x - Math.floor(x); };
    const cg = new THREE.OctahedronGeometry(0.5, 0), cols = [0x5affd8, 0x8fa0ff, 0xc890ff];
    this.glows = [];
    for (let i = 0; i < 70; i++) {
      const s = S0 + O + rnd(i) * (S1 - S0), y = BOT + 20 + rnd(i + 100) * (TOP - BOT - 30);
      const cl = new THREE.Group();
      for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: cols[i % 3], emissiveIntensity: 1.6 })); c.scale.set(0.5, 1 + rnd(i * 3 + k) * 1.4, 0.5); c.position.set((k - 1) * 0.35, 0, 0); c.rotation.z = (k - 1) * 0.4; cl.add(c); }
      P.place(cl, s, y, -5.6 + rnd(i + 7) * 0.5); G.add(cl); this.glows.push(cl);
    }
    const rootM = new THREE.MeshStandardMaterial({ color: 0x1a2a20, emissive: 0x2a8a6a, emissiveIntensity: 0.5, roughness: 0.9 });
    for (let i = 0; i < 40; i++) {
      const L = 3 + rnd(i + 300) * 9, r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.14, L, 5), rootM);
      P.place(r, S0 + O + rnd(i + 200) * (S1 - S0), TOP - 12 - rnd(i + 400) * 150 - L / 2, -4.8 + rnd(i) * 1.5); r.rotation.z += (rnd(i + 9) - 0.5) * 0.3; G.add(r);
    }
    // spirit wisps drifting up the shafts
    const n = 160, pos = new Float32Array(n * 3); this.wisp = [];
    for (let i = 0; i < n; i++) { this.wisp.push({ s: S0 + O + rnd(i + 500) * (S1 - S0), y: BOT + rnd(i + 600) * (TOP - BOT), d: -3 + rnd(i + 700) * 6, v: 0.4 + rnd(i + 800) * 0.8, ph: rnd(i) * 6 }); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, '#a0fff0'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    this.points = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.45, map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xb8fff0 }));
    this.points.frustumCulled = false; G.add(this.points);
    // foreground silhouettes: dark roots and hanging fronds between the camera and Kiri
    const fg = new THREE.MeshBasicMaterial({ color: 0x020806 });
    for (let s = S0 + O + 6; s < S1 + O; s += 16 + rnd(s) * 12) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12 + rnd(s + 1) * 0.15, 0.22 + rnd(s + 2) * 0.2, TOP - BOT, 6), fg);
      P.place(col, s, (TOP + BOT) / 2, 6 + rnd(s + 3) * 3); col.rotation.z += (rnd(s + 4) - 0.5) * 0.25; G.add(col);
      for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.25 + rnd(s + k) * 0.3, 1.5 + rnd(s * k + 5) * 2, 5), fg); f.rotation.x = Math.PI; P.place(f, s + (rnd(s + k + 9) - 0.5) * 4, BOT + 25 + rnd(s * 3 + k) * 180, 5.5 + rnd(s + k) * 2); G.add(f); }
    }
  }
  step(h) {
    const g = this.game, p = g.player;
    if (p.state !== 'normal' || p.invuln > 0 || p.sdashT > 0) return;
    for (const k of this.spikes) {
      if (p.s + p.hw > k.s0 && p.s - p.hw < k.s1 && p.y + p.h > k.y0 && p.y < k.y1) {
        p.hurt('Thorns!');
        if (p.state === 'dead') return;
        if (k.dir === 'down') { p.vy = -6; } else { p.vy = 12; }
        p.vs = k.dir === 'right' ? 9 : k.dir === 'left' ? -9 : -p.facing * 5;
        p.clingT = 0; p.wjLock = 0.25; g.shake(0.25);
        g.fx.burst(g.path.world(p.s, p.y + 0.6, 0), 0xff4a80, 18, 6, 0.5, 0.5, -6);
        return;
      }
    }
  }
  update(dt, t) {
    if (this.fronds) this.fronds.visible = this.game.player.y > -100 && this.game.player.y < 120 && (this.game.currentTheme ?? 0) <= 2;
    const near = Math.abs(this.game.player.y - (TOP + BOT) / 2) < 200;
    this.group.visible = near || this.spikes.some((k) => k.y0 > -500);
    if (!near) return;
    this.glows.forEach((c, i) => { c.children.forEach((m) => { m.material.emissiveIntensity = 1.3 + Math.sin(t * 1.5 + i) * 0.5; }); });
    const a = this.points.geometry.attributes.position, v = new THREE.Vector3();
    this.wisp.forEach((w, i) => { w.y += w.v * dt; if (w.y > TOP) w.y = BOT; this.path.world(w.s + Math.sin(t * 0.6 + w.ph) * 0.8, w.y, w.d, v); a.setXYZ(i, v.x, v.y, v.z); });
    a.needsUpdate = true;
  }
}
