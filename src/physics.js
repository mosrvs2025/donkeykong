// Axis-separated AABB physics in route space (s, y). y is the body's bottom edge.
const EPS = 0.001;
export function surfaceY(sl, s) { return sl.ya + (sl.yb - sl.ya) * (s - sl.s0) / (sl.s1 - sl.s0); }

export function moveBody(b, solids, slopes, dt, onHit) {
  const g = b.g || 1; // +1 normal gravity, -1 inverted
  const wasGrounded = b.grounded, wasSlope = b.onSlope;
  b.wallDir = 0; b.hitCeil = false; b.wallSolid = null;
  // carry with moving platform
  if (b.grounded && b.ground && b.ground.dS !== undefined) { b.s += b.ground.dS; b.y += b.ground.dY; }
  // ── horizontal
  const ps = b.s;
  b.s += b.vs * dt;
  for (const o of solids) {
    if (!o.active || o.oneway) continue;
    if (b.y + b.h <= o.y0 + EPS || b.y >= o.y1 - EPS) continue;
    if (b.s + b.hw <= o.s0 || b.s - b.hw >= o.s1) continue;
    if (onHit && onHit(o, b.vs > 0 ? 1 : -1, 'x')) continue;
    // small step-up for ledges barely above feet (forgiveness)
    if (g === 1 && b.grounded && o.y1 - b.y < 0.35 && o.y1 - b.y > 0 && !collidesAt(b, solids, o.y1 + EPS)) { b.y = o.y1; continue; }
    if (ps + b.hw <= o.s0 + 0.05 + Math.abs(o.dS || 0)) { b.s = o.s0 - b.hw - EPS; b.wallDir = 1; }
    else if (ps - b.hw >= o.s1 - 0.05 - Math.abs(o.dS || 0)) { b.s = o.s1 + b.hw + EPS; b.wallDir = -1; }
    else { const l = b.s + b.hw - o.s0, r = o.s1 - (b.s - b.hw); if (l < r) { b.s -= l + EPS; b.wallDir = 1; } else { b.s += r + EPS; b.wallDir = -1; } }
    b.wallSolid = o;
    if (b.wallDir * b.vs > 0) b.vs = 0;
  }
  // ── vertical
  const py = b.y;
  b.y += b.vy * dt;
  b.grounded = false; b.ground = null; b.onSlope = null;
  for (const o of solids) {
    if (!o.active) continue;
    if (b.s + b.hw <= o.s0 + EPS || b.s - b.hw >= o.s1 - EPS) continue;
    if (b.y + b.h <= o.y0 || b.y >= o.y1) continue;
    if (o.oneway) {
      if (g !== 1 || b.vy > 0.01 + (o.dY || 0) / dt || py < o.y1 - 0.3 - Math.abs(o.dY || 0) || b.dropThrough > 0) continue;
      b.y = o.y1; b.vy = 0; b.grounded = true; b.ground = o; continue;
    }
    if (onHit && onHit(o, b.vy > 0 ? 1 : -1, 'y')) continue;
    const fromAbove = py >= o.y1 - 0.3 - Math.abs(o.dY || 0) - (b.vy < 0 ? -b.vy * dt : 0);
    const fromBelow = py + b.h <= o.y0 + 0.3 + Math.abs(o.dY || 0) + (b.vy > 0 ? b.vy * dt : 0);
    if (fromAbove && (!fromBelow || b.vy <= 0)) {
      b.y = o.y1; if (b.vy < 0) b.vy = 0;
      if (g === 1) { b.grounded = true; b.ground = o; } else b.hitCeil = true;
    } else if (fromBelow) {
      b.y = o.y0 - b.h; if (b.vy > 0) b.vy = 0;
      if (g === -1) { b.grounded = true; b.ground = o; } else b.hitCeil = true;
    } else {
      // embedded (e.g. moving platform shoved into us): push out the short way
      const up = o.y1 - b.y, dn = b.y + b.h - o.y0;
      if (up < dn) { b.y = o.y1; if (g === 1) { b.grounded = true; b.ground = o; } } else b.y = o.y0 - b.h;
    }
  }
  // slopes: one-way surfaces from above (normal gravity only)
  if (g === 1 && b.vy <= 0.01) {
    for (const sl of slopes) {
      if (b.s < sl.s0 || b.s > sl.s1) continue;
      const ys = surfaceY(sl, b.s);
      const snap = (wasGrounded && (wasSlope || b.vy <= 0)) ? 0.9 : 0;
      if (py >= ys - 0.35 - Math.abs(b.vs * dt * 1.2) && b.y <= ys + snap && b.y >= ys - 1.2) {
        if (b.grounded && b.y > ys) continue;
        b.y = ys; b.vy = 0; b.grounded = true; b.onSlope = sl; b.ground = null;
      }
    }
  }
  return b;
}
export function collidesAt(b, solids, y) {
  for (const o of solids) {
    if (!o.active || o.oneway) continue;
    if (y + b.h <= o.y0 || y >= o.y1) continue;
    if (b.s + b.hw <= o.s0 || b.s - b.hw >= o.s1) continue;
    return true;
  }
  return false;
}
export function overlap(a, b) {
  return a.s - a.hw < b.s + b.hw && a.s + a.hw > b.s - b.hw && a.y < b.y + b.h && a.y + a.h > b.y;
}
