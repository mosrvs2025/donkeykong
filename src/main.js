import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Path } from './path.js';
import { buildLevel, PATH_POINTS, O } from './level.js';
import { World, THEMES } from './world.js';
import { Entities } from './entities.js';
import { Player } from './player.js';
import { CameraDirector } from './camera.js';
import { FX } from './fx.js';
import { Input } from './input.js';
import { Audio } from './audio.js';

const $ = (id) => document.getElementById(id);
const isMobile = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
const params = new URLSearchParams(location.search);

class HUD {
  constructor(game) { this.game = game; this.toastT = 0; this.bannerT = 0; }
  hearts(n, max) { $('hearts').innerHTML = Array.from({ length: max }, (_, i) => `<div class="heart ${i < n ? '' : 'empty'}"></div>`).join(''); }
  glims(n) { $('glim-count').textContent = n; }
  shards(list) { $('shards').innerHTML = list.map((s) => `<div class="shard ${s.star ? 'star' : ''} ${s.taken ? 'got' : ''}"></div>`).join(''); }
  mount(txt) { const el = $('mount'); if (txt) { el.innerHTML = txt; el.classList.add('on'); } else el.classList.remove('on'); }
  toast(html, dur = 3) { const el = $('toast'); el.innerHTML = html; el.classList.add('on'); this.toastT = dur; }
  banner(name, sub, dur = 3) { const el = $('banner'); el.innerHTML = `${name}${sub ? `<small>${sub}</small>` : ''}`; el.classList.add('on'); this.bannerT = dur; }
  update(dt) {
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) $('toast').classList.remove('on');
    if (this.bannerT > 0 && (this.bannerT -= dt) <= 0) $('banner').classList.remove('on');
  }
}

const SECRETS = [
  { id: 'mesa', name: 'Hidden Mesa Vault', test: (p) => p.s > 161 + O && p.s < 189 + O && p.y < 2.3 },
  { id: 'branch', name: 'Hookbloom Heights', test: (p) => p.s > 398 + O && p.s < 424 + O && p.y > 34 && p.y < 60 },
  { id: 'sky', name: 'The Sky Shrine', test: (p) => p.y > 150 },
  { id: 'shrine', name: 'Sunken Shrine', test: (p) => p.s > 641.5 + O && p.s < 660.5 + O && p.y < -3.2 },
  { id: 'falls', name: 'Behind the Falls', test: (p) => p.s > 716 + O && p.s < 740 + O && p.y < 4 },
  { id: 'grotto', name: 'The Low Grotto', test: (p) => p.s > 976 + O && p.s < 1012 + O && p.y < -14 && p.y > -30 },
  { id: 'colossus', name: 'Heart of the Colossus', test: (p) => p.s > 960 + O && p.s < 1046 + O && p.y > 12.5 && p.y < 60 },
];

class Game {
  constructor() {
    this.canvas = $('game');
    this.quality = isMobile ? 0.55 : 1;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: !isMobile, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.3 : 1.75));
    r.setSize(innerWidth, innerHeight);
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x9fc8a8, 0.006);
    this.camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.3, 2400);
    this.hemi = new THREE.HemisphereLight(0xbfe0ff, 0x3a5a20, 1.2); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0c8, 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
    const sc = this.sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 160; this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);
    this.playerLight = new THREE.PointLight(0xffe0b0, 0, 14, 1.6); this.scene.add(this.playerLight);
    // post
    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.55, 0.55, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.input = new Input(); this.audio = new Audio(); this.hud = new HUD(this);
    this.level = buildLevel();
    this.path = new Path(PATH_POINTS);
    this.fx = new FX(this.scene);
    this.world = new World(this.scene, this.path, this.level, this.quality);
    this.stats = { glims: 0, enemies: 0, deaths: 0, time: 0, met: {}, walls: 0, vines: 0, flips: 0, secrets: new Set(), echo: false };
    this.entities = new Entities(this);
    this.player = new Player(this);
    this.director = new CameraDirector(this.camera, this.path, this.level);
    this.checkpoint = { s: this.level.start.s, y: this.level.start.y };
    this.themeIdx = 0; this.currentTheme = 0; this.bannerSeen = new Set(); this.hintSeen = new Set();
    this.col = { top: new THREE.Color(), hor: new THREE.Color(), fog: new THREE.Color(), hs: new THREE.Color(), hg: new THREE.Color(), sun: new THREE.Color(), pc: new THREE.Color() };
    this.applyTheme(THEMES[0], 1);
    this.state = 'title'; this.time = 0; this.acc = 0; this.slowmo = 1; this.slowT = 0;
    this.hud.hearts(3, 3); this.hud.glims(0); this.hud.shards(this.entities.shards);
    addEventListener('resize', () => this.resize());
    this.input.onKey = (code) => {
      if (code === 'KeyM') this.audio.toggleMute();
      if ((code === 'KeyP' || code === 'Escape') && (this.state === 'play' || this.state === 'paused')) this.togglePause();
      if ((code === 'Enter' || code === 'Space') && this.state === 'title' && this.ready) this.start();
    };
    $('start-btn').onclick = () => this.start();
    $('resume-btn').onclick = () => this.togglePause();
    this.director.update(0.016, this.player, true);
    this.ready = true; $('loading').textContent = isMobile ? 'touch controls enabled' : 'press Enter or click Play';
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
    window.__game = this; // debugging / automated tests
    if (params.has('s')) { const s = +params.get('s') + O, y = +(params.get('y') || 0); this.player.reset(s, y); this.checkpoint = { s, y }; this.director.update(0.016, this.player, true); this.snapTheme = true; }
    if (params.has('autostart')) this.start(true);
  }
  resize() {
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight); this.composer.setSize(innerWidth, innerHeight);
  }
  start(skipIntro) {
    if (this.state !== 'title') return;
    this.audio.init(); this.audio.resume(); this.audio.musicOn = true;
    $('title').classList.add('hidden'); $('hud').classList.remove('hidden');
    if (this.input.isTouch) $('touch').classList.remove('hidden');
    this.state = 'play';
    if (!skipIntro) {
      // opening shot: sweep down from the Mother Tree's canopy to Kiri
      const top = this.path.world(230 + O, 95, 110), mid = this.path.world(50 + O, 22, 45);
      const lookTree = this.path.world(300 + O, 110, -48);
      this.introT = 5.5;
      this.director.play({ dur: 5.5, blendOut: true,
        pos: (u) => top.clone().lerp(mid, Math.min(1, u * 1.4)),
        look: (u) => lookTree.clone().lerp(this.path.world(this.player.s, 1, 0), Math.min(1, u * 1.3)) });
      setTimeout(() => this.hud.banner('THORNWILD', 'The Rootwild · where the old roads sleep', 4), 600);
      this.bannerSeen.add(0);
    }
  }
  togglePause() {
    if (this.state === 'play') { this.state = 'paused'; $('pause').classList.remove('hidden'); }
    else if (this.state === 'paused') { this.state = 'play'; $('pause').classList.add('hidden'); this.last = performance.now(); }
  }
  // ───────────── events from gameplay
  banner(a, b) { this.hud.banner(a, b, 3); }
  toast(h, d) { this.hud.toast(h, d); }
  shake(a) { this.director.shake(a); }
  camPunch(t) { this.director.punch = t; }
  addGlims(n, pos) { this.stats.glims += n; this.hud.glims(this.stats.glims); if (pos) this.fx.burst(pos, 0x9fffc0, 6, 4, 0.5, 0.4, 0); if (Math.floor((this.stats.glims - n) / 100) < Math.floor(this.stats.glims / 100)) this.bonusHeart(); }
  bonusHeart() {
    const p = this.player; if (p.hearts < p.maxHearts) { p.hearts++; } else if (p.maxHearts < 5) { p.maxHearts++; p.hearts = p.maxHearts; }
    this.hud.hearts(p.hearts, p.maxHearts); this.toast('100 glims! <b>+1 heart</b>', 2); this.audio.play('checkpoint');
  }
  collectGlim(g) {
    const n = (this.glimStreak = (this.glimStreakT > 0 ? (this.glimStreak || 0) + 1 : 0)); this.glimStreakT = 0.5;
    this.audio.play('glim', n);
    this.fx.burst(g.p, 0xa0ffc0, 6, 3, 0.45, 0.35, 0);
    this.addGlims(1);
  }
  collectShard(sd) {
    this.audio.play('shard'); this.hud.shards(this.entities.shards);
    const got = this.entities.shards.filter((s) => s.taken && !s.star).length;
    const p = this.path.world(sd.s, sd.y, 0);
    this.fx.burst(p, sd.star ? 0xd0a0ff : 0xffd060, 60, 10, 0.9, 1.4, -3);
    this.fx.burst(p, 0xffffff, 20, 4, 1.4, 0.6, 0);
    this.slowT = 0.6; this.flash(0.35);
    if (sd.star) this.banner('STAR HEART', 'the Colossus remembers you'), this.toast('A living relic of the Sunwrights. <b>+1 max heart</b>', 4), this.player.maxHearts++, this.player.hearts = this.player.maxHearts, this.hud.hearts(this.player.hearts, this.player.maxHearts);
    else this.banner(`SUN SHARD ${got}/5`, ['it hums with warm light', 'a sliver of an old sun', 'the river kept it safe', 'hidden, but not lost', 'it beats like a heart'][sd.idx] || '');
  }
  flash(a) { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = a; requestAnimationFrame(() => { f.style.transition = 'opacity .6s'; f.style.opacity = 0; }); }
  onSlam(s, y, g) {
    const E = this.entities;
    this.audio.play('slam'); this.shake(0.35);
    const p = this.path.world(s, y + 0.1, 0), f = this.path.frame(s);
    this.fx.ring(p, 0xfff0c0, 28, 9, 0.6, new THREE.Vector3(f.tx, 0, f.tz), new THREE.Vector3(f.nx, 0, f.nz));
    for (const t of E.totems) if (Math.abs(t.s - s) < 3.2 && Math.abs(t.y - y) < 4) E.toggleTotem(t);
    for (const e of E.enemies) if (e.alive && Math.abs(e.s - s) < 3.2 && Math.abs(e.y - y) < 1.5 && e.kind !== 'buzzmoth') { if (e.kind === 'spikeback' && this.player.mount !== 'beast') e.stun = 2; else E.killEnemy(e, Math.sign(e.s - s) * 6, 10); }
    for (const b of E.blooms) if (Math.abs(b.s - s) < 3 && Math.abs(b.y - y) < 3) E.triggerBloom(b);
  }
  setCheckpoint(cp) { this.checkpoint = { s: cp.s, y: cp.y }; this.audio.play('checkpoint'); this.toast('Beacon lit — checkpoint saved', 1.8); const p = this.player; if (p.hearts < p.maxHearts) { p.hearts = p.maxHearts; this.hud.hearts(p.hearts, p.maxHearts); } }
  killPlayer(reason) {
    const p = this.player; if (p.state === 'dead' || p.state === 'cutscene') return;
    p.state = 'dead'; p.deadT = 0; this.stats.deaths++;
    this.audio.play('hurt'); this.shake(0.6); this.toast(reason || 'Ouch!', 1.5);
    $('fade').style.opacity = 1;
  }
  respawn() {
    const p = this.player, E = this.entities;
    const comp = p.comp;
    if (comp) { p.dismount(false); comp.state = 'idle'; comp.s = comp.homeS; comp.y = comp.homeY; }
    const max = p.maxHearts;
    p.cart = null; p.reset(this.checkpoint.s, this.checkpoint.y + 0.1); p.maxHearts = max; p.hearts = max; p.invuln = 1.2;
    this.hud.hearts(p.hearts, p.maxHearts); this.hud.mount(null);
    E.resetChase(); E.resetCart(); E.resetEnemies();
    this.audio.intensity = 0;
    this.director.update(0.016, p, true); this.snapTheme = true;
    $('fade').style.opacity = 0;
  }
  teleport(portal) {
    if (this.teleporting) return; this.teleporting = true;
    this.audio.play('portal'); $('fade').style.opacity = 1;
    this.player.state = 'cutscene';
    setTimeout(() => {
      const p = this.player; p.s = portal.ts; p.y = portal.ty; p.vs = 0; p.vy = 0; p.state = 'normal'; p.g = 1;
      this.director.update(0.016, p, true);
      $('fade').style.opacity = 0; this.teleporting = false;
      if (portal.kind === 'sky') this.banner('THE SKY SHRINE', 'above the world tree'), this.toast('Gather what you can — the return portal waits at the far end', 3);
      else this.banner('Back to the canopy', '');
    }, 500);
  }
  onCartStart() { this.audio.intensity = 0.8; this.banner('HOLD ON!', 'Space to jump the gaps'); }
  onCartEnd() { this.audio.intensity = 0.2; }
  onChaseStart() { this.audio.intensity = 1; this.audio.play('rumble'); this.banner('RUN!', 'the temple wakes'); this.shake(1); }
  onChaseEnd() { this.audio.intensity = 0.2; this.audio.play('smash'); this.shake(1.2); this.toast('Phew…', 1.5); }
  finish() {
    const p = this.player; p.state = 'cutscene'; if (p.comp) p.comp.state = 'ridden';
    this.audio.play('win'); this.audio.intensity = 0;
    const A = this.entities.altar;
    const c = this.path.world(A.s, A.y + 3, 0);
    this.director.play({ dur: 7, hold: true,
      pos: (u) => { const a = -0.6 + u * 1.6; const f = this.path.frame(A.s); return new THREE.Vector3(c.x + (f.nx * Math.cos(a) + f.tx * Math.sin(a)) * (11 - u * 3), c.y + 1 + u * 3, c.z + (f.nz * Math.cos(a) + f.tz * Math.sin(a)) * (11 - u * 3)); },
      look: () => c.clone() });
    this.banner('THE LUMEN SEED', 'the old sun wakes');
    let t = 0; const seed = A.seed;
    const iv = setInterval(() => {
      t += 0.05; seed.position.y = 3 + t * 1.2; seed.scale.setScalar(1 + t * 0.4);
      this.fx.burst(this.path.world(A.s, A.y + seed.position.y, 0), [0xffe080, 0x80ffc0, 0xffffff][Math.floor(Math.random() * 3)], 4, 6, 0.8, 1.2, 0);
      if (this.world.sunDisc) this.world.sunDisc.core.material.emissiveIntensity = 0.6 + t * 1.2;
      if (t > 4.2) { clearInterval(iv); this.flash(1); setTimeout(() => this.showEnd(), 900); }
    }, 50);
  }
  showEnd() {
    this.state = 'end';
    const S = this.stats, E = this.entities;
    const shards = E.shards.filter((s) => s.taken && !s.star).length, star = E.shards.find((s) => s.star)?.taken;
    const mins = Math.floor(S.time / 60), secs = Math.floor(S.time % 60).toString().padStart(2, '0');
    const met = Object.keys(S.met).length;
    $('end-inner').innerHTML = `<div class="kicker">the adventure ends… for now</div><h1 style="font-size:clamp(32px,7vw,64px);white-space:normal">THE SEED AWAKENS</h1>
      <p class="lore">Kiri carries the Lumen Seed into the light. Somewhere below, the Colossus opens its other eye.</p>
      <p class="big">${S.glims} / ${E.totalGlims} glims</p>
      <p>Sun Shards: <b>${shards} / 5</b> ${star ? ' · <b style="color:#d0a0ff">Star Heart ✦</b>' : ''}</p>
      <p>Secrets found: <b>${S.secrets.size} / ${SECRETS.length}</b> · Companions met: <b>${met} / 5</b></p>
      <p>Critters bopped: ${S.enemies} · Falls: ${S.deaths} · Time: ${mins}:${secs}</p>
      <div style="margin-top:22px"><button onclick="location.reload()">Play again</button></div>`;
    $('end').classList.remove('hidden'); $('banner').classList.remove('on'); $('toast').classList.remove('on'); $('hud').classList.add('hidden'); $('touch').classList.add('hidden');
  }
  // ───────────── theme blending
  applyTheme(T, k) {
    const c = this.col;
    c.top.lerp(new THREE.Color(T.top), k); c.hor.lerp(new THREE.Color(T.hor), k); c.fog.lerp(new THREE.Color(T.fog), k);
    c.hs.lerp(new THREE.Color(T.hs), k); c.hg.lerp(new THREE.Color(T.hg), k); c.sun.lerp(new THREE.Color(T.sun), k); c.pc.lerp(new THREE.Color(T.pc), k);
    this.world.skyU.top.value.copy(c.top); this.world.skyU.hor.value.copy(c.hor); this.world.skyU.sunCol.value.copy(c.sun);
    this.scene.fog.color.copy(c.fog); this.scene.fog.density += (T.dens - this.scene.fog.density) * k;
    this.hemi.color.copy(c.hs); this.hemi.groundColor.copy(c.hg);
    this.sun.color.copy(c.sun); this.sun.intensity += (T.si - this.sun.intensity) * k;
    this.renderer.toneMappingExposure += (T.exp - this.renderer.toneMappingExposure) * k;
    this.fx.ambColor.copy(c.pc);
  }
  updateAtmosphere(dt) {
    const p = this.player;
    let t = this.world.themeAt(p.s);
    if (p.y > 150) t = 1;
    const sky = p.y > 150;
    this.currentTheme = t;
    let T = THEMES[t];
    if (sky) T = { ...T, fog: 0xa8c8e8, dens: 0.004, exp: 0.85, top: 0x3a80e0, hor: 0xd8e8ff };
    if (t === 3 && p.y > 12.5) T = { ...T, fog: 0x1a0a30, dens: 0.012, hs: 0x9070ff, si: 0.6 };
    this.applyTheme(T, this.snapTheme ? 1 : 1 - Math.exp(-dt * 1.2)); this.snapTheme = false;
    this.audio.theme = Math.min(4, t === 5 ? 4 : t);
    // sun & shadow camera follow the player
    const w = this.path.world(p.s, p.y, 0);
    this.sun.position.set(w.x + 30, w.y + 60, w.z + 20); this.sun.target.position.copy(w);
    this.playerLight.position.set(w.x, w.y + 2, w.z + 2);
    this.playerLight.intensity += ((t === 3 || t === 4 ? 18 : 0) - this.playerLight.intensity) * dt * 2;
    this.world.sky.position.copy(this.camera.position);
    if (this.state !== 'play') return;
    // banners for new areas
    for (const b of this.level.banners) if (p.s > b.s && p.s < b.s + 30 && !this.bannerSeen.has(b.s)) { this.bannerSeen.add(b.s); this.hud.banner(b.name, b.sub, 3.5); }
    for (const h of this.level.hints) {
      const key = h.s0 + h.text;
      if (this.hintSeen.has(key) || p.s < h.s0 || p.s > h.s1) continue;
      if (h.cond === 'oru' && p.mount !== 'oru') continue;
      this.hintSeen.add(key); this.hud.toast(h.text, 3.5);
    }
    for (const sc of SECRETS) if (!this.stats.secrets.has(sc.id) && p.state !== 'dead' && sc.test(p)) {
      this.stats.secrets.add(sc.id); this.hud.banner('SECRET FOUND', `${sc.name} · ${this.stats.secrets.size}/${SECRETS.length}`, 3); this.audio.play('bloom');
    }
    // mount indicator
    if (p.mount === 'bird') this.hud.mount(`🪶 SOLA ${Math.max(0, Math.ceil(p.birdTime))}s`);
    else if (p.mount) this.hud.mount({ beast: '🐗 GRUMBO', frog: '🐸 BOING', fish: '🦦 NUU', oru: '🔮 ORU' }[p.mount] + ' <small>(↓+Shift to hop off)</small>');
    else if (p.cart) this.hud.mount('⛏ MINE CART'); else this.hud.mount(null);
    if (p.mount === 'bird' && p.birdTime < 5 && p.birdTime > 4.9) this.toast('Sola is getting tired…', 2);
  }
  // deterministic stepping for automated tests: keys = {right:true,...}
  stepSim(secs, keys = {}, press = []) {
    for (const k in this.input.keys) this.input.keys[k] = !!keys[k];
    for (const k of press) this.input.pressed[k] = true;
    const h = 1 / 120;
    for (let i = 0; i < secs * 120; i++) {
      this.input.update();
      this.entities.update(h); this.player.step(h, this.input); this.player.tick(h); this.player.interact(h);
      if (i === 0) this.input.endFrame();
    }
    const p = this.player; return { s: +(p.s - O).toFixed(2), y: +p.y.toFixed(2), vs: +p.vs.toFixed(2), vy: +p.vy.toFixed(2), st: p.state, g: p.grounded, mount: p.mount, cart: !!p.cart, glims: this.stats.glims, hearts: p.hearts, deaths: this.stats.deaths, water: p.inWater };
  }
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    this.frames = (this.frames || 0) + 1;
    let dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000)); this.last = now;
    if (this.state === 'paused') return;
    this.time += dt;
    const playing = this.state === 'play';
    this.input.update();
    if (this.slowT > 0) { this.slowT -= dt; dt *= 0.35; }
    this.glimStreakT = (this.glimStreakT || 0) - dt;
    if (playing) {
      if (this.introT > 0) { this.introT -= dt; }
      if (this.player.state !== 'cutscene' && this.player.state !== 'dead') this.stats.time += dt;
      const h = 1 / 120; this.acc += dt;
      let n = 0;
      while (this.acc >= h && n < 8) {
        this.entities.update(h);
        this.player.step(h, this.input);
        this.player.tick(h);
        this.player.interact(h);
        this.acc -= h; n++;
      }
      if (n >= 8) this.acc = 0;
      this.input.endFrame();
    } else if (this.state === 'title') {
      this.entities.update(dt);
      this.player.idleT = 0;
    } else this.entities.update(dt);
    this.player.render(dt);
    this.world.update(this.time, dt);
    this.updateAtmosphere(dt);
    this.director.update(dt, this.player);
    if (this.state === 'title') { // slow orbit behind the title screen
      const w = this.path.world(this.player.s, 2, 0), a = this.time * 0.08;
      this.camera.position.set(w.x + Math.sin(a) * 26, w.y + 8, w.z + Math.cos(a) * 26); this.camera.lookAt(w.x, w.y + 3, w.z);
    }
    this.fx.update(dt, this.camera.position);
    this.hud.update(dt);
    $('timer').textContent = this.state === 'play' ? `${Math.floor(this.stats.time / 60)}:${Math.floor(this.stats.time % 60).toString().padStart(2, '0')}` : '';
    this.audio.updateMusic();
    this.composer.render();
  }
}

new Game();
