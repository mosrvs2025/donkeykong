import * as THREE from 'three';

// Ambient life near the path: butterflies in the daylight forests that flutter around and scatter
// when Kiri runs through them. A small pool is recycled around the player, so it costs almost nothing.
const N = 24, COLS = [0xffb040, 0x60c8ff, 0xff70b0, 0xfff070, 0xb890ff];
export class Ambience {
  constructor(game) {
    this.game = game; this.v = new THREE.Vector3();
    const wing = new THREE.PlaneGeometry(0.46, 0.34); wing.translate(0.23, 0, 0);
    this.list = [];
    for (let i = 0; i < N; i++) {
      const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: COLS[i % COLS.length], side: THREE.DoubleSide, emissive: COLS[i % COLS.length], emissiveIntensity: 0.25, roughness: 0.6 });
      const L = new THREE.Mesh(wing, mat), Rw = new THREE.Mesh(wing, mat); Rw.rotation.y = Math.PI; g.add(L, Rw);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 4), new THREE.MeshBasicMaterial({ color: 0x201810 })); body.rotation.x = Math.PI / 2; g.add(body);
      g.visible = false; game.scene.add(g);
      this.list.push({ g, L, R: Rw, s: 0, y: 0, d: 0, vs: 0, vy: 0, ph: Math.random() * 6, flee: 0, live: false });
    }
  }
  // falling leaves in the forests, rising glow-spores in the caves: a cheap instanced field around the camera
  buildDrift() {
    const n = 70, geo = new THREE.PlaneGeometry(0.42, 0.24); geo.translate(0.12, 0, 0);
    this.leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.8, emissive: 0x000000, transparent: true, opacity: 0.95 });
    const m = new THREE.InstancedMesh(geo, this.leafMat, n); m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const c = new THREE.Color(); for (let i = 0; i < n; i++) m.setColorAt(i, c.setHSL(0.08 + Math.random() * 0.18, 0.65, 0.42 + Math.random() * 0.15));
    this.game.scene.add(m); this.drift = { m, n, o: new THREE.Object3D(), d: [...Array(n)].map(() => ({ s: 0, y: 0, z: 0, ph: Math.random() * 6, sp: 0.6 + Math.random() * 0.8, live: false })) };
  }
  updateDrift(dt, t) {
    const g = this.game, p = g.player, th = g.currentTheme ?? 0, D = this.drift || (this.buildDrift(), this.drift);
    const on = g.state === 'play' && g.settings?.quality !== 'low', cave = th === 3 || th === 4 || th === 10, forest = th <= 2;
    D.m.visible = on && (cave || forest); if (!D.m.visible) return;
    this.leafMat.emissive.setHex(cave ? 0x60ffd0 : 0x000000); this.leafMat.emissiveIntensity = cave ? 1.6 : 0;
    for (const [i, q] of D.d.entries()) {
      if (!q.live || Math.abs(q.s - p.s) > 22 || q.y < p.y - 9 || q.y > p.y + 16) { q.s = p.s + (Math.random() - 0.5) * 40; q.y = cave ? p.y - 6 + Math.random() * 4 : p.y + 6 + Math.random() * 10; q.z = -8 + Math.random() * 14; q.live = true; }
      if (cave) { q.y += dt * 0.7 * q.sp; q.s += Math.sin(t * 0.8 + q.ph) * dt * 0.4; }
      else { q.y -= dt * 1.1 * q.sp; q.s += (Math.sin(t * 0.9 + q.ph) * 0.9 + 0.35) * dt; }
      g.path.place(D.o, q.s, q.y, q.z);
      if (cave) D.o.scale.setScalar(0.35); else { D.o.rotateZ(t * 2 * q.sp + q.ph); D.o.rotateX(Math.sin(t * 3 + q.ph) * 1.2); D.o.scale.setScalar(q.z > 3 ? 1.8 : 1); }
      D.o.updateMatrix(); D.m.setMatrixAt(i, D.o.matrix);
    }
    D.m.instanceMatrix.needsUpdate = true;
  }
  spawn(b, p) {
    const E = this.game.entities, s = p.s + (Math.random() - 0.5) * 50, gy = E.groundUnder(s, p.y + 6);
    if (!(gy > -1e6) || Math.abs(gy - p.y) > 14) { b.live = false; b.g.visible = false; return; }
    Object.assign(b, { s, y: gy + 0.6 + Math.random() * 2.2, d: -1.5 - Math.random() * 4, vs: 0, vy: 0, flee: 0, live: true }); b.home = b.y;
  }
  update(dt, t) {
    this.updateDrift(dt, t);
    const g = this.game, p = g.player, on = g.state === 'play' && (g.currentTheme ?? 0) <= 2 && p.y > -60 && p.y < 120;
    for (const b of this.list) {
      if (!on) { b.g.visible = false; b.live = false; continue; }
      if (!b.live || Math.abs(b.s - p.s) > 30) { this.spawn(b, p); if (!b.live) continue; }
      const dx = b.s - p.s, dy = b.y - (p.y + 0.8), near = Math.hypot(dx, dy) < 3 && Math.abs(p.vs) + Math.abs(p.vy) > 2;
      if (near && !b.flee) { b.flee = 2.5; b.vs = Math.sign(dx || 1) * (3 + Math.random() * 2); b.vy = 3 + Math.random() * 2; }
      if (b.flee > 0) { b.flee = Math.max(0, b.flee - dt); b.s += b.vs * dt; b.y += b.vy * dt; b.vy *= 1 - dt; if (!b.flee) b.home = b.y; }
      else { b.s += Math.sin(t * 0.7 + b.ph) * dt * 0.8; b.y = b.home + Math.sin(t * 1.3 + b.ph * 2) * 0.4; }
      const flap = Math.sin(t * (b.flee ? 34 : 18) + b.ph) * 1.1;
      b.L.rotation.y = flap; b.R.rotation.y = Math.PI - flap;
      g.path.place(b.g, b.s, b.y, b.d); b.g.rotation.y += Math.sin(t + b.ph) * 1.2; b.g.rotation.x = -0.4; b.g.visible = true;
    }
  }
}
