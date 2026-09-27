// Unified keyboard + touch input. Exposes held state and edge-triggered presses.
export class Input {
  constructor() {
    this.held = { left: false, right: false, up: false, down: false, jump: false, action: false };
    this.pressed = {};
    this.touch = { left: false, right: false, up: false, down: false, jump: false, action: false };
    this.keys = { left: false, right: false, up: false, down: false, jump: false, action: false };
    this.onKey = null;
    const map = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
      Space: 'jump', KeyZ: 'jump', ShiftLeft: 'action', ShiftRight: 'action', KeyX: 'action', KeyJ: 'action',
    };
    addEventListener('keydown', (e) => {
      const k = map[e.code];
      if (k) { e.preventDefault(); if (!this.keys[k]) this.pressed[k] = true; this.keys[k] = true; }
      if (this.onKey) this.onKey(e.code);
    });
    addEventListener('keyup', (e) => { const k = map[e.code]; if (k) this.keys[k] = false; });
    addEventListener('blur', () => { for (const k in this.keys) this.keys[k] = false; });
    this.isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
    const ids = { 't-left': 'left', 't-right': 'right', 't-up': 'up', 't-down': 'down', 't-jump': 'jump', 't-act': 'action' };
    const active = new Map(); // pointerId -> key
    const setFrom = () => {
      for (const k in this.touch) this.touch[k] = false;
      for (const k of active.values()) this.touch[k] = true;
      for (const id in ids) document.getElementById(id)?.classList.toggle('on', this.touch[ids[id]]);
    };
    const hit = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el && ids[el.id];
    };
    const onDown = (e) => {
      const k = hit(e.clientX, e.clientY); if (!k) return;
      e.preventDefault();
      if (!this.touch[k]) this.pressed[k] = true;
      active.set(e.pointerId, k); setFrom();
    };
    const onMove = (e) => {
      if (!active.has(e.pointerId)) return;
      const k = hit(e.clientX, e.clientY);
      const prev = active.get(e.pointerId);
      // allow sliding between left/right pads
      if (k && k !== prev && (k === 'left' || k === 'right') && (prev === 'left' || prev === 'right')) { active.set(e.pointerId, k); setFrom(); }
    };
    const onUp = (e) => { if (active.delete(e.pointerId)) setFrom(); };
    const pad = document.getElementById('touch');
    pad.addEventListener('pointerdown', onDown);
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', onUp);
    addEventListener('pointercancel', onUp);
  }
  update() {
    for (const k in this.held) this.held[k] = this.keys[k] || this.touch[k];
  }
  consume(k) { const v = !!this.pressed[k]; this.pressed[k] = false; return v; }
  peek(k) { return !!this.pressed[k]; }
  endFrame() { this.pressed = {}; }
}
