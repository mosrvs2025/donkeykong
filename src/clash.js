import * as THREE from 'three';
import { moveBody } from './physics.js';
import { makeHero, makeBeast, makeFrog, makeSpikeback, makeBird, makeFish, makeOru } from './models.js';
import { FX } from './fx.js';
import { getTex } from './textures.js';
import { makeHat, SHOP } from './extras.js';

// ═══════════════════════════ SEED CLASH ═══════════════════════════
// A 4-player platform brawler on the Thornwild engine. Route-space bodies (s, y) on a flat stage.
// Heat, not percent: hits fill your lumen meter; more heat = farther knockback. At 100 you are in
// Sunflare: one strong hit sends you flying, but your specials are free. Bond charges by living;
// when full, your next Special becomes your Bond move. Stocks; last one standing wins.
const $ = (id) => document.getElementById(id);
const glowM = (c, i = 2) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i });

export const FIGHTERS = {
  kiri: { name: 'Kiri', role: 'All-rounder', color: 0xffa050, weight: 1, run: 9.5, jump: 14.5, jumps: 2, grav: 40, hw: 0.38, h: 1.3,
    tilt: 'Roll lunge', special: 'Wisp Leap (rising burst)', bond: 'Lumen Song (huge ring)' },
  lumi: { name: 'Lumi', role: 'Float disruptor', color: 0x9fe8ff, weight: 0.65, run: 8.5, jump: 9, jumps: 6, grav: 16, hw: 0.35, h: 0.8,
    tilt: 'Lumen bolt (shot)', special: 'Pulse (push ring)', bond: 'Starfall (bolt storm)' },
  grumbo: { name: 'Grumbo', role: 'Heavy', color: 0xc08a5a, weight: 1.75, run: 8.6, jump: 13, jumps: 2, grav: 44, hw: 0.8, h: 1.8, scale: 0.8,
    tilt: 'Horn jab', special: 'Charge (armored)', bond: 'Horn Comet' },
  boing: { name: 'Boing', role: 'Vertical', color: 0x6ad66a, weight: 0.85, run: 9, jump: 19, jumps: 2, grav: 42, hw: 0.55, h: 1.4, scale: 0.72,
    tilt: 'Tongue lash (long)', special: 'Spring / Ground-pound', bond: 'Quake' },
  pip: { name: 'Pip', role: 'Glider', color: 0x9fc0ff, weight: 0.7, run: 10.5, jump: 14, jumps: 2, grav: 38, hw: 0.34, h: 1.15, glide: -3,
    tilt: 'Acorn sling (shot)', special: 'Swoop strike', bond: 'Acorn barrage' },
  brom: { name: 'Brom', role: 'Bruiser', color: 0xffc860, weight: 1.45, run: 8.4, jump: 13.5, jumps: 2, grav: 44, hw: 0.45, h: 1.45,
    tilt: 'Shovel launcher', special: 'Burrow & erupt', bond: 'Cave-in' },
  sola: { name: 'Sola', role: 'Air fighter', color: 0xffb040, weight: 0.7, run: 8, jump: 11, jumps: 5, grav: 26, hw: 0.7, h: 1.5, scale: 0.7, glide: -2.4,
    tilt: 'Peck dive', special: 'Gust (big push)', bond: 'Sunflare dive' },
  nuu: { name: 'Nuu', role: 'Rushdown', color: 0x40c8e0, weight: 0.9, run: 11.5, jump: 13, jumps: 2, grav: 42, hw: 0.65, h: 1.1, scale: 0.6, slick: true,
    tilt: 'Tail slap (fast)', special: 'Torpedo (↑ to aim up)', bond: 'Riptide waves' },
  oru: { name: 'Oru', role: 'Weird / glass', color: 0xb080ff, weight: 0.72, run: 8.5, jump: 12, jumps: 3, grav: 24, hw: 0.65, h: 1.5, scale: 0.62,
    tilt: 'Hum pulse', special: 'Gravity bubble (lifts foes)', bond: 'Gravity well' },
  pim: { name: 'Pim', role: 'Trickster', color: 0xc8a0ff, weight: 0.85, run: 9, jump: 14, jumps: 2, grav: 40, hw: 0.38, h: 1.3,
    tilt: 'Toss stall goods', special: 'Pull from the pack', bond: 'Grand sale' },
};
const ORDER = ['kiri', 'lumi', 'grumbo', 'boing', 'pip', 'brom', 'sola', 'nuu', 'oru', 'pim'];
const PCOL = [0xff6a5a, 0x5aa8ff, 0xffd04a, 0x6ae07a];
const STAGE = { half: 15, blast: { s: 27, lo: -15, hi: 34 } };

function lumiModel() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xbff4ff, emissiveIntensity: 2.5 })); core.position.y = 0.45; body.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), new THREE.MeshBasicMaterial({ color: 0x8fe0ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })); halo.position.y = 0.45; body.add(halo);
  for (const z of [0.12, -0.12]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 4), new THREE.MeshBasicMaterial({ color: 0x103040 })); e.position.set(0.28, 0.52, z); body.add(e); }
  const wings = [1, -1].map((z) => { const w = new THREE.Mesh(new THREE.CircleGeometry(0.38, 12), new THREE.MeshBasicMaterial({ color: 0xcff8ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })); w.position.set(-0.1, 0.55, 0.3 * z); w.rotation.x = Math.PI / 2; body.add(w); return w; });
  g.userData = { body, wings, legs: [] };
  return g;
}
function makeModel(kind) {
  const mk = { kiri: () => makeHero('kiri'), pip: () => makeHero('pip'), brom: () => makeHero('brom'), pim: () => makeHero('pim'), grumbo: makeBeast, boing: makeFrog, sola: makeBird, nuu: makeFish, oru: makeOru, lumi: lumiModel };
  const m = mk[kind]();
  const sc = FIGHTERS[kind].scale; if (sc) m.scale.setScalar(sc);
  m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return m;
}

export class Clash {
  constructor(game) {
    this.game = game; this.active = false;
    this.slots = [{ type: 'human', kind: 'kiri' }, { type: 'cpu', kind: 'grumbo' }, { type: 'cpu', kind: 'lumi' }, { type: 'off', kind: 'boing' }];
    this.stocks = 3; this.keys = new Set(); this.prev = [{}, {}, {}, {}];
    addEventListener('keydown', (e) => { if (!this.active) return; this.keys.add(e.code); if ((e.code === 'KeyP' || e.code === 'Escape') && this.phase === 'fight') this.togglePause(); });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    this.buildScene();
    this.buildUI();
  }
  // ───────────────────────── stage
  buildScene() {
    const S = (this.scene = new THREE.Scene());
    this.camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 600);
    const cv = document.createElement('canvas'); cv.width = 2; cv.height = 256; const x = cv.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#2a6ab0'); gr.addColorStop(0.6, '#9fd0c0'); gr.addColorStop(1, '#ffe2b0'); x.fillStyle = gr; x.fillRect(0, 0, 2, 256);
    const bg = new THREE.CanvasTexture(cv); bg.colorSpace = THREE.SRGBColorSpace; S.background = bg;
    S.fog = new THREE.Fog(0xb0d8c8, 40, 140);
    S.add(new THREE.HemisphereLight(0xdff0ff, 0x3a5a2a, 1.3));
    const sun = new THREE.DirectionalLight(0xfff0d0, 2.6); sun.position.set(-12, 30, 18); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -20 }); sun.shadow.radius = 3; S.add(sun);
    this.fx = new FX(S, 900);
    // solids (route space == world x)
    this.solids = [
      { s0: -STAGE.half, s1: STAGE.half, y0: -7, y1: 0, active: true },
      { s0: -11, s1: -5, y0: 4, y1: 4.5, active: true, oneway: true },
      { s0: 5, s1: 11, y0: 4, y1: 4.5, active: true, oneway: true },
      { s0: -3, s1: 3, y0: 8.5, y1: 9, active: true, oneway: true },
    ];
    const tex = (n, rx, ry) => { const t = getTex(n).clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.needsUpdate = true; return t; };
    const grass = new THREE.MeshStandardMaterial({ map: tex('grass', 8, 2), roughness: 0.95 }), dirt = new THREE.MeshStandardMaterial({ map: tex('dirt', 8, 2), roughness: 1 });
    const main = new THREE.Mesh(new THREE.BoxGeometry(30, 7, 7), [dirt, dirt, grass, dirt, dirt, dirt]); main.position.set(0, -3.5, 0); main.receiveShadow = true; main.castShadow = true; S.add(main);
    // a root-tangle underside so the island floats
    const roots = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 1, flatShading: true });
    const under = new THREE.Mesh(new THREE.ConeGeometry(14, 12, 9), roots); under.rotation.x = Math.PI; under.position.y = -13; under.scale.z = 0.35; S.add(under);
    const leaf = new THREE.MeshStandardMaterial({ map: tex('leaf', 3, 1), color: 0x9adf7a, roughness: 0.8 });
    for (const o of this.solids.slice(1)) { const p = new THREE.Mesh(new THREE.BoxGeometry(o.s1 - o.s0, 0.5, 3), leaf); p.position.set((o.s0 + o.s1) / 2, o.y1 - 0.25, 0); p.castShadow = p.receiveShadow = true; S.add(p);
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 10, 6), roots); br.position.set((o.s0 + o.s1) / 2, o.y1 - 5, -1.6); S.add(br); }
    // background jungle
    const trunk = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 }), crown = new THREE.MeshStandardMaterial({ color: 0x3f8a3a, roughness: 0.9, flatShading: true });
    for (let i = 0; i < 26; i++) {
      const z = -14 - (i % 3) * 10 - Math.random() * 6, xx = -60 + i * 4.8 + Math.random() * 3, h = 12 + Math.random() * 18;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1, h, 7), trunk); t.position.set(xx, h / 2 - 12, z); S.add(t);
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + Math.random() * 3, 0), crown); c.position.set(xx, h - 10, z); c.scale.y = 0.7; S.add(c);
    }
    const far = new THREE.Mesh(new THREE.PlaneGeometry(400, 60), new THREE.MeshBasicMaterial({ color: 0x5f9a7a })); far.position.set(0, -20, -60); S.add(far);
    // the Bramble King (stage hazard)
    const k = (this.king = new THREE.Group()); const km = makeSpikeback(); km.scale.setScalar(2.2); k.add(km);
    const crownM = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.5, 6, 1, true), glowM(0xffd040, 1.5)); crownM.position.set(1.1, 2.6, 0); k.add(crownM);
    k.visible = false; k.traverse((o) => { if (o.isMesh) o.castShadow = true; }); S.add(k);
    this.warn = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: this.textTex('!', '#ff4040'), transparent: true, depthWrite: false })); this.warn.visible = false; S.add(this.warn);
    this.dyn = new THREE.Group(); S.add(this.dyn);
  }
  textTex(t, col) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.font = '900 110px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 14; x.strokeStyle = '#000'; x.strokeText(t, 64, 70); x.fillStyle = col; x.fillText(t, 64, 70); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; }
  // ───────────────────────── UI
  buildUI() {
    const el = (this.ui = document.createElement('div')); el.id = 'clash'; el.className = 'hidden'; document.body.appendChild(el);
    el.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('[data-c]'); if (!b) return; e.preventDefault(); const [act, i] = b.dataset.c.split(':'); const s = this.slots[+i];
      if (act === 'type') { const ts = +i === 0 ? ['human'] : ['human', 'cpu', 'off']; s.type = ts[(ts.indexOf(s.type) + 1) % ts.length]; }
      if (act === 'prev' || act === 'next') { const d = act === 'next' ? 1 : -1; s.kind = ORDER[(ORDER.indexOf(s.kind) + d + ORDER.length) % ORDER.length]; }
      if (act === 'stocks') this.stocks = this.stocks % 5 + 1 || 1;
      if (act === 'go') return this.begin();
      if (act === 'quit') return this.close();
      if (act === 'again') return this.begin();
      if (act === 'setup') return this.setup();
      if (act === 'resume') return this.togglePause();
      this.game.audio.play('notice'); this.renderSetup();
    });
  }
  ctrlHint(i) { const t = this.game.input.isTouch; return i === 0 ? (t ? 'touch / pad 1' : 'WASD · Space · Shift · F') : i === 1 ? 'IJKL · O · U · P / pad 2' : `pad ${i + 1}`; }
  renderSetup() {
    const cards = this.slots.map((s, i) => { const F = FIGHTERS[s.kind], off = s.type === 'off';
      return `<div class="cs-card ${off ? 'off' : ''}" style="--pc:#${PCOL[i].toString(16).padStart(6, '0')}">
        <div class="cs-top"><b>P${i + 1}</b><button class="small ${s.type === 'cpu' ? 'ghost' : ''}" data-c="type:${i}">${s.type === 'human' ? 'Player' : s.type === 'cpu' ? 'CPU' : 'Off'}</button></div>
        ${off ? '<div class="cs-empty">tap to add</div>' : `<div class="cs-pick"><button class="small ghost" data-c="prev:${i}">◀</button><div class="cs-name"><span style="color:#${F.color.toString(16).padStart(6, '0')}">${F.name}</span><small>${F.role}</small></div><button class="small ghost" data-c="next:${i}">▶</button></div>
        <ul><li><i>Attack</i> ${F.tilt}</li><li><i>Special</i> ${F.special}</li><li><i>Bond</i> ${F.bond}</li></ul>`}
        <small class="cs-ctl">${s.type === 'human' ? this.ctrlHint(i) : s.type === 'cpu' ? 'computer' : ''}</small></div>`; }).join('');
    this.ui.innerHTML = `<div class="cs-setup"><div class="cs-kicker">thornwild</div><h1>SEED CLASH</h1>
      <p class="cs-sub">Rootwild Thicket · watch for the Bramble King</p>
      <div class="cs-cards">${cards}</div>
      <div class="cs-row"><button class="ghost small" data-c="stocks:0">Stocks: ${this.stocks}</button><button data-c="go:0">Fight! ▸</button><button class="ghost small" data-c="quit:0">Back</button></div>
      <p class="cs-help">Attack · Special · Jump (double-jump in the air) · ↓ drops through leaves. Heat fills when you're hit: hotter flies farther. At 100 you're in <b>Sunflare</b>: one big hit and you're gone, but specials are free. Bond charges while you live; when it glows, your next Special is your Bond move.</p></div>`;
  }
  open() {
    const g = this.game; g.audio.init?.(); g.audio.resume?.();
    $('title').classList.add('hidden'); this.prevState = g.state; g.state = 'clash'; this.active = true;
    const rp = g.composer.passes[0]; this.saved = { scene: rp.scene, camera: rp.camera, ao: g.gfx.gtao.enabled }; rp.scene = this.scene; rp.camera = this.camera; g.gfx.gtao.enabled = false;
    this.ui.classList.remove('hidden'); document.body.classList.add('inclash'); this.phase = 'setup'; this.setup();
    this.onResize();
  }
  setup() { this.phase = 'setup'; this.clearMatch(); this.renderSetup(); $('touch').classList.add('hidden'); document.body.classList.remove('clashing'); }
  close() {
    const g = this.game; this.clearMatch(); this.active = false; this.ui.classList.add('hidden'); document.body.classList.remove('clashing', 'inclash');
    const rp = g.composer.passes[0]; rp.scene = this.saved.scene; rp.camera = this.saved.camera; g.gfx.gtao.enabled = this.saved.ao;
    $('touch').classList.add('hidden'); g.state = 'title'; $('title').classList.remove('hidden'); g.audio.intensity = 0.2;
  }
  onResize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }
  clearMatch() { for (const f of this.fighters || []) this.scene.remove(f.model, f.tag); this.fighters = []; for (const p of this.shots || []) this.dyn.remove(p.m); this.shots = []; for (const it of this.items || []) this.dyn.remove(it.m); this.items = []; this.king.visible = false; this.warn.visible = false; }
  // ───────────────────────── match
  begin() {
    this.clearMatch();
    const spawns = [-9, 9, -3.5, 3.5];
    this.fighters = this.slots.map((s, i) => s.type === 'off' ? null : this.makeFighter(i, s, spawns[i])).filter(Boolean);
    if (this.fighters.length < 2) { this.slots[1].type = 'cpu'; return this.begin(); }
    this.phase = 'count'; this.countT = 3.2; this.t = 0; this.itemT = 7; this.kingT = 14; this.kingState = 'idle'; this.hitstop = 0; this.shake = 0;
    this.ui.innerHTML = `<div class="cs-hud">${this.fighters.map((f) => `<div class="cs-p" id="csp${f.i}" style="--pc:#${PCOL[f.i].toString(16).padStart(6, '0')}"><b>P${f.i + 1} ${f.F.name}</b><div class="cs-heat"><span>0</span></div><div class="cs-bar"><i></i></div><div class="cs-st"></div></div>`).join('')}</div><div class="cs-big" id="cs-big"></div><button class="cs-pause small ghost" data-c="resume:0">❚❚</button>`;
    if (this.game.input.isTouch && this.slots[0].type === 'human') { $('touch').classList.remove('hidden'); document.body.classList.add('clashing'); }
    this.game.audio.intensity = 1; this.game.audio.play('rumble');
    this.snapCam = true;
  }
  makeFighter(i, slot, s) {
    const F = FIGHTERS[slot.kind], model = makeModel(slot.kind);
    if (i === 0 && slot.type === 'human' && ['kiri', 'pip', 'brom', 'pim'].includes(slot.kind)) { // P1 wears their wardrobe outfit
      const P = this.game.progress, sc = SHOP.find((x) => x.id === P.scarf);
      if (P.hat && model.userData.head) { const hn = makeHat(P.hat); hn.rotation.z = -0.1; model.userData.head.add(hn); }
      if (sc) model.traverse((o) => { if (o.isMesh && o.userData.scarf) { o.material = o.material.clone(); o.material.color.setHex(sc.color); } });
    }
    this.scene.add(model);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: this.textTex('P' + (i + 1), '#' + PCOL[i].toString(16).padStart(6, '0')), transparent: true, depthWrite: false }));
    this.scene.add(tag);
    return { i, kind: slot.kind, cpu: slot.type === 'cpu', F, model, tag, s, y: 0.01, vs: 0, vy: 0, hw: F.hw, h: F.h, g: 1, grounded: false, ground: null, dropThrough: 0,
      facing: s < 0 ? 1 : -1, jumpsLeft: F.jumps, heat: 0, bond: 0, stocks: this.stocks, stun: 0, invuln: 2, atkT: 0, atkCd: 0, spCd: 0, act: null, actT: 0, armor: false,
      dead: false, outT: 0, bubble: false, ember: 0, hitList: new Set(), anim: 0, ai: { t: 0, wantJump: false } };
  }
  // ───────────────────────── input
  readInput(f) {
    const i = f.i, K = this.keys, pads = (navigator.getGamepads ? [...navigator.getGamepads()] : []).filter(Boolean);
    let x = 0, up = false, down = false, jump = false, atk = false, sp = false;
    if (f.cpu) return this.ai(f);
    if (i === 0) {
      const I = this.game.input, T = I.touch;
      x = (K.has('ArrowRight') || K.has('KeyD') ? 1 : 0) - (K.has('ArrowLeft') || K.has('KeyA') ? 1 : 0);
      if (!x && I.stick.on) x = Math.abs(I.stick.x) > 0.25 ? I.stick.x : 0; else if (!x) x = (T.right ? 1 : 0) - (T.left ? 1 : 0);
      up = K.has('ArrowUp') || K.has('KeyW') || T.up; down = K.has('ArrowDown') || K.has('KeyS') || T.down;
      jump = K.has('Space') || K.has('KeyZ') || T.jump; atk = K.has('ShiftLeft') || K.has('KeyX') || T.action; sp = K.has('KeyF') || K.has('KeyE') || K.has('KeyC') || T.dash;
    } else if (i === 1) {
      x = (K.has('KeyL') ? 1 : 0) - (K.has('KeyJ') ? 1 : 0); up = K.has('KeyI'); down = K.has('KeyK'); jump = K.has('KeyO'); atk = K.has('KeyU'); sp = K.has('KeyP') || K.has('KeyH');
    }
    const g = pads[i];
    if (g) { const ax = g.axes[0] || 0, ay = g.axes[1] || 0, b = (n) => !!(g.buttons[n] && g.buttons[n].pressed);
      if (Math.abs(ax) > 0.25) x = ax; if (b(14)) x = -1; if (b(15)) x = 1;
      up = up || ay < -0.6 || b(12); down = down || ay > 0.6 || b(13); jump = jump || b(0); atk = atk || b(2) || b(1); sp = sp || b(3) || b(5) || b(4); }
    const P = this.prev[i], out = { x, up, down, jump, atk, sp, jumpP: jump && !P.jump, atkP: atk && !P.atk, spP: sp && !P.sp, downP: down && !P.down };
    this.prev[i] = { jump, atk, sp, down }; return out;
  }
  ai(f) {
    const A = f.ai, alive = this.fighters.filter((o) => o !== f && !o.dead);
    A.t -= this.dt; let x = 0, jumpP = false, atkP = false, spP = false, down = false;
    const offstage = Math.abs(f.s) > STAGE.half - 0.5 || f.y < -1;
    if (offstage) { // recover toward the island
      x = -Math.sign(f.s) || 1; if (f.vy < 1 && f.y < 3) { if (f.jumpsLeft > 0) jumpP = Math.random() < 0.25; else if (f.spCd <= 0 && ['kiri', 'boing', 'pip', 'nuu'].includes(f.kind)) spP = true; }
      return { x, jumpP, atkP, spP, down, downP: false, up: true };
    }
    let tgt = null, best = 1e9; for (const o of alive) { const d = Math.hypot(o.s - f.s, o.y - f.y); if (d < best) { best = d; tgt = o; } }
    if (this.kingState === 'charge' && f.grounded && f.y < 1) return { x: 0, jumpP: true, atkP: false, spP: false, down: false, downP: false };
    if (tgt) {
      const dx = tgt.s - f.s, dy = tgt.y - f.y, reach = f.kind === 'boing' ? 3 : f.kind === 'lumi' ? 7 : 1.7;
      if (Math.abs(dx) > reach * 0.8) x = Math.sign(dx);
      if (dy > 2.5 && f.grounded && Math.random() < 0.06) jumpP = true;
      if (dy < -2 && f.grounded && f.ground?.oneway) down = true;
      if (Math.abs(dx) < reach && Math.abs(dy) < 1.8 && A.t <= 0) { A.t = 0.35 + Math.random() * 0.5; f.facing = Math.sign(dx) || f.facing; const room = !['grumbo', 'brom', 'pip'].includes(f.kind) || Math.abs(f.s + f.facing * 10) < STAGE.half; if (Math.random() < 0.72 || !room) atkP = true; else spP = true; }
      if (f.bond >= 100 && best < 5) spP = true;
      if (Math.abs(tgt.s) > STAGE.half - 1 && Math.sign(tgt.s) === x) x = 0; // don't chase off the edge
      if (Math.abs(f.s + x * 1.5) > STAGE.half - 1.2) x = 0; // don't run off
    }
    if (Math.random() < 0.004) jumpP = true;
    return { x, jumpP, atkP, spP, down, downP: down, up: false };
  }
  // ───────────────────────── combat
  hit(att, vic, dmg, kb, ang, dir) {
    if (!vic || vic.dead || vic.invuln > 0 || vic === att) return false;
    const g = this.game, pos = new THREE.Vector3(vic.s, vic.y + vic.h / 2, 0);
    if (vic.bubble) { vic.bubble = false; vic.invuln = 0.6; this.fx.burst(pos, 0xc8b0ff, 24, 7, 0.6, 0.6, 0); g.audio.play('splash'); return true; }
    const sunflare = vic.heat >= 100;
    vic.heat = Math.min(100, vic.heat + dmg); vic.bond = Math.min(100, vic.bond + dmg * 0.5); vic.lastHit = att;
    let mag = kb * 0.72 * (1 + vic.heat / 38) / Math.sqrt(vic.F.weight); if (sunflare) mag *= 2.4;
    const a = ang * Math.PI / 180;
    if (vic.armor) { mag *= 0.15; }
    vic.vs = Math.cos(a) * mag * dir; vic.vy = Math.sin(a) * mag; vic.grounded = false; vic.ground = null;
    vic.stun = vic.armor ? 0 : Math.min(1.4, mag * 0.03); if (!vic.armor) { vic.act = null; vic.actT = 0; }
    this.hitstop = Math.min(0.12, 0.03 + mag * 0.003); this.shake = Math.min(1, mag * 0.025);
    this.fx.burst(pos, sunflare ? 0xffe060 : 0xfff0c0, 10 + Math.round(mag), 6 + mag * 0.2, 0.6, 0.5, -4);
    g.audio.play(mag > 22 ? 'smash' : 'stomp', 2);
    if (sunflare && mag > 18) { this.big('SUNFLARE!', 0.8); }
    return true;
  }
  boxHit(att, s0, s1, y0, y1, dmg, kb, ang, dir) {
    let any = false;
    for (const o of this.fighters) { if (o === att || o.dead || att.hitList.has(o)) continue;
      if (o.s + o.hw > s0 && o.s - o.hw < s1 && o.y + o.h > y0 && o.y < y1) { if (this.hit(att, o, dmg, kb, ang, dir)) { att.hitList.add(o); any = true; } } }
    return any;
  }
  shoot(f, vs, vy, opt) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(opt.r || 0.25, 0), glowM(opt.col || 0xbff4ff, 3)); this.dyn.add(m);
    this.shots.push({ owner: f, s: f.s + f.facing * 0.6, y: f.y + f.h * 0.6, vs, vy, m, t: 0, life: opt.life || 1.2, grav: opt.grav || 0, dmg: opt.dmg || 5, kb: opt.kb || 6, ang: opt.ang ?? 30, r: opt.r || 0.25, col: opt.col || 0xbff4ff, kind: opt.kind, pierce: opt.pierce, hit: new Set(), bounce: opt.bounce, s0: opt.s0, y0: opt.y0 });
    const P = this.shots[this.shots.length - 1]; if (opt.s0 !== undefined) P.s = opt.s0; if (opt.y0 !== undefined) P.y = opt.y0; return P;
  }
  toss(f, kind) {
    kind ||= ['bomb', 'peel', 'rang'][Math.floor(Math.random() * 3)];
    if (kind === 'bomb') this.shoot(f, f.facing * 10, 9, { kind, grav: -30, dmg: 10, kb: 13, ang: 55, col: 0xff5040, r: 0.32, life: 2.5 });
    if (kind === 'peel') this.shoot(f, f.facing * 7, 7, { kind, grav: -30, dmg: 4, kb: 5, col: 0xffe040, r: 0.25, life: 2.5 });
    if (kind === 'rang') this.shoot(f, f.facing * 17, 0, { kind, dmg: 6, kb: 8, ang: 35, col: 0xc8a0ff, r: 0.3, life: 1.3, pierce: true });
  }
  spawnItem(kind, s, y) {
    const col = { ember: 0xff7a30, bubble: 0xb8a0ff, coin: 0xffd040 }[kind];
    const m = new THREE.Group(); const core = new THREE.Mesh(kind === 'coin' ? new THREE.CylinderGeometry(0.4, 0.4, 0.1, 20) : new THREE.SphereGeometry(0.35, 14, 10), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.4, metalness: kind === 'coin' ? 0.6 : 0 })); if (kind === 'coin') core.rotation.x = Math.PI / 2; m.add(core); this.dyn.add(m);
    this.items.push({ kind, m, s, y, t: 0 }); this.fx.burst(new THREE.Vector3(s, y, 0), col, 20, 5, 0.5, 0.6, 0);
  }
  attack(f) {
    const F = f.kind; f.hitList.clear(); f.atkCd = 0.38; this.game.audio.play('roll');
    if (f.ember > 0) { this.shoot(f, f.facing * 13, 6, { grav: -30, dmg: 6, kb: 8, col: 0xff8030, r: 0.28, life: 1.6 }); f.atkCd = 0.3; return; }
    if (F === 'kiri') { f.act = 'roll'; f.actT = 0.24; f.vs = f.facing * 15; }
    else if (F === 'grumbo') { f.act = 'horn'; f.actT = 0.3; f.atkCd = 0.55; }
    else if (F === 'boing') { f.act = 'tongue'; f.actT = 0.25; f.atkCd = 0.45; this.game.audio.play('tongue'); }
    else if (F === 'pip') { this.shoot(f, f.facing * 20, 2, { grav: -8, dmg: 4, kb: 6, ang: 30, col: 0xc8a070, r: 0.2, life: 0.6 }); f.atkCd = 0.3; this.game.audio.play('tongue'); }
    else if (F === 'brom') { f.act = 'shovel'; f.actT = 0.3; f.atkCd = 0.5; }
    else if (F === 'sola') { f.act = 'peck'; f.actT = 0.22; f.vs = f.facing * 13; if (!f.grounded) f.vy = -4; }
    else if (F === 'nuu') { f.act = 'slap'; f.actT = 0.16; f.atkCd = 0.24; }
    else if (F === 'oru') { f.act = 'hum'; f.actT = 0.25; f.atkCd = 0.45; this.fx.ring(new THREE.Vector3(f.s, f.y + f.h / 2, 0), 0xb080ff, 16, 5, 0.4, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)); }
    else if (F === 'pim') { this.toss(f); f.atkCd = 0.5; }
    else { this.shoot(f, f.facing * 18, 0, { dmg: 4, kb: 5, ang: 25, life: 0.6 }); f.atkCd = 0.32; }
  }
  special(f) {
    const free = f.heat >= 100, bond = f.bond >= 100;
    if (!bond && !free && f.spCd > 0) return;
    f.hitList.clear(); const g = this.game, pos = new THREE.Vector3(f.s, f.y + f.h / 2, 0);
    if (bond) { f.bond = 0; this.bondMove(f); return; }
    const F = f.kind;
    if (F === 'kiri') { f.vy = 17; f.act = 'leap'; f.actT = 0.35; f.spCd = 1.2; f.jumpsLeft = Math.max(f.jumpsLeft, 1); g.audio.play('leap'); this.fx.ring(pos, 0xbff4ff, 20, 6, 0.45, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)); }
    else if (F === 'grumbo') { f.act = 'charge'; f.actT = 0.7; f.armor = true; f.spCd = 2; g.audio.play('roll'); this.shake = 0.3; }
    else if (F === 'boing') { if (f.grounded) { f.vy = 24; f.spCd = 1; g.audio.play('bigjump'); } else { f.act = 'pound'; f.actT = 1.5; f.vy = -30; f.vs *= 0.2; f.spCd = 1.3; g.audio.play('flap'); } }
    else if (F === 'pip') { f.act = 'swoop'; f.actT = 0.4; f.spCd = 1; f.vy = Math.max(f.vy, 3); g.audio.play('flap'); }
    else if (F === 'brom') { if (f.grounded) { f.act = 'burrow'; f.actT = 0.65; f.spCd = 2.2; g.audio.play('crumble'); } else { f.act = 'pound'; f.actT = 1.5; f.vy = -30; f.vs *= 0.2; f.spCd = 1.3; } }
    else if (F === 'sola') { this.shoot(f, f.facing * 15, 0, { kind: 'gust', dmg: 3, kb: 15, ang: 18, col: 0xfff4d0, r: 0.6, life: 0.8, pierce: true }); f.spCd = 1.3; g.audio.play('flap'); }
    else if (F === 'nuu') { const upT = this.lastUp?.[f.i]; f.act = 'torpedo'; f.actT = 0.42; f.spCd = 1.2; f.torpUp = !!upT; if (upT) { f.vy = 21; } g.audio.play('splash'); }
    else if (F === 'oru') { f.spCd = 2; g.audio.play('flip'); this.fx.ring(pos, 0xb080ff, 30, 10, 0.5, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)); for (const o of this.fighters) if (o !== f && !o.dead && Math.hypot(o.s - f.s, o.y - f.y) < 3.6 && o.invuln <= 0) { this.hit(f, o, 4, 2, 90, 1); o.gflip = 1.3; } }
    else if (F === 'pim') { this.spawnItem(['ember', 'bubble', 'coin'][Math.floor(Math.random() * 3)], f.s + f.facing * 1.2, f.y + 0.6); f.spCd = 5; g.audio.play('shard'); }
    else { f.spCd = 1.4; g.audio.play('leap'); this.fx.ring(pos, 0xbff4ff, 26, 9, 0.5, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)); for (const o of this.fighters) if (o !== f && !o.dead && Math.hypot(o.s - f.s, o.y + o.h / 2 - f.y - f.h / 2) < 3.2) this.hit(f, o, 6, 13, 55, Math.sign(o.s - f.s) || 1); }
    if (free) f.spCd = 0;
  }
  bondMove(f) {
    const g = this.game, pos = new THREE.Vector3(f.s, f.y + f.h / 2, 0); g.audio.play('win'); this.big(`${f.F.name.toUpperCase()} · ${f.F.bond.split(' (')[0].toUpperCase()}`, 1.1);
    this.fx.burst(pos, f.F.color, 60, 10, 0.8, 1, 0); this.shake = 0.6; f.invuln = Math.max(f.invuln, 0.4);
    if (f.kind === 'kiri') { this.fx.ring(pos, 0xffe8a0, 40, 14, 0.6, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)); for (const o of this.fighters) if (o !== f && !o.dead && Math.hypot(o.s - f.s, o.y - f.y) < 6) this.hit(f, o, 16, 18, 60, Math.sign(o.s - f.s) || 1); }
    else if (f.kind === 'grumbo') { f.act = 'comet'; f.actT = 0.9; f.armor = true; f.vy = 6; }
    else if (f.kind === 'boing') { f.vy = -30; f.act = 'quake'; f.actT = 1.5; }
    else if (f.kind === 'pip') { for (let k = 0; k < 12; k++) { const a = (k / 11 - 0.5) * 1.6 + (f.facing > 0 ? 0 : Math.PI); this.shoot(f, Math.cos(a) * 18, Math.sin(a) * 18 + 3, { grav: -10, dmg: 6, kb: 9, ang: 40, col: 0xc8a070, r: 0.22, life: 1 }); } }
    else if (f.kind === 'brom') { for (let k = 0; k < 9; k++) this.shoot(f, 0, -2, { s0: -13 + k * 3.2 + Math.random(), y0: 26 + Math.random() * 8, grav: -30, dmg: 12, kb: 14, ang: 70, col: 0x9a8070, r: 0.6, life: 2.4 }); }
    else if (f.kind === 'sola') { f.act = 'dive'; f.actT = 1.6; f.vy = 24; f.armor = true; }
    else if (f.kind === 'nuu') { for (const d of [1, -1]) this.shoot(f, d * 16, 0, { kind: 'wave', s0: f.s, y0: Math.max(0.6, f.y + 0.6), dmg: 12, kb: 16, ang: 60, col: 0x60e0ff, r: 1, life: 1.5, pierce: true }); }
    else if (f.kind === 'oru') { f.act = 'well'; f.actT = 1.1; f.armor = true; }
    else if (f.kind === 'pim') { for (let k = 0; k < 8; k++) { const P = this.shoot(f, (Math.random() - 0.5) * 4, -2, { kind: 'bomb', s0: -12 + Math.random() * 24, y0: 24 + Math.random() * 6, grav: -26, dmg: 10, kb: 13, ang: 55, col: 0xff5040, r: 0.32, life: 3 }); } }
    else { for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; this.shoot(f, Math.cos(a) * 14, Math.sin(a) * 14, { dmg: 7, kb: 11, ang: 50, life: 1.1, col: 0xfff0a0, r: 0.3 }); } }
  }
  ko(f) {
    this.kos = (this.kos || 0) + 1; if (!f.lastHit && f.heat < 1) this.selfKos = (this.selfKos || 0) + 1;
    const g = this.game, s = Math.max(-STAGE.blast.s + 2, Math.min(STAGE.blast.s - 2, f.s)), y = Math.max(STAGE.blast.lo + 2, Math.min(STAGE.blast.hi - 2, f.y));
    this.fx.burst(new THREE.Vector3(s, y, 0), PCOL[f.i], 80, 16, 1, 1.2, 0); g.audio.play('smash'); this.shake = 0.8;
    f.stocks--; f.dead = true; f.outT = f.stocks > 0 ? 1.4 : 0; f.model.visible = false; f.tag.visible = false;
    this.big(f.stocks > 0 ? `P${f.i + 1} OUT` : `P${f.i + 1} ELIMINATED`, 0.9);
    const left = this.fighters.filter((o) => o.stocks > 0);
    if (left.length <= 1) { this.phase = 'over'; this.overT = 1.6; this.winner = left[0]; }
  }
  respawn(f) { Object.assign(f, { lastHit: null, dead: false, s: 0, y: 12.5, vs: 0, vy: 0, heat: 0, stun: 0, invuln: 2.2, act: null, armor: false, jumpsLeft: f.F.jumps, bubble: false, ember: 0, gflip: 0, hide: false }); f.model.visible = true; f.tag.visible = true; this.fx.burst(new THREE.Vector3(0, 13, 0), PCOL[f.i], 30, 6, 0.6, 0.8, 0); }
  big(txt, t) { const b = $('cs-big'); if (!b) return; b.textContent = txt; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); clearTimeout(this._bt); this._bt = setTimeout(() => b.classList.remove('on'), t * 1000); }
  togglePause() { if (this.phase === 'fight') { this.phase = 'paused'; this.showOverlay('Paused', '<button data-c="resume:0">Resume</button><button class="ghost small" data-c="setup:0">Change fighters</button><button class="ghost small" data-c="quit:0">Quit</button>'); } else if (this.phase === 'paused') { this.phase = 'fight'; $('cs-over')?.remove(); } }
  showOverlay(title, btns) { $('cs-over')?.remove(); const d = document.createElement('div'); d.id = 'cs-over'; d.className = 'cs-over'; d.innerHTML = `<h2>${title}</h2><div class="cs-row">${btns}</div>`; this.ui.appendChild(d); }
  // ───────────────────────── simulation
  step(h) {
    this.t += h; this.dt = h;
    for (const f of this.fighters) {
      if (f.dead) { if (f.stocks > 0) { f.outT -= h; if (f.outT <= 0) this.respawn(f); } continue; }
      const I = this.readInput(f), F = f.F; (this.lastUp ||= [])[f.i] = I.up;
      f.invuln -= h; f.atkCd -= h; f.spCd -= h; f.ember -= h; f.dropThrough -= h; f.bond = Math.min(100, f.bond + h * 4);
      if (f.stun > 0) { f.stun -= h; f.vs *= 1 - h * 0.6; }
      else {
        // run / air control
        if (f.act !== 'roll' && f.act !== 'charge' && f.act !== 'comet') {
          const target = I.x * F.run, acc = f.grounded ? 70 : 38;
          f.vs += Math.max(-acc * h, Math.min(acc * h, target - f.vs));
          if (I.x) f.facing = Math.sign(I.x);
        }
        if (I.jumpP && f.jumpsLeft > 0 && f.act !== 'pound') {
          const first = f.grounded; f.vy = first ? F.jump : F.jump * (f.kind === 'lumi' ? 1 : 0.92); f.jumpsLeft--; f.grounded = false;
          this.game.audio.play(first ? 'jump' : f.kind === 'lumi' ? 'flap' : 'leap');
          if (!first) this.fx.burst(new THREE.Vector3(f.s, f.y, 0), f.F.color, 8, 3, 0.4, 0.4, 0);
        }
        if (I.downP && f.grounded && f.ground?.oneway) { f.dropThrough = 0.25; f.grounded = false; f.ground = null; }
        if (I.down && !f.grounded && f.vy < 2 && f.kind !== 'lumi') f.vy = Math.min(f.vy, -20); // fast fall
        if (I.atkP && f.atkCd <= 0 && !f.act) this.attack(f);
        if (I.spP) this.special(f);
      }
      // actions (hitboxes)
      if (f.act) {
        f.actT -= h; const d = f.facing;
        if (f.act === 'roll') this.boxHit(f, f.s - 0.2 + d * 0.3, f.s + 0.2 + d * 1.1, f.y, f.y + 1.1, 7, 9, 35, d);
        if (f.act === 'horn' && f.actT < 0.2) this.boxHit(f, d > 0 ? f.s : f.s - 1.9, d > 0 ? f.s + 1.9 : f.s, f.y + 0.2, f.y + 1.5, 11, 12, 28, d);
        if (f.act === 'tongue' && f.actT < 0.2) this.boxHit(f, d > 0 ? f.s : f.s - 3.4, d > 0 ? f.s + 3.4 : f.s, f.y + 0.6, f.y + 1.2, 6, 8, 40, d);
        if (f.act === 'leap') this.boxHit(f, f.s - 1.2, f.s + 1.2, f.y - 0.3, f.y + f.h + 0.8, 9, 12, 82, d);
        if (f.act === 'charge' || f.act === 'comet') { f.vs = d * (f.act === 'comet' ? 24 : 18); this.boxHit(f, f.s - 1, f.s + 1, f.y, f.y + f.h, f.act === 'comet' ? 18 : 13, f.act === 'comet' ? 26 : 16, 30, d); if (Math.random() < 0.5) this.fx.spawn(new THREE.Vector3(f.s - d, f.y + 0.3, (Math.random() - 0.5) * 2), new THREE.Vector3(0, 2, 0), 0xd8c8a0, 0.7, 0.5, 0); }
        if ((f.act === 'pound' || f.act === 'quake') && f.grounded) {
          const big = f.act === 'quake', r = big ? 7 : 2.6; this.shake = big ? 0.8 : 0.35; this.game.audio.play('slam');
          this.fx.ring(new THREE.Vector3(f.s, f.y + 0.2, 0), 0xe0d0b0, 30, big ? 14 : 8, 0.6, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1));
          for (const o of this.fighters) if (o !== f && !o.dead && Math.abs(o.s - f.s) < r && Math.abs(o.y - f.y) < 2.5) this.hit(f, o, big ? 17 : 12, big ? 22 : 14, 75, Math.sign(o.s - f.s) || 1);
          f.act = null;
        }
        if (f.act === 'shovel' && f.actT < 0.2) this.boxHit(f, d > 0 ? f.s - 0.3 : f.s - 2, d > 0 ? f.s + 2 : f.s + 0.3, f.y, f.y + 2.4, 10, 13, 68, d);
        if (f.act === 'peck') this.boxHit(f, d > 0 ? f.s : f.s - 1.5, d > 0 ? f.s + 1.5 : f.s, f.y, f.y + 1.3, 7, 9, 30, d);
        if (f.act === 'slap' && f.actT < 0.12) this.boxHit(f, d > 0 ? f.s : f.s - 1.6, d > 0 ? f.s + 1.6 : f.s, f.y, f.y + 1, 5, 7, 22, d);
        if (f.act === 'hum') { for (const o of this.fighters) if (o !== f && !o.dead && !f.hitList.has(o) && Math.hypot(o.s - f.s, o.y - f.y) < 1.9) { f.hitList.add(o); this.hit(f, o, 6, 9, 50, Math.sign(o.s - f.s) || 1); } }
        if (f.act === 'swoop') { f.vs = d * 19; f.vy = Math.max(f.vy, 0.5); this.boxHit(f, f.s - 0.9, f.s + 0.9, f.y, f.y + 1.2, 8, 10, 35, d); }
        if (f.act === 'torpedo') { if (!f.torpUp) { f.vs = d * 24; f.vy = Math.max(f.vy, 0); } this.boxHit(f, f.s - 0.9, f.s + 0.9, f.y, f.y + 1.2, 9, 12, f.torpUp ? 75 : 30, d); if (Math.random() < 0.6) this.fx.spawn(new THREE.Vector3(f.s - d, f.y + 0.5, 0), new THREE.Vector3(0, 1, 0), 0x80e8ff, 0.5, 0.4, 0); }
        if (f.act === 'burrow') { f.vs = d * 14; f.hide = true; f.invuln = Math.max(f.invuln, 0.05); if (Math.random() < 0.7) this.fx.spawn(new THREE.Vector3(f.s, f.y + 0.1, 0), new THREE.Vector3(0, 3, 0), 0x9a7a5a, 0.6, 0.5, -6);
          if (f.actT <= 0.02) { f.hide = false; f.vy = 13; this.shake = 0.4; this.game.audio.play('smash'); this.fx.burst(new THREE.Vector3(f.s, f.y + 0.3, 0), 0xb89a70, 30, 8, 0.7, 0.7, -8); for (const o of this.fighters) if (o !== f && !o.dead && Math.abs(o.s - f.s) < 2.2 && Math.abs(o.y - f.y) < 2.5) this.hit(f, o, 13, 16, 85, d); } }
        if (f.act === 'dive') { if (f.actT < 1.15) { f.vy = -36; f.vs = d * 6; this.boxHit(f, f.s - 1.2, f.s + 1.2, f.y - 0.5, f.y + f.h, 14, 18, 40, d); } if (f.grounded && f.actT < 1.15) { this.shake = 0.7; this.game.audio.play('slam'); for (const o of this.fighters) if (o !== f && !o.dead && Math.abs(o.s - f.s) < 4 && Math.abs(o.y - f.y) < 2.5) this.hit(f, o, 16, 20, 70, Math.sign(o.s - f.s) || 1); this.fx.ring(new THREE.Vector3(f.s, f.y + 0.2, 0), 0xffc040, 34, 12, 0.7, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)); f.act = null; f.armor = false; } }
        if (f.act === 'well') { f.vs *= 0.8; f.vy = Math.max(f.vy, -1); for (const o of this.fighters) if (o !== f && !o.dead) { const dx = f.s - o.s, dy = f.y - o.y, dd = Math.hypot(dx, dy); if (dd < 9 && dd > 0.6) { o.vs += dx / dd * 40 * h; o.vy += dy / dd * 40 * h; } }
          if (Math.random() < 0.8) this.fx.spawn(new THREE.Vector3(f.s + (Math.random() - 0.5) * 8, f.y + (Math.random() - 0.5) * 6, 0), new THREE.Vector3(0, 0, 0), 0xb080ff, 0.4, 0.4, 0);
          if (f.actT <= 0.02) { this.shake = 0.7; this.game.audio.play('smash'); this.fx.burst(new THREE.Vector3(f.s, f.y + 0.8, 0), 0xb080ff, 50, 12, 0.8, 0.8, 0); for (const o of this.fighters) if (o !== f && !o.dead && Math.hypot(o.s - f.s, o.y - f.y) < 3.6) this.hit(f, o, 16, 20, 60, Math.sign(o.s - f.s) || 1); } }
        if (f.actT <= 0) { if (f.act === 'roll') f.vs *= 0.4; f.act = null; f.armor = false; f.hide = false; }
      }
      // gravity + physics
      const G = f.act === 'pound' || f.act === 'quake' || f.act === 'dive' ? 0 : F.grav;
      if (f.gflip > 0) { f.gflip -= h; f.vy += (5 - f.vy) * Math.min(1, h * 4); f.stun = Math.max(f.stun, 0.05); if (Math.random() < h * 20) this.fx.spawn(new THREE.Vector3(f.s, f.y + f.h / 2, 0.3), new THREE.Vector3(0, 0.5, 0), 0xb080ff, 0.35, 0.4, 0); }
      else { f.vy -= G * h; if (F.glide && I.jump && !f.grounded && f.vy < F.glide && f.stun <= 0) f.vy = F.glide; }
      f.vy = Math.max(f.vy, f.kind === 'lumi' ? -9 : f.act === 'dive' ? -40 : -28);
      if (f.stun <= 0 && f.grounded && !I.x && !f.act) f.vs *= Math.max(0, 1 - h * (F.slick ? 5 : 14));
      const wasAir = !f.grounded;
      moveBody(f, this.solids, [], h);
      if (f.grounded) { f.jumpsLeft = F.jumps; if (wasAir && f.stun > 0.1) { f.vy = Math.abs(f.vy) * 0.4; } }
      // blast zones
      const B = STAGE.blast; if (f.s < -B.s || f.s > B.s || f.y < B.lo || f.y > B.hi) this.ko(f);
    }
    // projectiles
    for (const p of this.shots) {
      p.t += h; p.vy += p.grav * h; p.s += p.vs * h; p.y += p.vy * h;
      const onGround = p.y < 0.3 + p.r * 0.5 && Math.abs(p.s) < STAGE.half && p.vy < 0;
      if (p.kind === 'rang' && p.t > 0.45 && p.owner) { const dx = p.owner.s - p.s, dy = p.owner.y + 0.8 - p.y, dd = Math.hypot(dx, dy) || 1; p.vs = dx / dd * 18; p.vy = dy / dd * 18; if (dd < 0.8) p.t = 99; }
      if (p.kind === 'bomb' && onGround) p.boom = true;
      else if (p.kind === 'peel' && onGround) { p.y = 0.25; p.vs = 0; p.vy = 0; p.grav = 0; p.life = Math.max(p.life, p.t + 8); p.trap = true; }
      else if (p.kind === 'wave') { p.y = Math.max(0.6, p.y); }
      else if (p.grav && onGround) { p.y = 0.3; p.vy = 9; }
      for (const o of this.fighters) if (o !== p.owner && !o.dead && !p.hit.has(o) && Math.abs(o.s - p.s) < o.hw + p.r && p.y > o.y - p.r && p.y < o.y + o.h + p.r) {
        if (p.kind === 'bomb') { p.boom = true; break; }
        if (p.kind === 'peel' && !(p.trap && o.grounded)) continue;
        if (this.hit(p.owner, o, p.dmg, p.kb, p.kind === 'peel' ? 80 : p.ang, Math.sign(p.vs) || Math.sign(o.s - p.s) || 1)) { if (p.kind === 'peel') o.stun = 0.8; p.hit.add(o); if (!p.pierce) p.t = 99; } }
      if (p.boom) { p.t = 99; this.shake = 0.35; this.game.audio.play('smash'); this.fx.burst(new THREE.Vector3(p.s, p.y, 0), 0xff7040, 40, 9, 0.8, 0.6, 0); for (const o of this.fighters) if (!o.dead && Math.hypot(o.s - p.s, o.y + 0.6 - p.y) < 2.4) this.hit(p.owner, o, p.dmg, p.kb, p.ang, Math.sign(o.s - p.s) || 1); }
      if (p.t > p.life) { this.fx.burst(new THREE.Vector3(p.s, p.y, 0), p.col, 6, 3, 0.4, 0.3, 0); this.dyn.remove(p.m); p.dead = true; }
    }
    this.shots = this.shots.filter((p) => !p.dead);
    this.stepItems(h); this.stepKing(h);
  }
  stepItems(h) {
    this.itemT -= h;
    if (this.itemT <= 0 && this.items.length < 2) {
      this.itemT = 9 + Math.random() * 6; const kinds = ['ember', 'bubble', 'coin'], kind = kinds[Math.floor(Math.random() * 3)];
      const col = { ember: 0xff7a30, bubble: 0xb8a0ff, coin: 0xffd040 }[kind];
      const m = new THREE.Group(); const core = new THREE.Mesh(kind === 'coin' ? new THREE.CylinderGeometry(0.4, 0.4, 0.1, 20) : new THREE.SphereGeometry(0.35, 14, 10), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.4, metalness: kind === 'coin' ? 0.6 : 0 })); if (kind === 'coin') core.rotation.x = Math.PI / 2; m.add(core); this.dyn.add(m);
      const spots = [[0, 1], [-8, 5.3], [8, 5.3], [0, 9.8], [-12, 1], [12, 1]], sp = spots[Math.floor(Math.random() * spots.length)];
      this.items.push({ kind, m, s: sp[0], y: sp[1], t: 0 });
      this.fx.burst(new THREE.Vector3(sp[0], sp[1], 0), col, 20, 5, 0.5, 0.6, 0);
    }
    for (const it of this.items) {
      it.t += h; it.m.position.set(it.s, it.y + Math.sin(it.t * 3) * 0.15, 0); it.m.rotation.y = it.t * 2;
      for (const f of this.fighters) if (!f.dead && Math.abs(f.s - it.s) < f.hw + 0.5 && it.y > f.y - 0.5 && it.y < f.y + f.h + 0.6) {
        if (it.kind === 'ember') { f.ember = 9; this.big(`P${f.i + 1} · EMBER BLOOM`, 0.8); }
        if (it.kind === 'bubble') { f.bubble = true; }
        if (it.kind === 'coin') { f.heat = Math.max(0, f.heat - 35); f.bond = Math.min(100, f.bond + 25); this.big(`P${f.i + 1} · SEED COIN`, 0.8); }
        this.game.audio.play('shard'); it.dead = true; this.dyn.remove(it.m); break;
      }
      if (it.t > 14) { it.dead = true; this.dyn.remove(it.m); }
    }
    this.items = this.items.filter((x) => !x.dead);
  }
  stepKing(h) {
    const K = this.king;
    this.kingT -= h;
    if (this.kingState === 'idle' && this.kingT <= 0) { this.kingState = 'warn'; this.kingT = 1.6; this.kingDir = Math.random() < 0.5 ? 1 : -1; this.game.audio.play('rumble'); this.shake = 0.4; }
    else if (this.kingState === 'warn') { this.warn.visible = true; this.warn.position.set(-this.kingDir * (STAGE.half - 1.5), 3 + Math.abs(Math.sin(this.t * 8)) * 0.4, 1); if (this.kingT <= 0) { this.kingState = 'charge'; this.kingS = -this.kingDir * (STAGE.half + 6); this.warn.visible = false; K.visible = true; this.kHit = new Set(); } }
    else if (this.kingState === 'charge') {
      this.kingS += this.kingDir * 19 * h; K.position.set(this.kingS, 0, 0); K.rotation.y = this.kingDir > 0 ? 0 : Math.PI; K.children[0].position.y = Math.abs(Math.sin(this.t * 16)) * 0.15;
      if (Math.random() < 0.6) this.fx.spawn(new THREE.Vector3(this.kingS - this.kingDir * 2, 0.3, (Math.random() - 0.5) * 3), new THREE.Vector3(0, 3, 0), 0xc0a070, 1, 0.6, 0);
      for (const f of this.fighters) if (!f.dead && !this.kHit.has(f) && Math.abs(f.s - this.kingS) < 2.2 && f.y < 2.2) { this.kHit.add(f); this.hit(null, f, 15, 16, 50, this.kingDir); }
      if (Math.abs(this.kingS) > STAGE.half + 8) { this.kingState = 'idle'; this.kingT = 18 + Math.random() * 8; K.visible = false; }
    }
  }
  // ───────────────────────── per frame
  update(dt) {
    const g = this.game; this.fx.update(dt, this.camera.position);
    if (this.phase === 'setup') { this.t = (this.t || 0) + dt; const a = this.t * 0.15; this.camera.position.set(Math.sin(a) * 6, 7, 30); this.camera.lookAt(0, 3, 0); return; }
    if (this.phase === 'count') {
      this.countT -= dt; const n = Math.ceil(this.countT - 0.2);
      const b = $('cs-big'); if (b) { b.textContent = n > 0 ? n : 'CLASH!'; b.classList.add('on'); }
      if (this.countT <= 0) { this.phase = 'fight'; setTimeout(() => $('cs-big')?.classList.remove('on'), 500); g.audio.play('win'); }
    } else if (this.phase === 'fight' || this.phase === 'over') {
      if (this.hitstop > 0) this.hitstop -= dt;
      else { const h = 1 / 120; this.acc = (this.acc || 0) + Math.min(dt, 0.05); while (this.acc >= h) { this.step(h); this.acc -= h; } }
      if (this.phase === 'over') { this.overT -= dt; if (this.overT <= 0 && !$('cs-over')) { const w = this.winner; g.audio.play('win'); this.showOverlay(w ? `<span style="color:#${PCOL[w.i].toString(16).padStart(6, '0')}">P${w.i + 1} ${w.F.name}</span> wins!` : 'Draw!', '<button data-c="again:0">Rematch</button><button class="ghost small" data-c="setup:0">Change fighters</button><button class="ghost small" data-c="quit:0">Quit</button>'); } }
    }
    this.render(dt);
  }
  render(dt) {
    const t = this.t;
    for (const f of this.fighters) {
      if (f.dead) continue;
      const m = f.model, ud = m.userData, sun = f.heat >= 100; ud.anim?.(t, dt);
      f.anim += dt * (f.grounded ? Math.abs(f.vs) * 1.6 + 2 : 6);
      m.position.set(f.s, f.y + (f.kind === 'lumi' ? 0.2 + Math.sin(t * 4 + f.i) * 0.1 : 0), 0);
      m.rotation.set(0, f.facing > 0 ? -0.35 : Math.PI + 0.35, 0);
      if (f.act === 'roll' || f.act === 'leap') ud.body.rotation.z = -t * 22; else if (f.stun > 0) ud.body.rotation.z = Math.sin(t * 30) * 0.3; else ud.body.rotation.z = f.act === 'charge' || f.act === 'comet' ? -0.25 : 0;
      ud.legs?.forEach((l, k) => l.rotation.z = f.grounded ? Math.sin(f.anim + k * Math.PI) * Math.min(0.9, Math.abs(f.vs) * 0.1) : 0.6);
      ud.wings?.forEach((w, k) => w.rotation.x = (k ? -1 : 1) * (Math.PI / 2 + Math.sin(t * (f.kind === 'lumi' ? 18 : 10)) * 0.5));
      m.visible = !f.hide && !(f.invuln > 0.1 && Math.floor(t * 18) % 2 === 0);
      const ph = Math.sin(t * 10) * 0.5 + 0.5;
      m.traverse((o) => { if (o.isMesh && o.material.emissive && !o.userData.e0) o.userData.e0 = { c: o.material.emissive.getHex(), i: o.material.emissiveIntensity }; if (o.isMesh && o.userData.e0) { const heatGlow = sun ? 0.6 + ph * 0.6 : f.heat / 100 * 0.35; if (heatGlow > 0.02 && o.userData.e0.i < 0.6) { o.material.emissive.setHex(sun ? 0xffc040 : 0xff6030); o.material.emissiveIntensity = heatGlow; } else { o.material.emissive.setHex(o.userData.e0.c); o.material.emissiveIntensity = o.userData.e0.i; } } });
      if (f.bubble && Math.random() < dt * 20) this.fx.spawn(new THREE.Vector3(f.s + (Math.random() - 0.5), f.y + Math.random() * f.h, 0.5), new THREE.Vector3(0, 0.5, 0), 0xc8b0ff, 0.4, 0.4, 0);
      if (f.ember > 0 && Math.random() < dt * 20) this.fx.spawn(new THREE.Vector3(f.s, f.y + f.h, 0.3), new THREE.Vector3(0, 1.5, 0), 0xff8030, 0.35, 0.4, 0);
      if (f.bond >= 100 && Math.random() < dt * 14) this.fx.spawn(new THREE.Vector3(f.s + (Math.random() - 0.5) * 1.2, f.y + Math.random() * f.h, 0.4), new THREE.Vector3(0, 2, 0), f.F.color, 0.45, 0.6, 0);
      f.tag.position.set(f.s, f.y + f.h + 0.9, 0.5); f.tag.quaternion.copy(this.camera.quaternion);
      // HUD
      const el = $('csp' + f.i); if (el) { el.querySelector('.cs-heat span').textContent = Math.round(f.heat); el.querySelector('.cs-heat').style.setProperty('--h', f.heat / 100); el.classList.toggle('sun', sun); el.querySelector('.cs-bar i').style.width = f.bond + '%'; el.classList.toggle('bond', f.bond >= 100); el.querySelector('.cs-st').textContent = '●'.repeat(Math.max(0, f.stocks)); }
    }
    for (const f of this.fighters) if (f.dead) { const el = $('csp' + f.i); if (el) { el.querySelector('.cs-st').textContent = '●'.repeat(Math.max(0, f.stocks)); el.classList.toggle('gone', f.stocks <= 0); } }
    for (const p of this.shots) { p.m.position.set(p.s, p.y, 0); p.m.rotation.x += dt * 10; if (Math.random() < dt * 30) this.fx.spawn(new THREE.Vector3(p.s, p.y, 0), new THREE.Vector3(0, 0, 0), p.col, 0.3, 0.25, 0); }
    // camera: frame everyone who's alive
    const live = this.fighters.filter((f) => !f.dead); let s0 = -6, s1 = 6, y0 = 0, y1 = 6;
    if (live.length) { s0 = Math.min(...live.map((f) => f.s)) - 4; s1 = Math.max(...live.map((f) => f.s)) + 4; y0 = Math.min(0, ...live.map((f) => f.y)) - 2; y1 = Math.max(...live.map((f) => f.y + f.h)) + 3; }
    const cx = (s0 + s1) / 2, cy = (y0 + y1) / 2, w = Math.max(18, s1 - s0, (y1 - y0) * this.camera.aspect * 1.1), dist = Math.min(60, w / (2 * Math.tan(20 * Math.PI / 180) * this.camera.aspect) + 4);
    const want = new THREE.Vector3(cx * 0.85, cy + 3 + dist * 0.12, Math.max(16, dist)), look = new THREE.Vector3(cx * 0.85, cy, 0);
    const k = this.snapCam ? 1 : 1 - Math.exp(-dt * 4); this.snapCam = false;
    this.camPos ||= want.clone(); this.camLook ||= look.clone(); this.camPos.lerp(want, k); this.camLook.lerp(look, k);
    this.camera.position.copy(this.camPos); if (this.shake > 0) { this.camera.position.x += (Math.random() - 0.5) * this.shake; this.camera.position.y += (Math.random() - 0.5) * this.shake; this.shake = Math.max(0, this.shake - dt * 2.5); }
    this.camera.lookAt(this.camLook);
  }
}
