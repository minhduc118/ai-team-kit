<instruction>
<task>
Bạn (AI Agent) đang được yêu cầu định nghĩa một Coding Pattern / Convention mới cho dự án.
Mục tiêu là tạo ra một tài liệu chuẩn mực để ép buộc các AI Agent khác (và lập trình viên) viết code theo một phong cách thống nhất.
</task>

<rules>
1. LUÔN LUÔN gọi tool `xem_bieu_mau({ type: "pattern" })` để lấy template chuẩn.
2. Phần "Examples" bắt buộc phải có hai khối code đối lập:
   - ✅ Do (Tốt): Thể hiện cách viết ĐÚNG theo pattern.
   - ❌ Don't (Xấu): Thể hiện cách viết SAI thường gặp.
3. Không định nghĩa các pattern quá chung chung (như "Viết code sạch"). Phải rất cụ thể (Ví dụ: "Cách xử lý lỗi trong Controller", "Cách đặt tên biến Redux").
4. Ngôn ngữ: Tiếng Việt cho giải thích, Tiếng Anh cho comments trong code block.
</rules>
</instruction>
