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
// The same rig dresses three heroes: Kiri the ring-tail, Pip the glider and Brom the badger.
export const HERO_LOOKS = {
  kiri: { fur: 0xe0873a, cream: 0xf6dcb0, dark: 0x5a3018, scarf: 0x2fbfae, ear: [0.15, 1.2], eye: 0.1, tail: 'ring', gear: 'goggles', size: 1 },
  pip: { fur: 0x8f9fc4, cream: 0xf6f2ff, dark: 0x2a2c48, scarf: 0x7ad65a, ear: [0.21, 0.95], eye: 0.125, tail: 'bushy', gear: 'leaf', size: 0.9 },
  pim: { fur: 0x8a6aa8, cream: 0xf4e8d8, dark: 0x3a2440, scarf: 0xffc030, ear: [0.17, 1.05], eye: 0.11, tail: 'bushy', gear: 'helmet', size: 0.95 },
  brom: { fur: 0x45454f, cream: 0xf0efe6, dark: 0x1c1c22, scarf: 0xd04a3a, ear: [0.1, 0.8], eye: 0.085, tail: 'stub', gear: 'helmet', size: 1.12 },
};
export function makeHero(kind = 'kiri') {
  const L = HERO_LOOKS[kind] || HERO_LOOKS.kiri;
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0); // squash/stretch pivot at feet
  const fur = new THREE.MeshPhysicalMaterial({ color: L.fur, roughness: 0.75, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(L.cream) }), cream = M(L.cream), dark = M(L.dark), scarfM = M(L.scarf, { roughness: 0.9 }), brass = M(0xd4a640, { metalness: 0.7, roughness: 0.35 });
  const torso = pivot(body, 0, 0.62, 0);
  const chest = cap(0.3, 0.32, fur); chest.scale.set(1, 1, 0.9); torso.add(chest);
  const belly = sph(0.24, cream); belly.position.set(0.12, -0.02, 0); belly.scale.set(0.7, 1.1, 0.9); torso.add(belly);
  const head = pivot(torso, 0.05, 0.5, 0);
  const skull = sph(0.34, fur); skull.scale.set(1, 0.95, 1); head.add(skull);
  const muzzle = sph(0.2, cream); muzzle.position.set(0.24, -0.08, 0); muzzle.scale.set(1, 0.8, 1.05); head.add(muzzle);
  const nose = sph(0.06, dark); nose.position.set(0.43, -0.03, 0); head.add(nose);
  const mask = sph(0.2, dark); mask.position.set(0.18, 0.06, 0); mask.scale.set(0.7, 0.6, 1.5); head.add(mask);
  const eyeL = eye(head, 0.26, 0.07, 0.13, L.eye), eyeR = eye(head, 0.26, 0.07, -0.13, L.eye);
  if (kind === 'brom') { mask.visible = false; const stripe = sph(0.2, cream); stripe.scale.set(1.6, 0.35, 0.5); stripe.position.set(0.08, 0.26, 0); head.add(stripe);
    for (const z of [0.13, -0.13]) { const band = sph(0.14, dark); band.scale.set(1.4, 0.7, 0.6); band.position.set(0.2, 0.06, z); head.add(band); } }
  const ears = [];
  for (const z of [0.24, -0.24]) {
    const ep = pivot(head, -0.02, 0.22, z);
    const ear = sph(L.ear[0], fur); ear.scale.set(0.5, L.ear[1], 0.9); ear.position.y = 0.12; ep.add(ear);
    const inner = sph(0.09, M(0xf2a0a0)); inner.scale.set(0.4, 1, 0.8); inner.position.set(0.05, 0.12, 0); ep.add(inner);
    ep.rotation.x = z > 0 ? -0.5 : 0.5; ears.push(ep);
  }
  // headgear: Kiri's goggles, Pip's leaf, Brom's miner helmet
  const gog = new THREE.Group(); gog.position.set(0.12, 0.26, 0); head.add(gog); gog.visible = L.gear === 'goggles';
  if (L.gear === 'leaf') { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 6), M(0x6ac64a, { roughness: 0.6, side: THREE.DoubleSide })); lf.scale.set(1.4, 0.12, 0.7); lf.position.set(0, 0.36, 0); lf.rotation.z = 0.35; head.add(lf); const st = cap(0.015, 0.1, M(0x3a7a2a)); st.position.set(0.18, 0.36, 0); st.rotation.z = -1; head.add(st); }
  if (L.gear === 'helmet') { const hm = new THREE.Mesh(new THREE.SphereGeometry(0.37, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xe0a830, { metalness: 0.4, roughness: 0.4 })); hm.position.y = 0.08; head.add(hm); const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 18), M(0xc08820, { metalness: 0.4, roughness: 0.4 })); brim.position.y = 0.08; head.add(brim);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0a0, emissiveIntensity: 2.5 })); lamp.rotation.z = Math.PI / 2; lamp.position.set(0.34, 0.26, 0); head.add(lamp); }
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
  const nT = L.tail === 'stub' ? 3 : 9;
  for (let i = 0; i < nT; i++) {
    const r = L.tail === 'bushy' ? 0.1 + Math.sin(i / 8 * Math.PI) * 0.08 : L.tail === 'stub' ? 0.11 - i * 0.02 : 0.09 - i * 0.004;
    const seg = sph(r, L.tail === 'ring' ? (i % 2 ? dark : cream) : (i === nT - 1 ? cream : fur), 8, 6); seg.scale.set(1.4, 1, 1); seg.position.x = -0.09; parent.add(seg); const nx = pivot(parent, L.tail === 'stub' ? -0.1 : -0.16, 0, 0); tail.push(parent); parent = nx; }
  // Pip's gliding membranes (shown while gliding)
  const wings = [];
  if (kind === 'pip') for (const z of [0.3, -0.3]) { const wm = new THREE.Mesh(new THREE.CircleGeometry(0.42, 12), new THREE.MeshStandardMaterial({ color: L.fur, side: THREE.DoubleSide, transparent: true, opacity: 0.85, roughness: 0.8 })); wm.scale.set(0.8, 1, 1); wm.position.set(-0.05, 0.05, z * 1.05); torso.add(wm); wm.visible = false; wings.push(wm); }
  root.scale.setScalar(L.size);
  root.traverse((o) => { if (o.isMesh && o.material === scarfM) o.userData.scarf = true; });
  root.userData = { body, torso, head, ears, arms, legs, tail, scarf, eyeL, eyeR, wings, kind };
  return root;
}

// ── Grumbo, the Horned Beast (rhino-boar), ~2m long
export function makeBeast() {
  // Grumbo: the last horned beast. Armoured shoulders, a shaggy mane, a great curved horn, a well-loved saddle
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const hideM = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.75, sheen: 0.4, sheenColor: new THREE.Color(0x9ab0d0) });
  const gs = (r, top, bot, ws = 22, hs = 14) => { const m = new THREE.Mesh(gradGeo(new THREE.SphereGeometry(r, ws, hs), top, bot), hideM); m.castShadow = true; return m; };
  const plate = new THREE.MeshPhysicalMaterial({ color: 0x3e4a66, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.3 });
  const horn = new THREE.MeshPhysicalMaterial({ color: 0xf4e6c4, roughness: 0.3, clearcoat: 0.6 });
  const mane = new THREE.MeshStandardMaterial({ color: 0x2a2f42, roughness: 1, flatShading: true });
  const hoof = M(0x2a2420, { roughness: 0.5 });
  const torso = gs(0.72, 0x4e5c7e, 0xa8b2c4); torso.scale.set(1.45, 0.82, 0.88); torso.position.y = 0.95; b.add(torso);
  // overlapping shoulder plates
  for (let i = 0; i < 4; i++) { const pl = sph(0.42 - i * 0.04, plate, 16, 8); pl.scale.set(0.9, 0.35, 1.05); pl.position.set(0.45 - i * 0.28, 1.45 - i * 0.03, 0); pl.rotation.z = 0.25; b.add(pl); }
  // shaggy mane tufts along the neck and spine
  for (let i = 0; i < 9; i++) { const t = cone(0.09, 0.32 + (i % 3) * 0.06, mane, 5); t.position.set(0.75 - i * 0.12, 1.55 - Math.abs(i - 2) * 0.03, (i % 2 ? 0.08 : -0.08)); t.rotation.z = -0.5; b.add(t); }
  const head = pivot(b, 0.95, 1.05, 0);
  const hd = gs(0.46, 0x4e5c7e, 0x98a4b8); hd.scale.set(1.25, 0.88, 0.92); head.add(hd);
  const snout = sph(0.3, new THREE.MeshPhysicalMaterial({ color: 0xb8c0cc, roughness: 0.5 }), 16, 10); snout.scale.set(1.1, 0.85, 1); snout.position.set(0.48, -0.16, 0); head.add(snout);
  for (const z of [0.1, -0.1]) { const n = sph(0.05, M(0x1a1c24), 8, 6); n.position.set(0.76, -0.12, z); head.add(n); }
  // the great curved horn (a tapered tube along a curve) and a little one behind it
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.12, 0.3, 0), new THREE.Vector3(0.05, 0.6, 0), new THREE.Vector3(-0.12, 0.78, 0)]);
  const hg = new THREE.TubeGeometry(curve, 16, 0.13, 10, false); const hp = hg.attributes.position; for (let i = 0; i < hp.count; i++) { const k = Math.floor(i / 11) / 16, sc = 1 - k * 0.92; const c = curve.getPoint(k); hp.setXYZ(i, c.x + (hp.getX(i) - c.x) * sc, c.y + (hp.getY(i) - c.y) * sc, c.z + (hp.getZ(i) - c.z) * sc); } hg.computeVertexNormals();
  const h1 = new THREE.Mesh(hg, horn); h1.castShadow = true; h1.position.set(0.52, 0.18, 0); h1.rotation.z = -0.55; head.add(h1);
  const h2 = cone(0.08, 0.28, horn, 10); h2.position.set(0.2, 0.42, 0); h2.rotation.z = -0.35; head.add(h2);
  for (const z of [0.2, -0.2]) { const tk = cone(0.045, 0.24, horn, 8); tk.position.set(0.6, -0.26, z); tk.rotation.z = -2.5; head.add(tk); }
  const ears = []; for (const z of [0.36, -0.36]) { const ep = pivot(head, -0.12, 0.3, z); const e = sph(0.13, hideM, 10, 8); gradGeo(e.geometry, 0x4e5c7e, 0x4e5c7e); e.scale.set(0.5, 1, 0.3); e.position.y = 0.1; ep.add(e); ep.rotation.x = z > 0 ? -0.7 : 0.7; ears.push(ep); }
  const eyes = [face(head, 0.3, 0.12, 0.3, 0.085, 0x3a2410, M(0x232838)), face(head, 0.3, 0.12, -0.3, 0.085, 0x3a2410, M(0x232838))];
  // a well-loved saddle on a striped blanket
  const blanket = box(0.85, 0.06, 1.25, new THREE.MeshStandardMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 16; const x = c.getContext('2d'); ['#d8562a', '#ffb040', '#d8562a', '#3a6ac8'].forEach((col, i) => { x.fillStyle = col; x.fillRect(i * 16, 0, 16, 16); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), roughness: 0.9 }));
  blanket.position.set(-0.08, 1.52, 0); blanket.scale.z = 0.8; b.add(blanket);
  for (const z of [1, -1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.42, 0.04), blanket.material); side.position.set(-0.08, 1.33, 0.56 * z); side.rotation.x = z * 0.35; b.add(side); const fr = box(0.85, 0.04, 0.05, M(0xffd060)); fr.position.set(-0.08, 1.12, 0.63 * z); fr.rotation.x = z * 0.35; b.add(fr); }
  const saddle = sph(0.36, new THREE.MeshPhysicalMaterial({ color: 0x8a4a20, roughness: 0.5, clearcoat: 0.4 }), 16, 8); saddle.scale.set(1.05, 0.32, 1); saddle.position.set(-0.08, 1.58, 0); b.add(saddle);
  const horn2 = cap(0.04, 0.12, M(0xd8a040, { metalness: 0.6, roughness: 0.3 })); horn2.position.set(0.22, 1.68, 0); b.add(horn2);
  const legs = [];
  for (const [x, z] of [[0.58, 0.34], [0.58, -0.34], [-0.58, 0.34], [-0.58, -0.34]]) { const l = pivot(b, x, 0.68, z); const m = gs(0.18, 0x4e5c7e, 0x6a7898, 12, 8); m.scale.set(1, 1.9, 1); m.position.y = -0.26; l.add(m); const hf = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.14, 12), hoof); hf.position.y = -0.6; l.add(hf); legs.push(l); }
  const tail = pivot(b, -1.0, 1.05, 0); const tl = cap(0.045, 0.32, hideM); gradGeo(tl.geometry, 0x4e5c7e, 0x4e5c7e); tl.rotation.z = 1; tail.add(tl); const tuft = cone(0.1, 0.22, mane, 6); tuft.position.set(-0.3, -0.18, 0); tuft.rotation.z = 2.4; tail.add(tuft);
  const la = lifeAnim(eyes);
  root.userData = { body: b, head, legs, tail, seat: 1.62, anim: (t, dt) => { la(t, dt, { near: false, lookX: 1, lookY: 0 }); ears.forEach((e, i) => e.rotation.y = Math.max(0, Math.sin(t * 1.3 + i * 2) - 0.92) * 6); torso.scale.y = 0.82 + Math.sin(t * 1.6) * 0.015; } };
  return root;
}

// ── Boing, the Giant Tree Frog
export function makeFrog() {
  // Boing: a glossy canopy tree frog with sticky toes, a throat sac and a messenger's satchel
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const skin = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.15, sheenColor: new THREE.Color(0x90ff70) });
  const grad = (geo, top, bot) => { const c = new THREE.Color(), ct = new THREE.Color(top), cb = new THREE.Color(bot), p = geo.attributes.position, col = []; let y0 = Infinity, y1 = -Infinity; for (let i = 0; i < p.count; i++) { y0 = Math.min(y0, p.getY(i)); y1 = Math.max(y1, p.getY(i)); } for (let i = 0; i < p.count; i++) { c.copy(cb).lerp(ct, (p.getY(i) - y0) / (y1 - y0 || 1)); col.push(c.r, c.g, c.b); } geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return geo; };
  const gsph = (r, top, bot, ws = 24, hs = 16) => { const m = new THREE.Mesh(grad(new THREE.SphereGeometry(r, ws, hs), top, bot), skin); m.castShadow = true; return m; };
  const belly = new THREE.MeshPhysicalMaterial({ color: 0xfff0b0, roughness: 0.5, sheen: 0.5, sheenColor: new THREE.Color(0xffffff) });
  const spotM = new THREE.MeshPhysicalMaterial({ color: 0x1f7aa0, roughness: 0.3, clearcoat: 1 });
  const pad = new THREE.MeshPhysicalMaterial({ color: 0xffb070, roughness: 0.4, clearcoat: 0.6 });
  // body: a plump teardrop, lime on top fading to sunny yellow at the flanks
  const bod = gsph(0.7, 0x1f9a34, 0x9ccc28); bod.scale.set(1.25, 0.82, 1.02); bod.position.y = 0.72; b.add(bod);
  const bel = sph(0.58, belly, 20, 12); bel.scale.set(1.08, 0.62, 0.92); bel.position.set(0.16, 0.56, 0); b.add(bel);
  for (const [x, y, z, r] of [[-0.35, 1.12, 0.3, 0.13], [-0.05, 1.2, -0.26, 0.11], [-0.55, 1.0, -0.4, 0.1], [0.15, 1.16, 0.28, 0.08], [-0.7, 0.85, 0.42, 0.09], [-0.3, 1.05, -0.5, 0.08]]) { const sp = sph(r, spotM, 10, 6); sp.scale.y = 0.35; sp.position.set(x, y, z); b.add(sp); }
  // head: wide and friendly, with domed eyes up top
  const head = pivot(b, 0.62, 0.98, 0);
  const hd = gsph(0.52, 0x22a63a, 0x94c82a); hd.scale.set(1.15, 0.72, 1.12); head.add(hd);
  const chin = sph(0.42, belly, 16, 10); chin.scale.set(1.1, 0.45, 1); chin.position.set(0.12, -0.16, 0); head.add(chin);
  const sac = sph(0.26, new THREE.MeshPhysicalMaterial({ color: 0xffe8a8, roughness: 0.25, transmission: 0.3, thickness: 0.2, clearcoat: 1 }), 16, 10); sac.position.set(0.2, -0.3, 0); sac.scale.set(1, 0.7, 1); head.add(sac);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 6, 24, Math.PI * 0.9), M(0x184a20)); smile.rotation.set(Math.PI / 2, 0, Math.PI * 0.55); smile.position.set(0.08, -0.06, 0); smile.scale.set(1.2, 1, 1); head.add(smile);
  for (const z of [0.36, -0.36]) { const blush = sph(0.09, new THREE.MeshBasicMaterial({ color: 0xff8aa0, transparent: true, opacity: 0.55 }), 8, 6); blush.scale.set(1, 0.5, 0.4); blush.position.set(0.42, -0.02, z); head.add(blush); }
  const lids = [], eyesArr = [];
  for (const z of [0.3, -0.3]) {
    const dome = gsph(0.2, 0x22a63a, 0x1f9a34, 18, 12); dome.position.set(-0.06, 0.28, z); head.add(dome);
    const e = sph(0.21, M(0xfff6d0, { roughness: 0.15 }), 18, 12); e.position.set(0.1, 0.34, z); head.add(e);
    const ir = sph(0.155, new THREE.MeshPhysicalMaterial({ color: 0xffa010, roughness: 0.1, clearcoat: 1, emissive: 0x402000, emissiveIntensity: 0.3 }), 14, 10); ir.position.set(0.09, 0.01, 0); e.add(ir);
    const pu = box(0.05, 0.06, 0.16, M(0x0a0a0a)); pu.position.set(0.19, 0.01, 0); e.add(pu);
    const hl = sph(0.045, new THREE.MeshBasicMaterial({ color: 0xffffff }), 6, 4); hl.position.set(0.2, 0.08, 0.05); e.add(hl);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.215, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), skin); grad(lid.geometry, 0x22a63a, 0x22a63a); lid.position.copy(e.position); lid.rotation.z = 1.0; head.add(lid); lids.push(lid); eyesArr.push(e);
  }
  // legs: big folded hind legs and little front arms, all with round sticky toe pads
  const legs = [], toes = (parent, x, y, z, n = 4, sc = 1) => { for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 1.4; const t = cap(0.025 * sc, 0.12 * sc, M(0x2aa83c)); t.rotation.z = -Math.PI / 2; t.rotation.y = a; t.position.set(x + Math.cos(a) * 0.08 * sc, y, z + Math.sin(a) * 0.1 * sc); parent.add(t); const pd = sph(0.045 * sc, pad, 8, 6); pd.position.set(x + Math.cos(a) * 0.17 * sc, y, z + Math.sin(a) * 0.17 * sc); pd.scale.y = 0.6; parent.add(pd); } };
  for (const z of [0.55, -0.55]) {
    const l = pivot(b, -0.45, 0.55, z);
    const th = gsph(0.3, 0x1f9a34, 0x8cc028, 14, 10); th.scale.set(1.5, 0.75, 0.6); l.add(th);
    const sh = gsph(0.2, 0x1f9a34, 0x8cc028, 12, 8); sh.scale.set(1.6, 0.5, 0.55); sh.position.set(0.25, -0.28, 0.04 * Math.sign(z)); l.add(sh);
    toes(l, 0.5, -0.47, 0.06 * Math.sign(z), 4, 1.4); legs.push(l);
  }
  for (const z of [0.42, -0.42]) { const l = pivot(b, 0.45, 0.42, z); const a = cap(0.075, 0.26, M(0x2aa83c, { roughness: 0.35 })); a.position.y = -0.18; l.add(a); toes(l, 0.04, -0.36, 0, 3, 1); legs.push(l); }
  // the messenger's satchel
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 4, 28), M(0x8a5a2a)); strap.rotation.set(0, Math.PI / 2, 0.5); strap.position.set(0.05, 0.78, 0); strap.scale.set(1, 0.85, 1.08); b.add(strap);
  const bag = sph(0.2, M(0xb07a3a, { roughness: 0.8 }), 14, 10); bag.scale.set(1, 0.85, 0.45); bag.position.set(-0.3, 0.5, 0.72); bag.rotation.z = 0.2; b.add(bag);
  const flap = sph(0.19, M(0x8a5a2a), 12, 6, ); flap.scale.set(1.05, 0.4, 0.5); flap.position.set(-0.29, 0.62, 0.72); flap.rotation.z = 0.2; b.add(flap);
  const tongue = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 8), M(0xff5a7a, { roughness: 0.3 })); tongue.visible = false; root.add(tongue);
  let blinkT = 2;
  const anim = (t, dt) => { blinkT -= dt; const shut = blinkT < 0.12; if (blinkT < 0) blinkT = 1.5 + Math.random() * 3; lids.forEach((l) => l.rotation.z = shut ? -1.2 : 1.0); const k = 1 + Math.max(0, Math.sin(t * 2.2)) * 0.35; sac.scale.set(k, 0.7 * k, k); };
  root.userData = { body: b, head, legs, tongue, seat: 1.25, anim, eyes: eyesArr };
  return root;
}

// shared: vertex-colour gradients for soft, painted-looking creatures
function gradGeo(geo, top, bot, axis = 'y') { const c = new THREE.Color(), ct = new THREE.Color(top), cb = new THREE.Color(bot), p = geo.attributes.position, get = axis === 'y' ? 'getY' : 'getX', col = []; let a0 = Infinity, a1 = -Infinity; for (let i = 0; i < p.count; i++) { a0 = Math.min(a0, p[get](i)); a1 = Math.max(a1, p[get](i)); } for (let i = 0; i < p.count; i++) { c.copy(cb).lerp(ct, (p[get](i) - a0) / (a1 - a0 || 1)); col.push(c.r, c.g, c.b); } geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return geo; }
const vcMat = (o = {}) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, ...o });
function feather(len, wid, top, bot, mat) { const g = gradGeo(new THREE.SphereGeometry(1, 12, 6), top, bot, 'x'); const m = new THREE.Mesh(g, mat); m.scale.set(len, 0.035, wid); m.castShadow = true; return m; }

// ── Sola, the Sunbird of the Skyward Isles: plump, crested, with fanned feathered wings
export function makeBird() {
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const plume = vcMat({ roughness: 0.6, sheen: 0.1, sheenColor: new THREE.Color(0xffe0a0) }), fm = vcMat({ roughness: 0.5, side: THREE.DoubleSide });
  const bod = new THREE.Mesh(gradGeo(new THREE.SphereGeometry(0.58, 24, 16), 0xd0200e, 0xff8a10), plume); bod.castShadow = true; bod.scale.set(1.45, 0.85, 0.92); bod.position.y = 0.92; b.add(bod);
  const chest = sph(0.42, M(0xffc030, { roughness: 0.7 }), 16, 10); chest.scale.set(0.9, 0.95, 0.85); chest.position.set(0.42, 0.85, 0); b.add(chest);
  const head = pivot(b, 0.78, 1.32, 0);
  const hd = new THREE.Mesh(gradGeo(new THREE.SphereGeometry(0.36, 20, 14), 0xd8240e, 0xff6a1a), plume); hd.castShadow = true; head.add(hd);
  const bkTop = cone(0.11, 0.42, M(0xffc040, { roughness: 0.3 }), 10); bkTop.rotation.z = -Math.PI / 2 - 0.25; bkTop.position.set(0.42, -0.02, 0); head.add(bkTop);
  const bkTip = cone(0.05, 0.14, M(0x3a2a1a), 8); bkTip.rotation.z = -Math.PI / 2 - 0.5; bkTip.position.set(0.62, -0.08, 0); head.add(bkTip);
  const eyes = [face(head, 0.2, 0.08, 0.21, 0.095, 0x1a1010, M(0x7a2010)), face(head, 0.2, 0.08, -0.21, 0.095, 0x1a1010, M(0x7a2010))]; eyes.forEach((f) => f.brow.visible = false);
  for (const z of [0.25, -0.25]) { const bl = sph(0.07, new THREE.MeshBasicMaterial({ color: 0xffa0a0, transparent: true, opacity: 0.5 }), 8, 6); bl.scale.set(1, 0.6, 0.4); bl.position.set(0.24, -0.08, z); head.add(bl); }
  const crest = pivot(head, -0.05, 0.3, 0); for (let i = 0; i < 3; i++) { const f = feather(0.32 - i * 0.04, 0.08, 0xffe040, 0xff6a20, fm); f.rotation.z = 1.1 + i * 0.25; f.position.set(-0.12 - i * 0.08, 0.15, (i - 1) * 0.05); crest.add(f); }
  // wings: fanned primaries (blue to sun-yellow tips) over soft coverts
  const wings = [];
  for (const z of [1, -1]) { const w = pivot(b, 0.1, 1.1, 0.45 * z);
    const cov = feather(0.55, 0.5, 0x2a6ae8, 0x3a8af0, fm); cov.position.set(0, 0, 0.45 * z); w.add(cov);
    for (let i = 0; i < 6; i++) { const f = feather(0.62 - i * 0.03, 0.13, 0xffd040, 0x2a6ae8, fm); const a = (i / 5) * 0.9; f.position.set(-0.15 - i * 0.07, -0.01 * i, (0.65 + i * 0.13) * z); f.rotation.y = -z * (a - 0.2); w.add(f); }
    wings.push(w); }
  // tail: three long sunstreamers
  const tail = pivot(b, -0.78, 0.95, 0);
  for (let i = 0; i < 3; i++) { const f = feather(0.85 + (i === 1 ? 0.35 : 0), 0.11, 0xffe040, i === 1 ? 0xe8402a : 0x2a6ae8, fm); f.position.set(-0.8 - (i === 1 ? 0.18 : 0), 0, (i - 1) * 0.15); f.rotation.y = (i - 1) * 0.22; tail.add(f); }
  const legs = []; for (const z of [0.18, -0.18]) { const l = pivot(b, 0.05, 0.55, z); const m = cap(0.045, 0.36, M(0xffa040)); m.position.y = -0.2; l.add(m); for (const a of [-0.5, 0, 0.5]) { const t = cap(0.025, 0.1, M(0xffa040)); t.rotation.z = -Math.PI / 2; t.rotation.y = a; t.position.set(0.07, -0.42, Math.sin(a) * 0.05); l.add(t); } legs.push(l); }
  const la = lifeAnim(eyes);
  root.userData = { body: b, head, wings, tail, legs, seat: 1.4, anim: (t, dt) => la(t, dt, { near: false, lookX: 1, lookY: 0 }) };
  return root;
}

// ── Nuu, the river otter-seal: sleek, whiskered, with coral fin-ears and a fluke tail
export function makeFish() {
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const skin = vcMat({ roughness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.3 }), fin = new THREE.MeshPhysicalMaterial({ color: 0xff7a50, roughness: 0.4, transmission: 0.25, thickness: 0.2, clearcoat: 0.6, side: THREE.DoubleSide });
  // a lathe-turned teardrop body: teal back fading to a cream belly
  const prof = []; for (let i = 0; i <= 16; i++) { const t = i / 16; prof.push(new THREE.Vector2(Math.sin(Math.PI * Math.pow(t, 0.8)) * 0.5 * (1 - t * 0.25) + 0.02, (t - 0.5) * 2.2)); }
  const bg = new THREE.LatheGeometry(prof, 24); bg.rotateZ(-Math.PI / 2); gradGeo(bg, 0x0b5a6c, 0xc8ece0);
  const bod = new THREE.Mesh(bg, skin); bod.castShadow = true; bod.scale.set(1, 0.9, 0.95); bod.position.set(-0.05, 0.55, 0); b.add(bod);
  for (let i = 0; i < 7; i++) { const sp = sph(0.04 + (i % 3) * 0.015, M(0x9ff0ff, { roughness: 0.2, emissive: 0x206070, emissiveIntensity: 0.4 }), 6, 4); sp.position.set(-0.6 + i * 0.17, 0.9 + Math.sin(i) * 0.05, (i % 2 ? 0.18 : -0.15)); b.add(sp); }
  const head = pivot(b, 0.95, 0.72, 0);
  const hd = new THREE.Mesh(gradGeo(new THREE.SphereGeometry(0.4, 22, 16), 0x0e6478, 0xc0e8dc), skin); hd.castShadow = true; hd.scale.set(1.05, 0.92, 1); head.add(hd);
  const muzzle = sph(0.22, M(0xeefaf4, { roughness: 0.5 }), 16, 10); muzzle.scale.set(1, 0.75, 1.15); muzzle.position.set(0.3, -0.1, 0); head.add(muzzle);
  const nose = sph(0.07, M(0x2a1a1a, { roughness: 0.2 }), 10, 8); nose.scale.set(0.8, 0.7, 1.2); nose.position.set(0.52, -0.02, 0); head.add(nose);
  for (const z of [1, -1]) for (let k = 0; k < 3; k++) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.42, 4), M(0xffffff)); wh.rotation.set(z * (0.15 + k * 0.12), 0, Math.PI / 2 + (k - 1) * 0.15); wh.position.set(0.52, -0.1 + (k - 1) * 0.04, z * 0.24); head.add(wh); }
  const eyes = [face(head, 0.28, 0.14, 0.2, 0.095, 0x101010, M(0x0f4a50)), face(head, 0.28, 0.14, -0.2, 0.095, 0x101010, M(0x0f4a50))]; eyes.forEach((f) => f.brow.visible = false);
  for (const z of [0.3, -0.3]) { const f = new THREE.Mesh(new THREE.CircleGeometry(0.17, 12, 0, Math.PI), fin); f.position.set(-0.08, 0.3, z); f.rotation.set(z > 0 ? -0.5 : 0.5, 0, 0.3); head.add(f); }
  // fluke tail
  const tail = pivot(b, -1.1, 0.58, 0);
  for (const z of [1, -1]) { const lobe = sph(0.3, fin, 12, 6); lobe.scale.set(1.1, 0.06, 0.55); lobe.position.set(-0.28, 0, z * 0.22); lobe.rotation.y = z * 0.5; tail.add(lobe); }
  const legs = []; for (const z of [0.42, -0.42]) { const l = pivot(b, 0.45, 0.4, z); const f2 = sph(0.22, fin, 12, 6); f2.scale.set(1.2, 0.08, 0.6); f2.position.set(0.05, -0.18, z * 0.25); f2.rotation.y = -z * 0.4; l.add(f2); legs.push(l); }
  const la = lifeAnim(eyes);
  root.userData = { body: b, head, tail, legs, seat: 1.05, anim: (t, dt) => la(t, dt, { near: false, lookX: 1, lookY: 0 }) };
  return root;
}

// ── Oru, the Ancient: a floating stone shell with an inverted-light core and orbiting rune rings
export function makeOru() {
  // Oru: a Sunwright who turned himself inside out of time. Rune-carved shell, a calm stone mask,
  // a crystal heart, rune rings and translucent spirit wings.
  const root = new THREE.Group(); const b = pivot(root, 0, 0, 0);
  const runeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#fff'; x.lineWidth = 3; for (let i = 0; i < 9; i++) { const cx = 14 + (i % 3) * 42, cy = 14 + Math.floor(i / 3) * 42; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + 18, cy + (i % 2 ? 6 : 18)); x.lineTo(cx + 6, cy + 24); x.moveTo(cx + 12, cy); x.arc(cx + 12, cy + 12, 6, 0, Math.PI * (i % 2 ? 1 : 2)); x.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const stone = new THREE.MeshPhysicalMaterial({ color: 0x7a8296, roughness: 0.8, flatShading: true, emissive: 0xb080ff, emissiveMap: runeTex, emissiveIntensity: 1.2, clearcoat: 0.3 });
  const shell = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 1), stone); shell.scale.set(1.3, 0.78, 1); shell.position.y = 1.05; shell.castShadow = true; b.add(shell);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.07, 6, 24), new THREE.MeshPhysicalMaterial({ color: 0xc8a050, metalness: 0.8, roughness: 0.3 })); rim.rotation.x = Math.PI / 2; rim.scale.set(1.25, 1, 1); rim.position.y = 0.88; b.add(rim);
  const glowM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xb080ff, emissiveIntensity: 2.2 });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshPhysicalMaterial({ color: 0xe0d0ff, emissive: 0xb080ff, emissiveIntensity: 2, transmission: 0.4, thickness: 0.4, roughness: 0.05 })); core.scale.y = 1.4; core.position.set(0, 0.45, 0); b.add(core);
  // the mask: smooth pale stone, two calm glowing eyes and a little beak-like ridge
  const head = pivot(b, 0.85, 1.08, 0);
  const mask = sph(0.36, new THREE.MeshPhysicalMaterial({ color: 0xe8e2d4, roughness: 0.35, clearcoat: 0.7 }), 22, 16); mask.scale.set(0.7, 1, 0.95); head.add(mask);
  const ridge = cone(0.06, 0.22, M(0xc8a050, { metalness: 0.6, roughness: 0.3 }), 6); ridge.rotation.z = -Math.PI / 2; ridge.position.set(0.26, -0.04, 0); head.add(ridge);
  const eyeL = [];
  for (const z of [0.15, -0.15]) { const e = sph(0.075, new THREE.MeshStandardMaterial({ color: 0, emissive: 0x80ffe0, emissiveIntensity: 3 }), 10, 8); e.scale.set(0.6, 0.5, 1.3); e.position.set(0.22, 0.08, z); head.add(e); eyeL.push(e); const mark = box(0.02, 0.16, 0.02, glowM); mark.position.set(0.24, -0.1, z * 1.1); head.add(mark); }
  const crown = []; for (let i = 0; i < 5; i++) { const sp = cone(0.035, 0.22, new THREE.MeshPhysicalMaterial({ color: 0xc8a050, metalness: 0.8, roughness: 0.25 }), 6); const a = (i - 2) * 0.32; sp.position.set(-0.02 + Math.cos(a) * 0.05, 0.38, Math.sin(a) * 0.3); sp.rotation.x = -a * 0.6; head.add(sp); crown.push(sp); }
  // rune rings
  const rings = [];
  for (let i = 0; i < 2; i++) { const rt = runeTex.clone(); rt.repeat.set(8, 1); rt.needsUpdate = true; const r = new THREE.Mesh(new THREE.TorusGeometry(1.1 + i * 0.25, 0.045, 6, 48), new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 0.7, roughness: 0.3, emissive: 0xb080ff, emissiveMap: rt, emissiveIntensity: 1.8 })); r.position.y = 1.0; b.add(r); rings.push(r); }
  // spirit wings: translucent, gradient, softly additive
  const wingM = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
  const wings = []; for (const z of [1, -1]) { const w = pivot(b, -0.1, 1.25, 0.55 * z);
    for (let k = 0; k < 3; k++) { const g = gradGeo(new THREE.CircleGeometry(0.75 - k * 0.15, 16), 0xa0f0ff, 0x6040c0, 'x'); const m = new THREE.Mesh(g, wingM); m.rotation.x = z * 0.55; m.scale.set(1.3, 0.75, 1); m.position.set(-0.3 - k * 0.2, 0.35 - k * 0.08, (0.35 + k * 0.08) * z); w.add(m); }
    wings.push(w); }
  root.userData = { body: b, head, rings, wings, core, legs: [], seat: 1.55, anim: (t) => { core.rotation.y = t * 1.5; core.position.y = 0.45 + Math.sin(t * 2) * 0.06; const bl = (t % 4.1) < 0.12 ? 0.15 : 1; eyeL.forEach((e) => e.scale.y = 0.5 * bl); stone.emissiveIntensity = 1 + Math.sin(t * 1.4) * 0.4; } };
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
