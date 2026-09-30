---
name: sep-verify-spec
description: Bước 3/6 quy trình SEP — review specs bằng các persona (skeptic bắt buộc; guardian, advocate, codebase khuyến nghị, chạy song song bằng sub-agent), lặp sửa specs đến khi hết vấn đề HIGH, rồi lập tasks.md qua MCP server "sep". Dùng khi user gõ /sep-verify-spec.
disable-model-invocation: true
---

# /sep-verify-spec — Bước 3/6: Review đa persona + Tasks

Quy trình SEP: spec → brainstorm → **verify-spec** → apply → test → archive.
Tên change = phần chữ user gõ sau `/sep-verify-spec`; bỏ trống = change đang làm (📌).

## Luật chung SEP
- Chỉ ghi file trong `openspec/changes/` bằng tool MCP `sep_*` — không tạo/sửa tay.
- Không bỏ qua bước. Tool trả lỗi ⛔ → dừng, báo user lệnh cần chạy trước (hoặc bước chưa được duyệt).
- **Gate duyệt**: cuối bước, tóm tắt và hỏi user **Approve / Reject**. Chỉ gọi `sep_duyet_buoc` sau khi user trả lời.
- Không thấy tool `sep_*` → bảo user chạy `npm run sep -- install` rồi khởi động lại IDE.
- Bước này **không viết code**. Trả lời tiếng Việt; thuật ngữ kỹ thuật giữ tiếng Anh.

## Chọn change
- Gọi `sep_xem_change`. Brainstorm chưa xong/chưa duyệt → dừng, bảo user hoàn tất `/sep-brainstorm`.
- Ghi nhớ đường dẫn thư mục change: `<KB>/openspec/changes/<change>/`.

## Các bước
1. **Review song song** — lấy prompt persona bằng `sep_xem_persona` (`skeptic`, `guardian`, `advocate`, `codebase`).
   - **Có sub-agent** (Cursor Task tool / Claude Code agent): giao 4 sub-agent chạy **song song**, mỗi sub-agent nhận prompt persona
     + tên change + đường dẫn thư mục change + đường dẫn repo code. Sub-agent đã cài sẵn tên `sep-skeptic`, `sep-guardian`, `sep-advocate`, `sep-codebase`.
   - **Không có sub-agent** (Antigravity…): tự đóng vai lần lượt từng persona, độc lập với phần specs mình đã viết.
   - Tối thiểu phải có **skeptic**. Việc nhỏ (`mode: fast|minimal`) có thể chỉ chạy skeptic.
2. Lưu kết quả: `review/skeptic.md` (bắt buộc), `review/guardian.md`, `review/advocate.md`, `review/codebase.md` bằng `sep_luu_artifact`.
3. **Vòng lặp sửa** (tối đa 3 vòng): gộp các vấn đề **HIGH** từ mọi persona → trình bày cho user → cập nhật `specs.md`
   (và artifact liên quan) bằng `sep_luu_artifact` → review lại phần đã sửa → ghi "Đã xử lý" vào review tương ứng.
   Sau 3 vòng vẫn còn HIGH → dừng, hỏi user quyết định.
4. Lưu **tasks.md** — checklist theo thứ tự làm, mỗi task ≤ nửa ngày, tham chiếu REQ:

```markdown
# Tasks: <tên change>

## DB
- [ ] T1 — Migration ... (REQ-01)
## Backend
- [ ] T2 — ...
## Frontend
- [ ] T3 — ...
## Test
- [ ] Tn — Viết test cho các Scenario trong specs.md
```

5. **Gate**: tóm tắt điểm D1–D5, các vấn đề đã xử lý, số task; hỏi "Approve hay Reject?".
   Reject → sửa, `sep_duyet_buoc` (`reject`, lý do), hỏi lại. Approve → `sep_duyet_buoc` (`buoc: "verify-spec"`, `approve`, `tomTat`, `caiTien`).

## Kết thúc
"Bước 3/6 xong. Chạy `/sep-apply` để bắt đầu code."
