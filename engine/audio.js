// Âm thanh tạo bằng Web Audio API (không dùng file)
export class Sound {
  constructor() { this.on = false; this.ctx = null; this.lastBloop = 0; this.amb = null; }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setEnabled(on) {
    this.on = on;
    if (on) { if (this.ensure()) this.startAmbient(); }
    else this.stopAmbient();
  }

  startAmbient() {
    if (this.amb || !this.ctx) return;
    const c = this.ctx;
    const len = c.sampleRate * 4;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const g = c.createGain(); g.gain.value = 0;
    g.gain.setTargetAtTime(0.2, c.currentTime, 0.8);
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
    const lg = c.createGain(); lg.gain.value = 0.07;
    lfo.connect(lg).connect(g.gain);
    src.connect(lp).connect(g).connect(this.master);
    src.start(); lfo.start();
    this.amb = { src, g, lfo };
  }

  stopAmbient() {
    if (!this.amb) return;
    const { src, g, lfo } = this.amb;
    g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    setTimeout(() => { try { src.stop(); lfo.stop(); } catch { /* đã dừng */ } }, 900);
    this.amb = null;
  }

  bloop(r = 3) {
    if (!this.on || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastBloop < 0.2 || Math.random() < 0.6) return;
    this.lastBloop = now;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    const f0 = 900 - r * 60;
    o.type = 'sine';
    o.frequency.setValueAtTime(f0 * 0.6, now);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.6, now + 0.07);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    o.connect(g).connect(this.master);
    o.start(now); o.stop(now + 0.15);
  }

  plop(vol = 1) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx, now = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(260, now);
    o.frequency.exponentialRampToValueAtTime(55, now + 0.28);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.22 * vol, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    o.connect(g).connect(this.master);
    o.start(now); o.stop(now + 0.35);
    const len = c.sampleRate * 0.08, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const n = c.createBufferSource(); n.buffer = buf;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400;
    const ng = c.createGain(); ng.gain.value = 0.07 * vol;
    n.connect(hp).connect(ng).connect(this.master);
    n.start(now);
  }

  chomp() {
    if (!this.on || !this.ctx) return;
    const c = this.ctx, now = c.currentTime;
    for (let k = 0; k < 2; k++) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'square'; o.frequency.value = 170 + k * 40;
      const t0 = now + k * 0.07;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.04, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
      o.connect(g).connect(this.master);
      o.start(t0); o.stop(t0 + 0.05);
    }
  }
}
