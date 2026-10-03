// The Lumen Tree: permanent upgrades learned with Seed Coins (Pim calls them "Lumen Seeds").
// Spending never takes away coins you've found; it just uses them up as seeds.
export const SKILLS = [
  { id: 'leap2', name: 'Wisp Leap+', icon: '✧', cost: 3, desc: 'One extra Wisp Leap in mid-air', needs: null },
  { id: 'dash2', name: 'Twin Dash', icon: '➶', cost: 4, desc: 'One extra Sprout Dash in the air', needs: null },
  { id: 'heartbloom', name: 'Heart Bloom', icon: '❀', cost: 3, desc: 'Lighting a checkpoint restores a heart', needs: null },
  { id: 'pouch', name: 'Charm Pouch', icon: '👝', cost: 4, desc: 'Wear two charms at once', needs: 'heartbloom' },
  { id: 'ironfur', name: 'Iron Fur', icon: '🛡', cost: 5, desc: 'The first hit in every level bounces off', needs: 'heartbloom' },
  { id: 'starstep', name: 'Starstep', icon: '★', cost: 6, desc: 'Wall-kicks also refresh your Wisp Leaps and dashes in a flash of stars', needs: 'leap2' },
];
export class Skills {
  constructor(game) { this.game = game; }
  get P() { const P = this.game.progress; P.skills ||= []; P.charms ||= P.charm ? [P.charm] : []; return P; }
  has(id) { return this.P.skills.includes(id); }
  seeds() { return Math.max(0, (this.game.extras?.coinCount || 0) - (this.P.coinSpent || 0)); }
  canLearn(s) { return !this.has(s.id) && (!s.needs || this.has(s.needs)) && this.seeds() >= s.cost; }
  learn(id) { const s = SKILLS.find((x) => x.id === id); if (!s || !this.canLearn(s)) return false; this.P.skills.push(id); this.P.coinSpent = (this.P.coinSpent || 0) + s.cost; this.game.saveGame(); return true; }
  charmSlots() { return this.has('pouch') ? 2 : 1; }
  charm(id) { return this.P.charms.includes(id); }
  toggleCharm(id) {
    const C = this.P.charms, i = C.indexOf(id);
    if (i >= 0) C.splice(i, 1); else { C.push(id); while (C.length > this.charmSlots()) C.shift(); }
    this.P.charm = C[0] || null;
  }
}
