import * as THREE from 'three';
import { getTex } from './textures.js';
import { surfMat } from './world.js';

// Round two: the living fairy tale layered over Thornwild. Abilities and their shrines,
// waystones, sealed doors, ghostwood, lore glyphs, wind trials, companion personality,
// dawnblooms, the sleeping Mossback, hidden worlds and the world slowly waking up.

export const ABILITIES = {
  leap: { name: 'WISP LEAP', sub: 'the air remembers how to hold you', icon: '✧',
    tip: 'Press <b>Space</b> again in mid-air to leap. Bounces, vines and critters restore it. Try it on every companion.' },
  song: { name: 'LUMEN SONG', sub: 'the old light answers when you call', icon: '♪',
    tip: 'Hold <b>↑</b> to sing. Hidden things wake: ghostwood, sealed doors, sleeping blooms.' },
  grip: { name: 'ROOTGRIP', sub: 'the moss knows your hands now', icon: '❦',
    tip: 'Jump into <b>glowing moss</b> to cling · <b>↑↓</b> climb · <b>Space</b> kick off. Somewhere back in the Rootwild, a mossy root waits.' },
};
const ORDER = ['leap', 'song', 'grip'];

export const ECHO_LINES = [
  'From up here the Sunwrights watched the Seed grow. They were happy, and they did not know it would end.',
  'We hid our last lantern behind the falling water, so the river would keep watch over it.',
  'Below the lake, the sky keeps our names. Say them, and the stars remember.',
  'The wind carried our children between the trees. They never touched the ground, and they never fell.',
  'In the Grove it is always the night we were happiest.',
  'The great one lay down to sleep so that we would have a place to live. We built our homes inside its dreams.',
  'Some of us ran, and some of us rode. None of us looked back.',
  'If you are reading this, the Seed has chosen you. Be gentle with it. It is only a child.',
];

const glow = (c, i = 2, extra = {}) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i, ...extra });
const SIGIL = (r, c, i = 2) => { // the Sunwright sigil: circle with a cross and a dot, repeated everywhere
  const g = new THREE.Group(); const m = glow(c, i);
  g.add(new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.08, 6, 32), m));
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(r * 1.6, r * 0.1, r * 0.1), m); g.add(b1);
  const b2 = b1.clone(); b2.rotation.z = Math.PI / 2; g.add(b2);
  const d = new THREE.Mesh(new THREE.SphereGeometry(r * 0.18, 10, 8), m); g.add(d);
  return g;
};

function emoteTexture(ch, color) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = 'rgba(20,30,24,0.78)'; x.beginPath(); x.arc(64, 58, 46, 0, 7); x.fill();
  x.beginPath(); x.moveTo(50, 96); x.lineTo(64, 122); x.lineTo(76, 96); x.fill();
  x.fillStyle = color; x.font = 'bold 64px Fredoka, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 64, 62);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Magic {
  constructor(game) {
    this.game = game; const { scene, path, level } = game;
    this.path = path; this.level = level; this.scene = scene;
    this.group = new THREE.Group(); scene.add(this.group);
    this.abilities = new Set(); this.t = 0;
    this.echoes = new Set(); this.trialsWon = new Set(); this.noticed = new Set(); this.bonds = new Set();
    this.chain = 0; this.bestChain = 0; this.groundT = 0; this.quiet = 0;
    this.cosmetic = { scarf: false, trail: false };
    this.emotes = [];
    this.emoteTex = { '!': emoteTexture('!', '#ffd84a'), '♥': emoteTexture('♥', '#ff7a9a'), '?': emoteTexture('?', '#9fe8ff'), '♪': emoteTexture('♪', '#a0ffd0'), 'z': emoteTexture('z', '#c8d0ff'), '✦': emoteTexture('✦', '#ffe7a0') };
    this.buildShrines(); this.buildWaystones(); this.buildDoors(); this.buildGhosts(); this.buildEchoes();
    this.buildTrials(); this.buildCritters(); this.buildDawnblooms(); this.buildMossback(); this.buildFragments();
    this.buildStarwell(); this.buildGrove(); this.buildSwarm(); this.buildBonds();
  }
  has(a) { return this.abilities.has(a); }
  get awaken() { return this.abilities.size + this.game.entities.shards.filter((s) => s.taken).length + this.echoes.size * 0.5; }
  place(o, s, y, d = 0) { this.path.place(o, s, y, d); this.group.add(o); return o; }

  // ───────────────── shrines: where abilities awaken
  buildShrines() {
    this.shrines = this.level.shrines.map((sh) => {
      const g = new THREE.Group();
      const stone = surfMat('ruin');
      const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 0.6, 12), stone); dais.position.y = 0.3; dais.receiveShadow = true; g.add(dais);
      for (let i = 0; i < 5; i++) { const a = Math.PI + (i / 4) * Math.PI; const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3 + (i % 2) * 1.2, 0.6), stone); p.position.set(Math.cos(a) * 2.6, 1.6, Math.sin(a) * 2.6 - 0.3); p.rotation.z = (i - 2) * 0.05; g.add(p); }
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 2), glow(0xfff0b0, 2.5)); orb.position.y = 2.6; g.add(orb);
      const sig = SIGIL(0.9, 0x6fffd8, 1.5); sig.position.set(0, 2.6, -0.1); g.add(sig);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 40, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      col.position.y = 20; g.add(col);
      this.place(g, sh.s, sh.y, -1.2);
      return { ...sh, g, orb, sig, col, done: false };
    });
  }
  awakenShrine(sh) {
    const game = this.game, p = game.player;
    sh.done = true; p.state = 'cutscene'; p.vs = 0;
    const a = ABILITIES[sh.ability], stage = ORDER.indexOf(sh.ability) + 1;
    this.seq = { t: 0, sh, stage, a, fired: {} };
    this.quiet = 1;
    const c = this.path.world(sh.s, sh.y + 2, 0), f = this.path.frame(sh.s);
    game.director.play({ dur: 5, hold: true,
      pos: (u) => { const ang = -0.5 + u * 1.0, r = 9 - u * 2.5; return new THREE.Vector3(c.x + (f.nx * Math.cos(ang) + f.tx * Math.sin(ang)) * r, c.y + 1.5 + u * 1.5, c.z + (f.nz * Math.cos(ang) + f.tz * Math.sin(ang)) * r); },
      look: () => c.clone() });
  }
  runSeq(dt) {
    const S = this.seq; if (!S) return;
    const game = this.game, p = game.player, sh = S.sh; S.t += dt;
    const once = (k, fn) => { if (!S.fired[k]) { S.fired[k] = true; fn(); } };
    sh.col.material.opacity = Math.min(0.35, S.t * 0.2) * (S.t > 4.2 ? Math.max(0, 1 - (S.t - 4.2) * 2) : 1);
    sh.orb.position.y = 2.6 + Math.min(1, S.t / 2) * 1.2; sh.orb.scale.setScalar(1 + S.t * 0.3);
    if (S.t > 1 && S.t < 3.6 && Math.random() < dt * 60) { // light spirals into Kiri
      const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 3, w = this.path.world(p.s + Math.cos(a) * r, p.y + 1 + Math.sin(a) * r, Math.random() * 2 - 1);
      const tgt = this.path.world(p.s, p.y + 0.8, 0); game.fx.spawn(w, tgt.sub(w).multiplyScalar(1.1), 0xfff0b0, 0.5, 0.9, 0);
    }
    once('m', () => game.audio.motif(S.stage));
    once('e', () => this.emote(p.model, '✦', 3.5));
    if (S.t > 3.6) once('f', () => { game.flash(0.8); game.shake(0.4); this.abilities.add(sh.ability); game.hud.abilities(this.abilities); this.celebrate(); });
    if (S.t > 4.3) once('b', () => { game.hud.banner(S.a.name, S.a.sub, 4); game.hud.toast(S.a.tip, 7); });
    if (S.t > 5.2) { this.seq = null; game.director.script = null; p.state = 'normal'; this.quiet = 0; game.stats.lastAbility = sh.ability; }
  }
  // ───────────────── waystones: fast travel between lit stones
  buildWaystones() {
    this.waystones = this.level.waystones.map((w) => {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 3.4, 6), surfMat('glyph', 0x051a18)); m.position.y = 1.7; m.castShadow = true; g.add(m);
      const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), glow(0x406060, 0.6)); cap.position.y = 3.9; g.add(cap);
      const sig = SIGIL(0.35, 0x305050, 0.5); sig.position.set(0, 2.2, 0.62); g.add(sig);
      this.place(g, w.s, w.y, -2.6);
      return { ...w, g, cap, sig, lit: false };
    });
  }
  // ───────────────── sealed Sunwright doors (opened by song)
  buildDoors() {
    this.doors = this.level.doors.map((d) => {
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.55, 8, 40), surfMat('ruin')); frame.position.y = 2.6; g.add(frame);
      const slab = new THREE.Mesh(new THREE.CircleGeometry(2.2, 40), surfMat('glyph', 0x061814)); slab.position.set(0, 2.6, -0.15); g.add(slab);
      const sig = SIGIL(1.3, 0x3fbfa0, 0.4); sig.position.set(0, 2.6, 0.05); g.add(sig);
      const swirl = new THREE.Mesh(new THREE.CircleGeometry(2.1, 40), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { t: { value: 0 }, k: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform float t, k; varying vec2 vUv; void main(){ vec2 c = vUv - 0.5; float r = length(c); float a = atan(c.y, c.x); float st = step(0.985, fract(sin(dot(floor((c * 30.0 + vec2(t * 0.3, 0.0))), vec2(12.9, 78.2))) * 43758.5)); float sw = sin(a * 3.0 + r * 18.0 - t * 2.0) * 0.5 + 0.5; vec3 col = mix(vec3(0.05, 0.08, 0.25), vec3(0.3, 0.5, 1.0), sw * (1.0 - r * 1.8)) + st; gl_FragColor = vec4(col, k * smoothstep(0.5, 0.4, r)); }' }));
      swirl.position.set(0, 2.6, 0.1); g.add(swirl);
      this.place(g, d.s, d.y, -2.4);
      return { ...d, g, slab, sig, swirl, open: false, k: 0, hum: 2 };
    });
  }
  // ───────────────── ghostwood: platforms that exist only while the song lingers
  buildGhosts() {
    this.ghosts = this.level.solids.filter((o) => o.ghost).map((o) => {
      o.active = false;
      const w = o.s1 - o.s0;
      const mat = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x3aa0ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.07, depthWrite: false });
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, 3), mat); m.position.y = -0.3;
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xaaf0ff, transparent: true, opacity: 0.18 })); edge.position.y = -0.3;
      const g = new THREE.Group(); g.add(m, edge); this.place(g, (o.s0 + o.s1) / 2, o.y1);
      return { o, g, m, edge, timer: 0 };
    });
  }
  // ───────────────── echo glyphs (lore)
  buildEchoes() {
    this.echoStones = this.level.echoes.map((e) => this.makeEchoStone(e));
  }
  makeEchoStone(e) {
    const g = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.1, 0.35), surfMat('ruin')); slab.position.y = 1.05; slab.rotation.z = 0.06; slab.castShadow = true; g.add(slab);
    const sig = SIGIL(0.38, 0xffd070, 1.8); sig.position.set(0, 1.35, 0.2); g.add(sig);
    const mote = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), glow(0xffe0a0, 3)); mote.position.y = 2.6; g.add(mote);
    this.place(g, e.s, e.y, -0.6);
    return { ...e, g, sig, mote, taken: false };
  }
  collectEcho(e) {
    const game = this.game;
    e.taken = true; this.echoes.add(e.idx);
    game.hud.story(ECHO_LINES[e.idx], `Echo ${this.echoes.size} / 8`);
    game.audio.play('echo'); this.quietFor = 5;
    game.fx.burst(this.path.world(e.s, e.y + 1.5, 0), 0xffe0a0, 30, 5, 0.6, 1.2, 1);
    game.hud.echoes(this.echoes.size);
    this.celebrate();
  }
  // ───────────────── wind trials
  buildTrials() {
    this.trials = this.level.trials.map((tr) => {
      const rings = tr.rings.map(([s, y], i) => {
        const m = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.1, 6, 32), glow(i === 0 ? 0xfff0a0 : 0x9fe8ff, i === 0 ? 2 : 0.8));
        const g = new THREE.Group(); g.add(m); this.place(g, s, y); return { s, y, g, m, hit: false };
      });
      return { ...tr, rings, state: 'idle', t: 0, next: 0 };
    });
  }
  // ───────────────── critters that flee into secrets
  buildCritters() {
    this.critters = this.level.critters.map((c) => {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe0f8ff, emissive: 0x60e0ff, emissiveIntensity: 1.2 })); b.scale.set(1.5, 1, 1); b.position.y = 0.22; g.add(b);
      for (const z of [0.1, -0.1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshStandardMaterial({ color: 0xe0f8ff, emissive: 0x60e0ff })); e.position.set(0.18, 0.45, z); g.add(e); }
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.5, 4), glow(0x80f0ff, 2)); tail.rotation.z = 1.2; tail.position.set(-0.4, 0.3, 0); g.add(tail);
      this.place(g, c.s, c.y);
      return { ...c, g, st: 'idle', k: 1 };
    });
  }
  // ───────────────── dawnblooms: huge flowers that open when Kiri comes close
  buildDawnblooms() {
    this.dawn = [];
    const add = (s, y, d, size, colA = 0xffa0d0, colB = 0xfff0a0) => {
      const g = new THREE.Group(); const head = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 3, 6), new THREE.MeshStandardMaterial({ color: 0x3a8a40 })); stem.position.y = 1.5; g.add(stem);
      head.position.y = 3; g.add(head);
      const petals = [];
      const pm = new THREE.MeshStandardMaterial({ color: colA, emissive: colA, emissiveIntensity: 0.15, side: THREE.DoubleSide, roughness: 0.6 });
      for (let i = 0; i < 7; i++) { const pv = new THREE.Group(); pv.rotation.y = i / 7 * Math.PI * 2; const p = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 6), pm); p.scale.set(0.45, 0.08, 1); p.position.z = 0.8; pv.add(p); head.add(pv); petals.push(pv); }
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), glow(colB, 0.3)); head.add(core);
      g.scale.setScalar(size); this.place(g, s, y, d);
      const o = { s, y, g, petals, core, pm, open: 0 }; this.dawn.push(o); return o;
    };
    this.addDawn = add;
    for (const b of this.level.blooms2) add(b.s, b.y, b.d, b.size);
  }
  // ───────────────── the Mossback: a hill that is not a hill
  buildMossback() {
    const mb = this.level.mossback; if (!mb) return;
    const moss = new THREE.MeshStandardMaterial({ map: getTex('grass'), color: 0x9fbf90, roughness: 1 });
    const hide = new THREE.MeshStandardMaterial({ color: 0x4e5a48, roughness: 1 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), hide); body.scale.set(mb.half + 0.5, 3.2, 3.6); body.position.y = -3.2; body.castShadow = true; g.add(body);
    const top = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), moss); top.scale.set(mb.half + 0.4, 1.1, 3.4); top.position.y = -1.05; g.add(top);
    for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 5), new THREE.MeshStandardMaterial({ color: 0x3f8a30 })); f.position.set((i / 8 - 0.5) * mb.half * 1.6, 0.4, (i % 3 - 1) * 1.6 - 1); g.add(f); }
    const neck = new THREE.Group(); neck.position.set(mb.half * 0.9, -2.5, 0); g.add(neck);
    const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 5, 8), hide); nk.position.y = 2.5; neck.add(nk);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 10), hide); head.scale.set(1.5, 1, 1); head.position.set(0.8, 5.2, 0); neck.add(head);
    const eyes = [];
    for (const z of [0.7, -0.7]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), glow(0xfff0a0, 0)); e.position.set(1.9, 5.5, z); neck.add(e); eyes.push(e); }
    neck.rotation.z = -1.3;
    const legs = [];
    for (const [x, z] of [[-3.5, 2.2], [-3.5, -2.2], [3.5, 2.2], [3.5, -2.2]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 5, 7), hide); l.position.set(x, -5.5, z); g.add(l); legs.push(l); }
    this.group.add(g);
    const sol = { s0: mb.s - mb.half, s1: mb.s + mb.half, y0: mb.y - 3, y1: mb.y, active: true, dS: 0, dY: 0, mat: 'grass', mossback: true };
    this.game.entities.solids.push(sol);
    this.mb = { ...mb, g, neck, eyes, legs, sol, state: 'sleep', t: 0, cs: mb.s, cy: mb.y, standT: 0 };
    this.placeMossback();
  }
  placeMossback() { const m = this.mb; this.path.place(m.g, m.cs, m.cy); }
  stepMossback(h) {
    const m = this.mb; if (!m) return;
    const p = this.game.player, sol = m.sol;
    const ps0 = sol.s0, py1 = sol.y1;
    m.t += h;
    if (m.state === 'sleep') {
      m.cy = m.y + Math.sin(m.t * 0.8) * 0.06;
      if (p.grounded && p.ground === sol) { m.standT += h; if (m.standT > 0.5) { m.state = 'wake'; m.t = 0; this.game.audio.play('rumble'); this.game.shake(0.6); this.emote(p.model, '!', 1.5); this.game.hud.banner('THE MOSSBACK WAKES', 'it was never a hill', 3.5); this.game.director.punch = 0; this.game.stats.mossback = true; } }
    } else if (m.state === 'wake') {
      const k = Math.min(1, m.t / 3.2), e = k * k * (3 - 2 * k);
      m.cy = m.y + (m.toY - m.y) * e + Math.sin(m.t * 30) * 0.03 * (1 - k);
      m.neck.rotation.z = -1.3 + e * 1.1;
      m.eyes.forEach((x) => x.material.emissiveIntensity = e * 3);
      if (k >= 1) { m.state = 'walk'; m.t = 0; }
    } else if (m.state === 'walk') {
      const k = Math.min(1, m.t / 5.5), e = k * k * (3 - 2 * k);
      m.cs = m.s + (m.toS - m.s) * e; m.cy = m.toY + Math.abs(Math.sin(m.t * 2.4)) * 0.18;
      m.legs.forEach((l, i) => l.rotation.z = Math.sin(m.t * 2.4 + i * Math.PI / 2 * (i % 2 ? 1 : -1)) * 0.35);
      m.neck.rotation.z = -0.2 + Math.sin(m.t * 1.2) * 0.08;
      if (k >= 1) { m.state = 'rest'; m.t = 0; }
    } else if (m.state === 'rest') { m.cy = m.toY + Math.sin(m.t) * 0.05; m.neck.rotation.z = -0.3 + Math.sin(m.t * 0.6) * 0.1; }
    sol.s0 = m.cs - m.half; sol.s1 = m.cs + m.half; sol.y1 = m.cy; sol.y0 = m.cy - 3;
    sol.dS = sol.s0 - ps0; sol.dY = sol.y1 - py1;
    this.placeMossback();
  }
  // ───────────────── floating architecture drifting in the ruins and hidden worlds
  buildFragments() {
    const r = (() => { let s = 1234; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
    const list = [];
    const zones = [[560, 900, 4, 30], [1360, 1560, -10, 20], [40, 140, -146, -120], [280, 360, 305, 330]];
    for (const [a, b, y0, y1] of zones) for (let i = 0; i < 26; i++) list.push({ s: a + 80 + r() * (b - a), y: y0 + r() * (y1 - y0), d: -10 - r() * 45, sc: 0.6 + r() * 2.5, sp: (r() - 0.5) * 0.6, ph: r() * 6 });
    const geo = new THREE.BoxGeometry(1, 0.7, 1.4);
    this.frag = new THREE.InstancedMesh(geo, surfMat('ruin', 0x0a1a18), list.length);
    this.fragList = list.map((f) => ({ ...f, p: this.path.world(f.s, f.y, f.d) }));
    this.group.add(this.frag);
    const runeGeo = new THREE.BoxGeometry(0.8, 0.06, 0.06);
    this.fragRunes = new THREE.InstancedMesh(runeGeo, glow(0x6fffd8, 1.2), list.length); this.group.add(this.fragRunes);
    this.frag.frustumCulled = this.fragRunes.frustumCulled = false;
  }
  updateFragments() {
    const o = new THREE.Object3D(), t = this.t;
    this.fragList.forEach((f, i) => {
      o.position.copy(f.p); o.position.y += Math.sin(t * 0.4 + f.ph) * 0.8; o.rotation.set(t * f.sp * 0.3 + f.ph, t * f.sp + f.ph, 0.2); o.scale.setScalar(f.sc); o.updateMatrix();
      this.frag.setMatrixAt(i, o.matrix);
      o.translateZ(0.72); o.updateMatrix(); this.fragRunes.setMatrixAt(i, o.matrix);
    });
    this.frag.instanceMatrix.needsUpdate = true; this.fragRunes.instanceMatrix.needsUpdate = true;
  }
  // ───────────────── the Starwell: an underground lake that reflects a sky that isn't there
  buildStarwell() {
    const c = this.path.world(90 + 80, -150, -20);
    const N = 2400, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const cc = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const u = Math.random() * Math.PI * 2, v = Math.acos(Math.random() * 2 - 1), R = 120 + Math.random() * 60;
      pos[i * 3] = c.x + Math.sin(v) * Math.cos(u) * R; pos[i * 3 + 1] = -151 + Math.abs(Math.cos(v)) * R * 0.6 * (i % 2 ? 1 : -1); pos[i * 3 + 2] = c.z + Math.sin(v) * Math.sin(u) * R;
      cc.setHSL(0.55 + Math.random() * 0.2, 0.6, 0.7 + Math.random() * 0.3); col.set([cc.r, cc.g, cc.b], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.1, vertexColors: true, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.95, depthWrite: false }));
    this.group.add(this.stars);
    // mirror lake
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshStandardMaterial({ color: 0x050a1c, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.75, emissive: 0x040818 }));
    lake.rotation.x = -Math.PI / 2; lake.position.set(c.x, -151, c.z); this.group.add(lake);
    // the sleeping starwhale
    const W = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0x0a1030, emissive: 0x060a20, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), skin); body.scale.set(46, 13, 16); W.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(8, 30, 12), skin); tail.rotation.z = Math.PI / 2; tail.position.x = -58; W.add(tail);
    const fluke = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 26), skin); fluke.position.x = -72; W.add(fluke);
    const dots = new THREE.Group(); const dm = glow(0xbfe0ff, 3);
    for (let i = 0; i < 60; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI; const d = new THREE.Mesh(new THREE.SphereGeometry(0.35 + Math.random() * 0.4, 6, 4), dm); d.position.set(Math.cos(a) * Math.sin(b) * 46.5, Math.cos(b) * 13.2, Math.sin(a) * Math.sin(b) * 16.3); if (d.position.z > -2) dots.add(d); }
    W.add(dots);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), glow(0x9fe8ff, 0)); eye.position.set(38, 3, 9); W.add(eye);
    W.position.copy(this.path.world(125 + 80, -148, -70)); W.rotation.y = this.path.yaw(125 + 80) + Math.PI; this.group.add(W);
    this.whale = { W, eye, dots, open: 0 };
  }
  // ───────────────── the Dreaming Grove: always the happiest night
  buildGrove() {
    const P = this.path, dark = new THREE.MeshStandardMaterial({ color: 0x141a30, roughness: 1 });
    const lanternM = glow(0xffc070, 2.5);
    for (let i = 0; i < 26; i++) {
      const s = 270 + 80 + Math.random() * 100, d = -8 - Math.random() * 60, h = 30 + Math.random() * 40;
      const G = new THREE.Group();
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.8 + Math.random(), 2 + Math.random() * 2, h, 7), dark); tr.position.y = h / 2; G.add(tr);
      for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(6 + Math.random() * 5, 1), new THREE.MeshStandardMaterial({ color: 0x1a2a48, roughness: 1 })); c.position.set((Math.random() - 0.5) * 8, h + Math.random() * 4, (Math.random() - 0.5) * 8); G.add(c); }
      for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), lanternM); l.position.set((Math.random() - 0.5) * 10, h - 4 - Math.random() * 6, (Math.random() - 0.5) * 10); G.add(l); }
      P.place(G, s, 285, d); this.group.add(G);
    }
    // enormous moon-flowers
    for (const [s, y, d, sz] of [[292, 300, -6, 2.6], [300, 300, -14, 3.5], [318, 298, -8, 2.2], [333, 305.5, -10, 3], [346, 307, -7, 2.4], [310, 296, -22, 5]]) this.addDawn(s + 80, y, d, sz, 0xc0b0ff, 0xe0f8ff);
  }
  // ───────────────── fireflies that gather around Kiri in the dark
  buildSwarm() {
    this.swarm = [];
    const m = glow(0xd0ffa0, 3);
    for (let i = 0; i < 14; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), m); f.visible = false; this.group.add(f); this.swarm.push({ f, ph: Math.random() * 6, r: 1 + Math.random() * 1.5, sp: 0.6 + Math.random() }); }
  }

  // ───────────────── bond charms: each can only be claimed by riding its companion to a place from the past
  buildBonds() {
    const COL = { beast: 0x7aa0ff, frog: 0x60ff90, bird: 0xff7050, fish: 0x60e8ff, oru: 0xc080ff };
    this.bondItems = this.level.bonds.map((b) => {
      const g = new THREE.Group();
      const charm = new THREE.Mesh(new THREE.TorusKnotGeometry(0.32, 0.1, 48, 8), new THREE.MeshStandardMaterial({ color: COL[b.kind], emissive: COL[b.kind], emissiveIntensity: 1.3, metalness: 0.4, roughness: 0.3 }));
      charm.position.y = 1; g.add(charm);
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.7, 32), new THREE.MeshBasicMaterial({ color: COL[b.kind], transparent: true, opacity: 0.6, side: THREE.DoubleSide })); halo.position.y = 1; g.add(halo);
      this.place(g, b.s, b.y, 0);
      return { ...b, g, charm, halo, taken: false, warned: false };
    });
  }
  collectBond(b) {
    const game = this.game;
    b.taken = true; this.bonds.add(b.kind);
    const MEM = {
      beast: 'Grumbo nudges the charm with his horn. It smells like the den he grew up in. He leans against Kiri and does not move for a long time.',
      frog: 'Boing swallows a firefly, then very carefully does not swallow the charm. She croaks a song that sounds almost like the Lumen motif.',
      bird: 'Sola tucks the charm into Kiri’s scarf, fluffs up, and pretends she found it herself.',
      fish: 'Nuu brings the charm up from the bottom of the sky, spinning with joy. For a moment the whole lake ripples in time with her.',
      oru: 'Oru turns the charm over and over. Its rings slow down, and for the first time it hums a note Kiri can almost understand.',
    };
    game.hud.story(MEM[b.kind], `Bond ${this.bonds.size} / 5`);
    game.audio.play('echo'); game.audio.motif(2, 0.6); this.quietFor = 5;
    game.fx.burst(this.path.world(b.s, b.y + 1, 0), 0xffffff, 40, 6, 0.6, 1.4, 0);
    game.hud.bonds(this.bonds);
    this.celebrate();
  }
  rescueFromFinale() {
    const game = this.game, p = game.player;
    p.vy = 24; p.vs = 0; p.invuln = 1; p.leapReady = true;
    const bird = game.entities.companions.find((c) => c.kind === 'bird');
    if (bird) { bird.hop = 1; this.emote(p.model, '♥', 1.5); }
    game.hud.banner('SOLA!', 'bonded friends don’t let you fall', 2.5); game.camPunch(0.6);
    game.fx.burst(this.path.world(p.s, p.y + 1, 0), 0xff8060, 40, 9, 0.7, 1, -4);
  }
  // ───────────────── emotes & companion personality
  emote(obj, ch, dur = 1.6) {
    let e = this.emotes.find((x) => x.obj === obj);
    if (!e) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.emoteTex[ch], transparent: true, depthTest: false })); sp.renderOrder = 10; sp.scale.setScalar(0.9); this.scene.add(sp); e = { obj, sp }; this.emotes.push(e); }
    e.sp.material.map = this.emoteTex[ch]; e.t = 0; e.dur = dur; e.sp.visible = true;
  }
  celebrate() {
    const c = this.game.player.comp;
    if (c) { c.hop = 1; this.emote(c.model, '♥', 1.8); }
    for (const x of this.game.entities.companions) if (x.state === 'idle' && Math.abs(x.s - this.game.player.s) < 20) { x.hop = 1; this.emote(x.model, '♥', 1.8); }
  }
  // ───────────────── song
  sing() {
    const game = this.game, p = game.player;
    game.audio.play('song'); this.songT = 1.2;
    const c = this.path.world(p.s, p.y + 1, 0), f = this.path.frame(p.s);
    game.fx.ring(c, 0xa0f0ff, 40, 14, 0.7, new THREE.Vector3(f.tx, 0, f.tz), new THREE.Vector3(f.nx, 0, f.nz));
    game.fx.burst(c, 0xfff0c0, 20, 5, 0.6, 1, 2);
    const R = 18;
    const groups = new Set();
    for (const gh of this.ghosts) if (Math.hypot((gh.o.s0 + gh.o.s1) / 2 - p.s, gh.o.y1 - p.y) < R) groups.add(gh.o.ghost);
    for (const gh of this.ghosts) if (groups.has(gh.o.ghost)) { gh.timer = 14; gh.o.active = true; }
    if (groups.size && !game.stats.ghostSeen) { game.stats.ghostSeen = true; game.hud.toast('Ghostwood! It won’t last — climb!', 3); }
    for (const d of this.doors) if (!d.open && Math.abs(d.s - p.s) < 16 && Math.abs(d.y - p.y) < 10) { d.open = true; game.audio.motif(2); game.hud.banner('THE DOOR REMEMBERS', 'a way down that was always there', 3.5); game.shake(0.3); this.emote(p.model, '!', 1.5); }
    for (const b of this.dawn) if (Math.abs(b.s - p.s) < R) b.sung = 1;
    for (const o of game.entities.solids) if (o.crack === 'song' && o.active && Math.abs((o.s0 + o.s1) / 2 - p.s) < 9 && Math.abs((o.y0 + o.y1) / 2 - p.y) < 8) { o.broken = true; game.entities.breakSolid(o); game.hud.toast('The blight melts at the sound of the song.', 2); }
    game.hollowjaw?.onSong(p.s, p.y + 1);
    const cp = p.comp; if (cp) { cp.hop = 1; this.emote(cp.model, '♪', 1.6); }
    for (const x of game.entities.companions) if (x.state === 'idle' && Math.abs(x.s - p.s) < R) { x.hop = 1; this.emote(x.model, '♪', 1.6); }
    // the song soothes nearby critters: snapjaws fall asleep for a moment
    for (const e of game.entities.enemies) if (e.alive && Math.abs(e.s - p.s) < 10 && Math.abs(e.y - p.y) < 6 && e.kind !== 'eel') { e.stun = 3.5; this.emote(e.model, 'z', 3); }
  }
  chainEvent() {
    this.chain++;
    if (this.chain > this.bestChain) this.bestChain = this.chain;
    this.game.hud.chain(this.chain);
    if (this.chain === 6 || this.chain === 12 || this.chain === 20) { this.game.audio.play('checkpoint'); this.game.addGlims(this.chain / 2, this.path.world(this.game.player.s, this.game.player.y + 2, 0)); this.game.hud.toast(this.chain >= 20 ? '<b>SKYBORNE</b>: Kiri forgot the ground exists' : this.chain >= 12 ? '<b>Windsong!</b>' : '<b>Flowing!</b>', 1.5); }
  }
  // per physics step (substeps)
  step(h) {
    this.stepMossback(h);
    const game = this.game, p = game.player;
    if (p.state === 'dead') return;
    // ground contact breaks airborne chains
    if (p.grounded && !p.cart) { this.groundT += h; if (this.groundT > 0.1 && this.chain) { this.chain = 0; game.hud.chain(0); } } else this.groundT = 0;
    // trials
    for (const tr of this.trials) {
      if (this.trialsWon.has(tr.id)) continue;
      const near = (r) => { const dx = Math.max(0, Math.abs(r.s - p.s) - p.hw), dy = Math.max(0, r.y - (p.y + p.h), p.y - r.y); return Math.hypot(dx, dy) < 1.5; };
      if (tr.state === 'idle') { if (near(tr.rings[0]) && !p.mount && !p.grounded) { tr.state = 'on'; tr.t = 0; tr.next = 1; tr.rings[0].hit = true; game.audio.play('glim', 0); game.hud.toast(`Wind Trial: every ring, no ground, ${tr.time}s`, 2); } continue; }
      tr.t += h;
      if (near(tr.rings[tr.next])) { tr.rings[tr.next].hit = true; tr.next++; game.audio.play('glim', tr.next); if (tr.next >= tr.rings.length) this.winTrial(tr); continue; }
      if (this.groundT > 0.1 || tr.t > tr.time || p.mount) { tr.state = 'idle'; tr.rings.forEach((r) => r.hit = false); game.hud.toast('The wind scatters… try again', 1.5); game.audio.play('dismount'); }
    }
    // ghostwood timers
    for (const gh of this.ghosts) if (gh.timer > 0) { gh.timer -= h; if (gh.timer <= 0) gh.o.active = false; }
  }
  winTrial(tr) {
    const game = this.game;
    tr.state = 'won'; this.trialsWon.add(tr.id);
    game.audio.motif(4); game.flash(0.5); this.celebrate();
    game.stats.trialTimes = game.stats.trialTimes || {}; game.stats.trialTimes[tr.id] = tr.t;
    if (tr.reward === 'scarf') { this.cosmetic.scarf = true; game.hud.banner('WIND TRIAL I', 'Kiri’s scarf turns to sunlight', 4); }
    else { this.cosmetic.trail = true; game.hud.banner('WIND TRIAL II', 'stardust follows Kiri now', 4); }
    const last = tr.rings[tr.rings.length - 1];
    const e = this.makeEchoStone({ s: last.s, y: last.y - 0.5, idx: tr.id === 0 ? 3 : 6 });
    e.floating = true; this.echoStones.push(e);
    game.player.applyCosmetics?.();
  }
  reset() {
    const m = this.mb; if (m && m.state !== 'rest') { m.state = 'sleep'; m.cs = m.s; m.cy = m.y; m.standT = 0; m.neck.rotation.z = -1.3; m.eyes.forEach((e) => e.material.emissiveIntensity = 0); }
    for (const tr of this.trials) if (tr.state === 'on') { tr.state = 'idle'; tr.rings.forEach((r) => r.hit = false); }
    this.chain = 0; this.game.hud.chain(0);
    this.seq = null;
  }
  // per frame
  update(dt) {
    this.t += dt;
    const game = this.game, p = game.player, t = this.t;
    this.runSeq(dt);
    if (this.quietFor > 0) this.quietFor -= dt;
    const inHidden = p.y < -100 || p.y > 250;
    game.audio.quiet = this.seq ? 1 : (this.quietFor > 0 ? 0.7 : inHidden ? 0.45 : 0);
    // shrines
    for (const sh of this.shrines) {
      sh.orb.material.emissiveIntensity = sh.done ? 0.6 : 2 + Math.sin(t * 2) * 0.8;
      sh.sig.rotation.z = t * 0.3;
      if (!sh.done && !this.seq && p.state === 'normal' && Math.abs(sh.s - p.s) < 1.8 && Math.abs(sh.y - p.y) < 2.5) this.awakenShrine(sh);
      if (!sh.done && Math.abs(sh.s - p.s) < 30 && Math.random() < dt * 6) game.fx.spawn(this.path.world(sh.s + (Math.random() - 0.5) * 3, sh.y + 0.5, -1.2 + (Math.random() - 0.5) * 2), new THREE.Vector3(0, 1.5, 0), 0xfff0b0, 0.4, 2, 0);
    }
    // waystones
    this.nearWay = null;
    for (const w of this.waystones) {
      const near = Math.abs(w.s - p.s) < 2 && Math.abs(w.y - p.y) < 3;
      if (near && !w.lit) { w.lit = true; w.cap.material.emissive.setHex(0x6fffd8); w.cap.material.emissiveIntensity = 2.5; w.sig.children.forEach((c) => { c.material = c.material.clone(); c.material.emissive.setHex(0x6fffd8); c.material.emissiveIntensity = 2; }); game.audio.play('checkpoint'); game.hud.toast('Waystone awakened. Press <b>↑</b> at any lit waystone to travel.', 3); }
      if (w.lit) { w.cap.rotation.y = t; w.cap.position.y = 3.9 + Math.sin(t * 2) * 0.1; }
      if (near && w.lit) this.nearWay = w;
    }
    game.hud.prompt(this.nearWay && p.state === 'normal' ? '↑ World map' : null, 'way');
    // doors
    for (const d of this.doors) {
      d.swirl.material.uniforms.t.value = t;
      d.k += ((d.open ? 1 : 0) - d.k) * dt * 1.5; d.swirl.material.uniforms.k.value = d.k;
      d.slab.visible = d.k < 0.95; d.slab.scale.setScalar(1 - d.k * 0.9);
      d.sig.rotation.z = t * (0.2 + d.k); d.sig.scale.setScalar(1 + d.k * 0.4);
      d.sig.children.forEach((c) => c.material.emissiveIntensity = 0.4 + d.k * 2.5 + Math.sin(t * 2) * 0.2);
      const dist = Math.abs(d.s - p.s);
      if (!d.open && dist < 25) { d.hum -= dt; if (d.hum < 0) { d.hum = 6; game.audio.motif(1, Math.max(0.15, 1 - dist / 25) * 0.5); } }
      if (d.open && dist < 1.6 && Math.abs(d.y - p.y) < 3 && p.state === 'normal') game.teleport({ ts: d.ts, ty: d.ty, kind: 'starwell' });
    }
    // ghostwood look
    for (const gh of this.ghosts) {
      const on = gh.o.active, blink = gh.timer < 3 && on ? (Math.sin(t * 25) > 0 ? 1 : 0.3) : 1;
      const target = on ? 0.75 * blink : 0.06 + Math.sin(t * 1.5 + gh.o.s0) * 0.03;
      gh.m.material.opacity += (target - gh.m.material.opacity) * Math.min(1, dt * 8);
      gh.m.material.emissiveIntensity = on ? 1.4 : 0.4; gh.edge.material.opacity = on ? 0.9 : 0.15 + Math.sin(t * 1.5 + gh.o.s0) * 0.08;
    }
    // echo stones
    for (const e of this.echoStones) {
      if (e.taken) { e.g.scale.setScalar(Math.max(0.001, e.g.scale.x - dt * 1.2)); continue; }
      e.mote.position.y = 2.6 + Math.sin(t * 2 + e.idx) * 0.2; e.sig.rotation.z = t * 0.5;
      if (e.floating) e.g.position.y += Math.sin(t * 1.5) * 0.004;
      if (Math.abs(e.s - p.s) < 1.3 + p.hw && e.y < p.y + p.h + 0.5 && e.y + 2.2 > p.y) this.collectEcho(e);
    }
    // bond charms
    for (const b of this.bondItems) {
      if (b.taken) { b.g.visible = false; continue; }
      b.charm.rotation.y = t * 1.5; b.charm.rotation.x = t * 0.7; b.halo.lookAt(game.camera.position);
      const near = Math.abs(b.s - p.s) < 1.4 + p.hw && Math.abs(b.y - p.y) < (b.kind === 'oru' ? 3.5 : 2.6);
      if (near && p.mount === b.kind) this.collectBond(b);
      else if (near && !b.warned) { b.warned = true; const nm = { beast: 'Grumbo', frog: 'Boing', bird: 'Sola', fish: 'Nuu', oru: 'Oru' }[b.kind]; game.hud.toast(`This charm hums with ${nm}’s memories. Bring ${nm} here.`, 3); this.emote(p.model, '?', 1.5); }
    }
    // trials look
    for (const tr of this.trials) tr.rings.forEach((r, i) => {
      const won = tr.state === 'won', active = tr.state === 'on' && i === tr.next;
      r.m.material.emissive.setHex(won ? 0xffd070 : r.hit ? 0x60ff90 : i === 0 || active ? 0xfff0a0 : 0x9fe8ff);
      r.m.material.emissiveIntensity = won ? 0.4 : active ? 3 + Math.sin(t * 12) : i === 0 && tr.state === 'idle' ? 2 + Math.sin(t * 3) : 0.8;
      r.g.children[0].rotation.y = t * (active ? 3 : 0.6);
    });
    // critters
    for (const c of this.critters) {
      if (c.st === 'gone') continue;
      if (c.st === 'idle') { c.g.children[0].position.y = 0.22 + Math.abs(Math.sin(t * 6)) * 0.05; if (Math.abs(p.s - c.s) < 9 && Math.abs(p.y - c.y) < 6) { c.st = 'run'; this.emote(c.g, '!', 0.8); } }
      else if (c.st === 'run') {
        c.s += 8 * dt * Math.sign(c.toS - c.s); c.g.children[0].position.y = 0.22 + Math.abs(Math.sin(t * 20)) * 0.3;
        this.path.place(c.g, c.s, c.y); c.g.rotation.y += c.toS < c.s ? Math.PI : 0;
        if (Math.abs(c.s - c.toS) < 0.3) { c.st = 'fade'; game.fx.burst(this.path.world(c.s, c.y + 0.4, 0), 0x80f0ff, 12, 3, 0.4, 0.7, 0); }
      } else if (c.st === 'fade') { c.k -= dt * 2; c.g.scale.setScalar(Math.max(0.001, c.k)); if (c.k <= 0) c.st = 'gone'; }
    }
    // dawnblooms open as Kiri approaches (and glow brighter as the world wakes)
    const aw = this.awaken;
    for (const b of this.dawn) {
      const near = Math.abs(b.s - p.s) < 14 && Math.abs(b.y - p.y) < 14;
      b.open += ((near || b.sung ? 1 : 0) - b.open) * dt * (near ? 1.4 : 0.4);
      b.petals.forEach((pv, i) => pv.children[0].rotation.x = -1.3 + b.open * 1.15 + Math.sin(t * 1.5 + i) * 0.04);
      b.core.material.emissiveIntensity = 0.3 + b.open * (1 + aw * 0.25) + (b.sung ? 1 : 0);
      b.pm.emissiveIntensity = 0.1 + b.open * 0.25 + (b.sung ? 0.3 : 0);
      if (b.open > 0.8 && Math.random() < dt * 0.8 && Math.abs(b.s - p.s) < 30) { const w = new THREE.Vector3(); b.core.getWorldPosition(w); game.fx.spawn(w, new THREE.Vector3((Math.random() - 0.5), 0.8, (Math.random() - 0.5)), 0xfff0c0, 0.35, 3, 0); }
    }
    // world waking: Sunwright faces and gears respond to what Kiri has restored
    const W = game.world;
    if (W.headEyes) for (const e of W.headEyes) e.emissiveIntensity = 0.25 + Math.min(4, aw * 0.45) + Math.sin(t * 1.3) * 0.1;
    W.wake = aw;
    // fragments, starwell, grove
    this.updateFragments();
    const inWell = p.y < -100;
    this.stars.visible = inWell;
    if (inWell) { const wh = this.whale; const near = p.s > 104 + 80; wh.open += ((near ? 1 : 0) - wh.open) * dt * 0.5; wh.eye.material.emissiveIntensity = wh.open * 3; wh.W.position.y = -148 + Math.sin(t * 0.3) * 1.5; wh.dots.children.forEach((d, i) => d.scale.setScalar(0.7 + Math.sin(t * 2 + i) * 0.3)); if (near && !this.whaleSeen) { this.whaleSeen = true; game.hud.banner('THE STARWHALE', 'it dreams the sky above the lake', 4); } }
    if (p.y > 250 && Math.random() < dt * 25) { const cp = game.camera.position; game.fx.spawn(new THREE.Vector3(cp.x + (Math.random() - 0.5) * 40, cp.y + 10, cp.z - 10 + (Math.random() - 0.5) * 20), new THREE.Vector3(Math.random() - 0.3, -1.5, Math.random() - 0.5), Math.random() < 0.5 ? 0xffc0e0 : 0xd0c0ff, 0.35, 8, 0); }
    // firefly swarm in darkness
    const dark = game.currentTheme === 3 || inWell || p.y > 250;
    const c = this.path.world(p.s, p.y + 1, 0);
    for (const f of this.swarm) {
      f.f.visible = dark;
      if (!dark) continue;
      const a = t * f.sp + f.ph;
      f.f.position.set(c.x + Math.cos(a) * f.r, c.y + Math.sin(a * 1.7) * 0.8 + 0.3, c.z + Math.sin(a) * f.r);
    }
    // stardust trail cosmetic
    if (this.cosmetic.trail && Math.abs(p.vs) > 3 && Math.random() < dt * 40) game.fx.spawn(this.path.world(p.s - p.facing * 0.4, p.y + 0.6 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4), new THREE.Vector3(0, 0.5, 0), [0xfff0a0, 0xa0e0ff, 0xffa0e0][Math.floor(Math.random() * 3)], 0.3, 0.8, 0);
    // companions: noticing secrets, reacting to danger, idle life
    this.updateCompanions(dt);
    // Sola rescue: she catches Kiri during a fall in the canopy
    this.checkRescue();
    // emotes follow their owner
    for (const e of this.emotes) {
      if (!e.sp.visible) continue;
      e.t += dt; const w = new THREE.Vector3(); e.obj.getWorldPosition(w);
      const bob = Math.sin(Math.min(1, e.t * 4) * Math.PI) * 0.3;
      e.sp.position.set(w.x, w.y + (e.obj === p.model ? 2.1 : 2.8) + bob, w.z);
      const k = e.t < 0.15 ? e.t / 0.15 : e.t > e.dur - 0.3 ? Math.max(0, (e.dur - e.t) / 0.3) : 1;
      e.sp.scale.setScalar(0.9 * k); if (e.t > e.dur) e.sp.visible = false;
    }
  }
  updateCompanions(dt) {
    const game = this.game, p = game.player, E = game.entities, c = p.comp;
    if (c) {
      for (const n of this.level.notices) {
        if (n.kind !== c.kind || this.noticed.has(n)) continue;
        if (Math.abs(n.s - p.s) < 14 && Math.abs(n.y - p.y) < 14) { this.noticed.add(n); this.emote(c.model, '!', 2.2); game.hud.toast(n.text, 3.5); game.audio.play('notice'); }
      }
      let danger = false;
      for (const e of E.enemies) if (e.alive && (e.s - p.s) * p.facing > -1 && Math.abs(e.s - p.s) < 6 && Math.abs(e.y - p.y) < 4) danger = true;
      c.alert = (c.alert || 0) + ((danger ? 1 : 0) - (c.alert || 0)) * Math.min(1, dt * 6);
      if (danger && !(c.alertCool > 0)) { c.alertCool = 5; this.emote(c.model, c.kind === 'beast' ? '!' : '?', 1.2); }
      c.alertCool = (c.alertCool || 0) - dt;
    }
    for (const x of E.companions) {
      if (x.state !== 'idle') continue;
      x.hop = Math.max(0, (x.hop || 0) - dt * 2);
      const d = Math.abs(x.s - p.s);
      if (d < 6 && !x.greeted) { x.greeted = true; x.hop = 1; this.emote(x.model, '♥', 1.4); }
      if (d > 14) x.greeted = false;
      x.sleepT = (x.sleepT || 0) + dt;
      if (x.sleepT > 12 && d > 8) { x.sleepT = 0; this.emote(x.model, 'z', 2.5); }
    }
  }
  checkRescue() {
    const game = this.game, p = game.player;
    if (!game.stats.met.bird || p.mount || p.cart || p.state !== 'normal') return;
    if (p.s < 262 + 80 || p.s > 560 + 80 || p.y > 7 || p.y < -20 || p.vy > -10) return;
    if (this.rescueCool > game.time) return;
    const bird = game.entities.companions.find((c) => c.kind === 'bird'); if (!bird || bird.state === 'ridden') return;
    this.rescueCool = game.time + 45;
    bird.state = 'idle'; p.mountOn(bird); p.birdTime = 12; p.vy = 22; p.vs = p.facing * 8;
    game.hud.banner('SOLA!', 'she was watching all along', 3); game.camPunch(0.9); game.flash(0.3);
    game.fx.burst(this.path.world(p.s, p.y + 1, 0), 0xff8060, 40, 9, 0.7, 1, -4);
    game.stats.rescues = (game.stats.rescues || 0) + 1;
  }
}
