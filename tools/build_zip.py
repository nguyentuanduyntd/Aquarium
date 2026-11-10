"""Đóng gói Tab Aquarium để nộp lên Edge Add-ons.

Chạy từ thư mục gốc dự án:  python tools/build_zip.py
- Kiểm tra manifest.json (name, version, description <= 132 ký tự, icons)
- node --check mọi file .js
- Rà quyền: mỗi permission được dùng ở file/dòng nào -> store-submission/permissions-audit.md
- Tạo store-submission/tab-aquarium-v<version>.zip (manifest.json nằm ở gốc zip)

homepage_url / author chỉ được chèn vào manifest TRONG ZIP khi tools/publish-config.json
đã điền giá trị thật. Giữ placeholder {{...}} trong manifest sẽ làm trình duyệt từ chối
nạp extension (homepage_url phải là URL hợp lệ), nên placeholder không bao giờ vào zip.
"""
import json, os, re, subprocess, sys, zipfile, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'store-submission')
INCLUDE = ['manifest.json', 'background.js', '_locales', 'engine', 'shared', 'ui', 'icons']
SKIP_NAMES = {'.DS_Store', 'Thumbs.db', 'README.md'}

try:
    sys.stdout.reconfigure(encoding='utf-8')  # console Windows mặc định cp1252
except Exception:
    pass

errors, notes = [], []
os.chdir(ROOT)
os.makedirs(OUT, exist_ok=True)

def is_placeholder(v):
    return not v or '{{' in str(v)

# ---------- manifest ----------
with open('manifest.json', encoding='utf-8') as f:
    manifest = json.load(f)

def resolve(value, locale):
    m = re.fullmatch(r'__MSG_(\w+)__', value or '')
    if not m:
        return value
    with open(f'_locales/{locale}/messages.json', encoding='utf-8') as f:
        return json.load(f)[m.group(1)]['message']

if manifest.get('name') != 'Tab Aquarium':
    errors.append('name phải là "Tab Aquarium"')
if not re.fullmatch(r'\d+(\.\d+){0,3}', manifest.get('version', '')):
    errors.append('version thiếu hoặc sai định dạng')
locales = sorted(os.listdir('_locales')) if os.path.isdir('_locales') else []
desc_report = []
for loc in (locales or [None]):
    d = resolve(manifest.get('description', ''), loc) if loc else manifest.get('description', '')
    desc_report.append((loc or '-', len(d), d))
    if not d or len(d) > 132:
        errors.append(f'description ({loc}) dài {len(d)} ký tự, giới hạn 132')
if locales and manifest.get('default_locale') not in locales:
    errors.append('default_locale không khớp thư mục _locales')
for size in ('16', '32', '48', '128'):
    p = manifest.get('icons', {}).get(size)
    if not p or not os.path.isfile(p):
        errors.append(f'thiếu icon {size}px ({p})')

cfg = {}
if os.path.isfile('tools/publish-config.json'):
    with open('tools/publish-config.json', encoding='utf-8') as f:
        cfg = json.load(f)
zip_manifest = dict(manifest)
if not manifest.get('homepage_url'):
    if is_placeholder(cfg.get('homepage_url')):
        notes.append('homepage_url chưa điền (tools/publish-config.json) -> chưa đưa vào manifest trong zip')
    else:
        zip_manifest['homepage_url'] = cfg['homepage_url']
if not manifest.get('author'):
    if is_placeholder(cfg.get('author_email')):
        notes.append('author chưa điền (tools/publish-config.json) -> chưa đưa vào manifest trong zip')
    else:
        zip_manifest['author'] = {'email': cfg['author_email']}

# ---------- node --check ----------
js_files = []
for top in INCLUDE:
    if os.path.isfile(top) and top.endswith('.js'):
        js_files.append(top)
    elif os.path.isdir(top):
        for r, _, fs in os.walk(top):
            js_files += [os.path.join(r, x).replace('\\', '/') for x in fs if x.endswith('.js')]
js_results = []
for js in sorted(js_files):
    r = subprocess.run(['node', '--check', js], capture_output=True, text=True)
    js_results.append((js, r.returncode == 0, (r.stderr or '').strip().splitlines()[:1]))
    if r.returncode:
        errors.append(f'node --check lỗi: {js}')

# ---------- rà quyền ----------
PERM_PATTERNS = {
    'tabs': r'chrome\.tabs\.',
    'tabGroups': r'chrome\.tabGroups',
    'storage': r'chrome\.storage\.',
    'scripting': r'chrome\.scripting\.',
    'favicon': r'_favicon',
    'alarms': r'chrome\.alarms\.',
    '<all_urls>': r'chrome\.scripting\.executeScript',
}
src_files = sorted(set(js_files) | {p for p in ('ui/aquarium.html', 'ui/popup.html', 'ui/settings.html')})
hits = {k: [] for k in PERM_PATTERNS}
other_api = {}
for p in src_files:
    with open(p, encoding='utf-8') as f:
        for i, line in enumerate(f, 1):
            if line.lstrip().startswith(('//', '*', '/*')):
                continue  # bỏ qua dòng chú thích
            for k, pat in PERM_PATTERNS.items():
                if re.search(pat, line):
                    hits[k].append(f'{p}:{i}')
            for api in re.findall(r'chrome\.(\w+)', line):
                other_api.setdefault(api, set()).add(p)
declared = manifest.get('permissions', []) + manifest.get('host_permissions', [])
unused = [p for p in declared if p in hits and not hits[p]]
if unused:
    errors.append('permission khai báo nhưng không dùng: ' + ', '.join(unused))

def fmt_hits(lst):
    files = {}
    for h in lst:
        f, ln = h.rsplit(':', 1)
        files.setdefault(f, []).append(ln)
    return '<br>'.join(f'`{f}` (dòng {", ".join(v)})' for f, v in files.items()) or '**KHÔNG THẤY**'

audit = [f'# Permissions audit – Tab Aquarium v{manifest.get("version")}',
         '', f'Tạo tự động bởi `tools/build_zip.py` lúc {datetime.datetime.now():%Y-%m-%d %H:%M}.', '',
         '## 1. Kiểm tra manifest', '',
         f'- name: `{manifest.get("name")}`', f'- version: `{manifest.get("version")}`',
         f'- default_locale: `{manifest.get("default_locale")}`']
for loc, n, d in desc_report:
    audit.append(f'- description [{loc}]: {n}/132 ký tự – "{d}"')
audit.append('- icons 16/32/48/128: ' + ('đủ, file tồn tại' if not any('icon' in e for e in errors) else 'THIẾU'))
audit += ['', '## 2. `node --check`', '', '| File | Kết quả |', '|---|---|']
audit += [f'| `{f}` | {"OK" if ok else "LỖI " + " ".join(msg)} |' for f, ok, msg in js_results]
audit += ['', '## 3. Quyền khai báo và nơi sử dụng', '', '| Permission | Dùng ở |', '|---|---|']
audit += [f'| `{p}` | {fmt_hits(hits.get(p, []))} |' for p in declared]
audit += ['', '## 4. Mọi API `chrome.*` được gọi', '', '| API | File |', '|---|---|']
audit += [f'| `chrome.{a}` | {", ".join(f"`{x}`" for x in sorted(fs))} |' for a, fs in sorted(other_api.items())]
audit += ['', '`chrome.runtime`, `chrome.action`, `chrome.windows` không cần khai báo permission.', '',
          '## 5. Ghi chú', '',
          '- `tabs`: vì đã có host permission `<all_urls>`, trình duyệt vẫn trả về `url`/`title` của tab ngay cả khi bỏ `tabs`. '
          'Giữ `tabs` để chức năng không phụ thuộc vào việc người dùng có thu hẹp quyền truy cập trang hay không '
          '(trong cài đặt tiện ích, người dùng có thể đổi "On all sites" thành "On click"). Nếu reviewer yêu cầu tối giản, đây là quyền có thể cân nhắc bỏ.']
audit += [f'- {n}' for n in notes]
audit += ['', '## 6. Kết quả', '', ('**ĐẠT** – không có lỗi.' if not errors else '**LỖI:**\n' + '\n'.join(f'- {e}' for e in errors))]
with open(os.path.join(OUT, 'permissions-audit.md'), 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(audit) + '\n')

if errors:
    print('LỖI:\n' + '\n'.join(errors))
    sys.exit(1)

# ---------- zip ----------
zpath = os.path.join(OUT, f'tab-aquarium-v{manifest["version"]}.zip')
names = []
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('manifest.json', json.dumps(zip_manifest, ensure_ascii=False, indent=2) + '\n')
    names.append('manifest.json')
    for top in INCLUDE[1:]:
        if os.path.isfile(top):
            z.write(top, top); names.append(top)
            continue
        for r, dirs, fs in os.walk(top):
            dirs[:] = sorted(d for d in dirs if not d.startswith('.'))
            for x in sorted(fs):
                if x.startswith('.') or x in SKIP_NAMES:
                    continue
                p = os.path.join(r, x)
                arc = '/'.join(p.split(os.sep))
                z.write(p, arc); names.append(arc)
print(f'OK  {os.path.relpath(zpath, ROOT)}  ({len(names)} file, {os.path.getsize(zpath)//1024} KB)')
for n in notes:
    print('GHI CHÚ:', n)
