# 🐠 Tab Aquarium

Extension cho Microsoft Edge (và các trình duyệt nhân Chromium) biến các tab đang mở thành một bể cá sống động. Mỗi tab là một con cá:

- Tab nặng (ngốn nhiều bộ nhớ) thì cá to và béo. Tab nặng nhất (≥ 400 MB) biến thành **cá mập** và thỉnh thoảng đuổi cá nhỏ.
- Tab bỏ lâu không mở thì cá đói dần qua 5 trạng thái: 😊 Khỏe → 😋 Hơi đói → 😟 Đói → 😵 Sắp chết → 💀 Lật bụng.
- Đóng tab thì cá vẫy chào 👋 rồi bơi ra khỏi bể. Mở tab mới thì cá rơi "tõm" xuống nước.

## Cài đặt

1. Giải nén file zip ra một thư mục.
2. Mở Edge, vào `edge://extensions` (Chrome: `chrome://extensions`).
3. Bật **Developer mode**.
4. Bấm **Load unpacked** rồi chọn thư mục `tab-aquarium` vừa giải nén.
5. Ghim icon cá hề lên thanh công cụ để mở nhanh.

Chạy được trên Chrome, Edge, Brave và các trình duyệt nhân Chromium khác.

## Cách dùng

| Thao tác | Kết quả |
|---|---|
| Rê chuột lên cá | Hiện thẻ thông tin: tiêu đề, tên miền, bộ nhớ, thời gian không mở, trạng thái |
| Click cá | Thả thức ăn, cá lao lên đớp rồi chuyển sang tab đó |
| Click cá lật bụng | Hỏi xác nhận, rồi một cái vợt thò xuống vớt cá và đóng tab |
| Nút 🧹 Dọn bể | Vớt hết cá lật bụng (có danh sách để xác nhận trước) |
| Kéo lưỡi câu của thuyền chạm vào cá | Cá cắn câu, hỏi xác nhận, rồi bị kéo lên thuyền và đóng tab |
| Click vào nước | Gợn sóng lan ra, cá gần đó giật mình bơi tránh |
| Rê chuột chậm trong nước | Cá tò mò bơi theo |
| ⛶ Toàn màn hình | Mở bể cá cỡ lớn kèm bảng thống kê |
| ⚙️ Cài đặt | Chỉnh ngưỡng đói, âm thanh, ánh sáng ngày/đêm |

**Thử nhanh:** vào Cài đặt, bấm "⚡ Thử nhanh (1 · 2 · 3 · 4 phút)" rồi Lưu. Sau 4 phút không mở, tab sẽ lật bụng. Bấm "Mặc định" để quay lại.

## Các loài cá

- Loài cá được chọn theo tên miền, nên cùng một trang web luôn ra cùng một loài: cá hề, cá thần tiên, cá betta, cá nóc, cá vàng, cá đuôi gai, cá đuối.
- Một số trang có loài riêng: YouTube là cá đỏ, GitHub là bạch tuộc, Gmail và Outlook là cá chuồn ngậm phong thư.
- Tab ghim (pinned) là cá ngựa đứng gần rong biển.
- Tab cùng Tab Group bơi theo đàn, có viền màu theo màu nhóm.
- Tab đang phát âm thanh nhả nốt nhạc ♪. Tab trình duyệt cho ngủ (discarded) có chữ "z".
- Tab đang xem có quầng sáng và lấp lánh.

Ánh sáng đổi theo giờ thật trên máy. Ban ngày có tia nắng, hoàng hôn ngả cam, ban đêm có sứa phát sáng và cửa sổ lâu đài sáng đèn.

## Về bộ nhớ

Trình duyệt **không** cho extension đọc RAM thật của từng tab (API `chrome.processes` chỉ có ở bản Dev). Vì vậy Tab Aquarium **ước tính** độ nặng từ:

- JS heap (`performance.memory`)
- số phần tử DOM
- số tài nguyên đã tải
- số video/canvas/iframe trên trang

Chỉ số được cập nhật mỗi 30 giây. Các trang hệ thống (`edge://`, `chrome://`), cửa hàng tiện ích hay trình xem PDF không đo được nên dùng kích thước trung bình. Con số dùng để so sánh tương đối giữa các tab, không phải số RAM chính xác.

## Quyền truy cập & quyền riêng tư

- `tabs`, `tabGroups`: đọc danh sách tab, chuyển và đóng tab khi bạn yêu cầu.
- `scripting` + quyền trên mọi trang: chạy một đoạn đo nhỏ (chỉ đọc số liệu) để ước tính độ nặng.
- `storage`, `alarms`: lưu thời gian xem gần nhất và cài đặt, cập nhật định kỳ.
- `favicon`: hiện favicon trên thân cá.

Toàn bộ dữ liệu nằm trong máy bạn, không gửi đi đâu.

## Cấu trúc

```
manifest.json
background.js          service worker: thời gian xem, đo bộ nhớ, badge
shared/settings.js     ngưỡng đói, định dạng thời gian
engine/scene.js        nước, tia nắng, caustics, cát, mặt nước, kính
engine/decor.js        đá, lâu đài, san hô, rương kho báu, hải quỳ, rong, sứa
engine/fish.js         vẽ cá procedural + hành vi bơi (boids)
engine/boat.js         thuyền câu: kéo lưỡi câu để câu cá (đóng tab)
engine/particles.js    bong bóng, phù du, giọt nước, nốt nhạc
engine/audio.js        âm thanh Web Audio
engine/data.js         dữ liệu tab (thật hoặc demo)
engine/main.js         vòng lặp chính, tương tác, thống kê
ui/                    popup, trang toàn màn hình, cài đặt
```

Mọi hình ảnh đều vẽ bằng code (Canvas 2D), không dùng thư viện ngoài hay file ảnh, ngoài bộ icon.

Mở `ui/aquarium.html` qua một web server cục bộ (không cài làm extension) sẽ chạy **chế độ demo** với dữ liệu tab giả lập, tiện để chỉnh giao diện.

**Phím test (dành cho nhà phát triển):** đặt `DEV_KEYS = true` trong `engine/main.js` rồi bấm `1`–`4` để ép cả bể sang Hơi đói / Đói / Sắp chết / Lật bụng, `0` hoặc `Esc` để về bình thường. Luôn để `false` trong bản đăng store.
