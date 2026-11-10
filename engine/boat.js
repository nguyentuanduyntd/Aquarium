// Thuyền câu: trôi qua lại trên mặt nước, có ông lão ngồi câu.
// Người dùng kéo lưỡi câu chạm vào cá → cá cắn câu → (xác nhận) → kéo lên thuyền & đóng tab.
import { clamp, lerp, rand, TAU } from './util.js';

const MOUTH_T = 1.15; // góc nghiêng (rad) của cá khi bị treo trên lưỡi câu

// Thân thuyền (toạ độ cục bộ, mũi thuyền hướng sang phải, gốc = mép nước)
const HULL = new Path2D();
HULL.moveTo(-53, -15);
HULL.lineTo(54, -17);
HULL.quadraticCurveTo(60, -18, 63, -25);
HULL.quadraticCurveTo(57, 6, 34, 9);
HULL.lineTo(-36, 9);
HULL.quadraticCurveTo(-52, 6, -56, -10);
HULL.closePath();

export class Boat {
  constructor() {
    this.x = -1; this.dir = 1; this.dirVis = 1;
    this.speed = 0; this.pauseT = rand(8, 14); this.restT = 0;
    this.mode = 'idle'; // idle | drag | hooked | reel | toss | cheer
    this.hook = { x: 0, y: 0, vx: 0, vy: 0 };
    this.fish = null; this.grip = null;
    this.caught = 0; this.timer = 0; this.tension = 0; this.lean = 0; this.reelT = 0;
    this.tip = { x: 0, y: 0 }; this.by = 0; this.tilt = 0; this.s = 1;
    this.onBite = null; this.onLand = null; this.sfx = null;
  }

  get dragging() { return this.mode === 'drag'; }
  get busy() { return this.mode === 'hooked' || this.mode === 'reel' || this.mode === 'toss'; }

  bounds(w) {
    const m = 75 * this.s + 8;
    let lo = m, hi = w.W - (w.rightInset || 0) - m;
    // tránh chui dưới các khung HUD ở mép trên
    if (w.boatLane) { lo = Math.max(lo, w.boatLane[0] + m); hi = Math.min(hi, w.boatLane[1] - m); }
    return [lo, Math.max(lo, hi)];
  }

  layout(w) {
    this.s = clamp(w.surfaceY / 80, 0.55, 1.25);
    const [l, r] = this.bounds(w);
    const first = this.x < 0;
    this.x = first ? lerp(l, r, 0.3) : clamp(this.x, l, r);
    this.pose(w);
    if (first || this.mode === 'idle') {
      this.hook.x = this.tip.x; this.hook.y = w.surfaceY + this.restDepth(w);
      this.hook.vx = this.hook.vy = 0;
    }
  }

  restDepth(w) { return clamp(w.H * 0.17, 40, 150); }

  toWorld(lx, ly) {
    const s = this.s, c = Math.cos(this.tilt), sn = Math.sin(this.tilt);
    const x = lx * this.dirVis * s, y = ly * s;
    return [this.x + x * c - y * sn, this.by + x * sn + y * c];
  }

  // toạ độ đầu cần (cục bộ) – cần cong xuống khi dây căng
  tipLocal() { return [66 - this.tension * 5, -58 + this.tension * 13]; }

  pose(w) {
    const sc = w.scene, t = w.t;
    const rock = this.busy ? Math.sin(t * 9) * 0.035 : 0;
    this.by = sc.wave(this.x, t) + 3 * this.s;
    this.tilt = Math.atan2(sc.wave(this.x + 30, t) - sc.wave(this.x - 30, t), 60) * 0.8 + rock;
    const [tx, ty] = this.tipLocal();
    [this.tip.x, this.tip.y] = this.toWorld(tx, ty);
  }

  // điểm nhọn của lưỡi câu (chỗ cá cắn)
  point() { return [this.hook.x - 3 * this.s, this.hook.y + 8 * this.s]; }

  near(x, y) {
    if (this.mode !== 'idle' && this.mode !== 'cheer') return false;
    const h = this.hook;
    return Math.hypot(x - h.x, y - (h.y + 3 * this.s)) < 20;
  }

  grab(x, y) {
    if (!this.near(x, y)) return false;
    this.mode = 'drag';
    this.dragTo(x, y);
    return true;
  }

  dragTo(x, y, w) {
    if (this.mode !== 'drag') return;
    const h = this.hook;
    const nx = w ? clamp(x, 4, w.W - 4) : x;
    const ny = w ? clamp(y, w.surfaceY - 30, w.floorAt(nx) - 6) : y;
    h.vx = (nx - h.x) * 20; h.vy = (ny - h.y) * 20;
    h.x = nx; h.y = ny;
  }

  drop() {
    if (this.mode !== 'drag') return;
    this.mode = 'idle';
    this.hook.vx *= 0.3; this.hook.vy *= 0.3;
  }

  findFish(w) {
    const [px, py] = this.point();
    for (let i = w.fish.length - 1; i >= 0; i--) {
      const f = w.fish[i];
      if (f.netted || f.mode === 'leave' || f.mode === 'netting' || f.mode === 'enter') continue;
      if (f.hit(px, py)) return f;
    }
    return null;
  }

  bite(f, w) {
    const h = this.hook;
    this.fish = f; this.mode = 'hooked';
    this.grip = [h.x, h.y];
    f.netted = true; f.wasDead = f.mode === 'dead'; f.mode = 'netting';
    f.vx = f.vy = 0;
    for (let i = 0; i < 8; i++) w.parts.bubble(h.x + rand(-8, 8), h.y + rand(-6, 6), rand(1.2, 3), 1.4);
    w.parts.ripple(h.x, h.y, 40, 1);
    this.onBite?.(f);
  }

  // gọi sau khi người dùng đồng ý
  reel() {
    if (this.mode !== 'hooked' || !this.fish) return;
    this.mode = 'reel'; this.reelT = 0;
  }

  // gọi khi người dùng hủy: thả cá ra
  release(w) {
    const f = this.fish;
    this.fish = null;
    if (this.busy) this.mode = 'idle';
    if (!f) return;
    f.netted = false;
    f.mode = 'swim';
    f.startle = 1.2;
    f.vx = -f.face * w.baseSpeed * 2.5;
    f.vy = w.baseSpeed;
    for (let i = 0; i < 5; i++) w.parts.bubble(f.x + rand(-8, 8), f.y, rand(1.2, 2.6), 1.3);
  }

  // treo cá vào lưỡi câu, miệng ngậm vào điểm nhọn
  hang(f, wig) {
    const [px, py] = this.point();
    const L = f.Lv, face = f.face >= 0 ? 1 : -1, T = MOUTH_T + wig;
    f.faceVis = face;
    f.tilt = -T; // Fish.draw xoay theo hướng nhìn → luôn ngóc đầu lên
    f.x = px - face * 0.46 * L * Math.cos(T);
    f.y = py + 0.46 * L * Math.sin(T);
    f.vx = f.vy = 0;
  }

  update(dt, w) {
    if (!w.W || this.x < 0) return;
    const s = this.s, S = w.surfaceY, h = this.hook, t = w.t;
    const prevY = h.y;

    // --- di chuyển thuyền ---
    let want = 0;
    if (this.mode === 'idle') {
      if (this.restT > 0) this.restT -= dt;
      else {
        want = 26 * s * (w.reduced ? 0.6 : 1);
        this.pauseT -= dt;
        if (this.pauseT < 0) { this.restT = rand(4, 8); this.pauseT = rand(10, 20); }
      }
    }
    this.speed += (want - this.speed) * (1 - Math.exp(-dt * 1.2));
    this.x += this.dir * this.speed * dt;
    const [l, r] = this.bounds(w);
    if (this.x > r) { this.x = r; this.dir = -1; }
    if (this.x < l) { this.x = l; this.dir = 1; }
    this.dirVis += (this.dir - this.dirVis) * (1 - Math.exp(-dt * 2.5));
    if (this.speed > 5 && Math.random() < dt * 1.2) w.parts.ripple(this.x - this.dir * 50 * s, S + 2, 26);

    const tense = this.mode === 'drag' || this.busy;
    this.tension += ((tense ? 1 : 0) - this.tension) * (1 - Math.exp(-dt * 6));
    const leanT = this.mode === 'hooked' || this.mode === 'reel' ? 1 : 0;
    this.lean += (leanT - this.lean) * (1 - Math.exp(-dt * 5));
    this.pose(w);
    const tip = this.tip;

    // --- lưỡi câu ---
    switch (this.mode) {
      case 'idle':
      case 'cheer': {
        const tx = tip.x, ty = S + this.restDepth(w) + Math.sin(t * 0.8) * 6;
        h.vx += ((tx - h.x) * 5 - h.vx * 2.2) * dt;
        h.vy += ((ty - h.y) * 5 - h.vy * 2.2) * dt;
        h.x += h.vx * dt; h.y += h.vy * dt;
        if (this.mode === 'cheer' && (this.timer -= dt) <= 0) this.mode = 'idle';
        if (h.y > S && Math.random() < dt * 0.3) w.parts.bubble(h.x - 3 * s, h.y + 8 * s, rand(1, 1.8), 0.8);
        break;
      }
      case 'drag': {
        const f = this.findFish(w);
        if (f) this.bite(f, w);
        break;
      }
      case 'hooked': {
        // cá giãy giụa, kéo lưỡi câu lắc qua lại
        h.x = this.grip[0] + Math.sin(t * 13) * 3 * s;
        h.y = this.grip[1] + Math.sin(t * 9.5) * 2 * s;
        break;
      }
      case 'reel': {
        this.reelT += dt;
        const dx = tip.x - h.x, dy = tip.y + 4 * s - h.y, d = Math.hypot(dx, dy);
        const v = Math.min(d, (90 + this.reelT * 300) * s * dt);
        if (d > 0.01) { h.x += (dx / d) * v + Math.sin(t * 14) * 0.6; h.y += (dy / d) * v; }
        if (d < 3 * s + 1) {
          this.mode = 'toss'; this.timer = 0;
          this.tossFrom = [this.fish.x, this.fish.y];
          this.tossL = this.fish.Lv;
        }
        break;
      }
      case 'toss': {
        // cá bay vòng vào xô trên thuyền
        this.timer += dt;
        const k = Math.min(1, this.timer / 0.55);
        h.x = tip.x; h.y = tip.y + 4 * s;
        const f = this.fish;
        const [bx, by] = this.toWorld(24, -22);
        const [x0, y0] = this.tossFrom;
        const cx = (x0 + bx) / 2, cy = Math.min(y0, by) - 40 * s;
        const u = 1 - k;
        f.x = u * u * x0 + 2 * u * k * cx + k * k * bx;
        f.y = u * u * y0 + 2 * u * k * cy + k * k * by;
        f.Lv = this.tossL * (1 - 0.65 * k);
        f.tilt = -MOUTH_T - k * 3;
        if (k >= 1) {
          this.fish = null; this.caught++;
          this.mode = 'cheer'; this.timer = 1.6;
          h.vx = 0; h.vy = 30;
          this.onLand?.(f);
        }
        break;
      }
    }

    // cá treo theo lưỡi câu
    if (this.fish && (this.mode === 'hooked' || this.mode === 'reel')) {
      const f = this.fish;
      f.phase += dt * 14;
      this.hang(f, Math.sin(t * 12 + f.seed) * (this.mode === 'reel' ? 0.3 : 0.22));
    }

    // vụt qua mặt nước → bắn nước
    if (this.mode !== 'drag' && (prevY < S) !== (h.y < S) && Math.abs(h.y - prevY) > 0.5) {
      if (this.fish) { w.parts.splash(h.x, S); this.sfx?.plop(0.7); }
      else w.parts.ripple(h.x, S + 2, 24);
    }
  }

  draw(ctx, w) {
    if (!w.W || this.x < 0) return;
    const s = this.s, t = w.t;
    ctx.save();
    if (w.night > 0.05) ctx.filter = `brightness(${(1 - w.night * 0.45).toFixed(2)})`;

    // bóng thuyền dưới nước
    ctx.fillStyle = 'rgba(0,20,40,0.16)';
    ctx.beginPath(); ctx.ellipse(this.x, this.by + 16 * s, 52 * s, 5 * s, 0, 0, TAU); ctx.fill();

    this.drawLine(ctx);

    ctx.save();
    ctx.translate(this.x, this.by);
    ctx.rotate(this.tilt);
    ctx.scale(this.dirVis * s, s);
    this.drawLocal(ctx, w);
    ctx.restore();

    this.drawHook(ctx, w);
    ctx.restore();
  }

  drawLine(ctx) {
    const h = this.hook, tp = this.tip, s = this.s;
    const sag = (1 - this.tension) * 10 * s;
    ctx.strokeStyle = 'rgba(235,242,248,0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tp.x, tp.y);
    ctx.quadraticCurveTo((tp.x + h.x) / 2 + sag * this.dir * 0.6, (tp.y + h.y) / 2 + sag, h.x, h.y - 3 * s);
    ctx.stroke();
  }

  drawLocal(ctx, w) {
    const t = w.t, lean = this.lean;
    const hip = [-24, -16], ang = -0.2 * lean;
    const rot = (x, y) => [hip[0] + x * Math.cos(ang) - y * Math.sin(ang), hip[1] + x * Math.sin(ang) + y * Math.cos(ang)];
    const sh = rot(3, -17);
    const hands = [-6 - 3 * lean, -27 - 2 * lean];

    // tay sau: giơ lên vẫy khi câu được cá
    if (this.mode === 'cheer') {
      ctx.strokeStyle = '#d99a1c'; ctx.lineWidth = 4.2; ctx.lineCap = 'round';
      const hx = sh[0] - 4 + Math.sin(t * 14) * 3, hy = sh[1] - 14;
      ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = '#f3c79a'; ctx.beginPath(); ctx.arc(hx, hy, 2.4, 0, TAU); ctx.fill();
    }

    // người câu
    ctx.save();
    ctx.translate(hip[0], hip[1]); ctx.rotate(ang);
    ctx.fillStyle = '#f0b429'; ctx.strokeStyle = '#b9800f'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-8, 3); ctx.quadraticCurveTo(-10, -20, 0, -22); ctx.quadraticCurveTo(9, -20, 8, 3); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f3c79a';
    ctx.beginPath(); ctx.arc(1, -28.5, 6.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ece6dc';
    ctx.beginPath(); ctx.ellipse(3, -24.5, 5, 3.4, 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e7a97c';
    ctx.beginPath(); ctx.arc(7, -28, 1.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a2a30';
    if (this.mode === 'cheer') { ctx.fillRect(3, -31, 2.4, 0.9); }
    else { ctx.beginPath(); ctx.arc(4.2, -30, 0.95, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#e2c070';
    ctx.beginPath(); ctx.moveTo(-6, -33.5); ctx.quadraticCurveTo(-5, -42, 1, -42); ctx.quadraticCurveTo(7, -42, 7, -33.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b5452f'; ctx.fillRect(-5.8, -36, 12.6, 2);
    ctx.fillStyle = '#d4aa50';
    ctx.beginPath(); ctx.ellipse(1, -33.5, 11.5, 2.4, 0, 0, TAU); ctx.fill();
    ctx.restore();

    // xô cá
    ctx.fillStyle = '#5b7c99';
    ctx.beginPath(); ctx.moveTo(17, -25); ctx.lineTo(31, -25); ctx.lineTo(29, -11); ctx.lineTo(19, -11); ctx.closePath(); ctx.fill();
    for (let i = 0; i < Math.min(this.caught, 3); i++) {
      const x = 20.5 + i * 3.6, wob = Math.sin(t * 3 + i * 2) * 0.6;
      ctx.fillStyle = ['#ff9f43', '#4fc3f7', '#ff6b9a'][i];
      ctx.beginPath(); ctx.moveTo(x, -24); ctx.lineTo(x - 2.6 + wob, -30); ctx.lineTo(x, -28); ctx.lineTo(x + 2.6 + wob, -30); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = '#a7c4dc'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(16.5, -25); ctx.lineTo(31.5, -25); ctx.stroke();

    // thân thuyền
    const g = ctx.createLinearGradient(0, -18, 0, 9);
    g.addColorStop(0, '#b0703f'); g.addColorStop(1, '#6a3b1c');
    ctx.fillStyle = g; ctx.fill(HULL);
    ctx.save(); ctx.clip(HULL);
    ctx.strokeStyle = 'rgba(60,30,12,0.45)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-60, -4); ctx.lineTo(64, -6); ctx.moveTo(-60, 3); ctx.lineTo(64, 1.5); ctx.stroke();
    ctx.strokeStyle = '#2f8f9d'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(-58, -11.5); ctx.lineTo(64, -13.8); ctx.stroke();
    // phần chìm dưới nước
    ctx.fillStyle = 'rgba(70,160,200,0.42)';
    ctx.fillRect(-70, -3 + Math.sin(t * 2) * 0.6, 140, 30);
    ctx.restore();
    ctx.strokeStyle = '#4a2a14'; ctx.lineWidth = 1.3; ctx.stroke(HULL);

    // cần câu
    const [tx, ty] = this.tipLocal();
    const butt = [-14, -18];
    ctx.strokeStyle = '#3b2a1a'; ctx.lineCap = 'round';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(butt[0], butt[1]); ctx.lineTo(hands[0] + 6, hands[1] - 3); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(hands[0] + 6, hands[1] - 3);
    ctx.quadraticCurveTo(30, -50 - this.tension * 2, tx, ty); ctx.stroke();
    ctx.fillStyle = '#9aa4ad';
    const rs = this.busy ? t * 18 : 0;
    ctx.beginPath(); ctx.arc(-7, -21, 2.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#59626b'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-7, -21); ctx.lineTo(-7 + Math.cos(rs) * 2.4, -21 + Math.sin(rs) * 2.4); ctx.stroke();

    // tay trước cầm cần
    ctx.strokeStyle = '#e0a020'; ctx.lineWidth = 4.2;
    ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(hands[0], hands[1]); ctx.stroke();
    ctx.fillStyle = '#f3c79a';
    ctx.beginPath(); ctx.arc(hands[0], hands[1], 2.4, 0, TAU); ctx.fill();
  }

  drawHook(ctx, w) {
    const h = this.hook, s = this.s, t = w.t;
    const idle = this.mode === 'idle' || this.mode === 'cheer';
    // gợi ý: vòng sáng nhấp nháy quanh lưỡi câu
    if (idle && !w.reduced) {
      const a = 0.18 + 0.12 * Math.sin(t * 3);
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(h.x - 1.5 * s, h.y + 3 * s, 11 + Math.sin(t * 3) * 1.5, 0, TAU); ctx.stroke();
    }
    ctx.strokeStyle = '#d5dde3'; ctx.lineWidth = 1.6 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(h.x, h.y - 3 * s, 1.3 * s, 0, TAU); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(h.x, h.y - 1.7 * s);
    ctx.lineTo(h.x, h.y + 5 * s);
    ctx.arc(h.x - 3 * s, h.y + 5 * s, 3 * s, 0, Math.PI * 0.95);
    ctx.lineTo(h.x - 5.4 * s, h.y + 2 * s);
    ctx.stroke();
    // mồi giun
    if (!this.fish && this.mode !== 'cheer') {
      ctx.strokeStyle = '#ff8fa3'; ctx.lineWidth = 2.2 * s;
      const wg = Math.sin(t * 6) * 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(h.x - 6 * s, h.y + 4 * s);
      ctx.quadraticCurveTo(h.x - 3 * s + wg, h.y + 10.5 * s, h.x + 0.5 * s, h.y + 6 * s);
      ctx.quadraticCurveTo(h.x + 3 * s, h.y + 3 * s, h.x + 2 * s - wg, h.y + 10 * s);
      ctx.stroke();
    }
  }
}
