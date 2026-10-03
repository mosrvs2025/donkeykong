import * as THREE from 'three';
import { store } from './menu.js';

// Easter eggs. None of these are mentioned anywhere in the game.
//  · the old cheat code (↑↑↓↓←→←→ B A) turns the world into an 8-bit cartridge
//  · tap the THORNWILD logo seven times: Golden Kiri
//  · stand still and tap ↓ five times quickly: a victory dance
//  · leave the controls alone for 40 seconds and Kiri curls up for a nap
//  · land on exactly 777 glims: jackpot
//  · tap "Paused" five times: a note from the makers
const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
const $ = (id) => document.getElementById(id);
export class Eggs {
  constructor(game) {
    this.game = game; this.seq = []; this.downs = []; this.danceT = 0; this.found = new Set(JSON.parse(store.get('eggs') || '[]'));
    addEventListener('keydown', (e) => {
      this.seq.push(e.code); if (this.seq.length > CODE.length) this.seq.shift();
      if (this.seq.join() === CODE.join()) { this.seq = []; this.retro(!this.retroOn); }
    });
    let taps = 0, tapT = 0;
    $('title')?.querySelector('h1')?.addEventListener('pointerdown', () => {
      const now = performance.now(); taps = now - tapT < 600 ? taps + 1 : 1; tapT = now;
      if (taps >= 7) { taps = 0; const on = store.get('golden') !== '1'; store.set('golden', on ? '1' : '0'); this.golden(); this.egg('golden', on ? '✦ GOLDEN KIRI ✦' : 'Kiri is Kiri again', on ? 'shine on' : ''); }
    });
    let ptaps = 0, pT = 0;
    $('pause')?.querySelector('h2')?.addEventListener('pointerdown', () => {
      const now = performance.now(); ptaps = now - pT < 700 ? ptaps + 1 : 1; pT = now;
      if (ptaps >= 5) { ptaps = 0; $('save-note').innerHTML = 'Thornwild was grown, not built: one root at a time.<br>Thank you for wandering it. ♥'; this.egg('makers'); }
    });
    // pixelated cartridge look lives in the grading pass
    const C = game.cine; C.uniforms.retro = { value: 0 }; C.uniforms.res = { value: new THREE.Vector2(innerWidth, innerHeight) };
    C.material.uniforms = C.uniforms;
    C.material.fragmentShader = C.material.fragmentShader
      .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse; uniform float retro; uniform vec2 res;')
      .replace('vec2 c = vUv - 0.5;', 'vec2 uv0 = vUv; vec2 px = vec2(320.0, 320.0 * res.y / res.x); vec2 vUvR = mix(vUv, (floor(vUv * px) + 0.5) / px, retro);\n      vec2 c = vUvR - 0.5;')
      .replace(/texture2D\(tDiffuse, vUv/g, 'texture2D(tDiffuse, vUvR')
      .replace('gl_FragColor = vec4(col, 1.0);', 'col = mix(col, floor(col * 5.0 + 0.5) / 5.0, retro); gl_FragColor = vec4(col, 1.0);');
    C.material.needsUpdate = true;
    this.golden();
  }
  egg(id, title, sub) {
    const g = this.game, first = !this.found.has(id);
    if (first) { this.found.add(id); store.set('eggs', JSON.stringify([...this.found])); }
    if (title) g.hud.banner(title, sub || '', 2.5);
    g.audio.play('shard'); if (first) setTimeout(() => g.hud.toast(`Easter egg found · ${this.found.size}/6`, 2.5), 900);
  }
  retro(on) {
    this.retroOn = on; this.game.cine.uniforms.retro.value = on ? 1 : 0; this.game.cine.uniforms.res.value.set(innerWidth, innerHeight);
    this.game.audio.play(on ? 'checkpoint' : 'dismount');
    this.egg('retro', on ? '8-BIT KIRI' : 'BACK TO HD', on ? 'blow on the cartridge' : '');
  }
  golden() {
    const m = this.game.player?.model; if (!m) return; const on = store.get('golden') === '1';
    m.traverse((o) => {
      if (!o.isMesh || !o.material || o.userData.scarf) return;
      if (on && o.material.color && !o.userData.gold0) { o.userData.gold0 = { c: o.material.color.getHex(), m: o.material.metalness, r: o.material.roughness }; const l = o.material.color.getHSL({}).l; o.material.color.setHSL(0.12, 0.8, 0.25 + l * 0.6); o.material.metalness = 0.85; o.material.roughness = 0.25; }
      else if (!on && o.userData.gold0) { const s = o.userData.gold0; o.material.color.setHex(s.c); o.material.metalness = s.m; o.material.roughness = s.r; delete o.userData.gold0; }
    });
  }
  step(h) {
    const g = this.game, p = g.player, I = g.input;
    // victory dance: five quick ↓ taps while standing still
    if (I.peek('down') && p.grounded && p.stillT > 0.05 && p.state === 'normal' && !p.mount) {
      const now = g.time; if (now === this.lastDown) return; this.lastDown = now; this.downs = this.downs.filter((t) => now - t < 1.6); this.downs.push(now);
      if (this.downs.length >= 5) { this.downs = []; this.danceT = 2.4; g.audio.play('win'); g.fx.burst(g.path.world(p.s, p.y + 1.2, 0), 0xffd060, 50, 8, 0.8, 1.2, -6); this.egg('dance', '', ''); g.hud.toast('<b>Woohoo!</b>', 1.5); }
    }
    // jackpot
    if (!this.jackpot && g.stats.glims === 777) { this.jackpot = true; g.addGlims(77, g.path.world(p.s, p.y + 2, 0)); g.fx.burst(g.path.world(p.s, p.y + 2, 0), 0xffe060, 80, 10, 1, 1.4, -8); this.egg('jackpot', '★ 777 ★', 'jackpot! +77 glims'); }
  }
  // runs after the player has posed, to layer the egg poses on top
  update(dt) {
    const g = this.game, p = g.player, ud = p.model.userData, t = g.time;
    if (this.danceT > 0) {
      this.danceT -= dt; const k = this.danceT;
      ud.body.rotation.y = k * 9; ud.body.position.y = Math.abs(Math.sin(k * 9)) * 0.4;
      ud.arms.forEach((a, i) => { a.rotation.z = 2.6 + Math.sin(k * 18 + i * Math.PI) * 0.4; });
      if (Math.random() < dt * 25) g.fx.spawn(g.path.world(p.s + (Math.random() - 0.5) * 2, p.y + 2.2, 0), new THREE.Vector3((Math.random() - 0.5) * 3, -2, 0), [0xff6080, 0x60d0ff, 0xffe060, 0x80ff90][Math.floor(Math.random() * 4)], 0.4, 1.2, -4);
      if (this.danceT <= 0) ud.body.rotation.y = 0;
    }
    // nap after 40 quiet seconds
    const napping = p.idleT > 40 && p.grounded && g.state === 'play' && p.state === 'normal' && !p.mount;
    if (napping) {
      ud.body.rotation.z = 1.35; ud.body.position.y = 0.35; ud.eyeL.scale.y = ud.eyeR.scale.y = 0.1;
      ud.body.scale.y = 1 + Math.sin(t * 1.6) * 0.04;
      if (Math.random() < dt * 0.9) g.fx.spawn(g.path.world(p.s + 0.3, p.y + 1.1, 0.3), new THREE.Vector3(0.4, 0.9, 0), 0xffffff, 0.5, 2.2, 0);
      if (!this.napped) { this.napped = true; this.egg('nap', '', ''); g.hud.toast('Zzz…', 2); }
    } else this.napped = false;
  }
}
