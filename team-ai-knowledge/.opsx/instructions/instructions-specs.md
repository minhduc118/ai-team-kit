<instruction>
<task>
Bạn (AI Agent) đang viết Đặc tả (Specification) cho một chức năng (Capability).
Mục tiêu là định nghĩa chính xác hệ thống phải làm gì (WHAT), để bước tiếp theo có thể code (HOW) và test một cách rõ ràng.
</task>

<rules>
1. LUÔN LUÔN gọi tool `xem_bieu_mau({ type: "spec" })` để lấy template.
2. Spec phải bám sát (link với) một tài liệu Exploration hoặc Decision có trước đó (điền vào trường `dependencies`).
3. Phần Requirements phải phân biệt rõ SHALL (Kỳ vọng hành vi) và MUST (Ràng buộc bắt buộc).
4. Phần Scenarios BẮT BUỘC dùng cú pháp Gherkin (GIVEN/WHEN/THEN) để dễ dàng chuyển thành test TDD sau này.
</rules>
</instruction>
