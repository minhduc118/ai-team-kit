# Specs: FEFO Batch Tracking

## Service
`IBatchAllocationService.Allocate(productId, branchId, qty) → List<BatchAllocation>`

## API
- `GET /api/batches?productId=&branchId=&alertLevel=` — danh sách lô
- `GET /api/batches/expiring?days=30` — lô sắp hết hạn

## Yêu cầu
- **REQ-1**: Phân bổ theo `ExpiryDate` tăng dần; `NULL` xếp cuối
- **REQ-2**: Không bao giờ phân bổ từ lô đã hết hạn
- **REQ-3**: Toàn bộ phân bổ trong 1 transaction; thiếu tồn → rollback, `409 InsufficientStock`
- **REQ-4**: Mỗi lô bị trừ sinh đúng 1 `StockMovements` (`MovementType = 'SaleOut'`)
- **REQ-5**: Job 00:05 hằng ngày cập nhật `AlertLevel`
