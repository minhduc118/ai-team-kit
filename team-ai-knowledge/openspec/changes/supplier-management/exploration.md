# Exploration: Supplier Management

## Mô hình dữ liệu
- `Suppliers` (Code UQ theo Tenant, Name, TaxCode, Phone, Email, Address, PaymentTermDays, IsActive)
- `SupplierProducts` (SupplierId, ProductId, ReferenceCost, IsPreferred) — bảng nối N-N

## Xoá nhà cung cấp
- Đã có phiếu nhập → chỉ cho **ngừng hoạt động** (`IsActive = 0`), không xoá
- Chưa có giao dịch → soft delete (`IsDeleted = 1`)

## Câu hỏi mở
- Mã số thuế có cần validate theo định dạng 10/13 số? → Có, validate phía server.
