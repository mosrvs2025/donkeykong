// Title screen, save slots and settings. Each save slot lives in localStorage; switching slots
// reloads the page with an "autoplay" flag so the world is rebuilt cleanly for that save.
const $ = (id) => document.getElementById(id);
export const store = {
  get(k) { try { return localStorage.getItem('thornwild.' + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('thornwild.' + k, v); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem('thornwild.' + k); } catch { /* storage unavailable */ } },
};
export const SLOTS = 3;
export function currentSlot() { return +(store.get('slot') || 1); }
export function readSlot(n) { try { return JSON.parse(store.get('slot.' + n) || 'null'); } catch { return null; } }
export function loadSettings() {
  let s; try { s = JSON.parse(store.get('settings') || 'null'); } catch { s = null; }
  return { vol: 70, music: true, quality: matchMedia('(pointer:coarse)').matches ? 'med' : 'high', post: true, coop: false, musVol: 70, sfxVol: 80, shake: 1, flashes: true, bigTouch: false, ...(s || {}) };
}
export function saveSettings(s) { store.set('settings', JSON.stringify(s)); }
// migrate the single save from earlier versions into slot 1
if (store.get('save') && !store.get('slot.1')) { store.set('slot.1', store.get('save')); store.del('save'); }

const LEVEL_NAMES = { rootwild: 'The Rootwild', canopy: 'Canopy of Hands', skyward: 'Skyward Isles', ruins: 'The Weeping Ruins', sunken: 'The Sunken Sanctum', glowdeep: 'The Glowdeep', mine: 'Sunwright Mine', heart: 'Heart of the Seed' };

export class Menu {
  constructor(game) {
    this.game = game; this.settings = game.settings || loadSettings();
    const show = (id) => { for (const m of ['menu-main', 'menu-slots', 'menu-settings', 'menu-help']) $(m).classList.toggle('hidden', m !== id); const f = $(id).querySelector('button'); f && f.focus({ preventScroll: true }); };
    this.show = show;
    document.querySelectorAll('.m-back').forEach((b) => b.onclick = () => show('menu-main'));
    const cur = readSlot(currentSlot());
    if (cur) { $('m-continue').classList.remove('hidden'); $('m-continue').textContent = `Continue · Slot ${currentSlot()}`; $('m-continue').onclick = () => game.start(); $('m-continue').focus({ preventScroll: true }); }
    $('m-new').onclick = () => { this.slotMode = 'new'; this.renderSlots(); show('menu-slots'); };
    $('m-load').onclick = () => { this.slotMode = 'load'; this.renderSlots(); show('menu-slots'); };
    $('m-settings').onclick = () => show('menu-settings');
    $('m-clash').onclick = () => game.clash.open();
    $('m-help').onclick = () => show('menu-help');
    const coopBtn = $('m-coop');
    const coopLabel = () => coopBtn.textContent = `Players: ${this.settings.coop ? '2 · Kiri + Lumi' : '1'}`;
    coopLabel(); coopBtn.onclick = () => { this.settings.coop = !this.settings.coop; saveSettings(this.settings); coopLabel(); game.coop?.setEnabled(this.settings.coop); game.audio.play('notice'); };
    // settings
    const S = this.settings;
    $('s-vol').value = S.vol; $('s-music').checked = S.music; $('s-quality').value = S.quality; $('s-post').checked = S.post;
    $('s-vol').oninput = () => { S.vol = +$('s-vol').value; saveSettings(S); game.applySettings(S); };
    $('s-music').onchange = () => { S.music = $('s-music').checked; saveSettings(S); game.applySettings(S); };
    $('s-quality').onchange = () => { S.quality = $('s-quality').value; saveSettings(S); game.applySettings(S, true); };
    $('s-post').onchange = () => { S.post = $('s-post').checked; saveSettings(S); game.applySettings(S); };
    $('s-assist').checked = !!S.assist; $('s-slow').checked = !!S.slow;
    $('s-assist').onchange = () => { S.assist = $('s-assist').checked; saveSettings(S); game.applySettings(S); };
    $('s-slow').onchange = () => { S.slow = $('s-slow').checked; saveSettings(S); game.applySettings(S); };
    const best = +store.get('best.normal'); if (best) $('m-note').textContent = `best run ${Math.floor(best / 60)}:${String(Math.floor(best % 60)).padStart(2, '0')}`;
  }
  renderSlots() {
    $('slots-title').textContent = this.slotMode === 'new' ? 'Choose a slot for a new journey' : 'Save Slots';
    const rows = [];
    for (let n = 1; n <= SLOTS; n++) {
      const d = readSlot(n);
      if (!d) { rows.push(`<div class="slot-row"><button class="slot empty" data-slot="${n}"><b>Slot ${n}</b><small>empty · start a new journey</small></button></div>`); continue; }
      const cleared = Object.values(d.progress?.levels || {}).filter((l) => l.clear).length;
      const t = d.time || 0, tm = `${Math.floor(t / 3600)}h ${String(Math.floor(t / 60) % 60).padStart(2, '0')}m`;
      rows.push(`<div class="slot-row"><button class="slot" data-slot="${n}"><b>Slot ${n}${n === currentSlot() ? ' · current' : ''}</b><span>${LEVEL_NAMES[d.progress?.last] || 'The Rootwild'}</span><small>${cleared}/8 levels · ${(d.echoes || []).length}/8 echoes · ${(d.bonds || []).length}/5 bonds · ${d.glims || 0} glims · ${tm}</small></button><button class="slot-del" data-del="${n}" aria-label="Erase slot ${n}">erase</button></div>`);
    }
    $('slot-list').innerHTML = rows.join('');
    $('slot-list').querySelectorAll('[data-slot]').forEach((b) => b.onclick = () => this.pick(+b.dataset.slot));
    $('slot-list').querySelectorAll('[data-del]').forEach((b) => b.onclick = () => {
      if (b.dataset.armed) { store.del('slot.' + b.dataset.del); this.renderSlots(); if (+b.dataset.del === currentSlot()) $('m-continue').classList.add('hidden'); }
      else { b.dataset.armed = '1'; b.textContent = 'erase?'; }
    });
  }
  pick(n) {
    const d = readSlot(n);
    if (this.slotMode === 'new' || !d) { store.del('slot.' + n); store.set('newgame', '1'); }
    if (n === currentSlot() && d && this.slotMode === 'load') return this.game.start();
    store.set('slot', String(n)); store.set('autoplay', '1');
    this.game.audio.play('portal');
    document.getElementById('fade').style.opacity = 1;
    setTimeout(() => location.reload(), 450);
  }
}
