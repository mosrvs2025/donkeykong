import * as THREE from 'three';
// The playable route: a curve in XZ. Gameplay runs in (s, y) where s = arc length.
// World position of (s, y, d) = P(s) + up*y + N(s)*d, with N pointing toward the camera side.
export class Path {
  constructor(points) {
    this.curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
    this.length = this.curve.getLength();
    const n = Math.ceil(this.length);
    this.n = n; this.step = this.length / n;
    this.px = new Float32Array(n + 1); this.pz = new Float32Array(n + 1);
    this.tx = new Float32Array(n + 1); this.tz = new Float32Array(n + 1);
    const p = new THREE.Vector3(), t = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      const u = i / n; this.curve.getPointAt(u, p); this.curve.getTangentAt(u, t);
      const l = Math.hypot(t.x, t.z) || 1;
      this.px[i] = p.x; this.pz[i] = p.z; this.tx[i] = t.x / l; this.tz[i] = t.z / l;
    }
    this._f = { px: 0, pz: 0, tx: 1, tz: 0, nx: 0, nz: 1 };
  }
  frame(s, out = this._f) {
    const n = this.n;
    let f = s / this.step, extra = 0;
    if (f < 0) { extra = f * this.step; f = 0; } else if (f > n) { extra = (f - n) * this.step; f = n; }
    const i = Math.min(n - 1, Math.floor(f)), a = f - i;
    let tx = this.tx[i] + (this.tx[i + 1] - this.tx[i]) * a, tz = this.tz[i] + (this.tz[i + 1] - this.tz[i]) * a;
    const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    out.px = this.px[i] + (this.px[i + 1] - this.px[i]) * a + tx * extra;
    out.pz = this.pz[i] + (this.pz[i + 1] - this.pz[i]) * a + tz * extra;
    out.tx = tx; out.tz = tz; out.nx = -tz; out.nz = tx;
    return out;
  }
  world(s, y, d = 0, out = new THREE.Vector3()) {
    const f = this.frame(s);
    return out.set(f.px + f.nx * d, y, f.pz + f.nz * d);
  }
  // yaw so that local +X = tangent, local +Z = N (toward camera)
  yaw(s) { const f = this.frame(s); return Math.atan2(-f.tz, f.tx); }
  place(obj, s, y, d = 0) { this.world(s, y, d, obj.position); obj.rotation.y = this.yaw(s); return obj; }
}
