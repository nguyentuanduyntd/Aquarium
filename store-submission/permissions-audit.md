# Permissions audit – Tab Aquarium v1.0.0

Tạo tự động bởi `tools/build_zip.py` lúc 2026-11-10 17:55.

## 1. Kiểm tra manifest

- name: `Tab Aquarium`
- version: `1.0.0`
- default_locale: `en`
- description [en]: 99/132 ký tự – "Turn your open tabs into a living aquarium. Heavy tabs become big fish, tabs you ignore get hungry."
- description [vi]: 91/132 ký tự – "Biến các tab đang mở thành một bể cá sống động. Tab nặng thì cá béo, tab bỏ lâu thì cá đói."
- icons 16/32/48/128: đủ, file tồn tại

## 2. `node --check`

| File | Kết quả |
|---|---|
| `background.js` | OK |
| `engine/audio.js` | OK |
| `engine/boat.js` | OK |
| `engine/data.js` | OK |
| `engine/decor.js` | OK |
| `engine/fish.js` | OK |
| `engine/main.js` | OK |
| `engine/particles.js` | OK |
| `engine/scene.js` | OK |
| `engine/ui.js` | OK |
| `engine/util.js` | OK |
| `shared/settings.js` | OK |
| `ui/settings.js` | OK |

## 3. Quyền khai báo và nơi sử dụng

| Permission | Dùng ở |
|---|---|
| `tabs` | `background.js` (dòng 21, 38, 52, 58, 66, 70, 99, 142, 156)<br>`engine/data.js` (dòng 23, 53, 113, 124)<br>`engine/main.js` (dòng 513, 514, 515) |
| `tabGroups` | `engine/data.js` (dòng 43, 55) |
| `storage` | `background.js` (dòng 12, 25, 40, 47, 48, 55, 62, 75, 86, 103, 151)<br>`engine/data.js` (dòng 45, 54, 129)<br>`shared/settings.js` (dòng 37)<br>`ui/settings.js` (dòng 36) |
| `scripting` | `background.js` (dòng 128) |
| `favicon` | `engine/data.js` (dòng 71) |
| `alarms` | `background.js` (dòng 17, 81) |
| `<all_urls>` | `background.js` (dòng 128) |

## 4. Mọi API `chrome.*` được gọi

| API | File |
|---|---|
| `chrome.action` | `background.js` |
| `chrome.alarms` | `background.js` |
| `chrome.runtime` | `background.js`, `engine/data.js`, `engine/main.js` |
| `chrome.scripting` | `background.js` |
| `chrome.storage` | `background.js`, `engine/data.js`, `shared/settings.js`, `ui/settings.js` |
| `chrome.tabGroups` | `engine/data.js` |
| `chrome.tabs` | `background.js`, `engine/data.js`, `engine/main.js` |
| `chrome.windows` | `engine/data.js`, `engine/main.js` |

`chrome.runtime`, `chrome.action`, `chrome.windows` không cần khai báo permission.

## 5. Ghi chú

- `tabs`: vì đã có host permission `<all_urls>`, trình duyệt vẫn trả về `url`/`title` của tab ngay cả khi bỏ `tabs`. Giữ `tabs` để chức năng không phụ thuộc vào việc người dùng có thu hẹp quyền truy cập trang hay không (trong cài đặt tiện ích, người dùng có thể đổi "On all sites" thành "On click"). Nếu reviewer yêu cầu tối giản, đây là quyền có thể cân nhắc bỏ.

## 6. Kết quả

**ĐẠT** – không có lỗi.
