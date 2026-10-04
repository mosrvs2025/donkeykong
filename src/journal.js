import { EVOS, HERO_UNLOCKS } from './evolve.js';
import { ABILITIES } from './magic.js';
import { COMPANIONS } from './entities.js';
import { HEROES } from './player.js';
import { LEVELS } from './map.js';
import { MEDAL_ICON } from './extras.js';

// The Journal: a Zelda-style pause screen. Your hero stands on the left (live 3D preview, loadout),
// pages on the right: Quest · Gear · Lumen Tree · Abilities · Team · System.
// Q / E (or the shoulder buttons, or the tab bar) flip pages; Esc / Start closes.
export const JTABS = [['quest', '📜 Quest'], ['gear', '🎒 Gear'], ['skill', '🌳 Lumen Tree'], ['abil', '✧ Abilities'], ['team', '🐾 Team'], ['sys', '⚙ System']];
export class Journal {
  constructor(game) {
    this.game = game;
    addEventListener('keydown', (e) => {
      const X = game.extras; if (!X.shopOpen || X.mode !== 'journal') return;
      if (e.code === 'KeyQ' || e.code === 'KeyE' || e.code === 'BracketLeft' || e.code === 'BracketRight') { e.preventDefault(); this.flip(e.code === 'KeyE' || e.code === 'BracketRight' ? 1 : -1); }
    });
    // shoulder buttons on a gamepad flip pages too
    const poll = () => { requestAnimationFrame(poll); const X = game.extras; if (!X.shopOpen || X.mode !== 'journal') return;
      const gp = navigator.getGamepads?.()[0]; if (!gp) return; const l = gp.buttons[4]?.pressed, r = gp.buttons[5]?.pressed, st = gp.buttons[9]?.pressed || gp.buttons[1]?.pressed;
      if (l && !this.l) this.flip(-1); if (r && !this.r) this.flip(1); if (st && !this.st && performance.now() - this.openT > 400) game.togglePause();
      this.l = l; this.r = r; this.st = st; };
    poll();
  }
  get t() { return this.game.input.isTouch; }
  key(k, touch) { return `<kbd class="ctx-k">${this.t ? touch : k}</kbd>`; }
  open() { const X = this.game.extras; this.openT = performance.now(); X.mode = 'journal'; if (!JTABS.some(([k]) => k === X.jtab)) X.jtab = 'quest'; X.openShop(); }
  flip(d) { const X = this.game.extras, i = JTABS.findIndex(([k]) => k === X.jtab); X.jtab = JTABS[(i + d + JTABS.length) % JTABS.length][0]; X.sel = null; this.game.audio.play('notice'); X.renderShop(); }
  // ── pages (html for the right-hand panel)
  page(tab) { return this[tab]?.() ?? ''; }
  quest() {
    const g = this.game, lv = g.currentLevel, P = g.progress;
    const rows = LEVELS.filter((l) => P.levels[l.id] || l === lv).map((l) => { const st = P.levels[l.id] || {}, line = g.seeker.line(l.id);
      return `<div class="jq-row ${l === lv ? 'here' : ''}"><b>${l.name}${l === lv ? ' <i>you are here</i>' : ''}</b><small>${line || '—'}</small><span>${st.medal ? MEDAL_ICON[st.medal] : ''}${st.boss ? ' 👑' : ''}</span></div>`; }).join('');
    const next = !lv ? '' : g.goals?.objective?.() || (lv.boss && !P.levels[lv.id]?.boss ? 'Reach the end of the level and face its guardian.' : 'Reach the goal gate at the end of the level.');
    return `<div class="jp"><h3>${lv ? lv.name : 'The journey'}</h3>${lv ? `<p class="jp-sub">${lv.sub}</p>` : ''}
      ${next ? `<div class="jq-goal"><i>Current goal</i>${next}</div>` : ''}
      <h4>Still to find here</h4>${g.seeker.pauseHTML() || '<p class="dimt">Nothing to collect here.</p>'}
      <h4>Journey so far</h4><div class="jq-list">${rows}</div>
      <p class="dimt">✦ ${g.stats.glims} glims · ◉ ${g.extras.coinCount} Seed Coins · Easter eggs ${g.eggs.found.size}/6</p></div>`;
  }
  abil() {
    const g = this.game, M = g.magic, E = g.evolve, t = this.t;
    const keys = { dash: t ? '➶ + joystick' : 'F / E + direction', claws: 'hold toward a wall, ↑ / ↓', comet: 'dash into critters' };
    const card = (on, icon, name, sub, how, lock) => `<div class="ja ${on ? 'on' : ''}"><span class="ja-ic">${on ? icon : '?'}</span><div><b>${on ? name : '? ? ?'}</b><small>${on ? sub : lock}</small>${on && how ? `<em>${how}</em>` : ''}</div></div>`;
    const evo = EVOS.map((e) => card(E.has(e.id), e.icon, e.name, e.sub, keys[e.id], e.hint)).join('');
    const mag = Object.entries(ABILITIES).map(([k, a]) => card(M.has(k), a.icon, a.name, a.sub, g.ctx.keys(a.tip), 'found at an Awakening Shrine')).join('');
    const forms = [card(g.forms.has('tide'), '🌊', 'TIDE FORM', 'breathe and dash underwater', g.ctx.keys('<b>Shift</b> to dash · bursts seals'), 'hidden below the Weeping Ruins'),
      card(!!g.progress.levels.skyward?.boss || g.forms.has('sky'), '🪶', 'SKY BOND', 'Sola will carry you anywhere', '', 'hidden high above the Canopy')].join('');
    return `<div class="jp"><h3>Abilities</h3><p class="jp-sub">Everything Kiri has learned, and how to use it.</p>
      <h4>Evolutions <small>from guardians</small></h4><div class="ja-grid">${evo}</div>
      <h4>Old magic <small>from shrines</small></h4><div class="ja-grid">${mag}</div>
      <h4>Forms</h4><div class="ja-grid">${forms}</div></div>`;
  }
  team() {
    const g = this.game, heroes = g.evolve.heroes(), cur = g.player.hero || 'kiri', met = g.stats.met;
    const hc = HERO_UNLOCKS.map((h) => { const on = heroes.includes(h.id), H = HEROES[h.id];
      return `<button class="jt ${on ? 'on' : ''} ${cur === h.id ? 'sel' : ''}" ${on ? `data-jhero="${h.id}"` : 'disabled'} style="--hc:#${H.color.toString(16).padStart(6, '0')}"><b>${on ? H.name : '? ? ?'}</b><small>${on ? H.power : `freed when the ${LEVELS.find((l) => l.id === h.from)?.name} guardian falls`}</small>${cur === h.id ? '<i class="eq">playing</i>' : on ? '<i>tap to play</i>' : ''}</button>`; }).join('');
    const cc = Object.entries(COMPANIONS).map(([k, c]) => `<div class="ja ${met[k] ? 'on' : ''}"><span class="ja-ic">${met[k] ? { beast: '🐗', frog: '🐸', bird: '🪶', fish: '🦦', oru: '🔮' }[k] : '?'}</span><div><b>${met[k] ? c.name : '? ? ?'}</b><small>${met[k] ? c.title : 'not met yet'}</small>${met[k] ? `<em>${g.ctx.keys(c.tip)}</em>` : ''}</div></div>`).join('');
    return `<div class="jp"><h3>Team</h3><p class="jp-sub">Swap heroes any time with ${this.key('Q', '⇄')}, or pick one here.</p>
      <div class="jt-grid">${hc}</div><h4>Companions <small>ride them: walk into their cage · hop off ${this.key('C', '⏏')}</small></h4><div class="ja-grid">${cc}</div></div>`;
  }
  sys() {
    const g = this.game, t = this.t;
    const ctl = t ? [['Move', 'left joystick (appears where you touch)'], ['Jump', '⤒ · hold for higher'], ['Action / roll', '⚡'], ['Dash', '➶ + joystick direction'], ['Swap hero', '⇄'], ['Pause / Journal', '❚❚']]
      : [['Move', '← → (A D) · gamepad stick'], ['Jump', 'Space / Z · hold for higher'], ['Action / roll', 'Shift / X'], ['Dash', 'F / E + direction'], ['Swap hero', 'Q / Tab'], ['Hop off', 'C'], ['Journal', 'Esc / P · flip pages Q E']];
    return `<div class="jp"><h3>System</h3>
      <div class="js-btns"><button data-jsys="resume">▶ Resume</button><button class="alt" data-jsys="map">🗺 World Map</button><button class="ghost" data-jsys="photo">📷 Photo Mode</button>
      <button class="ghost" data-jsys="ghost">👻 Ghost race: ${g.ghosts.on ? 'on' : 'off'}</button><button class="ghost" data-jsys="save">💾 Save</button><button class="ghost" data-jsys="quit">Save &amp; quit to title</button></div>
      <p class="dimt" id="jsys-note"></p>
      <h4>Controls</h4><div class="js-ctl">${ctl.map(([a, b]) => `<div><i>${a}</i><span>${b}</span></div>`).join('')}</div></div>`;
  }
  bind(S) {
    const g = this.game;
    // the makers' note (an Easter egg): tap the Journal title five times
    S.querySelector('.sh-head h2')?.addEventListener('pointerdown', () => { const now = performance.now(); this.taps = now - (this.tapT || 0) < 700 ? (this.taps || 0) + 1 : 1; this.tapT = now;
      if (this.taps >= 5) { this.taps = 0; g.eggs.egg('makers'); const n = S.querySelector('.sh-head h2'); n.innerHTML = '<small>Thornwild was grown, not built: one root at a time. Thank you for wandering it. ♥</small>'; } });
    S.querySelectorAll('[data-jhero]').forEach((b) => b.onclick = () => { if (g.player.hero !== b.dataset.jhero) { g.player.setHero(b.dataset.jhero, false); g.extras.pvHero = b.dataset.jhero; g.audio.play('checkpoint'); } g.extras.renderShop(); });
    S.querySelectorAll('[data-jsys]').forEach((b) => b.onclick = () => {
      const a = b.dataset.jsys, note = (m) => { const n = document.getElementById('jsys-note'); if (n) n.textContent = m; };
      if (a === 'resume') g.togglePause();
      else if (a === 'map') { g.togglePause(); g.leaveToMap(); }
      else if (a === 'photo') { g.togglePause(); g.extras.togglePhoto(); }
      else if (a === 'ghost') { g.ghosts.toggle(); g.extras.renderShop(); }
      else if (a === 'save') { g.saveGame(); g.audio.play('checkpoint'); note('Saved ✓'); }
      else if (a === 'quit') { g.saveGame(); location.reload(); }
    });
  }
}
