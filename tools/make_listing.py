"""Sinh store-submission/listing-en.md và listing-vi.md, kèm số ký tự đếm tự động.

Chạy:  python tools/make_listing.py
Short description lấy thẳng từ _locales/<lang>/messages.json vì Partner Center đọc nó từ manifest.
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'store-submission')
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

def short_desc(lang):
    with open(os.path.join(ROOT, '_locales', lang, 'messages.json'), encoding='utf-8') as f:
        return json.load(f)['extDescription']['message']

EN_DESC = """Tab Aquarium turns the tabs you have open into a calm, living aquarium. Every tab is a fish, so you can see at a glance which tabs are heavy and which ones you have forgotten.

HOW IT WORKS
• Heavier tabs become bigger, rounder fish. The heaviest tab turns into a shark.
• Tabs you have not opened for a while get hungry: healthy, peckish, hungry, dying, and finally belly-up. You choose the time limits in Settings.
• Click a fish to feed it and jump straight to that tab.
• Scoop up a belly-up fish with the net, or press "Clean tank", to close forgotten tabs. You always confirm first.
• A small fishing boat drifts across the surface. Drag its hook onto a fish to reel it in and close that tab, again after a confirmation.
• The species depends on the website, so the same site always looks the same. For example, YouTube tabs are red fish, GitHub tabs are octopuses, and Outlook or Gmail tabs are flying fish carrying a letter. Pinned tabs are seahorses, and tabs in the same group swim together.
• The light follows your local time: sun rays by day, a warm sunset, and glowing jellyfish at night. Soft water sounds are optional.

ABOUT MEMORY
The browser does not let extensions read the real amount of RAM each tab uses. Tab Aquarium estimates how heavy a page is from its JavaScript heap, the number of page elements, loaded resources and media. The numbers are for comparing tabs with each other, not exact measurements.

PRIVACY: EVERYTHING STAYS ON YOUR DEVICE
Tab titles, addresses and timing data are stored only in the extension's local storage on your computer. Nothing is sent to any server. There are no accounts, no analytics and no ads. Uninstalling the extension deletes all of its data.

LANGUAGE
The interface is currently in Vietnamese."""

VI_DESC = """Tab Aquarium biến các tab bạn đang mở thành một bể cá sống động và thư giãn. Mỗi tab là một con cá, nhìn qua là biết tab nào đang nặng, tab nào đã bị bỏ quên.

CÁCH HOẠT ĐỘNG
• Tab càng nặng thì cá càng to, càng béo. Tab nặng nhất biến thành cá mập.
• Tab lâu không mở thì cá đói dần: khỏe, hơi đói, đói, sắp chết và cuối cùng lật bụng. Bạn tự chọn mốc thời gian trong phần Cài đặt.
• Click vào cá để cho cá ăn và chuyển ngay sang tab đó.
• Dùng vợt vớt cá lật bụng, hoặc bấm "Dọn bể", để đóng các tab bị bỏ quên. Luôn có bước xác nhận trước.
• Một chiếc thuyền câu trôi qua lại trên mặt nước. Kéo lưỡi câu chạm vào cá để câu cá lên và đóng tab đó, cũng sau một bước xác nhận.
• Loài cá được chọn theo trang web, nên cùng một trang luôn ra cùng một loài. Ví dụ tab YouTube là cá đỏ, tab GitHub là bạch tuộc, tab Outlook hoặc Gmail là cá chuồn ngậm phong thư. Tab ghim là cá ngựa, các tab cùng nhóm bơi theo đàn.
• Ánh sáng đổi theo giờ trên máy: ban ngày có tia nắng, hoàng hôn ngả cam, ban đêm có sứa phát sáng. Có thể bật thêm tiếng nước nhẹ.

VỀ BỘ NHỚ
Trình duyệt không cho tiện ích đọc dung lượng RAM thật của từng tab. Tab Aquarium ước tính độ nặng của trang từ bộ nhớ JavaScript, số phần tử trên trang, số tài nguyên đã tải và số video, khung nhúng. Con số dùng để so sánh các tab với nhau, không phải số đo chính xác. Các trang hệ thống không đo được nên dùng kích thước trung bình.

QUYỀN RIÊNG TƯ: MỌI DỮ LIỆU NẰM TRÊN MÁY BẠN
Tiêu đề, địa chỉ tab và thời gian xem chỉ được lưu trong bộ nhớ cục bộ của tiện ích trên máy bạn. Không có gì được gửi tới bất kỳ máy chủ nào. Không tài khoản, không thống kê người dùng, không quảng cáo. Gỡ tiện ích là toàn bộ dữ liệu bị xóa.

NGÔN NGỮ
Giao diện hiện bằng tiếng Việt."""

EN_TERMS = ['tab manager', 'aquarium', 'fish tank', 'close old tabs', 'tab memory', 'virtual pet', 'relaxing']
VI_TERMS = ['quản lý tab', 'bể cá', 'cá cảnh', 'đóng tab cũ', 'bộ nhớ tab', 'thú ảo', 'thư giãn']

LANGS = {
    'en': dict(
        title='Store listing – English (default)', desc=EN_DESC, terms=EN_TERMS,
        h=dict(name='Name', short='Short description', desc='Description', cat='Category', terms='Search terms', support='Support contact / website'),
        chars='characters', words='words', limit='limit',
        short_note='Partner Center reads this from the package (`_locales/en/messages.json`). To change it, edit that file and upload a new zip.',
        name_note='Partner Center reads this from `manifest.json`.',
        cat=('**Recommended: Entertainment.** Tab Aquarium is first of all a playful, ambient view of your tabs: animated fish, day/night light, sounds. '
             'Users browsing Entertainment expect this kind of visual toy, and the listing will not be compared with serious tab managers.\n\n'
             '**Option 2: Productivity.** Choose this if you want to emphasise the practical side: finding heavy tabs and closing forgotten ones.'),
        support_rows=[('Support contact', '{{EMAIL}}'), ('Website', '{{HOMEPAGE_URL}}')],
    ),
    'vi': dict(
        title='Store listing – Tiếng Việt', desc=VI_DESC, terms=VI_TERMS,
        h=dict(name='Name (Tên)', short='Short description (Mô tả ngắn)', desc='Description (Mô tả)', cat='Category (Danh mục)', terms='Search terms (Từ khóa tìm kiếm)', support='Support contact / website'),
        chars='ký tự', words='từ', limit='giới hạn',
        short_note='Partner Center lấy mục này từ gói cài (`_locales/vi/messages.json`). Muốn sửa thì sửa file đó rồi upload zip mới.',
        name_note='Partner Center lấy tên từ `manifest.json`.',
        cat=('**Đề xuất: Entertainment (Giải trí).** Tab Aquarium trước hết là một cách xem tab vui mắt: cá chuyển động, ngày đêm, âm thanh. '
             'Người tìm trong mục Giải trí mong đợi kiểu "đồ chơi trực quan" này, và extension không bị so sánh với các trình quản lý tab chuyên nghiệp.\n\n'
             '**Phương án 2: Productivity (Năng suất).** Chọn mục này nếu muốn nhấn mạnh mặt hữu ích: tìm tab nặng, đóng tab bị bỏ quên.\n\n'
             '_Danh mục chọn một lần ở bước Properties, áp dụng cho mọi ngôn ngữ._'),
        support_rows=[('Support contact', '{{EMAIL}}'), ('Website', '{{HOMEPAGE_URL}}')],
    ),
}

def block(text):
    return '```text\n' + text + '\n```'

def build(lang):
    L = LANGS[lang]
    name, short = 'Tab Aquarium', short_desc(lang)
    d = L['desc']
    words = sum(len(t.split()) for t in L['terms'])
    assert len(name) <= 45 and len(short) <= 132 and 250 <= len(d) <= 10000
    assert len(L['terms']) <= 7 and all(len(t) <= 30 for t in L['terms']) and words <= 21
    c = L['chars']
    out = [f'# {L["title"]}', '',
           f'## {L["h"]["name"]} — {len(name)}/45 {c}', '', block(name), '', L['name_note'], '',
           f'## {L["h"]["short"]} — {len(short)}/132 {c}', '', block(short), '', L['short_note'], '',
           f'## {L["h"]["desc"]} — {len(d)}/10000 {c} (min 250)', '', block(d), '',
           f'## {L["h"]["cat"]}', '', L['cat'], '',
           f'## {L["h"]["terms"]} — {len(L["terms"])}/7, {words}/21 {L["words"]}', '',
           '| # | Term | ' + c + ' |', '|---|---|---|']
    out += [f'| {i} | `{t}` | {len(t)}/30 |' for i, t in enumerate(L['terms'], 1)]
    out += ['', f'## {L["h"]["support"]}', '', '| | |', '|---|---|']
    out += [f'| {k} | `{v}` |' for k, v in L['support_rows']]
    path = os.path.join(OUT, f'listing-{lang}.md')
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(out) + '\n')
    print(f'{os.path.basename(path)}: name {len(name)}, short {len(short)}, description {len(d)}, terms {len(L["terms"])}/{words} words')

os.makedirs(OUT, exist_ok=True)
for lang in LANGS:
    build(lang)
