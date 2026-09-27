import * as THREE from 'three';
// Procedural canvas textures — painterly noise so surfaces don't look like flat demo boxes.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, repeat = true) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function speckle(ctx, w, h, r, n, colors, sizeMin, sizeMax, alpha = 0.5) {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = alpha * (0.4 + r() * 0.6); ctx.fillStyle = colors[Math.floor(r() * colors.length)];
    const s = sizeMin + r() * (sizeMax - sizeMin), x = r() * w, y = r() * h;
    ctx.beginPath(); ctx.ellipse(x, y, s, s * (0.5 + r()), r() * 3, 0, Math.PI * 2); ctx.fill();
    // wrap
    if (x < s) { ctx.beginPath(); ctx.ellipse(x + w, y, s, s, 0, 0, 7); ctx.fill(); }
    if (y < s) { ctx.beginPath(); ctx.ellipse(x, y + h, s, s, 0, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
const cache = {};
export function getTex(name) {
  if (cache[name]) return cache[name];
  const r = rng(name.length * 977 + name.charCodeAt(0) * 13);
  let c, ctx; const S = 256;
  switch (name) {
    case 'grass': [c, ctx] = canvas(S, S); ctx.fillStyle = '#4f8a2e'; ctx.fillRect(0, 0, S, S);
      speckle(ctx, S, S, r, 900, ['#3d7424', '#6aa83a', '#86c14a', '#2f5e1c'], 2, 7, 0.6);
      speckle(ctx, S, S, r, 60, ['#e8d65a', '#f07bb0', '#ffffff'], 1, 2, 0.8); break;
    case 'dirt': [c, ctx] = canvas(S, S); ctx.fillStyle = '#6b4a2f'; ctx.fillRect(0, 0, S, S);
      speckle(ctx, S, S, r, 700, ['#5a3c24', '#7d5a3a', '#4a301c', '#8a6b48'], 2, 9, 0.6);
      speckle(ctx, S, S, r, 80, ['#9a9080', '#6f6558'], 3, 8, 0.8); break;
    case 'stone': [c, ctx] = canvas(S, S); ctx.fillStyle = '#7d7a70'; ctx.fillRect(0, 0, S, S);
      speckle(ctx, S, S, r, 500, ['#6a675e', '#8e8b80', '#5c5a52', '#a09c8f'], 4, 16, 0.5);
      speckle(ctx, S, S, r, 200, ['#5d7a3a', '#6f8f44'], 3, 10, 0.5); break;
    case 'ruin': [c, ctx] = canvas(S, S); ctx.fillStyle = '#b3a37f'; ctx.fillRect(0, 0, S, S);
      speckle(ctx, S, S, r, 400, ['#a39371', '#c4b590', '#8f7f60'], 4, 12, 0.5);
      ctx.strokeStyle = '#6e6048'; ctx.lineWidth = 3; for (let y = 0; y < S; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke(); for (let x = (y / 64) % 2 * 64; x < S; x += 128) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 64); ctx.stroke(); } }
      speckle(ctx, S, S, r, 160, ['#5f8a3a', '#4e7a2e'], 3, 12, 0.6);
      ctx.strokeStyle = '#3fd6c0'; ctx.globalAlpha = 0.45; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(128, 96, 18, 0, 7); ctx.moveTo(110, 96); ctx.lineTo(146, 96); ctx.moveTo(128, 78); ctx.lineTo(128, 114); ctx.stroke(); ctx.globalAlpha = 1; break;
    case 'bark': [c, ctx] = canvas(S, S); ctx.fillStyle = '#5b3d27'; ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 70; i++) { ctx.strokeStyle = ['#4a301e', '#6e4c32', '#3e2718'][i % 3]; ctx.lineWidth = 2 + r() * 5; ctx.beginPath(); const x = r() * S; ctx.moveTo(x, 0); ctx.bezierCurveTo(x + r() * 20 - 10, S / 3, x + r() * 20 - 10, 2 * S / 3, x, S); ctx.stroke(); }
      speckle(ctx, S, S, r, 120, ['#4f7f2c', '#6a9a36'], 3, 10, 0.5); break;
    case 'wood': case 'plank': [c, ctx] = canvas(S, S); ctx.fillStyle = '#8a5a32'; ctx.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 32) { ctx.fillStyle = ['#7d5029', '#94643a', '#86582f'][(y / 32) % 3]; ctx.fillRect(0, y, S, 30); ctx.fillStyle = '#4a2c14'; ctx.fillRect(0, y + 30, S, 2); }
      for (let i = 0; i < 90; i++) { ctx.strokeStyle = '#6a4220'; ctx.globalAlpha = 0.4; ctx.beginPath(); const y = r() * S; ctx.moveTo(0, y); ctx.lineTo(S, y + r() * 4 - 2); ctx.stroke(); } ctx.globalAlpha = 1; break;
    case 'leaf': [c, ctx] = canvas(S, S); ctx.fillStyle = '#3f7d2a'; ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 160; i++) { ctx.fillStyle = ['#2f6a20', '#4f9a34', '#5fae3c', '#397527'][i % 4]; ctx.save(); ctx.translate(r() * S, r() * S); ctx.rotate(r() * 6); ctx.beginPath(); ctx.ellipse(0, 0, 14, 5, 0, 0, 7); ctx.fill(); ctx.restore(); } break;
    case 'cliff': [c, ctx] = canvas(S, S); ctx.fillStyle = '#6d6a5f'; ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 30; i++) { ctx.fillStyle = ['#5e5b51', '#7c796d', '#8a8577', '#55524a'][i % 4]; ctx.fillRect(0, r() * S, S, 4 + r() * 12); }
      speckle(ctx, S, S, r, 200, ['#4e7a30', '#5f8f3a', '#3e6a28'], 3, 12, 0.6); break;
    case 'sand': [c, ctx] = canvas(S, S); ctx.fillStyle = '#8e8a62'; ctx.fillRect(0, 0, S, S);
      speckle(ctx, S, S, r, 800, ['#7e7a55', '#a09a70', '#6a6848'], 1, 5, 0.6); break;
    case 'cave': [c, ctx] = canvas(S, S); ctx.fillStyle = '#2e2a3a'; ctx.fillRect(0, 0, S, S);
      speckle(ctx, S, S, r, 600, ['#3a3448', '#262232', '#453d55'], 3, 12, 0.6);
      speckle(ctx, S, S, r, 50, ['#5ff0ff', '#b07aff', '#6affb0'], 1, 3, 0.9); break;
    case 'mine': [c, ctx] = canvas(S, S); ctx.fillStyle = '#4a3a2c'; ctx.fillRect(0, 0, S, S);
      speckle(ctx, S, S, r, 600, ['#3e3024', '#5a4636', '#33271d'], 3, 12, 0.6);
      speckle(ctx, S, S, r, 40, ['#ffb040', '#ffd070'], 2, 4, 0.9); break;
    case 'temple': [c, ctx] = canvas(S, S); ctx.fillStyle = '#a0783a'; ctx.fillRect(0, 0, S, S);
      speckle(ctx, S, S, r, 400, ['#8e682e', '#b88a48', '#7a5a28'], 4, 12, 0.5);
      ctx.strokeStyle = '#5a3e18'; ctx.lineWidth = 3; for (let y = 0; y < S; y += 42) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke(); }
      ctx.strokeStyle = '#ffd060'; ctx.globalAlpha = 0.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(64 + i * 42, 128, 10, 0, 7); ctx.stroke(); } ctx.globalAlpha = 1; break;
    case 'glyph': [c, ctx] = canvas(S, S); ctx.fillStyle = '#4a5a66'; ctx.fillRect(0, 0, S, S);
      speckle(ctx, S, S, r, 300, ['#3e4c58', '#566874'], 4, 10, 0.5);
      ctx.strokeStyle = '#6ff8e0'; ctx.lineWidth = 4; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(32 + i * 64, 128, 20, 0, Math.PI); ctx.moveTo(32 + i * 64, 108); ctx.lineTo(32 + i * 64, 150); ctx.stroke(); } break;
    case 'crystal': [c, ctx] = canvas(S, S); ctx.fillStyle = '#5a3aa0'; ctx.fillRect(0, 0, S, S);
      speckle(ctx, S, S, r, 300, ['#7a5ad0', '#9a7af0', '#4a2a80'], 5, 20, 0.6); break;
    case 'cloud': [c, ctx] = canvas(S, S); ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, S, S);
      speckle(ctx, S, S, r, 300, ['#ffffff', '#d0dcf0', '#f8e8ff'], 8, 24, 0.5); break;
    case 'mossw': [c, ctx] = canvas(S, S); ctx.fillStyle = '#2f5a2a'; ctx.fillRect(0, 0, S, S);
      speckle(ctx, S, S, r, 700, ['#3a6e30', '#28502a', '#4f8a3a', '#1f4020'], 3, 10, 0.7);
      ctx.strokeStyle = '#8affc0'; ctx.lineWidth = 3; ctx.globalAlpha = 0.8;
      for (let i = 0; i < 7; i++) { const x = 18 + i * 36; ctx.beginPath(); ctx.moveTo(x, 0); for (let y = 0; y <= S; y += 16) ctx.lineTo(x + Math.sin(y * 0.08 + i) * 7, y); ctx.stroke(); }
      ctx.globalAlpha = 1; speckle(ctx, S, S, r, 50, ['#d0ffe0'], 2, 3, 0.9); break;
    case 'rail': [c, ctx] = canvas(64, 64); ctx.fillStyle = '#5a3a20'; ctx.fillRect(0, 0, 64, 64); break;
    case 'glimspark': { [c, ctx] = canvas(64, 64); const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); return (cache[name] = tex(c, false)); }
    case 'waterfall': [c, ctx] = canvas(128, 512); ctx.fillStyle = '#9fe0f0'; ctx.fillRect(0, 0, 128, 512);
      for (let i = 0; i < 140; i++) { ctx.fillStyle = r() > 0.5 ? '#ffffff' : '#6fc0dc'; ctx.globalAlpha = 0.3 + r() * 0.5; ctx.fillRect(r() * 128, r() * 512, 2 + r() * 6, 30 + r() * 120); } ctx.globalAlpha = 1; break;
    default: [c, ctx] = canvas(8, 8); ctx.fillStyle = '#888'; ctx.fillRect(0, 0, 8, 8);
  }
  return (cache[name] = tex(c));
}
