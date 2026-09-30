# Proposal: FEFO Batch Tracking

## Vấn đề
Nhân viên xuất hàng theo thói quen, lô mới thường bị bán trước → lô cũ hết hạn, phải huỷ. Không có cảnh báo trước khi hết hạn.

## Đề xuất
- Mỗi dòng phiếu nhập tạo 1 bản ghi `ProductBatches` (BatchNumber, ManufacturedDate, ExpiryDate, QuantityIn)
- Khi bán/xuất kho: hệ thống tự phân bổ số lượng từ lô có `ExpiryDate` sớm nhất
- Mỗi lần trừ tồn ghi `StockMovements` với `BatchId`
- Job hằng ngày cập nhật `AlertLevel` (Normal / Warning ≤ 30 ngày / Critical ≤ 7 ngày / Expired)
