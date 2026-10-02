# Tasks: purchase-order-grid-creation

## Backend (.NET 8)
- [ ] T1 — Tạo DTOs cho PO Grid (`GridInitDto`, `GridProductDto`, `SubmitGridPoCommand`) trong `SGMS.Application` (REQ-POGRID-01)
- [ ] T2 — Triển khai Query Handler `GetPoGridProductsQuery` với logic lọc LeadTime, ActiveDays, Holidays trong `SGMS.Application` (REQ-POGRID-01)
- [ ] T3 — Triển khai FluentValidation cho `SubmitGridPoCommand` kiểm tra MOQ & Daily Minimum (REQ-POGRID-02)
- [ ] T4 — Triển khai Command Handler `SubmitGridPoCommandHandler` tự động tách PO theo `DeliveryDate` & gán trạng thái `PENDING_CREDIT_APPROVAL` nếu vượt `CreditLimit` (REQ-POGRID-03)
- [ ] T5 — Thêm Controller Endpoint `PurchaseOrderGridController` trong `SGMS.API` (REQ-POGRID-01, REQ-POGRID-03)

## Frontend (Vite + React 19 + TypeScript + Antd)
- [ ] T6 — Tạo Feature folder `src/features/purchase-order/` và các types/API client cho PO Grid (REQ-POGRID-01)
- [ ] T7 — Xây dựng `FilterBar` & `AvailabilityBanner` hiển thị thông tin Supplier, Branch, Credit Limit (REQ-POGRID-01)
- [ ] T8 — Triển khai `MatrixTable` hiển thị ma trận 14 ngày, validate ô nhập MOQ `!`, disabled ô vi phạm LeadTime (REQ-POGRID-01, REQ-POGRID-02)
- [ ] T9 — Triển khai tính năng Excel Import/Export CSV/XLSX & Nút "Copy Prev Week" (REQ-POGRID-04)
- [ ] T10 — Triển khai `PoPreviewTable` & Nút Submit gọi API tạo hàng loạt đơn PO (REQ-POGRID-03)

## Test & Verification
- [ ] T11 — Unit Test `SubmitGridPoCommandHandler` với Scenario tách PO và kiểm tra Credit Limit trong `SGMS.UnitTests`
- [ ] T12 — Integration Test API Submit Grid PO với database SQL Server trong `SGMS.IntegrationTests`
