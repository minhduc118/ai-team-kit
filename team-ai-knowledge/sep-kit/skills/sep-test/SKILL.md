---
name: sep-test
description: Bước 5/6 quy trình SEP — verify change - viết và chạy test theo các Scenario trong specs.md của một OpenSpec change, lập test-report.md (verdict PASS/FAIL) qua MCP server "sep". Dùng khi user gõ /sep-test (kèm tên change hoặc dùng change đang làm).
disable-model-invocation: true
---

# /sep-test — Bước 5/6: Verify change bằng test

Quy trình SEP: spec → brainstorm → verify-spec → apply → **test** → archive.
Tên change = phần chữ user gõ sau `/sep-test`; bỏ trống = change đang làm (📌).

## Luật chung SEP
- Chỉ ghi file trong `openspec/changes/` bằng tool MCP `sep_*` — không tạo/sửa tay.
- Không bỏ qua bước. Tool trả lỗi ⛔ → dừng, báo user lệnh cần chạy trước (hoặc bước chưa được duyệt).
- **Gate duyệt**: cuối bước, tóm tắt và hỏi user **Approve / Reject**. Chỉ gọi `sep_duyet_buoc` sau khi user trả lời.
- Không thấy tool `sep_*` → bảo user chạy `npm run sep -- install` rồi khởi động lại IDE.
- Trả lời tiếng Việt; thuật ngữ kỹ thuật giữ tiếng Anh.

## Chọn change
- Gọi `sep_xem_change`. Apply chưa xong (còn task chưa tick) hoặc chưa duyệt → dừng, bảo user hoàn tất `/sep-apply`.

## Các bước
1. Đọc `specs.md` — liệt kê mọi REQ và Scenario (GIVEN/WHEN/THEN).
2. Với mỗi Scenario: tìm test đã có hoặc viết test mới theo framework sẵn có của repo
   (backend: xUnit `SGMS.UnitTests` / `SGMS.IntegrationTests`; frontend: framework đang dùng). Không có framework → hỏi user trước khi thêm.
3. Chạy test + build/lint (VD `dotnet test`, `npm run lint`, `npm run build`). Ghi lại lệnh và kết quả thật — **không bịa kết quả**.
   Scenario không tự động hoá được → hướng dẫn user test tay và hỏi kết quả.
4. Kiểm tra đối chiếu (verify change): code có làm đủ mọi REQ? có thay đổi ngoài phạm vi specs? review HIGH đã xử lý hết?
5. Lưu **test-report.md** bằng `sep_luu_artifact`. Frontmatter `verdict` là bắt buộc:

```markdown
---
verdict: PASS
tested_at: 2026-01-01
---
# Test Report: <tên change>

| REQ | Scenario | Test | Kết quả |
|---|---|---|---|
| REQ-01 | ... | `path/to/test` | ✅ PASS |

## Lệnh đã chạy
## Đối chiếu specs ↔ code
## Lỗi còn tồn đọng
```

   `verdict: PASS` chỉ khi **mọi** Scenario pass. Có cái fail → `verdict: FAIL`.
6. FAIL → báo lỗi, sửa code (quay lại `/sep-apply` nếu cần thêm task), chạy lại test và lưu lại test-report.md đến khi PASS.
7. **Gate** (chỉ khi PASS): tóm tắt số scenario pass, lệnh đã chạy; hỏi "Approve hay Reject?".
   Reject → xử lý, `sep_duyet_buoc` (`reject`, lý do), hỏi lại. Approve → `sep_duyet_buoc` (`buoc: "test"`, `approve`, `tomTat`, `caiTien`).

## Kết thúc
"Bước 5/6 xong. Chạy `/sep-archive` để đóng change."
