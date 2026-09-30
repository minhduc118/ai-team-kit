# SEP personas — reviewer cho /sep-verify-spec

| Persona | Bắt buộc | Lưu vào | Soi gì |
|---|---|---|---|
| `skeptic` | ✅ | `review/skeptic.md` | D1–D5, mơ hồ, thiếu scenario, mâu thuẫn |
| `guardian` | khuyến nghị | `review/guardian.md` | bảo mật, multi-tenant, toàn vẹn dữ liệu |
| `advocate` | khuyến nghị | `review/advocate.md` | người dùng, luồng thực tế, UI states |
| `codebase` | khuyến nghị | `review/codebase.md` | đối chiếu code thật, blast radius |

Cách chạy theo IDE:
- **Cursor / Claude Code**: `npm run sep -- install` cài persona thành sub-agent (`~/.cursor/agents/sep-*.md`, `~/.claude/agents/sep-*.md`).
  `/sep-verify-spec` giao 4 persona chạy song song, rồi gộp kết quả.
- **Antigravity** (không có sub-agent tuỳ biến): agent gọi `sep_xem_persona({ ten })` và tự đóng vai lần lượt từng persona.

Vòng lặp: review → sửa `specs.md` → review lại, tối đa 3 vòng hoặc đến khi hết vấn đề HIGH.
Persona chỉ đọc; agent chính mới là người lưu file qua `sep_luu_artifact`.
