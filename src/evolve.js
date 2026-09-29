// Evolutions: how Kiri moves grows with the journey. Sprout Dash is Kiri's from the start;
// each guardian's seed teaches the body something new. Derived from progress, so saves just work.
const $ = (id) => document.getElementById(id);
export const EVOS = [
  { id: 'dash', name: 'SPROUT DASH', icon: '➶', sub: 'Dash in any direction · one burst in the air, refreshed on landing', from: null },
  { id: 'claws', name: 'THORNCLAWS', icon: '⟟', sub: 'Slide down any wall · jump to kick off it', from: 'rootwild', hint: 'defeat the guardian of the Rootwild' },
  { id: 'comet', name: 'COMET DASH', icon: '☄', sub: 'Dash straight through critters · two air dashes', from: 'canopy', hint: 'defeat the guardian of the Canopy of Hands' },
];
// heroes who join the team (DK64-style): freed when a guardian falls
export const HERO_UNLOCKS = [
  { id: 'kiri', from: null },
  { id: 'pip', from: 'rootwild', line: '<b>PIP</b> joins the team! The Bramble King had caged a little glider. Hold jump to glide.' },
  { id: 'brom', from: 'ruins', line: '<b>BROM</b> joins the team! The Warden was guarding a badger miner. His rolls smash cracked walls.' },
];
export class Evolve {
  constructor(game) {
    this.game = game;
    $('evo-btn').onclick = () => this.toggle();
  }
  has(id) {
    const e = EVOS.find((x) => x.id === id); if (!e) return false;
    return !e.from || !!this.game.evoAll || !!this.game.progress.levels[e.from]?.boss;
  }
  heroes() { return HERO_UNLOCKS.filter((h) => !h.from || this.game.evoAll || this.game.progress.levels[h.from]?.boss).map((h) => h.id); }
  announceHeroes(before) {
    const fresh = this.heroes().filter((h) => !before.includes(h));
    return fresh.map((h) => `<p class="unlock">${HERO_UNLOCKS.find((x) => x.id === h).line} Swap with <b>${this.game.input.isTouch ? '⇄' : 'Q'}</b>.</p>`).join('');
  }
  owned() { return EVOS.filter((e) => this.has(e.id)).map((e) => e.id); }
  // returns the html line for the level-clear card when a new evolution arrived
  announce(before) {
    const fresh = EVOS.filter((e) => this.has(e.id) && !before.includes(e.id));
    return fresh.map((e) => `<p class="unlock">Kiri evolves: <b>${e.name}</b>. ${e.sub}.</p>`).join('');
  }
  toggle() {
    const el = $('evo-list'); el.classList.toggle('hidden');
    const t = this.game.input.isTouch;
    const keys = { dash: t ? 'the ➶ button + joystick' : 'F / E + a direction (gamepad: bumpers)', claws: 'hold toward a wall in the air', comet: 'just dash into them' };
    el.innerHTML = EVOS.map((e) => { const on = this.has(e.id); return `<div class="evo ${on ? 'on' : ''}"><span class="ei">${on ? e.icon : '?'}</span><div><b>${on ? e.name : '? ? ?'}</b><small>${on ? `${e.sub} · <i>${keys[e.id]}</i>` : e.hint}</small></div></div>`; }).join('');
  }
}
