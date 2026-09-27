import * as THREE from 'three';
// A "film director" camera: follows the route, blends between authored zones,
// leads the action, pulls back on big air, and runs scripted cinematic shots.
const DEF = { dist: 15, height: 3.2, yaw: 0, fov: 50, look: 3.5, lookY: null };
export class CameraDirector {
  constructor(camera, path, level) {
    this.cam = camera; this.path = path; this.level = level;
    this.p = { ...DEF, lookYw: 0 };
    this.fs = level.start.s; this.fy = level.start.y + 1.2; this.lead = 0; this.air = 0;
    this.shakeAmt = 0; this.punch = 0; this.script = null;
    this.pos = new THREE.Vector3(); this.look = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
  }
  zoneFor(s, y) {
    let best = null;
    for (const z of this.level.cams) {
      if (s < z.s0 || s > z.s1) continue;
      if (z.yMin !== undefined && (y < z.yMin || y > (z.yMax ?? 1e9))) continue;
      if (z.yMin === undefined && best && best.yMin !== undefined) continue;
      best = z;
    }
    return best || DEF;
  }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  update(dt, pl, snap = false) {
    const z = this.zoneFor(pl.s, pl.y);
    const k = snap ? 1 : 1 - Math.exp(-dt * 1.6);
    for (const key of ['dist', 'height', 'yaw', 'fov', 'look']) this.p[key] += ((z[key] ?? DEF[key]) - this.p[key]) * k;
    const hasLY = z.lookY !== undefined && z.lookY !== null;
    this.p.lookYw += ((hasLY ? 1 : 0) - this.p.lookYw) * k; if (hasLY) this.p.lookYv = z.lookY;
    // lead in the direction of motion
    const targetLead = pl.facing * this.p.look + pl.vs * 0.22;
    this.lead += (targetLead - this.lead) * (1 - Math.exp(-dt * 2.2));
    const ts = pl.s + this.lead;
    this.fs = snap ? ts : this.fs + (ts - this.fs) * (1 - Math.exp(-dt * 6));
    // vertical: soft follow, quicker when falling far below
    const ty = pl.y + (pl.g === -1 ? pl.h - 1 : 1.2);
    const dy = ty - this.fy;
    const vr = dy < -3 ? 7 : dy > 4 ? 5 : 3;
    this.fy = snap ? ty : this.fy + dy * (1 - Math.exp(-dt * vr));
    // pull back during long airtime (big jumps, bounce plants, gliding)
    this.air += ((!pl.grounded && pl.state === 'normal' && !pl.inWater ? Math.min(1, Math.max(0, (pl.airT - 0.4))) : 0) - this.air) * (1 - Math.exp(-dt * 2));
    this.punch = Math.max(0, this.punch - dt);
    const dist = this.p.dist + this.air * 5 - Math.sin(Math.min(1, this.punch) * Math.PI) * this.p.dist * 0.35;
    const f = this.path.frame(this.fs);
    const cy = Math.cos(this.p.yaw), sy = Math.sin(this.p.yaw);
    const dx = f.nx * cy + f.tx * sy, dz = f.nz * cy + f.tz * sy;
    const lookYv = this.p.lookYw > 0.001 ? this.fy + ((this.p.lookYv ?? this.fy) - this.fy) * this.p.lookYw : this.fy;
    this.look.set(f.px, lookYv, f.pz);
    this.pos.set(f.px + dx * dist, lookYv + this.p.height + this.air * 1.5, f.pz + dz * dist);
    if (this.script) this.runScript(dt);
    this.cam.position.copy(this.pos);
    if (this.shakeAmt > 0) {
      const s = this.shakeAmt; this.cam.position.x += (Math.random() - 0.5) * s; this.cam.position.y += (Math.random() - 0.5) * s; this.cam.position.z += (Math.random() - 0.5) * s * 0.5;
      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.8);
    }
    this.cam.lookAt(this.look);
    const fov = this.p.fov + (pl.cart ? Math.min(8, Math.abs(pl.vs) * 0.25) : 0);
    if (Math.abs(this.cam.fov - fov) > 0.01) { this.cam.fov = fov; this.cam.updateProjectionMatrix(); }
  }
  // Scripted shot: blend from a keyframed path into (or out of) gameplay framing.
  play(script) { this.script = { t: 0, ...script }; }
  runScript(dt) {
    const S = this.script; S.t += dt;
    const u = Math.min(1, S.t / S.dur);
    const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    const pos = S.pos(u, this.pos), look = S.look(u, this.look);
    const w = S.blendOut ? (1 - e) : 1;
    this.pos.lerp(pos, w); this.look.lerp(look, w);
    if (u >= 1 && !S.hold) { this.script = null; S.done && S.done(); }
  }
}
