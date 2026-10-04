import * as THREE from 'three';

// Decor and environmental forces for the two new worlds: the underwater Sunken Sanctum
// and the Skyward Isles. Currents carry Kiri; storm clouds sting.
const O = 80;
export class Worlds {
  constructor(game) {
    this.game = game; this.path = game.path; this.L = game.level;
    this.group = new THREE.Group(); game.scene.add(this.group);
    this.buildSunken(); this.buildSky();
  }
  buildSunken() {
    const P = this.path, g = this.group;
    // kelp forests sway along the floor
    const kelpM = new THREE.MeshStandardMaterial({ color: 0x2a8a50, emissive: 0x06301a, side: THREE.DoubleSide });
    this.kelp = [];
    for (let i = 0; i < 90; i++) {
      const s = 292 + Math.random() * 478, d = -3 - Math.random() * 30, h = 6 + Math.random() * 16;
      const k = new THREE.Mesh(new THREE.PlaneGeometry(0.9, h, 1, 6), kelpM); k.position.y = h / 2;
      const G = new THREE.Group(); G.add(k); P.place(G, s + O, -420, d); G.rotation.y += Math.random() * 3; g.add(G); this.kelp.push({ G, k, ph: Math.random() * 6 });
    }
    // glowing coral and sunken Sunwright columns in the background
    const coral = [0xff70a0, 0x70f0ff, 0xffd060, 0xa080ff];
    for (let i = 0; i < 60; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + Math.random() * 1.2, 0), new THREE.MeshStandardMaterial({ color: 0, emissive: coral[i % 4], emissiveIntensity: 1.6, flatShading: true }));
      const G = new THREE.Group(); G.add(m); P.place(G, 292 + Math.random() * 478 + O, -419.5, -2 - Math.random() * 20); g.add(G);
    }
    const ruin = new THREE.MeshStandardMaterial({ color: 0x5a7a80, roughness: 1, emissive: 0x06141a });
    for (let s = 300; s < 770; s += 18 + Math.random() * 14) { const h = 20 + Math.random() * 40; const c = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, h, 8), ruin); c.position.y = h / 2; c.rotation.z = (Math.random() - 0.5) * 0.4; const G = new THREE.Group(); G.add(c); P.place(G, s + O, -425, -20 - Math.random() * 40); g.add(G); }
    // light shafts from far above
    const rayMat = new THREE.MeshBasicMaterial({ color: 0x9ff0ff, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    for (let s = 300; s < 770; s += 30) { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 5, 90, 10, 1, true), rayMat); m.position.y = -380; m.rotation.z = 0.2; const G = new THREE.Group(); G.add(m); P.place(G, s + O, 0, -6 - Math.random() * 20); g.add(G); }
  }
  buildSky() {
    const P = this.path, g = this.group;
    const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x303844, roughness: 1, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 70; i++) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(4 + Math.random() * 10, 1), cloudM); c.scale.y = 0.45;
      const G = new THREE.Group(); G.add(c); P.place(G, 190 + Math.random() * 720 + O, 760 + Math.random() * 110, -20 - Math.random() * 110); g.add(G);
    }
    // floating Sunwright spires far away
    const stone = new THREE.MeshStandardMaterial({ color: 0xc8c0b0, roughness: 0.9 }), gold = new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffc860, emissiveIntensity: 2 });
    for (let i = 0; i < 9; i++) { const G = new THREE.Group(); const h = 20 + Math.random() * 30; const sp = new THREE.Mesh(new THREE.ConeGeometry(4, h, 6), stone); sp.position.y = h / 2; G.add(sp); const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(6, 0), stone); rock.scale.y = 0.6; G.add(rock); const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.3, 6, 30), gold); ring.rotation.x = Math.PI / 2; ring.position.y = h * 0.6; G.add(ring); P.place(G, 200 + i * 80 + O, 770 + Math.random() * 60, -80 - Math.random() * 80); g.add(G); }
    // distant floating islets: grassy tops, rocky roots, a tree or two and a ribbon waterfall
    const grassM = new THREE.MeshStandardMaterial({ color: 0x6cc450, roughness: 0.9, flatShading: true }), rockM = new THREE.MeshStandardMaterial({ color: 0x9a8a78, roughness: 1, flatShading: true });
    const leafM = new THREE.MeshStandardMaterial({ color: 0x4aa83e, flatShading: true }), barkM = new THREE.MeshStandardMaterial({ color: 0x7a5432 });
    const fallM = new THREE.MeshBasicMaterial({ color: 0xe8fbff, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
    this.isles = []; this.falls = [];
    for (let i = 0; i < 16; i++) {
      const G = new THREE.Group(), r = 4 + Math.random() * 7;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 1.2, 9), grassM); G.add(top);
      const root = new THREE.Mesh(new THREE.ConeGeometry(r * 0.95, r * 1.8, 9), rockM); root.rotation.x = Math.PI; root.position.y = -r * 0.9 - 0.6; G.add(root);
      for (let k = 0; k < 1 + Math.floor(Math.random() * 3); k++) { const x = (Math.random() - 0.5) * r, z = (Math.random() - 0.5) * r, h = 2 + Math.random() * 3;
        const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, h, 5), barkM); tr.position.set(x, h / 2 + 0.6, z); G.add(tr);
        const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + Math.random(), 0), leafM); cr.position.set(x, h + 1.2, z); G.add(cr); }
      if (i % 2 === 0) { const L = 18 + Math.random() * 20, f = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + r * 0.15, L, 1, 8), fallM.clone()); f.position.set(r * 0.85, -L / 2, 0); f.rotation.y = Math.PI / 2; G.add(f); this.falls.push(f); }
      P.place(G, 190 + Math.random() * 720 + O, 770 + Math.random() * 80, -35 - Math.random() * 90); G.rotation.y = Math.random() * 6; g.add(G); this.isles.push({ G, y0: G.position.y, ph: Math.random() * 6 });
    }
    // flocks of birds wheeling between the islands
    const birdGeo = new THREE.BufferGeometry(); birdGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.6, 0.15, 0, 0, 0, 0, 0, 0, 0.12, 0.6, 0.15, 0, 0, 0, 0, 0, 0, 0.12], 3));
    const birdM = new THREE.MeshBasicMaterial({ color: 0x2a3040, side: THREE.DoubleSide });
    this.flocks = [];
    for (let f = 0; f < 6; f++) { const G = new THREE.Group(), birds = [];
      for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(birdGeo, birdM); b.position.set(-Math.abs(k - 3) * 1.1, 0, (k - 3) * 1.1); b.scale.setScalar(1.6); G.add(b); birds.push(b); }
      P.place(G, 200 + f * 120 + O, 800 + Math.random() * 40, -25 - Math.random() * 30); g.add(G); this.flocks.push({ G, birds, c: G.position.clone(), r: 10 + Math.random() * 10, ph: Math.random() * 6 }); }
    // storm clouds
    const stormM = new THREE.MeshStandardMaterial({ color: 0x3a3a50, emissive: 0x101020, roughness: 1 });
    this.storms = this.L.storms.map((st) => {
      const G = new THREE.Group();
      for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(st.r * (0.6 + Math.random() * 0.4), 1), stormM); c.position.set((Math.random() - 0.5) * st.r, (Math.random() - 0.5) * st.r * 0.5, (Math.random() - 0.5) * st.r * 0.6); G.add(c); }
      const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.2, st.r * 1.6, 0.2), new THREE.MeshBasicMaterial({ color: 0xd0e8ff })); bolt.visible = false; G.add(bolt);
      P.place(G, st.s, st.y, 0); g.add(G);
      return { ...st, G, bolt, ph: Math.random() * 6 };
    });
  }
  step(h) {
    const game = this.game, p = game.player;
    if (p.state !== 'normal') return;
    const c = p.y + p.h / 2;
    for (const cu of this.L.currents) {
      if (p.s < cu.s0 || p.s > cu.s1 || c < cu.y0 || c > cu.y1) continue;
      // currents carry Kiri on top of whatever he is doing
      if (cu.vs) p.s += cu.vs * h;
      if (cu.vy) { p.y += cu.vy * h; if (p.vy < 0) p.vy *= 0.9; }
      if (Math.random() < h * 20) game.fx.spawn(game.path.world(p.s - 2, c + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2), new THREE.Vector3(cu.vs * 0.6, cu.vy * 0.6, 0), cu.wind ? 0xffffff : 0xa0f0ff, 0.3, 0.6, 0);
    }
    for (const st of this.storms) if (Math.hypot(p.s - st.s, c - st.y) < st.r * 0.85) { p.hurt('Zapped by the storm!'); break; }
  }
  update(dt, t) {
    const game = this.game, p = game.player;
    const under = p.y < -250, sky = p.y > 700;
    this.group.visible = under || sky || Math.abs(p.y) > 200;
    if (under) {
      for (const k of this.kelp) k.k.rotation.z = Math.sin(t * 1.2 + k.ph) * 0.12;
      if (Math.random() < dt * 25) { const cp = game.camera.position; game.fx.spawn(new THREE.Vector3(cp.x + (Math.random() - 0.5) * 30, cp.y - 10, cp.z - 12 + (Math.random() - 0.5) * 12), new THREE.Vector3((Math.random() - 0.5) * 0.4, 2 + Math.random() * 2, 0), 0xc0f8ff, 0.3, 5, 0); }
    }
    if (sky) {
      for (const is of this.isles) is.G.position.y = is.y0 + Math.sin(t * 0.5 + is.ph) * 0.8;
      for (const f of this.falls) f.material.opacity = 0.45 + Math.sin(t * 7 + f.id) * 0.06;
      for (const f of this.flocks) { const a = t * 0.25 + f.ph; f.G.position.set(f.c.x + Math.cos(a) * f.r, f.c.y + Math.sin(a * 2) * 2, f.c.z + Math.sin(a) * f.r); f.G.rotation.y = -a; f.birds.forEach((b, i) => b.scale.y = 1.6 * (0.3 + Math.abs(Math.sin(t * 8 + i)))); }
      for (const st of this.storms) { const on = Math.sin(t * 5 + st.ph) > 0.85; st.bolt.visible = on; st.bolt.rotation.z = Math.sin(t * 30) * 0.3; st.G.rotation.y = t * 0.1; }
      if (Math.random() < dt * 15) { const cp = game.camera.position; game.fx.spawn(new THREE.Vector3(cp.x + (Math.random() - 0.5) * 50, cp.y + (Math.random() - 0.5) * 20, cp.z - 15), new THREE.Vector3(-8, 0, 0), 0xffffff, 0.25, 2, 0); }
    }
  }
}
