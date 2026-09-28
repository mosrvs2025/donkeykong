import * as THREE from 'three';
// Procedural character models. Every model faces +X (the route direction) with +Y up.
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });
const sph = (r, mat, ws = 14, hs = 10) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat); m.castShadow = true; return m; };
const cap = (r, l, mat) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 10), mat); m.castShadow = true; return m; };
const box = (x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x, y, z), mat); m.castShadow = true; return m; };
const cone = (r, h, mat, seg = 8) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat); m.castShadow = true; return m; };
const pivot = (parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };

function eye(parent, x, y, z, r = 0.11, iris = 0x2a1a0a) {
  const e = sph(r, M(0xffffff, { roughness: 0.3 }), 10, 8); e.position.set(x, y, z); parent.add(e);
  const p = sph(r * 0.55, M(iris, { roughness: 0.2 }), 8, 6); p.position.set(r * 0.62, 0, 0); e.add(p);
  const hl = sph(r * 0.18, new THREE.MeshBasicMaterial({ color: 0xffffff }), 6, 4); hl.position.set(r * 0.85, r * 0.3, r * 0.2); e.add(hl);
  return e;
}

// ── Kiri: a ring-tailed tinkerer with brass goggles and a scarf that never stops moving
export function makeHero() {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0); // squash/stretch pivot at feet
  const fur = M(0xe0873a), cream = M(0xf6dcb0), dark = M(0x5a3018), scarfM = M(0x2fbfae, { roughness: 0.9 }), brass = M(0xd4a640, { metalness: 0.7, roughness: 0.35 });
  const torso = pivot(body, 0, 0.62, 0);
  const chest = cap(0.3, 0.32, fur); chest.scale.set(1, 1, 0.9); torso.add(chest);
  const belly = sph(0.24, cream); belly.position.set(0.12, -0.02, 0); belly.scale.set(0.7, 1.1, 0.9); torso.add(belly);
  const head = pivot(torso, 0.05, 0.5, 0);
  const skull = sph(0.34, fur); skull.scale.set(1, 0.95, 1); head.add(skull);
  const muzzle = sph(0.2, cream); muzzle.position.set(0.24, -0.08, 0); muzzle.scale.set(1, 0.8, 1.05); head.add(muzzle);
  const nose = sph(0.06, dark); nose.position.set(0.43, -0.03, 0); head.add(nose);
  const mask = sph(0.2, dark); mask.position.set(0.18, 0.06, 0); mask.scale.set(0.7, 0.6, 1.5); head.add(mask);
  const eyeL = eye(head, 0.26, 0.07, 0.13, 0.1), eyeR = eye(head, 0.26, 0.07, -0.13, 0.1);
  const ears = [];
  for (const z of [0.24, -0.24]) {
    const ep = pivot(head, -0.02, 0.22, z);
    const ear = sph(0.15, fur); ear.scale.set(0.5, 1.2, 0.9); ear.position.y = 0.12; ep.add(ear);
    const inner = sph(0.09, M(0xf2a0a0)); inner.scale.set(0.4, 1, 0.8); inner.position.set(0.05, 0.12, 0); ep.add(inner);
    ep.rotation.x = z > 0 ? -0.5 : 0.5; ears.push(ep);
  }
  // goggles on forehead
  const gog = new THREE.Group(); gog.position.set(0.12, 0.26, 0); head.add(gog);
  for (const z of [0.12, -0.12]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 6, 14), brass); ring.position.set(0.12, 0, z); ring.rotation.y = Math.PI / 2; gog.add(ring);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), new THREE.MeshStandardMaterial({ color: 0x40ffd0, emissive: 0x20a080, emissiveIntensity: 1.2 })); lens.position.set(0.13, 0, z); lens.rotation.y = Math.PI / 2; gog.add(lens); }
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 4, 24), dark); strap.rotation.x = Math.PI / 2; strap.rotation.z = 0.35; strap.position.set(-0.05, -0.05, 0); gog.add(strap);
  // scarf: knot + two trailing tails
  const knot = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.08, 6, 16), scarfM); knot.rotation.x = Math.PI / 2; knot.position.y = 0.3; torso.add(knot);
  const scarf = [];
  let parent = pivot(torso, -0.2, 0.3, 0.05);
  for (let i = 0; i < 4; i++) { const seg = box(0.26, 0.05, 0.14, scarfM); seg.position.x = -0.13; parent.add(seg); const nx = pivot(parent, -0.26, 0, 0); scarf.push(parent); parent = nx; }
  // arms and legs
  const arms = [], legs = [];
  for (const z of [0.3, -0.3]) {
    const a = pivot(torso, 0.02, 0.22, z); const u = cap(0.08, 0.3, fur); u.position.y = -0.2; a.add(u);
    const hand = sph(0.1, dark); hand.position.y = -0.42; a.add(hand); arms.push(a);
    const l = pivot(body, -0.02, 0.42, z * 0.6); const th = cap(0.1, 0.22, fur); th.position.y = -0.18; l.add(th);
    const foot = sph(0.13, dark); foot.scale.set(1.5, 0.6, 1); foot.position.set(0.06, -0.38, 0); l.add(foot); legs.push(l);
  }
  // ringed tail
  const tail = []; parent = pivot(torso, -0.28, -0.2, 0);
  for (let i = 0; i < 9; i++) { const seg = sph(0.09 - i * 0.004, i % 2 ? dark : cream, 8, 6); seg.scale.set(1.4, 1, 1); seg.position.x = -0.09; parent.add(seg); const nx = pivot(parent, -0.16, 0, 0); tail.push(parent); parent = nx; }
  root.traverse((o) => { if (o.isMesh && o.material === scarfM) o.userData.scarf = true; });
  root.userData = { body, torso, head, ears, arms, legs, tail, scarf, eyeL, eyeR };
  return root;
}

// ── Grumbo, the Horned Beast (rhino-boar), ~2m long
export function makeBeast() {
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const hide = M(0x5a6a88), belly = M(0x9aa6b8), horn = M(0xf2e6c8, { roughness: 0.4 }), stripe = M(0xff9a3a);
  const torso = cap(0.55, 0.9, hide); torso.rotation.z = Math.PI / 2; torso.position.y = 0.9; b.add(torso);
  const bel = sph(0.5, belly); bel.scale.set(1.5, 0.7, 0.9); bel.position.set(0, 0.62, 0); b.add(bel);
  const head = pivot(b, 0.85, 1.0, 0);
  const hd = sph(0.45, hide); hd.scale.set(1.2, 0.9, 0.9); head.add(hd);
  const snout = sph(0.3, belly); snout.position.set(0.45, -0.15, 0); head.add(snout);
  const h1 = cone(0.15, 0.7, horn); h1.position.set(0.5, 0.3, 0); h1.rotation.z = -0.5; head.add(h1);
  const h2 = cone(0.08, 0.3, horn); h2.position.set(0.15, 0.42, 0); h2.rotation.z = -0.3; head.add(h2);
  for (const z of [0.2, -0.2]) { const t = cone(0.05, 0.25, horn); t.position.set(0.55, -0.25, z); t.rotation.z = -2.6; head.add(t); }
  eye(head, 0.3, 0.12, 0.28, 0.08); eye(head, 0.3, 0.12, -0.28, 0.08);
  for (let i = 0; i < 3; i++) { const s = box(0.1, 0.05, 1.12, stripe); s.position.set(-0.3 + i * 0.3, 1.42, 0); s.rotation.z = 0.2; b.add(s); }
  const saddle = box(0.6, 0.12, 0.8, M(0x8a4a20)); saddle.position.set(-0.05, 1.46, 0); b.add(saddle);
  const legs = [];
  for (const [x, z] of [[0.55, 0.32], [0.55, -0.32], [-0.55, 0.32], [-0.55, -0.32]]) { const l = pivot(b, x, 0.6, z); const m = cap(0.16, 0.3, hide); m.position.y = -0.3; l.add(m); legs.push(l); }
  const tail = pivot(b, -0.95, 1.0, 0); const tl = cap(0.05, 0.3, hide); tl.rotation.z = 1; tail.add(tl);
  root.userData = { body: b, head, legs, tail, seat: 1.5 };
  return root;
}

// ── Boing, the Giant Tree Frog
export function makeFrog() {
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const skin = M(0x3fc070, { roughness: 0.4 }), bellyM = M(0xffc060), spot = M(0x1a6a8a);
  const bod = sph(0.7, skin); bod.scale.set(1.2, 0.8, 1); bod.position.y = 0.7; b.add(bod);
  const bel = sph(0.6, bellyM); bel.scale.set(1.1, 0.6, 0.9); bel.position.set(0.12, 0.55, 0); b.add(bel);
  for (let i = 0; i < 5; i++) { const s = sph(0.12, spot, 6, 4); s.position.set(-0.4 + i * 0.2, 1.15, (i % 2 ? 0.3 : -0.3)); s.scale.y = 0.4; b.add(s); }
  const head = pivot(b, 0.55, 1.0, 0);
  for (const z of [0.32, -0.32]) { const e = eye(head, 0.05, 0.25, z, 0.22, 0x101010); e.children[0].scale.set(0.5, 1.4, 1); }
  const mouth = box(0.02, 0.03, 0.8, M(0x103020)); mouth.position.set(0.52, -0.05, 0); head.add(mouth);
  const legs = [];
  for (const [x, z] of [[-0.45, 0.55], [-0.45, -0.55]]) { const l = pivot(b, x, 0.5, z); const th = sph(0.3, skin); th.scale.set(1.5, 0.8, 0.6); l.add(th); const ft = sph(0.18, skin); ft.scale.set(1.6, 0.4, 1); ft.position.set(0.3, -0.45, 0); l.add(ft); legs.push(l); }
  for (const [x, z] of [[0.4, 0.45], [0.4, -0.45]]) { const l = pivot(b, x, 0.4, z); const a = cap(0.08, 0.3, skin); a.position.y = -0.2; l.add(a); legs.push(l); }
  const tongue = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), M(0xff5a7a)); tongue.visible = false; root.add(tongue);
  root.userData = { body: b, head, legs, tongue, seat: 1.25 };
  return root;
}

// ── Sola, the Gliding Jungle Bird (long tail, broad wings)
export function makeBird() {
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const red = M(0xe84a3a), yel = M(0xffd040), blu = M(0x2a7ae8), beak = M(0x3a3a3a);
  const bod = sph(0.55, red); bod.scale.set(1.5, 0.8, 0.9); bod.position.y = 0.9; b.add(bod);
  const head = pivot(b, 0.75, 1.25, 0); head.add(sph(0.35, red));
  const bk = cone(0.14, 0.4, beak); bk.rotation.z = -Math.PI / 2 - 0.3; bk.position.set(0.38, -0.05, 0); head.add(bk);
  eye(head, 0.2, 0.08, 0.2, 0.08); eye(head, 0.2, 0.08, -0.2, 0.08);
  const crest = cone(0.1, 0.5, yel); crest.position.set(-0.1, 0.4, 0); crest.rotation.z = 0.6; head.add(crest);
  const wings = [];
  for (const z of [1, -1]) { const w = pivot(b, 0.1, 1.1, 0.4 * z); const m = box(0.8, 0.06, 1.8, blu); m.position.z = 0.9 * z; w.add(m); const tip = box(0.5, 0.05, 0.8, yel); tip.position.set(-0.1, 0, 1.9 * z); w.add(tip); wings.push(w); }
  const tail = pivot(b, -0.75, 0.9, 0); for (let i = 0; i < 3; i++) { const f = box(1.4, 0.04, 0.2, i === 1 ? yel : blu); f.position.set(-0.7, 0, (i - 1) * 0.18); f.rotation.y = (i - 1) * 0.2; tail.add(f); }
  const legs = []; for (const z of [0.2, -0.2]) { const l = pivot(b, 0, 0.5, z); const m = cap(0.05, 0.4, M(0xffa040)); m.position.y = -0.2; l.add(m); legs.push(l); }
  root.userData = { body: b, head, wings, tail, legs, seat: 1.4 };
  return root;
}

// ── Nuu, the River Otter-seal with fin-ears
export function makeFish() {
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const skin = M(0x2a8a9a, { roughness: 0.3, metalness: 0.1 }), bel = M(0xbff0e8), fin = M(0xff7a50);
  const bod = cap(0.45, 1.1, skin); bod.rotation.z = Math.PI / 2; bod.position.y = 0.55; b.add(bod);
  const bb = sph(0.4, bel); bb.scale.set(1.8, 0.6, 0.9); bb.position.set(0.1, 0.35, 0); b.add(bb);
  const head = pivot(b, 0.95, 0.7, 0); head.add(sph(0.38, skin));
  const sn = sph(0.2, bel); sn.position.set(0.3, -0.08, 0); head.add(sn);
  eye(head, 0.25, 0.12, 0.2, 0.09, 0x000000); eye(head, 0.25, 0.12, -0.2, 0.09, 0x000000);
  for (const z of [0.3, -0.3]) { const f = cone(0.12, 0.4, fin); f.position.set(-0.1, 0.35, z); f.rotation.x = z > 0 ? -0.6 : 0.6; head.add(f); }
  const tail = pivot(b, -1.0, 0.55, 0); const tf = box(0.6, 0.06, 0.7, fin); tf.position.x = -0.3; tail.add(tf);
  const legs = []; for (const z of [0.4, -0.4]) { const l = pivot(b, 0.4, 0.4, z); const f2 = box(0.4, 0.05, 0.3, fin); f2.position.set(0, -0.2, z * 0.3); l.add(f2); legs.push(l); }
  root.userData = { body: b, head, tail, legs, seat: 1.05 };
  return root;
}

// ── Oru, the Ancient: a floating stone shell with an inverted-light core and orbiting rune rings
export function makeOru() {
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const stone = M(0x6a7280, { roughness: 0.9, flatShading: true }), glowM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xb080ff, emissiveIntensity: 2.2 });
  const shell = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), stone); shell.scale.set(1.3, 0.8, 1); shell.position.y = 1.0; shell.castShadow = true; b.add(shell);
  const core = sph(0.35, glowM); core.position.set(0.35, 0.95, 0); b.add(core);
  const head = pivot(b, 0.8, 1.05, 0);
  for (const z of [0.18, -0.18]) { const e = sph(0.1, new THREE.MeshStandardMaterial({ color: 0, emissive: 0x80ffe0, emissiveIntensity: 3 })); e.position.set(0.1, 0.05, z); head.add(e); }
  const rings = [];
  for (let i = 0; i < 2; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.1 + i * 0.25, 0.04, 4, 30), glowM); r.position.y = 1.0; b.add(r); rings.push(r); }
  const wings = []; for (const z of [1, -1]) { const w = pivot(b, -0.1, 1.2, 0.5 * z); const m = new THREE.Mesh(new THREE.CircleGeometry(0.8, 5), new THREE.MeshStandardMaterial({ color: 0x80e0ff, emissive: 0x3060a0, transparent: true, opacity: 0.55, side: THREE.DoubleSide })); m.rotation.x = Math.PI / 2; m.position.z = 0.7 * z; w.add(m); wings.push(w); }
  root.userData = { body: b, head, rings, wings, core, legs: [], seat: 1.55 };
  return root;
}

// ── Enemies
export function makeSnapjaw() {
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const shell = M(0xc8342a, { roughness: 0.5 }), under = M(0xf0c070), dark = M(0x301010);
  const bod = sph(0.55, shell); bod.scale.set(1.1, 0.8, 1); bod.position.y = 0.5; b.add(bod);
  for (let i = 0; i < 3; i++) { const sp = sph(0.12, under, 6, 4); sp.position.set(-0.2 + i * 0.2, 0.92, 0); b.add(sp); }
  const jaw = pivot(b, 0.4, 0.4, 0); const j1 = box(0.5, 0.12, 0.6, under); j1.position.x = 0.25; jaw.add(j1);
  const top = pivot(b, 0.4, 0.55, 0); const j2 = box(0.5, 0.12, 0.6, shell); j2.position.x = 0.25; top.add(j2);
  for (let i = 0; i < 4; i++) { const t = cone(0.04, 0.1, M(0xffffff)); t.position.set(0.1 + i * 0.12, -0.1, 0.2); t.rotation.z = Math.PI; top.add(t); }
  eye(b, 0.35, 0.85, 0.2, 0.1); eye(b, 0.35, 0.85, -0.2, 0.1);
  const legs = []; for (const [x, z] of [[0.2, 0.4], [-0.2, 0.4], [0.2, -0.4], [-0.2, -0.4]]) { const l = pivot(b, x, 0.25, z); const m = cap(0.06, 0.15, dark); m.position.y = -0.1; l.add(m); legs.push(l); }
  root.userData = { body: b, jaw, top, legs };
  return root;
}
export function makeSpikeback() {
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const fur = M(0x6a3a8a), spike = M(0xf0e0ff, { roughness: 0.3 }), face = M(0xe0b0a0);
  const bod = sph(0.6, fur); bod.scale.set(1.2, 0.9, 1); bod.position.y = 0.55; b.add(bod);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI, z = (i % 3 - 1) * 0.3; const s = cone(0.1, 0.55, spike, 5); s.position.set(Math.cos(a) * 0.55, 0.55 + Math.sin(a) * 0.5, z); s.rotation.z = a - Math.PI / 2; b.add(s); }
  const f = sph(0.25, face); f.position.set(0.6, 0.45, 0); b.add(f);
  eye(b, 0.72, 0.58, 0.12, 0.07); eye(b, 0.72, 0.58, -0.12, 0.07);
  const legs = []; for (const [x, z] of [[0.3, 0.35], [-0.3, 0.35], [0.3, -0.35], [-0.3, -0.35]]) { const l = pivot(b, x, 0.2, z); const m = cap(0.07, 0.12, face); m.position.y = -0.1; l.add(m); legs.push(l); }
  root.userData = { body: b, legs };
  return root;
}
export function makeBuzzmoth() {
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const fuzz = M(0x8a6a3a), glowM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffd040, emissiveIntensity: 2.5 });
  const bod = sph(0.35, fuzz); bod.position.y = 0.5; b.add(bod);
  const abd = sph(0.3, glowM); abd.scale.set(1.5, 0.9, 0.9); abd.position.set(-0.4, 0.45, 0); b.add(abd);
  eye(b, 0.25, 0.6, 0.14, 0.1, 0x600000); eye(b, 0.25, 0.6, -0.14, 0.1, 0x600000);
  const wings = []; for (const z of [1, -1]) { const w = pivot(b, 0, 0.7, 0.2 * z); const m = new THREE.Mesh(new THREE.CircleGeometry(0.6, 8), new THREE.MeshStandardMaterial({ color: 0xe0c090, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })); m.rotation.x = Math.PI / 2; m.position.z = 0.55 * z; w.add(m); wings.push(w); }
  root.userData = { body: b, wings, legs: [] };
  return root;
}
export function makeEel() {
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const skin = M(0x40306a), glowM = new THREE.MeshStandardMaterial({ color: 0, emissive: 0x60ffb0, emissiveIntensity: 2 });
  const segs = []; let p = pivot(b, 0.6, 0.5, 0);
  const hd = sph(0.35, skin); hd.scale.set(1.4, 0.8, 0.8); p.add(hd);
  eye(p, 0.25, 0.12, 0.16, 0.08, 0x000000); eye(p, 0.25, 0.12, -0.16, 0.08, 0x000000);
  for (let i = 0; i < 6; i++) { const n = pivot(p, -0.4, 0, 0); const s = sph(0.28 - i * 0.03, i % 2 ? glowM : skin, 8, 6); s.scale.set(1.4, 0.8, 0.8); n.add(s); segs.push(n); p = n; }
  root.userData = { body: b, segs, legs: [] };
  return root;
}
