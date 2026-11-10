// Nước, ánh sáng, đáy cát, mặt nước, kính bể
import { TAU, clamp, lerp, mix, rgba, mulberry, noise1 } from './util.js';

const DAY = { top: [92, 214, 226], mid: [24, 138, 188], bot: [9, 56, 102] };
const NIGHT = { top: [24, 66, 110], mid: [9, 32, 66], bot: [3, 12, 30] };
const DUSK = [255, 150, 96];

export function lightAt(mode, date = new Date()) {
  if (mode === 'day') return { day: 1, dusk: 0 };
  if (mode === 'night') return { day: 0, dusk: 0 };
  const h = date.getHours() + date.getMinutes() / 60;
  let day;
  if (h >= 7 && h < 17) day = 1;
  else if (h >= 19.5 || h < 5) day = 0;
  else if (h >= 17) day = 1 - (h - 17) / 2.5;
  else day = (h - 5) / 2;
  const dusk = Math.max(0, 1 - Math.abs(h - 18) / 1.4) * 0.9 + Math.max(0, 1 - Math.abs(h - 6) / 1.2) * 0.5;
  return { day: clamp(day, 0, 1), dusk: clamp(dusk, 0, 1) };
}

export function palette(lt) {
  const f = (k) => mix(NIGHT[k], DAY[k], lt.day);
  return {
    top: mix(f('top'), DUSK, lt.dusk * 0.45),
    mid: mix(f('mid'), DUSK, lt.dusk * 0.12),
    bot: f('bot'),
    day: lt.day,
    dusk: lt.dusk
  };
}

// Pha màu vật thể dưới nước: ám xanh theo độ sâu, tối đi vào ban đêm
export function makeTint(pal) {
  return (c, depth = 0.22) => mix(mix(c, pal.mid, depth), [6, 18, 36], (1 - pal.day) * 0.5);
}

const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

// Texture caustics: cạnh Voronoi (F2 - F1), lặp liền mạch
function makeCausticTile(n = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d');
  const img = g.createImageData(n, n);
  const r = mulberry(11);
  const pts = [];
  for (let i = 0; i < 16; i++) pts.push([r() * n, r() * n]);
  const d = img.data;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let f1 = 1e9, f2 = 1e9;
      for (const p of pts) {
        for (let oy = -n; oy <= n; oy += n) {
          for (let ox = -n; ox <= n; ox += n) {
            const dx = x - p[0] - ox, dy = y - p[1] - oy;
            const dd = dx * dx + dy * dy;
            if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
          }
        }
      }
      const e = Math.sqrt(f2) - Math.sqrt(f1);
      let v = 1 - smooth(0, 9, e);
      v = v * v * (0.55 + 0.45 * smooth(0, 60, Math.sqrt(f1)));
      const i = (y * n + x) * 4;
      d[i] = 205; d[i + 1] = 255; d[i + 2] = 250; d[i + 3] = (v * 235) | 0;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

export class Scene {
  constructor() {
    this.tile = makeCausticTile();
    this.pat = null;
  }

  layout(W, H, minAir = 0) {
    this.W = W; this.H = H;
    this.surfaceY = Math.round(Math.max(clamp(H * 0.06, 22, 54), minAir));
    this.floorBase = H * 0.84;
    const r = mulberry(4242);
    const o1 = r() * 50, o2 = r() * 50;
    this.step = 6;
    this.floor = [];
    for (let x = -this.step * 2; x <= W + this.step * 2; x += this.step) {
      this.floor.push(
        this.floorBase + noise1(x / 280 + o1) * H * 0.035 + noise1(x / 70 + o2) * H * 0.006 -
        Math.sin((x / W) * Math.PI) * H * 0.012
      );
    }
    this.floorMin = Math.min(...this.floor);
    const p = new Path2D();
    p.moveTo(-this.step * 2, H + 5);
    for (let i = 0; i < this.floor.length; i++) p.lineTo(-this.step * 2 + i * this.step, this.floor[i]);
    p.lineTo(W + this.step * 2, H + 5);
    p.closePath();
    this.floorPath = p;
    this.rays = Array.from({ length: 6 }, (_, i) => ({
      x: W * (0.05 + 0.18 * i) + r() * W * 0.06,
      w0: W * (0.025 + r() * 0.035),
      w1: W * (0.1 + r() * 0.12),
      sl: W * (r() * 0.22 - 0.06),
      ph: r() * TAU,
      sp: 0.12 + r() * 0.18
    }));
  }

  floorAt(x) {
    const f = (x + this.step * 2) / this.step;
    const i = clamp(Math.floor(f), 0, this.floor.length - 2);
    const u = clamp(f - i, 0, 1);
    return lerp(this.floor[i], this.floor[i + 1], u);
  }

  wave(x, t) {
    const S = this.surfaceY;
    return S + Math.sin(x * 0.018 + t * 1.6) * 1.6 + Math.sin(x * 0.0063 - t * 0.9) * 2.4 + Math.sin(x * 0.041 + t * 2.3) * 0.7;
  }

  // ---------- Lớp tĩnh ----------
  drawBack(g, pal) {
    const { W, H } = this;
    const S = this.surfaceY;
    const gr = g.createLinearGradient(0, S, 0, H);
    gr.addColorStop(0, rgba(pal.top));
    gr.addColorStop(0.45, rgba(pal.mid));
    gr.addColorStop(1, rgba(pal.bot));
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);

    const r = mulberry(77);
    const ridges = [
      [0.6, 0.14, 240, 0.3, 0.5],
      [0.7, 0.1, 150, 0.6, 0.65]
    ];
    ridges.forEach(([base, amp, fr, k, al], li) => {
      const col = mix(pal.mid, pal.bot, k);
      const o = r() * 100;
      const yAt = (x) => H * base - (noise1(x / fr + o) * 0.5 + 0.5) * H * amp - noise1(x / 35 + o) * H * 0.008;
      // rong biển xa dạng bóng
      g.strokeStyle = rgba(col, al * 0.7);
      g.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const x = r() * W, y0 = yAt(x) + 4, h = H * (0.06 + r() * 0.1);
        g.lineWidth = 2 + r() * 4;
        g.beginPath();
        g.moveTo(x, y0);
        g.bezierCurveTo(x + 10, y0 - h * 0.3, x - 10, y0 - h * 0.7, x + (r() - 0.5) * 16, y0 - h);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W + 10; x += 10) g.lineTo(x, yAt(x));
      g.lineTo(W, H);
      g.closePath();
      const lg = g.createLinearGradient(0, H * (base - amp), 0, H * 0.9);
      lg.addColorStop(0, rgba(col, al * 0.65));
      lg.addColorStop(1, rgba(col, al));
      g.fillStyle = lg;
      g.fill();
      // san hô xa dạng bóng trên dãy gần hơn
      if (li === 1) {
        g.fillStyle = rgba(col, al);
        for (let i = 0; i < 6; i++) {
          const x = r() * W, y = yAt(x) + 3;
          const s = 8 + r() * 14;
          g.beginPath();
          g.ellipse(x, y, s * 1.4, s, 0, Math.PI, TAU);
          g.fill();
        }
      }
    });
    // sương sâu
    const fog = g.createLinearGradient(0, H * 0.45, 0, H);
    fog.addColorStop(0, rgba(pal.bot, 0));
    fog.addColorStop(1, rgba(pal.bot, 0.35));
    g.fillStyle = fog;
    g.fillRect(0, H * 0.45, W, H * 0.55);
  }

  drawFloor(g, pal, tint) {
    const { W, H } = this;
    const s = Math.min(W, H) / 700;
    const sTop = tint([236, 214, 164], 0.16), sBot = tint([168, 136, 92], 0.32);
    const lg = g.createLinearGradient(0, this.floorMin, 0, H);
    lg.addColorStop(0, rgba(sTop));
    lg.addColorStop(1, rgba(sBot));
    g.fillStyle = lg;
    g.fill(this.floorPath);

    const r = mulberry(9);
    g.save();
    g.clip(this.floorPath);
    const light = tint([255, 244, 214]), dark = tint([112, 86, 56]);
    const n = Math.round((W * (H - this.floorMin)) / 40);
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = this.floorMin + r() * (H - this.floorMin);
      g.fillStyle = r() < 0.5 ? rgba(light, 0.12 + r() * 0.3) : rgba(dark, 0.1 + r() * 0.25);
      const sz = 0.6 + r() * 1.3;
      g.fillRect(x, y, sz, sz);
    }
    // gợn cát
    g.lineWidth = 1.2;
    for (let i = 0; i < 70; i++) {
      const x = r() * W;
      const y = this.floorAt(x) + 8 + r() * (H - this.floorAt(x) - 10);
      const w = (16 + r() * 22) * s;
      g.strokeStyle = rgba(dark, 0.28);
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 4 * s, x + w, y); g.stroke();
      g.strokeStyle = rgba(light, 0.22);
      g.beginPath(); g.moveTo(x, y - 1.5); g.quadraticCurveTo(x + w / 2, y - 5.5 * s, x + w, y - 1.5); g.stroke();
    }
    // sỏi nhiều màu
    const pcols = [[204, 120, 92], [120, 152, 176], [236, 226, 206], [92, 92, 104], [184, 162, 120], [146, 112, 168], [96, 150, 120]];
    for (let i = 0; i < 90; i++) {
      const x = r() * W;
      const y = this.floorAt(x) + 4 + r() * H * 0.09;
      const rx = (2 + r() * 4.5) * s, ry = rx * (0.6 + r() * 0.3);
      const c = tint(pcols[(r() * pcols.length) | 0], 0.18);
      g.fillStyle = rgba(c);
      g.beginPath(); g.ellipse(x, y, rx, ry, r() * 0.6 - 0.3, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.22)';
      g.beginPath(); g.ellipse(x - rx * 0.3, y - ry * 0.35, rx * 0.35, ry * 0.25, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.beginPath(); g.ellipse(x + rx * 0.1, y + ry * 0.8, rx * 0.9, ry * 0.25, 0, 0, TAU); g.fill();
    }
    // tối dần xuống đáy
    const sh = g.createLinearGradient(0, this.floorBase, 0, H);
    sh.addColorStop(0, 'rgba(0,10,25,0)');
    sh.addColorStop(1, 'rgba(0,10,25,0.28)');
    g.fillStyle = sh;
    g.fillRect(0, this.floorMin, W, H - this.floorMin);
    g.restore();

    // viền sáng mép cát
    g.strokeStyle = rgba([255, 250, 230], 0.16 + pal.day * 0.14);
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < this.floor.length; i++) {
      const x = -this.step * 2 + i * this.step;
      i ? g.lineTo(x, this.floor[i]) : g.moveTo(x, this.floor[i]);
    }
    g.stroke();
  }

  drawGlass(g, pal) {
    const { W, H } = this;
    // vệt phản chiếu chéo
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(255,255,255,0.035)';
    g.beginPath(); g.moveTo(W * 0.7, 0); g.lineTo(W * 0.8, 0); g.lineTo(W * 0.52, H); g.lineTo(W * 0.42, H); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.03)';
    g.beginPath(); g.moveTo(W * 0.83, 0); g.lineTo(W * 0.855, 0); g.lineTo(W * 0.575, H); g.lineTo(W * 0.55, H); g.closePath(); g.fill();
    g.restore();
    // mép kính hai bên
    let gr = g.createLinearGradient(0, 0, 26, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.13)'); gr.addColorStop(0.15, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 26, H);
    gr = g.createLinearGradient(W, 0, W - 26, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(W - 26, 0, 26, H);
    // vignette
    const v = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.78);
    v.addColorStop(0, 'rgba(0,8,20,0)');
    v.addColorStop(1, `rgba(0,8,20,${0.45 + (1 - pal.day) * 0.15})`);
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    // viền nhựa trên miệng bể
    const rim = g.createLinearGradient(0, 0, 0, 8);
    rim.addColorStop(0, 'rgba(8,14,22,0.95)'); rim.addColorStop(1, 'rgba(8,14,22,0)');
    g.fillStyle = rim; g.fillRect(0, 0, W, 8);
  }

  // ---------- Lớp động ----------
  drawRays(ctx, t, pal) {
    const S = this.surfaceY, bottom = this.floorBase;
    const base = 0.045 + 0.085 * pal.day + pal.dusk * 0.03;
    const col = mix([215, 255, 250], [255, 200, 150], pal.dusk * 0.6);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.rays) {
      const sw = Math.sin(t * r.sp + r.ph) * this.W * 0.03;
      const a = base * (0.55 + 0.45 * Math.sin(t * r.sp * 1.7 + r.ph * 2));
      const x0 = r.x + sw * 0.3, x1 = r.x + r.sl + sw;
      const gr = ctx.createLinearGradient(0, S, 0, bottom);
      gr.addColorStop(0, rgba(col, a));
      gr.addColorStop(0.6, rgba(col, a * 0.35));
      gr.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(x0 - r.w0 / 2, S); ctx.lineTo(x0 + r.w0 / 2, S);
      ctx.lineTo(x1 + r.w1 / 2, bottom); ctx.lineTo(x1 - r.w1 / 2, bottom);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  drawCaustics(ctx, t, pal) {
    if (!this.pat) this.pat = ctx.createPattern(this.tile, 'repeat');
    const p = this.pat;
    const a = 0.05 + 0.12 * pal.day;
    const fill = (ox, oy, sx, sy, al, y0, h) => {
      p.setTransform(new DOMMatrix().translate(ox, oy).scale(sx, sy));
      ctx.globalAlpha = al;
      ctx.fillStyle = p;
      ctx.fillRect(0, y0, this.W, h);
    };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // lấp lánh nhẹ trong nước
    fill(t * 6, -t * 3, 2.4, 1.6, a * 0.12, this.surfaceY, this.floorMin - this.surfaceY);
    ctx.clip(this.floorPath);
    const y0 = this.floorMin - 5;
    fill(t * 9, t * 4, 0.75, 0.32, a, y0, this.H - y0);
    fill(-t * 7 + 40, t * 3 + 90, 0.55, 0.26, a * 0.85, y0, this.H - y0);
    ctx.restore();
  }

  drawSurface(ctx, t, pal) {
    const { W } = this;
    const S = this.surfaceY;
    const k = 0.05 + pal.day * 0.9;
    const air = ctx.createLinearGradient(0, 0, 0, S + 4);
    air.addColorStop(0, rgba(mix([24, 34, 52], [210, 234, 242], k)));
    air.addColorStop(1, rgba(mix([36, 56, 80], [170, 220, 232], k)));
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(W, 0);
    for (let x = W; x >= -8; x -= 8) ctx.lineTo(x, this.wave(x, t));
    ctx.closePath();
    ctx.fillStyle = air;
    ctx.fill();

    const band = ctx.createLinearGradient(0, S, 0, S + 30);
    band.addColorStop(0, `rgba(230,255,255,${0.3 * (0.4 + pal.day * 0.6)})`);
    band.addColorStop(1, 'rgba(230,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, S + 2, W, 30);

    ctx.beginPath();
    for (let x = 0; x <= W + 8; x += 8) { const y = this.wave(x, t); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = `rgba(255,255,255,${0.6 * (0.5 + pal.day * 0.5)})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    for (let i = 0; i < 26; i++) {
      const x = ((i * 137.5 + t * 16 * ((i % 3) + 1)) % (W + 40)) - 20;
      const y = this.wave(x, t) + 3 + ((i * 7) % 9);
      const a = 0.22 + 0.22 * Math.sin(t * 3 + i);
      ctx.fillStyle = `rgba(255,255,255,${a * (0.35 + pal.day * 0.65)})`;
      ctx.fillRect(x, y, 6 + (i % 4) * 3, 1.2);
    }
  }
}
