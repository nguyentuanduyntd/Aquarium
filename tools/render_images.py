"""Tạo ảnh listing cho store bằng Chrome/Edge headless (không tải ảnh nào từ ngoài).

Chạy từ thư mục gốc dự án:  python tools/render_images.py
Kết quả nằm trong store-submission/, kích thước được kiểm tra lại sau khi chụp.
"""
import functools, http.server, os, struct, subprocess, sys, tempfile, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'store-submission')
PORT = 8770
BROWSERS = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
]
# (tên file, trang, rộng, cao, thời gian ảo ms, nền trong suốt)
JOBS = [
    ('logo-300x300.png', 'tools/art.html?kind=logo', 300, 300, 1500, True),
    ('promo-small-440x280.png', 'tools/art.html?kind=small', 440, 280, 1500, False),
    ('promo-large-1400x560.png', 'tools/art.html?kind=large', 1400, 560, 1500, False),
    ('screenshot-1-1280x800.png', 'tools/shots.html?n=1', 1280, 800, 6000, False),
    ('screenshot-2-1280x800.png', 'tools/shots.html?n=2', 1280, 800, 6000, False),
    ('screenshot-3-1280x800.png', 'tools/shots.html?n=3', 1280, 800, 7000, False),
    ('screenshot-4-1280x800.png', 'tools/shots.html?n=4', 1280, 800, 6000, False),
]

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

def png_size(path):
    with open(path, 'rb') as f:
        head = f.read(24)
    assert head[:8] == b'\x89PNG\r\n\x1a\n', 'không phải PNG'
    return struct.unpack('>II', head[16:24])

def main():
    browser = next((b for b in BROWSERS if os.path.isfile(b)), None)
    if not browser:
        sys.exit('Không tìm thấy Chrome/Edge')
    os.makedirs(OUT, exist_ok=True)
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    handler.log_message = lambda *a: None
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    bad = 0
    with tempfile.TemporaryDirectory() as prof:
        for name, page, w, h, budget, transparent in JOBS:
            out = os.path.join(OUT, name)
            if os.path.exists(out):
                os.remove(out)
            cmd = [browser, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                   f'--user-data-dir={prof}', f'--window-size={w},{h}', f'--virtual-time-budget={budget}',
                   f'--screenshot={out}', f'http://127.0.0.1:{PORT}/{page}']
            if transparent:
                cmd.insert(2, '--default-background-color=00000000')
            subprocess.run(cmd, capture_output=True, timeout=180)
            if not os.path.exists(out):
                print(f'LỖI  {name}: không tạo được'); bad += 1; continue
            size = png_size(out)
            ok = size == (w, h)
            bad += not ok
            print(f'{"OK " if ok else "SAI"}  {name}: {size[0]}x{size[1]} (yêu cầu {w}x{h})')
    srv.shutdown()
    sys.exit(1 if bad else 0)

if __name__ == '__main__':
    main()
