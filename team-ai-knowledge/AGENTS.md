# AGENTS.md — Quy trình bắt buộc cho AI Agents

> File này được nạp tự động vào context của AI agent khi bắt đầu phiên.
> Mọi AI tool trong team đều phải tuân thủ các quy trình Spec-Driven Governance dưới đây.

---

## 🔌 Kết nối MCP Knowledge Base

Bạn đang được kết nối với **Team Knowledge Base** qua MCP.
Bạn CÓ NGHĨA VỤ phải sử dụng các tools sau bằng tiếng Việt:

| Tool | Vai trò | Mục đích |
|------|---------|----------|
| `xem_tong_quan()` | La bàn | Lấy START_HERE.md — bản đồ toàn bộ dự án |
| `xem_ngu_canh_du_an(projectName)` | Nền tảng | Lấy tài liệu context của dự án cụ thể |
| `tim_kiem_kien_thuc(query)` | Thám tử | Tìm kiếm tự do trong toàn bộ KB |
| `xem_mau_thiet_ke(patternId)` | Kiểm soát viên | Lấy coding pattern/convention bắt buộc tuân theo |
| `xem_quyet_dinh(decisionId)` | Sử gia | Lấy lịch sử quyết định kiến trúc (ADR) |
| `xem_bai_hoc(lessonId)` | Cứu thương | Tìm bài học giải quyết lỗi/bug |
| `danh_sach_phien_gan_day()` | Báo cáo viên | Xem hoạt động team gần đây |
| `luu_phien_lam_viec(...)` | Thư ký | Ghi tóm tắt kết quả phiên làm việc |
| `luu_bai_hoc(...)` | Giáo viên | Ghi bài học/cách sửa bug mới |
| `luu_tru_kien_thuc(path)` | Thủ thư | Cất file cũ vào thư mục archive |
| `phuc_hoi_kien_thuc(path)` | Thủ thư | Lấy lại file từ thư mục archive |
| `xem_bieu_mau(type)` | Quản lý quy trình | **BẮT BUỘC** gọi để lấy template trước khi tạo file mới |
| `phan_tich_ngu_canh_tu_dong(...)` | Điều phối viên | Tự phân tích ngữ cảnh chat và gọi các tool phù hợp |

---

## 📋 QUY TRÌNH 1: Bắt đầu phiên làm việc

**Thực hiện NGAY KHI bắt đầu**, trước bất kỳ việc gì khác:

```
Bước 1: Gọi xem_tong_quan()
        → Đọc START_HERE.md để nắm cấu trúc KB.

Bước 2: Gọi danh_sach_phien_gan_day()
        → Biết team vừa làm gì gần đây.
        → Tóm tắt cho user: "Gần đây dự án đã có các cập nhật..."
```

**Không bao giờ bắt đầu làm task mà không thực hiện 2 bước trên.**

---

## 📋 QUY TRÌNH SEP: 6 lệnh cho 6 bước

Cài đặt: `npm run sep -- install --user=<github>` (Cursor / Claude Code / Antigravity — xem `sep-kit/README.md`).

`/sep-spec` → `/sep-brainstorm` → `/sep-verify-spec` → `/sep-apply` → `/sep-test` → `/sep-archive` (`/sep-status` xem tiến độ)

- Khi user yêu cầu làm **chức năng mới** mà chưa có change: đề nghị dùng `/sep-spec <mô tả>` thay vì code ngay.
- Change nằm ở `openspec/changes/<tên>/`. **Chỉ ghi artifact qua tool `sep_*`** — không sửa file tay.
- **Schema** (`sep_tao_change` tham số `schema`): `feature` (mặc định), `bug-fix`, `refactor` — hai loại sau không cần `design-brief.md`. Bối cảnh dự án: `openspec/config.yaml`.
- **Cổng duyệt:** cuối mỗi bước trình bày kết quả và hỏi user Approve / Reject. Chỉ gọi `sep_duyet_buoc` **sau khi user trả lời** — không tự duyệt thay user. Reject → sửa theo lý do rồi hỏi lại.
- **Review đa persona** ở verify-spec: `sep_xem_persona` lấy checklist của skeptic (bắt buộc), guardian, advocate, codebase.
- Chỉ code sau khi `sep_chuyen_trang_thai` → `apply` thành công. Skip bước = BLOCKED trên TeamSpec.
- `specs.md` viết dạng delta (`## ADDED|MODIFIED|REMOVED Requirements` + `### Requirement: <tên>`) để archive merge vào `openspec/specs/<capability>/spec.md`.
- Tra cứu: `sep_xem_change` (bước tiếp theo), `sep_danh_sach_change` (danh sách), `sep_chon_change` (đổi change đang làm — các tool khác bỏ trống `tenChange` sẽ dùng change này).

---

## 📋 QUY TRÌNH 2: Trong khi làm việc (Spec-Driven)

### 2.1. Trước khi viết code mới
```
→ Gọi xem_mau_thiet_ke("tên-chức-năng")
→ Viết code theo ĐÚNG pattern của team.
→ KHÔNG được dùng style riêng của AI nếu team đã có convention.
```

### 2.2. Trước khi đề xuất kiến trúc (Decision / ADR)
```
→ Gọi xem_quyet_dinh("phạm-vi") để kiểm tra ADR cũ.
→ NẾU tạo ADR mới: BẮT BUỘC gọi xem_bieu_mau({type: "decision"}).
→ Phải ghi rõ WHAT, WHY, và REJECTED (các phương án bị loại).
```

### 2.3. Khi gặp bug / lỗi khó
```
→ Gọi xem_bai_hoc("mô-tả-lỗi").
→ NẾU tìm thấy: Áp dụng ngay giải pháp đã ghi nhận.
→ NẾU không có: Debug bình thường. Sửa xong BẮT BUỘC tạo lesson mới.
   (Gọi xem_bieu_mau({type: "lesson"}) trước khi tạo).
```

### 2.4. Khi cần thông tin chung về project
```
→ Gọi xem_ngu_canh_du_an(projectName)
→ Đừng tự đoán stack/architecture.
```

---

## 📋 QUY TRÌNH 3: Kết thúc phiên làm việc (QUAN TRỌNG NHẤT)

**Kích hoạt khi user nói:** "tổng kết", "summarize", "xong rồi", "save session", v.v.

### Bước 1: Tạo draft summary
Phân tích toàn bộ cuộc hội thoại trong phiên và tạo draft:

```
📋 DRAFT SESSION SUMMARY

Tiêu đề: [Tiêu đề ngắn gọn]
Mục tiêu: [Mục tiêu ban đầu]
Thay đổi chính:
- [file]: [mô tả]
Quyết định quan trọng:
- [Quyết định — lý do]
Vấn đề gặp phải:
- [Vấn đề — cách giải quyết]
Tasks tiếp theo:
- [ ] [Task chưa xong]
```

### Bước 2: Trình bày cho user review
- Hỏi: "Bạn có muốn sửa gì trước khi tôi lưu không?"

### Bước 3: Lưu khi user đồng ý
```
→ Gọi luu_phien_lam_viec({ projectName, title, goals, summary, filesChanged })
```

### Bước 4: Đề xuất lưu bài học (nếu có bug)
```
→ Hỏi: "Phiên này có fix lỗi [X], bạn muốn lưu bài học (Lesson) không?"
→ Nếu có, dùng xem_bieu_mau({type: "lesson"}) và luu_bai_hoc(...).
```

---

## ⚠️ Nguyên tắc tuyệt đối

1. **KHÔNG** tự xoá/ghi đè file KB. Thay vào đó, dùng `luu_tru_kien_thuc(path)`.
2. **LUÔN LUÔN** gọi `xem_bieu_mau(type)` trước khi tạo tài liệu Pattern, Decision, Lesson.
3. **LUÔN** kiểm tra bài học cũ trước khi debug để tránh lặp lại lỗi.
4. **KHÔNG** đề xuất giải pháp trái ngược với Quyết định (ADR) đã được duyệt mà không báo trước.

---

## 🗂️ Chiến lược tiết kiệm token (Token Strategy)

Tải context theo thứ tự:
```
Tầng 1 (luôn tải):    xem_tong_quan + danh_sach_phien_gan_day
Tầng 2 (khi cần):     xem_mau_thiet_ke / xem_quyet_dinh
Tầng 3 (chi tiết):    Nội dung file cụ thể
```
**Không bao giờ tải toàn bộ KB** — chỉ tải những gì task yêu cầu.
