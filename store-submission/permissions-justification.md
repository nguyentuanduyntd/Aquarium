# Giải trình quyền – Tab Aquarium v1.0.0

Dùng cho bước **Privacy** (từng ô justification) và ô **Notes for certification** khi Submit.
Bảng đối chiếu từng quyền với dòng code cụ thể nằm trong `permissions-audit.md`.

## 1. Bảng quyền

| Permission | Vì sao cần | Dữ liệu có rời khỏi máy không? |
|---|---|---|
| `tabs` | Đọc danh sách tab (tiêu đề, URL, trạng thái active/pinned/audible/discarded) để vẽ mỗi tab thành một con cá. Chuyển sang tab khi người dùng click cá, và đóng tab khi người dùng xác nhận vớt/câu cá. | Không |
| `tabGroups` | Đọc tên và màu nhóm tab để các cá cùng nhóm bơi theo đàn, có viền màu của nhóm. | Không |
| `storage` | Lưu cục bộ thời điểm xem gần nhất của từng tab, chỉ số độ nặng ước tính và cài đặt người dùng. | Không |
| `scripting` | Chạy một hàm chỉ đọc trên trang để lấy 4 chỉ số kỹ thuật dùng ước tính độ nặng tab (xem mục 2). | Không |
| `favicon` | Hiện biểu tượng trang web trên thân cá, lấy từ dịch vụ favicon nội bộ của trình duyệt. | Không |
| `alarms` | Cập nhật thời gian xem và chỉ số độ nặng mỗi 30 giây khi service worker đang nghỉ. | Không |
| Host permission `<all_urls>` | Cần cho `chrome.scripting.executeScript` trên mọi trang http/https mà người dùng mở, để ước tính độ nặng của từng tab. | Không |

## 2. Riêng về `<all_urls>` + `scripting`

- Chỉ có **một** chỗ inject: hàm `probe()` trong `background.js`, được gọi qua `chrome.scripting.executeScript({ target: { tabId }, func: probe })`.
- `probe()` chỉ trả về 4 con số:
  - `performance.memory.usedJSHeapSize`: bộ nhớ JS đang dùng
  - `document.getElementsByTagName('*').length`: số phần tử DOM
  - `performance.getEntriesByType('resource').length`: số tài nguyên đã tải
  - `document.querySelectorAll('video,canvas,iframe').length`: số phần tử media
- Hàm **không** đọc chữ trên trang, ô nhập liệu, cookie hay mật khẩu, **không** sửa DOM, **không** thêm listener, **không** tải mã từ xa.
- Chỉ chạy trên `http:` / `https:`. Trang hệ thống và trang cửa hàng bị bỏ qua.
- Extension không có content script khai báo sẵn và không có kết nối mạng nào.

## 3. Các ô ở bước Privacy

Dán từng ô sau:

**Single purpose description**
```text
Shows your open browser tabs as fish in an animated aquarium, so you can see which tabs are heavy or forgotten and switch to or close them.
```

**Permission justifications**

| Ô | Nội dung dán |
|---|---|
| tabs | `Reads the list of open tabs (title, URL, active/pinned/audible/discarded state) to draw one fish per tab, switch to a tab when its fish is clicked, and close a tab after the user confirms.` |
| tabGroups | `Reads tab group names and colors so fish of the same group swim together and show the group color.` |
| storage | `Stores, on the device only, when each tab was last viewed, the estimated tab weight, and the user's settings.` |
| scripting | `Injects one read-only function into http/https tabs that returns four numbers (JS heap size, DOM element count, resource count, media element count) to estimate how heavy each tab is. It does not read page content or change the page.` |
| favicon | `Shows each website's icon on its fish using the browser's built-in local favicon service.` |
| alarms | `Refreshes last-viewed times and weight estimates every 30 seconds.` |
| Host permissions (`<all_urls>`) | `Required by the scripting permission to run the read-only weight probe on any http/https tab the user has open. No content is read, modified or transmitted.` |

**Are you using remote code?** → **No** (toàn bộ code nằm trong gói, Manifest V3).

**Data usage:** tick đủ các ô cam kết của Microsoft, gồm: không bán dữ liệu cho bên thứ ba, không dùng/chuyển dữ liệu cho mục đích ngoài chức năng chính, không dùng để xét tín dụng/cho vay. Ở phần loại dữ liệu, nếu form hỏi extension có xử lý dữ liệu nào không, chọn **Web history** (đọc URL/tiêu đề tab) và **Website content** (4 chỉ số kỹ thuật), kèm ghi chú "processed locally only, never transmitted". Đây cũng là lý do nên khai có chính sách quyền riêng tư.

## 4. Notes for certification (dán nguyên văn)

```text
Tab Aquarium shows the user's open tabs as animated fish in a local aquarium page (toolbar popup and a full-page view). No account, server, network requests, analytics or remote code.

Permissions:
- tabs / tabGroups: read tab titles, URLs and group info to draw one fish per tab, switch to a tab when its fish is clicked, and close a tab only after the user confirms.
- storage / alarms: keep last-viewed times and settings on the device and refresh every 30 seconds.
- scripting + <all_urls>: on http/https tabs, background.js injects one read-only function (probe) that returns four numbers: JS heap size, DOM element count, resource count and media element count. They are used to estimate tab weight. It does not read page content and does not modify pages.
- favicon: shows site icons through the browser's local favicon service.

The interface is in Vietnamese. Quick test:
1. Open a few websites, then click the toolbar icon. Use "⛶ Toàn màn hình" (Full screen) for the large view.
2. Click the gear icon (Settings), click the "⚡ Thử nhanh (1 · 2 · 3 · 4 phút)" (Quick test) preset, then "💾 Lưu cài đặt" (Save).
3. Leave the other tabs unopened for 4 minutes. Their fish get hungry and float belly-up.
4. Click a belly-up fish, press "🧹 Dọn bể" (Clean tank), or drag the boat's fishing hook onto a fish. A confirmation dialog always appears before any tab is closed.
"↺ Mặc định" (Defaults) restores normal timings.
```
