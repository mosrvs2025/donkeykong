// Unified keyboard + touch input. Exposes held state and edge-triggered presses.
export class Input {
  constructor() {
    this.held = { left: false, right: false, up: false, down: false, jump: false, action: false, dismount: false };
    this.pressed = {};
    this.touch = { left: false, right: false, up: false, down: false, jump: false, action: false, dismount: false };
    this.keys = { left: false, right: false, up: false, down: false, jump: false, action: false, dismount: false };
    this.onKey = null;
    const map = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
      Space: 'jump', KeyZ: 'jump', ShiftLeft: 'action', ShiftRight: 'action', KeyX: 'action', KeyC: 'dismount',
    };
    this.p2 = { x: 0, y: 0, action: false }; this.p2keys = {};
    const p2map = { KeyI: 'up', KeyK: 'down', KeyJ: 'left', KeyL: 'right', KeyO: 'act', KeyU: 'act' };
    addEventListener('keydown', (e) => { if (p2map[e.code]) this.p2keys[p2map[e.code]] = true; });
    addEventListener('keyup', (e) => { if (p2map[e.code]) this.p2keys[p2map[e.code]] = false; });
    this.padPrev = [{}, {}];
    addEventListener('keydown', (e) => {
      const k = map[e.code];
      if (k) { e.preventDefault(); if (!this.keys[k]) this.pressed[k] = true; this.keys[k] = true; }
      if (this.onKey) this.onKey(e.code);
    });
    addEventListener('keyup', (e) => { const k = map[e.code]; if (k) this.keys[k] = false; });
    addEventListener('blur', () => { for (const k in this.keys) this.keys[k] = false; });
    this.isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
    const ids = { 't-left': 'left', 't-right': 'right', 't-up': 'up', 't-down': 'down', 't-jump': 'jump', 't-act': 'action', 't-off': 'dismount' };
    const active = new Map(); // pointerId -> key
    const setFrom = () => {
      for (const k in this.touch) this.touch[k] = false;
      for (const k of active.values()) this.touch[k] = true;
      for (const id in ids) document.getElementById(id)?.classList.toggle('on', this.touch[ids[id]]);
    };
    const hit = (x, y) => {
      const el = document.elementFromPoint(x, y)?.closest('.tbtn');
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
    const pads = (navigator.getGamepads ? [...navigator.getGamepads()] : []).filter(Boolean);
    const pad = {};
    // gamepad 1 drives Kiri (standard mapping): stick/d-pad, A jump, X/B action, Y hop off, Start pause
    const g0 = pads[0];
    if (g0) {
      const ax = g0.axes[0] || 0, ay = g0.axes[1] || 0, b = (i) => !!(g0.buttons[i] && g0.buttons[i].pressed);
      Object.assign(pad, { left: ax < -0.4 || b(14), right: ax > 0.4 || b(15), up: ay < -0.5 || b(12), down: ay > 0.5 || b(13), jump: b(0), action: b(2) || b(1), dismount: b(3) });
      const prev = this.padPrev[0];
      for (const k in pad) { if (pad[k] && !prev[k]) this.pressed[k] = true; prev[k] = pad[k]; }
      if (b(9) && !prev.start && this.onKey) this.onKey('KeyP'); prev.start = b(9);
    }
    for (const k in this.held) this.held[k] = this.keys[k] || this.touch[k] || !!pad[k];
    // player 2 (Lumi): IJKL + O, or a second gamepad
    const K = this.p2keys; let x = (K.right ? 1 : 0) - (K.left ? 1 : 0), y = (K.up ? 1 : 0) - (K.down ? 1 : 0), act = !!K.act;
    const g1 = pads[1];
    if (g1) { const ax = g1.axes[0] || 0, ay = g1.axes[1] || 0; if (Math.abs(ax) > 0.25) x = ax; if (Math.abs(ay) > 0.25) y = -ay; if (g1.buttons[2]?.pressed || g1.buttons[0]?.pressed) act = true; }
    this.p2.x = x; this.p2.y = y; this.p2.action = act;
  }
  consume(k) { const v = !!this.pressed[k]; this.pressed[k] = false; return v; }
  peek(k) { return !!this.pressed[k]; }
  endFrame() { this.pressed = {}; }
}
