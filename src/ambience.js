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
  spawn(b, p) {
    const E = this.game.entities, s = p.s + (Math.random() - 0.5) * 50, gy = E.groundUnder(s, p.y + 6);
    if (!(gy > -1e6) || Math.abs(gy - p.y) > 14) { b.live = false; b.g.visible = false; return; }
    Object.assign(b, { s, y: gy + 0.6 + Math.random() * 2.2, d: -1.5 - Math.random() * 4, vs: 0, vy: 0, flee: 0, live: true }); b.home = b.y;
  }
  update(dt, t) {
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
