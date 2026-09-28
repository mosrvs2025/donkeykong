import * as THREE from 'three';

// The storybook prologue: a sequence of camera shots through Thornwild with narration,
// played when a new journey begins. Skippable with Space or a tap.
const O = 80;
const PANELS = [
  { text: 'Long ago, the Sunwrights sang the jungle awake.', pos: [300, 150, 170], look: [300, 110, -48] },
  { text: 'They built machines that breathed, and gardens that remembered their names.', pos: [700, 30, 60], look: [680, 4, -60] },
  { text: 'At the heart of Thornwild, they planted a seed of light.', pos: [1480, 10, 40], look: [1540, 0, -34] },
  { text: 'Then the Sunwrights vanished. The machines fell silent. The Seed went dark.', pos: [990, 45, 60], look: [985, 40, -22] },
  { text: 'A thousand years later, something small woke up in the Rootwild.', pos: [10, 3, 12], look: [4, 1, 0] },
  { text: 'This is Kiri.', pos: [6, 2, 7], look: [4, 1.2, 0] },
];
// a line of storybook narration the first time each chapter begins
export const CHAPTER_LINES = {
  rootwild: ['Chapter I', 'The roots here are older than any song. Follow the light.'],
  canopy: ['Chapter II', 'Up where the old trees hold hands, the wind tells stories.'],
  skyward: ['A Hidden Chapter', 'Above the clouds, the Sunwrights kept islands for the birds.'],
  ruins: ['Chapter III', 'The river carries the ruins’ tears all the way to the sea.'],
  sunken: ['A Hidden Chapter', 'The deeper you go, the more the drowned temple remembers.'],
  glowdeep: ['Chapter IV', 'In the dark, something enormous is dreaming.'],
  mine: ['Chapter V', 'The Sunwrights dug for light. They found too much of it.'],
  heart: ['The Last Chapter', 'Every road in Thornwild leads here. The Seed is waiting.'],
};

export class Story {
  constructor(game) { this.game = game; this.el = document.getElementById('intro'); this.txt = document.getElementById('intro-text'); this.active = false;
    this.el.addEventListener('pointerdown', (e) => { e.preventDefault(); this.next(); }); }
  play(done) {
    const g = this.game;
    this.active = true; this.done = done; this.i = -1;
    this.el.classList.remove('hidden');
    g.state = 'story'; g.audio.quiet = 0.5; g.audio.motif(1, 0.7);
    this.next();
  }
  next() {
    if (!this.active) return;
    const g = this.game;
    this.i++;
    if (this.i >= PANELS.length) return this.finish();
    const P = PANELS[this.i], path = g.path;
    const from = path.world(P.pos[0] + O + 8, P.pos[1] + 2, P.pos[2] + 6), to = path.world(P.pos[0] + O, P.pos[1], P.pos[2]);
    const look = path.world(P.look[0] + O, P.look[1], P.look[2]);
    g.director.play({ dur: 7, hold: true, pos: (u) => from.clone().lerp(to, u), look: () => look.clone() });
    this.txt.classList.remove('on');
    clearTimeout(this.tt); this.tt = setTimeout(() => { this.txt.textContent = P.text; this.txt.classList.add('on'); g.audio.play('echo'); }, 500);
    clearTimeout(this.auto); this.auto = setTimeout(() => this.next(), 6500);
    if (this.i === 4) g.player.idleT = 10; // Kiri waking up, looking around
  }
  finish() {
    const g = this.game;
    this.active = false; clearTimeout(this.auto); clearTimeout(this.tt);
    this.txt.classList.remove('on'); this.el.classList.add('hidden');
    g.director.script = null; g.audio.quiet = 0;
    this.done && this.done();
  }
  update(dt) { if (this.active) { this.game.director.update(dt, this.game.player); } }
}
