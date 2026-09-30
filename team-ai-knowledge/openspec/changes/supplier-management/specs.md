# Specs: Supplier Management

## API
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/suppliers?search=&status=&page=` | Danh sách phân trang |
| GET | `/api/suppliers/{id}` | Chi tiết + sản phẩm |
| POST | `/api/suppliers` | Tạo mới |
| PUT | `/api/suppliers/{id}` | Cập nhật |
| DELETE | `/api/suppliers/{id}` | Xoá mềm / ngừng hoạt động |

## Yêu cầu
- **REQ-1**: `Code` duy nhất trong cùng `TenantId` → `409` nếu trùng
- **REQ-2**: `TaxCode` gồm 10 hoặc 13 chữ số → `400` nếu sai
- **REQ-3**: `DELETE` khi đã có `GoodsReceiptNotes` → set `IsActive = 0`, trả `200` kèm `deactivated: true`
- **REQ-4**: Chỉ Store Manager / Admin được tạo, sửa, xoá
