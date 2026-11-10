// Tooltip, hộp thoại, thông báo nhỏ
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function toast(msg, ms = 2400) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.innerHTML = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}

export function confirmBox({ title, body, ok = 'Đồng ý', cancel = 'Hủy', danger = false }) {
  return new Promise((resolve) => {
    const m = document.getElementById('modal');
    m.innerHTML = `<div class="modal-card glass" role="dialog" aria-modal="true">
      <h3>${title}</h3><div class="modal-body">${body}</div>
      <div class="modal-actions"><button class="btn" data-a="0">${cancel}</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" data-a="1">${ok}</button></div></div>`;
    m.classList.add('show');
    const close = (v) => {
      m.classList.remove('show');
      document.removeEventListener('keydown', onKey);
      resolve(v);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(false); if (e.key === 'Enter') close(true); };
    document.addEventListener('keydown', onKey);
    m.onclick = (e) => {
      const a = e.target.closest('[data-a]');
      if (a) close(a.dataset.a === '1');
      else if (e.target === m) close(false);
    };
    m.querySelector('[data-a="1"]').focus();
  });
}

export function placeTip(el, x, y) {
  const pad = 12, r = el.getBoundingClientRect();
  let left = x + 18, top = y + 18;
  if (left + r.width > innerWidth - pad) left = x - r.width - 18;
  if (top + r.height > innerHeight - pad) top = y - r.height - 18;
  el.style.transform = `translate(${Math.max(pad, left)}px, ${Math.max(pad, top)}px)`;
}
