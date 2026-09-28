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

// ── Enemies: each critter has a face that blinks, eyes that track Kiri and brows that
// turn angry when Kiri gets close. userData.anim(t, dt, ctx) adds the "alive" layer.
const lac = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15, ...o });
const glowMat = (c, i = 2.2) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i });
function face(parent, x, y, z, r, iris, browMat) {
  const socket = pivot(parent, x, y, z);
  const e = sph(r, M(0xfffaf0, { roughness: 0.25 }), 14, 10); socket.add(e);
  const irisG = pivot(e, 0, 0, 0);
  const ir = sph(r * 0.62, M(iris, { roughness: 0.15 }), 12, 8); ir.position.x = r * 0.55; irisG.add(ir);
  const pu = sph(r * 0.34, M(0x050505, { roughness: 0.1 }), 8, 6); pu.position.x = r * 0.82; irisG.add(pu);
  const hl = sph(r * 0.2, new THREE.MeshBasicMaterial({ color: 0xffffff }), 6, 4); hl.position.set(r * 0.95, r * 0.35, r * 0.25); irisG.add(hl);
  const brow = box(r * 1.6, r * 0.34, r * 0.5, browMat); brow.position.set(r * 0.3, r * 1.05, 0); socket.add(brow);
  return { socket, e, irisG, brow, side: Math.sign(z) || 1 };
}
// shared "alive" layer: blink, look at Kiri, angry brows, breathing
function lifeAnim(eyes, extra) {
  let blinkT = 1 + Math.random() * 3, anger = 0;
  return (t, dt, c) => {
    blinkT -= dt; const bl = blinkT < 0.12 ? 0.1 : 1; if (blinkT < 0) blinkT = 1.5 + Math.random() * 3;
    anger += ((c.near ? 1 : 0) - anger) * Math.min(1, dt * 6);
    for (const f of eyes) {
      f.e.scale.y = bl;
      f.irisG.rotation.z = THREE.MathUtils.clamp(c.lookY * 0.6, -0.5, 0.5);
      f.brow.rotation.x = f.side * (0.1 + anger * 0.45); f.brow.position.y = f.brow.userData.y0 ??= f.brow.position.y; f.brow.position.y -= anger * 0.03;
    }
    if (extra) extra(t, dt, c, anger);
  };
}
export function makeSnapjaw() {
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const shell = lac(0xd0302a), shell2 = lac(0x8a1a18), under = M(0xf2c67a, { roughness: 0.55 }), dark = lac(0x2a1010, { clearcoat: 0.6 }), spot = lac(0xffe0a0);
  const bod = sph(0.56, shell, 24, 16); bod.scale.set(1.15, 0.78, 1.02); bod.position.y = 0.52; b.add(bod);
  const belly = sph(0.5, under, 20, 12); belly.scale.set(1.1, 0.5, 0.95); belly.position.y = 0.36; b.add(belly);
  // shell ridge + glossy spots
  const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.035, 6, 24, Math.PI), shell2); ridge.rotation.y = Math.PI / 2; ridge.scale.set(1, 0.8, 1.15); ridge.position.y = 0.52; b.add(ridge);
  for (const [x, y, z, r] of [[-0.1, 0.9, 0.22, 0.09], [-0.32, 0.8, -0.26, 0.07], [0.1, 0.92, -0.18, 0.06], [-0.4, 0.72, 0.32, 0.06]]) { const sp = sph(r, spot, 8, 6); sp.scale.y = 0.4; sp.position.set(x, y, z); b.add(sp); }
  // jaws with teeth and a tongue
  const jaw = pivot(b, 0.46, 0.42, 0); const j1 = sph(0.32, under, 14, 8); j1.scale.set(1, 0.32, 0.95); j1.position.x = 0.2; jaw.add(j1);
  const tongue = sph(0.16, M(0xff6a7a, { roughness: 0.4 }), 10, 6); tongue.scale.set(1.2, 0.3, 0.8); tongue.position.set(0.18, 0.06, 0); jaw.add(tongue);
  const top = pivot(b, 0.46, 0.56, 0); const j2 = sph(0.33, shell, 14, 8); j2.scale.set(1, 0.36, 1); j2.position.x = 0.2; top.add(j2);
  for (let i = 0; i < 5; i++) { const a = (i / 4 - 0.5) * 2.2; const tt = cone(0.035, 0.11, M(0xffffff, { roughness: 0.2 }), 6); tt.position.set(0.2 + Math.cos(a) * 0.26, -0.08, Math.sin(a) * 0.28); tt.rotation.z = Math.PI; top.add(tt); const tb = tt.clone(); tb.rotation.z = 0; tb.position.y = 0.08; jaw.add(tb); }
  // eyes on short stalks
  const eyes = [];
  for (const z of [0.2, -0.2]) { const st = cap(0.05, 0.14, shell2); st.position.set(0.3, 0.9, z); st.rotation.z = -0.3; b.add(st); eyes.push(face(b, 0.36, 1.02, z, 0.11, 0x3a2208, dark)); }
  // pincers
  const claws = [];
  for (const z of [0.5, -0.5]) { const cl = pivot(b, 0.3, 0.45, z); const arm = cap(0.06, 0.2, shell2); arm.rotation.z = -1.2; arm.position.x = 0.12; cl.add(arm);
    const pa = pivot(cl, 0.3, 0.04, 0); const p1 = cone(0.09, 0.28, shell, 8); p1.rotation.z = -Math.PI / 2 - 0.3; p1.position.set(0.12, 0.04, 0); pa.add(p1); const p2 = p1.clone(); p2.rotation.z = -Math.PI / 2 + 0.4; p2.position.y = -0.04; pa.add(p2); claws.push(pa); }
  const legs = []; for (const [x, z] of [[0.25, 0.42], [0, 0.46], [-0.25, 0.42], [0.25, -0.42], [0, -0.46], [-0.25, -0.42]]) { const l = pivot(b, x, 0.3, z); const m = cap(0.045, 0.2, dark); m.position.set(0, -0.12, Math.sign(z) * 0.06); m.rotation.x = Math.sign(z) * 0.4; l.add(m); legs.push(l); }
  root.userData = { body: b, jaw, top, legs, anim: lifeAnim(eyes, (t, dt, c, an) => { claws.forEach((pa, i) => pa.rotation.z = Math.sin(t * (4 + an * 8) + i) * (0.2 + an * 0.3)); bod.scale.y = 0.78 + Math.sin(t * 3) * 0.02; }) };
  return root;
}
export function makeSpikeback() {
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const fur = new THREE.MeshStandardMaterial({ color: 0x5e3482, roughness: 0.95, flatShading: true }), fur2 = new THREE.MeshStandardMaterial({ color: 0x7d4aa6, roughness: 0.95, flatShading: true });
  const crystal = new THREE.MeshPhysicalMaterial({ color: 0xe8d8ff, roughness: 0.05, transmission: 0.4, thickness: 0.3, emissive: 0x8a50ff, emissiveIntensity: 0.35, clearcoat: 1 });
  const skin = M(0xe8b0a0, { roughness: 0.6 }), dark = M(0x2a1030);
  const bod = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 2), fur); bod.castShadow = true; bod.scale.set(1.25, 0.9, 1); bod.position.y = 0.58; b.add(bod);
  for (let i = 0; i < 22; i++) { const clump = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), i % 2 ? fur : fur2); const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2; clump.position.set(Math.cos(a) * Math.cos(e) * 0.7 - 0.05, 0.58 + Math.sin(e) * 0.5, Math.sin(a) * Math.cos(e) * 0.6); b.add(clump); }
  // crystal quills, longer down the spine
  for (let i = 0; i < 20; i++) { const a = 0.25 + (i / 19) * (Math.PI - 0.5), z = ((i * 7) % 5 - 2) * 0.14; const L = 0.35 + Math.sin(a) * 0.35; const q = cone(0.08, L, crystal, 5); q.position.set(Math.cos(a) * 0.62 - 0.08, 0.58 + Math.sin(a) * 0.5, z); q.rotation.z = a - Math.PI / 2 - 0.25; q.rotation.x = z * 0.8; b.add(q); }
  // snout, nose, tusks, ears
  const sn = sph(0.26, skin, 16, 10); sn.scale.set(1.2, 0.9, 1); sn.position.set(0.7, 0.42, 0); b.add(sn);
  const nose = sph(0.1, M(0x301020, { roughness: 0.3 }), 10, 8); nose.scale.set(0.8, 0.7, 1.3); nose.position.set(0.98, 0.46, 0); b.add(nose);
  for (const z of [0.14, -0.14]) { const tk = cone(0.035, 0.18, M(0xfff4e0, { roughness: 0.3 }), 6); tk.position.set(0.86, 0.32, z); tk.rotation.z = -0.5; b.add(tk);
    const ear = cone(0.1, 0.22, fur2, 5); ear.position.set(0.42, 0.98, z * 2); ear.rotation.x = z > 0 ? -0.5 : 0.5; b.add(ear); }
  const eyes = [face(b, 0.74, 0.62, 0.15, 0.085, 0x7a1030, dark), face(b, 0.74, 0.62, -0.15, 0.085, 0x7a1030, dark)];
  const tail = sph(0.09, fur2, 6, 4); tail.position.set(-0.78, 0.6, 0); b.add(tail);
  const legs = []; for (const [x, z] of [[0.35, 0.36], [-0.35, 0.36], [0.35, -0.36], [-0.35, -0.36]]) { const l = pivot(b, x, 0.25, z); const m = cap(0.08, 0.12, dark); m.position.y = -0.1; l.add(m); legs.push(l); }
  root.userData = { body: b, legs, anim: lifeAnim(eyes, (t, dt, c, an) => { bod.scale.set(1.25, 0.9 + Math.sin(t * 2.5) * 0.03 + an * 0.06, 1); crystal.emissiveIntensity = 0.35 + an * 1.2; tail.position.y = 0.6 + Math.sin(t * 12) * 0.03; }) };
  return root;
}
function wingTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, '#fff2c0'); g.addColorStop(0.6, '#e0a860'); g.addColorStop(1, '#7a4a20'); x.fillStyle = g; x.beginPath(); x.arc(64, 64, 63, 0, 7); x.fill();
  x.strokeStyle = '#5a3010aa'; x.lineWidth = 2; for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62); x.stroke(); }
  x.fillStyle = '#2a1030'; x.beginPath(); x.arc(84, 56, 16, 0, 7); x.fill(); x.fillStyle = '#ffd040'; x.beginPath(); x.arc(84, 56, 9, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(87, 52, 3, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
let _wt;
export function makeBuzzmoth() {
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const fuzz = new THREE.MeshStandardMaterial({ color: 0x9a7444, roughness: 1, flatShading: true }), glowM = glowMat(0xffd040, 2.6), dark = M(0x2a1808);
  const bod = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 2), fuzz); bod.castShadow = true; bod.position.y = 0.52; b.add(bod);
  const ruff = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 6, 14), new THREE.MeshStandardMaterial({ color: 0xf0e0c0, roughness: 1, flatShading: true })); ruff.rotation.y = Math.PI / 2; ruff.position.set(0.05, 0.5, 0); b.add(ruff);
  const abd = sph(0.3, glowM, 16, 10); abd.scale.set(1.5, 0.9, 0.9); abd.position.set(-0.45, 0.45, 0); b.add(abd);
  for (let i = 0; i < 3; i++) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.27 - i * 0.03, 0.03, 5, 14), dark); band.rotation.y = Math.PI / 2; band.position.set(-0.3 - i * 0.16, 0.45, 0); band.scale.set(0.9, 0.9 - i * 0.05, 1); b.add(band); }
  const eyes = [face(b, 0.24, 0.6, 0.15, 0.11, 0x800010, dark), face(b, 0.24, 0.6, -0.15, 0.11, 0x800010, dark)];
  // feathery antennae
  const ants = [];
  for (const z of [0.1, -0.1]) { const a = pivot(b, 0.25, 0.8, z); for (let i = 0; i < 5; i++) { const f = cone(0.05 - i * 0.006, 0.12, fuzz, 4); f.position.set(0.05 + i * 0.06, 0.08 + i * 0.07, 0); f.rotation.z = -0.8; a.add(f); } a.rotation.x = z * 3; ants.push(a); }
  _wt ||= wingTex();
  const wmat = new THREE.MeshStandardMaterial({ map: _wt, side: THREE.DoubleSide, transparent: true, roughness: 0.6, alphaTest: 0.05 });
  const wings = []; for (const z of [1, -1]) { const w = pivot(b, 0, 0.72, 0.2 * z);
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), wmat); m.rotation.x = z * 0.55; m.scale.set(1, 1.2, 1); m.position.set(0.05, 0.55, 0.3 * z); w.add(m);
    const m2 = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), wmat); m2.rotation.x = z * 0.55; m2.position.set(-0.38, 0.3, 0.2 * z); w.add(m2); wings.push(w); }
  const legs = []; for (let i = 0; i < 3; i++) for (const z of [0.12, -0.12]) { const l = pivot(b, 0.1 - i * 0.12, 0.25, z); const m = cap(0.02, 0.18, dark); m.position.y = -0.1; l.add(m); legs.push(l); }
  root.userData = { body: b, wings, legs: [], anim: lifeAnim(eyes, (t, dt, c, an) => { glowM.emissiveIntensity = 2.2 + Math.sin(t * 5) * 0.8; ants.forEach((a, i) => a.rotation.z = Math.sin(t * 3 + i) * 0.15); legs.forEach((l, i) => l.rotation.z = Math.sin(t * 6 + i) * 0.3); }) };
  return root;
}
export function makeEel() {
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const skin = lac(0x55449a, { clearcoat: 0.8 }), belly = M(0xb0a0e0, { roughness: 0.4 }), glowM = glowMat(0x60ffb0, 2), fin = new THREE.MeshStandardMaterial({ color: 0x80e0ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, emissive: 0x2080a0, emissiveIntensity: 0.6 });
  const segs = []; let p = pivot(b, 0.6, 0.5, 0);
  const hd = sph(0.36, skin, 20, 14); hd.scale.set(1.45, 0.82, 0.85); p.add(hd);
  const chin = sph(0.3, belly, 14, 8); chin.scale.set(1.3, 0.5, 0.75); chin.position.set(0.05, -0.12, 0); p.add(chin);
  for (let i = 0; i < 6; i++) { const tt = cone(0.03, 0.12, M(0xffffff, { roughness: 0.2 }), 5); tt.position.set(0.28 + (i % 3) * 0.08, -0.1, (i < 3 ? 1 : -1) * 0.12); tt.rotation.z = Math.PI; p.add(tt); }
  // anglerfish-style lure
  const lp = pivot(p, 0.15, 0.25, 0); const stalk = cap(0.02, 0.35, skin); stalk.position.set(0.12, 0.18, 0); stalk.rotation.z = -0.7; lp.add(stalk);
  const lure = sph(0.09, glowM, 10, 8); lure.position.set(0.3, 0.32, 0); lp.add(lure);
  const eyes = [face(p, 0.3, 0.2, 0.23, 0.095, 0x10ff90, M(0x1a1030)), face(p, 0.3, 0.2, -0.23, 0.085, 0x10ff90, M(0x1a1030))];
  for (let i = 0; i < 6; i++) { const n = pivot(p, -0.4, 0, 0); const s = sph(0.28 - i * 0.03, skin, 12, 8); s.scale.set(1.4, 0.8, 0.8); n.add(s);
    const dot = sph(0.06 - i * 0.005, glowM, 6, 4); dot.position.set(0, 0.05, 0.2 - i * 0.02); n.add(dot); const dot2 = dot.clone(); dot2.position.z *= -1; n.add(dot2);
    const df = new THREE.Mesh(new THREE.CircleGeometry(0.2 - i * 0.02, 8, 0, Math.PI), fin); df.position.y = 0.18 - i * 0.02; n.add(df); segs.push(n); p = n; }
  const tf = new THREE.Mesh(new THREE.CircleGeometry(0.28, 10, Math.PI / 2, Math.PI), fin); tf.position.x = -0.2; p.add(tf);
  root.userData = { body: b, segs, legs: [], anim: lifeAnim(eyes, (t, dt, c, an) => { lp.rotation.z = Math.sin(t * 2) * 0.2; glowM.emissiveIntensity = 1.6 + Math.sin(t * 3) * 0.8 + an; }) };
  return root;
}
