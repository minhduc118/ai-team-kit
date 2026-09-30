---
name: sep-archive
description: Bước 6/6 quy trình SEP — đóng (archive) một OpenSpec change đã test PASS và được duyệt, merge specs delta vào spec gốc openspec/specs/, lưu bài học vào knowledge base qua MCP server "sep". Dùng khi user gõ /sep-archive (kèm tên change hoặc dùng change đang làm).
disable-model-invocation: true
---

# /sep-archive — Bước 6/6: Đóng change + cập nhật spec gốc

Quy trình SEP: spec → brainstorm → verify-spec → apply → test → **archive**.
Tên change = phần chữ user gõ sau `/sep-archive`; bỏ trống = change đang làm (📌).

## Luật chung SEP
- Chỉ ghi file trong `openspec/` bằng tool MCP `sep_*` — không tạo/sửa tay (kể cả `openspec/specs/`).
- Không bỏ qua bước. Tool trả lỗi ⛔ → dừng, báo user lệnh cần chạy trước (hoặc bước chưa được duyệt).
- Không thấy tool `sep_*` → bảo user chạy `npm run sep -- install` rồi khởi động lại IDE.
- Trả lời tiếng Việt; thuật ngữ kỹ thuật giữ tiếng Anh.

## Các bước
1. Gọi `sep_xem_change`. Test chưa PASS hoặc chưa duyệt → dừng, bảo user hoàn tất `/sep-test`.
2. Tóm tắt change cho user: chức năng, file code chính đã đổi, kết quả test, các Requirement sẽ merge vào
   `openspec/specs/<capability>/spec.md` (ADDED/MODIFIED/REMOVED). Hỏi xác nhận đóng change.
3. Gọi `sep_chuyen_trang_thai` với `trangThai: "archived"` — tool tự merge specs delta vào spec gốc và commit.
   Kết quả có cảnh báo ⚠️ merge (specs không đúng định dạng delta, MODIFIED không tìm thấy…) → báo lại cho user.
4. Đề xuất lưu tri thức cho team (hỏi user trước khi lưu):
   - Đọc `improvements.md` của change (đề xuất cải tiến ghi qua các lần duyệt).
   - Bug/khó khăn đáng nhớ → `luu_bai_hoc`. Quyết định kiến trúc → đề xuất ADR.
   - Phiên làm việc → `luu_phien_lam_viec`.
5. Kết quả tool báo "chưa push" → nhắc `git push` trong thư mục `team-ai-knowledge` để TeamSpec cập nhật.

## Kết thúc
"🎉 Change đã hoàn tất 6/6 bước, được archive và spec gốc đã cập nhật."
