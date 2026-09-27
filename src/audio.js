// Fully synthesized audio: SFX + a light procedural jungle score. No external assets.
export class Audio {
  constructor() { this.ctx = null; this.muted = false; this.musicOn = false; this.intensity = 0; this.theme = 0; }
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ctx.destination);
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
  resume() { this.ctx && this.ctx.state !== 'running' && this.ctx.resume(); }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.55; }
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
      case 'win': [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((n, i) => this.tone(392 * Math.pow(2, n / 12), 0.5, 'triangle', 0.12, 0, i * 0.12)); break;
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
    if (!this.ctx || !this.musicOn) return;
    const bpm = 112 + this.intensity * 40, sp = 60 / bpm / 2;
    const scales = [[0, 3, 5, 7, 10], [0, 2, 4, 7, 9], [0, 2, 5, 7, 9], [0, 1, 5, 7, 8], [0, 3, 5, 6, 7]];
    const roots = [220, 247, 196, 185, 208];
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
        this.tone(root * Math.pow(2, n / 12), sp * 1.5, 'sine', 0.09, 0, t, this.mus);
        if (this.theme === 3) this.tone(root * 2 * Math.pow(2, n / 12), sp * 3, 'sine', 0.025, 0, t + sp, this.mus);
      }
      // percussion
      if (st % 8 === 0) this.noise(0.12, 0.2, 120, 'lowpass', t, this.mus);
      if (st % 8 === 4) this.noise(0.08, 0.1, 900, 'bandpass', t, this.mus);
      if (this.intensity > 0.3 && st % 2 === 1) this.noise(0.03, 0.05, 6000, 'highpass', t, this.mus);
      if (st % 16 === 14) this.noise(0.05, 0.08, 400, 'bandpass', t, this.mus);
      this.nextNote += sp; this.step++;
    }
  }
}
