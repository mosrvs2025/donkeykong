import * as THREE from 'three';
import { makeHero } from './models.js';
import { SKILLS } from './skills.js';

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
  { id: 'hat_bloom', name: 'Bloom Crown', desc: 'A ring of dawnflowers that never wilt', cost: 120, kind: 'hat' },
  { id: 'hat_lantern', name: 'Lantern Helm', desc: 'A miner’s helm with a little sun inside', cost: 140, kind: 'hat' },
  { id: 'scarf_moss', name: 'Moss Scarf', desc: 'Soft as the Rootwild floor', cost: 70, kind: 'scarf', color: 0x5ac850 },
  { id: 'scarf_rose', name: 'Rosepetal Scarf', desc: 'Smells faintly of the canopy', cost: 100, kind: 'scarf', color: 0xff7ab0 },
  { id: 'charm_magnet', name: 'Glimstone Charm', desc: 'Glims fly to you from twice as far', cost: 180, kind: 'charm', perk: 'Glim pull ×2' },
  { id: 'charm_dash', name: 'Swiftroot Charm', desc: 'Your Sprout Dash recovers faster', cost: 220, kind: 'charm', perk: 'Dash cooldown −35%' },
  { id: 'charm_feather', name: 'Featherfall Charm', desc: 'Hold jump while falling to drift down gently', cost: 160, kind: 'charm', perk: 'Slow fall' },
  { id: 'charm_wind', name: 'Second Wind Charm', desc: 'Once per level, a final blow leaves you on one heart instead', cost: 260, kind: 'charm', perk: 'Survive one knockout per level' },
  { id: 'charm_thorn', name: 'Thornward Charm', desc: 'Thorns and brambles can’t hurt you', cost: 320, kind: 'charm', perk: 'Thorn immunity' },
  { id: 'scarf_star', name: 'Starfall Scarf', desc: 'Woven from the Starwell’s sky', cost: 150, coins: 20, kind: 'scarf', color: 0xc9a0ff },
];

export function makeHat(id) {
  const g = new THREE.Group();
  const M = (c, e = 0) => new THREE.MeshStandardMaterial({ color: c, emissive: e, roughness: 0.6 });
  if (id === 'hat_leaf') { const l = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 6), M(0x4fae3c)); l.scale.set(1.3, 0.25, 0.7); l.rotation.z = 0.5; l.position.set(-0.05, 0.36, 0); g.add(l); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 4), M(0x3a6a20)); st.position.set(0.12, 0.33, 0); g.add(st); }
  if (id === 'hat_explorer') { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.04, 20), M(0xb89060)); b.position.y = 0.28; g.add(b); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.22, 16), M(0xc8a070)); c.position.y = 0.4; g.add(c); const band = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.05, 16), M(0x5a3018)); band.position.y = 0.32; g.add(band); }
  if (id === 'hat_crown' || id === 'hat_moon') {
    const col = id === 'hat_crown' ? 0xffc840 : 0xd0c0ff;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.12, 12, 1, true), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: id === 'hat_moon' ? 1.2 : 0.3, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide })); ring.position.y = 0.34; g.add(ring);
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), ring.material); const a = i / 5 * Math.PI * 2; s.position.set(Math.cos(a) * 0.24, 0.46, Math.sin(a) * 0.24); g.add(s); }
  }
  if (id === 'hat_bloom') { for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const f = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), M([0xff7ab0, 0xffe060, 0xffffff][i % 3], 0x301010)); f.position.set(Math.cos(a) * 0.27, 0.4, Math.sin(a) * 0.27); g.add(f); } const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.03, 6, 20), M(0x4fae3c)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.38; g.add(ring); }
  if (id === 'hat_lantern') { const hm = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc89030, metalness: 0.5, roughness: 0.4 })); hm.position.y = 0.2; g.add(hm); const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0a0, emissiveIntensity: 2.5 })); lamp.rotation.z = Math.PI / 2; lamp.position.set(0.32, 0.38, 0); g.add(lamp); }
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
    this.shopOpen = true; $('shop').classList.remove('hidden'); this.tab ||= 'hat'; this.sel = null; this.renderShop();
    game.audio.play('notice'); this.startPreview();
  }
  closeShop() { this.shopOpen = false; $('shop').classList.add('hidden'); this.game.map.render(); }
  // ── the wardrobe preview: the hero, wearing what you've picked (even before you buy it)
  startPreview() {
    if (!this.pv) {
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
      const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xfff4e0, 0x403020, 1.6)); const d = new THREE.DirectionalLight(0xffffff, 2.4); d.position.set(2, 4, 5); sc.add(d); const rim = new THREE.DirectionalLight(0x9fffd0, 1.6); rim.position.set(-3, 2, -3); sc.add(rim);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 0.25, 32), new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.8 })); ped.position.y = -0.13; sc.add(ped);
      const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 1.45, 5.8); cam.lookAt(0, 0.95, 0);
      this.pv = { r, sc, cam, yaw: -0.5, drag: null, model: null, key: '' };
      r.domElement.addEventListener('pointerdown', (e) => { this.pv.drag = e.clientX; this.pv.spinT = 3; });
      addEventListener('pointermove', (e) => { if (this.pv.drag != null) { this.pv.yaw += (e.clientX - this.pv.drag) * 0.012; this.pv.drag = e.clientX; } });
      addEventListener('pointerup', () => { this.pv.drag = null; });
    }
    const loop = () => { if (!this.shopOpen) return; requestAnimationFrame(loop); this.renderPreview(); };
    loop();
  }
  previewLook() { // what the preview should wear: the selected item tried on over the current outfit
    const P = this.game.progress, it = SHOP.find((x) => x.id === this.sel);
    return { hero: this.pvHero || this.game.player.hero || 'kiri', hat: it?.kind === 'hat' ? it.id : P.hat, scarf: it?.kind === 'scarf' ? it.id : P.scarf };
  }
  renderPreview() {
    const pv = this.pv, box = $('shop-pv'); if (!box) return;
    if (pv.r.domElement.parentNode !== box) box.appendChild(pv.r.domElement);
    const w = box.clientWidth, h = box.clientHeight; if (pv.w !== w || pv.h !== h) { pv.w = w; pv.h = h; pv.r.setSize(w, h); pv.cam.aspect = w / h; pv.cam.updateProjectionMatrix(); }
    const L = this.previewLook(), key = `${L.hero}|${L.hat}|${L.scarf}`;
    if (key !== pv.key) {
      pv.key = key; if (pv.model) pv.sc.remove(pv.model);
      const m = makeHero(L.hero); m.scale.multiplyScalar(1.15);
      const sc = SHOP.find((x) => x.id === L.scarf); if (sc) m.traverse((o) => { if (o.isMesh && o.userData.scarf) { o.material = o.material.clone(); o.material.color.setHex(sc.color); o.material.emissive?.setHex(sc.color); o.material.emissiveIntensity = 0.3; } });
      if (L.hat) { const hn = makeHat(L.hat); hn.rotation.z = -0.1; m.userData.head.add(hn); }
      pv.sc.add(m); pv.model = m; pv.pop = 0.25;
    }
    const t = performance.now() / 1000; pv.spinT = (pv.spinT || 0) - 1 / 60; if (pv.drag == null && pv.spinT <= 0) pv.yaw += 0.006;
    const m = pv.model; m.rotation.y = pv.yaw; const ud = m.userData;
    pv.pop = Math.max(0, (pv.pop || 0) - 1 / 60); const s = 1 + Math.sin(pv.pop * 12) * pv.pop * 0.5; m.scale.setScalar(1.15 * s);
    ud.body.position.y = Math.abs(Math.sin(t * 2.2)) * 0.03; ud.tail?.forEach((q, i) => q.rotation.z = Math.sin(t * 2.5 - i * 0.5) * 0.15); ud.scarf?.forEach((q, i) => q.rotation.z = Math.sin(t * 4 - i * 0.7) * 0.2 + 0.1);
    ud.arms?.forEach((a, i) => a.rotation.z = Math.sin(t * 1.5 + i) * 0.08); ud.eyeL.scale.y = ud.eyeR.scale.y = (t % 3.2) < 0.1 ? 0.1 : 1;
    pv.r.render(pv.sc, pv.cam);
  }
  itemIcon(it) {
    if (it.kind === 'scarf') return `<span class="sw" style="background:#${it.color.toString(16).padStart(6, '0')}"></span>`;
    return { hat_leaf: '🍃', hat_explorer: '🎩', hat_crown: '👑', hat_moon: '🌙', hat_party: '🎉', hat_bloom: '🌸', hat_lantern: '🔦', charm_feather: '🪶', charm_wind: '🌬', charm_thorn: '🌿', heart1: '❤', heart2: '❤', compass: '🧭', charm_magnet: '✦', charm_dash: '➶' }[it.id] || '✦';
  }
  renderShop(msg = '') {
    const game = this.game, P = game.progress, glims = game.stats.glims, coins = this.coinCount;
    const tabs = [['hat', 'Hats'], ['scarf', 'Scarves'], ['charm', 'Charms'], ['skill', 'Lumen Tree'], ['up', 'Upgrades']];
    if (this.tab === 'skill' && !this.renderShop.__frame) return this.renderSkills(msg, tabs);
    const frame = this.renderShop.__frame; this.renderShop.__frame = null;
    const inTab = (it) => this.tab === 'up' ? (it.kind === 'heart' || !it.kind) : it.kind === this.tab;
    const vis = SHOP.filter((it) => inTab(it) && (!it.needs || P.owned.includes(it.needs)) && (!it.reward || P.owned.includes(it.id)));
    const isEq = (it) => (it.kind === 'hat' && P.hat === it.id) || (it.kind === 'scarf' && P.scarf === it.id) || (it.kind === 'charm' && game.skills.charm(it.id));
    const tiles = vis.map((it) => { const own = P.owned.includes(it.id), locked = it.coins && coins < it.coins;
      return `<button class="sh-tile ${this.sel === it.id ? 'sel' : ''} ${own ? 'own' : ''} ${locked ? 'locked' : ''}" data-sel="${it.id}"><span class="sh-ic">${locked ? '🔒' : this.itemIcon(it)}</span><b>${it.name}</b><small>${isEq(it) ? '<i class="eq">equipped</i>' : own ? 'owned' : locked ? `${it.coins} ◉ needed` : `${it.cost} ✦`}</small></button>`; }).join('') || '<p class="sh-none">Nothing here yet. Pim is restocking!</p>';
    const it = SHOP.find((x) => x.id === this.sel);
    let detail = `<div class="sh-detail empty"><p>Pick something to try it on.</p></div>`;
    if (it) { const own = P.owned.includes(it.id), locked = it.coins && coins < it.coins, wearable = ['hat', 'scarf', 'charm'].includes(it.kind);
      const act = own ? (wearable ? `<button data-eq="${it.id}" class="${isEq(it) ? 'ghost' : ''}">${isEq(it) ? 'Take off' : 'Equip'}</button>` : '<span class="owned">owned</span>')
        : locked ? `<span class="lock">find ${it.coins} Seed Coins to unlock (you have ${coins})</span>` : `<button data-buy="${it.id}" ${glims < it.cost ? 'disabled' : ''}>Buy · ${it.cost} ✦</button>${glims < it.cost ? `<small class="lock">${it.cost - glims} more glims</small>` : ''}`;
      detail = `<div class="sh-detail"><div class="sh-dicon">${this.itemIcon(it)}</div><div><b>${it.name}</b><p>${it.desc}</p>${it.perk ? `<p class="perk">⚡ ${it.perk}</p>` : ''}${it.kind === 'heart' ? '<p class="perk">❤ +1 max heart</p>' : ''}<div class="sh-act">${act}</div></div></div>`; }
    const heroes = game.evolve.heroes(), hero = this.pvHero || game.player.hero || 'kiri';
    const eqHat = SHOP.find((x) => x.id === P.hat), eqSc = SHOP.find((x) => x.id === P.scarf), eqCh = { name: (P.charms || []).map((c) => SHOP.find((x) => x.id === c)?.name.replace(' Charm', '')).join(' + ') || null };
    $('shop').innerHTML = `<div class="sh-wrap">
      <div class="sh-head"><div><div class="kicker">Pim’s Travelling Stall</div><h2>“Glims for goods, little one!”</h2></div><div class="sh-wallet"><span>✦ ${glims}</span><span title="Seed Coins found">◉ ${coins}</span></div></div>
      <div class="sh-body">
        <div class="sh-left"><div id="shop-pv" class="sh-pv"></div>
          ${heroes.length > 1 ? `<div class="sh-heroes">${heroes.map((h) => `<button class="small ${h === hero ? '' : 'ghost'}" data-hero="${h}">${h[0].toUpperCase() + h.slice(1)}</button>`).join('')}</div>` : ''}
          <div class="sh-loadout"><div><i>Hat</i>${eqHat ? eqHat.name : '—'}</div><div><i>Scarf</i>${eqSc ? eqSc.name : '—'}</div><div><i>Charm${game.skills.charmSlots() > 1 ? 's (2)' : ''}</i>${eqCh.name || '—'}</div><div><i>Hearts</i>${'❤'.repeat(game.player.maxHearts)}</div></div></div>
        <div class="sh-right">${frame || `<div class="sh-tabs">${tabs.map(([k, n]) => `<button class="small ${this.tab === k ? '' : 'ghost'}" data-tab="${k}">${n}</button>`).join('')}</div>
          <div class="sh-grid">${tiles}</div>${detail}<p class="shop-msg">${msg}</p>`}</div>
      </div>
      <button class="ghost sh-close" data-close="1">Back to the map</button></div>`;
    const S = $('shop');
    S.querySelectorAll('[data-buy]').forEach((b) => b.onclick = () => this.buy(b.dataset.buy));
    S.querySelectorAll('[data-eq]').forEach((b) => b.onclick = () => this.equip(b.dataset.eq));
    S.querySelectorAll('[data-sel]').forEach((b) => b.onclick = () => { this.sel = this.sel === b.dataset.sel ? null : b.dataset.sel; game.audio.play('notice'); this.renderShop(); });
    S.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { this.tab = b.dataset.tab; this.sel = null; this.renderShop(); });
    S.querySelectorAll('[data-hero]').forEach((b) => b.onclick = () => { this.pvHero = b.dataset.hero; if (game.player.hero !== b.dataset.hero) game.player.setHero(b.dataset.hero, false); this.renderShop(); });
    S.querySelectorAll('[data-ssel]').forEach((b) => b.onclick = () => { this.sel = this.sel === b.dataset.ssel ? null : b.dataset.ssel; game.audio.play('notice'); this.renderShop(); });
    S.querySelectorAll('[data-learn]').forEach((b) => b.onclick = () => { if (game.skills.learn(b.dataset.learn)) { game.audio.play('win'); this.renderShop('A new root grows. You feel it already.'); } });
    S.querySelector('[data-close]').onclick = () => this.closeShop();
  }
  // the Lumen Tree: Seed Coin skills, laid out as a little tree
  renderSkills(msg, tabs) {
    const game = this.game, K = game.skills, P = game.progress;
    const nodes = SKILLS.map((sk) => { const own = K.has(sk.id), can = K.canLearn(sk), locked = sk.needs && !K.has(sk.needs);
      return `<button class="lt-node ${own ? 'own' : can ? 'can' : ''} ${locked ? 'locked' : ''} ${this.sel === sk.id ? 'sel' : ''}" data-ssel="${sk.id}"><span class="sh-ic">${locked ? '🔒' : sk.icon}</span><b>${sk.name}</b><small>${own ? '<i class="eq">learned</i>' : `${sk.cost} ◉`}</small></button>`; });
    const sk = SKILLS.find((x) => x.id === this.sel);
    let detail = '<div class="sh-detail empty"><p>Seed Coins grow into skills. Pick one.</p></div>';
    if (sk) { const own = K.has(sk.id), need = sk.needs && !K.has(sk.needs) ? SKILLS.find((x) => x.id === sk.needs).name : null;
      detail = `<div class="sh-detail"><div class="sh-dicon">${sk.icon}</div><div><b>${sk.name}</b><p>${sk.desc}</p><div class="sh-act">${own ? '<span class="owned">learned ✓</span>' : need ? `<span class="lock">learn ${need} first</span>` : `<button data-learn="${sk.id}" ${K.seeds() < sk.cost ? 'disabled' : ''}>Learn · ${sk.cost} ◉</button>${K.seeds() < sk.cost ? `<small class="lock">find ${sk.cost - K.seeds()} more Seed Coins</small>` : ''}`}</div></div></div>`; }
    this.renderShopFrame(`<div class="sh-tabs">${tabs.map(([k, n]) => `<button class="small ${this.tab === k ? '' : 'ghost'}" data-tab="${k}">${n}</button>`).join('')}</div>
      <p class="lt-seeds">Lumen Seeds to spend: <b>${K.seeds()} ◉</b> <small>(every Seed Coin you find is a seed)</small></p>
      <div class="lt-tree"><div class="lt-col">${nodes[0]}${nodes[5]}</div><div class="lt-col">${nodes[1]}</div><div class="lt-col">${nodes[2]}<div class="lt-split">${nodes[3]}${nodes[4]}</div></div></div>${detail}<p class="shop-msg">${msg}</p>`);
  }
  renderShopFrame(right) { // shared left panel (preview, heroes, loadout) for non-grid tabs
    this.renderShop.__frame = right; this.renderShop();
  }
  buy(id) {
    const game = this.game, it = SHOP.find((x) => x.id === id), P = game.progress;
    if (!it || P.owned.includes(id) || game.stats.glims < it.cost) return;
    game.stats.glims -= it.cost; P.owned.push(id); game.hud.glims(game.stats.glims);
    if (it.kind === 'heart') { game.player.maxHearts++; game.player.hearts = game.player.maxHearts; }
    if (it.kind === 'hat' || it.kind === 'scarf' || it.kind === 'charm') this.equip(id, true);
    game.audio.play('shard'); game.saveGame();
    this.renderShop(['Pleasure doing business!', 'That one suits you.', 'Come back soon, little lantern!'][Math.floor(Math.random() * 3)]);
  }
  equip(id, silent) {
    const P = this.game.progress, it = SHOP.find((x) => x.id === id);
    if (it.kind === 'hat') P.hat = P.hat === id && !silent ? null : id;
    if (it.kind === 'scarf') P.scarf = P.scarf === id && !silent ? null : id;
    if (it.kind === 'charm') { if (silent && this.game.skills.charm(id)) {} else this.game.skills.toggleCharm(id); }
    if (!P.scarf) this.game.player.model.traverse((o) => { if (o.isMesh && o.userData.scarf) { o.material.color.setHex(this.game.magic.cosmetic.scarf ? 0xffc030 : 0x2fbfae); o.material.emissiveIntensity = this.game.magic.cosmetic.scarf ? 0.8 : 0; } });
    this.applyLook(); this.game.saveGame(); if (!silent) this.renderShop();
    if (silent && this.shopOpen) this.renderShop();
  }
  // ── per-step: coins, glim magnetism, compass
  step(h) {
    const game = this.game, p = game.player; if (p.state !== 'normal') return;
    for (const c of this.coins) if (!c.taken && Math.abs(c.s - p.s) < 1 + p.hw && c.y > p.y - 1 && c.y < p.y + p.h + 0.6) this.collectCoin(c);
    // glims within reach drift into Kiri
    for (const gl of game.entities.glims) {
      if (gl.taken) continue;
      const ds = p.s - gl.s, dy = (p.y + p.h / 2) - gl.y, d = Math.hypot(ds, dy);
      const R = game.skills.charm('charm_magnet') ? 5.2 : 2.6;
      if (d < R && d > 0.01) { const k = Math.min(1, h * (14 - d * 4 * 2.6 / R)); gl.s += ds * k; gl.y += dy * k; gl.p = this.path.world(gl.s, gl.y, 0); }
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
