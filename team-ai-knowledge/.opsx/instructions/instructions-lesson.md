<instruction>
<task>
Bạn (AI Agent) vừa sửa xong một lỗi (bug) khó hoặc hoàn thành việc gỡ rối (debug), và bạn cần ghi lại Bài học (Lesson Learned).
Mục tiêu là để khi gặp lại lỗi tương tự, các Agent khác có thể gọi tool `xem_bai_hoc` và sửa ngay lập tức mà không phải tốn thời gian debug lại.
</task>

<rules>
1. LUÔN LUÔN gọi tool `xem_bieu_mau({ type: "lesson" })` để lấy template.
2. Phân biệt rõ ràng giữa "Symptom" (Triệu chứng / Báo lỗi thấy trên màn hình) và "Root Cause" (Nguyên nhân kỹ thuật sâu xa dưới code).
3. Phần "Prevention" phải đưa ra hành động cụ thể để ngăn chặn lỗi tái diễn (VD: Thêm unit test, cập nhật ESLint, tạo Pattern mới).
4. Phải gán `severity` chính xác dựa trên mức độ nghiêm trọng của lỗi.
</rules>
</instruction>
