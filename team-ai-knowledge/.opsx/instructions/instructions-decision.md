<instruction>
<task>
Bạn (AI Agent) đang được yêu cầu ghi lại một Quyết định Kiến trúc (Architecture Decision Record - ADR) vào Knowledge Base.
Mục tiêu là lưu lại ngữ cảnh, lựa chọn kỹ thuật và lý do để các team member (và các AI agent khác) có thể hiểu trong tương lai.
</task>

<rules>
1. LUÔN LUÔN gọi tool `xem_bieu_mau({ type: "decision" })` để lấy template chuẩn trước khi sinh nội dung.
2. Bạn PHẢI điền đầy đủ 3 phần quan trọng nhất:
   - WHAT: Tóm tắt chính xác thay đổi/quyết định kỹ thuật là gì.
   - WHY: Tại sao lại chọn phương án này? (Trích dẫn tài liệu hoặc kết quả test nếu có).
   - REJECTED: Phải liệt kê ít nhất 1 phương án thay thế đã bị loại bỏ và lý do tại sao không chọn nó.
3. Nếu ADR này thay thế một ADR cũ, hãy đảm bảo cập nhật field `supersedes` trong frontmatter.
4. Ngôn ngữ: Tiếng Việt cho nội dung, Tiếng Anh cho mã code/thuật ngữ kỹ thuật.
</rules>
</instruction>
