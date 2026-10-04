import * as THREE from 'three';

// Context prompts: when Kiri gets near something you can interact with, a callout floats above it
// in the world saying what it is and exactly which button to press, with an arrow pointing at it.
// Button names follow the device (keyboard keys, or the on-screen touch buttons).
const $ = (id) => document.getElementById(id);
export class Prompts {
  constructor(game) {
    this.game = game; this.v = new THREE.Vector3(); this.cur = null;
    const el = document.createElement('div'); el.id = 'ctx'; el.innerHTML = '<div class="ctx-card"><i></i><div><b></b><span></span></div></div><div class="ctx-arrow">▼</div>';
    document.body.appendChild(el); this.el = el;
    this.ic = el.querySelector('i'); this.ti = el.querySelector('b'); this.tx = el.querySelector('span');
  }
  get touch() { return this.game.input.isTouch; }
  // a button chip, in the right vocabulary for the device
  key(a) {
    const T = { jump: ['⤒', 'Space'], action: ['⚡', 'Shift'], dash: ['➶', 'F'], down: ['stick ↓', '↓'], up: ['stick ↑', '↑'], dismount: ['⏏', 'C'] }[a];
    return `<kbd class="ctx-k">${this.touch ? T[0] : T[1]}</kbd>`;
  }
  // rewrite keyboard words in level hints into chips that match the device
  keys(html) {
    return html.replace(/<b>Shift<\/b>|\bShift\b/g, this.key('action')).replace(/<b>Space<\/b>|\bSpace\b/g, this.key('jump'))
      .replace(/<b>↑↓<\/b>/g, this.touch ? '<kbd class="ctx-k">stick</kbd>' : '<kbd class="ctx-k">↑↓</kbd>');
  }
  candidates() {
    const g = this.game, p = g.player, E = g.entities, K = (a) => this.key(a), out = [];
    const brom = p.hero === 'brom', beast = p.mount === 'beast';
    for (const t of E.totems) out.push({ s: t.s, y: t.y + 4.2, icon: '🗿', title: 'Echo Totem', text: `${p.grounded ? `Roll into it ${K('action')}, or jump and pound ${K('down')}` : `Ground pound it: ${K('down')} in mid-air`} · it shifts the ruins`, r: 9 });
    for (const b of g.powers?.blocks || []) if (!b.spent) out.push({ s: (b.o.s0 + b.o.s1) / 2, y: b.o.y1 + 0.6, icon: '✦', title: 'Lumen Block', text: `Jump up and bump it from below ${K('jump')}`, r: 6 });
    for (const o of E.solids) {
      if (!o.crack || o.broken || o.active === false) continue;
      const c = { s: (o.s0 + o.s1) / 2, y: o.y1 + 0.5, r: 8 };
      if (o.crack === 'beast') Object.assign(c, { icon: '🪨', title: 'Cracked wall', text: beast ? `Charge it with Grumbo ${K('action')}` : brom ? `Roll into it ${K('action')}` : 'Too tough for Kiri: bring Grumbo, or swap to Brom' });
      else if (o.crack === 'fire') Object.assign(c, { icon: '🔥', title: 'Bramble thicket', text: 'Burn it: grab an Ember Bloom from a Lumen Block, then shoot' });
      else if (o.crack === 'swim') Object.assign(c, { icon: '🌊', title: 'Sealed stone', text: `Tide Form: swim at it and dash ${K('action')}` });
      else if (o.crack === 'song') Object.assign(c, { icon: '♪', title: 'Blight', text: 'Sing the old song near it to melt it' });
      else continue;
      out.push(c);
    }
    for (const h of g.minis?.hollows || []) out.push({ s: h.s, y: h.y + 3, icon: '🕳', title: `Root Hollow · ${h.name}`, text: `Stand on it and press ${K('down')} to dive in`, r: 7 });
    for (const w of g.magic?.waystones || []) out.push({ s: w.s, y: w.y + 5, icon: '◈', title: w.lit ? 'Waystone' : 'Waystone (asleep)', text: w.lit ? `Press ${K('up')} to open the world map` : 'Walk up to it to wake it', r: w.lit ? 7 : 4.5 });
    for (const b of E.blooms) out.push({ s: b.s, y: b.y + 2.6, icon: '❀', title: 'Lumen Bloom', text: 'Touch it, then run across the light bridge before it fades', r: 7 });
    for (const pt of E.portals) out.push({ s: pt.s, y: pt.y + 3, icon: '◎', title: pt.name || 'Portal', text: 'Step into the ring', r: 6 });
    return out;
  }
  update() {
    const g = this.game, p = g.player, el = this.el;
    let best = null, bd = 1e9;
    if (g.state === 'play' && p.state === 'normal' && !p.cart) for (const c of this.candidates()) {
      const d = Math.hypot(c.s - p.s, (c.y - 3) - p.y); if (d < c.r && d < bd) { bd = d; best = c; }
    }
    if (!best) { el.classList.remove('on'); this.cur = null; return; }
    if (this.cur !== best.title + best.text) { this.cur = best.title + best.text; this.ic.textContent = best.icon; this.ti.textContent = best.title; this.tx.innerHTML = best.text; }
    g.path.world(best.s, best.y, 0, this.v); this.v.project(g.camera);
    const x = (this.v.x * 0.5 + 0.5) * innerWidth, y = (-this.v.y * 0.5 + 0.5) * innerHeight;
    const w = el.offsetWidth || 240, cx = Math.max(w / 2 + 8, Math.min(innerWidth - w / 2 - 8, x));
    el.style.transform = `translate(${cx - w / 2}px, ${Math.max(60, y - el.offsetHeight)}px)`;
    el.classList.add('on');
  }
}
