// Đồ trang trí: đá, lâu đài, san hô, rương kho báu, hải quỳ, rong biển, sứa
import { TAU, clamp, lerp, mix, rgba, mulberry, easeOut } from './util.js';

const WHITE = [255, 255, 255], BLACK = [0, 0, 0];

export class Decor {
  layout(scene) {
    const W = scene.W, H = scene.H;
    const s = Math.min(W, H) / 700;
    this.s = s; this.scene = scene;
    const r = mulberry(2024);
    const at = (fx) => ({ x: W * fx, y: scene.floorAt(W * fx) });

    this.rocks = [
      { ...at(0.1), w: 120 * s, h: 60 * s, seed: 1, col: [128, 122, 116] },
      { ...at(0.82), w: 150 * s, h: 78 * s, seed: 2, col: [118, 108, 100] },
      { ...at(0.955), w: 92 * s, h: 56 * s, seed: 3, col: [126, 118, 112] },
      { ...at(0.37), w: 54 * s, h: 26 * s, seed: 4, col: [134, 126, 118] }
    ];
    this.castle = { ...at(0.64), s };
    this.chest = { ...at(0.27), s, emitted: -1 };
    this.anemone = { ...at(0.5), s };
    this.airstone = { ...at(0.175), s, acc: 0 };
    this.corals = [
      { ...at(0.035), type: 'branch', col: [255, 112, 146], seed: 5, size: 1.05 },
      { ...at(0.445), type: 'fan', col: [176, 108, 232], seed: 6, size: 1 },
      { ...at(0.88), type: 'branch', col: [255, 150, 80], seed: 7, size: 0.85 },
      { ...at(0.735), type: 'brain', col: [226, 172, 112], seed: 8, size: 1 },
      { ...at(0.215), type: 'tube', col: [255, 206, 84], seed: 9, size: 1 }
    ];
    this.shells = [at(0.31), at(0.575), at(0.925)].map((p, i) => ({ ...p, rot: r() * 0.6 - 0.3, kind: i % 2 }));
    this.stars = [at(0.135), at(0.695)].map((p) => ({ ...p, rot: r() * TAU }));

    const greens = [[[30, 110, 60], [110, 200, 96]], [[24, 96, 70], [86, 186, 130]], [[60, 120, 40], [160, 210, 80]]];
    const reds = [[[130, 40, 60], [230, 110, 120]]];
    const mk = (fx, front) => {
      const x = W * fx + (r() - 0.5) * W * 0.02;
      const roll = r();
      const type = front ? 'grass' : roll < 0.42 ? 'kelp' : roll < 0.75 ? 'grass' : 'leafy';
      const hmul = type === 'kelp' ? 0.26 + r() * 0.22 : type === 'grass' ? 0.1 + r() * 0.1 : 0.16 + r() * 0.12;
      const h = H * hmul * (front ? 0.8 : 1);
      const n = 14;
      const cols = r() < 0.15 ? reds[0] : greens[(r() * greens.length) | 0];
      const w = { x, y: scene.floorAt(x) + 4, h, n, seg: h / n, type, cols, ph: r() * TAU, sp: 0.9 + r() * 0.6, lean: (r() - 0.5) * 0.12, push: 0, front };
      if (type === 'grass') {
        w.blades = Array.from({ length: 4 + ((r() * 3) | 0) }, () => ({
          dx: (r() - 0.5) * 18 * s, hk: 0.55 + r() * 0.45, ph: r() * TAU, lean: (r() - 0.5) * 0.5
        }));
      }
      return w;
    };
    this.weeds = [0.06, 0.145, 0.245, 0.3, 0.405, 0.555, 0.705, 0.79, 0.9, 0.975].map((f) => mk(f, false));
    this.front = [0.015, 0.6, 0.99].map((f) => mk(f, true));

    this.jellies = Array.from({ length: 3 }, (_, i) => ({
      x: W * (0.2 + 0.3 * i) + r() * 40, y: H * (0.25 + r() * 0.3),
      sz: (20 + r() * 14) * s, ph: r() * TAU, vx: (r() - 0.5) * 6, hue: i % 2
    }));
  }

  // ---------- Vẽ tĩnh (1 lần) ----------
  drawStatic(g, pal, tint) {
    const s = this.s;
    for (const c of this.corals) if (c.type === 'fan' || c.type === 'branch') drawCoral(g, c, s, tint);
    drawCastle(g, this.castle, tint, pal);
    for (const rk of this.rocks) drawRock(g, rk, s, tint);
    for (const c of this.corals) if (c.type === 'brain' || c.type === 'tube') drawCoral(g, c, s, tint);
    for (const sh of this.shells) drawShell(g, sh, s, tint);
    for (const st of this.stars) drawStar(g, st, s, tint);
    drawAirstone(g, this.airstone, s, tint);
  }

  // ---------- Cập nhật ----------
  update(dt, t, fish, emit) {
    const blend = 1 - Math.exp(-dt * 3);
    for (const w of [...this.weeds, ...this.front]) {
      let tgt = 0;
      for (const f of fish) {
        if (f.mode === 'dead') continue;
        const dx = w.x - f.x;
        const reach = f.Lv * 0.7 + 10;
        if (Math.abs(dx) < reach && f.y > w.y - w.h && f.y < w.y + 5) {
          const v = clamp(Math.hypot(f.vx, f.vy) / 60, 0.3, 1.5);
          tgt += Math.sign(dx || 1) * (1 - Math.abs(dx) / reach) * 0.45 * v;
        }
      }
      w.push += (clamp(tgt, -0.7, 0.7) - w.push) * blend;
    }
    // máy sủi khí
    const a = this.airstone;
    a.acc += dt * 7;
    while (a.acc > 1) { a.acc -= 1; emit(a.x + (Math.random() - 0.5) * 4 * this.s, a.y - 6 * this.s, 1, 0.5); }
    // sứa
    const H = this.scene.H, W = this.scene.W;
    for (const j of this.jellies) {
      const p = Math.sin(t * 1.4 + j.ph);
      j.y += (p > 0 ? -p * 16 : 7) * dt;
      j.x += j.vx * dt;
      if (j.y < this.scene.surfaceY + j.sz * 2) j.y = this.scene.surfaceY + j.sz * 2;
      if (j.y > H * 0.7) j.y = H * 0.7;
      if (j.x < -40) j.x = W + 40;
      if (j.x > W + 40) j.x = -40;
    }
    this.emit = emit;
  }

  // ---------- Vẽ động ----------
  drawJellies(ctx, t, pal) {
    const alpha = clamp(1 - pal.day * 1.3 + pal.dusk * 0.25, 0, 1) * 0.95;
    if (alpha < 0.02) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const j of this.jellies) {
      const pulse = 1 + 0.12 * Math.sin(t * 1.4 + j.ph);
      const bw = j.sz * pulse, bh = (j.sz * 0.75) / pulse;
      const col = j.hue ? [160, 120, 255] : [110, 230, 255];
      const gl = ctx.createRadialGradient(j.x, j.y - bh * 0.5, 0, j.x, j.y - bh * 0.5, j.sz * 2.6);
      gl.addColorStop(0, rgba(col, 0.25 * alpha)); gl.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(j.x, j.y - bh * 0.5, j.sz * 2.6, 0, TAU); ctx.fill();
      // xúc tu
      ctx.strokeStyle = rgba(col, 0.4 * alpha);
      ctx.lineWidth = 1;
      for (let k = 0; k < 7; k++) {
        const x0 = j.x + lerp(-bw * 0.8, bw * 0.8, k / 6);
        ctx.beginPath(); ctx.moveTo(x0, j.y);
        for (let i = 1; i <= 8; i++) {
          ctx.lineTo(x0 + Math.sin(t * 2 + k + i * 0.6) * j.sz * 0.14 * (i / 8), j.y + (j.sz * 2.6 * i) / 8);
        }
        ctx.stroke();
      }
      // tua miệng
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = rgba(mix(col, WHITE, 0.3), 0.45 * alpha);
      for (let k = -1; k <= 1; k += 2) {
        ctx.beginPath(); ctx.moveTo(j.x + k * bw * 0.2, j.y);
        ctx.bezierCurveTo(j.x + k * bw * 0.4 + Math.sin(t * 1.6) * 4, j.y + j.sz * 0.6, j.x - k * bw * 0.1, j.y + j.sz, j.x + k * bw * 0.25, j.y + j.sz * 1.5);
        ctx.stroke();
      }
      // chuông
      ctx.beginPath();
      ctx.moveTo(j.x - bw, j.y);
      ctx.bezierCurveTo(j.x - bw, j.y - bh * 1.5, j.x + bw, j.y - bh * 1.5, j.x + bw, j.y);
      for (let k = 6; k >= 0; k--) {
        const x = j.x + lerp(-bw, bw, k / 6);
        ctx.quadraticCurveTo(x + bw / 6, j.y + 3, x, j.y);
      }
      const bg = ctx.createRadialGradient(j.x, j.y - bh, 0, j.x, j.y - bh * 0.6, bw * 1.2);
      bg.addColorStop(0, rgba(mix(col, WHITE, 0.6), 0.55 * alpha));
      bg.addColorStop(1, rgba(col, 0.22 * alpha));
      ctx.fillStyle = bg; ctx.fill();
      ctx.strokeStyle = rgba(mix(col, WHITE, 0.5), 0.55 * alpha); ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = rgba([255, 160, 220], 0.4 * alpha); ctx.lineWidth = 1.4;
      for (let k = 0; k < 4; k++) {
        const a = Math.PI + (k + 0.5) * (Math.PI / 4);
        ctx.beginPath(); ctx.arc(j.x + Math.cos(a) * bw * 0.35, j.y - bh * 0.45 + Math.sin(a) * bh * 0.2, bw * 0.12, 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawBack(ctx, t, dt, pal, tint) {
    this.drawChest(ctx, t, dt, tint, pal);
    this.drawAnemone(ctx, t, tint, pal);
    for (const w of this.weeds) drawWeed(ctx, w, t, tint, this.s);
  }

  drawFront(ctx, t, tint) {
    for (const w of this.front) drawWeed(ctx, w, t, tint, this.s);
  }

  drawAnemone(ctx, t, tint, pal) {
    const a = this.anemone, s = a.s;
    const x = a.x, y = a.y + 2;
    const colW = 22 * s, colH = 18 * s;
    // thân
    const cg = ctx.createLinearGradient(x - colW, 0, x + colW, 0);
    cg.addColorStop(0, rgba(tint([200, 90, 120]))); cg.addColorStop(1, rgba(tint([130, 50, 80])));
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(x - colW * 0.8, y); ctx.quadraticCurveTo(x - colW * 0.9, y - colH, x - colW, y - colH);
    ctx.lineTo(x + colW, y - colH); ctx.quadraticCurveTo(x + colW * 0.9, y - colH, x + colW * 0.8, y);
    ctx.closePath(); ctx.fill();
    // xúc tu
    const top = y - colH;
    const n = 28;
    const glow = 1 - pal.day;
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const bx = x + lerp(-colW, colW, f);
      const base = lerp(-Math.PI * 0.92, -Math.PI * 0.08, f);
      const ang = base + Math.sin(t * 1.5 + i * 0.55) * 0.28;
      const len = (34 + Math.sin(i * 2.3) * 6) * s;
      const ex = bx + Math.cos(ang) * len, ey = top + Math.sin(ang) * len;
      const cx = bx + Math.cos(base) * len * 0.5 + Math.sin(t * 1.5 + i) * 5 * s, cy = top + Math.sin(base) * len * 0.5;
      ctx.strokeStyle = rgba(tint(i % 2 ? [236, 120, 200] : [212, 100, 220]));
      ctx.lineWidth = 4.2 * s;
      ctx.beginPath(); ctx.moveTo(bx, top); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
      ctx.fillStyle = rgba(mix(tint([255, 200, 245]), [255, 230, 255], glow * 0.6), 0.95);
      ctx.beginPath(); ctx.arc(ex, ey, 2.6 * s, 0, TAU); ctx.fill();
    }
    if (glow > 0.2) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(x, top - 20 * s, 0, x, top - 20 * s, 60 * s);
      gr.addColorStop(0, `rgba(255,120,230,${0.18 * glow})`); gr.addColorStop(1, 'rgba(255,120,230,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, top - 20 * s, 60 * s, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  drawChest(ctx, t, dt, tint, pal) {
    const c = this.chest, s = c.s;
    const w = 76 * s, h = 40 * s;
    const x = c.x - w / 2, y = c.y - h + 8 * s;
    const P = 11, cyc = t % P;
    let open = 0;
    if (cyc > 7 && cyc < 10) open = cyc < 7.6 ? (cyc - 7) / 0.6 : cyc > 9.4 ? (10 - cyc) / 0.6 : 1;
    open = easeOut(clamp(open, 0, 1));
    const idx = Math.floor(t / P);
    if (open > 0.6 && c.emitted !== idx) { c.emitted = idx; this.emit?.(c.x, y, 16, 1.2); }
    if (open > 0.35 && Math.random() < dt * 8) this.emit?.(c.x + (Math.random() - 0.5) * w * 0.6, y, 1, 1);

    const wood = tint([136, 80, 38]), woodD = tint([84, 46, 20]), gold = tint([232, 186, 70], 0.12);
    // ánh vàng trong rương
    if (open > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(c.x, y, 0, c.x, y, w);
      gr.addColorStop(0, `rgba(255,214,110,${0.4 * open})`); gr.addColorStop(1, 'rgba(255,214,110,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(c.x, y, w, 0, TAU); ctx.fill();
      ctx.restore();
      // đồng xu
      for (let i = 0; i < 9; i++) {
        const cx = x + w * (0.15 + 0.7 * ((i * 0.37) % 1)), cy = y + 2 * s - (i % 3) * 3 * s;
        ctx.fillStyle = rgba(mix(gold, WHITE, (i % 3) * 0.12));
        ctx.beginPath(); ctx.ellipse(cx, cy, 6 * s, 3 * s, 0, 0, TAU); ctx.fill();
      }
      const sp = (Math.sin(t * 9) * 0.5 + 0.5) * open;
      star4(ctx, c.x - w * 0.15, y - 6 * s, 6 * s * sp, `rgba(255,255,220,${sp})`);
      star4(ctx, c.x + w * 0.2, y - 3 * s, 4 * s * (1 - sp * 0.5) * open, `rgba(255,255,220,${open * 0.8})`);
    }
    // thân rương
    const bg = ctx.createLinearGradient(0, y, 0, y + h);
    bg.addColorStop(0, rgba(wood)); bg.addColorStop(1, rgba(woodD));
    ctx.fillStyle = bg;
    roundRect(ctx, x, y, w, h, 3 * s); ctx.fill();
    ctx.strokeStyle = rgba(woodD, 0.8); ctx.lineWidth = 1;
    for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + 2, y + (h * k) / 3); ctx.lineTo(x + w - 2, y + (h * k) / 3); ctx.stroke(); }
    ctx.fillStyle = rgba(gold);
    ctx.fillRect(x + w * 0.1, y, w * 0.08, h);
    ctx.fillRect(x + w * 0.82, y, w * 0.08, h);
    ctx.fillRect(c.x - 6 * s, y - 1, 12 * s, 13 * s);
    ctx.fillStyle = rgba(woodD);
    ctx.beginPath(); ctx.arc(c.x, y + 5 * s, 2 * s, 0, TAU); ctx.fill();
    ctx.fillRect(c.x - 0.8 * s, y + 5 * s, 1.6 * s, 4 * s);
    // nắp (bản lề phía sau, bên phải)
    ctx.save();
    ctx.translate(x + w, y);
    ctx.rotate(open * 0.85);
    const lid = new Path2D();
    lid.moveTo(-w, 0); lid.lineTo(-w, -h * 0.22);
    lid.quadraticCurveTo(-w / 2, -h * 0.85, 0, -h * 0.22); lid.lineTo(0, 0); lid.closePath();
    const lg = ctx.createLinearGradient(0, -h * 0.7, 0, 0);
    lg.addColorStop(0, rgba(mix(wood, WHITE, 0.08))); lg.addColorStop(1, rgba(wood));
    ctx.fillStyle = lg; ctx.fill(lid);
    ctx.save(); ctx.clip(lid);
    ctx.fillStyle = rgba(gold);
    ctx.fillRect(-w * 0.9, -h, w * 0.08, h); ctx.fillRect(-w * 0.18, -h, w * 0.08, h);
    ctx.restore();
    ctx.strokeStyle = rgba(woodD); ctx.lineWidth = 1.2; ctx.stroke(lid);
    ctx.restore();
    // cát vùi
    ctx.fillStyle = rgba(tint([226, 204, 156], 0.18));
    ctx.beginPath(); ctx.ellipse(c.x, y + h + 1, w * 0.62, 6 * s, 0, 0, TAU); ctx.fill();
  }
}

// ---------- Hàm vẽ phụ ----------
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function star4(ctx, x, y, r, col) {
  if (r <= 0.3) return;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
}

function ribbon(ctx, pts, w0, w1, wavy) {
  const n = pts.length, Lp = [], Rp = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    const f = i / (n - 1);
    const w = lerp(w0, w1, f) * (wavy ? 0.82 + 0.18 * Math.sin(i * 1.9) : 1) * (i === n - 1 ? 0.25 : 1);
    Lp.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    Rp.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  ctx.beginPath();
  ctx.moveTo(Lp[0][0], Lp[0][1]);
  for (let i = 1; i < n; i++) ctx.quadraticCurveTo(Lp[i - 1][0], Lp[i - 1][1], (Lp[i - 1][0] + Lp[i][0]) / 2, (Lp[i - 1][1] + Lp[i][1]) / 2);
  ctx.lineTo(Lp[n - 1][0], Lp[n - 1][1]);
  ctx.lineTo(Rp[n - 1][0], Rp[n - 1][1]);
  for (let i = n - 2; i >= 0; i--) ctx.quadraticCurveTo(Rp[i + 1][0], Rp[i + 1][1], (Rp[i + 1][0] + Rp[i][0]) / 2, (Rp[i + 1][1] + Rp[i][1]) / 2);
  ctx.lineTo(Rp[0][0], Rp[0][1]);
  ctx.closePath();
}

function stemPts(x, y, n, seg, t, sp, ph, lean, push, amp = 0.12) {
  let ang = -Math.PI / 2, px = x, py = y;
  const pts = [[px, py]];
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    ang = -Math.PI / 2 + lean * f + Math.sin(t * sp + ph - i * 0.45) * amp * f * 2 + push * f;
    px += Math.cos(ang) * seg; py += Math.sin(ang) * seg;
    pts.push([px, py]);
  }
  return pts;
}

function drawWeed(ctx, w, t, tint, s) {
  const c0 = tint(w.cols[0], w.front ? 0.08 : 0.2), c1 = tint(w.cols[1], w.front ? 0.08 : 0.2);
  if (w.type === 'grass') {
    for (const b of w.blades) {
      const pts = stemPts(w.x + b.dx, w.y, 10, (w.h * b.hk) / 10, t, w.sp * 1.2, b.ph, w.lean + b.lean * 0.3, w.push, 0.16);
      const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[10][0], pts[10][1]);
      g.addColorStop(0, rgba(c0)); g.addColorStop(1, rgba(c1));
      ctx.fillStyle = g;
      ribbon(ctx, pts, 2.6 * s, 1.2 * s, false);
      ctx.fill();
    }
    return;
  }
  const pts = stemPts(w.x, w.y, w.n, w.seg, t, w.sp, w.ph, w.lean, w.push);
  const end = pts[pts.length - 1];
  const g = ctx.createLinearGradient(w.x, w.y, end[0], end[1]);
  g.addColorStop(0, rgba(c0)); g.addColorStop(1, rgba(c1));
  if (w.type === 'kelp') {
    ctx.fillStyle = g;
    ribbon(ctx, pts, 10 * s, 5 * s, true);
    ctx.fill();
    ctx.strokeStyle = rgba(mix(c1, WHITE, 0.25), 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts) ctx.lineTo(p[0], p[1]);
    ctx.stroke();
    ctx.fillStyle = rgba(mix(c1, [200, 190, 80], 0.4));
    for (let i = 4; i < pts.length - 1; i += 4) { ctx.beginPath(); ctx.arc(pts[i][0] + 6 * s, pts[i][1], 3 * s, 0, TAU); ctx.fill(); }
  } else {
    // leafy: thân + lá oval so le
    ctx.strokeStyle = rgba(c0); ctx.lineWidth = 2.4 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts) ctx.lineTo(p[0], p[1]);
    ctx.stroke();
    for (let i = 2; i < pts.length; i += 1) {
      const p = pts[i], q = pts[i - 1];
      const a = Math.atan2(p[1] - q[1], p[0] - q[0]) + (i % 2 ? 0.9 : -0.9);
      const f = i / pts.length;
      const L = (9 - f * 3) * s;
      ctx.fillStyle = rgba(mix(c0, c1, f));
      ctx.beginPath();
      ctx.ellipse(p[0] + Math.cos(a) * L * 0.8, p[1] + Math.sin(a) * L * 0.8, L, L * 0.42, a, 0, TAU);
      ctx.fill();
    }
  }
}

function drawRock(g, rk, s, tint) {
  const r = mulberry(rk.seed * 31);
  const n = 16, pts = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (Math.PI * i) / n;
    const rr = 1 + (r() - 0.5) * 0.28;
    pts.push([rk.x + Math.cos(a) * (rk.w / 2) * rr, rk.y + 6 + Math.sin(a) * rk.h * rr]);
  }
  const p = new Path2D();
  p.moveTo(rk.x - rk.w / 2, rk.y + 14);
  p.lineTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.quadraticCurveTo(pts[i - 1][0], pts[i - 1][1], (pts[i - 1][0] + pts[i][0]) / 2, (pts[i - 1][1] + pts[i][1]) / 2);
  p.lineTo(pts[n][0], pts[n][1]);
  p.lineTo(rk.x + rk.w / 2, rk.y + 14);
  p.closePath();
  const gr = g.createLinearGradient(rk.x - rk.w * 0.3, rk.y - rk.h, rk.x + rk.w * 0.35, rk.y + 6);
  gr.addColorStop(0, rgba(tint(mix(rk.col, WHITE, 0.25))));
  gr.addColorStop(0.55, rgba(tint(rk.col)));
  gr.addColorStop(1, rgba(tint(mix(rk.col, BLACK, 0.45))));
  g.fillStyle = gr; g.fill(p);
  g.save(); g.clip(p);
  for (let i = 0; i < 40; i++) {
    const x = rk.x + (r() - 0.5) * rk.w, y = rk.y + 6 - r() * rk.h;
    g.fillStyle = r() < 0.6 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
    g.beginPath(); g.arc(x, y, (1 + r() * 3.5) * s, 0, TAU); g.fill();
  }
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const x = rk.x + (r() - 0.5) * rk.w * 0.6, y = rk.y - r() * rk.h * 0.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 18 * s, y + 10 * s); g.lineTo(x + (r() - 0.5) * 18 * s, y + 18 * s); g.stroke();
  }
  // bóng tối chân đá
  const sh = g.createLinearGradient(0, rk.y - rk.h * 0.3, 0, rk.y + 8);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,10,20,0.35)');
  g.fillStyle = sh; g.fillRect(rk.x - rk.w, rk.y - rk.h, rk.w * 2, rk.h + 20);
  g.restore();
  // rêu
  for (let i = 0; i < 26; i++) {
    const k = 2 + ((r() * (n - 4)) | 0);
    const [px, py] = pts[k];
    const mx = px + (r() - 0.5) * 8 * s, my = py + r() * 6 * s;
    g.fillStyle = rgba(tint(r() < 0.5 ? [70, 140, 70] : [110, 170, 80]), 0.85);
    g.beginPath(); g.arc(mx, my, (2.5 + r() * 4.5) * s, 0, TAU); g.fill();
  }
  g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 2;
  g.beginPath();
  for (let i = 2; i < n / 2; i++) i === 2 ? g.moveTo(pts[i][0], pts[i][1] + 2) : g.lineTo(pts[i][0], pts[i][1] + 2);
  g.stroke();
}

function drawCastle(g, c, tint, pal) {
  const s = c.s * 1.1;
  const x = c.x, y = c.y + 6 * s;
  const stone = [176, 166, 152], dark = [112, 104, 96];
  const night = 1 - pal.day;
  const block = (x0, y0, w, h, crenel) => {
    const gr = g.createLinearGradient(x0, 0, x0 + w, 0);
    gr.addColorStop(0, rgba(tint(mix(stone, WHITE, 0.15))));
    gr.addColorStop(0.55, rgba(tint(stone)));
    gr.addColorStop(1, rgba(tint(dark)));
    g.fillStyle = gr;
    g.fillRect(x0, y0, w, h);
    if (crenel) {
      const mw = w / 7;
      for (let k = 0; k < 7; k += 2) g.fillRect(x0 + k * mw, y0 - 6 * s, mw, 6 * s);
    }
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    g.strokeStyle = rgba(tint(dark), 0.5); g.lineWidth = 0.8;
    const bh = 7 * s;
    let row = 0;
    for (let yy = y0 + bh; yy < y0 + h; yy += bh, row++) {
      g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + w, yy); g.stroke();
      for (let xx = x0 + (row % 2 ? 6 * s : 0); xx < x0 + w; xx += 12 * s) { g.beginPath(); g.moveTo(xx, yy - bh); g.lineTo(xx, yy); g.stroke(); }
    }
    g.restore();
  };
  const roof = (cx, top, w) => {
    const gr = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    gr.addColorStop(0, rgba(tint([196, 92, 80]))); gr.addColorStop(1, rgba(tint([128, 52, 48])));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(cx - w / 2 - 3 * s, top); g.lineTo(cx, top - w * 1.1); g.lineTo(cx + w / 2 + 3 * s, top); g.closePath(); g.fill();
    g.strokeStyle = rgba(tint([90, 40, 36]), 0.6); g.lineWidth = 0.8;
    for (let k = 1; k < 4; k++) { const yy = top - (w * 1.1 * k) / 4; const hw = (w / 2 + 3 * s) * (1 - k / 4); g.beginPath(); g.moveTo(cx - hw, yy); g.lineTo(cx + hw, yy); g.stroke(); }
  };
  const win = (cx, cy, w, h) => {
    g.fillStyle = night > 0.3 ? `rgba(255,${190 + night * 30},110,${0.6 + night * 0.4})` : rgba(tint([28, 34, 46], 0.1));
    g.beginPath(); g.moveTo(cx - w / 2, cy + h / 2); g.lineTo(cx - w / 2, cy - h / 2 + w / 2); g.arc(cx, cy - h / 2 + w / 2, w / 2, Math.PI, 0); g.lineTo(cx + w / 2, cy + h / 2); g.closePath(); g.fill();
    if (night > 0.3) {
      const gl = g.createRadialGradient(cx, cy, 0, cx, cy, w * 3);
      gl.addColorStop(0, `rgba(255,200,110,${0.3 * night})`); gl.addColorStop(1, 'rgba(255,200,110,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(cx, cy, w * 3, 0, TAU); g.fill();
    }
  };
  block(x - 17 * s, y - 135 * s, 34 * s, 135 * s, true);
  block(x - 55 * s, y - 70 * s, 110 * s, 70 * s, true);
  block(x - 64 * s, y - 108 * s, 30 * s, 108 * s, false);
  block(x + 34 * s, y - 98 * s, 30 * s, 98 * s, false);
  roof(x - 49 * s, y - 108 * s, 30 * s);
  roof(x + 49 * s, y - 98 * s, 30 * s);
  win(x, y - 112 * s, 7 * s, 13 * s);
  win(x - 49 * s, y - 85 * s, 6 * s, 11 * s);
  win(x + 49 * s, y - 75 * s, 6 * s, 11 * s);
  win(x - 30 * s, y - 45 * s, 6 * s, 10 * s);
  win(x + 30 * s, y - 45 * s, 6 * s, 10 * s);
  // cổng
  g.fillStyle = 'rgba(14,20,30,0.95)';
  g.beginPath(); g.moveTo(x - 13 * s, y); g.lineTo(x - 13 * s, y - 21 * s); g.arc(x, y - 21 * s, 13 * s, Math.PI, 0); g.lineTo(x + 13 * s, y); g.closePath(); g.fill();
  g.strokeStyle = rgba(tint(mix(stone, WHITE, 0.2))); g.lineWidth = 2 * s; g.stroke();
  // rêu chân lâu đài
  const r = mulberry(55);
  for (let i = 0; i < 30; i++) {
    const mx = x + (r() - 0.5) * 130 * s, my = y - r() * 16 * s;
    g.fillStyle = rgba(tint(r() < 0.5 ? [64, 132, 70] : [104, 160, 76]), 0.8);
    g.beginPath(); g.arc(mx, my, (2 + r() * 4) * s, 0, TAU); g.fill();
  }
}

function drawCoral(g, c, s, tint) {
  const r = mulberry(c.seed * 13);
  const base = c.col;
  g.lineCap = 'round';
  if (c.type === 'branch') {
    const rec = (x, y, a, len, w, d) => {
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      const cx = (x + x2) / 2 + (r() - 0.5) * len * 0.35, cy = (y + y2) / 2;
      g.strokeStyle = rgba(tint(mix(base, WHITE, (3 - d) * 0.07)));
      g.lineWidth = w;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(cx, cy, x2, y2); g.stroke();
      if (d > 0) {
        const k = r() < 0.4 ? 3 : 2;
        for (let i = 0; i < k; i++) rec(x2, y2, a + (i - (k - 1) / 2) * 0.6 + (r() - 0.5) * 0.4, len * (0.66 + r() * 0.14), w * 0.72, d - 1);
      } else {
        g.fillStyle = rgba(tint(mix(base, WHITE, 0.5)));
        g.beginPath(); g.arc(x2, y2, w * 0.8, 0, TAU); g.fill();
      }
    };
    for (let i = 0; i < 3; i++) rec(c.x + (i - 1) * 9 * s, c.y + 6, -Math.PI / 2 + (i - 1) * 0.38, 34 * s * c.size, 7 * s * c.size, 3);
  } else if (c.type === 'fan') {
    const R = 74 * s * c.size, cx = c.x, cy = c.y + 4;
    const spokes = [];
    for (let i = 0; i < 24; i++) {
      const a = -Math.PI + 0.3 + ((Math.PI - 0.6) * i) / 23;
      const pts = [];
      for (let j = 0; j <= 6; j++) {
        const rr = (R * j) / 6 * (0.86 + 0.14 * Math.sin(i * 1.3 + j));
        const aa = a + Math.sin(j * 1.7 + i) * 0.035;
        pts.push([cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr * 0.92]);
      }
      spokes.push(pts);
    }
    g.strokeStyle = rgba(tint(base), 0.9);
    for (const pts of spokes) {
      g.lineWidth = 2 * s;
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts) g.lineTo(p[0], p[1]);
      g.stroke();
    }
    g.strokeStyle = rgba(tint(mix(base, WHITE, 0.25)), 0.65);
    g.lineWidth = 0.9 * s;
    for (let j = 2; j <= 6; j++) {
      g.beginPath();
      spokes.forEach((pts, i) => (i ? g.lineTo(pts[j][0], pts[j][1]) : g.moveTo(pts[j][0], pts[j][1])));
      g.stroke();
    }
    g.strokeStyle = rgba(tint(mix(base, BLACK, 0.3)));
    g.lineWidth = 6 * s;
    g.beginPath(); g.moveTo(cx, cy + 4); g.lineTo(cx, cy - 10 * s); g.stroke();
  } else if (c.type === 'brain') {
    const rx = 42 * s * c.size, ry = 30 * s * c.size, cx = c.x, cy = c.y + 6;
    const dome = new Path2D(); dome.ellipse(cx, cy, rx, ry, 0, Math.PI, TAU); dome.closePath();
    const gr = g.createRadialGradient(cx - rx * 0.3, cy - ry * 0.7, 0, cx, cy - ry * 0.3, rx * 1.2);
    gr.addColorStop(0, rgba(tint(mix(base, WHITE, 0.3)))); gr.addColorStop(1, rgba(tint(mix(base, BLACK, 0.3))));
    g.fillStyle = gr; g.fill(dome);
    g.save(); g.clip(dome);
    g.strokeStyle = rgba(tint(mix(base, BLACK, 0.35)), 0.6); g.lineWidth = 1.5 * s;
    for (let j = 0; j < 9; j++) {
      const yy = cy - ry + j * 4.2 * s;
      g.beginPath();
      for (let xx = cx - rx; xx <= cx + rx; xx += 2) {
        const yv = yy + Math.sin(xx * 0.35 + j * 1.3) * 2.2 * s;
        xx === cx - rx ? g.moveTo(xx, yv) : g.lineTo(xx, yv);
      }
      g.stroke();
    }
    g.restore();
  } else if (c.type === 'tube') {
    for (let i = 0; i < 6; i++) {
      const tx = c.x + (i - 2.5) * 9 * s + (r() - 0.5) * 4 * s;
      const th = (22 + r() * 26) * s, tw = 8 * s;
      const col = tint(mix(base, [255, 140, 60], r() * 0.6));
      const gr = g.createLinearGradient(tx - tw / 2, 0, tx + tw / 2, 0);
      gr.addColorStop(0, rgba(mix(col, WHITE, 0.2))); gr.addColorStop(1, rgba(mix(col, BLACK, 0.3)));
      g.fillStyle = gr;
      roundRect(g, tx - tw / 2, c.y + 6 - th, tw, th, 3 * s); g.fill();
      g.fillStyle = rgba(tint([110, 30, 30], 0.1));
      g.beginPath(); g.ellipse(tx, c.y + 6 - th, tw / 2, tw / 4.5, 0, 0, TAU); g.fill();
      g.strokeStyle = rgba(mix(col, WHITE, 0.4)); g.lineWidth = 1; g.stroke();
    }
  }
}

function drawShell(g, sh, s, tint) {
  g.save();
  g.translate(sh.x, sh.y + 6 * s);
  g.rotate(sh.rot);
  const R = 12 * s;
  if (sh.kind === 0) {
    const col = tint([250, 214, 206], 0.12);
    g.fillStyle = rgba(col);
    g.beginPath(); g.moveTo(0, 2 * s);
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI + (Math.PI * i) / 8;
      g.lineTo(Math.cos(a) * R + Math.cos(a) * 1.5 * s * (i % 2), Math.sin(a) * R * 0.9);
    }
    g.closePath(); g.fill();
    g.strokeStyle = rgba(mix(col, BLACK, 0.25)); g.lineWidth = 0.8;
    for (let i = 1; i < 8; i++) { const a = Math.PI + (Math.PI * i) / 8; g.beginPath(); g.moveTo(0, 2 * s); g.lineTo(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.86); g.stroke(); }
  } else {
    const col = tint([236, 220, 190], 0.12);
    g.fillStyle = rgba(col);
    g.beginPath(); g.ellipse(0, -R * 0.3, R * 0.9, R * 0.55, -0.3, 0, TAU); g.fill();
    g.strokeStyle = rgba(mix(col, [150, 110, 80], 0.5)); g.lineWidth = 1.1;
    g.beginPath();
    for (let a = 0; a < TAU * 2.2; a += 0.2) { const rr = R * 0.08 * a; const px = Math.cos(a) * rr * 0.9, py = -R * 0.3 + Math.sin(a) * rr * 0.55; a ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.stroke();
  }
  g.restore();
}

function drawStar(g, st, s, tint) {
  g.save();
  g.translate(st.x, st.y + 8 * s);
  g.scale(1, 0.55);
  g.rotate(st.rot);
  const R = 16 * s, r = 6 * s;
  const col = tint([236, 96, 60], 0.12);
  g.fillStyle = rgba(col);
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r : R;
    i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath(); g.lineJoin = 'round'; g.lineWidth = 3 * s; g.strokeStyle = rgba(col); g.stroke(); g.fill();
  g.fillStyle = rgba(mix(col, WHITE, 0.45));
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(Math.cos(a) * R * 0.25 * k, Math.sin(a) * R * 0.25 * k, 1.1 * s, 0, TAU); g.fill(); }
  }
  g.restore();
}

function drawAirstone(g, a, s, tint) {
  const col = tint([150, 150, 160]);
  g.fillStyle = rgba(col);
  g.beginPath(); g.ellipse(a.x, a.y - 2 * s, 12 * s, 6 * s, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(a.x - 8 * s + i * 2.3 * s, a.y - 3 * s + (i % 2) * 2 * s, 0.9 * s, 0, TAU); g.fill(); }
  g.strokeStyle = rgba(tint([60, 70, 80]), 0.7); g.lineWidth = 1.5 * s;
  g.beginPath(); g.moveTo(a.x + 12 * s, a.y - 2 * s); g.quadraticCurveTo(a.x + 30 * s, a.y, a.x + 40 * s, a.y + 6 * s); g.stroke();
}
