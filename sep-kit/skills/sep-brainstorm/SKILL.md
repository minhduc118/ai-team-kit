---
name: sep-brainstorm
description: Bước 2/6 quy trình SEP — khảo sát phương án, thiết kế và viết đặc tả delta (exploration.md, design-brief.md, specs.md) cho một OpenSpec change qua MCP server "sep". Dùng khi user gõ /sep-brainstorm (kèm tên change hoặc dùng change đang làm).
disable-model-invocation: true
---

# /sep-brainstorm — Bước 2/6: Exploration + Design + Specs

Quy trình SEP: spec → **brainstorm** → verify-spec → apply → test → archive.
Tên change = phần chữ user gõ sau `/sep-brainstorm`; bỏ trống = change đang làm (📌).

## Luật chung SEP
- Chỉ ghi file trong `openspec/changes/` bằng tool MCP `sep_*` — không tạo/sửa tay.
- Không bỏ qua bước. Tool trả lỗi ⛔ → dừng, báo user lệnh cần chạy trước (hoặc bước chưa được duyệt).
- **Gate duyệt**: cuối bước, tóm tắt và hỏi user **Approve / Reject**. Chỉ gọi `sep_duyet_buoc` sau khi user trả lời.
- Không thấy tool `sep_*` → bảo user chạy `npm run sep -- install` rồi khởi động lại IDE.
- Bước này **không viết code**. Trả lời tiếng Việt; thuật ngữ kỹ thuật giữ tiếng Anh.

## Chọn change
- Gọi `sep_xem_change` (bỏ trống tenChange nếu dùng change đang làm). Báo chưa chọn → `sep_danh_sach_change`, hỏi user, rồi `sep_chon_change`.
- Bước Spec chưa xong/chưa duyệt → dừng, bảo user hoàn tất `/sep-spec`. Brainstorm đã xong → báo việc tiếp theo; chỉ làm lại khi user yêu cầu.
- Đọc `proposal.md`, **schema** của change, bối cảnh dự án (config.yaml) và "Quy tắc của team" trong kết quả `sep_xem_change`.

## Các bước (file bắt buộc tuỳ schema — xem bảng trong `sep_xem_change`)
1. **Research (tuỳ chọn)** — cần thư viện/API/tài liệu ngoài → tra cứu, lưu `research.md`.
2. **exploration.md** — tra KB (`tim_kiem_kien_thuc`, `xem_mau_thiet_ke`, `xem_quyet_dinh`, `xem_bai_hoc`, `xem_dac_ta` cho spec gốc) và đọc code hiện có:
   hiện trạng · Assumptions · Non-Goals · ≥2 phương án (ưu/nhược) · phương án chọn + lý do · rủi ro.
   Schema `bug-fix`: tái hiện + root cause. Schema `refactor`: bản đồ code + độ phủ test.
3. **design-brief.md** (chỉ schema `feature`) — luồng UI/API · màn hình/component/endpoint · loading/empty/error · thay đổi DB · quy tắc nghiệp vụ · phân quyền.
4. **specs.md** — **định dạng delta** (dùng để merge vào spec gốc khi archive):

```markdown
# Specs: <tên change>

## API / Contract
| Method | Path | Request | Response | Lỗi |

## ADDED Requirements
### Requirement: REQ-01 <tên>
Hệ thống MUST ...

#### Scenario: <case chính>
- GIVEN ...
- WHEN ...
- THEN ...

#### Scenario: <edge case>
...

## MODIFIED Requirements
### Requirement: <tên đúng như trong spec gốc>
(nội dung đầy đủ mới)

## REMOVED Requirements
### Requirement: <tên>

## Acceptance checklist
- [ ] REQ-01 ...
```

Mỗi file lưu bằng `sep_luu_artifact` theo thứ tự trên; tóm tắt 3–5 dòng sau mỗi file.

5. **Gate**: tóm tắt phương án chọn + danh sách REQ, hỏi "Approve hay Reject?".
   Reject → sửa, lưu lại, `sep_duyet_buoc` (`reject`, lý do), hỏi lại. Approve → `sep_duyet_buoc` (`buoc: "brainstorm"`, `approve`, `tomTat`, `caiTien`).

## Kết thúc
"Bước 2/6 xong. Chạy `/sep-verify-spec` để phản biện specs và lập tasks."
