import { LEVELS } from './map.js';
import { MEDAL_TIMES } from './extras.js';

// Daily challenge: one level + one twist per calendar day, the same for everyone on that date.
// Clear it to earn glims and grow a streak (miss a day and the streak starts over).
const $ = (id) => document.getElementById(id);
const MODS = {
  nohit: { name: 'Untouched', icon: '🛡', desc: 'Reach the end without taking a single hit.' },
  nodash: { name: 'Grounded Roots', icon: '🚫', desc: 'Reach the end without using Sprout Dash.' },
  speed: { name: 'Sun Sprint', icon: '⏱', desc: 'Reach the end faster than the gold time.' },
  glims: { name: 'Glim Rush', icon: '✦', desc: 'Gather at least 80 glims before the end.' },
};
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hash = (str) => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export class Daily {
  constructor(game) {
    this.game = game; this.active = null;
    const chip = document.createElement('div'); chip.id = 'daily-chip'; document.body.appendChild(chip); this.chip = chip;
    const modal = document.createElement('div'); modal.id = 'daily-modal'; modal.className = 'hidden'; document.body.appendChild(modal); this.modal = modal;
  }
  get save() { return (this.game.progress.daily ||= { last: null, streak: 0, best: 0 }); }
  today() {
    const g = this.game, key = dayKey(), pool = LEVELS.filter((l) => !l.optional && l.theme !== undefined && g.map.unlocked(l.id) && l.id !== 'heart');
    const list = pool.length ? pool : [LEVELS[0]], h = hash('thornwild' + key), mods = Object.keys(MODS);
    return { key, lv: list[h % list.length], mod: mods[(h >>> 8) % mods.length] };
  }
  doneToday() { return this.save.last === dayKey(); }
  streakNow() { const s = this.save; if (!s.last) return 0; const y = new Date(); y.setDate(y.getDate() - 1); return s.last === dayKey() || s.last === dayKey(y) ? s.streak : 0; }
  goalText(mod, lv) { return mod === 'speed' ? `Reach the end in under ${this.fmt(MEDAL_TIMES[lv.id] || 150)}.` : MODS[mod].desc; }
  fmt(x) { return `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`; }
  open() {
    const d = this.today(), M = MODS[d.mod], done = this.doneToday(), st = this.streakNow();
    this.modal.innerHTML = `<div class="dl-card"><div class="dl-kick">DAILY CHALLENGE · ${d.key}</div>
      <div class="dl-ic">${M.icon}</div><h2>${M.name}</h2><p class="dl-lv">${d.lv.name}</p><p class="dl-goal">${this.goalText(d.mod, d.lv)}</p>
      <div class="dl-row"><span>🔥 Streak <b>${st}</b></span><span>Best <b>${this.save.best}</b></span><span>Reward <b>✦ ${40 + Math.min(st, 6) * 10}</b></span></div>
      ${done ? '<p class="dl-done">✓ Done for today. A new challenge grows tomorrow.</p>' : ''}
      <div class="dl-btns"><button class="ghost" data-dl="close">Back</button><button data-dl="go">${done ? 'Play again (no reward)' : 'Start ▸'}</button></div></div>`;
    this.modal.classList.remove('hidden'); this.game.audio.play('notice');
    this.modal.querySelectorAll('[data-dl]').forEach((b) => b.onclick = () => { this.modal.classList.add('hidden'); if (b.dataset.dl === 'go') this.start(d); });
  }
  start(d) {
    const g = this.game; this.active = { ...d, failed: false, init: false };
    g.map.cur = d.lv.id; g.map.enter();
  }
  fail(why) { const a = this.active; if (!a || a.failed) return; a.failed = why; this.game.hud.toast(`<b>Daily challenge failed</b> · ${why}. You can still finish the level.`, 3); this.game.audio.play('dismount'); }
  step() {
    const g = this.game, a = this.active, p = g.player;
    if (!a) { this.chip.classList.remove('on'); return; }
    if (g.state === 'map' || (g.currentLevel && g.currentLevel.id !== a.lv.id)) { this.active = null; this.chip.classList.remove('on'); return; }
    if (g.state !== 'play') return;
    if (!a.init) { a.init = true; a.hearts = p.hearts; a.glims0 = g.stats.glims; }
    if (!a.failed) {
      if (a.mod === 'nohit' && (p.hearts < a.hearts || p.state === 'dead')) this.fail('Kiri got hit');
      if (a.mod === 'nodash' && p.sdashT > 0) this.fail('Sprout Dash used');
      if (a.mod === 'speed' && g.levelTime > (MEDAL_TIMES[a.lv.id] || 150)) this.fail('out of time');
    }
    a.hearts = p.hearts;
    const M = MODS[a.mod], got = g.stats.glims - a.glims0;
    const prog = a.mod === 'glims' ? ` ${Math.min(80, got)}/80` : a.mod === 'speed' ? ` ${this.fmt(Math.max(0, (MEDAL_TIMES[a.lv.id] || 150) - g.levelTime))}` : '';
    this.chip.innerHTML = `${M.icon} <b>${M.name}</b>${prog} ${a.failed ? '<i class="x">✗</i>' : '<i class="ok">✓</i>'}`;
    this.chip.classList.add('on');
  }
  // called by the results card: returns a row of html and pays out
  finish() {
    const g = this.game, a = this.active; if (!a) return ''; this.active = null; this.chip.classList.remove('on');
    if (!a.failed && a.mod === 'glims' && g.stats.glims - a.glims0 < 80) a.failed = 'not enough glims';
    if (a.failed) return `<div class="rc-row dl-fail" style="--d:1.4s"><span class="rc-ic">${MODS[a.mod].icon}</span><span>Daily: ${MODS[a.mod].name}</span><b>✗ ${a.failed}</b></div>`;
    if (this.doneToday()) return `<div class="rc-row" style="--d:1.4s"><span class="rc-ic">${MODS[a.mod].icon}</span><span>Daily: ${MODS[a.mod].name}</span><b>✓ again!</b></div>`;
    const s = this.save, streak = this.streakNow() + 1, reward = 40 + Math.min(streak - 1, 6) * 10;
    Object.assign(s, { last: dayKey(), streak, best: Math.max(s.best, streak) }); g.addGlims(reward); g.saveGame();
    return `<div class="rc-row dl-win" style="--d:1.4s"><span class="rc-ic">🔥</span><span>Daily complete · streak ${streak}</span><b>+${reward} ✦</b></div>`;
  }
}
