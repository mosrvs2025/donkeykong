// Fully synthesized audio: SFX + a light procedural jungle score. No external assets.
export class Audio {
  constructor() { this.ctx = null; this.muted = false; this.musicOn = false; this.intensity = 0; this.theme = 0; this.quiet = 0; this.q = 0; this.wake = 0; }
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.55 * (this.volume ?? 0.7) / 0.7; this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.8; this.sfx.connect(this.master);
    this.mus = this.ctx.createGain(); this.mus.gain.value = 0.32; this.mus.connect(this.master);
    // simple reverb-ish delay for music
    const d = this.ctx.createDelay(); d.delayTime.value = 0.28; const fb = this.ctx.createGain(); fb.gain.value = 0.3;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    this.mus.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(this.master);
    this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const ch = this.noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    this.nextNote = this.ctx.currentTime + 0.1; this.step = 0;
    this.ambient();
  }
  heartbeat() { if (!this.ctx || this.muted) return; this.tone(62, 0.14, 'sine', 0.18 * (this.sfxVol ?? 1)); this.tone(55, 0.16, 'sine', 0.13 * (this.sfxVol ?? 1), 0, 0.18); }
  resume() { this.ctx && this.ctx.state !== 'running' && this.ctx.resume(); }
  toggleMute() { this.muted = !this.muted; this.applyVolume(); }
  applyVolume() { if (this.master) this.master.gain.value = this.muted ? 0 : 0.55 * (this.volume ?? 0.7) / 0.7; if (this.sfx) this.sfx.gain.value = 0.8 * (this.sfxVol ?? 1); }
  tone(freq, dur, type = 'square', vol = 0.2, slide = 0, delay = 0, dest) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol = 0.3, freq = 1200, type = 'bandpass', delay = 0, dest) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfx); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  play(name, p = 0) {
    if (!this.ctx) return;
    switch (name) {
      case 'jump': this.tone(300, 0.14, 'square', 0.08, 2.2); break;
      case 'bigjump': this.tone(180, 0.35, 'triangle', 0.18, 3.5); this.tone(360, 0.3, 'square', 0.05, 3); break;
      case 'land': this.noise(0.08, 0.12, 400, 'lowpass'); break;
      case 'glim': { const n = [0, 4, 7, 12, 16][Math.min(4, p % 5)]; this.tone(880 * Math.pow(2, n / 12), 0.12, 'sine', 0.13); this.tone(1760 * Math.pow(2, n / 12), 0.08, 'sine', 0.04, 0, 0.03); break; }
      case 'shard': [0, 4, 7, 11, 14, 19].forEach((n, i) => this.tone(523 * Math.pow(2, n / 12), 0.5, 'triangle', 0.14, 0, i * 0.08)); break;
      case 'stomp': this.tone(220, 0.12, 'square', 0.14, 0.4); this.noise(0.1, 0.2, 800); this.tone(660 + p * 110, 0.1, 'sine', 0.1, 1.5, 0.04); break;
      case 'bounce': this.tone(160, 0.35, 'sine', 0.25, 4); break;
      case 'roll': this.noise(0.25, 0.15, 600, 'bandpass'); this.tone(120, 0.2, 'sawtooth', 0.05, 0.6); break;
      case 'slam': this.tone(90, 0.3, 'sine', 0.35, 0.3); this.noise(0.25, 0.3, 300, 'lowpass'); break;
      case 'hurt': this.tone(400, 0.35, 'sawtooth', 0.14, 0.3); break;
      case 'smash': this.noise(0.6, 0.5, 500, 'lowpass'); this.tone(70, 0.5, 'sine', 0.4, 0.5); break;
      case 'mount': [0, 7, 12].forEach((n, i) => this.tone(392 * Math.pow(2, n / 12), 0.2, 'square', 0.08, 0, i * 0.07)); break;
      case 'dismount': this.tone(500, 0.2, 'triangle', 0.1, 0.5); break;
      case 'vine': this.noise(0.12, 0.1, 2000); break;
      case 'splash': this.noise(0.4, 0.3, 900, 'lowpass'); break;
      case 'tongue': this.tone(900, 0.12, 'sawtooth', 0.08, 0.3); break;
      case 'flap': this.noise(0.12, 0.12, 700); break;
      case 'flip': this.tone(200, 0.4, 'sine', 0.2, 4); this.tone(800, 0.4, 'sine', 0.1, 0.25); break;
      case 'bloom': [0, 5, 9, 12].forEach((n, i) => this.tone(660 * Math.pow(2, n / 12), 0.4, 'sine', 0.1, 0, i * 0.05)); break;
      case 'checkpoint': [0, 4, 7, 12].forEach((n, i) => this.tone(440 * Math.pow(2, n / 12), 0.25, 'triangle', 0.12, 0, i * 0.09)); break;
      case 'crumble': this.noise(0.4, 0.2, 250, 'lowpass'); break;
      case 'cart': this.noise(0.05, 0.05, 150, 'lowpass'); break;
      case 'portal': this.tone(300, 0.8, 'sine', 0.2, 3); this.tone(450, 0.8, 'sine', 0.1, 3, 0.1); break;
      case 'rumble': this.noise(1.2, 0.35, 90, 'lowpass'); break;
      case 'leap': this.tone(520, 0.18, 'sine', 0.12, 2.4); this.tone(1040, 0.22, 'sine', 0.05, 2, 0.03); this.noise(0.15, 0.06, 3000, 'highpass'); break;
      case 'song': [0, 7, 12, 16, 19, 24].forEach((n, i) => { this.tone(330 * Math.pow(2, n / 12), 1.2, 'sine', 0.07, 0, i * 0.06); this.tone(660 * Math.pow(2, n / 12), 0.8, 'triangle', 0.02, 0, i * 0.06 + 0.02); }); break;
      case 'echo': [0, 5, 9, 12].forEach((n, i) => this.tone(392 * Math.pow(2, n / 12), 2.2, 'sine', 0.08, 0, i * 0.35)); break;
      case 'notice': this.tone(880, 0.1, 'square', 0.05); this.tone(1320, 0.14, 'square', 0.05, 0, 0.09); break;
      case 'win': [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((n, i) => this.tone(392 * Math.pow(2, n / 12), 0.5, 'triangle', 0.12, 0, i * 0.12)); break;
    }
  }
  // The Lumen motif: five notes that grow more complete as Kiri awakens the world.
  motif(stage = 1, vol = 1) {
    if (!this.ctx) return;
    const notes = [12, 16, 19, 23, 21, 19, 24], lens = [0.45, 0.45, 0.7, 0.45, 0.45, 0.6, 1.6];
    const n = Math.min(notes.length, [3, 3, 4, 5, 7][Math.min(4, stage)] || 3);
    let t = 0;
    for (let i = 0; i < n; i++) {
      const f = 220 * Math.pow(2, notes[i] / 12);
      this.tone(f, lens[i] * 1.8, 'sine', 0.14 * vol, 0, t); this.tone(f * 2, lens[i], 'triangle', 0.03 * vol, 0, t + 0.01);
      if (stage >= 3) this.tone(f / 2, lens[i] * 2, 'sine', 0.06 * vol, 0, t);
      t += lens[i];
    }
  }
  ambient() {
    // soft wind/insect bed
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 5200; f.Q.value = 6;
    const g = this.ctx.createGain(); g.gain.value = 0.015;
    s.connect(f); f.connect(g); g.connect(this.master); s.start();
    this.ambGain = g;
  }
  // theme: 0 jungle, 1 canopy, 2 water, 3 cave, 4 mine/chase
  updateMusic() {
    if (!this.ctx || !this.musicOn || this.musicWanted === false) { if (this.mus) this.mus.gain.value = 0; return; }
    if (this.theme !== this.lastTheme) { if (this.lastTheme !== undefined) this.q = 1; this.lastTheme = this.theme; } // dip and swell into a new area's band
    this.q += (this.quiet - this.q) * 0.05;
    this.mus.gain.value = this.muted ? 0 : 0.32 * (this.musVol ?? 1) * (1 - this.q * 0.92);
    const calm = this.theme >= 5 && this.theme !== 5;
    // each area has its own band: tempo, lead voice, percussion feel and an atmosphere layer
    const V = [
      { bpm: 112, wave: 'sine', vol: 0.09, flute: true },                 // Rootwild: marimba + wooden flute
      { bpm: 104, wave: 'triangle', vol: 0.07, shaker: true, flute: true }, // Canopy: airy plucks, shakers
      { bpm: 92, wave: 'sine', vol: 0.08, harp: true, soft: true },        // Weeping Ruins: harp, gentle
      { bpm: 84, wave: 'sine', vol: 0.07, drone: 55, soft: true },         // Glowdeep: shimmer over a cave drone
      { bpm: 132, wave: 'square', vol: 0.045, clank: true },               // Sunwright Mine: driving, clanking
      { bpm: 124, wave: 'sawtooth', vol: 0.035, drone: 65, choir: true },  // Heart of the Seed: urgent, choral
      { bpm: 76, wave: 'sine', vol: 0.06 },                                 // hidden worlds
      { bpm: 96, wave: 'triangle', vol: 0.07 },
    ][this.theme] || { bpm: 112, wave: 'sine', vol: 0.09 };
    const bpm = (calm ? 84 : V.bpm) + this.intensity * 40, sp = 60 / bpm / 2;
    const scales = [[0, 3, 5, 7, 10], [0, 2, 4, 7, 9], [0, 2, 5, 7, 9], [0, 1, 5, 7, 8], [0, 3, 5, 6, 7], [0, 2, 4, 7, 11], [0, 4, 7, 11, 14], [0, 2, 4, 7, 9]];
    const roots = [220, 247, 196, 185, 208, 196, 262, 233];
    const sc = scales[this.theme], root = roots[this.theme];
    while (this.nextNote < this.ctx.currentTime + 0.2) {
      const t = this.nextNote - this.ctx.currentTime, st = this.step;
      const bar = Math.floor(st / 16) % 4, prog = [0, 3, 4, 2][bar];
      // bass
      if (st % 4 === 0) this.tone(root / 2 * Math.pow(2, sc[prog % 5] / 12), sp * 3, 'triangle', 0.22, 0, t, this.mus);
      // marimba-ish arpeggio
      if (st % 2 === 0 || this.intensity > 0.5) {
        const idx = [0, 2, 4, 2, 1, 3, 4, 3][st % 8] + prog;
        const n = sc[idx % 5] + 12 * Math.floor(idx / 5);
        this.tone(root * Math.pow(2, n / 12), sp * (V.harp ? 4 : 1.5), V.wave, V.vol, 0, t, this.mus);
        if (V.harp && st % 4 === 0) this.tone(root * 2 * Math.pow(2, n / 12), sp * 5, 'triangle', 0.03, 0, t + sp * 0.5, this.mus);
        if (this.theme === 3) this.tone(root * 2 * Math.pow(2, n / 12), sp * 3, 'sine', 0.025, 0, t + sp, this.mus);
      }
      // area layers
      if (V.flute && st % 32 === 8) [0, 2, 1].forEach((k, i) => this.tone(root * 2 * Math.pow(2, sc[(prog + k + 2) % 5] / 12), sp * 3, 'triangle', 0.04, 0, t + i * sp * 2, this.mus));
      if (V.drone && st % 32 === 0) { this.tone(V.drone, sp * 32, 'sine', 0.06, 0, t, this.mus); this.tone(V.drone * 1.5, sp * 32, 'sine', 0.025, 0, t, this.mus); }
      if (V.choir && st % 16 === 0) [0, 2, 4].forEach((k) => this.tone(root * Math.pow(2, sc[(prog + k) % 5] / 12), sp * 15, 'triangle', 0.025, 0, t, this.mus));
      if (V.shaker && st % 2 === 1) this.noise(0.04, 0.035, 7000, 'highpass', t, this.mus);
      if (V.clank && st % 4 === 3) this.tone(1400 + (st % 8) * 60, 0.05, 'square', 0.02, -800, t, this.mus);
      // the world waking adds a warm pad; hidden worlds get bells instead of drums
      if (this.wake >= 3 && st % 16 === 0) [0, 2, 4].forEach((k) => this.tone(root / 2 * Math.pow(2, sc[(prog + k) % 5] / 12), sp * 16, 'sine', 0.035, 0, t, this.mus));
      if (calm) { if (st % 4 === 2) this.tone(root * 4 * Math.pow(2, sc[(st * 3) % 5] / 12), 1.5, 'sine', 0.03, 0, t, this.mus); this.nextNote += sp; this.step++; continue; }
      // percussion
      if (V.soft && this.intensity < 0.3) { if (st % 16 === 0) this.noise(0.2, 0.12, 90, 'lowpass', t, this.mus); this.nextNote += sp; this.step++; continue; }
      if (st % 8 === 0 || (V.clank && st % 8 === 3)) this.noise(0.12, 0.2, 120, 'lowpass', t, this.mus);
      if (st % 8 === 4) this.noise(0.08, 0.1, 900, 'bandpass', t, this.mus);
      if (this.intensity > 0.3 && st % 2 === 1) this.noise(0.03, 0.05, 6000, 'highpass', t, this.mus);
      if (st % 16 === 14) this.noise(0.05, 0.08, 400, 'bandpass', t, this.mus);
      this.nextNote += sp; this.step++;
    }
  }
}
