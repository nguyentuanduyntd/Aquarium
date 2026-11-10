# Thay đổi so với mã nguồn trước khi chuẩn bị nộp store

Không thay đổi logic chức năng. Chỉ sửa những gì cần để qua kiểm tra của Partner Center và chính sách Edge Add-ons.

## Trong đợt chuẩn bị này

| File | Thay đổi | Lý do |
|---|---|---|
| `manifest.json` | `description` đổi thành `__MSG_extDescription__`, thêm `"default_locale": "en"` | Partner Center lấy **Short description** từ manifest. Bản cũ chỉ có tiếng Việt nên listing tiếng Anh sẽ hiện mô tả tiếng Việt. |
| `_locales/en/messages.json` (mới) | Mô tả ngắn tiếng Anh (99 ký tự) | Như trên. |
| `_locales/vi/messages.json` (mới) | Mô tả ngắn tiếng Việt (91 ký tự, giữ nguyên câu cũ) | Như trên. |
| `ui/settings.html` | Bỏ chữ `chrome://` trong đoạn "Về bộ nhớ", chỉ giữ `edge://` | Chính sách 1.1.2: extension không được nhắc tới trình duyệt khác. |
| `engine/data.js` | Tên miền hiển thị của trang `edge://`/`chrome://` đổi từ `chrome` thành `trang hệ thống` | Cùng lý do: tooltip từng hiện chữ "chrome" cho trang hệ thống của Edge. |
| `tools/` (mới) | `build_zip.py`, `render_images.py`, `make_listing.py`, `art.html`, `shots.html`, `publish-config.json` | Script đóng gói, tạo ảnh và văn bản listing. Không nằm trong zip. |

## Đợt đưa lên GitHub

| File | Thay đổi |
|---|---|
| `manifest.json` | Thêm `"author": "DUYIT"` và `"homepage_url": "https://nguyentuanduyntd.github.io/Aquarium/"`. Đã nạp thử trong Edge, không lỗi |
| `store-submission/tab-aquarium-v1.0.0.zip` | Tạo lại vì manifest đổi. Không còn đưa lên git (`.gitignore`) |
| `store-submission/privacy-policy.*`, `listing-*.md` | Điền email hỗ trợ và website thật |
| `tools/publish-config.json`, `tools/make_listing.py` | Lưu email/website thật; listing đọc từ config thay vì placeholder |
| `docs/` (mới) | Trang GitHub Pages: giới thiệu ngắn + privacy policy (nội dung policy giữ nguyên) + ảnh |
| `README.md` | Viết lại: phần tiếng Anh ở trên, README tiếng Việt cũ giữ nguyên ở dưới |
| `LICENSE` (mới), `.gitignore` (mới) | MIT © 2026 DUYIT; bỏ qua file zip và file tạm |

## Đã làm trước đó (cùng phiên làm việc)

- `engine/main.js`: `DEV_KEYS = false` – tắt phím test 0–4 ở bản phát hành.
- `engine/data.js`: dữ liệu demo đổi sang tên trung tính và tên miền `*.example.com` (không dùng tên thương hiệu thật trong ảnh chụp).
- `engine/boat.js` + `engine/main.js`: thêm thuyền câu (kéo lưỡi câu vào cá → xác nhận → đóng tab).

## Đã kiểm tra

- `node --check` toàn bộ JS: đạt (xem `permissions-audit.md`).
- Nạp gói zip vào Microsoft Edge (headless, `--load-extension`): service worker chạy, trang bể cá mở bằng dữ liệu tab thật, **không có lỗi console**.
