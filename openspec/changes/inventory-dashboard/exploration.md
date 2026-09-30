# Exploration: Inventory Dashboard

## Nguồn dữ liệu
| KPI | Bảng | Cách tính |
|-----|------|-----------|
| Giá trị tồn | `ProductBatches` | `SUM(QuantityCurrent * CostPrice)` |
| SKU dưới min | `Products` + `ProductBatches` | tổng `QuantityCurrent` < `MinStock` |
| Lô sắp hết hạn | `ProductBatches` | `ExpiryDate <= today + 30` và `QuantityCurrent > 0` |
| Nhập/xuất 7 ngày | `StockMovements` | group by `MovementDate`, `MovementType` |

## Phương án
1. **Query trực tiếp** mỗi lần mở trang — đơn giản, chậm khi dữ liệu lớn.
2. **Snapshot hằng đêm** vào bảng `InventorySnapshots` — nhanh, dữ liệu trễ 1 ngày.

→ Chọn **(1)** cho MVP, thêm index `(BranchId, ExpiryDate)` trên `ProductBatches`. Xem lại khi > 100k lô.

## Rủi ro
- Multi-tenant: mọi query bắt buộc filter `TenantId`.
