import * as THREE from 'three';
import { makeHero } from './models.js';
import { moveBody, overlap } from './physics.js';
import { COMPANIONS } from './entities.js';

const approach = (v, t, a) => (v < t ? Math.min(v + a, t) : Math.max(v - a, t));
const MOUNT = {
  none: { hw: 0.38, h: 1.3, run: 10, jump: 15.5 },
  beast: { hw: 0.95, h: 2.3, run: 12, jump: 14.5 },
  frog: { hw: 0.75, h: 2.0, run: 9, jump: 22 },
  bird: { hw: 0.75, h: 2.1, run: 8, jump: 13 },
  fish: { hw: 0.85, h: 1.8, run: 6, jump: 11 },
  oru: { hw: 0.75, h: 2.3, run: 10, jump: 15.5 },
  cart: { hw: 1.0, h: 2.0, run: 24, jump: 15.5 },
};
const O = 80;

export class Player {
  constructor(game) {
    this.game = game;
    this.model = makeHero(); game.scene.add(this.model);
    this.model.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.tongueLine = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6), new THREE.MeshStandardMaterial({ color: 0xff5a7a, emissive: 0x401020 }));
    this.tongueLine.visible = false; game.scene.add(this.tongueLine);
    this.maxHearts = 3;
    this.reset(game.level.start.s, game.level.start.y);
  }
  reset(s, y) {
    Object.assign(this, { s, y, vs: 0, vy: 0, g: 1, facing: 1, turn: 0, state: 'normal', grounded: false, ground: null, onSlope: null, wallDir: 0,
      mount: null, comp: null, invuln: 0, coyote: 0, jumpBuf: 0, rollT: 0, rollCool: 0, slamming: false, chain: 0, vine: null, vineR: 0,
      cart: null, inWater: false, birdTime: 0, flipCool: 0, grapT: null, chargeT: 0, dashT: 0, idleT: 0, animT: 0, squash: 0, landT: 0,
      wallT: 0, wallD: 0, remountCool: 0, leapReady: true, songHold: 0, sang: false, stillT: 0, gripD: 0, lastFlap: -9, mossHinted: this.mossHinted, deadT: 0, hitstop: 0, dropThrough: 0, hearts: this.hearts ?? 3, tongueT: 0, tongueTo: null, airT: 0, wasSlope: null, hurtT: 0 });
    this.hearts = this.maxHearts;
    this.applyMount();
  }
  get dims() { return MOUNT[this.cart ? 'cart' : (this.mount || 'none')]; }
  applyMount() { const d = this.dims; this.hw = d.hw; this.h = d.h; }
  get center() { return this.y + this.h / 2; }

  // ───────────────────────── mount management
  mountOn(c) {
    const game = this.game;
    if (this.comp && this.comp !== c) this.dismount(false);
    c.state = 'ridden'; this.comp = c; this.mount = c.kind; this.g = 1; c.hop = 1; this.squash = 0.35;
    this.applyMount();
    if (this.grounded) this.vy = 6;
    if (c.kind === 'bird') this.birdTime = 26;
    game.audio.play('mount');
    const first = !game.stats.met[c.kind];
    game.stats.met[c.kind] = true;
    game.banner(c.def.name, c.def.title);
    game.toast(c.def.tip + (game.input.isTouch ? '<br><small>Tap ⏏ to hop off</small>' : ''), 5);
    game.fx.burst(game.path.world(this.s, this.y + 1, 0), 0xfff0a0, 30, 8, 0.8, 0.8, -4);
    if (first) game.camPunch(0.8);
  }
  dismount(flee, dir = -1) {
    const c = this.comp; if (!c) return;
    const game = this.game;
    this.mount = null; this.comp = null; this.g = 1;
    const oldH = this.h; this.applyMount();
    if (flee) { c.state = 'fleeing'; c.t = 0; c.fleeDir = dir; c.fy = this.y; c.fvy = 8; c.y = this.y; c.s = this.s; }
    else { c.state = 'idle'; c.s = this.s; c.y = this.game.entities.groundUnder(this.s, this.y + 0.5); if (!isFinite(c.y)) { c.state = 'fleeing'; c.t = 0; c.fleeDir = -this.facing; c.fy = this.y; c.fvy = 6; c.y = this.y; } c.t = 0; c.facing = this.facing; }
    this.remountCool = 0.8;
    this.vy = 11; this.grounded = false;
    game.audio.play('dismount');
    game.hud.mount(null);
    if (oldH > this.h) this.y += 0; // keep feet
  }

  hurt(reason) {
    const game = this.game;
    if (this.invuln > 0 || this.state === 'dead' || this.state === 'cutscene') return;
    if (this.cart) return game.killPlayer(reason);
    game.shake(0.5); game.audio.play('hurt');
    if (this.comp) { this.dismount(true, -this.facing); this.invuln = 1.5; this.vy = 12; return; }
    this.hearts--; this.invuln = 1.7; this.hurtT = 0.5;
    this.vs = -this.facing * 7; this.vy = 10 * this.g; this.state = 'normal'; this.rollT = 0;
    game.hud.hearts(this.hearts, this.maxHearts);
    if (this.hearts <= 0) game.killPlayer(reason);
  }

  // ───────────────────────── main step
  step(dt, input) {
    const game = this.game, E = game.entities;
    this.animT += dt;
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.invuln = Math.max(0, this.invuln - dt); this.rollCool -= dt; this.flipCool -= dt; this.remountCool -= dt; this.hurtT -= dt;
    this.dropThrough -= dt; this.wallT -= dt; this.tongueT -= dt;
    if (this.state === 'dead') { this.deadT += dt; if (this.deadT > 0.8) game.respawn(); return; }
    if (this.state === 'cutscene') { this.vs = approach(this.vs, 0, 20 * dt); this.move(dt); return; }
    const H = input.held;
    const dir = (H.right ? 1 : 0) - (H.left ? 1 : 0);
    const freshJump = input.peek('jump');
    if (freshJump) { this.jumpBuf = 0.13; input.consume('jump'); }
    else this.jumpBuf -= dt;
    let action = input.consume('action');
    const off = input.consume('dismount');
    if (this.comp && !this.cart && (off || (action && H.down))) { this.dismount(false); action = false; }

    const M = game.magic;
    if (input.peek('up') && M.nearWay && this.state === 'normal' && this.grounded && !this.cart) { input.consume('up'); game.openTravel(); return; }
    if (!H.up) this.upLock = false;
    if (this.state === 'grip' || this.state === 'vine') this.upLock = true;
    if (H.up && !this.upLock && M.has('song') && !M.nearWay && this.state === 'normal' && !this.inWater && !this.cart) { this.songHold += dt; if (this.songHold > 0.45 && !this.sang) { this.sang = true; M.sing(); } }
    else { this.songHold = 0; this.sang = false; }
    this.stillT = (!dir && this.grounded && Math.abs(this.vs) < 0.5 && !action) ? this.stillT + dt : 0;
    if (this.state === 'grip') return this.stepGrip(dt, dir, H);
    if (this.state === 'vine') return this.stepVine(dt, dir, H, input);
    if (this.state === 'grapple') return this.stepGrapple(dt);
    if (this.cart) return this.stepCart(dt, H);

    const m = this.dims;
    const wasGrounded = this.grounded;
    if (this.grounded) { this.coyote = this.rollT > 0 ? 0.16 : 0.1; this.airT = 0; } else { this.coyote -= dt; this.airT += dt; }
    this.inWater = this.checkWater();

    // ── horizontal control
    const swimming = this.inWater && !(this.mount === 'fish');
    const fishSwim = this.inWater && this.mount === 'fish';
    let run = m.run;
    if (swimming) run = 6;
    if (fishSwim) run = 13;
    if (this.mount === 'bird' && !this.grounded) run = 12;
    const charging = this.chargeT > 0, rolling = this.rollT > 0, dashing = this.dashT > 0;
    if (dir) this.facing = rolling || charging || dashing ? this.facing : dir;
    if (rolling) { this.rollT -= dt; if (this.grounded) this.vs = approach(this.vs, this.facing * 10, 8 * dt); }
    else if (charging) { this.chargeT -= dt; this.vs = this.facing * 20; if (Math.random() < dt * 40) game.fx.spawn(game.path.world(this.s - this.facing, this.y + 0.2, (Math.random() - 0.5) * 2), new THREE.Vector3(0, 2, 0), 0xc0a070, 0.8, 0.5, 0); }
    else if (dashing) { this.dashT -= dt; }
    else if (fishSwim || swimming) {
      const vIn = dir * run;
      this.vs = approach(this.vs, vIn, (fishSwim ? 40 : 25) * dt);
    } else {
      const acc = this.grounded ? 75 : 45;
      if (dir) {
        if (Math.abs(this.vs) > run && Math.sign(this.vs) === dir) this.vs = approach(this.vs, dir * run, (this.grounded ? 12 : 2) * dt);
        else this.vs = approach(this.vs, dir * run, acc * (Math.sign(this.vs) !== dir ? 1.9 : 1) * dt);
        if (this.grounded && Math.sign(this.vs) !== dir && Math.abs(this.vs) > 4 && Math.random() < 0.5) game.fx.spawn(game.path.world(this.s, this.y + 0.1, 0), new THREE.Vector3(0, 1.5, 0), 0xd8c8a0, 0.6, 0.4, 0);
      } else this.vs = approach(this.vs, 0, (this.grounded ? 55 : 6) * dt);
    }

    // ── vertical: water / flight / gravity
    const g = this.g;
    let vyr = this.vy * g;
    if (fishSwim) {
      const up = (H.up || H.jump ? 1 : 0) - (H.down ? 1 : 0);
      if (!dashing) vyr = approach(vyr, up * 12, 40 * dt);
      if (action && this.dashT <= 0) { this.dashT = 0.45; const d = new THREE.Vector2(dir || (up ? 0 : this.facing), up).normalize(); this.vs = d.x * 25; vyr = d.y * 25; game.audio.play('roll'); action = false; }
      if (this.jumpBuf > 0 && this.center > this.waterTop - 0.6) { vyr = 15; this.jumpBuf = 0; game.audio.play('splash'); }
    } else if (swimming) {
      const up = (H.up || H.jump ? 1 : 0) - (H.down ? 1 : 0);
      vyr = approach(vyr, up ? up * 5 : -1.2, 22 * dt);
      if (this.jumpBuf > 0 && this.center > this.waterTop - 0.7) { vyr = 13; this.jumpBuf = 0; game.audio.play('splash'); }
    } else {
      let G = vyr > 0 ? (input.held.jump ? 34 : 75) : 50;
      if (Math.abs(vyr) < 2.5 && input.held.jump) G *= 0.6;
      if (this.slamming) G = 0;
      vyr -= G * dt;
      if (this.mount === 'bird' && !this.grounded) {
        if (this.birdTime > 0 && input.held.jump && vyr < -2.2) vyr = -2.2; // glide
      }
      vyr = Math.max(vyr, -32);
    }
    // updrafts
    for (const u of E.updrafts) if (this.s > u.s0 && this.s < u.s1 && this.center > u.y0 && this.center < u.y1) vyr = Math.min(vyr + (this.mount === 'bird' ? 90 : 25) * dt, this.mount === 'bird' ? 17 : 4);

    // ── jumping
    if (this.jumpBuf > 0 && !this.inWater) {
      if (this.grounded || this.coyote > 0) {
        vyr = m.jump + (this.wasSlope && this.slopeLaunch > 0 ? this.slopeLaunch : 0);
        this.jumpBuf = 0; this.coyote = 0; this.grounded = false; this.squash = -0.3;
        if (rolling) { this.rollT = 0; this.rollJump = true; }
        game.audio.play(this.mount === 'frog' ? 'bigjump' : 'jump');
        game.fx.burst(game.path.world(this.s, this.y + 0.1, 0), 0xe0d0b0, 6, 3, 0.6, 0.4, 0);
        if (this.mount === 'frog') game.shake(0.1);
      } else if (this.mount === 'frog' && this.wallT > 0) {
        vyr = 18; this.vs = -this.wallD * 11; this.facing = -this.wallD; this.jumpBuf = 0; this.wallT = 0; game.audio.play('bigjump'); this.leapReady = true; M.chainEvent();
        game.fx.burst(game.path.world(this.s + this.wallD * this.hw, this.y + 1, 0), 0x80ff90, 10, 4, 0.6, 0.4, 0);
      } else if (this.mount === 'bird' && this.birdTime > 0) {
        if (M.has('leap') && this.leapReady && this.animT - this.lastFlap < 0.3) { // Sunflare: double-tap
          vyr = 19; this.birdTime += 3; this.leapReady = false; game.audio.play('leap'); M.chainEvent();
          game.fx.burst(game.path.world(this.s, this.y + 1, 0), 0xffb040, 36, 10, 0.8, 0.8, 0); game.hud.toast('<b>Sunflare!</b> Sola catches her second wind', 1.5);
        } else { vyr = Math.max(vyr, 10.5); game.audio.play('flap'); this.flapT = 0.3; }
        this.lastFlap = this.animT; this.jumpBuf = 0;
      } else if (freshJump && this.leapReady && M.has('leap') && this.airT > 0.06) {
        vyr = this.leap(dir); this.jumpBuf = 0;
      }
    }

    // ── action
    if (action) {
      if (!this.mount) {
        if (this.grounded && this.rollCool <= 0 && !swimming) { this.rollT = 0.42; this.rollCool = 0.5; this.vs = this.facing * Math.max(Math.abs(this.vs) + 4, 15.5); game.audio.play('roll'); }
        else if (!this.grounded && !swimming && !this.slamming) { this.slamming = true; vyr = -30; this.vs *= 0.25; game.audio.play('flap'); }
      } else if (this.mount === 'beast') {
        if (this.grounded && this.chargeT <= 0) { this.chargeT = 0.75; game.audio.play('roll'); game.shake(0.25); }
        else if (!this.grounded && !this.slamming) { this.slamming = true; vyr = -30; }
      } else if (this.mount === 'frog') { this.tongue(); }
      else if (this.mount === 'bird') { if (!this.grounded && !this.slamming) { this.slamming = true; vyr = -30; this.vs = this.facing * 8; game.audio.play('flap'); } }
      else if (this.mount === 'oru') {
        if (this.flipCool <= 0) {
          const inCave = this.s > 905 + O && this.s < 1100 + O;
          if (inCave || this.g === -1) { this.g *= -1; vyr = -vyr * 0.3 + 2; this.flipCool = 0.35; this.grounded = false; game.audio.play('flip'); game.stats.flips++; game.fx.burst(game.path.world(this.s, this.center, 0), 0xb080ff, 30, 7, 0.7, 0.6, 0); }
          else { game.toast('Oru hums… it needs ancient stone overhead to invert.', 2.5); this.flipCool = 1; }
        }
      }
    }
    this.vy = vyr * this.g;
    // undocumented: holding the song in mid-air lets the light hold Kiri up for a breath
    if (H.up && M.has('song') && !this.grounded && !this.mount && !this.inWater && this.vy < 0 && (this.floatT || 0) < 0.8) { this.vy = Math.max(this.vy, -2.6); this.floatT = (this.floatT || 0) + dt; if (Math.random() < dt * 30) game.fx.spawn(game.path.world(this.s, this.y + 0.2, 0), new THREE.Vector3(0, -1, 0), 0xa0f0ff, 0.35, 0.6, 0); if (!game.stats.float) { game.stats.float = true; game.hud.toast('The song holds Kiri up…', 2); } }
    if (this.grounded) this.floatT = 0;
    if (this.mount === 'oru' && this.g === -1 && this.y > 75) { this.g = 1; }

    // ── integrate
    const prevAir = !this.grounded, prevVy = this.vy;
    this.move(dt);
    // left a slope while moving upward → launch
    if (wasGrounded && !this.grounded && this.wasSlope && this.vy <= 0 && this.g === 1) {
      const sl = this.wasSlope; const grad = (sl.yb - sl.ya) / (sl.s1 - sl.s0) * Math.sign(this.vs);
      if (grad > 0) this.vy = Math.abs(this.vs) * grad;
    }
    this.wasSlope = this.onSlope;
    this.slopeLaunch = this.onSlope ? Math.max(0, (this.onSlope.yb - this.onSlope.ya) / (this.onSlope.s1 - this.onSlope.s0) * this.vs) : 0;
    if (this.wallDir && !this.grounded) { this.wallT = 0.14; this.wallD = this.wallDir; }
    // landing
    if (prevAir && this.grounded) this.onLand(prevVy);
    if (this.grounded) { this.rollJump = false; this.leapReady = true; }
    if (!this.mount && M.has('grip') && this.g === 1 && !this.grounded && this.wallDir && this.wallSolid && this.wallSolid.moss && this.vy < 7 && this.state === 'normal') { this.state = 'grip'; this.gripD = this.wallDir; this.leapReady = true; this.slamming = false; game.audio.play('vine'); }
    else if (!M.has('grip') && this.wallSolid && this.wallSolid.moss && !this.mossHinted) { this.mossHinted = true; game.toast('The glowing moss pulses under Kiri\u2019s paws… but won\u2019t hold. Not yet.', 3.5); }
    // falling death
    if (this.y < (this.y < -100 || this.deepZone ? -180 : -52) || this.y > 340) game.killPlayer('Fell!');
    this.deepZone = this.y < -100;
    if (this.grounded) this.skyZone = this.y > 280 ? 285 : this.y > 150 ? 185 : 0;
    if (this.skyZone && this.y < this.skyZone && this.state !== 'dead') { this.skyZone = 0; game.killPlayer('Kiri tumbles out of the sky…'); }
  }
  move(dt) {
    const E = this.game.entities;
    moveBody(this, E.solids, E.slopes, dt, (o, d, axis) => this.onHitSolid(o, d, axis));
  }
  onHitSolid(o, d, axis) {
    const E = this.game.entities;
    if (o.crack === 'beast' && this.mount === 'beast' && (this.chargeT > 0 || Math.abs(this.vs) > 11) && axis === 'x') { E.breakSolid(o); this.game.stats.walls++; this.hitstop = 0.06; return true; }
    if (o.crack === 'swim' && this.mount === 'fish' && this.dashT > 0) { E.breakSolid(o); this.game.stats.walls++; this.hitstop = 0.06; return true; }
    if (o.crack && axis === 'x' && Math.abs(this.vs) > 5 && !this._crackHint) { this._crackHint = true; this.game.toast(o.crack === 'beast' ? 'This wall is cracked… something strong could smash it.' : 'A cracked seal… something fast could burst through.', 3); }
    return false;
  }
  onLand(prevVy) {
    const game = this.game;
    const impact = Math.abs(prevVy);
    this.squash = Math.min(0.45, impact * 0.018);
    if (impact > 8) { game.audio.play('land'); game.fx.burst(game.path.world(this.s, this.y + 0.1, 0), this.game.currentTheme === 3 ? 0x8070c0 : 0xd8c8a0, 8, 4, 0.7, 0.5, 0); }
    if (this.slamming) {
      this.slamming = false;
      game.onSlam(this.s, this.y, this.g);
      this.vy = 7 * this.g; this.grounded = false;
    }
    this.chain = 0; this.lastGrap = null;
    if (this.mount === 'bird' && this.birdTime <= 0) { const c = this.comp; this.dismount(true, 1); game.toast('Sola is tired and flies home.', 2.5); }
  }
  checkWater() {
    const c = this.center;
    for (const w of this.game.level.water) if (this.s > w.s0 && this.s < w.s1 && c > w.y0 && c < w.y1) {
      if (!this.inWater) { this.game.audio.play('splash'); this.game.fx.burst(this.game.path.world(this.s, w.y1, 0), 0xc0f0ff, 20, 6, 0.6, 0.6, -12); this.slamming = false; this.rollT = 0; this.chargeT = 0; if (this.g === -1) this.g = 1; }
      this.waterTop = w.y1; this.leapReady = true; return true;
    }
    return false;
  }
  leap(dir) {
    const game = this.game, M = game.magic;
    this.leapReady = false; this.slamming = false;
    let vyr = 13.5;
    const w = game.path.world(this.s, this.y + 0.6, 0);
    if (this.mount === 'beast') { vyr = 8; this.chargeT = 0.45; this.vs = this.facing * 20; game.toast('<b>Horn Comet!</b>', 1); game.shake(0.3); }
    else if (this.mount === 'frog') { vyr = 20; }
    else if (this.mount === 'fish') { vyr = 14; }
    else if (this.rollJump) { // undocumented: leaping out of a roll-jump becomes a Comet Leap
      const d = dir || this.facing; this.vs = d * Math.max(Math.abs(this.vs) + 3, 17.5); this.facing = d; vyr = 11.5;
      if (!game.stats.comet) { game.stats.comet = true; game.hud.toast('<b>Comet Leap!</b> (roll, jump, leap)', 2.5); }
      game.fx.burst(w, 0xffd070, 20, 7, 0.6, 0.6, 0);
    }
    else if (dir) { this.vs = dir * Math.max(Math.abs(this.vs), 10.5); this.facing = dir; }
    game.audio.play('leap'); M.chainEvent();
    const f = game.path.frame(this.s);
    game.fx.ring(w, this.mount === 'beast' ? 0xffc080 : 0xbff4ff, 18, 5, 0.45, new THREE.Vector3(f.tx, 0, f.tz), new THREE.Vector3(f.nx, 0, f.nz));
    game.fx.burst(w, 0xffffff, 8, 3, 0.5, 0.4, -4);
    this.squash = -0.35; this.leapSpin = 1;
    return vyr;
  }
  stepGrip(dt, dir, H) {
    const game = this.game, w = this.gripD;
    this.facing = w;
    if (this.jumpBuf > 0) {
      this.jumpBuf = 0; this.state = 'normal'; this.vy = 15; this.vs = -w * 9.5; this.facing = -w; this.leapReady = true;
      game.audio.play('jump'); game.magic.chainEvent(); game.fx.burst(game.path.world(this.s + w * this.hw, this.y + 0.8, 0), 0x8affc0, 10, 4, 0.5, 0.4, 0); return;
    }
    if (dir === -w) { this.state = 'normal'; this.vs = -w * 3; return; }
    this.vy = H.up ? 4.5 : H.down ? -7 : -0.7;
    this.vs = w * 0.6;
    this.move(dt);
    if (this.grounded) { this.state = 'normal'; return; }
    if (!this.wallDir || !this.wallSolid || !this.wallSolid.moss) { this.state = 'normal'; if (this.vy > 0 || H.up) { this.vy = 10; this.vs = w * 4; } }
    if (Math.random() < dt * 6 && Math.abs(this.vy) > 1) game.fx.spawn(game.path.world(this.s + w * this.hw, this.y + 0.3, 0.3), new THREE.Vector3(0, -1, 0), 0x8affc0, 0.3, 0.5, 0);
  }
  applyCosmetics() {
    if (!this.game.magic.cosmetic.scarf) return;
    this.model.traverse((o) => { if (o.isMesh && o.material.color && o.material.color.getHex() === 0x2fbfae) { o.material.color.setHex(0xffc030); o.material.emissive = new THREE.Color(0x805000); o.material.emissiveIntensity = 0.8; } });
  }
  tongue() {
    const game = this.game, E = game.entities;
    if (this.tongueT > 0) return;
    let best = null, bd = 11.5;
    for (const gp of E.grapples) { if (gp.hidden) continue; const d = Math.hypot(gp.s - this.s, gp.y - (this.y + 1.4)); const fwd = (gp.s - this.s) * this.facing > -2; if (d < bd && d > 2.2 && fwd && gp.y > this.y - 1 && gp !== this.lastGrap) { bd = d; best = gp; } }
    game.audio.play('tongue');
    this.tongueT = 0.35;
    if (best) { this.state = 'grapple'; this.grapT = best; this.lastGrap = best; this.tongueTo = best; this.slamming = false; return; }
    for (const e of E.enemies) { if (!e.alive) continue; const d = Math.hypot(e.s - this.s, e.y + e.h / 2 - (this.y + 1.4)); if (d < 6.5 && (e.s - this.s) * this.facing > -0.5 && e.kind !== 'eel') { E.killEnemy(e, this.facing * -4, 6); this.tongueTo = { s: e.s, y: e.y + 0.5 }; this.game.audio.play('stomp', 2); return; } }
    this.tongueTo = { s: this.s + this.facing * 5, y: this.y + 1.6 };
  }
  stepGrapple(dt) {
    const t = this.grapT;
    const ds = t.s - this.s, dy = (t.y - 1.4) - this.y, d = Math.hypot(ds, dy);
    const sp = 32;
    this.tongueTo = t;
    if (d < 1.0) { this.state = 'normal'; this.vy = 15; this.leapReady = true; this.game.magic.chainEvent(); this.vs = this.facing * 6; this.grapT = null; this.game.audio.play('bigjump'); this.game.fx.burst(this.game.path.world(t.s, t.y, 0), 0xff70c0, 14, 5, 0.6, 0.5, 0); return; }
    this.vs = ds / d * sp; this.vy = dy / d * sp; this.facing = ds >= 0 ? 1 : -1;
    const ps = this.s, py = this.y;
    this.move(dt);
    if (Math.hypot(this.s - ps, this.y - py) < sp * dt * 0.3) { this.state = 'normal'; this.grapT = null; } // blocked
  }
  grabVine(v) {
    const r = Math.min(v.len, Math.max(1.5, Math.hypot(this.s - v.s, (this.y + this.h * 0.85) - v.y)));
    this.state = 'vine'; this.vine = v; this.vineR = r; v.held = true;
    const ang = Math.atan2(this.s - v.s, v.y - (this.y + this.h * 0.85));
    v.ang = Math.max(-1.3, Math.min(1.3, ang));
    v.av = (this.vs * Math.cos(v.ang) + this.vy * Math.sin(v.ang)) / r;
    this.slamming = false; this.rollT = 0; this.jumpBuf = 0; this.leapReady = true; this.game.magic.chainEvent();
    this.game.audio.play('vine'); this.game.stats.vines++;
  }
  stepVine(dt, dir, H, input) {
    const v = this.vine, r = this.vineR;
    v.av += (-Math.sin(v.ang) * 40 / r + dir * 3.2) * dt;
    v.av *= 0.997;
    v.ang += v.av * dt;
    if (Math.abs(v.ang) > 1.35) { v.ang = Math.sign(v.ang) * 1.35; v.av *= -0.3; }
    if (H.up) this.vineR = Math.max(1.5, r - 4 * dt);
    if (H.down) this.vineR = Math.min(v.len, r + 4 * dt);
    if (dir) this.facing = dir;
    this.s = v.s + Math.sin(v.ang) * this.vineR;
    this.y = v.y - Math.cos(v.ang) * this.vineR - this.h * 0.85;
    if (this.jumpBuf > 0) {
      this.jumpBuf = 0;
      const tv = v.av * this.vineR;
      this.vs = tv * Math.cos(v.ang) * 1.1 + dir * 3; this.vy = Math.max(tv * Math.sin(v.ang), 0) + 11;
      if (Math.abs(this.vs) < 4 && dir) this.vs = dir * 6;
      this.state = 'normal'; v.held = false; v.cool = 0.45; this.vine = null; this.game.audio.play('jump');
    }
  }
  stepCart(dt, H) {
    const game = this.game, c = this.cart;
    this.vs = approach(this.vs, 24, 10 * dt);
    let vyr = this.vy;
    vyr -= (vyr > 0 && H.jump ? 34 : 55) * dt; vyr = Math.max(vyr, -34);
    if (this.jumpBuf > 0 && (this.grounded || this.coyote > 0)) { vyr = 15.5 + (this.slopeLaunch || 0); this.jumpBuf = 0; this.coyote = 0; game.audio.play('jump'); }
    this.vy = vyr;
    if (this.grounded) this.coyote = 0.12; else this.coyote -= dt;
    const wasGrounded = this.grounded, prevAir = !this.grounded, prevVy = this.vy;
    this.move(dt);
    if (wasGrounded && !this.grounded && this.wasSlope && this.vy <= 0) { const sl = this.wasSlope, grad = (sl.yb - sl.ya) / (sl.s1 - sl.s0); if (grad > 0) this.vy = this.vs * grad; }
    this.wasSlope = this.onSlope;
    this.slopeLaunch = this.onSlope ? Math.max(0, (this.onSlope.yb - this.onSlope.ya) / (this.onSlope.s1 - this.onSlope.s0) * this.vs) : 0;
    if (prevAir && this.grounded) { game.audio.play('land'); game.shake(0.25); this.squash = 0.3; for (let i = 0; i < 12; i++) game.fx.spawn(game.path.world(this.s, this.y + 0.2, (Math.random() - 0.5) * 2), new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 5, (Math.random() - 0.5) * 6), 0xffc060, 0.3, 0.5, -20); }
    if (this.grounded && Math.random() < dt * 30) game.fx.spawn(game.path.world(this.s - 0.8, this.y + 0.1, Math.random() < 0.5 ? 0.95 : -0.95), new THREE.Vector3(-3 + Math.random() * 2, 2 + Math.random() * 3, (Math.random() - 0.5) * 2), 0xffb040, 0.25, 0.35, -15);
    if (this.grounded && Math.random() < dt * 10) game.audio.play('cart');
    if (this.wallDir === 1 || this.s >= c.endS - 1.5) { // bumper
      this.cart = null; this.applyMount(); this.vy = 17; this.vs = 11; this.grounded = false; c.used = true; c.crashT = 0;
      game.audio.play('smash'); game.shake(0.8); game.fx.burst(game.path.world(this.s, this.y + 1, 0), 0xffc060, 40, 10, 0.7, 0.8, -10);
      game.onCartEnd();
    }
    if (this.y < -52) game.killPlayer('Derailed!');
  }
  enterCart(c) {
    if (this.comp) this.dismount(false);
    this.cart = c; this.applyMount(); this.s = c.s; this.y = c.y + 0.05; this.vs = 6; this.vy = 0; this.state = 'normal';
    this.game.audio.play('mount'); this.game.onCartStart();
  }

  // ───────────────────────── interactions with the world
  interact(dt) {
    const game = this.game, E = game.entities, P = game.path;
    if (this.state === 'dead' || this.state === 'cutscene') return;
    const box = this;
    // glims
    for (const gl of E.glims) {
      if (gl.taken || Math.abs(gl.s - this.s) > this.hw + 0.55) continue;
      if (gl.y < this.y - 0.5 || gl.y > this.y + this.h + 0.5) continue;
      gl.taken = true; game.collectGlim(gl);
    }
    for (const sd of E.shards) {
      if (sd.taken || Math.abs(sd.s - this.s) > this.hw + 0.9 || sd.y < this.y - 1 || sd.y > this.y + this.h + 1) continue;
      sd.taken = true; game.collectShard(sd);
    }
    // enemies
    const falling = this.vy * this.g < 0 || this.slamming;
    for (const e of E.enemies) {
      if (!e.alive) continue;
      const eb = { s: e.s, y: e.y, hw: e.hw, h: e.h };
      if (!overlap(box, eb)) continue;
      const killer = this.chargeT > 0 || this.cart || (this.mount === 'fish' && this.dashT > 0) || (this.mount === 'bird' && this.slamming);
      if (killer && (e.kind !== 'eel' || this.mount === 'fish' || this.cart)) { E.killEnemy(e, this.facing * 6, 12); game.audio.play('stomp', this.chain++); this.hitstop = 0.04; continue; }
      if (e.kind === 'eel') { this.hurt('Zapped!'); continue; }
      const above = this.g === 1 && falling && this.y > e.y + e.h * 0.35;
      if (above) {
        if (e.kind === 'spikeback' && this.mount !== 'beast') { this.vy = 13; this.hurt('Ouch, spikes!'); continue; }
        E.killEnemy(e, this.vs * 0.3, 8);
        this.chain++;
        this.vy = game.input.held.jump || this.slamming ? 17.5 : 12;
        if (this.slamming) { this.slamming = false; this.vy = 19; }
        this.grounded = false; this.squash = -0.35; this.hitstop = 0.05; this.leapReady = true; game.magic.chainEvent();
        game.audio.play('stomp', this.chain);
        if (this.chain >= 3) { game.toast(`${this.chain}× bounce chain!`, 1.2); for (let i = 0; i < this.chain - 2; i++) game.addGlims(1, P.world(e.s, e.y + 1, 0)); }
        continue;
      }
      if (this.rollT > 0 || this.rollJump) {
        if (e.kind !== 'spikeback') { E.killEnemy(e, this.facing * 6, 10); this.rollT = Math.max(this.rollT, 0.25); this.chain++; game.audio.play('stomp', this.chain); this.hitstop = 0.03; continue; }
      }
      this.hurt(e.kind === 'spikeback' ? 'Ouch, spikes!' : 'Chomped!');
    }
    if (this.cart) { this.cartInteract(); return; }
    // bounce plants
    for (const b of E.bouncers) {
      if (b.hidden || this.g !== 1 || this.vy > 0.5 || Math.abs(b.s - this.s) > 1.3 + this.hw * 0.5) continue;
      if (this.y < b.y - 0.05 || this.y > b.y + 1.6) continue;
      this.vy = b.power * (this.slamming ? 1.15 : 1) * (this.mount === 'frog' ? 1.15 : 1);
      this.slamming = false; this.grounded = false; this.rollT = 0; b.squash = 1; this.squash = -0.4; this.leapReady = true; game.magic.chainEvent();
      game.audio.play('bounce'); game.fx.burst(P.world(b.s, b.y + 1, 0), b.kind === 'shroom' ? 0x60d0ff : 0xff80b0, 16, 6, 0.6, 0.6, -6);
    }
    // vines
    if (!this.mount && this.state === 'normal' && !this.grounded) {
      const cy = this.y + this.h * 0.7;
      for (const v of E.vines) {
        if (v.cool > 0 || Math.abs(v.s - this.s) > v.len + 2) continue;
        const ex = v.s + Math.sin(v.ang) * v.len, ey = v.y - Math.cos(v.ang) * v.len;
        const dx = ex - v.s, dy = ey - v.y, l2 = dx * dx + dy * dy;
        const tt = Math.max(0.15, Math.min(1, ((this.s - v.s) * dx + (cy - v.y) * dy) / l2));
        const px = v.s + dx * tt, py = v.y + dy * tt;
        if (Math.hypot(this.s - px, cy - py) < 1.25) { this.grabVine(v); break; }
      }
    }
    // companions
    for (const c of E.companions) {
      if (c.state === 'caged') {
        if (Math.abs(c.s - this.s) < 1.6 + this.hw && this.y < c.y + 3.5 && this.y + this.h > c.y) {
          if (this.comp && this.comp.kind === c.kind) continue;
          c.state = 'idle'; c.cage.visible = false;
          const pp = P.world(c.s, c.y + 1.5, 0);
          game.fx.burst(pp, 0xb89060, 30, 10, 1, 1, -20); game.fx.burst(pp, 0xfff0a0, 30, 6, 0.8, 1, 0); game.audio.play('smash');
          this.mountOn(c);
        }
      } else if (c.state === 'idle' && c !== this.comp && this.remountCool <= 0 && Math.abs(c.s - this.s) < 1.2 + this.hw && Math.abs(c.y - this.y) < 2.2) {
        this.mountOn(c);
      }
    }
    // checkpoints
    for (const cp of E.checkpoints) if (!cp.on && Math.abs(cp.s - this.s) < 1.5 && Math.abs(cp.y - this.y) < 5) {
      cp.on = true; cp.gem.material.emissive.setHex(0x40ffd0); cp.gem.material.emissiveIntensity = 2.5;
      game.setCheckpoint(cp); game.fx.burst(P.world(cp.s, cp.y + 3.3, -2.2), 0x40ffd0, 30, 6, 0.6, 1, -2);
    }
    for (const p of E.portals) if (Math.abs(p.s - this.s) < 1.4 && Math.abs(p.y + 0.8 - this.center) < 1.8) game.teleport(p);
    for (const b of E.blooms) if (Math.abs(b.s - this.s) < 1.3 + this.hw && Math.abs(b.y - this.y) < 2.5) E.triggerBloom(b);
    for (const t of E.totems) {
      const near = Math.abs(t.s - this.s) < 1.2 + this.hw && this.y < t.y + 3.4 && this.y + this.h > t.y;
      if (near && (this.rollT > 0 || this.chargeT > 0)) E.toggleTotem(t);
    }
    for (const c of E.carts) if (!c.used && Math.abs(c.s - this.s) < 1.5 + this.hw && Math.abs(c.y - this.y) < 2.5) this.enterCart(c);
    if (E.altar && !E.altar.done && Math.abs(E.altar.s - this.s) < 2 && Math.abs(E.altar.y - this.y) < 4) { E.altar.done = true; game.finish(); }
  }
  cartInteract() {
    for (const gl of this.game.entities.glims) {
      if (gl.taken || Math.abs(gl.s - this.s) > this.hw + 0.8 || gl.y < this.y - 0.5 || gl.y > this.y + this.h + 1.2) continue;
      gl.taken = true; this.game.collectGlim(gl);
    }
  }

  // ───────────────────────── rendering / animation
  render(dt) {
    const game = this.game, P = game.path, ud = this.model.userData, t = this.animT;
    const m = this.model;
    const flipped = this.g === -1;
    // facing turn (smoothed)
    const targetTurn = this.facing > 0 ? 0 : Math.PI;
    this.turn += (targetTurn - this.turn) * Math.min(1, dt * 14);
    const riding = this.comp && this.comp.state === 'ridden';
    const yawBase = P.yaw(this.s);
    const baseY = flipped ? this.y + this.h : this.y;
    this.squash += (0 - this.squash) * Math.min(1, dt * 10);
    const sq = this.squash;
    m.visible = !(this.invuln > 0 && Math.floor(t * 20) % 2 === 0) || this.state === 'dead';

    // reset pose
    ud.body.rotation.set(0, 0, 0); ud.body.position.set(0, 0, 0); ud.torso.rotation.set(0, 0, 0);
    ud.head.rotation.set(0, 0, 0);
    let legA = 0, armA = 0, armZ = 0, lean = 0, bob = 0;
    const speed = Math.abs(this.vs);
    const air = !this.grounded;
    const runPhase = (this._rp = (this._rp || 0) + dt * (4 + speed * 1.3));
    if (this.state === 'grip') { armZ = 2.7; legA = Math.sin(t * 8) * (Math.abs(this.vy) > 1 ? 0.6 : 0.1); ud.body.rotation.z = 0.15; }
    else if (this.songHold > 0 && this.grounded) { armZ = 2.2 + Math.sin(t * 6) * 0.3; ud.head.rotation.z = 0.35; bob = Math.sin(t * 5) * 0.03; if (Math.random() < dt * 20) game.fx.spawn(P.world(this.s, this.y + 1.8, 0), new THREE.Vector3((Math.random() - 0.5) * 2, 2, 0), 0xa0f0ff, 0.35, 0.8, 0); }
    else if (this.leapSpin > 0) { this.leapSpin -= dt * 3; ud.body.rotation.z = -(1 - this.leapSpin) * Math.PI * 2 * this.facing * 0 - (1 - this.leapSpin) * Math.PI * 2; ud.body.position.y = 0.6; legA = 1.2; armA = 1; }
    else if (this.state === 'vine') { armZ = 2.9; legA = Math.sin(t * 3) * 0.3; ud.body.rotation.z = -this.vine.ang; }
    else if (riding || this.cart) { legA = 1.1; armA = 0; armZ = this.cart && air ? 2.8 : 0.6; }
    else if (this.rollT > 0 || this.rollJump) { ud.body.rotation.z = -(this._roll = (this._roll || 0) + dt * 22); ud.body.position.y = 0.55; ud.body.scale?.set(1, 1, 1); legA = 1.6; armA = 1.5; }
    else if (this.slamming) { ud.body.rotation.z = -(this._roll = (this._roll || 0) + dt * 30); ud.body.position.y = 0.55; legA = 1.5; armA = 1.2; }
    else if (this.state === 'grapple') { armZ = 2.5; legA = 0.5; }
    else if (this.inWater) { ud.body.rotation.z = -1.2; ud.body.position.y = 0.6; legA = Math.sin(t * 8) * 0.6; armA = Math.sin(t * 8 + 1) * 1.2; }
    else if (air) {
      const up = this.vy * this.g;
      if (up > 2) { legA = 0.8; armZ = 2.6; lean = -0.1; }
      else { legA = Math.sin(t * 16) * 0.5; armZ = 1.8 + Math.sin(t * 18) * 0.8; lean = 0.15; } // flailing
    } else if (speed > 0.5) {
      legA = Math.sin(runPhase) * Math.min(1.2, speed * 0.12); armA = -Math.sin(runPhase) * Math.min(1.3, speed * 0.13);
      lean = Math.min(0.35, speed * 0.03); bob = Math.abs(Math.sin(runPhase)) * 0.08;
      if (Math.random() < dt * speed * 0.6) game.fx.spawn(P.world(this.s - this.facing * 0.3, this.y + 0.1, (Math.random() - 0.5) * 0.4), new THREE.Vector3(0, 1, 0), game.currentTheme === 3 ? 0x6050a0 : 0xd8c8a0, 0.4, 0.35, 0);
      this.idleT = 0;
    } else {
      this.idleT += dt;
      bob = Math.sin(t * 2.5) * 0.02;
      ud.head.rotation.z = Math.sin(t * 0.7) * 0.1;
      if (this.idleT > 4) { // idle antics: look at the camera, wave, then scratch
        const ph = (this.idleT - 4) % 9;
        if (ph < 3) { ud.head.rotation.y = 0.9 * this.facing; armZ = ph > 1 ? 2.8 : 0; ud.arms[0].rotation.x = ph > 1 ? Math.sin(t * 14) * 0.4 : 0; }
        else if (ph < 6) { ud.arms[1].rotation.z = 2.6; ud.head.rotation.z = 0.3; ud.arms[1].rotation.x = Math.sin(t * 18) * 0.2; }
        else { ud.head.rotation.x = Math.sin(t * 1.5) * 0.4; ud.head.rotation.y = Math.sin(t * 0.8) * 0.8; }
      }
    }
    if (this.hurtT > 0) { ud.head.rotation.z = Math.sin(t * 30) * 0.3; }
    ud.torso.rotation.z = -lean;
    ud.legs.forEach((l, i) => { l.rotation.z = i ? -legA : legA; if (riding || this.cart) { l.rotation.z = 1.3; l.rotation.x = i ? 0.5 : -0.5; } else l.rotation.x = 0; });
    ud.arms.forEach((a, i) => { a.rotation.z = (i ? armA : -armA) + armZ; if (!(this.idleT > 4 && this.grounded)) a.rotation.x = 0; });
    // ears react to vertical speed
    ud.ears.forEach((e, i) => { e.rotation.z = Math.max(-0.8, Math.min(0.8, -this.vy * 0.03 * this.g)) + Math.sin(t * 3 + i) * 0.05; });
    // blink
    const blink = (t % 3.7) < 0.12 ? 0.1 : 1; ud.eyeL.scale.y = ud.eyeR.scale.y = blink;
    // tail + scarf trail
    const vel = Math.min(1, speed / 12);
    ud.tail.forEach((seg, i) => { seg.rotation.z = (i === 0 ? 0.9 - vel * 0.6 : 0.12 + Math.sin(t * 3 - i * 0.6) * (0.12 + (1 - vel) * 0.1)) - (this.vy * this.g) * 0.005; seg.rotation.y = Math.sin(t * 2 - i * 0.5) * 0.15; });
    ud.scarf.forEach((seg, i) => { seg.rotation.z = (i === 0 ? -0.9 + vel * 0.8 + Math.min(0.6, this.vy * this.g * 0.03) : Math.sin(t * 12 - i) * (0.1 + vel * 0.35)); seg.rotation.y = Math.sin(t * 7 - i) * 0.2; });
    // squash & stretch
    const st = air && !riding ? Math.min(0.18, Math.abs(this.vy) * 0.008) : 0;
    ud.body.scale.set(1 + sq * 0.6 - st * 0.4, 1 - sq + st, 1 + sq * 0.6 - st * 0.4);
    ud.body.position.y += bob;

    // place hero (+ mount / cart)
    let seatY = 0, seatX = 0;
    if (riding) {
      const c = this.comp, cm = c.model, cu = cm.userData;
      P.place(cm, this.s, baseY); cm.rotation.y += this.turn; if (flipped) { cm.rotateX(Math.PI); }
      this.animCompanion(c, dt, speed, air);
      seatY = cu.seat + (cu.body.position.y || 0); seatX = -0.1;
    }
    if (this.cart) {
      const c = this.cart; c.s = this.s; c.y = this.y;
      P.place(c.g, this.s, this.y);
      const grad = this.onSlope ? (this.onSlope.yb - this.onSlope.ya) / (this.onSlope.s1 - this.onSlope.s0) : Math.max(-0.5, Math.min(0.5, this.vy / 30));
      c.body.rotation.z += (Math.atan(grad) - c.body.rotation.z) * Math.min(1, dt * 10);
      c.wheels.forEach((w) => w.rotation.y += dt * this.vs * 3);
      seatY = 0.9; seatX = 0;
    }
    for (const c of game.entities.carts) if (c.used && c.crashT !== undefined && c.crashT < 3) { c.crashT += dt; c.g.position.y += (4 - c.crashT * 9) * dt; c.body.rotation.z += dt * 6; if (c.crashT > 2) c.g.visible = false; }
    P.place(m, this.s, baseY);
    m.rotation.y += this.turn;
    if (flipped) m.rotateX(Math.PI);
    if (riding || this.cart) {
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(m.quaternion), fw = new THREE.Vector3(1, 0, 0).applyQuaternion(m.quaternion);
      m.position.addScaledVector(up, seatY).addScaledVector(fw, seatX);
      if (this.cart) m.rotation.z += this.cart.body.rotation.z * (this.facing);
    }
    // frog tongue
    const tl = this.tongueLine;
    if (this.tongueTo && (this.tongueT > 0 || this.state === 'grapple')) {
      const a = P.world(this.s + this.facing * 0.9, this.y + 1.4, 0), b = P.world(this.tongueTo.s, this.tongueTo.y, 0);
      tl.visible = true; tl.position.copy(a).lerp(b, 0.5); tl.scale.set(1, a.distanceTo(b), 1);
      tl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    } else tl.visible = false;
  }
  animCompanion(c, dt, speed, air) {
    const u = c.model.userData, t = this.animT;
    const ph = (c._ph = (c._ph || 0) + dt * (3 + speed * 1.2));
    u.body.position.y = 0; u.body.rotation.set(0, 0, 0);
    if (u.head) u.head.rotation.set(0, 0, 0);
    switch (c.kind) {
      case 'beast':
        u.legs.forEach((l, i) => l.rotation.z = air ? (i < 2 ? -0.8 : 0.8) : Math.sin(ph + (i % 2) * Math.PI + (i > 1 ? 1.2 : 0)) * Math.min(0.9, speed * 0.08));
        u.body.position.y = air ? 0 : Math.abs(Math.sin(ph)) * 0.1;
        u.head.rotation.z = this.chargeT > 0 ? -0.5 : Math.sin(ph * 0.5) * 0.08;
        u.body.rotation.z = this.chargeT > 0 ? -0.12 : 0;
        break;
      case 'frog': {
        const k = air ? (this.vy > 0 ? -0.3 : 0.15) : 0.1 * Math.sin(t * 3);
        u.body.scale.set(1 - k * 0.5, 1 + k, 1 - k * 0.5);
        u.legs.forEach((l, i) => l.rotation.z = air ? (i < 2 ? 1.0 : -0.8) : (speed > 1 ? Math.sin(ph * 1.5) * 0.4 : 0));
        if (!air && speed > 1) u.body.position.y = Math.abs(Math.sin(ph * 1.5)) * 0.35;
        break; }
      case 'bird': {
        const glide = air && this.game.input.held.jump;
        this.flapT = (this.flapT || 0) - dt;
        u.wings.forEach((w, i) => { w.rotation.x = (i ? 1 : -1) * (air ? (this.flapT > 0 ? Math.sin(t * 40) * 0.9 : glide ? -0.1 : Math.sin(t * 14) * 0.5) : 1.2); });
        u.tail.rotation.z = air ? 0.1 : 0.4;
        u.legs.forEach((l, i) => l.rotation.z = air ? -1.2 : Math.sin(ph + i * Math.PI) * 0.6);
        if (this.birdTime > 0 && this.birdTime < 5 && Math.floor(t * 6) % 2) u.body.position.y = 0.05;
        this.birdTime -= 0; break; }
      case 'fish':
        u.tail.rotation.y = Math.sin(t * (this.inWater ? 14 : 6)) * 0.6;
        u.body.rotation.z = this.inWater ? Math.atan2(this.vy, Math.abs(this.vs) + 0.1) * 0.6 : 0;
        if (!this.inWater && speed > 0.5) u.body.position.y = Math.abs(Math.sin(ph * 1.2)) * 0.25;
        break;
      case 'oru':
        u.rings.forEach((r, i) => { r.rotation.x = t * (1.5 + i); r.rotation.y = t * (0.8 + i * 0.3); });
        u.wings.forEach((w, i) => w.rotation.x = (i ? 1 : -1) * Math.sin(t * 20) * 0.4);
        u.body.position.y = 0.1 + Math.sin(t * 3) * 0.08;
        u.core.material.emissiveIntensity = 2 + Math.sin(t * 5) * 0.8;
        break;
    }
    // personality: happy hops, nerves around danger, idle habits
    c.hop = Math.max(0, (c.hop || 0) - dt * 2);
    if (c.hop > 0) u.body.position.y += Math.sin(c.hop * Math.PI) * 0.5;
    const al = c.alert || 0;
    if (c.kind === 'frog') u.body.scale.multiplyScalar(1 - al * 0.12);
    if (c.kind === 'beast' && u.head) u.head.rotation.z -= al * 0.35;
    if (c.kind === 'bird' && al > 0.3) u.wings.forEach((w, i) => w.rotation.x += (i ? 1 : -1) * Math.sin(t * 30) * 0.15 * al);
    if (c.kind === 'fish' && al > 0.3) u.body.rotation.z += Math.sin(t * 25) * 0.04 * al;
    const it = this.stillT;
    if (it > 2.5) {
      const ph = (it - 2.5) % 6;
      if (c.kind === 'beast') { if (ph < 1.6) { u.head.rotation.z = -0.5 + Math.sin(t * 10) * 0.08; if (Math.random() < dt * 5) this.game.fx.spawn(this.game.path.world(this.s + this.facing * 1.6, this.y + 0.4, 0), new THREE.Vector3(this.facing * 1.5, 0.5, 0), 0xe0e0e0, 0.4, 0.5, 0); } else if (ph > 4) u.tail.rotation.z = 1 + Math.sin(t * 16) * 0.5; }
      if (c.kind === 'frog') { if (ph > 3 && ph < 3.4) { u.tongue.visible = true; u.tongue.position.set(1.3, 1.6, 0); u.tongue.rotation.z = -1.2; u.tongue.scale.set(1, 1.4 * Math.sin((ph - 3) / 0.4 * Math.PI), 1); } else u.tongue.visible = false; if (ph > 3.4 && ph < 4) u.body.scale.y *= 1 + Math.sin((ph - 3.4) * 10) * 0.08; }
      if (c.kind === 'bird' && ph < 2) { u.head.rotation.y = Math.PI * 0.7; u.head.rotation.z = 0.3 + Math.sin(t * 12) * 0.1; u.wings[0].rotation.x = -0.5; }
      if (c.kind === 'fish' && ph < 1) u.body.rotation.x = ph * Math.PI * 2;
      if (c.kind === 'oru') u.rings.forEach((r, i) => r.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.25));
    } else if (c.kind === 'frog') u.tongue.visible = false;
  }
  tick(dt) { if (this.mount === 'bird') this.birdTime -= dt; }
}
