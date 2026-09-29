// Unified keyboard + touch input. Exposes held state and edge-triggered presses.
export class Input {
  constructor() {
    this.held = { left: false, right: false, up: false, down: false, jump: false, action: false, dismount: false, dash: false, swap: false };
    this.pressed = {};
    this.touch = { left: false, right: false, up: false, down: false, jump: false, action: false, dismount: false, dash: false, swap: false };
    this.keys = { left: false, right: false, up: false, down: false, jump: false, action: false, dismount: false, dash: false, swap: false };
    // analog stick (touch joystick or gamepad); x right+, y up+. mag scales run speed.
    this.stick = { x: 0, y: 0, on: false }; this.mag = 1;
    this.onKey = null;
    const map = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
      Space: 'jump', KeyZ: 'jump', ShiftLeft: 'action', ShiftRight: 'action', KeyX: 'action', KeyC: 'dismount', KeyF: 'dash', KeyE: 'dash', KeyQ: 'swap', Tab: 'swap',
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
    const ids = { 't-jump': 'jump', 't-act': 'action', 't-off': 'dismount', 't-dash': 'dash', 't-swap': 'swap' };
    const active = new Map(); // pointerId -> key
    const setFrom = () => {
      for (const k of ['jump', 'action', 'dismount', 'dash', 'swap']) this.touch[k] = false;
      for (const k of active.values()) this.touch[k] = true;
      for (const id in ids) document.getElementById(id)?.classList.toggle('on', this.touch[ids[id]]);
    };
    const hit = (x, y) => {
      const el = document.elementFromPoint(x, y)?.closest('.tbtn');
      return el && ids[el.id];
    };
    // floating joystick: lands wherever the left thumb goes down, follows if dragged past its rim
    const stickEl = document.getElementById('stick'), knob = document.getElementById('stick-knob');
    const js = { id: null, ox: 0, oy: 0 };
    const R = () => Math.max(38, Math.min(70, Math.min(innerWidth, innerHeight) * 0.13));
    const setStick = (x, y) => {
      const r = R(); let dx = x - js.ox, dy = y - js.oy; const d = Math.hypot(dx, dy);
      if (d > r) { js.ox += dx * (1 - r / d); js.oy += dy * (1 - r / d); dx = x - js.ox; dy = y - js.oy; } // drag the base along
      const nx = dx / r, ny = -dy / r, T = this.touch, was = { left: T.left, right: T.right, up: T.up, down: T.down };
      this.stick.x = nx; this.stick.y = ny; this.stick.on = true;
      T.left = nx < -0.28; T.right = nx > 0.28;
      T.up = ny > 0.6 && Math.abs(ny) > Math.abs(nx) * 0.8; T.down = ny < -0.6 && Math.abs(ny) > Math.abs(nx) * 0.8;
      for (const k in was) if (T[k] && !was[k]) this.pressed[k] = true;
      stickEl.style.transform = `translate(${js.ox}px,${js.oy}px)`; knob.style.transform = `translate(${dx}px,${dy}px)`;
    };
    const endStick = () => {
      js.id = null; Object.assign(this.stick, { x: 0, y: 0, on: false });
      this.touch.left = this.touch.right = this.touch.up = this.touch.down = false;
      stickEl.classList.remove('live'); stickEl.style.transform = ''; knob.style.transform = '';
    };
    const onDown = (e) => {
      const k = hit(e.clientX, e.clientY);
      if (!k) {
        if (js.id === null && e.target.id === 't-zone') { e.preventDefault(); js.id = e.pointerId; js.ox = e.clientX; js.oy = e.clientY; stickEl.classList.add('live'); setStick(e.clientX, e.clientY); }
        return;
      }
      e.preventDefault();
      if (!this.touch[k]) this.pressed[k] = true;
      active.set(e.pointerId, k); setFrom();
    };
    const onMove = (e) => { if (e.pointerId === js.id) setStick(e.clientX, e.clientY); };
    const onUp = (e) => { if (e.pointerId === js.id) endStick(); if (active.delete(e.pointerId)) setFrom(); };
    const pad = document.getElementById('touch');
    pad.addEventListener('pointerdown', onDown);
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', onUp);
    addEventListener('pointercancel', onUp);
    addEventListener('blur', endStick);
  }
  update() {
    const pads = (navigator.getGamepads ? [...navigator.getGamepads()] : []).filter(Boolean);
    const pad = {};
    // gamepad 1 drives Kiri (standard mapping): stick/d-pad, A jump, X/B action, Y hop off, Start pause
    const g0 = pads[0];
    if (g0) {
      const ax = g0.axes[0] || 0, ay = g0.axes[1] || 0, b = (i) => !!(g0.buttons[i] && g0.buttons[i].pressed);
      Object.assign(pad, { left: ax < -0.28 || b(14), right: ax > 0.28 || b(15), up: ay < -0.6 || b(12), down: ay > 0.6 || b(13), jump: b(0), action: b(2) || b(1), dismount: b(3), dash: b(5) || b(7) || b(4) || b(6), swap: b(8) });
      if (Math.abs(ax) > 0.28 || Math.abs(ay) > 0.28) { pad.sx = ax; pad.sy = -ay; }
      const prev = this.padPrev[0];
      for (const k in pad) { if (k === 'sx' || k === 'sy') continue; if (pad[k] && !prev[k]) this.pressed[k] = true; prev[k] = pad[k]; }
      if (b(9) && !prev.start && this.onKey) this.onKey('KeyP'); prev.start = b(9);
    }
    for (const k in this.held) this.held[k] = this.keys[k] || this.touch[k] || !!pad[k];
    // analog direction: keys are full-tilt; stick tilt scales speed (a light push walks)
    const kx = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0), ky = (this.keys.up ? 1 : 0) - (this.keys.down ? 1 : 0);
    if (kx || ky) { this.ax = kx; this.ay = ky; this.mag = 1; }
    else if (this.stick.on) { this.ax = this.stick.x; this.ay = this.stick.y; this.mag = Math.min(1, Math.abs(this.stick.x) * 1.35); }
    else if (pad.sx !== undefined) { this.ax = pad.sx; this.ay = pad.sy; this.mag = Math.min(1, Math.abs(pad.sx) * 1.35); }
    else { this.ax = (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0); this.ay = (this.held.up ? 1 : 0) - (this.held.down ? 1 : 0); this.mag = 1; }
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
