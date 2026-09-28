import * as THREE from 'three';

// Local co-op: Player 2 is Lumi, a wisp spirit who flies freely around Kiri.
// Lumi can't be hurt. She gathers glims, and her Lumen Pulse stuns critters, pops flyers,
// refreshes Kiri's Wisp Leap when she's close, lulls Hollowjaw and wakes ghostwood.
export class Coop {
  constructor(game) {
    this.game = game; this.enabled = false;
    this.s = 0; this.y = 0; this.vs = 0; this.vy = 0; this.cool = 0; this.t = 0;
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xbff4ff, emissiveIntensity: 3 }));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), new THREE.MeshBasicMaterial({ color: 0x8fe0ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.add(core, halo);
    for (const z of [0.12, -0.12]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: 0x103040 })); e.position.set(0.26, 0.06, z); g.add(e); }
    const wings = [1, -1].map((z) => { const w = new THREE.Mesh(new THREE.CircleGeometry(0.35, 12), new THREE.MeshBasicMaterial({ color: 0xcff8ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); w.position.set(-0.1, 0.1, z * 0.3); w.rotation.x = Math.PI / 2; g.add(w); return w; });
    this.light = new THREE.PointLight(0xbff4ff, 0, 10, 1.8); g.add(this.light);
    g.visible = false; game.scene.add(g);
    this.g = g; this.core = core; this.halo = halo; this.wings = wings;
  }
  setEnabled(on) {
    this.enabled = on; this.g.visible = on && this.game.state === 'play';
    document.getElementById('p2tag')?.classList.toggle('hidden', !on);
    if (on) this.spawn();
  }
  spawn() { const p = this.game.player; this.s = p.s - 1.5; this.y = p.y + 2.5; this.vs = this.vy = 0; }
  pulse() {
    const game = this.game, p = game.player, E = game.entities;
    this.cool = 1.1; game.audio.play('leap');
    const w = game.path.world(this.s, this.y, 0), f = game.path.frame(this.s);
    game.fx.ring(w, 0xbff4ff, 26, 9, 0.5, new THREE.Vector3(f.tx, 0, f.tz), new THREE.Vector3(f.nx, 0, f.nz));
    for (const e of E.enemies) {
      if (!e.alive || Math.hypot(e.s - this.s, e.y + e.h / 2 - this.y) > 3.5) continue;
      if (e.kind === 'buzzmoth' || e.kind === 'jelly') E.killEnemy(e, 0, 8); else e.stun = 3;
    }
    if (Math.hypot(p.s - this.s, p.y + p.h / 2 - this.y) < 3) { // wisp boost
      p.leapReady = true; p.firstLeapDone = false;
      if (!p.grounded && p.state === 'normal') { p.vy = Math.max(p.vy, 12); game.magic.chainEvent(); }
      game.fx.burst(game.path.world(p.s, p.y + 1, 0), 0xbff4ff, 16, 4, 0.5, 0.6, 0);
    }
    game.hollowjaw?.onSong(this.s, this.y);
    for (const gh of game.magic.ghosts) if (Math.hypot((gh.o.s0 + gh.o.s1) / 2 - this.s, gh.o.y1 - this.y) < 6 && (!gh.o.finale || game.finale.state === 'climb')) { gh.o.active = true; gh.timer = Math.max(gh.timer, 5); }
  }
  step(h, pad) {
    if (!this.enabled || this.game.state !== 'play') return;
    const game = this.game, p = game.player;
    this.t += h; this.cool -= h;
    const tx = pad.x, ty = pad.y;
    this.vs += (tx * 13 - this.vs) * Math.min(1, h * 6); this.vy += (ty * 13 - this.vy) * Math.min(1, h * 6);
    this.s += this.vs * h; this.y += this.vy * h;
    // soft tether keeps Lumi on screen with Kiri
    const ds = this.s - p.s, dy = this.y - (p.y + 1.5), d = Math.hypot(ds, dy), R = 12;
    if (d > R) { this.s = p.s + ds / d * R; this.y = p.y + 1.5 + dy / d * R; }
    if (!tx && !ty && d > 4) { this.s -= ds * h * 0.8; this.y -= dy * h * 0.8; } // drift home when idle
    if (pad.action && this.cool <= 0) this.pulse();
    for (const gl of game.entities.glims) if (!gl.taken && Math.abs(gl.s - this.s) < 0.8 && Math.abs(gl.y - this.y) < 0.9) { gl.taken = true; game.collectGlim(gl); }
  }
  update(dt) {
    const on = this.enabled && (this.game.state === 'play' || this.game.state === 'paused');
    this.g.visible = on; if (!on) return;
    const game = this.game, t = this.t;
    game.path.place(this.g, this.s, this.y + Math.sin(t * 3) * 0.1, 0.4);
    if (this.vs < -0.5) this.g.rotation.y += Math.PI;
    this.wings.forEach((w, i) => w.rotation.y = Math.sin(t * 30) * 0.6 * (i ? 1 : -1));
    const k = this.cool > 0.8 ? 1.6 : 1; this.halo.scale.setScalar(k + Math.sin(t * 4) * 0.08);
    this.light.intensity = game.currentTheme === 3 || this.game.player.y < -250 ? 8 : 2;
    if (Math.random() < dt * 40) game.fx.spawn(game.path.world(this.s, this.y, 0.4), new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, 0), 0xbff4ff, 0.25, 0.6, 0);
  }
}
