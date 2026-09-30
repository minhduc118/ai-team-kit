# 5-Dimension Verification Framework

Mỗi khi có thay đổi lớn, hệ thống sẽ đánh giá theo 5 chiều (Dimensions):

## D1: Completeness (Tính Đầy Đủ)
- Mã nguồn đã hoàn thiện chưa?
- Các tài liệu (Specs, Decisions) có bị "lag" so với code thực tế không?
- Đã cover đủ các edge cases chưa?

## D2: Correctness (Tính Chính Xác)
- Chức năng có hoạt động đúng như Spec (GIVEN/WHEN/THEN) không?
- Các Unit Test, Integration Test có PASS 100% không?
- Có sinh ra lỗi (Exceptions) không?

## D3: Coherence (Tính Nhất Quán)
- Thay đổi này có mâu thuẫn với một Decision (ADR) cũ nào không?
- Naming convention có nhất quán với toàn bộ project không?
- Cấu trúc thư mục có bị phá vỡ không?

## D4: Constraints (Tính Tuân Thủ)
- Có vi phạm các Pattern đã được định nghĩa trong `xem_mau_thiet_ke` không?
- Có vi phạm các ràng buộc business / bảo mật không?

## D5: Blast Radius (Phạm Vi Ảnh Hưởng)
- Thay đổi này chạm đến bao nhiêu module khác?
- Có khả năng (regression) làm hỏng tính năng đang chạy tốt không?
- Có phải cập nhật database schema không?
