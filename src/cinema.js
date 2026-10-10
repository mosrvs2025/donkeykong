// Cinematic touches: an iris wipe that opens from Kiri when a level starts (and from the centre
// when the world map appears), and a short camera flyover the first time you enter each level.
export class Cinema {
  constructor(game) {
    this.game = game;
    const el = document.createElement('div'); el.id = 'iris'; document.body.appendChild(el); this.el = el;
  }
  // open a black iris from a screen point (0..1) outward over ~0.75s
  iris(x = 0.5, y = 0.5) {
    const el = this.el, start = performance.now(), max = Math.hypot(innerWidth, innerHeight);
    el.style.setProperty('--x', `${x * 100}%`); el.style.setProperty('--y', `${y * 100}%`); el.style.setProperty('--r', '0px'); el.classList.add('on');
    cancelAnimationFrame(this.raf);
    const step = (now) => { const k = Math.min(1, (now - start) / 750), e = 1 - Math.pow(1 - k, 3);
      el.style.setProperty('--r', `${e * max}px`); if (k < 1) this.raf = requestAnimationFrame(step); else el.classList.remove('on'); };
    this.raf = requestAnimationFrame(step);
  }
  screenOf(s, y) { const g = this.game, v = g.path.world(s, y, 0).project(g.camera); return [Math.min(0.95, Math.max(0.05, v.x * 0.5 + 0.5)), Math.min(0.95, Math.max(0.05, -v.y * 0.5 + 0.5))]; }
  enterLevel(lv) {
    const g = this.game, p = g.player, st = (g.progress.levels[lv.id] ||= {});
    // first visit: sweep in from deep inside the level to Kiri (input stays live; the camera blends back)
    if (!st.flown && !lv.mode && lv.id !== 'rootwild') {
      st.flown = true;
      const ahead = Math.min((lv.end ?? lv.start[0] + 120) + 80, p.s + 90), far = g.path.world(ahead, p.y + 22, 46), mid = g.path.world(p.s + 20, p.y + 8, 24);
      const lookFar = g.path.world(ahead - 20, p.y + 4, 0);
      g.director.play({ dur: 3.4, blendOut: true,
        pos: (u) => (u < 0.5 ? far.clone().lerp(mid, u * 2) : mid.clone().lerp(g.path.world(p.s, p.y + 4, 18), (u - 0.5) * 2)),
        look: (u) => lookFar.clone().lerp(g.path.world(p.s, p.y + 1, 0), Math.min(1, u * 1.3)) });
      this.iris(0.5, 0.5);
    } else { g.director.update(0.016, p, true); const [x, y] = this.screenOf(p.s, p.y + 0.8); this.iris(x, y); }
  }
}
