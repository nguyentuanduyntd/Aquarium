// Tab Aquarium – vòng lặp chính, ghép mọi thứ lại
import { Scene, lightAt, palette, makeTint } from './scene.js';
import { Decor } from './decor.js';
import { Particles } from './particles.js';
import { Fish, drawCreature, SPECIES } from './fish.js';
import { TabSource } from './data.js';
import { Sound } from './audio.js';
import { Boat } from './boat.js';
import { STATES, stateIndex, fmtIdle, fmtMB, DEFAULTS } from '../shared/settings.js';
import { clamp, lerp, rand, TAU, easeInOut, easeIn } from './util.js';
import { esc, toast, confirmBox, placeTip } from './ui.js';

const MODE = document.body.dataset.mode || 'full';
const $ = (id) => document.getElementById(id);
const canvas = $('tank');
const ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const src = new TabSource();
const sound = new Sound();
const scene = new Scene();
const decor = new Decor();
const parts = new Particles();
const fishes = new Map();
const nets = [];
const boat = new Boat();
const favCache = new Map();

const world = {
  W: 0, H: 0, dpr: 1, surfaceY: 0, t: 0, fish: [], food: [],
  settings: { ...DEFAULTS }, baseL: 40, baseSpeed: 44, dim: 0, night: 0,
  mouse: { x: -1, y: -1, in: false, speed: 0, last: -10 },
  reduced, decor, parts, scene, shark: null,
  floorAt: (x) => scene.floorAt(x),
  favImg(url) {
    if (!url) return null;
    let i = favCache.get(url);
    if (!i) { i = new Image(); i.src = url; favCache.set(url, i); }
    return i;
  },
  onEat(f, p) { parts.crumb(p.x, p.y); sound.chomp(); }
};

let lt, pal, tint;
const layers = {};
let hover = null;
let synced = false;
let lastDaynight = null;

// ---------- Kích thước & lớp tĩnh ----------
function resize() {
  const r = canvas.getBoundingClientRect();
  const W = Math.max(240, r.width), H = Math.max(180, r.height);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  Object.assign(world, { W, H, dpr });
  scene.layout(W, H, MODE === 'full' ? 100 : 0);
  world.surfaceY = scene.surfaceY;
  decor.layout(scene);
  parts.layout(W, H, scene);
  world.baseL = clamp(Math.min(W, H) * 0.075, 24, 68);
  world.baseSpeed = world.baseL * 1.1;
  boat.layout(world);
  boatLane();
  boat.layout(world);
  for (const f of fishes.values()) {
    f.x = clamp(f.x, 10, W - 10);
    f.y = clamp(f.y, world.surfaceY + 5, scene.floorAt(f.x) - 5);
    f.anchorX = null;
  }
  buildLayers();
  if (synced) sync();
}

function buildLayers() {
  lt = lightAt(world.settings.daynight);
  pal = palette(lt);
  tint = makeTint(pal);
  world.dim = (1 - lt.day) * 0.42;
  world.night = 1 - lt.day;
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const g = c.getContext('2d');
    g.scale(world.dpr, world.dpr);
    return [c, g];
  };
  const [b, bg] = mk(); scene.drawBack(bg, pal); layers.back = b;
  const [f, fg] = mk(); scene.drawFloor(fg, pal, tint); decor.drawStatic(fg, pal, tint); layers.floor = f;
  const [o, og] = mk(); scene.drawGlass(og, pal); layers.glass = o;
  layers.lt = lt;
}

// ---------- Đồng bộ tab → cá ----------
function sync() {
  world.settings = src.settings;
  if (lastDaynight !== world.settings.daynight) {
    lastDaynight = world.settings.daynight;
    if (world.W) buildLayers();
  }
  if (sound.on !== !!world.settings.sound && sound.ctx) sound.setEnabled(!!world.settings.sound);
  updateSoundBtn();

  const list = src.list();
  let heavy = null;
  for (const i of list) if (i.mb >= 400 && (!heavy || i.mb > heavy.mb)) heavy = i;
  const ids = new Set();
  for (const info of list) {
    ids.add(info.id);
    const shark = !!heavy && heavy.id === info.id;
    let f = fishes.get(info.id);
    if (!f) {
      f = new Fish(info, world, { shark, enter: synced });
      fishes.set(info.id, f);
      if (synced) { parts.splash(f.x, world.surfaceY); sound.plop(0.8); }
    } else if (!f.netted) {
      f.applyInfo(info, { shark }, world);
    }
  }
  for (const f of fishes.values()) {
    if (!ids.has(f.id) && f.mode !== 'leave' && !f.netted) f.leave(world);
  }
  synced = true;
  parts.setPlanktonCount(Math.max(40, 220 - fishes.size * 2));
  updateHud();
}

// ---------- Chế độ test: ép trạng thái đói cho cả bể ----------
// Phím 1 = Hơi đói, 2 = Đói, 3 = Sắp chết, 4 = Lật bụng, 0 / Esc = về bình thường
const DEBUG_LEVELS = { '1': 1.5, '2': 2.5, '3': 3.6, '4': 4 };
// ⚠️ TRƯỚC KHI ĐĂNG STORE: đổi thành false để người dùng không lỡ bấm làm cá lật bụng hàng loạt
const DEV_KEYS = false;
window.addEventListener('keydown', (e) => {
  if (!DEV_KEYS) return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.target.closest?.('input, textarea, [contenteditable]')) return;
  let lvl;
  if (e.key in DEBUG_LEVELS) lvl = DEBUG_LEVELS[e.key];
  else if (e.key === '0' || (e.key === 'Escape' && world.debugLevel != null)) lvl = null;
  else return;
  world.debugLevel = lvl;
  sync();
  toast(lvl == null
    ? '🧪 Tắt chế độ test – cá về trạng thái thật'
    : `🧪 Test: ${STATES[stateIndex(lvl)].emoji} ${STATES[stateIndex(lvl)].name} (bấm 0 để về bình thường)`);
});

// ---------- Tương tác ----------
function feed(f) {
  if (f.mode === 'leave' || f.mode === 'netting' || f.mode === 'dead') return;
  const px = f.x + f.face * f.Lv * 0.7;
  const py = Math.max(world.surfaceY + 10, f.y - f.bodyH() - 40);
  const pellets = [];
  for (let i = 0; i < 4; i++) {
    const p = { x: px + rand(-14, 14), y: py + rand(-8, 8), vy: rand(16, 28), ph: rand(0, TAU), eaten: false, life: 9 };
    world.food.push(p); pellets.push(p);
  }
  f.mode = 'eat'; f.food = pellets[0]; f.eatT = 0;
  f.fedAt = performance.now(); f.ht = 0;
  sound.plop(0.4);
  hideTip();
  setTimeout(() => src.activate(f.id), 650);
}

async function netFish(f, ask = true) {
  if (f.netted) return;
  if (ask) {
    const ok = await confirmBox({
      title: 'Vớt cá này?',
      body: `Cá đã lật bụng. Vớt cá đồng nghĩa với <b>đóng tab</b>:<div class="mono">${esc(f.info.title)}</div>`,
      ok: '🥅 Vớt & đóng tab', danger: true
    });
    if (!ok || f.netted) return;
  }
  f.netted = true;
  f.wasDead = f.mode === 'dead';
  f.mode = 'netting';
  nets.push(new Net(f));
}

async function cleanTank() {
  const dead = [...fishes.values()].filter((f) => f.mode === 'dead' && !f.netted);
  if (!dead.length) { toast('✨ Bể sạch rồi, không có cá nào lật bụng.'); return; }
  const items = dead.slice(0, 12).map((f) => `<li>${esc(f.info.title)}</li>`).join('');
  const more = dead.length > 12 ? `<li>… và ${dead.length - 12} tab khác</li>` : '';
  const ok = await confirmBox({
    title: `Dọn ${dead.length} cá lật bụng?`,
    body: `Các tab sau sẽ bị <b>đóng</b>:<ul class="dead-list">${items}${more}</ul>`,
    ok: '🧹 Dọn bể', danger: true
  });
  if (!ok) return;
  dead.forEach((f, i) => setTimeout(() => netFish(f, false), i * 420));
}

class Net {
  constructor(f) {
    this.f = f; this.t = 0; this.ph = 'down';
    this.R = f.Lv * 0.62 + 12;
    this.x = f.x; this.y = -this.R * 2; this.y0 = 0;
    sound.plop(0.5);
  }
  update(dt) {
    const f = this.f, S = world.surfaceY, prev = this.y;
    this.t += dt;
    if (this.ph === 'down') {
      const k = easeInOut(Math.min(1, this.t / 0.7));
      this.x = f.x;
      this.y = lerp(-this.R * 2, f.y, k);
      if (this.t >= 0.7) { this.ph = 'up'; this.t = 0; this.y0 = this.y; }
    } else {
      const k = easeIn(Math.min(1, this.t / 0.85));
      this.y = lerp(this.y0, -this.R * 3, k);
      f.x = this.x; f.y = this.y + this.R * 0.1; f.vx = f.vy = 0;
      if (this.t >= 0.85 && !this.finished) {
        this.finished = true;
        fishes.delete(f.id);
        src.close(f.id);
      }
    }
    if ((prev < S) !== (this.y < S)) { parts.splash(this.x, S); sound.plop(0.6); }
  }
  draw(ctx) {
    const { x, y, R } = this;
    const hoopY = y - R * 0.55;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x + R * 0.95, hoopY); ctx.lineTo(x + R * 2.2, hoopY - world.H); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + R * 0.95 - 1.5, hoopY); ctx.lineTo(x + R * 2.2 - 1.5, hoopY - world.H); ctx.stroke();
    const bag = new Path2D();
    bag.moveTo(x - R, hoopY);
    bag.bezierCurveTo(x - R * 0.9, y + R * 0.9, x + R * 0.9, y + R * 0.9, x + R, hoopY);
    bag.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill(bag);
    ctx.save(); ctx.clip(bag);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = -7; i <= 7; i++) {
      ctx.moveTo(x + i * R * 0.16, hoopY); ctx.lineTo(x + i * R * 0.16 + R * 0.9, y + R);
      ctx.moveTo(x + i * R * 0.16, hoopY); ctx.lineTo(x + i * R * 0.16 - R * 0.9, y + R);
    }
    ctx.stroke(); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke(bag);
    ctx.strokeStyle = '#cfd8e0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, hoopY, R, R * 0.22, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

function pick(mx, my) {
  // ưu tiên cá vẽ sau cùng (trên cùng)
  const order = drawOrder();
  for (let i = order.length - 1; i >= 0; i--) {
    const f = order[i];
    if (f.mode === 'leave' || f.netted) continue;
    if (f.hit(mx, my)) return f;
  }
  return null;
}

function drawOrder() {
  const alive = [], top = [];
  for (const f of fishes.values()) (f.mode === 'dead' || f.mode === 'netting' ? top : alive).push(f);
  alive.sort((a, b) => b.Lv - a.Lv);
  return alive.concat(top);
}

function localPos(e) {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

// ---------- Câu cá: kéo lưỡi câu chạm vào cá ----------
// Khoảng ngang trống giữa các khung HUD để thuyền không bị che
function boatLane() {
  const cr = canvas.getBoundingClientRect();
  let lo = 0, hi = world.W;
  for (const el of document.querySelectorAll('.hud-left, .hud-right')) {
    const r = el.getBoundingClientRect();
    if (!r.width || r.bottom - cr.top < world.surfaceY - 80 * boat.s) continue;
    if ((r.left + r.right) / 2 - cr.left < world.W / 2) lo = Math.max(lo, r.right - cr.left);
    else hi = Math.min(hi, r.left - cr.left);
  }
  world.boatLane = hi - lo > 280 ? [lo, hi] : null;
}
let dragId = null, dragEndAt = 0;
function endDrag() {
  if (dragId !== null) { try { canvas.releasePointerCapture(dragId); } catch { /* đã nhả */ } }
  dragId = null;
  dragEndAt = performance.now();
  canvas.style.cursor = 'default';
}
boat.sfx = sound;
boat.onBite = async (f) => {
  sound.chomp();
  hideTip();
  const ok = await confirmBox({
    title: '🎣 Cá cắn câu rồi!',
    body: `Kéo cá lên thuyền đồng nghĩa với <b>đóng tab</b>:<div class="mono">${esc(f.info.title)}</div>`,
    ok: '🎣 Kéo lên & đóng tab', cancel: 'Thả cá', danger: true
  });
  if (ok && fishes.has(f.id)) boat.reel();
  else boat.release(world);
};
boat.onLand = (f) => {
  fishes.delete(f.id);
  if (hover === f) hideTip();
  src.close(f.id);
  sound.plop(0.5);
  toast(`🎣 Câu được: ${esc(f.info.title)}`, 2000);
};
canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const [x, y] = localPos(e);
  if (!boat.grab(x, y)) return;
  dragId = e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  setHover(null);
  canvas.style.cursor = 'grabbing';
  e.preventDefault();
});
const stopDrag = (e) => { if (e.pointerId === dragId) { boat.drop(); endDrag(); } };
canvas.addEventListener('pointerup', stopDrag);
canvas.addEventListener('pointercancel', stopDrag);

canvas.addEventListener('pointermove', (e) => {
  const [x, y] = localPos(e);
  if (dragId !== null) { boat.dragTo(x, y, world); return; }
  const m = world.mouse;
  const now = world.t;
  const dt = Math.max(0.016, now - (m.lastMove || now - 0.016));
  m.speed = m.in ? Math.hypot(x - m.x, y - m.y) / dt : 0;
  m.x = x; m.y = y; m.in = true; m.last = now; m.lastMove = now;
  const f = pick(x, y);
  setHover(f, e.clientX, e.clientY);
  canvas.style.cursor = f ? 'pointer' : boat.near(x, y) ? 'grab' : 'default';
});
canvas.addEventListener('pointerleave', () => { world.mouse.in = false; setHover(null); });
canvas.addEventListener('click', (e) => {
  if (sound.on || world.settings.sound) sound.setEnabled(true);
  if (dragId !== null || performance.now() - dragEndAt < 350) return; // vừa kéo lưỡi câu xong
  const [x, y] = localPos(e);
  const f = pick(x, y);
  if (f) {
    if (f.mode === 'dead') netFish(f);
    else feed(f);
    return;
  }
  if (y > world.surfaceY) {
    parts.ripple(x, y, 90, 1);
    parts.ripple(x, y, 55, 1);
    for (let i = 0; i < 5; i++) parts.bubble(x + rand(-8, 8), y + rand(-6, 6), rand(1.5, 3.5), 1.2);
    for (const o of fishes.values()) {
      if (o.mode !== 'swim') continue;
      const dx = o.x - x, dy = o.y - y, d = Math.hypot(dx, dy) || 1;
      if (d < 220) { o.vx += (dx / d) * world.baseSpeed * 3.5; o.vy += (dy / d) * world.baseSpeed * 3.5; o.startle = 0.7; }
    }
    sound.bloop(3);
  }
});

// ---------- Tooltip ----------
const tip = $('tooltip');
function setHover(f, cx, cy) {
  if (f !== hover) {
    hover = f;
    canvas.style.cursor = f ? 'pointer' : 'default';
    if (f) tip.innerHTML = tipHTML(f);
    tip.classList.toggle('show', !!f);
  }
  if (f && cx != null) placeTip(tip, cx, cy);
}
function hideTip() { hover = null; tip.classList.remove('show'); }

function favHTML(info, cls = 'fav') {
  if (info.favUrl) return `<img class="${cls}" src="${esc(info.favUrl)}" alt="">`;
  const d = (info.domain || '?').replace(/^www\./, '');
  return `<span class="${cls} letter" style="background:hsl(${hashHue(d)} 62% 44%)">${esc(d[0]?.toUpperCase() || '?')}</span>`;
}
function hashHue(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; }

function tipHTML(f) {
  const i = f.info;
  const st = STATES[stateIndex(f.ht)];
  const tags = [];
  if (i.active) tags.push('<span class="tag">👀 Đang xem</span>');
  if (i.pinned) tags.push('<span class="tag">📌 Ghim</span>');
  if (i.audible) tags.push('<span class="tag">🔊 Đang phát</span>');
  if (i.discarded) tags.push('<span class="tag">💤 Đang ngủ</span>');
  if (i.groupTitle || i.groupColor) tags.push(`<span class="tag" style="--g:${i.groupColor}">● ${esc(i.groupTitle || 'Nhóm')}</span>`);
  if (f.species === 'shark') tags.push('<span class="tag">🦈 Tab nặng nhất</span>');
  const dead = f.mode === 'dead';
  return `<div class="tip-head">${favHTML(i)}<div class="tip-title">${esc(i.title)}</div></div>
    <div class="tip-domain">${esc(i.domain)} · ${esc(SPECIES[f.species].name)}</div>
    <div class="tip-row"><span>Bộ nhớ</span><b>${i.mbKnown ? '≈ ' : '~ '}${fmtMB(i.mb)}</b></div>
    <div class="tip-row"><span>Không mở</span><b>${i.active ? 'Đang mở' : fmtIdle(i.idleMin)}</b></div>
    <div class="tip-state" style="--c:${st.color}">${st.emoji} ${st.name}</div>
    ${tags.length ? `<div class="tags">${tags.join('')}</div>` : ''}
    <div class="tip-hint">${dead ? '🥅 Click để vớt cá (đóng tab)' : '🍤 Click để cho ăn & chuyển tới tab'}</div>`;
}

// ---------- HUD & thống kê ----------
function counts() {
  const c = [0, 0, 0, 0, 0];
  let mem = 0;
  for (const f of fishes.values()) {
    if (f.mode === 'leave' || f.netted) continue;
    c[stateIndex(f.ht)]++;
    mem += f.info.mb || 0;
  }
  return { c, total: c.reduce((a, b) => a + b, 0), mem };
}

function updateHud() {
  const { c, total, mem } = counts();
  if ($('chipFish')) $('chipFish').textContent = `🐟 ${total} cá`;
  if ($('chipDead')) { $('chipDead').textContent = `💀 ${c[4]}`; $('chipDead').classList.toggle('zero', c[4] === 0); }
  if ($('subTitle')) $('subTitle').textContent = `${total} cá đang bơi · ≈ ${fmtMB(mem)}`;
  if (MODE === 'full') updateStats();
}

const avatarCache = new Map();
function avatar(f) {
  const si = stateIndex(f.ht);
  const key = `${f.species}|${f.palIdx}|${si}|${f.info.favUrl || f.letter}`;
  let url = avatarCache.get(key);
  if (url) return url;
  const c = document.createElement('canvas');
  c.width = 96; c.height = 64;
  const g = c.getContext('2d');
  g.scale(2, 2);
  const sp = SPECIES[f.species];
  g.translate(sp.special === 'ray' ? 26 : sp.special === 'octopus' ? 18 : 25, 16);
  const L = sp.special === 'seahorse' ? 26 : sp.special === 'ray' ? 34 : sp.special === 'octopus' ? 40 : 40;
  if (si === 4) g.scale(1, -1);
  drawCreature(g, f.species, f.palIdx, {
    L, phase: 1, tailAmp: 0, fat: 1, thin: 1 - 0.14 * clamp(si - 1.3, 0, 2.2), eat: 0,
    eyeClose: clamp(si - 2.4, 0, 1) * 0.55, deadEye: si === 4, desat: clamp((si - 1) / 2.6, 0, 1) * 0.85,
    dead: clamp(si - 3, 0, 1), dim: 0, fav: null, letter: '', badgeCol: 'transparent', noBadge: true, fx: 1, fy: si === 4 ? -1 : 1,
    group: null, t: 0, seed: f.seed, finA: 0.85
  });
  url = c.toDataURL();
  avatarCache.set(key, url);
  return url;
}

let lastListSig = '';
function updateStats() {
  const panel = $('stats');
  if (!panel) return;
  const { c, total, mem } = counts();
  $('sTotal').textContent = total;
  $('sMem').textContent = `≈ ${fmtMB(mem)}`;
  $('sBar').innerHTML = c.map((n, i) => (n ? `<span style="flex:${n};background:${STATES[i].color}" title="${STATES[i].name}: ${n}"></span>` : '')).join('');
  $('sLegend').innerHTML = c.map((n, i) => `<span><i style="background:${STATES[i].color}"></i>${STATES[i].name} <b>${n}</b></span>`).join('');

  const live = [...fishes.values()].filter((f) => f.mode !== 'leave' && !f.netted);
  const biggest = live.reduce((a, b) => (!a || b.info.mb > a.info.mb ? b : a), null);
  const hungriest = live.filter((f) => !f.info.active).reduce((a, b) => (!a || b.info.idleMin > a.info.idleMin ? b : a), null);
  const feat = (f, label, val) => f
    ? `<div class="feature" data-id="${f.id}"><img src="${avatar(f)}" alt=""><div><small>${label}</small><b>${esc(f.info.title)}</b><span>${val}</span></div></div>`
    : '';
  $('sFeatures').innerHTML = feat(biggest, '🏆 Cá to nhất', `≈ ${biggest ? fmtMB(biggest.info.mb) : ''}`) +
    feat(hungriest, '🥺 Bị bỏ đói lâu nhất', hungriest ? fmtIdle(hungriest.info.idleMin) : '');

  live.sort((a, b) => b.ht - a.ht || b.info.idleMin - a.info.idleMin);
  const sig = live.map((f) => `${f.id}:${stateIndex(f.ht)}:${Math.floor(f.info.idleMin)}:${f.info.title}`).join('|');
  if (sig === lastListSig) return;
  lastListSig = sig;
  $('sList').innerHTML = live.map((f) => {
    const st = STATES[stateIndex(f.ht)];
    return `<li data-id="${f.id}" title="${f.mode === 'dead' ? 'Click để vớt (đóng tab)' : 'Click để cho ăn & chuyển tới tab'}">
      <img class="av" src="${avatar(f)}" alt="">
      <div class="li-main"><div class="li-title">${esc(f.info.title)}</div>
      <div class="li-meta">${esc(f.info.domain)} · ${f.info.active ? 'đang mở' : fmtIdle(f.info.idleMin)}</div></div>
      <span class="li-state" style="--c:${st.color}" title="${st.name}">${st.emoji}</span></li>`;
  }).join('');
}

function onListClick(e) {
  const el = e.target.closest('[data-id]');
  if (!el) return;
  const id = isNaN(+el.dataset.id) ? el.dataset.id : +el.dataset.id;
  const f = fishes.get(id);
  if (!f) return;
  if (f.mode === 'dead') netFish(f); else feed(f);
}

function updateSoundBtn() {
  const b = $('btnSound');
  if (b) { b.textContent = world.settings.sound ? '🔊' : '🔇'; b.title = world.settings.sound ? 'Tắt âm thanh' : 'Bật âm thanh'; }
}

// ---------- Nút bấm ----------
$('btnClean')?.addEventListener('click', cleanTank);
$('btnSound')?.addEventListener('click', async () => {
  const on = !world.settings.sound;
  sound.setEnabled(on);
  await src.saveSettings({ sound: on });
  world.settings = src.settings;
  updateSoundBtn();
  toast(on ? '🔊 Đã bật âm thanh' : '🔇 Đã tắt âm thanh', 1400);
});
$('btnSettings')?.addEventListener('click', () => {
  if (globalThis.chrome?.runtime?.openOptionsPage) chrome.runtime.openOptionsPage();
  else window.open('settings.html', '_blank');
});
$('btnFull')?.addEventListener('click', async () => {
  if (globalThis.chrome?.tabs) {
    const url = chrome.runtime.getURL('ui/aquarium.html');
    const [ex] = await chrome.tabs.query({ url });
    if (ex) { await chrome.tabs.update(ex.id, { active: true }); await chrome.windows.update(ex.windowId, { focused: true }); }
    else await chrome.tabs.create({ url });
    window.close();
  } else window.open('aquarium.html', '_blank');
});
$('btnPanel')?.addEventListener('click', () => document.body.classList.toggle('panel-closed'));
$('sList')?.addEventListener('click', onListClick);
$('sFeatures')?.addEventListener('click', onListClick);

// ---------- Vòng lặp ----------
let last = performance.now();
let lightCheck = 30;
let hudT = 0;

function step(dt) {
  const t = world.t;
  world.rightInset = MODE === 'full' && !document.body.classList.contains('panel-closed') ? Math.min(350, world.W * 0.3) : 0;
  lightCheck -= dt;
  if (lightCheck < 0) {
    lightCheck = 30;
    const l2 = lightAt(world.settings.daynight);
    if (Math.abs(l2.day - lt.day) > 0.01 || Math.abs(l2.dusk - lt.dusk) > 0.01) buildLayers();
  }
  world.fish = [...fishes.values()];
  world.shark = world.fish.find((f) => f.species === 'shark' && f.mode === 'swim') || null;
  for (const f of world.fish) f.update(dt, t, world);
  for (const [id, f] of fishes) if (f.done) fishes.delete(id);
  boat.update(dt, world);
  if (dragId !== null && !boat.dragging) endDrag();

  for (const f of world.fish) {
    if (f.mode === 'swim' || f.mode === 'eat') {
      if (f.info.audible) {
        f.noteT -= dt;
        if (f.noteT < 0) { f.noteT = 0.6 + Math.random() * 0.5; parts.note(f.x + f.face * f.Lv * 0.2, f.y - f.bodyH() - 4); }
      }
      if (Math.random() < dt * 0.15) parts.bubble(f.x + f.face * f.Lv * 0.5, f.y, rand(1.2, 2.6) * (f.Lv / 40));
    }
  }

  decor.update(dt, t, world.fish, (x, y, n, sp) => {
    for (let i = 0; i < n; i++) parts.bubble(x + rand(-8, 8) * decor.s, y - rand(0, 6), rand(1.2, 4) * Math.max(0.7, decor.s), sp);
  });
  parts.update(dt, t);

  for (let i = world.food.length - 1; i >= 0; i--) {
    const p = world.food[i];
    p.life -= dt;
    const fl = scene.floorAt(p.x) - 2;
    if (p.y < fl) { p.y += p.vy * dt; p.x += Math.sin(t * 2 + p.ph) * 8 * dt; }
    if (p.eaten || p.life <= 0) world.food.splice(i, 1);
  }
  for (let i = nets.length - 1; i >= 0; i--) { nets[i].update(dt); if (nets[i].finished) nets.splice(i, 1); }

  hudT -= dt;
  if (hudT < 0) {
    hudT = 1;
    boatLane();
    if (hover) {
      if (!fishes.has(hover.id) || hover.netted) hideTip();
      else tip.innerHTML = tipHTML(hover);
    }
  }
}

function render() {
  const t = world.t, W = world.W, H = world.H;
  ctx.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(layers.back, 0, 0, W, H);
  scene.drawRays(ctx, reduced ? 0 : t, pal);
  decor.drawJellies(ctx, t, pal);
  ctx.drawImage(layers.floor, 0, 0, W, H);
  if (!reduced) scene.drawCaustics(ctx, t, pal);
  decor.drawBack(ctx, t, 1 / 60, pal, tint);
  parts.drawPlankton(ctx, pal, 0);

  for (const p of world.food) {
    ctx.fillStyle = '#c9783a';
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,170,0.8)';
    ctx.beginPath(); ctx.arc(p.x - 0.8, p.y - 0.8, 0.9, 0, TAU); ctx.fill();
  }

  const order = drawOrder();
  for (const f of order) f.drawHalo(ctx, world);
  for (const f of order) if (f.mode !== 'dead' && f.mode !== 'netting') f.draw(ctx, world);

  decor.drawFront(ctx, t, tint);
  parts.drawBubbles(ctx);
  parts.drawCrumbs(ctx);
  parts.drawPlankton(ctx, pal, 1);
  scene.drawSurface(ctx, t, pal);
  boat.draw(ctx, world);

  for (const f of order) {
    if (f.mode === 'dead' || f.mode === 'netting') f.draw(ctx, world);
    if (f.mode === 'dead') drawFlies(f, t);
  }
  parts.drawNotes(ctx);
  for (const n of nets) n.draw(ctx);
  parts.drawSplash(ctx);

  if (hover && fishes.has(hover.id)) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.setLineDash([4, 5]); ctx.lineDashOffset = -t * 20; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(hover.x, hover.y, hover.Lv * 0.62, Math.max(hover.bodyH() * 1.5, hover.Lv * 0.22), 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.drawImage(layers.glass, 0, 0, W, H);
}

function drawFlies(f, t) {
  const S = world.surfaceY;
  for (let i = 0; i < 2; i++) {
    const a = t * (4.5 + i) + f.seed + i * 2.2;
    const x = f.x + Math.cos(a) * f.Lv * 0.38;
    const y = Math.min(S - 5, S - 11 + Math.sin(a * 1.7) * 5) - i * 4;
    const wf = Math.abs(Math.sin(t * 60 + i));
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.ellipse(x - 1.2, y - 1.6, 1.8, 0.8 * wf + 0.3, -0.5, 0, TAU);
    ctx.ellipse(x + 1.2, y - 1.6, 1.8, 0.8 * wf + 0.3, 0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,20,26,0.9)';
    ctx.beginPath(); ctx.arc(x, y, 1.7, 0, TAU); ctx.fill();
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!document.hidden && world.W) {
    world.t += dt;
    step(dt);
    render();
  }
  requestAnimationFrame(frame);
}

// ---------- Khởi động ----------
parts.onPop = (r) => sound.bloop(r);
src.on(sync);
new ResizeObserver(() => resize()).observe(canvas);
resize();
await src.init();
if (world.settings.sound) updateSoundBtn();
setInterval(() => { if (!document.hidden) sync(); }, 1000);
requestAnimationFrame((n) => { last = n; requestAnimationFrame(frame); });
if (!src.real) toast('🐠 Chế độ demo: dữ liệu tab giả lập', 3200);
window.__aquarium = { world, fishes, src, boat };
