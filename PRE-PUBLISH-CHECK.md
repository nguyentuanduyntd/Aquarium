# Pre-publish check – Tab Aquarium

Kiểm tra ngày 10/11/2026, trên thư mục `d:\tab-aquarium` (gốc repo, 47 file đang được git theo dõi).

## ⚠️ Phát hiện trước tiên: dự án đã public trên GitHub

- Thư mục này **đã là repo git**, có 1 commit (`9779c61 push`) và **đã được đẩy** lên `https://github.com/nguyentuanduyntd/Aquarium` (nhánh `master`).
- Repo đó đang **public**: toàn bộ 47 file, kể cả `store-submission/tab-aquarium-v1.0.0.zip` và các placeholder `{{...}}`, đã ai cũng xem được.
- Chưa bật GitHub Pages (`has_pages: false`), chưa có mô tả repo. Chưa có repo nào tên `tab-aquarium`.
- Kế hoạch ban đầu là tạo repo **mới** `tab-aquarium` dùng nhánh `main`. Cần bạn quyết định dùng repo nào (xem câu hỏi cuối file).

## Kết quả từng mục

### 1. Thông tin cá nhân lộ ra – ✅ (1 ghi chú)
| Tìm | Kết quả |
|---|---|
| Địa chỉ email | Không có trong file nào |
| Số điện thoại | Không có |
| Đường dẫn máy (`C:\Users\`, `/Users/`, `/home/`) | Không có |
| Token / API key / mật khẩu | Không có. Chữ "passwords" chỉ xuất hiện trong câu privacy policy ("does not read … passwords"), không phải bí mật |
| Tên tài khoản | Không có trong file. **Ghi chú:** lịch sử git công khai tên tác giả commit là `Kevin <nguyentuanduyntd>`, và username GitHub `nguyentuanduyntd` nằm trong URL repo. Đây là thông tin bạn tự đặt khi commit/push, không nằm trong code |

### 2. Placeholder còn sót – ✅ (đã xử lý)
Lần kiểm tra đầu thấy placeholder email và website trong privacy policy, listing và `tools/publish-config.json`. Đã điền email hỗ trợ `mrduynguyen2005@gmail.com` (bạn chủ động cung cấp, hợp lệ) và website `https://nguyentuanduyntd.github.io/Aquarium/`. `tools/make_listing.py` nay đọc 2 giá trị này từ `tools/publish-config.json`. Quét lại toàn repo: **không còn chuỗi `{{...}}` nào**.

### 3. File không nên đưa lên – ✅ (zip cũ còn trong lịch sử)
| File | Trạng thái |
|---|---|
| `store-submission/tab-aquarium-v1.0.0.zip` | ✅ Đã thêm `.gitignore` và `git rm --cached`, không còn trong các commit mới. Bản cũ vẫn nằm trong commit `9779c61` (không force push). Không chứa bí mật (chỉ là bản đóng gói của chính code), nhưng là file build. Thêm vào `.gitignore` chỉ ngăn các commit sau; muốn xoá khỏi lịch sử phải viết lại lịch sử và force push, việc mà bạn đã dặn không làm. Đề xuất: `git rm --cached` để bỏ khỏi các commit tiếp theo, để nguyên lịch sử cũ. |
| `node_modules`, `.DS_Store`, `Thumbs.db`, `*.log` | Không có |
| Profile trình duyệt, ảnh chụp thử | Không có trong repo. Ảnh thử nghiệm nằm ở thư mục tạm ngoài dự án |
| `.gitignore` | ✅ Đã tạo |

Đề xuất `.gitignore`:
```gitignore
# Gói build – tạo lại bằng: python tools/build_zip.py
*.zip
dist/

# Hệ điều hành / editor
.DS_Store
Thumbs.db
desktop.ini
.vscode/
.idea/

# Log, phụ thuộc, file tạm
*.log
node_modules/
__pycache__/
*.tmp

# Profile trình duyệt dùng khi chụp ảnh tự động
prof*/
```

### 4. Tài sản bên thứ ba – ✅
| Tài sản | Nguồn gốc |
|---|---|
| Thư viện JS | Không có. Toàn bộ là code tự viết, không import từ CDN hay npm |
| Font | Không đóng gói font nào. CSS chỉ gọi tên font hệ thống (`Segoe UI`, `Nunito`, `system-ui`…) |
| Âm thanh | Không có file âm thanh. Âm thanh được tạo bằng Web Audio API (`engine/audio.js`) |
| Hình trong bể cá | Vẽ bằng Canvas 2D trong `engine/*.js` |
| `store-submission/logo-300x300.png`, `promo-*.png` | Vẽ bằng `tools/art.html`, dùng hàm vẽ cá của extension ✅ |
| `store-submission/screenshot-*.png` | Chụp bản demo bằng `tools/shots.html` + `tools/render_images.py` ✅ |
| `icons/icon16.png`, `icon32.png`, `icon48.png`, `icon128.png` | ✅ Tác giả xác nhận tự tạo (10/11/2026). Không có script tạo icon trong repo |
| Thuật toán nhiễu/băm (`engine/util.js`) | mulberry32, FNV-1a, value noise: thuật toán công khai phổ biến, không ràng buộc giấy phép |

### 5. Nhắc thương hiệu – ✅
- Tên extension "Tab Aquarium" và tên repo (`Aquarium` / `tab-aquarium`) không chứa thương hiệu nào.
- Không có file logo của YouTube, GitHub, Gmail, Outlook, Google, Microsoft, Chrome hay Edge trong dự án.
- Các chỗ nhắc bằng chữ, đều để mô tả chức năng:
  - `engine/fish.js` dòng 50–52: nhận diện tên miền youtube.com, github.com, mail/outlook để chọn loài cá.
  - `listing-en.md` / `listing-vi.md`: câu ví dụ "YouTube tabs are red fish…".
  - `ui/settings.html`: `edge://`. `README.md`: hướng dẫn cài trên Edge/Chrome.
  - `chrome.*` trong code là tên API bắt buộc của tiện ích, không phải nhắc thương hiệu.
- Topic `chrome-extension` dự định thêm vào repo GitHub: chấp nhận được trên GitHub (chính sách 1.1.2 chỉ áp dụng cho extension và listing trên store).

### 6. Privacy policy khớp với code – ✅
| Nội dung policy | Code thực tế |
|---|---|
| Không gửi dữ liệu, không kết nối mạng | Không có `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` nào trong `background.js`, `engine/`, `shared/`, `ui/` |
| Không analytics, không quảng cáo, không mã từ xa | Không có script ngoài; Manifest V3, không có `content_scripts` hay URL bên ngoài |
| URL/tiêu đề chỉ đọc, không lưu | `engine/data.js` đọc `chrome.tabs.query` vào bộ nhớ; không ghi URL/tiêu đề vào storage |
| Lưu thời điểm xem theo số hiệu tab | `background.js`: `lastActive` = `{tabId: thời điểm}` trong `storage.local` |
| 4 chỉ số trang, chỉ đọc | `background.js` hàm `probe()`: heap, số DOM, số resource, số video/canvas/iframe; chỉ chạy với `http(s)` |
| Ghi chú tab đang mở trong `storage.session` | `background.js`: `activeByWindow` trong `chrome.storage.session` |
| Đóng tab thì xoá dữ liệu tab đó | `background.js`: `onRemoved` xoá `lastActive[tabId]` và `memory[tabId]` |
| Favicon qua dịch vụ nội bộ | `engine/data.js`: `chrome.runtime.getURL('/_favicon/')` |

Ghi chú: yêu cầu ghi "dữ liệu chỉ ở `chrome.storage.local`", nhưng code còn dùng `chrome.storage.session` cho một ghi chú tạm (tự xoá khi đóng trình duyệt). Policy đã nêu rõ điều này nên vẫn khớp.

### 7. License – ✅
Đã tạo `LICENSE`: MIT, © 2026 DUYIT.

## Tóm tắt

| # | Mục | Kết quả |
|---|---|---|
| – | Repo | ✅ Dùng tiếp `nguyentuanduyntd/Aquarium` (public, nhánh `master`) |
| 1 | Thông tin cá nhân | ✅ |
| 2 | Placeholder | ✅ Đã điền hết |
| 3 | File không nên đưa lên | ✅ (zip cũ còn trong lịch sử commit đầu) |
| 4 | Tài sản bên thứ ba | ✅ |
| 5 | Thương hiệu | ✅ |
| 6 | Privacy policy khớp code | ✅ |
| 7 | License | ✅ MIT |

Công cụ: **GitHub CLI (`gh`) chưa được cài** trên máy (không chỉ là chưa đăng nhập). Git đẩy được lên GitHub, nên thông tin đăng nhập git đã có sẵn trên máy.
