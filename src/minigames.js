import * as THREE from 'three';
import { makeHero } from './models.js';
import { FX } from './fx.js';
import { getTex } from './textures.js';

// Root Hollows: glowing stumps hidden in levels. Stand on one and press ↓ to dive in.
// Inside is a mini-game in full 3D: Glimstorm, Sky Drop or Echo Stones.
const $ = (id) => document.getElementById(id);
const glow = (c, i = 2) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i });
export const MINIS = {
  glimstorm: { name: 'GLIMSTORM', sub: 'catch the falling glims · dodge the thorn bombs', gold: 40, unit: 'glims', time: 40 },
  skydrop: { name: 'SKY DROP', sub: 'steer through the rings as you fall', gold: 22, unit: 'rings', time: 32 },
  echo: { name: 'ECHO STONES', sub: 'watch the stones sing, then repeat the song', gold: 7, unit: 'songs', time: 0 },
};

export class MiniGames {
  constructor(game) {
    this.game = game; this.active = null;
    // Root Hollows in the main world
    this.hollows = game.level.hollows.map((h) => {
      const g = new THREE.Group();
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 1.1, 12, 1, true), new THREE.MeshStandardMaterial({ map: getTex('bark'), side: THREE.DoubleSide })); stump.position.y = 0.2; g.add(stump);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.16, 6, 20), new THREE.MeshStandardMaterial({ color: 0x5a3a20 })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.75; g.add(rim);
      const swirl = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.ShaderMaterial({ transparent: true, uniforms: { t: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform float t; varying vec2 vUv; void main(){ vec2 c = vUv - 0.5; float r = length(c), a = atan(c.y, c.x); float s = sin(a * 4.0 - r * 22.0 + t * 4.0) * 0.5 + 0.5; gl_FragColor = vec4(mix(vec3(0.2, 0.9, 0.6), vec3(1.0, 0.9, 0.5), s), (1.0 - r * 2.0) * 0.95); }' }));
      swirl.rotation.x = -Math.PI / 2; swirl.position.y = 0.7; g.add(swirl);
      game.path.place(g, h.s, h.y, 0); game.scene.add(g);
      return { ...h, g, swirl };
    });
    // the mini-game stage: its own scene, camera and lights
    const S = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.3, 800);
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3a5a30, 1.4); S.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d0, 2.4); this.sun.position.set(10, 30, 12); this.sun.castShadow = true;
    const sc = this.sun.shadow.camera; sc.left = sc.bottom = -24; sc.right = sc.top = 24; this.sun.shadow.mapSize.set(1024, 1024); S.add(this.sun);
    this.hero = makeHero(); this.hero.traverse((o) => { if (o.isMesh) o.castShadow = true; }); S.add(this.hero);
    this.fx = new FX(S, 500);
    this.stage = new THREE.Group(); S.add(this.stage);
  }
  // ── main-world side
  step(h) {
    const game = this.game, p = game.player; if (this.active || p.state !== 'normal') return;
    this.near = null;
    for (const hl of this.hollows) if (Math.abs(hl.s - p.s) < 1.3 && Math.abs(hl.y - p.y) < 1.2 && p.grounded) this.near = hl;
    if (this.near && game.input.peek('down') && !p.mount && !p.cart) { game.input.consume('down'); this.enter(this.near); }
  }
  updateWorld(dt, t) {
    for (const hl of this.hollows) hl.swirl.material.uniforms.t.value = t;
    if (!this.active) this.game.hud.prompt(this.near && this.game.player.state === 'normal' ? `↓ Dive into the Root Hollow · ${this.near.name}` : null, 'hollow');
  }
  enter(hl) {
    const game = this.game, p = game.player;
    p.state = 'cutscene'; p.vs = 0; game.audio.play('portal');
    let k = 0; const iv = setInterval(() => { k += 0.05; p.y -= 0.12; if (k > 0.6) { clearInterval(iv); this.start(hl.game, hl); } }, 30);
    $('fade').style.opacity = 1;
  }
  start(kind, hl) {
    const game = this.game, M = MINIS[kind];
    this.active = { kind, hl, t: 0, score: 0, state: 'count', count: 3, M };
    game.state = 'mini'; game.hud.prompt(null, 'hollow');
    const rp = game.composer.passes[0]; this.saved = { scene: rp.scene, camera: rp.camera, fog: game.scene.fog, ao: game.gfx.gtao.enabled }; game.gfx.gtao.enabled = false;
    rp.scene = this.scene; rp.camera = this.camera;
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.stage.clear(); this.fx.cursor = 0;
    this['build_' + kind](hl);
    this.pl = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, ground: true, stun: 0, dash: 0 };
    $('mini-hud').classList.remove('hidden'); $('hud').classList.add('hidden'); document.body.classList.add('mini'); $('touch').classList.add('mini');
    this.hudText(`${M.name}`, M.sub);
    setTimeout(() => { $('fade').style.opacity = 0; }, 150);
    game.audio.intensity = 0.8; game.audio.theme = kind === 'echo' ? 6 : 1;
  }
  hudText(title, sub) { $('mini-title').textContent = title; $('mini-sub').textContent = sub || ''; }
  finish() {
    const game = this.game, A = this.active, M = A.M;
    A.state = 'done';
    const gold = A.score >= M.gold, P = game.progress; P.mini ||= {};
    const best = Math.max(P.mini[A.kind] || 0, A.score); const newBest = A.score > (P.mini[A.kind] || 0); P.mini[A.kind] = best;
    const reward = A.kind === 'echo' ? A.score * 5 : A.kind === 'skydrop' ? A.score * 2 : A.score;
    game.addGlims(reward);
    let prize = '';
    if (gold && !P.owned.includes('hat_party')) { P.owned.push('hat_party'); prize = '<p class="unlock">You won the <b>Party Hat</b>! Wear it from Pim’s Stall.</p>'; }
    game.audio.play(gold ? 'win' : 'checkpoint');
    $('clear').innerHTML = `<div class="kicker">${M.name.toLowerCase()}</div><h2>${gold ? '★ GOLD ★' : A.score >= M.gold * 0.6 ? 'Nicely done!' : 'Good try!'}</h2><p class="big">${A.score} ${M.unit}</p><p>best ${best}${newBest ? ' · new best!' : ''} · gold at ${M.gold} · +${reward} glims</p>${prize}`;
    $('clear').classList.add('on'); game.saveGame();
    setTimeout(() => { $('clear').classList.remove('on'); this.exit(); }, prize ? 3600 : 2600);
  }
  exit() {
    const game = this.game, A = this.active, p = game.player;
    $('fade').style.opacity = 1;
    setTimeout(() => {
      const rp = game.composer.passes[0]; rp.scene = this.saved.scene; rp.camera = this.saved.camera; game.gfx.gtao.enabled = this.saved.ao;
      $('mini-hud').classList.add('hidden'); $('hud').classList.remove('hidden'); document.body.classList.remove('mini'); $('touch').classList.remove('mini');
      this.stage.clear(); this.active = null;
      p.s = A.hl.s; p.y = A.hl.y + 0.2; p.vy = 12; p.vs = 0; p.state = 'normal'; p.grounded = false;
      game.state = 'play'; game.last = performance.now(); game.snapTheme = true; game.director.update(0.016, p, true);
      $('fade').style.opacity = 0; game.audio.intensity = 0.2;
    }, 450);
  }
  // ── the stage, per frame
  update(dt) {
    const A = this.active; if (!A) return;
    A.t += dt;
    if (A.state === 'count') { const c = 3 - Math.floor(A.t / 0.8); if (c !== A.count) { A.count = c; if (c > 0) { this.hudText(String(c), A.M.sub); this.game.audio.play('notice'); } } if (A.t > 2.4) { A.state = 'play'; A.t = 0; this.hudText('GO!', A.M.sub); this.game.audio.play('leap'); } }
    this['tick_' + A.kind](dt, A.state === 'play');
    if (A.state === 'play' && A.M.time && A.t >= A.M.time) this.finish();
    $('mini-score').textContent = `${A.score} ${A.M.unit}`;
    $('mini-time').textContent = A.M.time ? `${Math.max(0, Math.ceil(A.M.time - (A.state === 'play' ? A.t : 0)))}s` : `round ${(A.round || 0) + 1}`;
    this.fx.update(dt, this.camera.position);
    this.animHero(dt);
  }
  input() { const H = this.game.input.held; return { x: (H.right ? 1 : 0) - (H.left ? 1 : 0), z: (H.down ? 1 : 0) - (H.up ? 1 : 0), jump: this.game.input.consume('jump'), act: this.game.input.consume('action'), H }; }
  animHero(dt) {
    const u = this.hero.userData, pl = this.pl, t = this.game.time, sp = Math.hypot(pl.vx, pl.vz);
    const ph = (this._ph = (this._ph || 0) + dt * (4 + sp * 1.4));
    const a = Math.min(1.1, sp * 0.12);
    u.legs.forEach((l, i) => l.rotation.z = (i ? -1 : 1) * Math.sin(ph) * a);
    u.arms.forEach((l, i) => l.rotation.z = (i ? 1 : -1) * Math.sin(ph) * a + (pl.ground ? 0 : 2.2));
    u.torso.rotation.z = -Math.min(0.3, sp * 0.025);
    u.tail.forEach((s, i) => s.rotation.z = (i ? 0.12 : 0.6) + Math.sin(t * 3 - i * 0.6) * 0.12);
    u.scarf.forEach((s, i) => s.rotation.z = i ? Math.sin(t * 12 - i) * 0.3 : -0.4);
    this.hero.position.set(pl.x, pl.y, pl.z); this.hero.rotation.set(0, pl.yaw, 0);
    if (pl.stun > 0) this.hero.rotation.y += t * 20;
  }
  move3d(dt, allow, speed = 11) {
    const pl = this.pl, I = this.input();
    pl.stun -= dt; pl.dash -= dt;
    let ix = allow && pl.stun <= 0 ? I.x : 0, iz = allow && pl.stun <= 0 ? I.z : 0;
    const l = Math.hypot(ix, iz) || 1; ix /= l; iz /= l;
    const sp = pl.dash > 0 ? 24 : speed;
    pl.vx += (ix * sp - pl.vx) * Math.min(1, dt * 10); pl.vz += (iz * sp - pl.vz) * Math.min(1, dt * 10);
    if (ix || iz) pl.yaw = Math.atan2(-pl.vz, pl.vx);
    if (allow && I.jump && pl.ground) { pl.vy = 13; pl.ground = false; this.game.audio.play('jump'); }
    if (allow && I.act && pl.dash < -0.4) { pl.dash = 0.22; this.game.audio.play('roll'); }
    pl.vy -= 36 * dt; pl.x += pl.vx * dt; pl.z += pl.vz * dt; pl.y += pl.vy * dt;
    return I;
  }

  // ═════════ GLIMSTORM — a 3D island in the clouds ═════════
  build_glimstorm(hl) {
    const night = hl && hl.name.includes('Night');
    this.hemi.color.set(night ? 0x5a60c0 : 0xcfe8ff); this.hemi.intensity = night ? 0.9 : 1.4; this.sun.intensity = night ? 0.8 : 2.4;
    this.scene.background = new THREE.Color(night ? 0x0a0c24 : 0x9cc8f0); this.scene.fog = new THREE.Fog(night ? 0x0a0c24 : 0x9cc8f0, 40, 140);
    const isl = new THREE.Mesh(new THREE.CylinderGeometry(16, 11, 5, 40), new THREE.MeshStandardMaterial({ map: getTex('cliff') })); isl.position.y = -2.5; isl.receiveShadow = true; this.stage.add(isl);
    const top = new THREE.Mesh(new THREE.CircleGeometry(16, 40), new THREE.MeshStandardMaterial({ map: getTex('grass') })); top.rotation.x = -Math.PI / 2; top.position.y = 0.01; top.receiveShadow = true; this.stage.add(top);
    this.pillars = [[-7, -4], [6, 5], [8, -7], [-5, 8]].map(([x, z]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 5, 10), new THREE.MeshStandardMaterial({ map: getTex('ruin') })); m.position.set(x, 2.5, z); m.castShadow = true; this.stage.add(m); return { x, z, r: 1.6 }; });
    for (let i = 0; i < 14; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(4 + Math.random() * 6, 1), new THREE.MeshStandardMaterial({ color: night ? 0x3a3a60 : 0xffffff, transparent: true, opacity: 0.9 })); c.scale.y = 0.4; const a = Math.random() * 6.28, r = 35 + Math.random() * 40; c.position.set(Math.cos(a) * r, -8 + Math.random() * 16, Math.sin(a) * r); this.stage.add(c); }
    if (night) for (let i = 0; i < 200; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.15, 4, 3), new THREE.MeshBasicMaterial({ color: 0xffffff })); const a = Math.random() * 6.28, b = Math.random() * 1.4; s.position.set(Math.cos(a) * 150 * Math.cos(b), 150 * Math.sin(b) + 10, Math.sin(a) * 150 * Math.cos(b)); this.stage.add(s); }
    this.drops = []; this.spawnT = 0; this.night = night;
  }
  tick_glimstorm(dt, play) {
    const pl = this.pl, A = this.active;
    this.move3d(dt, play);
    for (const p of this.pillars) { const dx = pl.x - p.x, dz = pl.z - p.z, d = Math.hypot(dx, dz); if (d < p.r + 0.4) { pl.x = p.x + dx / d * (p.r + 0.4); pl.z = p.z + dz / d * (p.r + 0.4); } }
    const r = Math.hypot(pl.x, pl.z);
    if (r < 16 && pl.y <= 0 && pl.vy <= 0) { pl.y = 0; pl.vy = 0; pl.ground = true; }
    else if (pl.y < -12) { pl.x = 0; pl.z = 0; pl.y = 6; pl.vy = 0; A.score = Math.max(0, A.score - 5); this.game.audio.play('hurt'); }
    else if (r >= 16) pl.ground = false;
    // rain of glims and thorn bombs
    if (play) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = Math.max(0.18, 0.45 - A.t * 0.006);
        const bomb = Math.random() < 0.22 + A.t * 0.004, gold = !bomb && Math.random() < (this.night ? 0.14 : 0.07);
        const a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * 14;
        const x = bomb && Math.random() < 0.6 ? pl.x + (Math.random() - 0.5) * 6 : Math.cos(a) * rr, z = bomb && Math.random() < 0.6 ? pl.z + (Math.random() - 0.5) * 6 : Math.sin(a) * rr;
        const m = new THREE.Mesh(bomb ? new THREE.IcosahedronGeometry(0.6, 0) : new THREE.OctahedronGeometry(gold ? 0.55 : 0.38, 0), bomb ? new THREE.MeshStandardMaterial({ color: 0x3a1a30, emissive: 0xff3060, emissiveIntensity: 1 }) : glow(gold ? 0xffd040 : 0x80ffb0, 2.2));
        m.position.set(x, 18, z); this.stage.add(m);
        const sh = new THREE.Mesh(new THREE.RingGeometry(bomb ? 1.8 : 0.5, bomb ? 2.4 : 0.8, 24), new THREE.MeshBasicMaterial({ color: bomb ? 0xff4060 : 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
        sh.rotation.x = -Math.PI / 2; sh.position.set(x, 0.03, z); this.stage.add(sh);
        this.drops.push({ m, sh, bomb, gold, x, z, y: 18, vy: -10, landed: false, life: 5 });
      }
    }
    for (const d of this.drops) {
      if (!d.landed) { d.vy -= 14 * dt; d.y += d.vy * dt; if (d.y <= 0.5) { d.y = 0.5; d.landed = true; if (d.bomb) { this.fx.burst(new THREE.Vector3(d.x, 0.8, d.z), 0xff4060, 30, 9, 0.8, 0.6, -10); this.game.audio.play('slam'); if (Math.hypot(pl.x - d.x, pl.z - d.z) < 2.6 && pl.y < 2) { pl.stun = 1; A.score = Math.max(0, A.score - 3); this.game.audio.play('hurt'); } d.dead = true; } } }
      else { d.life -= dt; d.m.rotation.y += dt * 3; if (d.life < 1.2) d.m.visible = Math.sin(d.life * 30) > 0; if (d.life <= 0) d.dead = true; }
      d.m.position.set(d.x, d.y + (d.landed ? Math.sin(A.t * 4 + d.x) * 0.15 : 0), d.z); d.m.rotation.x += dt * 2;
      d.sh.material.opacity = d.landed ? 0 : 0.2 + (1 - d.y / 18) * 0.5;
      if (!d.bomb && !d.dead && Math.hypot(pl.x - d.x, pl.z - d.z) < 1.3 && Math.abs(pl.y + 0.6 - d.y) < 1.6) { A.score += d.gold ? 5 : 1; d.dead = true; this.game.audio.play('glim', A.score); this.fx.burst(new THREE.Vector3(d.x, d.y, d.z), d.gold ? 0xffd040 : 0x9fffc0, d.gold ? 20 : 8, 4, 0.5, 0.5, 0); }
      if (d.dead) { this.stage.remove(d.m); this.stage.remove(d.sh); }
    }
    this.drops = this.drops.filter((d) => !d.dead);
    // camera: high three-quarter view that drifts with Kiri
    const c = this.camera; c.position.lerp(new THREE.Vector3(pl.x * 0.6, 17, pl.z * 0.6 + 19), Math.min(1, dt * 3)); c.lookAt(pl.x * 0.8, 0, pl.z * 0.8);
  }

  // ═════════ SKY DROP — freefall through the clouds ═════════
  build_skydrop() {
    this.hemi.color.set(0xe0f0ff); this.hemi.intensity = 1.5; this.sun.intensity = 2.6;
    this.scene.background = new THREE.Color(0x8ec0f0); this.scene.fog = new THREE.Fog(0x8ec0f0, 20, 110);
    this.rings = []; this.rocks = []; this.clouds = [];
    const ringMat = glow(0xffd060, 2.2), rockMat = new THREE.MeshStandardMaterial({ map: getTex('cliff'), flatShading: true });
    for (let i = 0; i < 30; i++) {
      const y = -30 - i * 24, a = Math.random() * 6.28, r = Math.random() * 7;
      const m = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.22, 8, 30), ringMat.clone()); m.rotation.x = Math.PI / 2; m.position.set(Math.cos(a) * r, y, Math.sin(a) * r); this.stage.add(m); this.rings.push({ m, done: false });
      if (i > 2) for (let k = 0; k < 2; k++) { const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4 + Math.random(), 0), rockMat); rk.position.set((Math.random() - 0.5) * 16, y - 12 + Math.random() * 6, (Math.random() - 0.5) * 16); rk.castShadow = true; this.stage.add(rk); this.rocks.push(rk); }
    }
    for (let i = 0; i < 60; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + Math.random() * 5, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); c.scale.y = 0.5; const a = Math.random() * 6.28; c.position.set(Math.cos(a) * (14 + Math.random() * 10), -Math.random() * 760, Math.sin(a) * (14 + Math.random() * 10)); this.stage.add(c); this.clouds.push(c); }
    this.streak = 0;
  }
  tick_skydrop(dt, play) {
    const pl = this.pl, A = this.active, I = this.input();
    pl.stun -= dt;
    const tx = play && pl.stun <= 0 ? I.x * 12 : 0, tz = play && pl.stun <= 0 ? I.z * 12 : 0;
    pl.vx += (tx - pl.vx) * Math.min(1, dt * 5); pl.vz += (tz - pl.vz) * Math.min(1, dt * 5);
    pl.x += pl.vx * dt; pl.z += pl.vz * dt;
    const R = Math.hypot(pl.x, pl.z); if (R > 10) { pl.x *= 10 / R; pl.z *= 10 / R; }
    const prevY = pl.y; if (play) pl.y -= 23 * dt;
    pl.ground = false;
    for (const r of this.rings) if (!r.done && prevY >= r.m.position.y && pl.y < r.m.position.y) {
      r.done = true;
      if (Math.hypot(pl.x - r.m.position.x, pl.z - r.m.position.z) < 2.2) { A.score++; this.streak++; r.m.material.emissive.setHex(0x60ff90); this.game.audio.play('glim', this.streak); this.fx.burst(r.m.position.clone(), 0xffd060, 20, 6, 0.6, 0.5, 0); if (this.streak % 5 === 0) this.hudText(`${this.streak} in a row!`, ''); }
      else { this.streak = 0; r.m.material.emissiveIntensity = 0.3; }
    }
    for (const rk of this.rocks) if (pl.stun <= 0 && Math.abs(rk.position.y - pl.y) < 1.8 && Math.hypot(rk.position.x - pl.x, rk.position.z - pl.z) < 2) { pl.stun = 0.8; this.streak = 0; this.game.audio.play('hurt'); this.game.shake?.(0.3); this.fx.burst(new THREE.Vector3(pl.x, pl.y, pl.z), 0xc0a080, 16, 6, 0.6, 0.5, 0); }
    if (play && Math.random() < dt * 40) this.fx.spawn(new THREE.Vector3(pl.x + (Math.random() - 0.5) * 20, pl.y - 20, pl.z + (Math.random() - 0.5) * 20), new THREE.Vector3(0, 60, 0), 0xffffff, 0.3, 0.6, 0);
    this.hero.userData.body.rotation.x = 0;
    const c = this.camera; c.position.set(pl.x * 0.5, pl.y + 11, pl.z * 0.5 + 5); c.lookAt(pl.x, pl.y - 8, pl.z);
    this.heroPose = 'fall';
    if (play && this.rings.every((r) => r.done)) this.finish();
  }

  // ═════════ ECHO STONES — the song game ═════════
  build_echo() {
    this.hemi.color.set(0x8a90e0); this.hemi.intensity = 0.8; this.sun.intensity = 0.9;
    this.scene.background = new THREE.Color(0x0a0c22); this.scene.fog = new THREE.Fog(0x0a0c22, 30, 120);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 40), new THREE.MeshStandardMaterial({ map: getTex('grass'), color: 0x8090b0 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.stage.add(ground);
    const cols = [0x60e0ff, 0xffd060, 0xff70c0, 0x80ff90];
    this.stones = [[-6, 0], [0, -6], [6, 0], [0, 6]].map(([x, z], i) => {
      const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(2, 4.5, 1.2), new THREE.MeshStandardMaterial({ map: getTex('ruin') })); m.position.y = 2.25; m.castShadow = true; g.add(m);
      const rune = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), glow(cols[i], 0.3)); rune.position.set(0, 2.8, 0.62); g.add(rune);
      g.position.set(x, 0, z); g.lookAt(0, 0, 0); this.stage.add(g); return { g, rune, col: cols[i], x, z };
    });
    for (let i = 0; i < 160; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 3), new THREE.MeshBasicMaterial({ color: 0xffffff })); const a = Math.random() * 6.28, b = 0.2 + Math.random() * 1.2; s.position.set(Math.cos(a) * 100 * Math.cos(b), 100 * Math.sin(b), Math.sin(a) * 100 * Math.cos(b)); this.stage.add(s); }
    const A = this.active; A.round = 0; A.seq = []; A.phase = 'wait'; A.pt = 0;
  }
  tick_echo(dt, play) {
    const A = this.active, pl = this.pl, notes = [0, 4, 7, 12];
    this.stones.forEach((st) => st.rune.material.emissiveIntensity += (0.3 - st.rune.material.emissiveIntensity) * Math.min(1, dt * 5));
    const light = (i) => { const st = this.stones[i]; st.rune.material.emissiveIntensity = 4; this.game.audio.tone(330 * Math.pow(2, notes[i] / 12), 0.5, 'sine', 0.18); this.fx.burst(new THREE.Vector3(st.x, 2.8, st.z), st.col, 12, 3, 0.5, 0.5, 0); };
    if (!play) return this.echoCam(dt);
    A.pt += dt;
    if (A.phase === 'wait' && A.pt > 0.8) { A.seq.push(Math.floor(Math.random() * 4)); if (A.seq.length < 3) A.seq.push(Math.floor(Math.random() * 4), Math.floor(Math.random() * 4)); A.phase = 'show'; A.pt = 0; A.si = 0; this.hudText(`Round ${A.round + 1}`, 'listen…'); }
    if (A.phase === 'show') { const gap = Math.max(0.35, 0.6 - A.round * 0.03); if (A.pt > gap) { A.pt = 0; if (A.si < A.seq.length) light(A.seq[A.si++]); else { A.phase = 'input'; A.ii = 0; this.hudText(`Round ${A.round + 1}`, 'your turn: ←↑→↓'); } } }
    if (A.phase === 'input') {
      const I = this.game.input, map = { left: 0, up: 1, right: 2, down: 3 };
      for (const k in map) if (I.consume(k)) {
        const i = map[k]; light(i); const st = this.stones[i]; pl.yaw = Math.atan2(-st.z, st.x); pl.vy = 6; pl.ground = false;
        if (i !== A.seq[A.ii]) { this.hudText('Off-key!', ''); this.game.audio.play('hurt'); A.phase = 'over'; A.pt = 0; break; }
        A.ii++;
        if (A.ii >= A.seq.length) { A.round++; A.score = A.round; this.game.audio.play('checkpoint'); A.phase = 'wait'; A.pt = 0; this.hudText('Beautiful!', ''); break; }
      }
    }
    if (A.phase === 'over' && A.pt > 1.2) this.finish();
    pl.vy -= 30 * dt; pl.y = Math.max(0, pl.y + pl.vy * dt); pl.ground = pl.y <= 0;
    this.echoCam(dt);
  }
  echoCam() { const c = this.camera; c.position.set(0, 13, 12); c.lookAt(0, 1.5, 0); }
}
