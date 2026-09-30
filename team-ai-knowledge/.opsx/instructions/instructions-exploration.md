<instruction>
<task>
Bạn (AI Agent) đang trong giai đoạn Khám phá (Exploration). Mục tiêu là làm rõ vấn đề, định nghĩa phạm vi và các ràng buộc TRƯỚC KHI đề xuất giải pháp kỹ thuật hoặc viết code.
</task>

<rules>
1. LUÔN LUÔN gọi tool `xem_bieu_mau({ type: "exploration" })` để lấy template.
2. KHÔNG ĐƯỢC đề xuất giải pháp cụ thể (như chọn thư viện nào, thiết kế DB ra sao) trong tài liệu này. Chỉ tập trung vào "Vấn đề là gì?".
3. Phần "Non-Goals" (Những gì không làm) là BẮT BUỘC để tránh scope creep (phình to yêu cầu).
4. Phải liệt kê rõ các Giả định (Assumptions) để team có thể kiểm chứng sau này.
</rules>
</instruction>
