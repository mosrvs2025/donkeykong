import * as THREE from 'three';
import { getTex } from './textures.js';

export const THEMES = [
  // sky top, horizon, fog color, fog density, hemi sky, hemi ground, sun color, sun intensity, particle color, exposure, moon, stars
  { top: 0x3f8fd8, hor: 0xcfe8c0, fog: 0x9fc8a8, dens: 0.0045, hs: 0xbfe0ff, hg: 0x3a5a20, sun: 0xfff0c8, si: 2.6, pc: 0xfff6a0, exp: 1.0, moon: 0, stars: 0 },
  { top: 0x2f78c8, hor: 0xf4e0b0, fog: 0xb8d0b0, dens: 0.004, hs: 0xd0e8ff, hg: 0x456a2a, sun: 0xffe0a0, si: 3.0, pc: 0xfff0c0, exp: 1.05, moon: 0, stars: 0 },
  { top: 0x34508a, hor: 0xf0b890, fog: 0x9aa8b0, dens: 0.0055, hs: 0xd0c8ff, hg: 0x2a4a3a, sun: 0xffc890, si: 2.2, pc: 0xffe0c0, exp: 1.0, moon: 0.5, stars: 0.15 },
  { top: 0x020206, hor: 0x07051a, fog: 0x050410, dens: 0.034, hs: 0x3a3070, hg: 0x081018, sun: 0x6050d0, si: 0.2, pc: 0x70f0ff, exp: 1.3, moon: 0, stars: 0 },
  { top: 0x0a0604, hor: 0x2a160a, fog: 0x1e1008, dens: 0.018, hs: 0xd09060, hg: 0x302010, sun: 0xffa050, si: 1.1, pc: 0xffb050, exp: 1.35, moon: 0, stars: 0 },
  { top: 0x060a24, hor: 0x33406e, fog: 0x1a2240, dens: 0.011, hs: 0x8a98d8, hg: 0x2a1e10, sun: 0xb8c8ff, si: 1.4, pc: 0xd0e0ff, exp: 1.15, moon: 1, stars: 1 },
  { top: 0x010208, hor: 0x040a20, fog: 0x030614, dens: 0.004, hs: 0x4050a0, hg: 0x0a1030, sun: 0x8090ff, si: 0.4, pc: 0xa0c0ff, exp: 1.25, moon: 0, stars: 1 },
  { top: 0x0a0a2a, hor: 0x3a2a60, fog: 0x1a1640, dens: 0.009, hs: 0x9080e0, hg: 0x201840, sun: 0xc0b0ff, si: 1.0, pc: 0xffc0f0, exp: 1.2, moon: 1, stars: 1 },
  { top: 0x0a3a5a, hor: 0x1a6a8a, fog: 0x0d4a62, dens: 0.019, hs: 0x70d0f0, hg: 0x0a2838, sun: 0x90e8ff, si: 1.3, pc: 0xa0fff0, exp: 1.2, moon: 0, stars: 0 },
  { top: 0x2f86f0, hor: 0xffe6d0, fog: 0xcfe4fa, dens: 0.0032, hs: 0xe8f4ff, hg: 0x7a90b0, sun: 0xfff4e0, si: 3.0, pc: 0xffffff, exp: 1.05, moon: 0.2, stars: 0 },
  { top: 0x03080c, hor: 0x123a40, fog: 0x0f3238, dens: 0.013, hs: 0x8ad8e0, hg: 0x3a2040, sun: 0x90e8ff, si: 0.3, pc: 0x9ffff0, exp: 1.6, moon: 0, stars: 0 }
];

const MAT_DEF = {
  grass: { top: 'grass', side: 'dirt' }, stone: { top: 'stone', side: 'stone' }, bark: { top: 'bark', side: 'bark' },
  wood: { top: 'wood', side: 'wood' }, plank: { top: 'plank', side: 'plank' }, leaf: { top: 'leaf', side: 'leaf' },
  ruin: { top: 'ruin', side: 'ruin' }, cliff: { top: 'grass', side: 'cliff' }, sand: { top: 'sand', side: 'sand' },
  cave: { top: 'cave', side: 'cave' }, mine: { top: 'mine', side: 'mine' }, temple: { top: 'temple', side: 'temple' },
  glyph: { top: 'glyph', side: 'glyph', emissive: 0x0a3a38 }, crystal: { top: 'crystal', side: 'crystal', emissive: 0x3a1a70 },
  thorn: { top: 'thorn', side: 'thorn', emissive: 0x100500 }, colossus: { top: 'colossus', side: 'colossus', emissive: 0x100c04 }, blight: { top: 'blight', side: 'blight', emissive: 0x2a0838 }, moss: { top: 'grass', side: 'mossw', emissive: 0x0a2a12 }, cloud: { top: 'cloud', side: 'cloud', emissive: 0x10141c }, rail: { top: 'rail', side: 'rail' },
};
const matCache = {};
export function surfMat(texName, emissive) {
  const k = texName + (emissive || '');
  if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ map: getTex(texName), roughness: 0.92, metalness: 0, emissive: emissive || 0x000000 });
  return matCache[k];
}

// Wind sway patch for vegetation.
export const windUniforms = { uTime: { value: 0 } };
export function swayMat(mat, amount = 0.04) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windUniforms.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 wpos = (modelMatrix * 
#ifdef USE_INSTANCING
 instanceMatrix * 
#endif
 vec4(0.0,0.0,0.0,1.0)).xyz;
      float hh = max(0.0, position.y);
      transformed.x += sin(uTime * 1.6 + wpos.x * 0.21 + wpos.z * 0.17) * hh * ${amount.toFixed(3)};
      transformed.z += cos(uTime * 1.2 + wpos.x * 0.13 - wpos.z * 0.11) * hh * ${(amount * 0.7).toFixed(3)};`);
  };
  return mat;
}

// Geometry builder that extrudes boxes/slabs along the curved route.
class StripBuilder {
  constructor(path) { this.path = path; this.buckets = {}; }
  bucket(tex, emissive) {
    const k = tex + '|' + (emissive || 0);
    return (this.buckets[k] ||= { tex, emissive, pos: [], uv: [] });
  }
  quad(b, a, bb, c, d, ua, ub, uc, ud) {
    b.pos.push(...a, ...bb, ...c, ...a, ...c, ...d);
    b.uv.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ud);
  }
  // yTop(s), yBot(s) functions; d0 < d1
  add(s0, s1, yTop, yBot, d0, d1, matName, opts = {}) {
    const def = MAT_DEF[matName] || MAT_DEF.stone;
    const top = this.bucket(def.top, def.emissive), side = this.bucket(def.side, def.emissive);
    const n = Math.max(1, Math.ceil((s1 - s0) / 2));
    const P = (s, y, d) => { const v = this.path.world(s, y, d); return [v.x, v.y, v.z]; };
    const sc = 0.25;
    for (let i = 0; i < n; i++) {
      const sa = s0 + (s1 - s0) * i / n, sb = s0 + (s1 - s0) * (i + 1) / n;
      const ta = yTop(sa), tb = yTop(sb), ba = yBot(sa), bbv = yBot(sb);
      // top
      this.quad(top, P(sa, ta, d1), P(sb, tb, d1), P(sb, tb, d0), P(sa, ta, d0), [sa * sc, d1 * sc], [sb * sc, d1 * sc], [sb * sc, d0 * sc], [sa * sc, d0 * sc]);
      // front (toward camera)
      this.quad(side, P(sa, ba, d1), P(sb, bbv, d1), P(sb, tb, d1), P(sa, ta, d1), [sa * sc, ba * sc], [sb * sc, bbv * sc], [sb * sc, tb * sc], [sa * sc, ta * sc]);
      // back
      if (!opts.noBack) this.quad(side, P(sb, bbv, d0), P(sa, ba, d0), P(sa, ta, d0), P(sb, tb, d0), [sb * sc, bbv * sc], [sa * sc, ba * sc], [sa * sc, ta * sc], [sb * sc, tb * sc]);
      if (opts.bottom) this.quad(side, P(sa, ba, d0), P(sb, bbv, d0), P(sb, bbv, d1), P(sa, ba, d1), [sa * sc, 0], [sb * sc, 0], [sb * sc, 1], [sa * sc, 1]);
    }
    const t0 = yTop(s0), b0 = yBot(s0), t1 = yTop(s1), b1 = yBot(s1);
    this.quad(side, P(s0, b0, d0), P(s0, b0, d1), P(s0, t0, d1), P(s0, t0, d0), [d0 * sc, b0 * sc], [d1 * sc, b0 * sc], [d1 * sc, t0 * sc], [d0 * sc, t0 * sc]);
    this.quad(side, P(s1, b1, d1), P(s1, b1, d0), P(s1, t1, d0), P(s1, t1, d1), [d1 * sc, b1 * sc], [d0 * sc, b1 * sc], [d0 * sc, t1 * sc], [d1 * sc, t1 * sc]);
  }
  build(group, shadows = true) {
    for (const k in this.buckets) {
      const b = this.buckets[k]; if (!b.pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, surfMat(b.tex, b.emissive));
      m.receiveShadow = true; m.castShadow = shadows;
      group.add(m);
    }
  }
}

// Build a standalone (dynamic) mesh for one solid, in local coordinates centered on its s-mid.
export function solidMesh(path, sol) {
  const sb = new StripBuilder(path);
  const w = sol.s1 - sol.s0, mid = (sol.s0 + sol.s1) / 2, h = sol.y1 - sol.y0;
  const def = MAT_DEF[sol.mat] || MAT_DEF.stone;
  const geo = new THREE.BoxGeometry(w, h, sol.depth || 4.4);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * 0.25, uv.getY(i) * h * 0.25);
  const mesh = new THREE.Mesh(geo, surfMat(def.side, def.emissive));
  mesh.castShadow = mesh.receiveShadow = true;
  const g = new THREE.Group(); g.add(mesh); mesh.position.y = h / 2;
  path.place(g, mid, sol.y0);
  return g;
}

function rand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export class World {
  constructor(scene, path, level, quality) {
    this.scene = scene; this.path = path; this.level = level; this.q = quality;
    this.group = new THREE.Group(); scene.add(this.group);
    this.animated = []; // {update(t, dt)}
    this.buildSky();
    this.buildSolids();
    this.buildTerrain();
    this.buildVegetation();
    this.buildLandmarks();
    this.buildWater();
  }
  themeAt(s) { let t = 0; for (const z of this.level.themes) if (s >= z.s) t = z.t; return t; }
  groundAt(s) {
    let best = null;
    for (const o of this.level.solids) if (o.ground && s >= o.s0 && s <= o.s1 && !o.move && o.y1 < 150 && o.y1 > -100) if (best === null || o.y1 > best) best = o.y1;
    for (const o of this.level.slopes) if (s >= o.s0 && s <= o.s1 && !o.rail) { const y = o.ya + (o.yb - o.ya) * (s - o.s0) / (o.s1 - o.s0); if (best === null || y > best) best = y; }
    return best;
  }
  baseAt(s) {
    // broad terrain height for scenery around each biome
    const t = this.themeAt(s);
    return [0, -6, -10, -5, -24, -20][t];
  }
  buildSky() {
    const geo = new THREE.SphereGeometry(1200, 32, 16);
    this.skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0.4, 0.5, -0.6).normalize() }, sunCol: { value: new THREE.Color() }, moonDir: { value: new THREE.Vector3(-0.5, 0.42, -0.75).normalize() }, moonAmt: { value: 0 }, starAmt: { value: 0 }, uTime: windUniforms.uTime };
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: this.skyU,
      vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
      fragmentShader: `uniform vec3 top, hor, sunCol, sunDir, moonDir; uniform float moonAmt, starAmt, uTime; varying vec3 vd;
        float h2(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
        void main(){ float h = clamp(vd.y, -0.2, 1.0);
          vec3 c = mix(hor, top, pow(max(h,0.0), 0.6));
          c = mix(c, hor * 0.7, clamp(-h * 4.0, 0.0, 1.0));
          float sd = max(dot(normalize(vd), sunDir), 0.0);
          c += sunCol * (pow(sd, 600.0) * 3.0 + pow(sd, 12.0) * 0.35) * (1.0 - moonAmt * 0.8);
          vec3 nd = normalize(vd);
          // stars that twinkle
          vec3 cell = floor(nd * 160.0); float st = h2(cell);
          float tw = 0.6 + 0.4 * sin(uTime * 2.0 + st * 40.0);
          c += vec3(0.85, 0.9, 1.0) * step(0.9965, st) * tw * starAmt * smoothstep(0.0, 0.25, h);
          // a vast moon with a pale ring, like an illustration
          float md = dot(nd, moonDir);
          float disc = smoothstep(0.9975, 0.9982, md);
          float crater = 0.85 + 0.15 * sin(nd.x * 90.0) * sin(nd.y * 70.0);
          c = mix(c, vec3(0.95, 0.96, 1.0) * crater, disc * moonAmt);
          c += vec3(0.5, 0.6, 0.9) * pow(max(md, 0.0), 80.0) * 0.5 * moonAmt;
          c += vec3(0.6, 0.7, 1.0) * smoothstep(0.004, 0.0, abs(md - 0.9935)) * 0.35 * moonAmt;
          gl_FragColor = vec4(c, 1.0); }`,
    });
    this.sky = new THREE.Mesh(geo, mat); this.sky.renderOrder = -10; this.sky.frustumCulled = false;
    this.scene.add(this.sky);
  }
  buildSolids() {
    const sb = new StripBuilder(this.path);
    for (const o of this.level.solids) {
      if (o.move || o.collapse || o.crack || o.echo || o.ghost || o.finale || o.block) continue;
      const deep = o.ground || o.y1 - o.y0 > 6;
      const d0 = deep ? -5 : -2.4, d1 = deep ? 3.6 : 2.4;
      const yb = Math.max(o.y0, o.y1 - 60);
      sb.add(o.s0, o.s1, () => o.y1, () => yb, d0, d1, o.mat, { bottom: !o.ground });
    }
    for (const o of this.level.slopes) {
      const f = (s) => o.ya + (o.yb - o.ya) * (s - o.s0) / (o.s1 - o.s0);
      if (o.rail) {
        // rails + ties drawn as thin slabs, with trestle posts
        sb.add(o.s0, o.s1, (s) => f(s), (s) => f(s) - 0.35, -1.1, -0.8, 'rail', { bottom: true });
        sb.add(o.s0, o.s1, (s) => f(s), (s) => f(s) - 0.35, 0.8, 1.1, 'rail', { bottom: true });
        sb.add(o.s0, o.s1, (s) => f(s) - 0.35, (s) => f(s) - 0.7, -1.5, 1.5, 'wood', { bottom: true });
        for (let s = o.s0 + 2; s < o.s1; s += 6) sb.add(s - 0.4, s + 0.4, () => f(s) - 0.7, () => f(s) - 30, -1.0, -0.4, 'wood');
      } else sb.add(o.s0, o.s1, f, (s) => f(s) - 6, -5, 3.6, o.mat);
    }
    sb.build(this.group);
    // rail steel highlight
    const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.9, roughness: 0.3 });
    for (const o of this.level.slopes) if (o.rail) {
      for (const dd of [-0.95, 0.95]) {
        const pts = []; for (let s = o.s0; s <= o.s1 + 0.01; s += 2) pts.push(this.path.world(Math.min(s, o.s1), o.ya + (o.yb - o.ya) * (Math.min(s, o.s1) - o.s0) / (o.s1 - o.s0) + 0.05, dd));
        const c = new THREE.CatmullRomCurve3(pts); const m = new THREE.Mesh(new THREE.TubeGeometry(c, pts.length * 2, 0.09, 5), steel); this.group.add(m);
      }
    }
  }
  buildTerrain() {
    // Background + foreground ribbons with hills, following the route.
    const L = this.path.length, step = 4;
    const rows = [-6, -10, -16, -26, -40, -60, -90, -130, -180];
    const frows = [4.5, 7, 10];
    const r = rand(7);
    const noise = (s, d) => Math.sin(s * 0.05 + d * 0.11) * 0.5 + Math.sin(s * 0.013 - d * 0.05 + 1.3) * 1.2 + Math.sin(s * 0.11 + d * 0.3) * 0.25;
    const makeRibbon = (rowsArr, back) => {
      const pos = [], uv = [], col = [], idx = [];
      const ns = Math.ceil(L / step) + 1, nr = rowsArr.length;
      const c = new THREE.Color();
      for (let i = 0; i < ns; i++) {
        const s = i * step, base = this.baseAt(s), gnd = this.groundAt(s), th = this.themeAt(s);
        for (let j = 0; j < nr; j++) {
          const d = rowsArr[j]; const far = Math.abs(d);
          let y = base + noise(s, d) * (1 + far * 0.08);
          if (back) {
            if (th === 3 || th === 4) y = base + (far > 12 ? (far - 12) * 0.9 + noise(s, d) * 4 : 0); // cave walls rise
            else y += Math.max(0, far - 20) * (th === 2 ? 0.15 : 0.35) * (0.6 + 0.4 * Math.sin(s * 0.02 + j));
            if (gnd !== null && far < 12 && th !== 1) y = Math.min(y, gnd - 0.6 + (far - 6) * 0.1);
            if (gnd === null && far < 20) y = Math.min(y, base - 25 + far);
          } else {
            y = (gnd !== null && th !== 1 ? Math.min(gnd, base) : base) - 2.5 - far * 0.25;
            if (gnd === null) y = base - 26;
          }
          const v = this.path.world(s, y, d); pos.push(v.x, v.y, v.z); uv.push(s * 0.08, d * 0.08);
          const pal = [[0.36, 0.55, 0.22], [0.34, 0.5, 0.24], [0.35, 0.5, 0.35], [0.22, 0.2, 0.3], [0.3, 0.22, 0.16], [0.55, 0.36, 0.2]][th];
          const k = 0.8 + r() * 0.3 - far * 0.001; c.setRGB(pal[0] * k, pal[1] * k, pal[2] * k); col.push(c.r, c.g, c.b);
        }
      }
      for (let i = 0; i < ns - 1; i++) for (let j = 0; j < nr - 1; j++) {
        const a = i * nr + j, b = a + 1, c2 = a + nr, d2 = c2 + 1;
        if (back) idx.push(a, c2, b, b, c2, d2); else idx.push(a, b, c2, b, d2, c2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: getTex('grass'), vertexColors: true, roughness: 1, side: THREE.DoubleSide }));
      m.material.map = getTex('grass').clone(); m.material.map.needsUpdate = true;
      m.receiveShadow = true; this.group.add(m);
    };
    makeRibbon(rows, true);
    makeRibbon(frows, false);
    // cave / mine ceilings
    const cpos = [], cidx = [];
    let n = 0;
    for (let s = 900 + 80; s < 1470; s += 4) {
      const th = this.themeAt(s); if (th !== 3 && th !== 4) continue;
      for (const d of [-40, -6, 0, 6, 14]) { const v = this.path.world(s, 11 + (th === 4 ? -2 : 0) + Math.abs(d) * 0.3 + Math.sin(s * 0.2 + d) * 1.5, d); cpos.push(v.x, v.y, v.z); }
      if (n > 0) for (let j = 0; j < 4; j++) { const a = (n - 1) * 5 + j, b = n * 5 + j; cidx.push(a, a + 1, b, a + 1, b + 1, b); }
      n++;
    }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3)); cg.setIndex(cidx); cg.computeVertexNormals();
    this.group.add(new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0x1c1826, roughness: 1, side: THREE.DoubleSide })));
  }
  inst(geo, mat, list, shadow = false) {
    if (!list.length) return null;
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    const o = new THREE.Object3D();
    list.forEach((it, i) => { o.position.copy(it.p); o.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0); o.scale.copy(it.sc); o.updateMatrix(); m.setMatrixAt(i, o.matrix); if (it.c && m.setColorAt) m.setColorAt(i, it.c); });
    m.castShadow = shadow; m.receiveShadow = true; this.group.add(m); return m;
  }
  buildVegetation() {
    const r = rand(42), L = this.path.length, q = this.q;
    const roots = [], flowers = [], trunks = [], blobs = [], ferns = [], rocks = [], shrooms = [], crystals = [], grass = [], stal = [], hang = [], palms = [], pillars = [], posts = [], beams = [], lamps = [];
    let nextFrame = 0; const glowStrands = [];
    const V = (s, y, d) => this.path.world(s, y, d);
    const S = (x, y, z) => new THREE.Vector3(x, y ?? x, z ?? x);
    const col = new THREE.Color();
    for (let s = -60; s < L; s += 1.3 / q) {
      const th = this.themeAt(s), base = this.baseAt(s), gnd = this.groundAt(s);
      const d = -6 - Math.pow(r(), 1.6) * 120;
      const y = (Math.abs(d) < 12 && gnd !== null && th !== 1) ? gnd - 0.4 : base + Math.max(0, Math.abs(d) - 20) * (th === 2 ? 0.15 : 0.35) * 0.6;
      if (th <= 2 || th === 5) {
        if (r() < (th === 5 ? 0.05 : 0.22)) { // tree
          const h = 14 + r() * 30 + Math.abs(d) * 0.25, rad = 0.6 + r() * 1.2 + Math.abs(d) * 0.01;
          const p = V(s, y, d); trunks.push({ p, sc: S(rad, h, rad), ry: r() * 6 });
          if (Math.abs(d) < 60) for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + r(); roots.push({ p: p.clone().add(S(Math.cos(a) * rad * 0.7, 0, Math.sin(a) * rad * 0.7)), sc: S(rad * 0.5, rad * 2.4, rad * 1.1), ry: -a, rz: 0 }); }
          const nb = 3 + Math.floor(r() * 4);
          for (let k = 0; k < nb; k++) { const bs = 4 + r() * 6 + rad * 2; col.setHSL(0.24 + r() * 0.1, 0.5 + r() * 0.2, 0.2 + r() * 0.12); blobs.push({ p: p.clone().add(S((r() - 0.5) * bs, h - r() * 4, (r() - 0.5) * bs)), sc: S(bs, bs * (0.5 + r() * 0.3), bs), ry: r() * 6, c: col.clone() }); }
          if (r() < 0.5) for (let k = 0; k < 4; k++) hang.push({ p: p.clone().add(S((r() - 0.5) * 6, h - 2, (r() - 0.5) * 6)), sc: S(0.08, 6 + r() * 10, 0.08) });
        }
        if (r() < 0.35 && th !== 5) { const p = V(s, y, d * 0.4 - 2); const k = 1 + r() * 2; col.setHSL(0.26 + r() * 0.08, 0.6, 0.22 + r() * 0.1); ferns.push({ p, sc: S(k, k * (0.7 + r() * 0.6), k), ry: r() * 6, c: col.clone() }); }
        if (r() < 0.1) palms.push({ p: V(s, y, d * 0.5 - 4), sc: S(1, 6 + r() * 6, 1), ry: r() * 6, rz: (r() - 0.5) * 0.3 });
        if (th === 2 && r() < 0.07) { const ph = 4 + r() * 12, broken = r() < 0.6; pillars.push({ p: V(s, y - 0.5, d * 0.7 - 5), sc: S(1.1 + r() * 0.5, broken ? ph * 0.5 : ph, 1.1 + r() * 0.5), ry: r() * 6, rz: broken ? (r() - 0.5) * 0.25 : 0 }); if (broken && r() < 0.6) pillars.push({ p: V(s + 3 + r() * 3, y - 0.3, d * 0.7 - 5), sc: S(1.1, 2.5 + r() * 2, 1.1), rx: Math.PI / 2, ry: r() * 6 }); }
        if (r() < 0.12) rocks.push({ p: V(s, y, d), sc: S(1 + r() * 3, 0.7 + r() * 2, 1 + r() * 3), ry: r() * 6, c: new THREE.Color(th === 5 ? 0x8a6a40 : 0x6a6a60) });
        if (gnd !== null && th <= 1 && r() < 0.35) { const c2 = [0xff8ac0, 0xffe060, 0xffffff, 0xc8a0ff, 0xff9a50][Math.floor(r() * 5)]; flowers.push({ p: V(s + r(), gnd + 0.05, -2.4 - r() * 3), sc: S(1.4 + r() * 0.9), ry: r() * 6, c: new THREE.Color(c2) }); }
        // grass tufts right at path edge
        if (gnd !== null && r() < 0.8 && th !== 5) { col.setHSL(0.25 + r() * 0.07, 0.6, 0.28 + r() * 0.12); grass.push({ p: V(s + r(), gnd, -2.2 - r() * 2.5), sc: S(0.5 + r() * 0.6, 0.5 + r() * 0.9, 0.5 + r() * 0.6), ry: r() * 6, c: col.clone() }); }
        if (gnd !== null && r() < 0.25 && th !== 5 && th !== 1) { col.setHSL(0.25 + r() * 0.07, 0.6, 0.25 + r() * 0.12); grass.push({ p: V(s + r(), gnd, 2.6 + r() * 1), sc: S(0.4 + r() * 0.5, 0.4 + r() * 0.6, 0.4), ry: r() * 6, c: col.clone() }); }
        // occasional foreground frond near the camera (parallax sweep)
        if (r() < 0.03 && th !== 1) { const p = V(s, (gnd ?? base) - 4.5, 7 + r() * 3); col.setHSL(0.28, 0.55, 0.14); ferns.push({ p, sc: S(2.2, 2 + r() * 1.5, 2.2), ry: r() * 6, c: col.clone() }); }
      } else if (th === 3) {
        if (r() < 0.2) shrooms.push({ p: V(s, y, d * 0.5), sc: S(0.5 + r() * 1.5), ry: r() * 6, c: new THREE.Color().setHSL(0.5 + r() * 0.35, 0.9, 0.55) });
        if (r() < 0.25) crystals.push({ p: V(s, y, d * 0.6), sc: S(0.4 + r() * 1.2, 1 + r() * 4, 0.4 + r()), rx: (r() - 0.5) * 0.8, rz: (r() - 0.5) * 0.8, c: new THREE.Color().setHSL(0.5 + r() * 0.3, 0.9, 0.6) });
        if (r() < 0.3) stal.push({ p: V(s, 11 + Math.abs(d) * 0.3, d * 0.5), sc: S(0.6 + r(), 2 + r() * 6, 0.6 + r()), rx: Math.PI });
        if (r() < 0.2) rocks.push({ p: V(s, y, d), sc: S(1 + r() * 3, 0.7 + r() * 2, 1 + r() * 3), ry: r() * 6, c: new THREE.Color(0x3a3448) });
        if (r() < 0.05) shrooms.push({ p: V(s, y - 2, Math.min(-48, d * 0.8 - 20)), sc: S(3 + r() * 4, 4 + r() * 6, 3 + r() * 4), ry: r() * 6, c: new THREE.Color().setHSL(0.5 + r() * 0.35, 0.9, 0.5) });
        if (r() < 0.35) glowStrands.push({ p: V(s + r() * 2, (gnd ?? base) + 8 + r() * 3, -2.5 - r() * 6), sc: S(1, 2 + r() * 4, 1), c: new THREE.Color().setHSL(0.45 + r() * 0.15, 0.9, 0.65) });
        if (gnd !== null && r() < 0.15) shrooms.push({ p: V(s, gnd, -2.5 - r() * 2), sc: S(0.3 + r() * 0.4), ry: r() * 6, c: new THREE.Color().setHSL(0.45 + r() * 0.4, 0.9, 0.6) });
      } else if (th === 4) {
        if (r() < 0.2) rocks.push({ p: V(s, y, d), sc: S(1 + r() * 3, 0.7 + r() * 2, 1 + r() * 3), ry: r() * 6, c: new THREE.Color(0x4a3a2c) });
        if (r() < 0.1) crystals.push({ p: V(s, y, d * 0.6), sc: S(0.4 + r(), 1 + r() * 2, 0.4 + r()), rx: (r() - 0.5), c: new THREE.Color(0xffa030) });
        if (gnd !== null && s > nextFrame) { nextFrame = s + 14 + r() * 8; const a = V(s - 1.6, gnd, -3.2), b = V(s + 1.6, gnd, -3.2); posts.push({ p: a, sc: S(0.32, 5.2, 0.32) }, { p: b, sc: S(0.32, 5.2, 0.32) }); const m = a.clone().lerp(b, 0.5); m.y += 5.2; const dx = b.x - a.x, dz = b.z - a.z; beams.push({ p: m, sc: S(Math.hypot(dx, dz) + 0.8, 0.4, 0.42), ry: -Math.atan2(dz, dx) }); const l = m.clone(); l.y -= 0.9; lamps.push({ p: l, sc: S(1) }); }
        if (r() < 0.2) stal.push({ p: V(s, 10 + Math.abs(d) * 0.3, d * 0.5), sc: S(0.6 + r(), 2 + r() * 4, 0.6 + r()), rx: Math.PI });
      }
    }
    const leafMat = swayMat(new THREE.MeshStandardMaterial({ map: getTex('leaf'), roughness: 0.85, vertexColors: true }), 0.02);
    const blobGeo = new THREE.IcosahedronGeometry(0.5, 1);
    { const p = blobGeo.attributes.position, cc = []; for (let i = 0; i < p.count; i++) { const k = 1 + (Math.sin(i * 12.9898) * 0.5) * 0.25; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); const t = THREE.MathUtils.clamp(p.getY(i) * k + 0.5, 0, 1); const v = 0.45 + t * 0.75; cc.push(v * 0.95, v, v * 0.85); } blobGeo.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3)); blobGeo.computeVertexNormals(); }
    const trunkGeo = new THREE.CylinderGeometry(0.7, 1, 1, 7, 1); trunkGeo.translate(0, 0.5, 0);
    const barkM = new THREE.MeshStandardMaterial({ map: getTex('bark'), roughness: 1 });
    this.inst(trunkGeo, barkM, trunks, true);
    { const rg = new THREE.ConeGeometry(0.5, 1, 4, 1); rg.translate(0, 0.5, 0); rg.rotateX(0.25); this.inst(rg, barkM, roots, true); }
    { // little wildflowers: a stem and a five-petal head
      const fgeo = new THREE.BufferGeometry(), pos = [];
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, a2 = a + 0.6; pos.push(0, 0.42, 0, Math.cos(a) * 0.16, 0.44, Math.sin(a) * 0.16, Math.cos(a2) * 0.16, 0.44, Math.sin(a2) * 0.16); }
      pos.push(-0.015, 0, 0, 0.015, 0, 0, 0, 0.42, 0);
      fgeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fgeo.computeVertexNormals();
      this.inst(fgeo, swayMat(new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.7, emissive: 0x201010 }), 0.12), flowers);
      const centre = new THREE.SphereGeometry(0.05, 6, 4); centre.translate(0, 0.45, 0);
      this.inst(centre, new THREE.MeshStandardMaterial({ color: 0xffc020, emissive: 0x402000 }), flowers.map((f) => ({ ...f, c: null })));
    }
    this.inst(blobGeo, leafMat, blobs, true);
    const fernGeo = new THREE.ConeGeometry(0.6, 1, 6, 1, true); fernGeo.translate(0, 0.5, 0);
    const fg2 = new THREE.BufferGeometry(); {
      // fan of leaves
      const pos = []; for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const cx = Math.cos(a), cz = Math.sin(a); pos.push(0, 0, 0, cx * 0.9 - cz * 0.15, 0.9, cz * 0.9 + cx * 0.15, cx * 1.2, 0.5, cz * 1.2, 0, 0, 0, cx * 1.2, 0.5, cz * 1.2, cx * 0.9 + cz * 0.15, 0.9, cz * 0.9 - cx * 0.15); }
      fg2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg2.computeVertexNormals();
    }
    this.inst(fg2, swayMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide }), 0.08), ferns);
    const grassGeo = new THREE.BufferGeometry(); {
      const pos = []; for (let i = 0; i < 5; i++) { const a = i * 1.3, x = Math.cos(a) * 0.3, z = Math.sin(a) * 0.3; pos.push(x - 0.08, 0, z, x + 0.08, 0, z, x * 1.6, 1, z * 1.6); }
      grassGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); grassGeo.computeVertexNormals();
    }
    this.inst(grassGeo, swayMat(new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.9 }), 0.15), grass);
    const palmGeo = new THREE.BufferGeometry(); {
      const pos = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a); pos.push(0, 1, 0, cx * 3 - cz * 0.5, 0.75, cz * 3 + cx * 0.5, cx * 3 + cz * 0.5, 0.75, cz * 3 - cx * 0.5); }
      palmGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); palmGeo.computeVertexNormals();
    }
    this.inst(palmGeo, swayMat(new THREE.MeshStandardMaterial({ color: 0x3f8a30, side: THREE.DoubleSide }), 0.1), palms);
    const palmTrunk = new THREE.CylinderGeometry(0.15, 0.25, 1, 5); palmTrunk.translate(0, 0.5, 0);
    this.inst(palmTrunk, new THREE.MeshStandardMaterial({ color: 0x7a6040 }), palms);
    { const rgeo = new THREE.DodecahedronGeometry(0.6, 1), rp = rgeo.attributes.position, rc = []; for (let i = 0; i < rp.count; i++) { const k = 1 + Math.sin(i * 7.31) * 0.12; rp.setXYZ(i, rp.getX(i) * k, rp.getY(i) * k, rp.getZ(i) * k); const top = THREE.MathUtils.smoothstep(rp.getY(i), 0.1, 0.45); rc.push(1 - top * 0.55, 1 - top * 0.2, 1 - top * 0.65); } rgeo.setAttribute('color', new THREE.Float32BufferAttribute(rc, 3)); rgeo.computeVertexNormals();
      this.inst(rgeo, new THREE.MeshStandardMaterial({ map: getTex('stone'), roughness: 1, flatShading: true, vertexColors: true }), rocks, true); }
    { const pg = new THREE.CylinderGeometry(1, 1, 1, 10, 1); pg.translate(0, 0.5, 0); // fluted ruin columns
      const pp = pg.attributes.position; for (let i = 0; i < pp.count; i++) { const a = Math.atan2(pp.getZ(i), pp.getX(i)), k = 1 + Math.cos(a * 10) * 0.05; pp.setX(i, pp.getX(i) * k); pp.setZ(i, pp.getZ(i) * k); } pg.computeVertexNormals();
      this.inst(pg, new THREE.MeshStandardMaterial({ map: getTex('ruin'), color: 0xb8c4a8, roughness: 0.95 }), pillars, true); }
    { const wood = new THREE.MeshStandardMaterial({ map: getTex('bark'), color: 0xa07850, roughness: 1 }); // mine timber frames with lanterns
      const bg = new THREE.BoxGeometry(1, 1, 1); const pg = bg.clone(); pg.translate(0, 0.5, 0);
      this.inst(pg, wood, posts, true); this.inst(bg, wood, beams, true);
      const lg = new THREE.OctahedronGeometry(0.28, 1); lg.scale(1, 1.4, 1);
      this.inst(lg, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffa040, emissiveIntensity: 3 }), lamps);
      const cord = new THREE.CylinderGeometry(0.02, 0.02, 0.9, 3); cord.translate(0, 0.45, 0); this.inst(cord, wood, lamps); }
    { // Glowdeep glow-worm strands: threads hanging from the ceiling, beaded with light
      const sg = new THREE.CylinderGeometry(0.015, 0.015, 1, 3); sg.translate(0, -0.5, 0);
      this.inst(sg, new THREE.MeshBasicMaterial({ color: 0x80fff0, transparent: true, opacity: 0.35 }), glowStrands);
      const beads = []; for (const st of glowStrands) for (let k = 1; k <= 4; k++) beads.push({ p: st.p.clone().add(new THREE.Vector3(0, -st.sc.y * k / 4.2, 0)), sc: new THREE.Vector3().setScalar(0.06 + k * 0.02), c: st.c });
      this.inst(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), beads); }
    const hangGeo = new THREE.CylinderGeometry(1, 1, 1, 3); hangGeo.translate(0, -0.5, 0);
    this.inst(hangGeo, swayMat(new THREE.MeshStandardMaterial({ color: 0x2f5a20 }), 0.0), hang);
    // glowing things
    const shroomGeo = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); shroomGeo.scale(1, 0.6, 1); shroomGeo.translate(0, 1, 0);
    this.inst(shroomGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), shrooms);
    const stem = new THREE.CylinderGeometry(0.15, 0.2, 1, 5); stem.translate(0, 0.5, 0);
    this.inst(stem, new THREE.MeshStandardMaterial({ color: 0xd8d0c0 }), shrooms);
    this.inst(new THREE.OctahedronGeometry(0.6, 0).scale(1, 1.5, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), crystals);
    const stalGeo = new THREE.ConeGeometry(0.5, 1, 6); stalGeo.translate(0, 0.5, 0);
    this.inst(stalGeo, new THREE.MeshStandardMaterial({ map: getTex('cave'), roughness: 1 }), stal);
  }
  buildLandmarks() {
    const P = this.path, g = this.group, r = rand(99);
    const bark = new THREE.MeshStandardMaterial({ map: getTex('bark'), roughness: 1 });
    const leaf = swayMat(new THREE.MeshStandardMaterial({ map: getTex('leaf'), roughness: 0.9 }), 0.006);
    const ruin = new THREE.MeshStandardMaterial({ map: getTex('ruin'), roughness: 0.95 });
    const glow = (c, i = 2) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i });
    const at = (obj, s, y, d, ry = 0) => { P.place(obj, s, y, d); obj.rotation.y += ry; g.add(obj); return obj; };
    // ── The Mother Tree: a colossal trunk you climb beside, visible from the very start
    {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(10, 16, 220, 16, 6), bark); trunk.position.y = 100; t.add(trunk);
      for (let i = 0; i < 7; i++) { const root = new THREE.Mesh(new THREE.ConeGeometry(5, 40, 6), bark); const a = i / 7 * Math.PI * 2; root.position.set(Math.cos(a) * 16, 4, Math.sin(a) * 16); root.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1); t.add(root); }
      for (let i = 0; i < 9; i++) { const br = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 3, 50, 6), bark); const a = i * 2.4; br.position.set(Math.cos(a) * 26, 120 + i * 10, Math.sin(a) * 26); br.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); t.add(br);
        for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(14 + r() * 8, 1), leaf); b.position.set(Math.cos(a) * (45 + k * 6), 135 + i * 10 + r() * 10, Math.sin(a) * (45 + k * 6)); t.add(b); } }
      for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(30, 1), leaf); b.position.set((r() - 0.5) * 50, 215 + r() * 20, (r() - 0.5) * 50); t.add(b); }
      // glowing Sunwright rune ring embedded in the trunk
      const ring = new THREE.Mesh(new THREE.TorusGeometry(16.2, 0.6, 6, 40), glow(0x40ffd0, 2.5)); ring.rotation.x = Math.PI / 2; ring.position.y = 40; t.add(ring);
      at(t, 300 + 80, -10, -48);
      this.animated.push({ update: (tt) => { ring.material.emissiveIntensity = 1.8 + Math.sin(tt * 1.5) * 0.8; } });
    }
    // ── Sunwright stone heads, half swallowed by the jungle
    const head = (s, y, d, sc, ry = 0) => {
      const h = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(6, 7, 5), ruin); b.position.y = 3.5; h.add(b);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.2, 5.6), ruin); brow.position.y = 5.3; h.add(brow);
      const em = glow(0x40ffd0, 0.3); (this.headEyes ||= []).push(em);
      for (const x of [-1.5, 1.5]) { const e = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.3), em); e.position.set(x, 4.4, 2.55); h.add(e); }
      const nose = new THREE.Mesh(new THREE.BoxGeometry(1, 2.4, 1), ruin); nose.position.set(0, 3, 2.7); h.add(nose);
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 0.3), glow(0x103830, 1)); mouth.position.set(0, 1.3, 2.55); h.add(mouth);
      for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 + r(), 0), leaf); m.position.set((r() - 0.5) * 6, 6.5 + r(), (r() - 0.5) * 4); h.add(m); }
      h.scale.setScalar(sc); h.rotation.z = (r() - 0.5) * 0.2; at(h, s, y, d, ry); return h;
    };
    head(40 + 80, -1, -22, 2.2, 0.3); head(150 + 80, -2, -45, 3.5, -0.4); head(620 + 80, -14, -40, 4, 0.2); head(760 + 80, 8, -30, 2.5, -0.2); head(1420 + 80, -24, -30, 3, 0.1);
    // ── ruins arches and broken columns
    for (let s = 560; s < 900; s += 22 + r() * 20) {
      const d = -14 - r() * 50, y = this.baseAt(s + 80) + (r() * 6);
      const a = new THREE.Group();
      const h = 10 + r() * 16;
      for (const x of [-4, 4]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, h, 8), ruin); c.position.set(x, h / 2, 0); a.add(c); }
      if (r() < 0.6) { const top = new THREE.Mesh(new THREE.BoxGeometry(11, 2, 3), ruin); top.position.y = h + 1; a.add(top); }
      at(a, s + 80, y, d, r());
    }
    // ── giant broken Sunwright gear (the strange technology)
    const gear = (s, y, d, R, spin) => {
      const G = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, R * 0.2, 24), new THREE.MeshStandardMaterial({ color: 0x8a7a50, metalness: 0.7, roughness: 0.5 })); disc.rotation.x = Math.PI / 2; G.add(disc);
      for (let i = 0; i < 12; i++) { const tth = new THREE.Mesh(new THREE.BoxGeometry(R * 0.25, R * 0.3, R * 0.2), disc.material); const a = i / 12 * Math.PI * 2; tth.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); tth.rotation.z = a; G.add(tth); }
      const core = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.3, R * 0.3, R * 0.3, 16), glow(0x40ffd0, 2)); core.rotation.x = Math.PI / 2; G.add(core);
      at(G, s, y, d); G.rotation.z = r();
      if (spin) this.animated.push({ update: (t, dt) => { G.rotateZ(dt * spin); } });
    };
    gear(680 + 80, 4, -60, 14, 0.05); gear(1150 + 80, -20, -35, 9, 0.4); gear(1250 + 80, -30, -50, 14, -0.25); gear(1440 + 80, -10, -40, 8, 0.6);
    // ── background waterfalls tumbling into the valley
    const wtex = getTex('waterfall');
    const wfMat = (op) => {
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, fog: true,
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: wtex }, uTime: windUniforms.uTime, op: { value: op } }]),
        vertexShader: '#include <fog_pars_vertex>\nvarying vec2 vUv; void main(){ vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mvPosition; \n#include <fog_vertex>\n}',
        fragmentShader: '#include <fog_pars_fragment>\nuniform sampler2D map; uniform float uTime, op; varying vec2 vUv; void main(){ vec4 c = texture2D(map, vec2(vUv.x, vUv.y * 2.0 + uTime * 1.2)); vec4 c2 = texture2D(map, vec2(vUv.x * 1.3 + 0.3, vUv.y * 1.5 + uTime * 0.8)); vec3 col = mix(c.rgb, c2.rgb, 0.5) * 1.15; float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x); gl_FragColor = vec4(col, op * edge * (0.7 + 0.3 * c.r)); \n#include <fog_fragment>\n}',
      });
      return m;
    };
    this.wfMat = wfMat;
    const waterfall = (s, yTop, yBot, d, w, op = 0.85) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, yTop - yBot, 1, 1), wfMat(op));
      m.position.y = (yTop + yBot) / 2; const G = new THREE.Group(); G.add(m); at(G, s, 0, d); return G;
    };
    for (const [s, top, bot, d, w] of [[610, 60, -30, -70, 14], [650, 80, -30, -110, 22], [700, 45, -20, -45, 10], [780, 70, -25, -90, 18], [560, 50, -30, -120, 16], [860, 90, -30, -150, 26]]) {
      waterfall(s + 80, top, bot, d, w);
      const cl = new THREE.Mesh(new THREE.BoxGeometry(w * 2.5, 30, 20), new THREE.MeshStandardMaterial({ map: getTex('cliff'), roughness: 1 }));
      cl.position.y = top + 15 - 0.5; const G = new THREE.Group(); G.add(cl); at(G, s + 80, 0, d - 10.5);
    }
    // the waterfall that hides a secret cave — right in front of the path
    this.secretFall = waterfall(716 + 80, 26, -1, 3.4, 14, 0.78);
    { const cl = new THREE.Mesh(new THREE.BoxGeometry(18, 20, 16), new THREE.MeshStandardMaterial({ map: getTex('cliff') })); cl.position.y = 36; const G = new THREE.Group(); G.add(cl); at(G, 716 + 80, 0, -2); }
    // ── Colossus: ancient being whose ribcage forms the Glowdeep
    {
      const bone = new THREE.MeshStandardMaterial({ color: 0xcfc4a8, roughness: 0.7, emissive: 0x201830 });
      for (let i = 0; i < 9; i++) {
        const s = 930 + i * 14 + 80;
        const rib = new THREE.Mesh(new THREE.TorusGeometry(24, 1.6 - i * 0.05, 6, 24, Math.PI), bone);
        const G = new THREE.Group(); G.add(rib); at(G, s, -6, -26, Math.PI / 2);
      }
      const spine = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 150, 8), bone); spine.rotation.z = Math.PI / 2;
      const SG = new THREE.Group(); SG.add(spine); at(SG, 990 + 80, 60, -20);
      // the heart chamber: great eye + heart crystal (major secret)
      const H = new THREE.Group();
      const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(5, 1), new THREE.MeshStandardMaterial({ color: 0x401060, emissive: 0xb060ff, emissiveIntensity: 1.5, flatShading: true, roughness: 0.3 }));
      H.add(heart);
      for (let i = 0; i < 3; i++) { const rr = new THREE.Mesh(new THREE.TorusGeometry(8 + i * 3, 0.25, 6, 48), glow(0xd090ff, 2)); rr.rotation.set(r() * 3, r() * 3, 0); H.add(rr); }
      at(H, 1020 + 80, 22, -9);
      const eye = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16), new THREE.MeshStandardMaterial({ color: 0xf0e8d0, roughness: 0.4 })); eye.add(ball);
      const iris = new THREE.Mesh(new THREE.CircleGeometry(5, 32), glow(0x40ffd0, 3)); iris.position.z = 9.05; eye.add(iris);
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(2, 24), new THREE.MeshBasicMaterial({ color: 0x000000 })); pupil.position.z = 9.1; eye.add(pupil);
      const lidT = new THREE.Mesh(new THREE.SphereGeometry(9.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a3048, roughness: 1, side: THREE.DoubleSide })); eye.add(lidT);
      const lidB = lidT.clone(); lidB.rotation.x = Math.PI; eye.add(lidB);
      at(eye, 985 + 80, 40, -22);
      this.colossus = { heart: H, eye, lidT, lidB, open: 0, iris };
      this.animated.push({ update: (t, dt) => {
        heart.rotation.y += dt * 0.5; heart.scale.setScalar(1 + Math.sin(t * 2.2) * 0.06 + Math.max(0, Math.sin(t * 2.2 * 2)) * 0.04);
        H.children.forEach((c, i) => { if (i) { c.rotation.x += dt * (0.3 + i * 0.2); c.rotation.y += dt * 0.2; } });
        const o = this.colossus.open; lidT.rotation.x = -0.05 - o * 1.2; lidB.rotation.x = Math.PI + 0.05 + o * 1.2;
      } });
    }
    // ── Mine: timber frames and lanterns along the tunnel
    const timber = new THREE.MeshStandardMaterial({ map: getTex('wood'), roughness: 1 });
    const lantern = glow(0xffa040, 3);
    for (let s = 1048; s < 1370; s += 10) {
      const S = s + 80, gy = this.groundAt(S) ?? -20;
      const G = new THREE.Group();
      for (const d of [-3.6, 4]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 12, 0.6), timber); post.position.set(0, 6 - 2, d); G.add(post); }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 9), timber); beam.position.set(0, 10, 0.2); G.add(beam);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), lantern); lamp.position.set(0.5, 9, -3); G.add(lamp);
      at(G, S, gy, 0);
    }
    // ── Temple: pillars and a colossal sun disc
    for (let s = 1360; s < 1560; s += 12) {
      for (const d of [-9, -24]) {
        const h = 26 + r() * 10; const c = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, h, 10), new THREE.MeshStandardMaterial({ map: getTex('temple') }));
        c.position.y = h / 2; const G = new THREE.Group(); G.add(c); at(G, s + 80, -22, d);
      }
    }
    {
      const sun = new THREE.Mesh(new THREE.TorusGeometry(18, 2.5, 10, 48), new THREE.MeshStandardMaterial({ color: 0xc09030, metalness: 0.8, roughness: 0.3, emissive: 0x402000 }));
      const G = new THREE.Group(); G.add(sun); sun.position.y = 14; at(G, 1540 + 80, -10, -34);
      const core = new THREE.Mesh(new THREE.CircleGeometry(15, 48), glow(0xffa030, 0.6)); core.position.set(0, 14, -0.5); G.add(core);
      this.sunDisc = { core, sun };
    }
    // ── god rays
    // soft shafts: edges feather out, the top/bottom fade, and they vanish when the camera gets close
    const rayMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { opacity: { value: 0.07 }, color: { value: new THREE.Color(0xfff0c0) } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vV = -mv.xyz; vN = normalMatrix * normal; vY = uv.y; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float opacity; uniform vec3 color; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float edge = pow(abs(dot(normalize(vN), normalize(vV))), 2.5); float d = length(vV); float a = opacity * edge * smoothstep(14.0, 32.0, d) * smoothstep(0.0, 0.35, vY) * smoothstep(1.0, 0.6, vY); gl_FragColor = vec4(color * a * 1.6, 1.0); }' });
    for (let s = -20; s < 900; s += 25 + r() * 25) {
      if (this.themeAt(s + 80) === 3) continue;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(2 + r() * 3, 6 + r() * 5, 90, 12, 1, true), rayMat.clone());
      m.rotation.z = 0.35; m.rotation.x = -0.15; m.position.y = 30; const G = new THREE.Group(); G.add(m); at(G, s + 80, 0, -8 - r() * 30);
      const ph = r() * 6; this.animated.push({ update: (t) => { m.material.uniforms.opacity.value = (0.05 + Math.sin(t * 0.5 + ph) * 0.025) * (1 + Math.min(1.5, (this.wake || 0) * 0.15)); } });
    }
    // ── distant wildlife: the Mossback giants wander the valley; bird flocks circle
    this.mossbacks = [];
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x4e5a40, roughness: 1 });
    for (const [s, d] of [[60, -140], [640, -150], [470, -170]]) {
      const M = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(10, 12, 8), mossMat); body.scale.set(1.6, 0.9, 1); body.position.y = 22; M.add(body);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 3, 26, 8), mossMat); neck.position.set(16, 34, 0); neck.rotation.z = -0.9; M.add(neck);
      const hd = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), mossMat); hd.position.set(27, 43, 0); M.add(hd);
      const legs = [];
      for (const [x, z] of [[-9, -5], [-9, 5], [9, -5], [9, 5]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, 18, 6), mossMat); l.position.set(x, 9, z); M.add(l); legs.push(l); }
      for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.IcosahedronGeometry(3, 0), leaf); t.position.set((r() - 0.5) * 20, 30, (r() - 0.5) * 10); M.add(t); }
      at(M, s + 80, -8, d);
      const base = M.position.clone(), dir = new THREE.Vector3(Math.cos(M.rotation.y), 0, -Math.sin(M.rotation.y));
      this.animated.push({ update: (t) => { const k = (t * 1.5) % 200; M.position.copy(base).addScaledVector(dir, k - 100); legs.forEach((l, i) => l.rotation.z = Math.sin(t * 1.2 + i * Math.PI / 2 * (i % 2 ? 1 : -1)) * 0.25); M.position.y = base.y + Math.abs(Math.sin(t * 1.2)) * 0.6; } });
    }
    const birdGeo = new THREE.BufferGeometry(); birdGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -1, 0.2, -0.6, 0, 0, 0.3, 0, 0, 0, 1, 0.2, -0.6, 0, 0, 0.3], 3)); birdGeo.computeVertexNormals();
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x1a2a20, side: THREE.DoubleSide });
    for (const s of [30, 330, 520, 720, 1480]) {
      const F = new THREE.Group(); const c = P.world(s + 80, 40, -60);
      const birds = []; for (let i = 0; i < 14; i++) { const b = new THREE.Mesh(birdGeo, birdMat); b.scale.setScalar(1.2); F.add(b); birds.push({ b, ph: r() * 6, rad: 8 + r() * 14, h: r() * 8, sp: 0.3 + r() * 0.2 }); }
      F.position.copy(c); g.add(F);
      this.animated.push({ update: (t) => { for (const o of birds) { const a = t * o.sp + o.ph; o.b.position.set(Math.cos(a) * o.rad, o.h + Math.sin(t * 2 + o.ph) * 1.5, Math.sin(a) * o.rad); o.b.rotation.y = -a; o.b.scale.y = 1 + Math.sin(t * 12 + o.ph) * 0.8; } } });
    }
    // Sky shrine: floating islands high above, clouds
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xdde6f2, emissive: 0x141820, roughness: 1, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 40; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(4 + r() * 8, 1), cloudMat); const G = new THREE.Group(); G.add(c); c.scale.y = 0.5; at(G, 380 + r() * 110 + 80, 180 + r() * 20, -10 - r() * 80); }
    const shrine = new THREE.Group();
    for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 10, 8), ruin); const a = i / 6 * Math.PI * 2; c.position.set(Math.cos(a) * 8, 5, Math.sin(a) * 8); shrine.add(c); }
    const halo = new THREE.Mesh(new THREE.TorusGeometry(8, 0.6, 6, 40), glow(0xffd070, 2)); halo.rotation.x = Math.PI / 2; halo.position.y = 10.5; shrine.add(halo);
    at(shrine, 428 + 80, 200, -18);
  }
  buildWater() {
    this.waterMeshes = [];
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a9ab0, transparent: true, opacity: 0.62, roughness: 0.15, metalness: 0.2, emissive: 0x05303a, depthWrite: false });
    for (const w of this.level.water) {
      if (w.y1 < -100) continue;
      const pos = [];
      const n = Math.ceil((w.s1 - w.s0) / 2);
      for (let i = 0; i < n; i++) {
        const a = w.s0 + (w.s1 - w.s0) * i / n, b = w.s0 + (w.s1 - w.s0) * (i + 1) / n;
        const q = (s, y, d) => { const v = this.path.world(s, y, d); return [v.x, v.y, v.z]; };
        pos.push(...q(a, w.y1, 60), ...q(b, w.y1, 60), ...q(b, w.y1, -60), ...q(a, w.y1, 60), ...q(b, w.y1, -60), ...q(a, w.y1, -60));
        pos.push(...q(a, w.y0, 3.6), ...q(b, w.y0, 3.6), ...q(b, w.y1, 3.6), ...q(a, w.y0, 3.6), ...q(b, w.y1, 3.6), ...q(a, w.y1, 3.6));
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.renderOrder = 2; this.group.add(m); this.waterMeshes.push(m);
    }
  }
  update(t, dt) {
    windUniforms.uTime.value = t;
    for (const a of this.animated) a.update(t, dt);
  }
}
