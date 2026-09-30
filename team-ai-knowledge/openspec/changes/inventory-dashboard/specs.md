# Specs: Inventory Dashboard

## API
### `GET /api/inventory/dashboard?branchId={id}`
Response `200`:
```json
{
  "totalValue": 125000000,
  "skuCount": 842,
  "belowMinCount": 17,
  "expiringSoonCount": 9,
  "movements": [{ "date": "2026-09-22", "in": 120, "out": 95 }],
  "lowStock": [{ "productId": "…", "name": "Sữa tươi 1L", "quantity": 4, "minStock": 20 }]
}
```
- `403` nếu user không thuộc chi nhánh `branchId`

## Yêu cầu
- **REQ-1**: KPI chỉ tính lô có `IsDeleted = 0` và `Status = 'Active'`
- **REQ-2**: "Sắp hết hạn" = `ExpiryDate` trong 30 ngày tới, `QuantityCurrent > 0`
- **REQ-3**: Thời gian phản hồi < 1s với 50k lô
- **REQ-4**: Mọi query filter theo `TenantId` của user

## Acceptance
- [ ] Đổi chi nhánh → toàn bộ số liệu cập nhật
- [ ] Lô hết hạn trong 7 ngày hiển thị màu đỏ
