---
name: sep-status
description: Xem nhanh tiến độ quy trình SEP — danh sách change của mình (hoặc cả team), change đang làm và việc cần làm tiếp theo; chọn change đang làm. Dùng khi user gõ /sep-status (tuỳ chọn kèm tên change, "all", hoặc "chọn <change>").
disable-model-invocation: true
---

# /sep-status — Tiến độ SEP

Không thuộc 6 bước; chỉ đọc (trừ khi chọn change đang làm). Trả lời tiếng Việt.

## Cách làm
- `/sep-status` → `sep_danh_sach_change` (change của mình). 📌 = change đang làm.
- `/sep-status all` → `sep_danh_sach_change` với `assignee: "*"`.
- `/sep-status <change>` → `sep_xem_change` với tên đó.
- `/sep-status chọn <change>` → `sep_chon_change`, sau đó các lệnh `/sep-*` có thể bỏ trống tên change.
- Không thấy tool `sep_*` → bảo user chạy `npm run sep -- install` rồi khởi động lại IDE.

## Trình bày
Hiện nguyên bảng từ tool, rồi nói rõ **một** việc nên làm tiếp theo (lệnh `/sep-*` hoặc "duyệt bước X").
Có change bị chặn vì bỏ bước → nêu bước còn thiếu và lệnh cần chạy.
