---
name: sep-spec
description: Bước 1/6 quy trình SEP — chọn schema (feature/bug-fix/refactor), tạo OpenSpec change mới và viết proposal.md qua MCP server "sep". Dùng khi user gõ /sep-spec kèm mô tả chức năng (VD "/sep-spec tôi muốn thực hiện chức năng quản lý nhà cung cấp").
disable-model-invocation: true
---

# /sep-spec — Bước 1/6: Route + Khởi tạo change + Proposal

Quy trình SEP: **spec** → brainstorm → verify-spec → apply → test → archive.
Mô tả chức năng = phần chữ user gõ sau `/sep-spec`.

## Luật chung SEP
- Chỉ ghi file trong `openspec/changes/` bằng tool MCP `sep_*` — không tạo/sửa tay.
- Không bỏ qua bước. Tool trả lỗi ⛔ → dừng, báo user lệnh cần chạy trước.
- **Gate duyệt**: cuối bước, tóm tắt và hỏi user **Approve / Reject**. Chỉ gọi `sep_duyet_buoc` sau khi user trả lời — không tự duyệt thay user.
- Không thấy tool `sep_*` → dừng, bảo user chạy `npm run sep -- install` rồi khởi động lại IDE (kiểm tra: `npm run sep -- doctor`).
- Bước này **không viết code**. Trả lời tiếng Việt; thuật ngữ kỹ thuật giữ tiếng Anh.

## Các bước
1. Không có mô tả sau lệnh → hỏi "Bạn muốn thực hiện chức năng gì?" rồi dừng chờ.
2. **Route — chọn schema** theo ý định:
   - `feature`: chức năng mới / mở rộng hành vi (mặc định).
   - `bug-fix`: sửa lỗi ("lỗi", "bug", "sai", "không chạy") — không cần design-brief.
   - `refactor`: cải tổ code, không đổi hành vi — không cần design-brief.
   Không chắc → hỏi user một câu.
3. Hỏi nhanh (tối đa 3 câu, chỉ khi thật sự mơ hồ): ai dùng, mục tiêu chính, phạm vi.
4. Gọi `sep_tao_change`:
   - `moTa`: mô tả chức năng (kèm ý đã làm rõ) · `schema` · `tenChange`: kebab-case tiếng Anh, VD `supplier-management`.
   - `capability`: nhóm chức năng lớn trong spec gốc (VD `supplier`), để nhiều change cộng dồn vào `openspec/specs/<capability>/spec.md`. Không rõ → bỏ trống.
   - Báo thiếu assignee → hỏi GitHub username, gọi lại với `assignee`.
   - Báo change đã tồn tại → dừng, cho user xem bảng trạng thái và việc tiếp theo.
5. Tra KB: `tim_kiem_kien_thuc` với từ khoá chức năng, `xem_ngu_canh_du_an` (MT-GRMS); đọc nhanh code liên quan nếu có.
6. Viết `proposal.md` theo hướng dẫn của schema trong kết quả tool, lưu bằng `sep_luu_artifact` (file `proposal.md`):

```markdown
# Proposal: <tên change>

## Vấn đề
## Mục tiêu
## Phạm vi
- In scope: ...
- Out of scope: ...
## Người dùng liên quan
## Tiêu chí thành công
- [ ] ... (đo được)
```

7. **Gate**: tóm tắt proposal (3–5 dòng) và hỏi "Approve hay Reject?".
   - Reject → sửa theo góp ý, lưu lại, gọi `sep_duyet_buoc` (`quyetDinh: "reject"`, `tomTat`: lý do), hỏi lại.
   - Approve → `sep_duyet_buoc` (`buoc: "spec"`, `quyetDinh: "approve"`, `tomTat`, `caiTien` nếu có).

## Kết thúc
"Bước 1/6 xong. Chạy `/sep-brainstorm` để tiếp tục" (change vừa tạo đã là change đang làm).
Nếu kết quả tool báo "chưa push" → nhắc `git push` trong thư mục `team-ai-knowledge`.
