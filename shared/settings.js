// Cấu hình dùng chung giữa background và giao diện
export const DEFAULTS = {
  hungry: 30,      // phút: bắt đầu "Hơi đói"
  starving: 120,   // phút: "Đói"
  dying: 1440,     // phút: "Sắp chết"
  dead: 4320,      // phút: "Lật bụng"
  sound: false,
  daynight: 'auto' // auto | day | night
};

export const STATES = [
  { key: 'healthy', name: 'Khỏe',     emoji: '😊', color: '#3ddc97' },
  { key: 'peckish', name: 'Hơi đói',  emoji: '😋', color: '#ffd166' },
  { key: 'hungry',  name: 'Đói',      emoji: '😟', color: '#ff9f43' },
  { key: 'dying',   name: 'Sắp chết', emoji: '😵', color: '#ff6b6b' },
  { key: 'dead',    name: 'Lật bụng', emoji: '💀', color: '#a0a7b4' }
];

// Trả về mức đói liên tục 0..4 (0 = vừa ăn, 4 = lật bụng)
export function hungerLevel(idleMin, s = DEFAULTS) {
  const pts = [0, s.hungry, s.starving, s.dying, s.dead];
  for (let i = 0; i < 4; i++) {
    if (idleMin < pts[i + 1]) {
      const span = Math.max(0.0001, pts[i + 1] - pts[i]);
      return i + Math.max(0, idleMin - pts[i]) / span;
    }
  }
  return 4;
}

export function stateIndex(h) {
  return Math.max(0, Math.min(4, Math.floor(h)));
}

export async function loadSettings() {
  if (!globalThis.chrome?.storage) return { ...DEFAULTS };
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULTS, ...(settings || {}) };
}

export function fmtIdle(min) {
  if (min < 1) return 'vừa xong';
  if (min < 60) return `${Math.floor(min)} phút`;
  const h = Math.floor(min / 60), m = Math.floor(min % 60);
  if (h < 24) return m ? `${h} giờ ${m} phút` : `${h} giờ`;
  const d = Math.floor(h / 24), hh = h % 24;
  return hh ? `${d} ngày ${hh} giờ` : `${d} ngày`;
}

export function fmtMB(mb) {
  if (mb == null) return '?';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}
