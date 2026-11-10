// Nguồn dữ liệu tab: dùng Chrome API thật, hoặc dữ liệu demo khi mở trang ngoài extension
import { DEFAULTS } from '../shared/settings.js';

export const GROUP_COLORS = {
  grey: '#9aa0a6', blue: '#4c8bf5', red: '#ea4335', yellow: '#fbbc04', green: '#34a853',
  pink: '#f06292', purple: '#a142f4', cyan: '#24c1e0', orange: '#fa903e'
};

export function domainOf(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'chrome:' || u.protocol === 'edge:') return 'trang hệ thống';
    if (u.protocol === 'file:') return 'tệp cục bộ';
    if (u.protocol === 'about:') return 'tab trống';
    return u.hostname.replace(/^www\./, '') || u.protocol.replace(':', '');
  } catch {
    return 'tab mới';
  }
}

export class TabSource {
  constructor() {
    this.real = !!(globalThis.chrome && chrome.tabs && chrome.tabs.query);
    this.tabs = [];
    this.la = {};
    this.mem = {};
    this.groups = {};
    this.settings = { ...DEFAULTS };
    this.cbs = [];
    this.selfUrl = this.real ? chrome.runtime.getURL('') : '';
  }

  on(cb) { this.cbs.push(cb); }
  emit() { for (const c of this.cbs) c(); }

  async init() {
    if (!this.real) { this.initDemo(); this.emit(); return; }
    await this.refresh();
    const sched = () => { clearTimeout(this._t); this._t = setTimeout(() => this.refresh(), 120); };
    for (const ev of ['onCreated', 'onRemoved', 'onUpdated', 'onActivated', 'onAttached', 'onDetached', 'onReplaced']) {
      chrome.tabs[ev]?.addListener(sched);
    }
    chrome.tabGroups?.onUpdated?.addListener(sched);
    chrome.windows?.onFocusChanged?.addListener(sched);
    chrome.storage.onChanged.addListener((_c, area) => { if (area === 'local') sched(); });
    setInterval(() => this.refresh(), 10000);
    chrome.runtime.sendMessage({ type: 'sample' }).catch(() => {});
  }

  async refresh() {
    try {
      const [tabs, st, groups] = await Promise.all([
        chrome.tabs.query({}),
        chrome.storage.local.get(['lastActive', 'memory', 'settings']),
        chrome.tabGroups ? chrome.tabGroups.query({}).catch(() => []) : Promise.resolve([])
      ]);
      this.tabs = tabs.filter((t) => !(t.url || t.pendingUrl || '').startsWith(this.selfUrl));
      this.la = st.lastActive || {};
      this.mem = st.memory || {};
      this.settings = { ...DEFAULTS, ...(st.settings || {}) };
      this.groups = {};
      for (const g of groups) this.groups[g.id] = g;
      this.emit();
    } catch (e) {
      console.warn('[Tab Aquarium] refresh', e);
    }
  }

  favUrl(url) {
    if (!this.real || !url) return null;
    return `${chrome.runtime.getURL('/_favicon/')}?pageUrl=${encodeURIComponent(url)}&size=64`;
  }

  list() {
    const now = Date.now();
    if (!this.real) return this.demoList(now);
    return this.tabs.map((t) => {
      const url = t.url || t.pendingUrl || '';
      const last = Math.max(t.lastAccessed || 0, this.la[t.id] || 0) || now;
      const m = this.mem[t.id];
      const g = t.groupId >= 0 ? this.groups[t.groupId] : null;
      return {
        id: t.id,
        title: t.title || url || 'Tab mới',
        url,
        domain: domainOf(url),
        favUrl: this.favUrl(url),
        mb: m ? m.mb : t.discarded ? 6 : 70,
        mbKnown: !!m,
        idleMin: t.active ? 0 : Math.max(0, (now - last) / 60000),
        active: !!t.active,
        audible: !!t.audible,
        pinned: !!t.pinned,
        discarded: !!t.discarded,
        groupId: g ? t.groupId : -1,
        groupColor: g ? GROUP_COLORS[g.color] || '#9aa0a6' : null,
        groupTitle: g?.title || '',
        windowId: t.windowId
      };
    });
  }

  async activate(id) {
    if (!this.real) {
      const now = Date.now();
      for (const d of this.demo) if (d.active) { d.active = false; d.idle = 0; d.at = now; }
      const d = this.demo.find((x) => x.id === id);
      if (d) { d.active = true; d.idle = 0; d.at = now; }
      this.emit();
      return;
    }
    try {
      const t = await chrome.tabs.update(id, { active: true });
      await chrome.windows.update(t.windowId, { focused: true });
    } catch (e) { console.warn(e); }
  }

  async close(id) {
    if (!this.real) {
      this.demo = this.demo.filter((d) => d.id !== id);
      this.emit();
      return;
    }
    try { await chrome.tabs.remove(id); } catch (e) { console.warn(e); }
  }

  async saveSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    if (this.real) await chrome.storage.local.set({ settings: this.settings });
    else this.emit();
  }

  // ---------- Demo ----------
  initDemo() {
    const now = Date.now();
    const D = [
      ['Hồ sơ dự án – Bản nháp báo cáo', 'https://docs.example.com/bao-cao', 180, 0, { active: true, group: 'blue', gt: 'Dự án A' }],
      ['Nhạc nền làm việc', 'https://video.example.com/lofi', 420, 12, { audible: true }],
      ['Hộp thư công việc', 'https://mail.example.com/inbox', 260, 3],
      ['Kho mã nguồn – tab-aquarium', 'https://code.example.com/tab-aquarium', 150, 48],
      ['Bộ nhận diện thương hiệu 2026', 'https://design.example.com/brand-kit', 950, 25],
      ['Hợp đồng mua bán – bản sửa 3', 'https://docs.example.org/hop-dong', 210, 70, { group: 'blue', gt: 'Dự án A' }],
      ['Tra cứu văn bản', 'https://library.example.org/van-ban', 90, 95, { group: 'blue', gt: 'Dự án A' }],
      ['Tin tức buổi sáng', 'https://news.example.com/', 230, 200],
      ['Giỏ hàng – Bàn phím cơ', 'https://shop.example.com/ban-phim', 310, 400],
      ['Bách khoa – Lịch sử đại dương', 'https://wiki.example.org/dai-duong', 60, 900, { group: 'green', gt: 'Nghiên cứu' }],
      ['Hỏi đáp lập trình – Regex', 'https://qa.example.com/q/1', 85, 1600, { group: 'green', gt: 'Nghiên cứu' }],
      ['Ghi chú cuộc họp', 'https://notes.example.com/hop', 140, 2500],
      ['Mạng nghề nghiệp – Thông báo', 'https://network.example.com/feed', 200, 3000],
      ['Cổng thủ tục trực tuyến', 'https://services.example.org/', 75, 5000],
      ['Mạng xã hội', 'https://social.example.com/', 380, 6000],
      ['Trò chuyện nhóm', 'https://chat.example.com/', 120, 8, { pinned: true }],
      ['Trợ lý viết', 'https://assistant.example.com/', 130, 1],
      ['Báo điện tử – Thời sự', 'https://paper.example.net/', 110, 7000, { discarded: true }]
    ];
    this.demo = D.map(([title, url, mb, idle, o = {}], i) => ({
      id: 1000 + i, title, url, mb, idle, at: now,
      active: !!o.active, audible: !!o.audible, pinned: !!o.pinned, discarded: !!o.discarded,
      groupId: o.group ? (o.group === 'blue' ? 1 : 2) : -1,
      groupColor: o.group ? GROUP_COLORS[o.group] : null, groupTitle: o.gt || ''
    }));
  }

  demoList(now) {
    return this.demo.map((d) => ({
      id: d.id, title: d.title, url: d.url, domain: domainOf(d.url), favUrl: null,
      mb: d.mb, mbKnown: true,
      idleMin: d.active ? 0 : d.idle + (now - d.at) / 60000,
      active: d.active, audible: d.audible, pinned: d.pinned, discarded: d.discarded,
      groupId: d.groupId, groupColor: d.groupColor, groupTitle: d.groupTitle, windowId: 1
    }));
  }
}
