import { DEFAULTS, loadSettings } from '../shared/settings.js';
import { toast } from '../engine/ui.js';

const KEYS = ['hungry', 'starving', 'dying', 'dead'];
const $ = (id) => document.getElementById(id);
const PRESETS = {
  default: { hungry: 30, starving: 120, dying: 1440, dead: 4320 },
  quick: { hungry: 1, starving: 2, dying: 3, dead: 4 }
};

function fill(s) {
  for (const k of KEYS) $(k).value = s[k];
  $('sound').checked = !!s.sound;
  $('daynight').value = s.daynight || 'auto';
}

let current = await loadSettings().catch(() => ({ ...DEFAULTS }));
fill(current);

document.querySelectorAll('[data-preset]').forEach((b) =>
  b.addEventListener('click', () => {
    const p = PRESETS[b.dataset.preset];
    for (const k of KEYS) $(k).value = p[k];
    $('err').textContent = '';
  })
);

$('save').addEventListener('click', async () => {
  const vals = KEYS.map((k) => Math.round(Number($(k).value)));
  if (vals.some((v) => !Number.isFinite(v) || v < 1)) { $('err').textContent = 'Mỗi ngưỡng phải là số phút ≥ 1.'; return; }
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] <= vals[i - 1]) { $('err').textContent = 'Các ngưỡng phải tăng dần: Hơi đói < Đói < Sắp chết < Lật bụng.'; return; }
  }
  $('err').textContent = '';
  current = { ...current, ...Object.fromEntries(KEYS.map((k, i) => [k, vals[i]])), sound: $('sound').checked, daynight: $('daynight').value };
  if (globalThis.chrome?.storage) await chrome.storage.local.set({ settings: current });
  toast('✅ Đã lưu cài đặt');
});
