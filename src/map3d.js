import * as THREE from 'three';
import { makeHero } from './models.js';
import { LEVELS, LINKS, levelById } from './map.js';

// The world map as a toy-like 3D island diorama: animated sea with shore foam, one landmark
// per area, dotted paths that pop in when unlocked, flags on every level, and the current
// hero walking the roads. Rendered through the main composer (bloom + grade) in its own scene.
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, z) => vnoise(x, z) * 0.6 + vnoise(x * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, z * 4.3) * 0.1;
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, ...o });
const glow = (c, i = 2) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i });
const ZONE = { thornwell: 0x4a6a3a, rootwild: 0x5cae48, canopy: 0x3d8f3a, ruins: 0x8fa276, glowdeep: 0x6c5aa6, mine: 0xa8683c, heart: 0xd8bc5c };
const W = 120, D = 90; // terrain extents

export class MapWorld {
  constructor(game) {
    this.game = game;
    const S = (this.scene = new THREE.Scene());
    this.camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.5, 400);
    const cv = document.createElement('canvas'); cv.width = 2; cv.height = 256; const x = cv.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#4f9be8'); g.addColorStop(0.55, '#9fd4f4'); g.addColorStop(1, '#fff0d0'); x.fillStyle = g; x.fillRect(0, 0, 2, 256);
    const bg = new THREE.CanvasTexture(cv); bg.colorSpace = THREE.SRGBColorSpace; S.background = bg;
    S.fog = new THREE.Fog(0xbfe4f6, 70, 190);
    S.add(new THREE.HemisphereLight(0xdff4ff, 0x4a6a3a, 1.3));
    const sun = (this.sun = new THREE.DirectionalLight(0xfff2d8, 2.8)); sun.position.set(-30, 60, 40); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -65, right: 65, top: 50, bottom: -50, near: 1, far: 200 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05; sun.shadow.radius = 3;
    S.add(sun);
    this.pos = {}; for (const l of LEVELS) this.pos[l.id] = new THREE.Vector3((l.at[0] - 470) * 0.1, 0, (l.at[1] - 385) * 0.1);
    this.buildTerrain(); this.buildSea(); this.buildLandmarks(); this.buildDecor(); this.buildPaths(); this.buildNodes(); this.buildClouds();
    this.labels = document.createElement('div'); this.labels.id = 'map-labels'; this.labels.style.display = 'none'; document.body.appendChild(this.labels);
    this.t = 0; this.camPos = new THREE.Vector3(); this.camLook = new THREE.Vector3(); this.snap = true;
    this.ray = new THREE.Raycaster();
  }
  // ── terrain: a continent grown along the main road, with a mountain for the mine
  mainland() { return LEVELS.filter((l) => !l.optional || l.deep); }
  heightAt(x, z) {
    const P = this.pos; let m = -1;
    const segD = (px, pz, a, b) => { const abx = b.x - a.x, abz = b.z - a.z, t = Math.max(0, Math.min(1, ((px - a.x) * abx + (pz - a.z) * abz) / (abx * abx + abz * abz))); return Math.hypot(px - a.x - abx * t, pz - a.z - abz * t); };
    for (const l of this.mainland()) m = Math.max(m, 1 - Math.hypot(x - P[l.id].x, z - P[l.id].z) / 11);
    const land = (id) => !levelById(id).optional || levelById(id).deep;
    for (const [a, b] of LINKS) if (land(a) && land(b)) m = Math.max(m, 1 - segD(x, z, P[a], P[b]) / 9.5);
    m += (fbm(x * 0.12, z * 0.12) - 0.5) * 0.45;
    let h = m <= 0 ? Math.max(-3.5, m * 9) : 0.25 + Math.min(1, m * 2.2) * 1.6 + fbm(x * 0.25 + 9, z * 0.25) * 1.4 * Math.min(1, m * 2);
    const mt = P.mine, dm = (x - mt.x - 4) ** 2 + (z - mt.z + 5) ** 2; h += 11 * Math.exp(-dm / 30) * Math.max(0, Math.min(1, m * 3));
    const ht = P.heart, dh = (x - ht.x) ** 2 + (z - ht.z) ** 2; h += 1.6 * Math.exp(-dh / 14) * Math.max(0, Math.min(1, m * 3));
    return h;
  }
  zoneColor(x, z, h, out) {
    let wsum = 0; const c = new THREE.Color(), acc = [0, 0, 0];
    for (const l of this.mainland()) { const d2 = (x - this.pos[l.id].x) ** 2 + (z - this.pos[l.id].z) ** 2, w = 1 / (d2 * d2 + 40); c.setHex(ZONE[l.id]); acc[0] += c.r * w; acc[1] += c.g * w; acc[2] += c.b * w; wsum += w; }
    out.setRGB(acc[0] / wsum, acc[1] / wsum, acc[2] / wsum);
    const n = fbm(x * 0.4, z * 0.4); out.offsetHSL(0, 0, (n - 0.5) * 0.08);
    if (h < 0) out.lerp(c.setHex(0x3a8a8a), 0.7);
    else if (h < 0.75) out.lerp(c.setHex(0xf0dca0), Math.min(1, (0.75 - h) * 2.2));
    if (h > 5) out.lerp(c.setHex(0x8a7a6a), Math.min(1, (h - 5) / 2));
    if (h > 9.5) out.lerp(c.setHex(0xf8f8ff), Math.min(1, (h - 9.5) / 1.2));
    return out;
  }
  buildTerrain() {
    const geo = new THREE.PlaneGeometry(W, D, 150, 112); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), h = this.heightAt(x, z); p.setY(i, h); this.zoneColor(x, z, h, c); col.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const t = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true }));
    t.receiveShadow = true; t.castShadow = true; this.scene.add(t);
    // heightmap for the sea shader (shore foam, shallows)
    const N = 128, data = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) data[j * N + i] = this.heightAt((i / (N - 1) - 0.5) * W, (j / (N - 1) - 0.5) * D);
    this.hTex = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.FloatType); this.hTex.magFilter = this.hTex.minFilter = THREE.LinearFilter; this.hTex.needsUpdate = true;
  }
  buildSea() {
    this.seaU = { time: { value: 0 }, hTex: { value: this.hTex }, ext: { value: new THREE.Vector2(W, D) } };
    const m = new THREE.ShaderMaterial({
      transparent: true, uniforms: this.seaU,
      vertexShader: `uniform float time; varying vec3 vW; void main(){ vec3 p = position; vec4 w = modelMatrix * vec4(p,1.0);
        w.y += sin(w.x*0.25 + time*1.3)*0.08 + cos(w.z*0.3 + time)*0.08; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float time; uniform sampler2D hTex; uniform vec2 ext; varying vec3 vW;
        void main(){ vec2 uv = vW.xz / ext + 0.5; float h = (uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0) ? -4.0 : texture2D(hTex, uv).r;
          float depth = clamp(-h / 3.5, 0.0, 1.0);
          vec3 shallow = vec3(0.35, 0.86, 0.85), deep = vec3(0.08, 0.36, 0.66);
          vec3 c = mix(shallow, deep, smoothstep(0.0, 0.9, depth));
          float band = sin(-h * 7.0 - time * 2.2) * 0.5 + 0.5;
          float foam = smoothstep(0.35, 0.0, -h) + step(0.82, band) * smoothstep(1.1, 0.2, -h) * 0.8;
          float sp = step(0.994, fract(sin(dot(floor(vW.xz * 5.0), vec2(12.9, 78.2))) * 43758.5 + time * 0.25)) * (1.0 - foam);
          c = mix(c, vec3(1.0), clamp(foam, 0.0, 1.0) * 0.85) + sp * 0.35;
          float dist = length(vW.xz); c = mix(c, vec3(0.62, 0.84, 0.95), smoothstep(80.0, 170.0, dist));
          gl_FragColor = vec4(c, mix(0.72, 0.95, depth)); }`,
    });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(420, 420, 120, 120), m); sea.rotation.x = -Math.PI / 2; sea.position.y = 0.02; this.scene.add(sea);
  }
  ground(id, dx = 0, dz = 0) { const p = this.pos[id]; return new THREE.Vector3(p.x + dx, Math.max(0.2, this.heightAt(p.x + dx, p.z + dz)), p.z + dz); }
  tree(g, x, y, z, s = 1, col = 0x3f9a3a) {
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 1.2 * s, 6), std(0x7a4e2a)); tr.position.set(x, y + 0.6 * s, z); g.add(tr);
    const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75 * s, 0), std(col)); cr.position.set(x, y + 1.5 * s, z); cr.scale.y = 1.15; g.add(cr);
    const cr2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 * s, 0), std(new THREE.Color(col).offsetHSL(0, 0, 0.06))); cr2.position.set(x + 0.3 * s, y + 2.1 * s, z - 0.1 * s); g.add(cr2);
  }
  buildLandmarks() {
    const S = this.scene, L = (this.landmarks = new THREE.Group()); S.add(L);
    // Rootwild: a ring of old trees and a stump
    { const c = this.ground('rootwild', -3.5, -3.2); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const x = c.x + Math.cos(a) * 2.2, z = c.z + Math.sin(a) * 1.6; this.tree(L, x, this.heightAt(x, z), z, 1 + (i % 3) * 0.2); } }
    // Canopy of Hands: one giant tree with lanterns
    { const c = this.ground('canopy', -3.5, -4.5), g = new THREE.Group(); g.position.copy(c); L.add(g);
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.5, 9, 8), std(0x6a4426)); tr.position.y = 4.5; g.add(tr);
      for (const [x, y, z, r] of [[0, 9.5, 0, 3.4], [2.4, 8.2, 1, 2.4], [-2.4, 8.4, -0.6, 2.5], [0.6, 11, -1, 2.2], [-1, 7.6, 2, 2]]) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), std(0x2f8a3a)); b.position.set(x, y, z); b.castShadow = true; g.add(b); }
      this.lanterns = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), glow(0xffc860, 2.5)); l.position.set(Math.cos(a) * 3.2, 7 + (i % 2), Math.sin(a) * 2.6); g.add(l); this.lanterns.push(l); } }
    // Weeping Ruins: columns, an arch and a waterfall
    { const c = this.ground('ruins', 3.2, -3.4), g = new THREE.Group(); g.position.copy(c); L.add(g); const st = std(0xc8c0a8);
      for (const [x, z, h] of [[-1.6, 0, 3], [1.6, 0, 3], [2.8, 1.4, 1.6], [-3, 1.2, 2.2], [0.4, 2.2, 1]]) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, h, 7), st); col.position.set(x, h / 2, z); g.add(col); }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.5, 0.8), st); lintel.position.set(0, 3.2, 0); lintel.rotation.z = 0.06; g.add(lintel);
      const wf = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 4), new THREE.MeshBasicMaterial({ color: 0xcff6ff, transparent: true, opacity: 0.8 })); wf.position.set(-4.5, 1.2, 1.5); wf.rotation.y = 0.4; g.add(wf); this.fall = wf; }
    // Glowdeep: a cave mouth ringed with glowing mushrooms
    { const c = this.ground('glowdeep', 1.5, -3.8), g = new THREE.Group(); g.position.copy(c); L.add(g);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(3, 0), std(0x4a4060)); rock.scale.set(1.4, 0.9, 1); rock.position.y = 1.2; g.add(rock);
      const mouth = new THREE.Mesh(new THREE.CircleGeometry(1.3, 12, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x0a0418 })); mouth.position.set(0, 0.3, 2.75); g.add(mouth);
      this.shrooms = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI + Math.PI * 0.05; const s = 0.4 + (i % 3) * 0.25; const cap = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), glow(i % 2 ? 0x60ffd8 : 0xc080ff, 1.6)); const stem = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.25, s * 0.3, s * 1.4, 6), std(0xe8e0f0)); const x = Math.cos(a) * 3.8, z = Math.sin(a) * 2.8 + 0.8; stem.position.set(x, s * 0.7, z); cap.position.set(x, s * 1.4, z); g.add(stem, cap); this.shrooms.push(cap); } }
    // Sunwright Mine: an entrance in the mountain, rails and a cart
    { const c = this.ground('mine', 1.8, -2.4), g = new THREE.Group(); g.position.copy(c); L.add(g);
      const fr = std(0x6a4a2a); for (const x of [-0.9, 0.9]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2, 0.3), fr); post.position.set(x, 1, 0); g.add(post); }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 0.4), fr); beam.position.set(0, 2.05, 0); g.add(beam);
      const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9), new THREE.MeshBasicMaterial({ color: 0x100804 })); hole.position.set(0, 0.95, -0.1); g.add(hole);
      const rail = std(0x9a9aa8, { metalness: 0.6, roughness: 0.4 }); for (const x of [-0.35, 0.35]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4), rail); r.position.set(x, 0.05, 2); g.add(r); }
      const cart = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 0.8), std(0x8a5a30)); cart.position.set(0, 0.45, 2.6); g.add(cart);
      const ore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), glow(0xffa040, 1.4)); ore.position.set(0, 0.85, 2.6); g.add(ore); }
    // Heart of the Seed: the great glowing seed on its mound
    { const c = this.ground('heart', 0, -3.4), g = new THREE.Group(); g.position.copy(c); L.add(g);
      const seed = new THREE.Mesh(new THREE.SphereGeometry(1.8, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffe8a0, emissive: 0xffb830, emissiveIntensity: 1.3, roughness: 0.3 })); seed.scale.set(0.85, 1.2, 0.85); seed.position.y = 2.4; g.add(seed); this.seed = seed;
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const root = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, 3, 5), std(0x6a4426)); root.position.set(Math.cos(a) * 1.2, 0.6, Math.sin(a) * 1.2); root.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); g.add(root); } }
    // The Thornwell: a thorn-ringed sinkhole glowing from far below
    { const c = this.ground('thornwell', 0, -3.6), g = new THREE.Group(); g.position.copy(c); L.add(g);
      const pit = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), new THREE.MeshBasicMaterial({ color: 0x05030a })); pit.rotation.x = -Math.PI / 2; pit.position.y = 0.06; g.add(pit);
      const glowR = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.1, 24), new THREE.MeshBasicMaterial({ color: 0x60ffd0, transparent: true, opacity: 0.35 })); glowR.rotation.x = -Math.PI / 2; glowR.position.y = 0.08; g.add(glowR); this.wellGlow = glowR;
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const th = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.4 + (i % 3) * 0.4, 5), std(0x5a2a4a)); th.position.set(Math.cos(a) * 2.5, 0.6, Math.sin(a) * 2.5); th.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(th); } }
    // Skyward Isles: a floating island in the clouds
    { const p = this.pos.skyward, g = (this.sky = new THREE.Group()); g.position.set(p.x, 13, p.z); L.add(g);
      const rock = new THREE.Mesh(new THREE.ConeGeometry(3.4, 5, 8), std(0x8a7a6a)); rock.rotation.x = Math.PI; rock.position.y = -2.5; g.add(rock);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.4, 0.7, 10), std(0x6cc450)); top.position.y = 0.05; g.add(top);
      this.tree(g, -1.8, 0.4, -1.2, 0.9, 0x5ab84a); this.tree(g, 2, 0.4, -0.8, 0.8, 0x5ab84a);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); this.skyY = 13; }
    // Sunken Sanctum: a temple peak rising from the sea, with a whirlpool
    { const p = this.pos.sunken, g = new THREE.Group(); g.position.set(p.x, 0, p.z + 1.5); L.add(g);
      const pyr = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3, 4), std(0x6a9a9a)); pyr.position.y = 0.6; pyr.rotation.y = Math.PI / 4; g.add(pyr);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), glow(0x60e0ff, 2)); gem.position.y = 2.6; g.add(gem); this.gem = gem;
      const swirl = new THREE.Mesh(new THREE.RingGeometry(2.8, 3.6, 32, 1, 0, Math.PI * 1.5), new THREE.MeshBasicMaterial({ color: 0xe8ffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })); swirl.rotation.x = -Math.PI / 2; swirl.position.y = 0.12; g.add(swirl); this.swirl = swirl; }
    L.traverse((o) => { if (o.isMesh && !o.material.isMeshBasicMaterial) { o.castShadow = true; o.receiveShadow = true; } });
  }
  buildDecor() {
    // scattered trees, palms on the beach and rocks, instanced
    const tr = [], pa = [], rk = [];
    for (let i = 0; i < 900 && tr.length < 260; i++) {
      const x = (hash(i, 1) - 0.5) * W * 0.9, z = (hash(i, 2) - 0.5) * D * 0.9, h = this.heightAt(x, z);
      let near = false; for (const id in this.pos) if (Math.hypot(x - this.pos[id].x, z - this.pos[id].z) < 5.5) near = true;
      if (near || h < 0.2) continue;
      if (h < 0.8) { if (pa.length < 40) pa.push([x, h, z]); } else if (h < 5.5) tr.push([x, h, z]); else if (rk.length < 40) rk.push([x, h, z]);
    }
    const put = (list, geo, mat, fn) => { const m = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D(); list.forEach((p, i) => { fn(o, p, i); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.castShadow = true; m.receiveShadow = true; this.scene.add(m); return m; };
    const crownG = new THREE.IcosahedronGeometry(0.7, 0); crownG.translate(0, 1.5, 0); const trunkG = new THREE.CylinderGeometry(0.1, 0.16, 1.1, 5); trunkG.translate(0, 0.55, 0);
    const setT = (o, p, i) => { const s = 0.7 + hash(i, 7) * 0.7; o.position.set(p[0], p[1], p[2]); o.scale.set(s, s * (0.9 + hash(i, 8) * 0.5), s); o.rotation.y = hash(i, 9) * 6; };
    const crowns = put(tr, crownG, std(0xffffff), setT); put(tr, trunkG, std(0x7a4e2a), setT);
    const c = new THREE.Color(); tr.forEach((p, i) => { this.zoneColor(p[0], p[2], 2, c); c.offsetHSL(0, 0.05, -0.08 + hash(i, 5) * 0.08); crowns.setColorAt(i, c); });
    const palmG = new THREE.ConeGeometry(0.9, 0.35, 6); palmG.translate(0, 1.9, 0); const palmT = new THREE.CylinderGeometry(0.07, 0.12, 1.9, 5); palmT.translate(0, 0.95, 0);
    const setP = (o, p, i) => { o.position.set(p[0], p[1], p[2]); o.rotation.set(0, hash(i, 3) * 6, (hash(i, 4) - 0.5) * 0.4); o.scale.setScalar(0.8 + hash(i, 6) * 0.4); };
    put(pa, palmG, std(0x4cae3a), setP); put(pa, palmT, std(0x9a7040), setP);
    put(rk, new THREE.DodecahedronGeometry(0.6, 0), std(0x8a8078), (o, p, i) => { o.position.set(p[0], p[1] + 0.2, p[2]); o.scale.setScalar(0.6 + hash(i, 2) * 1.2); o.rotation.set(hash(i, 3) * 3, hash(i, 4) * 3, 0); });
  }
  // ── paths: curved rows of stepping dots; float as lily pads over water and cloud steps up to the sky
  linkPoints(a, b) {
    const A = this.pos[a], B = this.pos[b], mid = A.clone().add(B).multiplyScalar(0.5); mid.z -= 3;
    const pts = [], n = Math.max(8, Math.round(A.distanceTo(B) / 1.1));
    const sky = a === 'skyward' || b === 'skyward';
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t, x = u * u * A.x + 2 * u * t * mid.x + t * t * B.x, z = u * u * A.z + 2 * u * t * mid.z + t * t * B.z;
      let y = Math.max(0.15, this.heightAt(x, z)) + 0.12;
      if (sky) { const ts = b === 'skyward' ? t : 1 - t; y = y * (1 - ts) + (this.skyY + 0.5) * Math.pow(ts, 1.6) + Math.sin(ts * Math.PI) * 2; }
      pts.push(new THREE.Vector3(x, y, z));
    }
    return pts;
  }
  buildPaths() {
    this.links = LINKS.map(([a, b]) => {
      const pts = this.linkPoints(a, b), g = new THREE.Group(); this.scene.add(g);
      const sky = a === 'skyward' || b === 'skyward';
      const dots = pts.slice(1, -1).map((p) => {
        const water = p.y < 0.35 && !sky;
        const d = new THREE.Mesh(sky ? new THREE.SphereGeometry(0.34, 8, 6) : new THREE.CylinderGeometry(water ? 0.4 : 0.26, water ? 0.4 : 0.3, 0.14, water ? 10 : 8), sky ? std(0xffffff) : water ? std(0x5ac850) : std(0xfff2c8, { emissive: 0xffd070, emissiveIntensity: 0.25 }));
        d.position.copy(p); if (sky) d.scale.y = 0.6; d.castShadow = true; g.add(d); return d;
      });
      return { a, b, pts, g, dots, reveal: 1 };
    });
  }
  // ── level stops: stone pedestals with flags (gold = cleared, red = waiting), crowns for fallen guardians
  buildNodes() {
    this.nodes = {};
    for (const l of LEVELS) {
      const g = new THREE.Group(), p = this.pos[l.id];
      const y = l.id === 'skyward' ? this.skyY + 0.45 : Math.max(0.3, this.heightAt(p.x, p.z));
      g.position.set(p.x, y, p.z); this.scene.add(g);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 0.55, 14), std(0xb8b0a0)); base.position.y = 0.27; g.add(base);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })); top.position.y = 0.58; g.add(top);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), std(0xe8e0d0, { metalness: 0.3 })); pole.position.set(0.85, 1.7, -0.4); g.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55, 6, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.7 })); flag.geometry.translate(0.45, 0, 0); flag.position.set(0.85, 2.6, -0.4); g.add(flag);
      const crown = new THREE.Group(); const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.2, 8, 1, true), glow(0xffd040, 1.4)); crown.add(cb);
      for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), glow(0xffd040, 1.4)); const a = i / 5 * Math.PI * 2; s.position.set(Math.cos(a) * 0.3, 0.2, Math.sin(a) * 0.3); crown.add(s); }
      crown.position.set(0, 3.4, 0); g.add(crown);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.07, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.62; g.add(ring);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1; hit.userData.node = l.id; g.add(hit);
      g.traverse((o) => { if (o.isMesh && o !== hit && o !== ring) { o.castShadow = true; o.receiveShadow = true; } });
      const lab = document.createElement('div'); lab.className = 'ml';
      this.nodes[l.id] = { g, top, flag, pole, crown, ring, hit, lab, y };
    }
  }
  buildClouds() {
    this.clouds = [];
    const m = std(0xffffff, { roughness: 1 });
    for (let i = 0; i < 12; i++) {
      const c = new THREE.Group(); for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + hash(i, k) * 1.4, 1), m); s.position.set(k * 1.3 - 2.6, hash(k, i) * 0.8, (hash(i, k + 9) - 0.5) * 1.5); c.add(s); }
      const near = i < 4; c.position.set(near ? this.pos.skyward.x + (i - 1.5) * 5 : (hash(i, 20) - 0.5) * 160, near ? 10 + hash(i, 3) * 2 : 16 + hash(i, 21) * 8, near ? this.pos.skyward.z + (hash(i, 5) - 0.5) * 6 : (hash(i, 22) - 0.5) * 120 - 20);
      c.userData.v = 0.4 + hash(i, 23) * 0.6; c.userData.near = near; c.traverse((o) => { if (o.isMesh) o.castShadow = !near; });
      this.scene.add(c); this.clouds.push(c);
    }
  }
  // ── state
  refresh(map) {
    const P = this.game.progress;
    for (const l of LEVELS) {
      const n = this.nodes[l.id], st = P.levels[l.id] || {}, un = map.unlocked(l.id);
      n.g.visible = un || LINKS.some(([a, b]) => (a === l.id && map.unlocked(b)) || (b === l.id && map.unlocked(a)));
      n.top.material.color.setHex(!un ? 0x6a6a6a : st.clear ? 0xffd040 : l.optional ? 0x60c8ff : 0xff5a3a);
      n.top.material.emissive = new THREE.Color(!un ? 0 : st.clear ? 0x805a00 : 0x401000); n.top.material.emissiveIntensity = 0.5;
      n.flag.visible = n.pole.visible = un; n.flag.material.color.setHex(st.clear ? 0xffd040 : l.id === 'heart' ? 0xffffff : 0xff4a3a);
      n.crown.visible = !!st.boss; n.ring.visible = un && !st.clear;
    }
    for (const L of this.links) L.g.visible = map.unlocked(L.a) && map.unlocked(L.b);
    const kind = this.game.player.hero || 'kiri';
    if (!this.hero || this.heroKind !== kind) { if (this.hero) this.scene.remove(this.hero); this.hero = makeHero(kind); this.heroKind = kind; this.hero.scale.setScalar(1.35); this.hero.traverse((o) => { if (o.isMesh) o.castShadow = true; }); this.scene.add(this.hero); if (!this.walk) this.placeHero(map.cur); }
  }
  placeHero(id) { const n = this.nodes[id]; this.hero.position.set(n.g.position.x, n.y + 0.63, n.g.position.z); this.hero.rotation.y = -0.6; }
  reveal(a, b) { const L = this.links.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a)); if (L) L.reveal = 0; }
  // walk a route of node ids along the dotted paths
  travel(from, route, onArrive, onDone) {
    const legs = []; let prev = from;
    for (const id of route) { const L = this.links.find((x) => (x.a === prev && x.b === id) || (x.b === prev && x.a === id)); let pts = L ? L.pts.slice() : [this.pos[prev], this.pos[id]]; if (L && L.a !== prev) pts.reverse(); pts = pts.map((p) => p.clone()); pts[0].y = this.nodes[prev].y + 0.05; pts[pts.length - 1].y = this.nodes[id].y + 0.05; legs.push({ id, pts }); prev = id; }
    this.walk = { legs, i: 0, d: 0, onArrive, onDone };
  }
  enter() {
    const g = this.game, rp = g.composer.passes[0];
    this.saved = { scene: rp.scene, camera: rp.camera, ao: g.gfx.gtao.enabled };
    rp.scene = this.scene; rp.camera = this.camera; g.gfx.gtao.enabled = false;
    this.labels.style.display = ''; this.snap = true; this.onResize();
  }
  exit() {
    const g = this.game, rp = g.composer.passes[0]; if (!this.saved) return;
    rp.scene = this.saved.scene; rp.camera = this.saved.camera; g.gfx.gtao.enabled = this.saved.ao; this.saved = null;
    this.labels.style.display = 'none';
  }
  onResize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }
  pick(cx, cy) {
    const v = new THREE.Vector2(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); this.ray.setFromCamera(v, this.camera);
    const hits = this.ray.intersectObjects(Object.values(this.nodes).filter((n) => n.g.visible).map((n) => n.hit));
    return hits.length ? hits[0].object.userData.node : null;
  }
  update(dt, map) {
    const t = (this.t += dt), H = this.hero; this.seaU.time.value = t;
    // walking
    const w = this.walk;
    if (w && H) {
      const leg = w.legs[w.i], pts = leg.pts; w.d += dt * 13;
      let acc = 0, k = 0; for (; k < pts.length - 1; k++) { const l = pts[k].distanceTo(pts[k + 1]); if (acc + l >= w.d) break; acc += l; }
      if (k >= pts.length - 1) { H.position.copy(pts[pts.length - 1]).y += 0.58; w.onArrive?.(leg.id); w.i++; w.d = 0; if (w.i >= w.legs.length) { this.walk = null; w.onDone?.(); } }
      else { const a = pts[k], b = pts[k + 1], f = (w.d - acc) / a.distanceTo(b); H.position.lerpVectors(a, b, f).y += 0.58 + Math.abs(Math.sin(t * 14)) * 0.18; H.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x); }
    }
    if (H) {
      const ud = H.userData, moving = !!this.walk;
      ud.legs.forEach((l, i) => l.rotation.z = moving ? Math.sin(t * 14 + i * Math.PI) * 0.8 : 0);
      ud.arms.forEach((a, i) => a.rotation.z = moving ? -Math.sin(t * 14 + i * Math.PI) * 0.7 : Math.sin(t * 2 + i) * 0.08);
      ud.tail.forEach((s, i) => s.rotation.z = Math.sin(t * 3 - i * 0.5) * 0.15);
      ud.scarf.forEach((s, i) => s.rotation.z = Math.sin(t * 6 - i * 0.7) * 0.2 + (moving ? 0.3 : 0.1));
      if (!moving) { ud.body.position.y = Math.abs(Math.sin(t * 2.2)) * 0.05; H.rotation.y += (-0.6 - H.rotation.y) * Math.min(1, dt * 4); }
      ud.eyeL.scale.y = ud.eyeR.scale.y = (t % 3.4) < 0.1 ? 0.1 : 1;
    }
    // living landmarks
    if (this.seed) { const s = 1 + Math.sin(t * 2) * 0.04; this.seed.scale.set(0.85 * s, 1.2 * s, 0.85 * s); this.seed.material.emissiveIntensity = 1.2 + Math.sin(t * 2) * 0.35; }
    if (this.sky) this.sky.position.y = this.skyY + Math.sin(t * 0.8) * 0.3;
    if (this.swirl) this.swirl.rotation.z = t * 0.8;
    if (this.wellGlow) this.wellGlow.material.opacity = 0.25 + Math.sin(t * 1.8) * 0.15;
    if (this.gem) { this.gem.rotation.y = t * 1.5; this.gem.position.y = 2.6 + Math.sin(t * 2) * 0.15; }
    if (this.fall) this.fall.material.opacity = 0.7 + Math.sin(t * 9) * 0.08;
    this.shrooms?.forEach((c, i) => c.material.emissiveIntensity = 1.3 + Math.sin(t * 2 + i) * 0.5);
    this.lanterns?.forEach((l, i) => l.position.y += Math.sin(t * 1.5 + i) * 0.004);
    for (const c of this.clouds) { c.position.x += c.userData.v * dt * (c.userData.near ? 0.3 : 1); if (!c.userData.near && c.position.x > 90) c.position.x = -90; if (c.userData.near) c.position.x = this.pos.skyward.x + Math.sin(t * 0.1 + c.userData.v * 9) * 5; }
    for (const L of this.links) {
      if (L.reveal < 1) { L.reveal = Math.min(1, L.reveal + dt * 0.7); const n = L.dots.length; L.dots.forEach((d, i) => { const k = Math.max(0, Math.min(1, L.reveal * (n + 4) - i)); d.scale.setScalar(k < 1 ? k * (1 + Math.sin(k * Math.PI) * 0.6) : 1); if (k > 0 && k < 0.08) this.game.audio.play('glim', 2); }); }
      else L.dots.forEach((d, i) => { d.position.y = L.pts[i + 1].y + Math.max(0, Math.sin(t * 4 - i * 0.5)) * 0.06; });
    }
    for (const id in this.nodes) {
      const n = this.nodes[id];
      n.flag.rotation.y = Math.sin(t * 3 + n.g.position.x) * 0.25; const fp = n.flag.geometry.attributes.position;
      for (let i = 0; i < fp.count; i++) { const x = fp.getX(i); fp.setZ(i, Math.sin(x * 5 - t * 6) * 0.08 * x); } fp.needsUpdate = true;
      n.crown.rotation.y = t * 1.2; n.crown.position.y = 3.4 + Math.sin(t * 2) * 0.12;
      n.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.06); n.ring.material.opacity = 0.5 + Math.sin(t * 3) * 0.3;
    }
    // camera: a tilted, toy-box view that follows the hero
    const narrow = Math.min(1.45, Math.max(1, 1.25 / this.camera.aspect)), target = H ? H.position : this.pos[map.cur];
    const cx = narrow > 1.1 ? 1 : 0.75; const want = new THREE.Vector3(target.x * cx, target.y * 0.4 + 36 * narrow, target.z + 31 * narrow), look = new THREE.Vector3(target.x * (narrow > 1.1 ? 1 : 0.92), target.y * 0.5, target.z - 3);
    const k = this.snap ? 1 : 1 - Math.exp(-dt * 3); this.camPos.lerp(want, k); this.camLook.lerp(look, k); this.snap = false;
    this.camera.position.copy(this.camPos); this.camera.lookAt(this.camLook);
    this.sun.position.set(this.camLook.x - 30, 60, this.camLook.z + 40); this.sun.target.position.copy(this.camLook); this.sun.target.updateMatrixWorld();
    // floating labels
    const v = new THREE.Vector3();
    for (const l of LEVELS) {
      const n = this.nodes[l.id], un = map.unlocked(l.id);
      if (!n.lab.parentNode) this.labels.appendChild(n.lab);
      if (!n.g.visible) { n.lab.style.display = 'none'; continue; }
      v.set(n.g.position.x, n.y + (l.id === map.cur ? 4.6 : 3.2), n.g.position.z).project(this.camera);
      n.lab.style.display = v.z < 1 ? '' : 'none';
      n.lab.style.transform = `translate(-50%,-100%) translate(${(v.x * 0.5 + 0.5) * innerWidth}px,${(-v.y * 0.5 + 0.5) * innerHeight}px)`;
      const st = this.game.progress.levels[l.id] || {};
      const txt = un ? l.name : '? ? ?'; const cls = `ml ${l.id === map.cur ? 'here' : ''} ${un ? '' : 'locked'} ${st.clear ? 'clear' : ''}`;
      if (n.lab.dataset.k !== txt + cls) { n.lab.dataset.k = txt + cls; n.lab.className = cls; n.lab.textContent = txt; }
    }
  }
}
