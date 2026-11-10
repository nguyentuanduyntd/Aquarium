// Tab Aquarium – service worker
// Nhiệm vụ: ghi lại lần cuối mỗi tab được xem, ước tính bộ nhớ từng tab, cập nhật badge số cá lật bụng.
import { loadSettings } from './shared/settings.js';

const ALARM = 'tab-aquarium-sample';

// Ghi storage tuần tự để tránh ghi đè lẫn nhau
let chain = Promise.resolve();
const serial = (fn) => (chain = chain.then(fn).catch((e) => console.warn('[Tab Aquarium]', e)));

async function getStore() {
  const r = await chrome.storage.local.get(['lastActive', 'memory']);
  return { la: r.lastActive || {}, mem: r.memory || {} };
}

function setupAlarm() {
  chrome.alarms.create(ALARM, { periodInMinutes: 0.5 });
}

async function seed() {
  const tabs = await chrome.tabs.query({});
  const { la } = await getStore();
  const now = Date.now();
  for (const t of tabs) if (!la[t.id]) la[t.id] = t.lastAccessed || now;
  await chrome.storage.local.set({ lastActive: la });
}

chrome.runtime.onInstalled.addListener(() => {
  setupAlarm();
  serial(async () => { await seed(); await sampleAll(); await updateBadge(); });
});

chrome.runtime.onStartup.addListener(() => {
  setupAlarm();
  serial(async () => { await seed(); await sampleAll(); await updateBadge(); });
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => serial(async () => {
  const now = Date.now();
  const s = await chrome.storage.session.get('activeByWindow');
  const abw = s.activeByWindow || {};
  const { la } = await getStore();
  const prev = abw[windowId];
  if (prev != null) la[prev] = now; // tab vừa rời đi: được xem tới lúc này
  la[tabId] = now;
  abw[windowId] = tabId;
  await chrome.storage.session.set({ activeByWindow: abw });
  await chrome.storage.local.set({ lastActive: la });
  await updateBadge();
}));

chrome.tabs.onCreated.addListener((tab) => serial(async () => {
  const { la } = await getStore();
  la[tab.id] = Date.now();
  await chrome.storage.local.set({ lastActive: la });
}));

chrome.tabs.onRemoved.addListener((tabId) => serial(async () => {
  const { la, mem } = await getStore();
  delete la[tabId];
  delete mem[tabId];
  await chrome.storage.local.set({ lastActive: la, memory: mem });
  await updateBadge();
}));

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'complete') {
    setTimeout(() => serial(async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        const m = await measure(tab);
        if (!m) return;
        const { mem } = await getStore();
        mem[tabId] = m;
        await chrome.storage.local.set({ memory: mem });
      } catch { /* tab có thể đã đóng */ }
    }), 1500);
  }
});

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name !== ALARM) return;
  serial(async () => { await touchActive(); await sampleAll(); await updateBadge(); });
});

chrome.storage.onChanged.addListener((ch, area) => {
  if (area === 'local' && ch.settings) serial(updateBadge);
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'sample') {
    serial(async () => { await sampleAll(); await updateBadge(); sendResponse({ ok: true }); });
    return true;
  }
});

// Tab đang mở ở mỗi cửa sổ luôn được tính là "đang được xem"
async function touchActive() {
  const tabs = await chrome.tabs.query({ active: true });
  const { la } = await getStore();
  const now = Date.now();
  for (const t of tabs) la[t.id] = now;
  await chrome.storage.local.set({ lastActive: la });
}

// Hàm chạy bên trong trang để lấy các chỉ số "độ nặng"
function probe() {
  const m = performance.memory;
  return {
    heap: m ? m.usedJSHeapSize : 0,
    dom: document.getElementsByTagName('*').length,
    res: performance.getEntriesByType('resource').length,
    media: document.querySelectorAll('video,canvas,iframe').length
  };
}

function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

// Chrome bản stable không có API RAM theo từng tab (chrome.processes chỉ có ở Dev channel),
// nên ta ước tính từ JS heap + số DOM node + số resource + media.
async function measure(tab) {
  if (tab.discarded) return { mb: 6, discarded: true, t: Date.now() };
  if (!/^https?:/.test(tab.url || '')) return null;
  try {
    const [res] = await withTimeout(
      chrome.scripting.executeScript({ target: { tabId: tab.id }, func: probe }),
      2500
    );
    const r = res?.result;
    if (!r) return null;
    const heapMB = r.heap / 1048576;
    const mb = Math.min(4000, Math.max(12, 28 + heapMB * 1.6 + (r.dom / 1000) * 3 + r.res * 0.15 + r.media * 14));
    return { mb: Math.round(mb), heap: Math.round(heapMB), dom: r.dom, res: r.res, t: Date.now() };
  } catch {
    return null;
  }
}

async function sampleAll() {
  const tabs = await chrome.tabs.query({});
  const results = await Promise.allSettled(tabs.map(measure));
  const { mem } = await getStore();
  const alive = new Set(tabs.map((t) => String(t.id)));
  for (const k of Object.keys(mem)) if (!alive.has(k)) delete mem[k];
  tabs.forEach((t, i) => {
    const r = results[i];
    if (r.status === 'fulfilled' && r.value) mem[t.id] = r.value;
  });
  await chrome.storage.local.set({ memory: mem });
}

async function updateBadge() {
  const s = await loadSettings();
  const tabs = await chrome.tabs.query({});
  const { la } = await getStore();
  const now = Date.now();
  const self = chrome.runtime.getURL('');
  let dead = 0;
  for (const t of tabs) {
    if (t.active || (t.url || '').startsWith(self)) continue;
    const last = Math.max(t.lastAccessed || 0, la[t.id] || 0) || now;
    if ((now - last) / 60000 >= s.dead) dead++;
  }
  await chrome.action.setBadgeBackgroundColor({ color: '#e5484d' });
  await chrome.action.setBadgeText({ text: dead ? String(dead) : '' });
}
