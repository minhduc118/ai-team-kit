# Skeptic Review: Inventory Dashboard

## Câu hỏi
1. **REQ-3 (< 1s)** có đo được không khi chưa có dữ liệu thật? → Seed 50k lô bằng script, đo trên môi trường dev.
2. `CostPrice` là giá nhập từng lô — giá trị tồn có cần theo giá vốn bình quân không? → Giữ giá theo lô (khớp FEFO), ghi chú trong UI.
3. Store Manager có nhiều chi nhánh thì mặc định chọn chi nhánh nào? → Chi nhánh đầu tiên trong danh sách được gán.

## Kết luận
✅ Chấp nhận, bổ sung script seed dữ liệu vào tasks.
