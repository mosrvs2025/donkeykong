import * as THREE from 'three';
import { makeHero, makeBeast, makeFrog, makeBird, makeFish, makeOru } from './models.js';
import { makeHat, SHOP } from './extras.js';
import { BOSSES } from './bosses.js';

// Kiri's Grove: a little home clearing that grows with the journey. Every Seed Coin found plants
// something new; rescued companions and heroes come to live here; fallen guardians leave trophies.
const $ = (id) => document.getElementById(id);
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, ...o });
const glow = (c, i = 2) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i });
// one growth per Seed Coin, in order
const GROWTH = [
  ['Sprout of Light', 'the first seed takes root'], ['Wildflower Bed', 'pink and gold'], ['Stone Path', 'leading home'],
  ['Lantern Post', 'a warm light'], ['Young Glowtree', 'its leaves hum'], ['Lily Pond', 'with floating blooms'],
  ['Mushroom Ring', 'they glow at dusk'], ['Second Lantern', 'the path is lit'], ['Little Hut', 'a roof of leaves'],
  ['Bench', 'for resting tails'], ['Wind Chimes', 'they sing in the breeze'], ['Berry Bushes', 'snacks for later'],
  ['Elder Glowtree', 'it shades the hut'], ['Fireflies', 'drifting gold'], ['Garden Rows', 'carrots and moonbeans'],
  ['Wooden Bridge', 'over the pond'], ['Crystal Cluster', 'from the Glowdeep'], ['Sunwright Arch', 'an old stone welcome'],
  ['Waterfall Rock', 'water from nowhere'], ['Tree Swing', 'wheee'], ['Rune Stones', 'they hum the old song'],
  ['Hanging Lanterns', 'strung through the trees'], ['Moonwell', 'it shows the stars by day'], ['Flower Arch', 'roses over the gate'],
  ['Great Glowtree', 'the heart of the grove'], ['Spirit Wisps', 'the grove is awake'], ['Seedlight Beacon', 'every seed found. home.'],
];
const ROSTER = [['beast', makeBeast, 'Grumbo'], ['frog', makeFrog, 'Boing'], ['bird', makeBird, 'Sola'], ['fish', makeFish, 'Nuu'], ['oru', makeOru, 'Oru']];
export class Grove {
  constructor(game) {
    this.game = game; this.isOpen = false; this.yaw = 0.6; this.drag = null; this.anims = [];
    const ui = document.createElement('div'); ui.id = 'grove-ui'; ui.className = 'hidden'; document.body.appendChild(ui); this.ui = ui;
    const cv = () => this.game.renderer?.domElement || document.querySelector('canvas');
    addEventListener('pointerdown', (e) => { if (this.isOpen && e.target === cv()) this.drag = e.clientX; });
    addEventListener('pointermove', (e) => { if (this.drag != null) { this.yaw -= (e.clientX - this.drag) * 0.008; this.drag = e.clientX; this.spinT = 4; } });
    addEventListener('pointerup', () => { this.drag = null; });
    addEventListener('keydown', (e) => { if (!this.isOpen) return; if (e.code === 'Escape' || e.code === 'KeyX') this.close(); if (e.code === 'ArrowLeft') this.yaw -= 0.2; if (e.code === 'ArrowRight') this.yaw += 0.2; });
  }
  hasNew() { return this.stats().grown > (this.game.progress.groveSeen || 0); }
  stats() {
    const g = this.game, P = g.progress, coins = (P.coins || []).length;
    const met = ROSTER.filter(([k]) => g.stats.met[k]), heroes = g.evolve.heroes(), bosses = Object.keys(BOSSES).filter((b) => g.bosses.defeated.has(b));
    return { coins, grown: Math.min(GROWTH.length, coins), met, heroes, bosses, eggs: g.eggs.found.size, secrets: g.stats.secrets.size };
  }
  build() {
    const S = (this.scene = new THREE.Scene()), st = this.stats(); this.anims = [];
    const cv = document.createElement('canvas'); cv.width = 2; cv.height = 256; const x = cv.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#5a9be8'); gr.addColorStop(0.6, '#b8e0f4'); gr.addColorStop(1, '#ffe8c8'); x.fillStyle = gr; x.fillRect(0, 0, 2, 256);
    const bg = new THREE.CanvasTexture(cv); bg.colorSpace = THREE.SRGBColorSpace; S.background = bg; S.fog = new THREE.Fog(0xcfe8f0, 30, 70);
    S.add(new THREE.HemisphereLight(0xe8f4ff, 0x506a30, 1.4));
    const sun = new THREE.DirectionalLight(0xfff0d0, 2.6); sun.position.set(-8, 14, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 }); S.add(sun);
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 150);
    // the clearing: a grassy island floating on soft clouds
    const top = new THREE.Mesh(new THREE.CylinderGeometry(11, 10.4, 1.2, 40), std(0x6cbf4e)); top.position.y = -0.6; top.receiveShadow = true; S.add(top);
    const rock = new THREE.Mesh(new THREE.ConeGeometry(10.4, 9, 12), std(0x8a7a64)); rock.rotation.x = Math.PI; rock.position.y = -5.7; S.add(rock);
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; const t = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 + (i % 3) * 0.15, 0), std(0x4a9a3a)); t.position.set(Math.cos(a) * 10.6, 0.1, Math.sin(a) * 10.6); S.add(t); }
    for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + (i % 3), 1), std(0xffffff, { roughness: 1 })); const a = i / 8 * Math.PI * 2; c.position.set(Math.cos(a) * 20, -6 - (i % 2) * 2, Math.sin(a) * 20); c.scale.y = 0.45; S.add(c); }
    // Kiri at home, wearing today's outfit
    const kiri = makeHero(this.game.player.hero || 'kiri'); kiri.position.set(0, 0, 2); kiri.rotation.y = 0.3; S.add(kiri);
    const P = this.game.progress; if (P.hat) { const h = makeHat(P.hat); h.rotation.z = -0.1; kiri.userData.head.add(h); }
    const sc = SHOP.find((x) => x.id === P.scarf); if (sc) kiri.traverse((o) => { if (o.isMesh && o.userData.scarf) { o.material = o.material.clone(); o.material.color.setHex(sc.color); } });
    this.anims.push((t) => { kiri.userData.body.position.y = Math.abs(Math.sin(t * 2)) * 0.03; kiri.userData.tail?.forEach((q, i) => q.rotation.z = Math.sin(t * 2.4 - i * 0.5) * 0.15); kiri.userData.eyeL.scale.y = kiri.userData.eyeR.scale.y = (t % 3.3) < 0.1 ? 0.1 : 1; });
    // things that have grown
    for (let i = 0; i < st.grown; i++) this.grow(i, S);
    // friends who live here
    const spots = [[-5, 3.5], [4.5, 4], [-2, -5], [3.5, -1.2], [6, -4]];
    st.met.forEach(([k, make], i) => { const m = make(); const [x0, z0] = spots[i]; m.position.set(x0, k === 'oru' ? 1.2 : k === 'bird' ? 0 : 0, z0); m.rotation.y = Math.atan2(-x0, -z0) + Math.PI / 2; if (k === 'fish') m.position.set(-4.5, 0.1, -3.6); S.add(m);
      this.anims.push((t, dt) => { m.userData.anim?.(t, dt); if (k === 'frog') m.position.y = Math.max(0, Math.sin(t * 2.2 + i)) * 0.8; else if (k === 'oru') m.position.y = 1.2 + Math.sin(t * 1.5) * 0.2; else if (k === 'fish') m.position.y = 0.1 + Math.max(0, Math.sin(t * 1.3)) * 0.6; else m.userData.body && (m.userData.body.position.y = Math.abs(Math.sin(t * 1.6 + i)) * 0.05); }); });
    st.heroes.filter((h) => h !== (this.game.player.hero || 'kiri')).forEach((h, i) => { const m = makeHero(h); m.position.set(i ? 2.6 : -2.4, 0, 1.2); m.rotation.y = i ? -0.5 : 0.6; S.add(m);
      this.anims.push((t) => { m.userData.body.position.y = Math.abs(Math.sin(t * 2.5 + i * 2)) * 0.05; m.userData.arms?.[0] && (m.userData.arms[0].rotation.z = 2.4 + Math.sin(t * 6) * 0.3 * (Math.sin(t * 0.5 + i) > 0.6 ? 1 : 0)); }); });
    // guardian trophies on stone plinths around the edge
    st.bosses.forEach((b, i) => { const a = Math.PI * 0.75 + i * 0.32, x0 = Math.cos(a) * 8.6, z0 = Math.sin(a) * 8.6;
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.9, 8), std(0xc8c0a8)); pl.position.set(x0, 0.45, z0); S.add(pl);
      const cr = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 6, 5), new THREE.MeshStandardMaterial({ color: 0xffd060, metalness: 0.8, roughness: 0.25, emissive: 0x402000 })); cr.position.set(x0, 1.3, z0); S.add(cr); this.anims.push((t) => { cr.rotation.y = t + i; cr.position.y = 1.3 + Math.sin(t * 2 + i) * 0.08; }); });
    // golden eggs for every Easter egg found
    for (let i = 0; i < st.eggs; i++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffd040, metalness: 0.9, roughness: 0.2, emissive: 0x403000 })); e.scale.y = 1.3; e.position.set(-1.2 + i * 0.5, 0.28, 4.6); S.add(e); }
    S.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  grow(i, S) {
    const add = (m, x, y, z) => { m.position.set(x, y, z); S.add(m); return m; };
    const tree = (x, z, h, r, col) => { const g = new THREE.Group(); const tr = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.18, r * 0.28, h, 7), std(0x7a5432)); tr.position.y = h / 2; g.add(tr);
      for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * (0.7 + (k % 2) * 0.25), 1), std(col, { emissive: col, emissiveIntensity: 0.12 })); b.position.set(Math.cos(k * 1.9) * r * 0.5, h + Math.sin(k * 2.3) * r * 0.3, Math.sin(k * 1.9) * r * 0.5); g.add(b); }
      return add(g, x, 0, z); };
    const lantern = (x, z) => { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8, 6), std(0x5a4030)); p.position.y = 0.9; g.add(p); const l = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), glow(0xffc060, 2.5)); l.position.y = 1.9; g.add(l); const pl = new THREE.PointLight(0xffb050, 3, 6); pl.position.y = 1.9; g.add(pl); return add(g, x, 0, z); };
    switch (i) {
      case 0: { const s = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), glow(0x9fffc0, 2)); add(s, 0, 0.35, -1); this.anims.push((t) => s.scale.setScalar(1 + Math.sin(t * 2) * 0.1)); break; }
      case 1: for (let k = 0; k < 14; k++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), std([0xff8ac0, 0xffe060][k % 2], { emissive: 0x201010 })); add(f, -6 + (k % 5) * 0.4, 0.15, 1 + Math.floor(k / 5) * 0.4); } break;
      case 2: for (let k = 0; k < 7; k++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.08, 7), std(0xc8c0b0)); add(p, Math.sin(k * 0.5) * 0.6, 0.04, 3.5 + k * 1); } break;
      case 3: lantern(1.4, 6); break;
      case 4: tree(-6.5, -1, 2.2, 1, 0x5ac860); break;
      case 5: { const w = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.1, 28), new THREE.MeshStandardMaterial({ color: 0x4ab8d0, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 })); add(w, -4.5, 0.03, -3.6);
        for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.3, 10), std(0x3a9a40)); l.rotation.x = -Math.PI / 2; add(l, -4.5 + Math.cos(k * 1.7) * 1.2, 0.1, -3.6 + Math.sin(k * 1.7) * 1.2); const fl = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 6), std(0xffa0d0, { emissive: 0x401020 })); add(fl, -4.5 + Math.cos(k * 1.7) * 1.2, 0.18, -3.6 + Math.sin(k * 1.7) * 1.2); } break; }
      case 6: for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, c = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), glow([0x60e0ff, 0xc080ff][k % 2], 1.4)); add(c, 5 + Math.cos(a) * 1.3, 0.3, 2 + Math.sin(a) * 1.3); } break;
      case 7: lantern(-1.4, 7.2); break;
      case 8: { const g = new THREE.Group(); const w = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 1.8, 10), std(0xb08850)); w.position.y = 0.9; g.add(w); const r = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.6, 10), std(0x4a9a3a)); r.position.y = 2.6; g.add(r);
        const d = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12, 0, Math.PI), std(0x3a2414)); d.position.set(0, 0.02, 1.58); g.add(d); const win = new THREE.Mesh(new THREE.CircleGeometry(0.22, 10), glow(0xffd080, 1.5)); win.position.set(0.7, 1.2, 1.35); win.rotation.y = 0.4; g.add(win); g.rotation.y = 0.2; add(g, 2.5, 0, -5.5); break; }
      case 9: { const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.4), std(0x9a6a3a)); add(b, -3, 0.45, 5); for (const x of [-0.6, 0.6]) add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.35), std(0x7a5030)), -3 + x, 0.22, 5); break; }
      case 10: { const g = new THREE.Group(); for (let k = 0; k < 5; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4 + k * 0.08, 5), std(0xc8d8e0, { metalness: 0.8, roughness: 0.2 })); c.position.set((k - 2) * 0.12, -0.3, 0); g.add(c); } add(g, 1.8, 2.2, -4); this.anims.push((t) => g.rotation.z = Math.sin(t * 1.7) * 0.15); break; }
      case 11: for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), std(0x3a8a3a)); add(b, 7 + k * 0.9, 0.4, -1 + (k % 2) * 0.6); for (let j = 0; j < 4; j++) add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), std(0xe03050, { emissive: 0x400010 })), 7 + k * 0.9 + Math.cos(j * 1.6) * 0.45, 0.5 + Math.sin(j) * 0.2, -1 + (k % 2) * 0.6 + Math.sin(j * 1.6) * 0.45); } break;
      case 12: tree(4.8, -7, 3.6, 1.6, 0x4ab850); break;
      case 13: { const n = 30, pos = new Float32Array(n * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffe070, size: 0.18, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); S.add(pts);
        this.anims.push((t) => { for (let k = 0; k < n; k++) pos.set([Math.sin(t * 0.4 + k) * 7, 1 + Math.sin(t * 0.9 + k * 2) * 0.8 + (k % 3), Math.cos(t * 0.3 + k * 1.3) * 7], k * 3); g.attributes.position.needsUpdate = true; }); break; }
      case 14: for (let k = 0; k < 3; k++) for (let j = 0; j < 5; j++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 5), std(k === 1 ? 0xff8030 : 0x60c040)); add(s, -8 + j * 0.5, 0.15, -5 + k * 0.6); } break;
      case 15: { const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 2.4), std(0x9a6a3a)); b.rotation.y = 0.6; add(b, -4.5, 0.25, -3.6); break; }
      case 16: for (let k = 0; k < 5; k++) { const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), glow([0x5affd8, 0xc890ff][k % 2], 1.6)); c.scale.y = 2 + (k % 3); c.rotation.z = (k - 2) * 0.3; add(c, 7.6 + k * 0.25, 0.5, 3.2); } break;
      case 17: { const g = new THREE.Group(), m = std(0xd8d0b8); for (const x of [-1.2, 1.2]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.6, 8), m); c.position.set(x, 1.3, 0); g.add(c); } const l = new THREE.Mesh(new THREE.BoxGeometry(3, 0.35, 0.5), m); l.position.y = 2.7; g.add(l); add(g, 0, 0, 9); break; }
      case 18: { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 0), std(0x8a8070)); r.scale.y = 1.4; add(r, -8.2, 1.4, 2.5); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 2.4), new THREE.MeshBasicMaterial({ color: 0xe8fbff, transparent: true, opacity: 0.7 })); f.rotation.y = Math.PI / 2; add(f, -7, 1.2, 2.5); this.anims.push((t) => f.material.opacity = 0.6 + Math.sin(t * 9) * 0.1); break; }
      case 19: { const g = new THREE.Group(); for (const x of [-0.25, 0.25]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.6, 3), std(0xd8c8a0)); r.position.set(x, -0.8, 0); g.add(r); } const s = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.25), std(0x8a5a30)); s.position.y = -1.6; g.add(s); add(g, 5.6, 3.4, -6.4); this.anims.push((t) => g.rotation.x = Math.sin(t * 1.6) * 0.4); break; }
      case 20: for (let k = 0; k < 4; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1 + (k % 2) * 0.3, 0.3), std(0x7a8080, { emissive: 0x206050, emissiveIntensity: 0.6 })); const a = 3.6 + k * 0.35; add(st, Math.cos(a) * 7.5, 0.55, Math.sin(a) * 7.5).rotation.y = -a; } break;
      case 21: for (let k = 0; k < 9; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), glow([0xffc060, 0xff80c0, 0x80e0ff][k % 3], 2)); add(l, -6 + k * 1.5, 3.2 + Math.sin(k * 0.8) * 0.4, -6.5 + Math.abs(k - 4) * 0.3); } break;
      case 22: { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 0.6, 14), std(0xb8b0a0)); add(w, 6.6, 0.3, 5.5); const s = new THREE.Mesh(new THREE.CircleGeometry(0.75, 20), new THREE.MeshBasicMaterial({ color: 0x0a1040 })); s.rotation.x = -Math.PI / 2; add(s, 6.6, 0.62, 5.5);
        for (let k = 0; k < 6; k++) add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 3), new THREE.MeshBasicMaterial({ color: 0xffffff })), 6.6 + Math.cos(k * 2.1) * 0.45, 0.64, 5.5 + Math.sin(k * 2.1) * 0.45); break; }
      case 23: { const g = new THREE.Group(), m = std(0x4a8a3a); const a = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.12, 6, 16, Math.PI), m); a.position.y = 0; g.add(a); for (let k = 0; k < 10; k++) { const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), std(0xff4070, { emissive: 0x400010 })); r.position.set(Math.cos(k / 9 * Math.PI) * 1.3, Math.sin(k / 9 * Math.PI) * 1.3, 0.1); g.add(r); } add(g, 0, 0, 9.6); break; }
      case 24: tree(-1.5, -8, 5.5, 2.4, 0x6ad870); break;
      case 25: { const n = 12, ws = []; for (let k = 0; k < n; k++) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), glow(0xb0fff0, 3)); S.add(w); ws.push(w); } this.anims.push((t) => ws.forEach((w, k) => w.position.set(Math.cos(t * 0.5 + k) * (3 + k % 4), 2 + Math.sin(t + k) * 1.2, Math.sin(t * 0.5 + k) * (3 + k % 4)))); break; }
      case 26: { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.4, 12, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); add(b, -1.5, 9, -8); this.anims.push((t) => b.material.opacity = 0.2 + Math.sin(t * 2) * 0.08); break; }
    }
  }
  open() {
    const g = this.game, rp = g.composer.passes[0];
    this.build(); this.saved = { scene: rp.scene, camera: rp.camera }; rp.scene = this.scene; rp.camera = this.camera;
    this.isOpen = true; this.t = 0; this.game.progress.groveSeen = this.stats().grown; this.game.saveGame?.(); document.body.classList.add('ingrove'); this.renderUI(); this.ui.classList.remove('hidden'); g.audio.play('bloom');
  }
  close() {
    const g = this.game, rp = g.composer.passes[0]; if (!this.isOpen) return;
    rp.scene = this.saved.scene; rp.camera = this.saved.camera; this.isOpen = false; this.scene = null;
    document.body.classList.remove('ingrove'); this.ui.classList.add('hidden'); g.map.render(); g.audio.play('notice');
  }
  renderUI() {
    const st = this.stats(), nxt = GROWTH[st.grown];
    const recent = GROWTH.slice(0, st.grown).slice(-4).reverse().map(([n, d]) => `<li><b>${n}</b> <small>${d}</small></li>`).join('');
    this.ui.innerHTML = `<div class="gv-card"><div class="gv-kick">KIRI’S GROVE</div><h2>${st.grown}/${GROWTH.length} grown</h2>
      <div class="gv-bar"><i style="width:${st.grown / GROWTH.length * 100}%"></i></div>
      ${nxt ? `<p class="gv-next">Next to grow: <b>${nxt[0]}</b><br><small>find 1 more Seed Coin (you have ◉ ${st.coins})</small></p>` : '<p class="gv-next"><b>The grove is complete.</b> Thank you for every seed.</p>'}
      ${recent ? `<ul class="gv-list">${recent}</ul>` : '<p class="dimt">Find Seed Coins in the levels and they’ll take root here.</p>'}
      <div class="gv-row"><span>🐾 ${st.met.length}/5 friends</span><span>♛ ${st.bosses.length} trophies</span><span>🥚 ${st.eggs}/6 eggs</span></div></div>
      <button class="gv-close">◂ Back to the map</button><p class="gv-help">${this.game.input.isTouch ? 'drag to look around' : 'drag or ← → to look around · Esc to leave'}</p>`;
    this.ui.querySelector('.gv-close').onclick = () => this.close();
  }
  update(dt) {
    if (!this.isOpen) return; this.t += dt; const t = this.t;
    this.spinT = (this.spinT || 0) - dt; if (this.spinT <= 0 && this.drag == null) this.yaw += dt * 0.08;
    const asp = innerWidth / innerHeight, R = asp < 1 ? 31 : asp < 1.4 ? 22 : 18; this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.camera.position.set(Math.sin(this.yaw) * R, 9 + Math.sin(t * 0.2) * 0.5, Math.cos(this.yaw) * R); this.camera.lookAt(0, 1, 0);
    for (const a of this.anims) a(t, dt);
  }
}
