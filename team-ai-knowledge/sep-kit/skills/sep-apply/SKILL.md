---
name: sep-apply
description: Bước 4/6 quy trình SEP — code chức năng theo tasks.md của một OpenSpec change, tick từng task qua MCP server "sep". Dùng khi user gõ /sep-apply (kèm tên change hoặc dùng change đang làm).
disable-model-invocation: true
---

# /sep-apply — Bước 4/6: Code theo tasks.md

Quy trình SEP: spec → brainstorm → verify-spec → **apply** → test → archive.
Tên change = phần chữ user gõ sau `/sep-apply`; bỏ trống = change đang làm (📌).

## Luật chung SEP
- Chỉ ghi file trong `openspec/changes/` bằng tool MCP `sep_*` — không tạo/sửa tay.
- Không bỏ qua bước. Tool trả lỗi ⛔ → dừng, báo user lệnh cần chạy trước (hoặc bước chưa được duyệt).
- **Gate duyệt**: cuối bước, tóm tắt và hỏi user **Approve / Reject**. Chỉ gọi `sep_duyet_buoc` sau khi user trả lời.
- Không thấy tool `sep_*` → bảo user chạy `npm run sep -- install` rồi khởi động lại IDE.
- Trả lời tiếng Việt; thuật ngữ kỹ thuật giữ tiếng Anh.

## Các bước
1. Gọi `sep_chuyen_trang_thai` với `trangThai: "apply"`.
   Bị từ chối ⛔ → dừng, báo bước còn thiếu/chưa duyệt và lệnh cần chạy. **Không code.**
   (Báo "đã ở bước apply" → đang làm tiếp, sang bước 2.)
2. Đọc `specs.md`, `design-brief.md` (nếu có), mọi file `review/*.md`, `tasks.md` của change.
3. Làm lần lượt từng task `- [ ]` trong repo code của dự án:
   - Bám sát specs; xử lý các vấn đề HIGH trong review.
   - Theo convention sẵn có của repo và `openspec/config.yaml`; tra `xem_mau_thiet_ke` khi cần pattern của team.
   - Sau mỗi nhóm task: chạy build/lint liên quan và sửa lỗi.
   - Task xong → đọc tasks.md hiện tại, đổi `- [ ]` thành `- [x]`, lưu **toàn bộ** nội dung bằng `sep_luu_artifact` (file `tasks.md`).
   - Báo tiến độ ngắn. Hỏi user trước khi làm gì ngoài phạm vi specs.
4. Phát sinh yêu cầu mới/specs sai → dừng, đề xuất cập nhật `specs.md` + `tasks.md` (qua `sep_luu_artifact`) và hỏi user.
5. Mọi task đã tick → `sep_xem_change` xác nhận bước Apply ✅.
6. **Gate**: tóm tắt file code chính đã đổi, lệnh build/lint đã chạy; hỏi "Approve hay Reject?".
   Reject → sửa, `sep_duyet_buoc` (`reject`, lý do), hỏi lại. Approve → `sep_duyet_buoc` (`buoc: "apply"`, `approve`, `tomTat`, `caiTien`).

## Kết thúc
"Bước 4/6 xong. Chạy `/sep-test` để kiểm thử theo specs."
