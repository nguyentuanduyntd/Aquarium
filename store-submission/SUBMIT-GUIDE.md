# Hướng dẫn nộp Tab Aquarium lên Microsoft Edge Add-ons

Toàn bộ quá trình **miễn phí**. Làm theo đúng thứ tự màn hình của Partner Center. Mỗi bước ghi rõ dán file nào vào ô nào.

> Tài liệu chính thức đã đối chiếu ngày 10/11/2026 (nguồn ở cuối file). Partner Center có thể đổi giao diện; nếu tên ô khác một chút, tìm ô có ý nghĩa tương đương.

## Chuẩn bị trước (khoảng 15 phút)

1. **Đưa chính sách quyền riêng tư lên mạng** (Partner Center chỉ nhận link, không nhận file):
   1. Mở `privacy-policy.html`, thay cả hai chỗ `{{EMAIL}}` bằng email liên hệ của bạn.
   2. Tạo repo **công khai** trên github.com (ví dụ `tab-aquarium`), upload file đó và đổi tên thành `index.html`.
   3. Settings → Pages → Source: *Deploy from a branch*, Branch: `main`, thư mục `/ (root)` → Save. Sau 1–2 phút có link `https://<tên-github>.github.io/tab-aquarium/`.
2. Link GitHub Pages ở trên có thể dùng luôn làm **website** (`{{HOMEPAGE_URL}}`). Microsoft yêu cầu website phải là trang của bạn, không được là trang listing trên store.
3. (Tuỳ chọn) Điền `homepage_url` và `author_email` vào `tools/publish-config.json`, rồi chạy `python tools/build_zip.py` để tạo lại zip có 2 thông tin này. Bỏ qua bước này thì zip hiện tại vẫn hợp lệ.
4. Thay `{{EMAIL}}` và `{{HOMEPAGE_URL}}` trong `listing-en.md` và `listing-vi.md`.

## Bước 1 – Đăng ký tài khoản nhà phát triển

1. Mở trang **Register as a developer** (https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account), bấm link đăng ký Partner Center trong trang đó và đăng nhập bằng **tài khoản Microsoft cá nhân** (Outlook/Hotmail/Live). Tài khoản công ty hoặc trường học **không** dùng được.
2. **Account type: Individual** (cá nhân). ⚠️ Chọn xong **không đổi được** về sau.
3. **Publisher display name** (tối đa 50 ký tự): tên này **hiện công khai** trên trang extension. Có thể dùng tên thật hoặc biệt danh, nhưng không dùng tên thương hiệu của người khác.
4. Điền địa chỉ liên hệ, đồng ý điều khoản → hoàn tất. Không mất phí đăng ký.

## Bước 2 – Create new extension → Packages

1. Trong dashboard Edge, bấm **Create new extension**.
2. Kéo thả **`tab-aquarium-v1.0.0.zip`** vào ô upload.
3. Đợi kiểm tra gói xong, xem lại: Name = *Tab Aquarium*, version 1.0.0, danh sách quyền khớp với `permissions-audit.md`, ngôn ngữ mặc định = English. → **Continue**.

## Bước 3 – Availability

- **Visibility:** **Public** (ai cũng tìm thấy). Chọn *Hidden* nếu chỉ muốn chia sẻ bằng link.
- **Markets:** để mặc định **All markets** (gồm cả thị trường mở sau này). → **Save draft**.

## Bước 4 – Properties

| Ô | Điền gì |
|---|---|
| Category | **Entertainment** (phương án 2: Productivity; lý do trong `listing-en.md`) |
| Website | `{{HOMEPAGE_URL}}` |
| Support contact details | `{{EMAIL}}` |
| Mature content | **Không** đánh dấu (extension không có nội dung người lớn) |
| Giá / mua trong ứng dụng | Extension miễn phí, không có tính năng trả phí. Nếu form có câu hỏi này thì chọn **No** |

→ **Save draft**.

## Bước 5 – Privacy

Mọi nội dung lấy từ **`permissions-justification.md`, mục 3**:

1. **Does your extension access, collect or transmit personal information?** → **Yes**. Extension có đọc URL và tiêu đề tab, dù chỉ xử lý trên máy. Khai "No" sai có thể bị trượt duyệt.
2. **Privacy policy URL:** dán link GitHub Pages ở phần Chuẩn bị.
3. **Single purpose description:** dán đoạn tương ứng.
4. **Permission justification:** mỗi permission một ô, dán đúng dòng trong bảng.
5. **Are you using remote code?** → **No**.
6. **Data usage:** tick các ô cam kết theo hướng dẫn trong file.

→ **Save draft**.

## Bước 6 – Store listings

### 6.1 English (mặc định)
Mở **`listing-en.md`**:

| Ô | Lấy từ |
|---|---|
| Description | mục *Description* (1759 ký tự; yêu cầu 250–10.000) |
| Extension Store logo | **`logo-300x300.png`** |
| Small promotional tile | **`promo-small-440x280.png`** |
| Large promotional tile | **`promo-large-1400x560.png`** |
| Screenshots | **`screenshot-1-1280x800.png`** → **`screenshot-4-1280x800.png`** theo đúng thứ tự |
| YouTube video URL | để trống |
| Search terms | 7 cụm trong bảng *Search terms*, mỗi cụm một ô |

*Name* và *Short description* tự lấy từ gói zip, không cần gõ.

### 6.2 Thêm tiếng Việt
1. Bấm **Add / manage languages** → chọn **Vietnamese** → Save.
2. Mở listing **Vietnamese**, làm như 6.1 nhưng dán từ **`listing-vi.md`**. Dùng lại cùng logo, promo tile và ảnh chụp (ảnh có chú thích tiếng Anh, giao diện tiếng Việt).

→ **Save draft**.

## Bước 7 – Submit

1. Bấm **Publish** (hoặc **Submit**).
2. Ô **Notes for certification:** dán nguyên văn khối trong **`permissions-justification.md`, mục 4** (250 từ, có hướng dẫn reviewer thử nhanh bằng nút "⚡ Thử nhanh").
3. Xác nhận gửi.

## Bước 8 – Theo dõi duyệt

- Trạng thái hiện trong dashboard: *In review* → *In certification* → *Published*.
- Microsoft ghi rằng việc duyệt **có thể mất tới 7 ngày làm việc**.
- **Nếu bị từ chối:**
  1. Đọc email từ Microsoft, có ghi rõ chính sách nào và bước nào chưa đạt.
  2. Sửa đúng chỗ đó. Nếu phải sửa code: tăng `version` trong `manifest.json` (ví dụ 1.0.1) rồi chạy `python tools/build_zip.py`.
  3. Vào extension trong dashboard → **Update** → upload zip mới hoặc sửa listing → ghi vào *Notes for certification* những gì đã sửa → **Publish** lại.
- Lý do bị từ chối hay gặp với extension này: quyền `<all_urls>`. Nếu reviewer hỏi, trả lời theo mục 2 của `permissions-justification.md`.

## Lưu ý

- Ảnh chụp màn hình dùng **1280×800** thay vì 1280×960, vì tài liệu Microsoft chỉ nhận 640×480 hoặc 1280×800 (tối đa 6 ảnh).
- Search terms giới hạn **tổng 21 từ** (không phải 30). Bản EN dùng 13 từ, bản VI dùng 17 từ.
- Theo chính sách 1.1.2, listing và giao diện không được nhắc tới trình duyệt khác, nên mô tả viết "the browser" thay vì "Chromium". Chữ "Chrome" trong giao diện đã được bỏ (xem `CHANGES.md`).
- Emoji trên các nút của giao diện trong ảnh chụp được vẽ bằng font Segoe UI Emoji của Windows. Dòng chú thích và các ảnh logo/promo **không** có emoji.

## ✅ Checklist những gì bạn còn phải tự điền

- [ ] `{{EMAIL}}` trong `privacy-policy.html` (2 chỗ) và `privacy-policy.md` (2 chỗ)
- [ ] `{{EMAIL}}` trong `listing-en.md` và `listing-vi.md` (mục Support contact)
- [ ] `{{HOMEPAGE_URL}}` trong `listing-en.md` và `listing-vi.md` (mục Website)
- [ ] `{{HOMEPAGE_URL}}` và `{{EMAIL}}` trong `tools/publish-config.json` (tuỳ chọn, rồi chạy lại `python tools/build_zip.py`)
- [ ] Link chính sách quyền riêng tư (sau khi đưa lên GitHub Pages)
- [ ] Publisher display name khi đăng ký tài khoản (hiện công khai)
- [ ] Xác nhận nguồn gốc bộ icon `icons/icon16–128.png` (tự tạo hay lấy từ đâu, có quyền dùng không)

## Nguồn

- Publish an extension: https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension
- Register as a developer: https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account
- Developer policies: https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies
