// Bong bóng, phù du, giọt nước bắn, gợn sóng, nốt nhạc, vụn thức ăn
import { TAU, clamp, rand } from './util.js';

export class Particles {
  constructor() {
    this.bubbles = []; this.plankton = []; this.ripples = []; this.drops = [];
    this.notes = []; this.crumbs = []; this.pops = [];
    this.onPop = null;
  }

  layout(W, H, scene) {
    this.W = W; this.H = H; this.scene = scene;
    this.s = Math.min(W, H) / 700;
    const n = Math.round(clamp((W * H) / 7000, 60, 220));
    this.plankton = Array.from({ length: n }, () => ({
      x: rand(0, W), y: rand(scene.surfaceY, H), z: rand(0.25, 1),
      vx: rand(-4, 4), vy: rand(-3, 3), ph: rand(0, TAU)
    }));
    this.planktonLimit = n;
  }

  setPlanktonCount(n) {
    const k = Math.min(n, this.planktonLimit || n);
    if (this.plankton.length > k) this.plankton.length = k;
  }

  bubble(x, y, r, speed = 1) {
    if (this.bubbles.length > 260) return;
    this.bubbles.push({ x, y, r, vy: -(22 + r * 9) * speed, ph: rand(0, TAU), wob: rand(0.5, 1.2) });
  }

  ripple(x, y, max = 70, flat = 0.32) { this.ripples.push({ x, y, r: 2, max, life: 1, flat }); }

  splash(x, y) {
    for (let i = 0; i < 16; i++) this.drops.push({ x: x + rand(-6, 6), y, vx: rand(-90, 90), vy: rand(-240, -90), r: rand(1, 2.6), life: 1 });
    this.ripple(x, y + 2, 50);
    for (let i = 0; i < 8; i++) this.bubble(x + rand(-14, 14), y + rand(6, 30), rand(1.5, 3.5));
  }

  note(x, y) { this.notes.push({ x, y, vx: rand(-8, 8), life: 1.8, ch: Math.random() < 0.5 ? '♪' : '♫', size: rand(11, 16) }); }

  crumb(x, y) {
    for (let i = 0; i < 10; i++) this.crumbs.push({ x, y, vx: rand(-40, 40), vy: rand(-40, 20), life: rand(0.5, 1), r: rand(0.8, 1.8) });
  }

  update(dt, t) {
    const S = this.scene.surfaceY, W = this.W, H = this.H;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.vy -= 6 * dt;
      b.y += b.vy * dt;
      b.x += Math.sin(t * 3.2 * b.wob + b.ph) * b.r * 3 * dt;
      if (b.y < S + 1) {
        this.pops.push({ x: b.x, y: S, r: b.r, life: 0.35 });
        this.onPop?.(b.r);
        this.bubbles.splice(i, 1);
      }
    }
    for (const p of this.plankton) {
      p.vx = clamp(p.vx + rand(-1, 1) * 14 * dt, -7, 7);
      p.vy = clamp(p.vy + rand(-1, 1) * 14 * dt, -5, 5);
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 0) p.x += W; if (p.x > W) p.x -= W;
      if (p.y < S + 4) p.y = H - 4; if (p.y > H) p.y = S + 6;
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.vy += 700 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.vy > 0 && d.y > S + 2) { this.drops.splice(i, 1); if (Math.random() < 0.3) this.ripple(d.x, S + 2, 18); }
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.r += (r.max - r.r) * dt * 3 + dt * 10; r.life -= dt * 1.3;
      if (r.life <= 0) this.ripples.splice(i, 1);
    }
    for (let i = this.pops.length - 1; i >= 0; i--) { const p = this.pops[i]; p.life -= dt; if (p.life <= 0) this.pops.splice(i, 1); }
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i]; n.y -= 28 * dt; n.x += Math.sin(t * 4 + i) * 12 * dt + n.vx * dt; n.life -= dt;
      if (n.life <= 0 || n.y < S + 4) this.notes.splice(i, 1);
    }
    for (let i = this.crumbs.length - 1; i >= 0; i--) {
      const c = this.crumbs[i]; c.vx *= 0.94; c.vy = c.vy * 0.94 + 30 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.life -= dt;
      if (c.life <= 0) this.crumbs.splice(i, 1);
    }
  }

  drawPlankton(ctx, pal, layer) {
    const night = 1 - pal.day;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const n = this.plankton.length;
    for (let i = layer ? 1 : 0; i < n; i += 2) {
      const p = this.plankton[i];
      const a = (0.12 + p.z * 0.25) * (0.6 + night * 0.8);
      ctx.fillStyle = night > 0.5 && i % 5 === 0 ? `rgba(140,255,230,${a * 1.4})` : `rgba(220,250,255,${a})`;
      const sz = 0.8 + p.z * 1.2 + (night > 0.5 && i % 5 === 0 ? 1 : 0);
      ctx.fillRect(p.x, p.y, sz, sz);
    }
    ctx.restore();
  }

  drawBubbles(ctx) {
    for (const b of this.bubbles) {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fillStyle = 'rgba(210,245,255,0.10)'; ctx.fill();
      ctx.strokeStyle = 'rgba(225,250,255,0.6)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.38, Math.max(0.5, b.r * 0.28), 0, TAU); ctx.fill();
    }
    for (const p of this.pops) {
      const k = 1 - p.life / 0.35;
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - k)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, p.r + k * 7, (p.r + k * 7) * 0.3, 0, 0, TAU); ctx.stroke();
    }
  }

  drawNotes(ctx) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const n of this.notes) {
      const a = Math.min(1, n.life / 0.6);
      ctx.font = `700 ${n.size}px ui-rounded, system-ui, sans-serif`;
      ctx.fillStyle = `rgba(255,236,140,${a})`;
      ctx.strokeStyle = `rgba(80,40,0,${a * 0.5})`; ctx.lineWidth = 2;
      ctx.strokeText(n.ch, n.x, n.y); ctx.fillText(n.ch, n.x, n.y);
    }
  }

  drawCrumbs(ctx) {
    for (const c of this.crumbs) {
      ctx.fillStyle = `rgba(210,140,70,${c.life})`;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();
    }
  }

  drawSplash(ctx) {
    for (const d of this.drops) {
      ctx.fillStyle = 'rgba(220,250,255,0.85)';
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill();
    }
    for (const r of this.ripples) {
      ctx.strokeStyle = `rgba(230,255,255,${0.5 * r.life})`; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * r.flat, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(230,255,255,${0.25 * r.life})`;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * 0.6, r.r * 0.6 * r.flat, 0, 0, TAU); ctx.stroke();
    }
  }
}
