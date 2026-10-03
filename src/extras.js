import * as THREE from 'three';

// Seed Coins, the merchant's shop, hats, time medals, the Lumen Compass, glim magnetism,
// photo mode and assist options: the "complete package" layer.
const O = 80;
const $ = (id) => document.getElementById(id);

export const COINS = {
  rootwild: [[93, 11.5], [170, 1.3], [238, -5.6]],
  thornwell: [[102, -614.8], [118, -697.2], [190, -720.8]],
  canopy: [[333, 21.5], [330, 42], [472, 40.2]],
  skyward: [[444, 836], [590, 805], [695, 832]],
  ruins: [[724, 1.3], [648, -8.3], [830, 25]],
  sunken: [[521.5, -391.5], [460, -401], [600, -341]],
  glowdeep: [[990, -20.8], [1015, 56.4], [944, 3]],
  mine: [[1197, -10.2], [1084, 1.6], [1075, 3]],
  heart: [[1520, 7.6], [1503, -11], [1540, 105.6]],
};
export const MEDAL_TIMES = { rootwild: 150, canopy: 160, skyward: 120, ruins: 170, sunken: 150, glowdeep: 150, mine: 110, heart: 260 };
export function medalFor(id, t) { const g = MEDAL_TIMES[id] || 150; return t <= g ? 'gold' : t <= g * 1.4 ? 'silver' : 'bronze'; }
export const MEDAL_ICON = { gold: '🥇', silver: '🥈', bronze: '🥉' };

export const SHOP = [
  { id: 'heart1', name: 'Heart Container', desc: '+1 maximum heart', cost: 150, kind: 'heart' },
  { id: 'heart2', name: 'Heart Container', desc: '+1 maximum heart', cost: 300, kind: 'heart', needs: 'heart1' },
  { id: 'compass', name: 'Lumen Compass', desc: 'Points toward the nearest Seed Coin in a level', cost: 200 },
  { id: 'hat_leaf', name: 'Leaf Cap', desc: 'A jaunty leaf, freshly picked', cost: 80, kind: 'hat' },
  { id: 'hat_explorer', name: 'Explorer Hat', desc: 'For serious ruin-divers', cost: 160, kind: 'hat' },
  { id: 'hat_crown', name: 'Sunwright Crown', desc: 'Found only by those who look everywhere', cost: 120, coins: 6, kind: 'hat' },
  { id: 'hat_moon', name: 'Moonpetal Crown', desc: 'It glows faintly, like the Grove', cost: 200, coins: 15, kind: 'hat' },
  { id: 'hat_party', name: 'Party Hat', desc: 'Won by striking gold in a Root Hollow game', cost: 0, kind: 'hat', reward: true },
  { id: 'scarf_ember', name: 'Ember Scarf', desc: 'Warm as a forge', cost: 90, kind: 'scarf', color: 0xff6a30 },
  { id: 'scarf_tide', name: 'Tide Scarf', desc: 'Cool as the Sanctum', cost: 90, kind: 'scarf', color: 0x3ab0ff },
  { id: 'scarf_star', name: 'Starfall Scarf', desc: 'Woven from the Starwell’s sky', cost: 150, coins: 20, kind: 'scarf', color: 0xc9a0ff },
];

function makeHat(id) {
  const g = new THREE.Group();
  const M = (c, e = 0) => new THREE.MeshStandardMaterial({ color: c, emissive: e, roughness: 0.6 });
  if (id === 'hat_leaf') { const l = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 6), M(0x4fae3c)); l.scale.set(1.3, 0.25, 0.7); l.rotation.z = 0.5; l.position.set(-0.05, 0.36, 0); g.add(l); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 4), M(0x3a6a20)); st.position.set(0.12, 0.33, 0); g.add(st); }
  if (id === 'hat_explorer') { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.04, 20), M(0xb89060)); b.position.y = 0.28; g.add(b); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.22, 16), M(0xc8a070)); c.position.y = 0.4; g.add(c); const band = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.05, 16), M(0x5a3018)); band.position.y = 0.32; g.add(band); }
  if (id === 'hat_crown' || id === 'hat_moon') {
    const col = id === 'hat_crown' ? 0xffc840 : 0xd0c0ff;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.12, 12, 1, true), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: id === 'hat_moon' ? 1.2 : 0.3, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide })); ring.position.y = 0.34; g.add(ring);
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), ring.material); const a = i / 5 * Math.PI * 2; s.position.set(Math.cos(a) * 0.24, 0.46, Math.sin(a) * 0.24); g.add(s); }
  }
  if (id === 'hat_party') { const c = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 14), new THREE.MeshStandardMaterial({ color: 0xff5aa0, emissive: 0x401030 })); c.position.y = 0.52; g.add(c); const pom = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshStandardMaterial({ color: 0xfff060, emissive: 0x806000 })); pom.position.y = 0.8; g.add(pom); }
  return g;
}

export class Extras {
  constructor(game) {
    this.game = game; this.path = game.path;
    this.group = new THREE.Group(); game.scene.add(this.group);
    const P = game.progress;
    P.coins ||= []; P.owned ||= []; P.hat ||= null; P.scarf ||= null; P.medals ||= {};
    const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 24);
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd060, emissive: 0xffa020, emissiveIntensity: 0.9, metalness: 0.8, roughness: 0.25 });
    const seedMat = new THREE.MeshStandardMaterial({ color: 0, emissive: 0x7affc0, emissiveIntensity: 2 });
    this.coins = [];
    for (const lv in COINS) COINS[lv].forEach(([s, y], i) => {
      const g = new THREE.Group(); const c = new THREE.Mesh(coinGeo, coinMat); c.rotation.x = Math.PI / 2; g.add(c);
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), seedMat); seed.scale.y = 1.4; seed.position.z = 0.08; g.add(seed);
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.8, 30), new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.5, side: THREE.DoubleSide })); g.add(halo);
      this.path.place(g, s + O, y + 0.6, 0); this.group.add(g);
      const id = `${lv}:${i}`;
      this.coins.push({ id, lv, s: s + O, y, g, taken: P.coins.includes(id) });
    });
    this.hatNode = null; this.applyLook();
    this.compassEl = $('compass');
    this.photo = { on: false, yaw: 0, pitch: 0.25, dist: 9, filter: 0 };
    this.bindPhoto();
  }
  get coinCount() { return this.game.progress.coins.length; }
  levelCoins(id) { return this.coins.filter((c) => c.lv === id); }
  collectCoin(c) {
    const game = this.game;
    c.taken = true; game.progress.coins.push(c.id);
    const n = this.levelCoins(c.lv).filter((x) => x.taken).length;
    game.audio.play('shard'); game.flash(0.25); game.slowT = 0.35;
    game.fx.burst(this.path.world(c.s, c.y + 0.6, 0), 0xffd060, 40, 8, 0.8, 1, -4);
    game.hud.banner('SEED COIN', `${n} of 3 in this level · ${this.coinCount} total`, 2.5);
    game.magic.celebrate(); game.saveGame();
  }
  applyLook() {
    const game = this.game, P = game.progress, head = game.player.model.userData.head;
    if (this.hatNode) { head.remove(this.hatNode); this.hatNode = null; }
    if (P.hat) { this.hatNode = makeHat(P.hat); this.hatNode.rotation.z = -0.1; head.add(this.hatNode); game.addRim?.(this.hatNode); }
    const item = SHOP.find((x) => x.id === P.scarf);
    if (item) game.player.model.traverse((o) => { if (o.isMesh && o.userData.scarf) { o.material.color.setHex(item.color); o.material.emissive?.setHex(item.color); o.material.emissiveIntensity = 0.35; } });
    if (P.owned.includes('heart1')) game.player.maxHearts = Math.max(game.player.maxHearts, 4);
    if (P.owned.includes('heart2')) game.player.maxHearts = Math.max(game.player.maxHearts, 5);
  }
  // ── the shop (opened from the world map)
  openShop() {
    const game = this.game;
    this.shopOpen = true; $('shop').classList.remove('hidden'); this.renderShop();
    game.audio.play('notice');
  }
  closeShop() { this.shopOpen = false; $('shop').classList.add('hidden'); this.game.map.render(); }
  renderShop(msg = '') {
    const game = this.game, P = game.progress, glims = game.stats.glims, coins = this.coinCount;
    const rows = SHOP.filter((it) => (!it.needs || P.owned.includes(it.needs)) && (!it.reward || P.owned.includes(it.id))).map((it) => {
      const own = P.owned.includes(it.id);
      const equipped = (it.kind === 'hat' && P.hat === it.id) || (it.kind === 'scarf' && P.scarf === it.id);
      const locked = it.coins && coins < it.coins;
      const btn = own ? (it.kind === 'hat' || it.kind === 'scarf' ? `<button class="small ${equipped ? 'alt' : 'ghost'}" data-eq="${it.id}">${equipped ? 'Wearing' : 'Wear'}</button>` : '<span class="owned">owned</span>')
        : locked ? `<span class="lock">needs ${it.coins} Seed Coins</span>` : `<button class="small" data-buy="${it.id}" ${glims < it.cost ? 'disabled' : ''}>${it.cost} ✦</button>`;
      return `<div class="shop-row"><div><b>${it.name}</b><small>${it.desc}</small></div>${btn}</div>`;
    }).join('');
    $('shop').innerHTML = `<div class="shop-inner"><div class="kicker">Pim’s Travelling Stall</div><h2>“Glims for goods, little one!”</h2>
      <p class="shop-wallet">${glims} glims · ${coins} Seed Coins</p><div class="shop-list">${rows}</div><p class="shop-msg">${msg}</p><button class="ghost" data-close="1">Back to the map</button></div>`;
    $('shop').querySelectorAll('[data-buy]').forEach((b) => b.onclick = () => this.buy(b.dataset.buy));
    $('shop').querySelectorAll('[data-eq]').forEach((b) => b.onclick = () => this.equip(b.dataset.eq));
    $('shop').querySelector('[data-close]').onclick = () => this.closeShop();
  }
  buy(id) {
    const game = this.game, it = SHOP.find((x) => x.id === id), P = game.progress;
    if (!it || P.owned.includes(id) || game.stats.glims < it.cost) return;
    game.stats.glims -= it.cost; P.owned.push(id); game.hud.glims(game.stats.glims);
    if (it.kind === 'heart') { game.player.maxHearts++; game.player.hearts = game.player.maxHearts; }
    if (it.kind === 'hat' || it.kind === 'scarf') this.equip(id, true);
    game.audio.play('shard'); game.saveGame();
    this.renderShop(['Pleasure doing business!', 'That one suits you.', 'Come back soon, little lantern!'][Math.floor(Math.random() * 3)]);
  }
  equip(id, silent) {
    const P = this.game.progress, it = SHOP.find((x) => x.id === id);
    if (it.kind === 'hat') P.hat = P.hat === id && !silent ? null : id;
    if (it.kind === 'scarf') P.scarf = P.scarf === id && !silent ? null : id;
    if (!P.scarf) this.game.player.model.traverse((o) => { if (o.isMesh && o.userData.scarf) { o.material.color.setHex(this.game.magic.cosmetic.scarf ? 0xffc030 : 0x2fbfae); o.material.emissiveIntensity = this.game.magic.cosmetic.scarf ? 0.8 : 0; } });
    this.applyLook(); this.game.saveGame(); if (!silent) this.renderShop();
  }
  // ── per-step: coins, glim magnetism, compass
  step(h) {
    const game = this.game, p = game.player; if (p.state !== 'normal') return;
    for (const c of this.coins) if (!c.taken && Math.abs(c.s - p.s) < 1 + p.hw && c.y > p.y - 1 && c.y < p.y + p.h + 0.6) this.collectCoin(c);
    // glims within reach drift into Kiri
    for (const gl of game.entities.glims) {
      if (gl.taken) continue;
      const ds = p.s - gl.s, dy = (p.y + p.h / 2) - gl.y, d = Math.hypot(ds, dy);
      if (d < 2.6 && d > 0.01) { const k = Math.min(1, h * (14 - d * 4)); gl.s += ds * k; gl.y += dy * k; gl.p = this.path.world(gl.s, gl.y, 0); }
    }
  }
  update(dt, t) {
    const game = this.game, p = game.player;
    for (const c of this.coins) {
      if (c.taken) { if (c.g.visible) { c.g.scale.multiplyScalar(0.9); c.g.position.y += dt * 3; if (c.g.scale.x < 0.05) c.g.visible = false; } continue; }
      c.g.children[0].rotation.z = t * 2.2; c.g.children[1].position.x = Math.sin(t * 2.2) * 0.02; c.g.children[2].lookAt(game.camera.position); c.g.children[2].material.opacity = 0.35 + Math.sin(t * 3) * 0.15;
    }
    // Lumen Compass: arrow to the nearest uncollected coin in this level
    const el = this.compassEl, lv = game.currentLevel;
    if (el) {
      const has = game.progress.owned.includes('compass') && lv && game.state === 'play';
      let best = null, bd = 1e9;
      if (has) for (const c of this.levelCoins(lv.id)) if (!c.taken) { const d = Math.hypot(c.s - p.s, c.y - p.y); if (d < bd) { bd = d; best = c; } }
      if (best) { const ang = Math.atan2(-(best.y - p.y), best.s - p.s); el.style.transform = `rotate(${ang}rad)`; el.classList.add('on'); el.title = `${Math.round(bd)}m`; $('compass-d').textContent = `${Math.round(bd)}m`; }
      else { el.classList.remove('on'); $('compass-d').textContent = ''; }
    }
    if (this.photo.on) this.updatePhoto(dt);
  }
  // ── photo mode
  bindPhoto() {
    const el = $('photo'); let drag = null;
    el.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; drag = { x: e.clientX, y: e.clientY }; });
    addEventListener('pointermove', (e) => { if (!drag || !this.photo.on) return; this.photo.yaw -= (e.clientX - drag.x) * 0.008; this.photo.pitch = Math.max(-0.3, Math.min(1.2, this.photo.pitch + (e.clientY - drag.y) * 0.006)); drag = { x: e.clientX, y: e.clientY }; });
    addEventListener('pointerup', () => drag = null);
    el.addEventListener('wheel', (e) => { this.photo.dist = Math.max(3, Math.min(30, this.photo.dist + e.deltaY * 0.01)); });
    el.querySelector('[data-f]').onclick = () => this.cycleFilter();
    el.querySelector('[data-x]').onclick = () => this.togglePhoto();
    el.querySelector('[data-z]').onclick = () => { this.photo.dist = this.photo.dist > 10 ? 5 : this.photo.dist + 6; };
  }
  togglePhoto() {
    const game = this.game, P = this.photo;
    if (!P.on && game.state !== 'play' && game.state !== 'paused') return;
    P.on = !P.on;
    $('photo').classList.toggle('hidden', !P.on); document.body.classList.toggle('photo', P.on); $('hud').classList.toggle('hidden', P.on); $('touch').classList.toggle('photo-hide', P.on); $('pause').classList.add('hidden');
    if (P.on) { this.prevState = 'play'; game.state = 'photo'; P.yaw = 0; P.pitch = 0.25; P.dist = 9; game.audio.play('notice'); }
    else { game.state = 'play'; this.setFilter(0); game.last = performance.now(); }
  }
  cycleFilter() { this.setFilter((this.photo.filter + 1) % 4); }
  setFilter(i) {
    const u = this.game.cine.uniforms; this.photo.filter = i;
    const F = [{ sat: 1.08, tint: [1, 1, 1], n: 'Natural' }, { sat: 0.25, tint: [1.25, 1.0, 0.7], n: 'Storybook' }, { sat: 0.7, tint: [0.7, 0.85, 1.3], n: 'Moonlight' }, { sat: 1.5, tint: [1.1, 1, 0.95], n: 'Vivid' }][i];
    u.sat.value = F.sat; this.filterTint = F.tint; this.game.cine.enabled = true; u.amount.value = 1;
    $('photo').querySelector('[data-f]').textContent = `Filter: ${F.n}`;
  }
  updatePhoto(dt) {
    const game = this.game, p = game.player, P = this.photo, K = game.input.keys;
    if (K.left) P.yaw += dt * 1.2; if (K.right) P.yaw -= dt * 1.2;
    if (K.up) P.pitch = Math.min(1.2, P.pitch + dt); if (K.down) P.pitch = Math.max(-0.3, P.pitch - dt);
    if (K.jump) P.dist = Math.max(3, P.dist - dt * 8); if (K.action) P.dist = Math.min(30, P.dist + dt * 8);
    const c = this.path.world(p.s, p.y + 1, 0), f = this.path.frame(p.s);
    const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw), dx = f.nx * cy + f.tx * sy, dz = f.nz * cy + f.tz * sy;
    game.camera.position.set(c.x + dx * P.dist * Math.cos(P.pitch), c.y + Math.sin(P.pitch) * P.dist, c.z + dz * P.dist * Math.cos(P.pitch));
    game.camera.lookAt(c);
    if (this.filterTint) game.cine.uniforms.tint.value.setRGB(...this.filterTint);
  }
}
