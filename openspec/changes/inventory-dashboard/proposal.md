# Proposal: Inventory Dashboard

## Vấn đề
Quản lý cửa hàng hiện phải mở nhiều màn hình (Products, Batches, Stock Movements) để biết tình trạng kho. Không có cái nhìn tổng quan theo chi nhánh.

## Đề xuất
Một trang `/inventory/dashboard` gồm:
- 4 KPI card: tổng giá trị tồn, số SKU, SKU dưới mức tồn tối thiểu, lô hết hạn trong 30 ngày
- Biểu đồ nhập/xuất 7 ngày (từ `StockMovements`)
- Bảng top 10 sản phẩm sắp hết hàng
- Bộ lọc theo `BranchId`

## Ngoài phạm vi
- Dự báo nhu cầu (forecast)
- Export Excel (để sprint sau)

## Người dùng
Store Manager, Warehouse Staff
