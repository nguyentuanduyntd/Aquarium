// Cá procedural: hình dáng các loài + hành vi bơi
import { TAU, clamp, lerp, mix, rgba, hex, hashStr, mulberry, noise1, angleDiff } from './util.js';
import { hungerLevel } from '../shared/settings.js';

export const SPECIES = {
  clown:    { name: 'Cá hề', body: 0.36, tail: 'fan', dorsal: 'double', pattern: 'clown', palettes: [
    { c: '#ff7b1c', b: '#ffb36b', f: '#ff7b1c', edge: '#161616' },
    { c: '#c2361f', b: '#e3643f', f: '#c2361f', edge: '#161616' }] },
  angel:    { name: 'Cá thần tiên', body: 0.74, tail: 'fan', dorsal: 'angel', pattern: 'vbands', palettes: [
    { c: '#f1e3a8', b: '#fffbea', f: '#e5c661', p: '#35353b' },
    { c: '#cfd8ff', b: '#f3f6ff', f: '#9fb0ff', p: '#2b2f55' },
    { c: '#ffd23f', b: '#fff1a8', f: '#2b6cff', p: '#1d3fa3' }] },
  betta:    { name: 'Cá betta', body: 0.33, tail: 'veil', dorsal: 'veil', pattern: 'scales', palettes: [
    { c: '#e0245e', b: '#ff7a9a', f: '#b3124a' },
    { c: '#2f6bff', b: '#79a8ff', f: '#7b2fff' },
    { c: '#ff6fbf', b: '#ffd0ea', f: '#ff3fa0' },
    { c: '#14c8b4', b: '#8ff0e3', f: '#1b5aa6' }] },
  puffer:   { name: 'Cá nóc', body: 0.64, tail: 'small', dorsal: 'small', pattern: 'spots', eye: 1.5, palettes: [
    { c: '#e8cf7a', b: '#fff8de', f: '#d9b95a', p: '#6b5a2a' },
    { c: '#9fd7ff', b: '#f0fbff', f: '#7cc0f0', p: '#2a5a7a' }] },
  goldfish: { name: 'Cá vàng', body: 0.5, tail: 'double', dorsal: 'normal', pattern: 'scales', palettes: [
    { c: '#ffa62b', b: '#ffd896', f: '#ff8c1a' },
    { c: '#fbfbf7', b: '#ffffff', f: '#ffe2cc', p: '#ff5a1f', pattern: 'patches' },
    { c: '#ff4b3a', b: '#ff9f86', f: '#ff6a50' }] },
  tang:     { name: 'Cá đuôi gai', body: 0.52, tail: 'crescent', dorsal: 'long', pattern: 'tang', palettes: [
    { c: '#2b6cff', b: '#5a95ff', f: '#2050c8', t: '#ffd200', p: '#0f1d4a' },
    { c: '#ffe14d', b: '#fff3a6', f: '#ffd21a', t: '#ffe14d' }] },
  ray:      { name: 'Cá đuối', special: 'ray', palettes: [
    { c: '#6f8796', b: '#aec2cc' },
    { c: '#2e3f52', b: '#506a82', p: '#ffffff' }] },
  redfish:  { name: 'Cá đỏ YouTube', body: 0.46, tail: 'double', dorsal: 'normal', pattern: 'scales', palettes: [
    { c: '#ff2a2a', b: '#ff9a88', f: '#e01818' }] },
  octopus:  { name: 'Bạch tuộc', special: 'octopus', palettes: [
    { c: '#9b6bff', b: '#d2b6ff', p: '#efe6ff' }] },
  flying:   { name: 'Cá chuồn đưa thư', body: 0.32, tail: 'fork', dorsal: 'normal', pattern: 'counter', wing: true, palettes: [
    { c: '#3f6fbf', b: '#e8f0fa', f: '#9cc3f0' }] },
  shark:    { name: 'Cá mập', body: 0.27, tail: 'crescent', dorsal: 'shark', pattern: 'counter', snout: true, eye: 0.6, palettes: [
    { c: '#6f7f8c', b: '#f2f4f5', f: '#5f6e7a' }] },
  seahorse: { name: 'Cá ngựa', special: 'seahorse', palettes: [
    { c: '#ffb347', b: '#ffdca2', p: '#d9801a' },
    { c: '#ff7f9e', b: '#ffc6d4', p: '#d9466e' }] }
};

export const GENERAL = ['clown', 'angel', 'betta', 'puffer', 'goldfish', 'tang', 'ray'];

export function chooseSpecies(info, shark) {
  if (info.pinned) return 'seahorse';
  if (shark) return 'shark';
  const d = info.domain || '';
  if (/(^|\.)youtube\.com$|youtu\.be$/.test(d)) return 'redfish';
  if (/(^|\.)github\.com$/.test(d)) return 'octopus';
  if (/^mail\.google\.com$|^outlook\.|(^|\.)outlook\.com$|^mail\./.test(d)) return 'flying';
  return GENERAL[hashStr(d) % GENERAL.length];
}

// ---------- Màu ----------
function shader(o) {
  const ds = o.desat || 0, dim = o.dim || 0, dead = o.dead || 0;
  return (h, a = 1, k = 0) => {
    let c = hex(h);
    if (k > 0) c = mix(c, [255, 255, 255], k); else if (k < 0) c = mix(c, [0, 0, 0], -k);
    if (ds > 0) { const g = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11; c = mix(c, [g, g, g], ds); }
    if (dead > 0) c = mix(c, [204, 208, 214], dead * 0.35);
    if (dim > 0) c = mix(c, [8, 26, 50], dim);
    return rgba(c, a);
  };
}

export function drawCreature(ctx, species, palIdx, o) {
  const sp = SPECIES[species];
  const pal = sp.palettes[palIdx % sp.palettes.length];
  const S = shader(o);
  if (sp.special === 'ray') return drawRay(ctx, pal, o, S);
  if (sp.special === 'octopus') return drawOctopus(ctx, pal, o, S);
  if (sp.special === 'seahorse') return drawSeahorse(ctx, pal, o, S);
  return drawFishBody(ctx, sp, pal, o, S);
}

// ---------- Hình dạng cá thường ----------
function bodyPath(L, H, tx, tH, snout) {
  const p = new Path2D(), nx = L * 0.5;
  if (snout) { p.moveTo(nx, H * 0.15); p.bezierCurveTo(nx * 0.9, -H * 0.55, L * 0.2, -H * 1.05, -L * 0.02, -H * 1.0); }
  else { p.moveTo(nx, 0); p.bezierCurveTo(nx, -H * 0.78, L * 0.18, -H * 1.04, -L * 0.04, -H * 0.98); }
  p.bezierCurveTo(-L * 0.2, -H * 0.9, tx + L * 0.06, -tH * 1.3, tx, -tH);
  p.quadraticCurveTo(tx - L * 0.03, 0, tx, tH);
  p.bezierCurveTo(tx + L * 0.06, tH * 1.3, -L * 0.2, H * 0.92, -L * 0.04, H * 0.98);
  if (snout) p.bezierCurveTo(L * 0.2, H * 1.0, nx * 0.85, H * 0.7, nx, H * 0.15);
  else p.bezierCurveTo(L * 0.18, H * 1.02, nx, H * 0.74, nx, 0);
  p.closePath();
  return p;
}

function dorsalPath(type, L, H, w) {
  const p = new Path2D(), k = 1 + w;
  switch (type) {
    case 'double': p.moveTo(L * 0.16, -H * 0.82); p.quadraticCurveTo(L * 0.1, -H * 1.5 * k, 0, -H * 1.12); p.quadraticCurveTo(-L * 0.1, -H * 1.6 * k, -L * 0.24, -H * 0.62); break;
    case 'angel': p.moveTo(L * 0.12, -H * 0.86); p.bezierCurveTo(L * 0.04, -H * 1.6, -L * 0.12, -H * 2.1 * k, -L * 0.42, -H * 2.0 * k); p.quadraticCurveTo(-L * 0.26, -H * 1.15, -L * 0.25, -H * 0.5); break;
    case 'long': p.moveTo(L * 0.22, -H * 0.84); p.bezierCurveTo(L * 0.08, -H * 1.35 * k, -L * 0.2, -H * 1.3 * k, -L * 0.31, -H * 0.42); break;
    case 'shark': p.moveTo(L * 0.1, -H * 0.92); p.quadraticCurveTo(L * 0.02, -H * 1.7, -L * 0.05, -H * 2.15); p.quadraticCurveTo(-L * 0.07, -H * 1.4, -L * 0.13, -H * 0.85); break;
    case 'veil': p.moveTo(L * 0.06, -H * 0.92); p.bezierCurveTo(-L * 0.06, -H * 2.0 * k, -L * 0.36, -H * 2.3, -L * 0.56, -H * 1.5 * k); p.quadraticCurveTo(-L * 0.36, -H * 0.9, -L * 0.27, -H * 0.45); break;
    case 'small': p.moveTo(-L * 0.06, -H * 0.92); p.quadraticCurveTo(-L * 0.14, -H * 1.35 * k, -L * 0.24, -H * 0.75); break;
    default: p.moveTo(L * 0.12, -H * 0.86); p.quadraticCurveTo(0, -H * 1.75 * k, -L * 0.2, -H * 1.45 * k); p.quadraticCurveTo(-L * 0.17, -H * 1.0, -L * 0.23, -H * 0.6);
  }
  p.closePath();
  return p;
}

function analPath(type, L, H, w) {
  const p = new Path2D(), k = 1 - w;
  switch (type) {
    case 'angel': p.moveTo(L * 0.08, H * 0.86); p.bezierCurveTo(0, H * 1.6, -L * 0.14, H * 2.0 * k, -L * 0.4, H * 1.95 * k); p.quadraticCurveTo(-L * 0.26, H * 1.1, -L * 0.25, H * 0.5); break;
    case 'veil': p.moveTo(0, H * 0.92); p.bezierCurveTo(-L * 0.1, H * 2.0 * k, -L * 0.38, H * 2.1, -L * 0.55, H * 1.4 * k); p.quadraticCurveTo(-L * 0.36, H * 0.8, -L * 0.27, H * 0.45); break;
    case 'shark': p.moveTo(-L * 0.18, H * 0.75); p.quadraticCurveTo(-L * 0.22, H * 1.15, -L * 0.27, H * 1.1); p.quadraticCurveTo(-L * 0.25, H * 0.8, -L * 0.28, H * 0.5); break;
    case 'double': p.moveTo(-L * 0.02, H * 0.9); p.quadraticCurveTo(-L * 0.1, H * 1.45 * k, -L * 0.22, H * 1.1); p.quadraticCurveTo(-L * 0.2, H * 0.75, -L * 0.25, H * 0.55); break;
    default: p.moveTo(-L * 0.04, H * 0.88); p.quadraticCurveTo(-L * 0.12, H * 1.45 * k, -L * 0.24, H * 1.2 * k); p.quadraticCurveTo(-L * 0.21, H * 0.8, -L * 0.26, H * 0.52);
  }
  p.closePath();
  return p;
}

function tailPath(type, L, H, tH, t) {
  const p = new Path2D();
  switch (type) {
    case 'fork':
      p.moveTo(3, -tH * 0.75); p.quadraticCurveTo(-L * 0.1, -H * 0.55, -L * 0.25, -H * 1.08);
      p.quadraticCurveTo(-L * 0.15, -H * 0.25, -L * 0.12, 0); p.quadraticCurveTo(-L * 0.15, H * 0.25, -L * 0.25, H * 1.08);
      p.quadraticCurveTo(-L * 0.1, H * 0.55, 3, tH * 0.75); break;
    case 'crescent':
      p.moveTo(3, -tH * 0.6); p.quadraticCurveTo(-L * 0.08, -H * 0.6, -L * 0.2, -H * 1.35);
      p.quadraticCurveTo(-L * 0.12, -H * 0.35, -L * 0.08, 0); p.quadraticCurveTo(-L * 0.12, H * 0.35, -L * 0.18, H * 1.1);
      p.quadraticCurveTo(-L * 0.08, H * 0.55, 3, tH * 0.6); break;
    case 'small':
      p.moveTo(3, -tH * 0.6); p.bezierCurveTo(-L * 0.07, -H * 0.7, -L * 0.17, -H * 0.75, -L * 0.17, 0);
      p.bezierCurveTo(-L * 0.17, H * 0.75, -L * 0.07, H * 0.7, 3, tH * 0.6); break;
    case 'double':
      p.moveTo(3, -tH * 0.7); p.bezierCurveTo(-L * 0.12, -H * 1.25, -L * 0.42, -H * 1.35, -L * 0.4, -H * 0.35);
      p.quadraticCurveTo(-L * 0.26, -H * 0.05, -L * 0.28, 0); p.quadraticCurveTo(-L * 0.26, H * 0.05, -L * 0.4, H * 0.35);
      p.bezierCurveTo(-L * 0.42, H * 1.35, -L * 0.12, H * 1.25, 3, tH * 0.7); break;
    case 'veil': {
      p.moveTo(3, -tH * 0.8);
      const N = 12, pts = [];
      for (let k = 0; k <= N; k++) {
        const a = -1.15 + (2.3 * k) / N;
        const R = L * 0.62 * (0.88 + 0.12 * Math.sin(k * 1.7 + t * 2.2));
        const sw = Math.sin(t * 2.5 + k * 0.6) * L * 0.035;
        pts.push([-Math.cos(a) * R * 0.85 + sw * 0.3, Math.sin(a) * R * 0.8 + sw]);
      }
      p.quadraticCurveTo(-L * 0.15, -H * 1.2, pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) p.quadraticCurveTo(pts[k - 1][0], pts[k - 1][1], (pts[k - 1][0] + pts[k][0]) / 2, (pts[k - 1][1] + pts[k][1]) / 2);
      const last = pts[pts.length - 1];
      p.lineTo(last[0], last[1]);
      p.quadraticCurveTo(-L * 0.15, H * 1.2, 3, tH * 0.8);
      break;
    }
    default:
      p.moveTo(3, -tH * 0.65); p.bezierCurveTo(-L * 0.1, -H * 0.95, -L * 0.3, -H * 1.05, -L * 0.3, 0);
      p.bezierCurveTo(-L * 0.3, H * 1.05, -L * 0.1, H * 0.95, 3, tH * 0.65);
  }
  p.closePath();
  return p;
}

function drawPattern(ctx, kind, pal, L, H, S, seed) {
  switch (kind) {
    case 'clown': {
      for (const [bx, bw] of [[0.27, 0.085], [0.02, 0.1], [-0.25, 0.06]]) {
        const x = bx * L, w = bw * L;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, -H * 1.3); ctx.quadraticCurveTo(x - w / 2 + L * 0.035, 0, x - w / 2, H * 1.3);
        ctx.lineTo(x + w / 2, H * 1.3); ctx.quadraticCurveTo(x + w / 2 + L * 0.035, 0, x + w / 2, -H * 1.3);
        ctx.closePath();
        ctx.fillStyle = S('#ffffff'); ctx.fill();
        ctx.strokeStyle = S('#151515', 0.9); ctx.lineWidth = L * 0.014; ctx.stroke();
      }
      break;
    }
    case 'vbands':
      ctx.fillStyle = S(pal.p, 0.8);
      for (const bx of [0.3, 0.1, -0.1, -0.27]) { ctx.beginPath(); ctx.ellipse(bx * L, 0, L * 0.03, H * 1.3, 0.12, 0, TAU); ctx.fill(); }
      break;
    case 'spots': {
      const r = mulberry(seed);
      ctx.fillStyle = S(pal.p, 0.75);
      for (let i = 0; i < 24; i++) {
        const x = lerp(-0.3, 0.4, r()) * L, y = lerp(-1, 0.35, r()) * H;
        ctx.beginPath(); ctx.arc(x, y, L * (0.012 + r() * 0.018), 0, TAU); ctx.fill();
      }
      break;
    }
    case 'patches': {
      const r = mulberry(seed);
      ctx.fillStyle = S(pal.p, 0.95);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(lerp(-0.25, 0.32, r()) * L, lerp(-0.8, 0.3, r()) * H, L * (0.08 + r() * 0.07), H * (0.35 + r() * 0.25), r() * 3, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'tang':
      if (!pal.p) break;
      ctx.strokeStyle = S(pal.p, 0.92); ctx.lineCap = 'round';
      ctx.lineWidth = H * 0.32;
      ctx.beginPath(); ctx.moveTo(L * 0.28, -H * 0.45); ctx.quadraticCurveTo(L * 0.02, -H * 0.05, -L * 0.28, -H * 0.55); ctx.stroke();
      ctx.lineWidth = H * 0.18;
      ctx.beginPath(); ctx.moveTo(L * 0.05, -H * 0.2); ctx.quadraticCurveTo(-L * 0.1, -H * 0.9, -L * 0.3, -H * 0.85); ctx.stroke();
      break;
    case 'counter':
      ctx.fillStyle = S(pal.b);
      ctx.beginPath(); ctx.moveTo(L * 0.6, H * 0.12);
      for (let x = L * 0.6; x >= -L * 0.5; x -= L * 0.05) ctx.lineTo(x, H * 0.18 + Math.sin((x / L) * 14) * H * 0.05);
      ctx.lineTo(-L * 0.5, H * 1.5); ctx.lineTo(L * 0.6, H * 1.5); ctx.closePath(); ctx.fill();
      break;
    case 'scales': {
      ctx.strokeStyle = S('#ffffff', 0.17); ctx.lineWidth = Math.max(0.5, L * 0.006);
      const st = L * 0.055;
      for (let x = L * 0.15; x > -L * 0.35; x -= st) {
        for (let y = -H, row = 0; y < H; y += st * 0.9, row++) {
          ctx.beginPath(); ctx.arc(x + (row % 2 ? st / 2 : 0), y, st * 0.5, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
        }
      }
      break;
    }
  }
}

function drawEye(ctx, x, y, r, o, bodyCol) {
  if (o.deadEye) {
    ctx.strokeStyle = 'rgba(30,30,40,0.9)'; ctx.lineWidth = Math.max(1, r * 0.42); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke();
    return;
  }
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0d1018'; ctx.beginPath(); ctx.arc(x + r * 0.15, y, r * 0.62, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(x - r * 0.05, y - r * 0.3, r * 0.25, 0, TAU); ctx.fill();
  if (o.eyeClose > 0.02) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r * 1.08, 0, TAU); ctx.clip();
    ctx.fillStyle = bodyCol; ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4 * o.eyeClose);
    ctx.restore();
  }
}

function drawBadge(ctx, x, y, r, o) {
  if (r < 3.5 || o.noBadge) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(o.fx < 0 ? -1 : 1, o.fy < 0 ? -1 : 1);
  ctx.fillStyle = `rgba(255,255,255,${0.92 - (o.dead || 0) * 0.3})`;
  ctx.beginPath(); ctx.arc(0, 0, r + Math.max(1.2, r * 0.18), 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
  const img = o.fav;
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.fillStyle = '#fff'; ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.drawImage(img, -r * 0.92, -r * 0.92, r * 1.84, r * 1.84);
  } else {
    ctx.fillStyle = o.badgeCol || '#3a7bd5'; ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.fillStyle = '#fff'; ctx.font = `800 ${r * 1.15}px ui-rounded, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.letter || '?', 0, r * 0.08);
  }
  const ov = (o.desat || 0) * 0.45 + (o.dim || 0) * 0.5;
  if (ov > 0.01) { ctx.fillStyle = `rgba(40,50,62,${ov})`; ctx.fillRect(-r, -r, 2 * r, 2 * r); }
  ctx.restore();
}

function drawFishBody(ctx, sp, pal, o, S) {
  const L = o.L, H = L * sp.body * 0.5 * o.fat * o.thin, tx = -0.32 * L, tH = H * 0.32;
  const fin = pal.f || pal.c, finA = o.finA ?? 0.85;
  const wv = Math.sin(o.phase * 0.7) * 0.08;
  const edge = pal.edge;

  ctx.fillStyle = S(fin, finA);
  const dp = dorsalPath(sp.dorsal, L, H, wv);
  ctx.fill(dp);
  if (edge) { ctx.strokeStyle = S(edge, 0.9); ctx.lineWidth = L * 0.012; ctx.stroke(dp); }
  const ap = analPath(sp.dorsal, L, H, wv);
  ctx.fill(ap);
  if (edge) ctx.stroke(ap);
  if (sp.dorsal === 'shark') {
    ctx.beginPath(); ctx.moveTo(-L * 0.2, -H * 0.72); ctx.lineTo(-L * 0.25, -H * 1.05); ctx.lineTo(-L * 0.27, -H * 0.55); ctx.closePath(); ctx.fill();
  }

  // đuôi
  ctx.save();
  ctx.translate(tx + 1, 0);
  ctx.rotate(Math.sin(o.phase) * o.tailAmp);
  const tp = tailPath(sp.tail, L, H, tH, o.t);
  const tc = pal.t || fin;
  const tg = ctx.createLinearGradient(0, 0, -L * 0.4, 0);
  tg.addColorStop(0, S(tc, Math.min(1, finA + 0.1)));
  tg.addColorStop(1, S(tc, finA * 0.6));
  ctx.fillStyle = tg; ctx.fill(tp);
  ctx.save(); ctx.clip(tp);
  ctx.strokeStyle = S(tc, 0.35, -0.35); ctx.lineWidth = Math.max(0.6, L * 0.006);
  ctx.beginPath();
  for (let k = 0; k < 7; k++) { const yy = lerp(-H * 1.3, H * 1.3, k / 6); ctx.moveTo(0, yy * 0.15); ctx.lineTo(-L * 0.6, yy * 1.1); }
  ctx.stroke(); ctx.restore();
  if (edge) { ctx.strokeStyle = S(edge, 0.9); ctx.lineWidth = L * 0.012; ctx.stroke(tp); }
  ctx.restore();

  // thân
  const bp = bodyPath(L, H, tx, tH, sp.snout);
  const bg = ctx.createLinearGradient(0, -H, 0, H);
  bg.addColorStop(0, S(pal.c, 1, -0.22));
  bg.addColorStop(0.45, S(pal.c));
  bg.addColorStop(1, S(pal.b || pal.c));
  ctx.fillStyle = bg; ctx.fill(bp);
  ctx.save(); ctx.clip(bp);
  drawPattern(ctx, pal.pattern || sp.pattern, pal, L, H, S, o.seed);
  ctx.fillStyle = `rgba(255,255,255,${0.17 * (1 - (o.dead || 0) * 0.6)})`;
  ctx.beginPath(); ctx.ellipse(L * 0.06, -H * 0.5, L * 0.26, H * 0.2, -0.05, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.lineWidth = Math.max(0.7, L * 0.008); ctx.strokeStyle = S(pal.c, 0.5, -0.45); ctx.stroke(bp);
  if (o.group) { ctx.lineWidth = Math.max(1.8, L * 0.028); ctx.strokeStyle = o.group; ctx.globalAlpha = 0.95; ctx.stroke(bp); ctx.globalAlpha = 1; }

  // mang
  ctx.strokeStyle = S(pal.c, 0.35, -0.5); ctx.lineWidth = Math.max(0.7, L * 0.01);
  ctx.beginPath(); ctx.ellipse(L * 0.2, 0, L * 0.05, H * 0.62, 0, -1.25, 1.25); ctx.stroke();
  if (sp.dorsal === 'shark') {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) { ctx.moveTo(L * (0.17 + i * 0.03), -H * 0.35); ctx.lineTo(L * (0.16 + i * 0.03), H * 0.3); }
    ctx.stroke();
  }

  // vây ngực
  ctx.save();
  ctx.translate(L * 0.13, H * 0.3);
  ctx.rotate(0.5 + Math.sin(o.phase * 1.3) * 0.35 * (o.deadEye ? 0 : 1));
  ctx.fillStyle = S(fin, finA * 0.7);
  ctx.beginPath(); ctx.ellipse(-L * 0.07, 0, L * 0.085 * (sp.dorsal === 'shark' ? 1.6 : 1), H * 0.17 + L * 0.01, 0, 0, TAU); ctx.fill();
  ctx.restore();

  if (sp.wing) {
    ctx.save();
    ctx.translate(L * 0.12, -H * 0.05);
    ctx.rotate(-0.25 + Math.sin(o.phase * 0.8) * 0.22);
    const wp = new Path2D();
    wp.moveTo(0, 0); wp.bezierCurveTo(-L * 0.1, -H * 1.8, -L * 0.45, -H * 2.4, -L * 0.58, -H * 1.5);
    wp.quadraticCurveTo(-L * 0.3, -H * 0.6, 0, H * 0.25); wp.closePath();
    ctx.fillStyle = S(pal.f, 0.6); ctx.fill(wp);
    ctx.strokeStyle = S(pal.f, 0.5, -0.3); ctx.lineWidth = Math.max(0.6, L * 0.006);
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { ctx.moveTo(0, 0); ctx.lineTo(-L * (0.15 + k * 0.08), -H * (2.1 - k * 0.15)); }
    ctx.stroke();
    ctx.restore();
  }

  // mắt
  const er = Math.min(Math.max(1.6, H * 0.24 * (sp.eye || 1)), L * 0.075 * (sp.eye || 1));
  drawEye(ctx, L * (sp.snout ? 0.33 : 0.31), -H * 0.22, er, o, S(pal.c));

  // miệng
  if (o.eat > 0.05) {
    ctx.fillStyle = '#3a0d12';
    ctx.beginPath(); ctx.ellipse(L * 0.48, H * 0.12, L * 0.025 * o.eat + 1, H * 0.2 * o.eat + 0.5, 0, 0, TAU); ctx.fill();
  } else {
    ctx.strokeStyle = S(pal.c, 0.6, -0.5); ctx.lineWidth = Math.max(0.7, L * 0.01);
    ctx.beginPath(); ctx.moveTo(L * 0.49, H * 0.1); ctx.quadraticCurveTo(L * 0.46, H * 0.2, L * 0.41, H * 0.17); ctx.stroke();
  }

  drawBadge(ctx, -L * 0.05, H * 0.08, clamp(Math.min(H * 0.55, L * 0.12), 4, 40), o);

  if (sp.wing) {
    // phong thư ngậm ở miệng
    ctx.save();
    ctx.translate(L * 0.6, H * 0.15); ctx.rotate(0.15);
    const ew = L * 0.2, eh = L * 0.13;
    ctx.fillStyle = S('#ffffff'); ctx.strokeStyle = 'rgba(80,90,110,0.7)'; ctx.lineWidth = 1;
    ctx.fillRect(-ew * 0.15, -eh / 2, ew, eh); ctx.strokeRect(-ew * 0.15, -eh / 2, ew, eh);
    ctx.beginPath(); ctx.moveTo(-ew * 0.15, -eh / 2); ctx.lineTo(ew * 0.35, eh * 0.1); ctx.lineTo(ew * 0.85, -eh / 2); ctx.stroke();
    ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.arc(ew * 0.35, eh * 0.1, eh * 0.13, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function drawRay(ctx, pal, o, S) {
  const L = o.L, span = L * 0.5 * o.fat * o.thin;
  const fl = Math.sin(o.phase * 0.55);
  const tipX = -L * 0.06 + fl * L * 0.04, tipY = span * (0.88 + 0.12 * fl);
  ctx.strokeStyle = S(pal.c, 0.9, -0.2); ctx.lineWidth = Math.max(1, L * 0.018); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-L * 0.2, 0);
  ctx.quadraticCurveTo(-L * 0.55, Math.sin(o.phase * 0.4) * L * 0.06, -L * 0.95, Math.sin(o.phase * 0.4 + 1) * L * 0.08);
  ctx.stroke();
  const p = new Path2D();
  p.moveTo(L * 0.36, 0);
  p.bezierCurveTo(L * 0.3, -span * 0.3, L * 0.12, -tipY * 0.8, tipX, -tipY);
  p.bezierCurveTo(-L * 0.12, -span * 0.55, -L * 0.22, -span * 0.22, -L * 0.26, 0);
  p.bezierCurveTo(-L * 0.22, span * 0.22, -L * 0.12, span * 0.55, tipX, tipY);
  p.bezierCurveTo(L * 0.12, tipY * 0.8, L * 0.3, span * 0.3, L * 0.36, 0);
  p.closePath();
  const g = ctx.createRadialGradient(L * 0.05, 0, 0, L * 0.05, 0, span * 1.1);
  g.addColorStop(0, S(pal.b)); g.addColorStop(1, S(pal.c, 1, -0.15));
  ctx.fillStyle = g; ctx.fill(p);
  ctx.save(); ctx.clip(p);
  if (pal.p) {
    const r = mulberry(o.seed);
    ctx.fillStyle = S(pal.p, 0.85);
    for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(lerp(-0.2, 0.3, r()) * L, lerp(-1, 1, r()) * span, L * (0.01 + r() * 0.012), 0, TAU); ctx.fill(); }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(L * 0.05, 0, L * 0.08 * k, span * 0.28 * k, 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = S(pal.c, 0.6, -0.45); ctx.lineWidth = Math.max(0.8, L * 0.008); ctx.stroke(p);
  if (o.group) { ctx.lineWidth = Math.max(1.8, L * 0.025); ctx.strokeStyle = o.group; ctx.stroke(p); }
  ctx.fillStyle = S(pal.c, 1, -0.1);
  for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(L * 0.37, k * L * 0.05, L * 0.05, L * 0.018, k * 0.3, 0, TAU); ctx.fill(); }
  for (const k of [-1, 1]) drawEye(ctx, L * 0.24, k * L * 0.075, Math.max(1.4, L * 0.022), o, S(pal.c));
  drawBadge(ctx, L * 0.02, 0, clamp(L * 0.1, 4, 34), o);
}

function drawOctopus(ctx, pal, o, S) {
  const L = o.L, hr = L * 0.2 * o.fat * Math.sqrt(o.thin), hx = L * 0.2;
  ctx.lineCap = 'round';
  for (let k = 0; k < 8; k++) {
    let x = hx - hr * 0.6, y = lerp(-hr * 0.55, hr * 0.55, k / 7);
    let a = Math.PI + (k - 3.5) * 0.13;
    let w = hr * 0.34;
    const seg = L * 0.07;
    ctx.strokeStyle = k % 2 ? S(pal.c, 1, -0.1) : S(pal.c);
    for (let i = 0; i < 9; i++) {
      a += Math.sin(o.phase * 0.9 + k * 0.8 - i * 0.55) * 0.22 * (i / 9) + (o.deadEye ? 0.12 : 0);
      const nx = x + Math.cos(a) * seg, ny = y + Math.sin(a) * seg;
      ctx.lineWidth = Math.max(0.8, w);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
      if (i > 1 && i < 7 && w > 2.5) { ctx.fillStyle = S(pal.p, 0.7); ctx.beginPath(); ctx.arc(nx, ny + w * 0.3, w * 0.22, 0, TAU); ctx.fill(); }
      x = nx; y = ny; w *= 0.8;
    }
  }
  const p = new Path2D();
  p.ellipse(hx + hr * 0.25, -hr * 0.15, hr * 1.35, hr, -0.25, 0, TAU);
  const g = ctx.createRadialGradient(hx + hr * 0.5, -hr * 0.6, hr * 0.1, hx + hr * 0.25, -hr * 0.15, hr * 1.4);
  g.addColorStop(0, S(pal.b)); g.addColorStop(1, S(pal.c, 1, -0.15));
  ctx.fillStyle = g; ctx.fill(p);
  ctx.save(); ctx.clip(p);
  const r = mulberry(o.seed);
  ctx.fillStyle = S(pal.p, 0.45);
  for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(hx + lerp(-0.9, 1.5, r()) * hr, lerp(-1.1, 0.6, r()) * hr, hr * (0.06 + r() * 0.08), 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = S(pal.c, 0.6, -0.45); ctx.lineWidth = Math.max(0.8, L * 0.008); ctx.stroke(p);
  if (o.group) { ctx.lineWidth = Math.max(1.8, L * 0.025); ctx.strokeStyle = o.group; ctx.stroke(p); }
  drawEye(ctx, hx - hr * 0.15, hr * 0.25, hr * 0.26, o, S(pal.c));
  drawBadge(ctx, hx + hr * 0.6, -hr * 0.35, clamp(hr * 0.48, 4, 30), o);
}

function drawSeahorse(ctx, pal, o, S) {
  const s = o.L * 1.1;
  ctx.save();
  ctx.scale(o.thin * 0.15 + 0.85, 1);
  // vây lưng phập phồng
  ctx.fillStyle = S(pal.b, 0.75);
  const fw = Math.sin(o.phase * 2.5) * 0.04 * s;
  ctx.beginPath(); ctx.moveTo(-0.12 * s, -0.12 * s); ctx.quadraticCurveTo(-0.24 * s - fw, -0.04 * s, -0.13 * s, 0.08 * s); ctx.closePath(); ctx.fill();
  const p = new Path2D();
  p.moveTo(-0.02 * s, -0.48 * s);
  p.bezierCurveTo(0.08 * s, -0.5 * s, 0.12 * s, -0.44 * s, 0.14 * s, -0.39 * s);
  p.lineTo(0.3 * s, -0.37 * s); p.lineTo(0.3 * s, -0.32 * s);
  p.bezierCurveTo(0.18 * s, -0.33 * s, 0.1 * s, -0.3 * s, 0.06 * s, -0.26 * s);
  p.bezierCurveTo(0.17 * s, -0.15 * s, 0.19 * s, 0.05 * s, 0.06 * s, 0.18 * s);
  p.bezierCurveTo(0.02 * s, 0.24 * s, 0.01 * s, 0.3 * s, 0, 0.36 * s);
  p.lineTo(-0.05 * s, 0.34 * s);
  p.bezierCurveTo(-0.06 * s, 0.26 * s, -0.08 * s, 0.22 * s, -0.09 * s, 0.16 * s);
  p.bezierCurveTo(-0.15 * s, 0, -0.15 * s, -0.2 * s, -0.08 * s, -0.3 * s);
  p.bezierCurveTo(-0.12 * s, -0.38 * s, -0.1 * s, -0.46 * s, -0.02 * s, -0.48 * s);
  p.closePath();
  const g = ctx.createLinearGradient(-0.15 * s, 0, 0.2 * s, 0);
  g.addColorStop(0, S(pal.c, 1, -0.2)); g.addColorStop(0.6, S(pal.c)); g.addColorStop(1, S(pal.b));
  ctx.fillStyle = g; ctx.fill(p);
  // đuôi cuộn
  ctx.strokeStyle = S(pal.c, 1, -0.1); ctx.lineCap = 'round';
  ctx.lineWidth = 0.05 * s;
  ctx.beginPath(); ctx.moveTo(-0.025 * s, 0.33 * s); ctx.bezierCurveTo(-0.03 * s, 0.46 * s, 0.12 * s, 0.5 * s, 0.12 * s, 0.41 * s); ctx.stroke();
  ctx.lineWidth = 0.03 * s;
  ctx.beginPath(); ctx.moveTo(0.12 * s, 0.41 * s); ctx.bezierCurveTo(0.12 * s, 0.35 * s, 0.05 * s, 0.36 * s, 0.07 * s, 0.41 * s); ctx.stroke();
  // vân ngang
  ctx.save(); ctx.clip(p);
  ctx.strokeStyle = S(pal.p, 0.45); ctx.lineWidth = Math.max(0.7, s * 0.008);
  for (let y = -0.24; y < 0.36; y += 0.045) { ctx.beginPath(); ctx.moveTo(-0.2 * s, y * s); ctx.quadraticCurveTo(0, (y + 0.02) * s, 0.2 * s, y * s); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = S(pal.c, 0.6, -0.45); ctx.lineWidth = Math.max(0.8, s * 0.008); ctx.stroke(p);
  if (o.group) { ctx.lineWidth = 2; ctx.strokeStyle = o.group; ctx.stroke(p); }
  // vương miện
  ctx.fillStyle = S(pal.p);
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo((-0.06 + i * 0.03) * s, -0.47 * s); ctx.lineTo((-0.05 + i * 0.03) * s, -0.53 * s); ctx.lineTo((-0.04 + i * 0.03) * s, -0.47 * s); ctx.fill(); }
  drawEye(ctx, 0.04 * s, -0.4 * s, Math.max(1.5, 0.035 * s), o, S(pal.c));
  ctx.restore();
  drawBadge(ctx, 0.04 * s, -0.02 * s, clamp(0.07 * s, 4, 26), o);
}

// ---------- Cá: dữ liệu + hành vi ----------
export class Fish {
  constructor(info, world, { enter = false, shark = false } = {}) {
    this.id = info.id;
    this.seed = hashStr(info.id + ':' + (info.domain || '')) % 100000;
    const r = mulberry(this.seed + 1);
    this.phase = r() * TAU;
    this.prefY = 0.15 + r() * 0.7;
    this.face = 1; this.faceVis = 1; this.tilt = 0; this.flipVis = 1; this.eat = 0;
    this.mode = 'swim'; this.done = false; this.startle = 0; this.noteT = r() * 2;
    this.applyInfo(info, { shark }, world);
    this.Lv = this.Lt; this.hv = this.ht; this.fat = this.fatT;
    const W = world.W, H = world.H;
    this.x = lerp(W * 0.08, W * 0.92, r());
    this.vx = (r() < 0.5 ? -1 : 1) * world.baseSpeed * 0.6;
    this.vy = 0;
    this.wander = this.vx > 0 ? 0 : Math.PI;
    if (enter) {
      this.mode = 'enter';
      this.y = world.surfaceY + 6;
      this.vx = (r() - 0.5) * 40;
      this.vy = 190;
      this.Lv = this.Lt * 0.5;
    } else {
      this.y = lerp(world.surfaceY + H * 0.12, world.floorAt(this.x) - this.Lt * 0.6, r());
      if (this.ht >= 4) { this.mode = 'dead'; this.flipVis = -1; this.y = world.surfaceY + this.Lt * 0.12; }
    }
    this.face = Math.sign(this.vx) || 1; this.faceVis = this.face;
  }

  applyInfo(info, { shark }, world) {
    this.info = info;
    const sp = chooseSpecies(info, shark);
    if (sp !== this.species) {
      this.species = sp;
      this.palIdx = (hashStr(info.domain || 'x') >>> 8) % SPECIES[sp].palettes.length;
    }
    const mb = info.mb || 70;
    let f = clamp(1 + 0.42 * Math.log2(mb / 80), 0.6, 2.2);
    if (shark) f = Math.max(f, 2.0) * 1.15;
    if (sp === 'ray') f *= 1.15;
    this.Lt = world.baseL * f;
    this.fatT = 1 + clamp(Math.log2(mb / 150), 0, 2.5) * 0.1;
    if (this.fedAt && performance.now() - this.fedAt < 4000) this.ht = 0;
    else if (world.debugLevel != null) this.ht = world.debugLevel; // chế độ test (phím 0-4)
    else this.ht = hungerLevel(info.active ? 0 : info.idleMin, world.settings);
    const d = (info.domain || info.title || '?').replace(/^www\./, '');
    this.letter = (d[0] || '?').toUpperCase();
    this.badgeCol = `hsl(${hashStr(d) % 360} 62% 44%)`;
    this.group = info.groupColor || null;
  }

  leave(world) {
    this.wasDead = this.mode === 'dead';
    this.mode = 'leave';
    this.leaveT = 0;
    this.dir = this.x < world.W / 2 ? -1 : 1;
  }

  update(dt, t, w) {
    const k2 = 1 - Math.exp(-dt * 2);
    this.Lv += (this.Lt - this.Lv) * k2;
    this.fat += (this.fatT - this.fat) * k2;
    this.hv += (this.ht - this.hv) * (1 - Math.exp(-dt * 1.5));
    const L = this.Lv;
    const spd = Math.hypot(this.vx, this.vy);
    const flick = this.mode === 'leave' && this.leaveT < 0.7 ? 3 : 1;
    this.phase += dt * (this.mode === 'dead' ? 0.4 : (4 + (spd / L) * 4) * flick * (this.hv > 3 ? 0.55 : 1));
    this.eat = Math.max(0, this.eat - dt * 2.5);

    if (this.ht >= 4 && (this.mode === 'swim' || this.mode === 'eat')) this.mode = 'dead';
    if (this.mode === 'dead' && this.ht < 4) this.mode = 'swim';

    switch (this.mode) {
      case 'enter':
        this.vy *= Math.exp(-dt * 2.2); this.vx *= Math.exp(-dt);
        if (this.vy < 35) this.mode = 'swim';
        break;
      case 'swim': this.swim(dt, t, w); break;
      case 'eat': this.eatStep(dt, w); break;
      case 'dead': this.deadStep(dt, t, w); break;
      case 'leave':
        this.leaveT += dt;
        if (this.leaveT < 0.7) { this.vx *= 0.9; this.vy *= 0.9; }
        else { this.vx += this.dir * w.baseSpeed * 7 * dt; this.vy *= 0.96; this.face = this.dir; }
        if (this.x < -L * 1.5 || this.x > w.W + L * 1.5 || this.leaveT > 8) this.done = true;
        break;
    }
    if (this.mode !== 'netting') { this.x += this.vx * dt; this.y += this.vy * dt; }

    if (this.mode !== 'dead' && this.mode !== 'netting' && Math.abs(this.vx) > 3) this.face = this.vx >= 0 ? 1 : -1;
    this.faceVis += (this.face - this.faceVis) * (1 - Math.exp(-dt * 5));
    const tl = this.mode === 'dead' || this.species === 'seahorse' ? 0 : clamp(Math.atan2(this.vy, Math.abs(this.vx) + L * 0.25), -0.55, 0.55);
    this.tilt += (tl - this.tilt) * (1 - Math.exp(-dt * 4));
    const ft = this.mode === 'dead' || ((this.mode === 'netting' || this.mode === 'leave') && this.wasDead) ? -1 : 1;
    this.flipVis += (ft - this.flipVis) * (1 - Math.exp(-dt * (ft < 0 ? 1.3 : 3)));
  }

  swim(dt, t, w) {
    const L = this.Lv, hv = this.hv, W = w.W, H = w.H;
    let sp = w.baseSpeed * (this.info.active ? 1.35 : 1) * lerp(1, 0.28, clamp((hv - 1) / 2.5, 0, 1));
    if (w.reduced) sp *= 0.6;
    if (this.species === 'seahorse') sp *= 0.35;
    else if (this.species === 'octopus') sp *= 0.7;
    else if (this.species === 'ray') sp *= 0.85;
    if (this.startle > 0) { this.startle -= dt; sp *= 2.4; }

    this.wander += noise1(t * 0.35 + this.seed * 0.013) * dt * 1.6;
    this.wander += angleDiff(Math.atan2(this.vy, this.vx), this.wander) * dt * 0.6;
    const dx = Math.cos(this.wander) * sp, dy = Math.sin(this.wander) * sp * 0.45;
    let ax = (dx - this.vx) * 1.5, ay = (dy - this.vy) * 1.5;

    const top = w.surfaceY + L * 0.5 + H * 0.03;
    const floor = w.floorAt(this.x) - L * 0.35 - H * 0.01;
    ay += (lerp(top, floor, this.prefY) - this.y) * 0.25;
    const m = L * 0.6 + 24, R = W - (w.rightInset || 0);
    if (this.x < m) ax += (m - this.x) * 6;
    if (this.x > R - m) ax -= (this.x - (R - m)) * 6;
    if (this.y < top) ay += (top - this.y) * 7;
    if (this.y > floor) ay -= (this.y - floor) * 7;
    if (hv > 2.5) ay += (floor - L * 0.05 - this.y) * 1.6 * clamp(hv - 2.5, 0, 1);
    if (hv >= 1 && hv < 3 && Math.random() < dt * 0.25) this.eat = 1; // đớp vào khoảng không

    let gx = 0, gy = 0, gvx = 0, gvy = 0, gn = 0;
    for (const o of w.fish) {
      if (o === this || o.mode === 'dead' || o.mode === 'leave' || o.mode === 'netting') continue;
      const ddx = this.x - o.x, ddy = this.y - o.y;
      const d2 = ddx * ddx + ddy * ddy;
      const min = (L + o.Lv) * 0.58;
      if (d2 < min * min && d2 > 0.01) {
        const d = Math.sqrt(d2), f = (min - d) / min;
        ax += (ddx / d) * f * sp * 4; ay += (ddy / d) * f * sp * 4;
      }
      if (this.info.groupId >= 0 && o.info.groupId === this.info.groupId) { gx += o.x; gy += o.y; gvx += o.vx; gvy += o.vy; gn++; }
    }
    if (gn > 0) {
      ax += (gx / gn - this.x) * 0.35; ay += (gy / gn - this.y) * 0.35;
      ax += (gvx / gn - this.vx) * 0.8; ay += (gvy / gn - this.vy) * 0.8;
    }

    const ms = w.mouse;
    if (ms.in && t - ms.last < 2.5 && ms.speed < 350 && hv < 3) {
      const mdx = ms.x - this.x, mdy = ms.y - this.y, d = Math.hypot(mdx, mdy);
      if (d < 260 && d > L * 0.6) { const f = (1 - d / 260) * 1.8; ax += (mdx / d) * sp * f; ay += (mdy / d) * sp * f; }
    }

    // thức ăn rơi gần: đớp ké
    if (hv < 3.5) {
      for (const p of w.food) {
        if (p.eaten) continue;
        const fdx = p.x - this.x, fdy = p.y - this.y, d = Math.hypot(fdx, fdy);
        if (d < 150) {
          ax += (fdx / d) * sp * 2; ay += (fdy / d) * sp * 2;
          if (d < L * 0.35 + 5) { p.eaten = true; this.eat = 1; w.onEat?.(this, p); }
          break;
        }
      }
    }

    const sh = w.shark;
    if (sh && sh !== this) {
      const sdx = this.x - sh.x, sdy = this.y - sh.y, d = Math.hypot(sdx, sdy) || 1, R = sh.Lv * 1.6;
      if (d < R) {
        ax += (sdx / d) * sp * 5 * (1 - d / R); ay += (sdy / d) * sp * 5 * (1 - d / R);
        if (d < R * 0.7) this.startle = Math.max(this.startle, 0.4);
      }
    }

    if (this.species === 'shark') {
      this.chaseT = (this.chaseT ?? 4) - dt;
      if (this.chaseT < 0) {
        this.chaseT = 6 + Math.random() * 5;
        const prey = w.fish.filter((o) => o !== this && o.mode === 'swim' && o.Lv < L * 0.7);
        this.prey = Math.random() < 0.55 && prey.length ? prey[(Math.random() * prey.length) | 0] : null;
        this.preyT = 3;
      }
      if (this.prey) {
        this.preyT -= dt;
        if (this.preyT < 0 || this.prey.mode !== 'swim') this.prey = null;
        else {
          const pdx = this.prey.x - this.x, pdy = this.prey.y - this.y, d = Math.hypot(pdx, pdy) || 1;
          ax += (pdx / d) * sp * 3; ay += (pdy / d) * sp * 3;
          sp *= 1.7;
        }
      }
    }

    if (this.species === 'clown' && w.decor.anemone) {
      const a = w.decor.anemone;
      const adx = a.x - this.x, ady = a.y - 45 * w.decor.s - this.y, d = Math.hypot(adx, ady);
      if (d > 50) { ax += (adx / d) * sp * 0.3; ay += (ady / d) * sp * 0.3; }
    }

    if (this.species === 'seahorse') {
      if (this.anchorX == null) {
        const ws = w.decor.weeds;
        this.anchorX = ws.length ? ws[this.seed % ws.length].x + 18 : W / 2;
      }
      ax += (this.anchorX - this.x) * 0.5 - this.vx * 0.6;
      ay += (lerp(top, floor, 0.55) + Math.sin(t * 0.8 + this.seed) * 30 - this.y) * 0.5 - this.vy * 0.6;
    }

    this.vx += ax * dt; this.vy += ay * dt;
    const maxS = sp * 1.8, s = Math.hypot(this.vx, this.vy);
    if (s > maxS) { this.vx *= maxS / s; this.vy *= maxS / s; }
  }

  eatStep(dt, w) {
    const p = this.food;
    this.eatT += dt;
    if (!p || p.eaten || this.eatT > 1.4) { this.mode = 'swim'; return; }
    const mx = this.x + this.face * this.Lv * 0.45;
    const dx = p.x - mx, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    const sp = w.baseSpeed * 4.5;
    const k = Math.min(1, dt * 8);
    this.vx += ((dx / d) * sp - this.vx) * k;
    this.vy += ((dy / d) * sp - this.vy) * k;
    if (Math.abs(dx) > 2) this.face = dx > 0 ? 1 : -1;
    if (d < this.Lv * 0.2 + 7) { p.eaten = true; this.eat = 1; w.onEat?.(this, p); this.mode = 'swim'; }
  }

  deadStep(dt, t, w) {
    const tgt = w.surfaceY + this.Lv * 0.12;
    this.vy += ((tgt - this.y) * 1.2 - this.vy * 1.6) * dt;
    this.vx += (Math.sin(t * 0.15 + this.seed) * 8 - this.vx) * dt * 0.8;
    for (const o of w.fish) {
      if (o === this || o.mode !== 'dead') continue;
      const dx = this.x - o.x, min = (this.Lv + o.Lv) * 0.55;
      if (Math.abs(dx) < min) this.vx += Math.sign(dx || 1) * (min - Math.abs(dx)) * 2 * dt;
    }
    const m = this.Lv * 0.6, R = w.W - (w.rightInset || 0);
    if (this.x < m) this.vx += (m - this.x) * 3 * dt;
    if (this.x > R - m) this.vx -= (this.x - (R - m)) * 3 * dt;
  }

  bodyH() {
    const sp = SPECIES[this.species];
    if (sp.special === 'ray') return this.Lv * 0.5;
    if (sp.special === 'seahorse') return this.Lv * 0.55;
    if (sp.special === 'octopus') return this.Lv * 0.25;
    return this.Lv * sp.body * 0.5 * this.fat;
  }

  hit(mx, my) {
    const L = this.Lv;
    let rx, ry;
    if (this.species === 'seahorse') { rx = L * 0.3; ry = L * 0.6; }
    else if (this.species === 'ray') { rx = L * 0.45; ry = L * 0.5; }
    else { rx = L * 0.55; ry = Math.max(this.bodyH() * 1.35, L * 0.16); }
    const dx = (mx - this.x) / rx, dy = (my - this.y) / ry;
    return dx * dx + dy * dy <= 1;
  }

  opts(w) {
    const hv = this.hv;
    return {
      L: this.Lv,
      phase: this.phase,
      tailAmp: this.mode === 'dead' ? 0.02 : lerp(0.28, 0.1, clamp((hv - 1) / 2.5, 0, 1)) * (this.mode === 'leave' || this.mode === 'eat' ? 1.6 : 1),
      fat: this.fat * (1 + this.eat * 0.05),
      thin: 1 - 0.14 * clamp(hv - 1.3, 0, 2.2),
      eat: this.eat,
      eyeClose: clamp(hv - 2.4, 0, 1) * 0.55,
      deadEye: (this.mode === 'dead' || this.wasDead) && this.flipVis < 0.3,
      desat: clamp((hv - 1) / 2.6, 0, 1) * 0.85,
      dead: clamp(hv - 3, 0, 1),
      dim: w.dim,
      fav: w.favImg(this.info.favUrl),
      letter: this.letter,
      badgeCol: this.badgeCol,
      fx: this.faceVis < 0 ? -1 : 1,
      fy: this.flipVis < 0 ? -1 : 1,
      group: this.group,
      t: w.t + this.seed * 0.01,
      seed: this.seed,
      finA: hv >= 3 ? 0.55 : 0.85
    };
  }

  drawHalo(ctx, w) {
    if (this.mode === 'dead' || this.mode === 'netting') return;
    const L = this.Lv;
    if (this.info.active) {
      const r = L * 1.05 * (1 + 0.06 * Math.sin(w.t * 3));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(this.x, this.y, L * 0.1, this.x, this.y, r);
      g.addColorStop(0, 'rgba(180,255,245,0.32)'); g.addColorStop(1, 'rgba(180,255,245,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, TAU); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const a = w.t * 1.2 + (i * TAU) / 3;
        const sx = this.x + Math.cos(a) * L * 0.75, sy = this.y + Math.sin(a) * L * 0.45;
        const sr = 3 + 2 * Math.sin(w.t * 5 + i);
        ctx.fillStyle = 'rgba(255,255,230,0.85)';
        ctx.beginPath(); ctx.moveTo(sx, sy - sr); ctx.quadraticCurveTo(sx, sy, sx + sr, sy); ctx.quadraticCurveTo(sx, sy, sx, sy + sr); ctx.quadraticCurveTo(sx, sy, sx - sr, sy); ctx.quadraticCurveTo(sx, sy, sx, sy - sr); ctx.fill();
      }
      ctx.restore();
    }
    if (w.night > 0.35) {
      const sp = SPECIES[this.species];
      const c = hex(sp.palettes[this.palIdx % sp.palettes.length].c);
      const a = 0.22 * w.night * (1 - clamp((this.hv - 1) / 2.6, 0, 1));
      if (a > 0.01) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, L * 0.9);
        g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.x, this.y, L * 0.9, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
  }

  draw(ctx, w) {
    const bob = this.mode === 'dead' ? Math.sin(w.t * 1.3 + this.seed) * 1.5 : 0;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    const tilt = this.mode === 'dead' ? Math.sin(w.t * 0.9 + this.seed) * 0.05 : this.tilt;
    ctx.rotate(this.faceVis >= 0 ? tilt : -tilt);
    const fx = Math.abs(this.faceVis) < 0.12 ? 0.12 * (this.faceVis < 0 ? -1 : 1) : this.faceVis;
    const fy = Math.abs(this.flipVis) < 0.08 ? 0.08 * (this.flipVis < 0 ? -1 : 1) : this.flipVis;
    ctx.scale(fx, fy);
    drawCreature(ctx, this.species, this.palIdx, this.opts(w));
    ctx.restore();

    // lớp phủ: vẫy chào, ngủ (tab bị discard)
    if (this.mode === 'leave' && this.leaveT < 1.4) {
      ctx.font = `${Math.max(14, this.Lv * 0.35)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, (1.4 - this.leaveT) * 2);
      ctx.fillText('👋', this.x + this.face * this.Lv * 0.3, this.y - this.bodyH() - 14 - this.leaveT * 10);
      ctx.globalAlpha = 1;
    } else if (this.info.discarded && this.mode === 'swim') {
      const k = (w.t * 0.6 + this.seed * 0.1) % 1;
      ctx.font = `700 ${10 + k * 6}px ui-rounded, system-ui`;
      ctx.fillStyle = `rgba(230,245,255,${0.9 * (1 - k)})`;
      ctx.textAlign = 'center';
      ctx.fillText('z', this.x + this.face * this.Lv * 0.35 + k * 10, this.y - this.bodyH() - 6 - k * 22);
    }
  }
}
