# Specs: purchase-order-grid-creation

## API / Contract

| Method | Path | Request Body / Query | Response | Error Codes |
|---|---|---|---|---|
| GET | `/api/v1/purchase-orders/grid-init` | Query: `supplierId`, `branchId` | `GridInitDto` (SupplierInfo, CreditInfo, Categories) | `400`, `404` |
| GET | `/api/v1/purchase-orders/grid-products` | Query: `supplierId`, `branchId`, `fromDate`, `toDate` | `List<GridProductDto>` (Products, AvailabilityRules) | `400` |
| POST | `/api/v1/purchase-orders/grid-submit` | Body: `SubmitGridPoCommand` | `SubmitGridResultDto` (CreatedPoIds, Status) | `400 Bad Request` (vi phạm MOQ/LeadTime) |
| POST | `/api/v1/purchase-orders/grid-draft` | Body: `SaveGridDraftCommand` | `200 OK` | `400` |
| POST | `/api/v1/purchase-orders/grid-export-excel` | Body: `ExportGridCommand` | File Stream (CSV / XLSX) | `400` |

## ADDED Requirements

### Requirement: REQ-POGRID-01 Hiển thị ma trận số lượng theo lịch giao của Nhà cung cấp
Hệ thống MUST vô hiệu hóa (disabled) các ô giao hàng không thỏa mãn quy tắc Lead time, Active Days hoặc Holiday của Nhà cung cấp.

#### Scenario: Hiển thị ô không hợp lệ do Lead time
- GIVEN Nhà cung cấp có `LeadDays = 2`, Hôm nay là ngày `2026-09-26`
- WHEN mở màn hình ma trận đặt hàng
- THEN các cột ngày `2026-09-26` và `2026-09-27` hiển thị dưới dạng ô bị khóa `—` không cho phép nhập số lượng.

#### Scenario: Hiển thị ô không hợp lệ do ngày nghỉ (Holiday)
- GIVEN Ngày `2026-10-02` nằm trong danh sách `Holidays` của Nhà cung cấp
- WHEN xem ma trận đặt hàng
- THEN cột ngày `2026-10-02` bị khóa `—` và hiển thị tooltip "Supplier does not deliver".

### Requirement: REQ-POGRID-02 Kiểm tra ràng buộc MOQ và Daily Minimum
Hệ thống MUST kiểm tra ô nhập số lượng so với `MOQ` của từng sản phẩm và `Daily Minimum Total` của từng ngày trước khi cho phép Submit.

#### Scenario: Nhập số lượng nhỏ hơn MOQ
- GIVEN Sản phẩm `"Rau cải xanh"` có `MOQ = 5`
- WHEN nhân viên nhập số lượng `3` vào ngày hợp lệ
- THEN hệ thống hiển thị viền đỏ + ký hiệu cảnh báo `!`, đồng thời thêm lỗi vào danh sách `Issues to fix before Submit` và khóa nút Submit.

#### Scenario: Tổng số lượng trong ngày nhỏ hơn Daily Minimum Total
- GIVEN Quy tắc tổng số lượng tối thiểu 1 ngày `DAY_MIN = 10`
- WHEN nhân viên chỉ đặt tổng cộng `6` đơn vị sản phẩm cho ngày `2026-09-28`
- THEN hệ thống báo lỗi `"09/28: daily total 6 < minimum 10"` và khóa nút Submit.

### Requirement: REQ-POGRID-03 Tự động tách PO và Kiểm tra Hạn mức Tín dụng (Credit Limit)
Hệ thống MUST tự động nhóm các sản phẩm đặt theo ngày giao hàng thành các đơn PO độc lập và tự động gán trạng thái duyệt tín dụng nếu vượt hạn mức công nợ.

#### Scenario: Submit ma trận hợp lệ không vượt hạn mức công nợ
- GIVEN Tổng tiền hàng ma trận `GrandAmount = 5.000.000 VNĐ`, `OpenAP = 2.800.000 VNĐ`, `CreditLimit = 12.000.000 VNĐ`, có 3 ngày giao phát sinh số lượng
- WHEN nhân viên bấm Submit
- THEN hệ thống tạo 3 đơn PO với trạng thái `PENDING_APPROVAL`.

#### Scenario: Submit ma trận vượt hạn mức công nợ
- GIVEN `OpenAP + GrandAmount = 14.000.000 VNĐ` vượt quá `CreditLimit = 12.000.000 VNĐ`
- WHEN nhân viên bấm Submit
- THEN hệ thống tạo các đơn PO với trạng thái `PENDING_CREDIT_APPROVAL` (chờ duyệt tín dụng).

### Requirement: REQ-POGRID-04 Sao chép số lượng tuần trước (Copy Prev Week)
Hệ thống MUST hỗ trợ tự động sao chép số lượng đặt hàng từ 7 ngày trước đó vào các ngày hợp lệ của tuần hiện tại.

#### Scenario: Thực hiện Sao chép số lượng tuần trước
- GIVEN Đã có dữ liệu số lượng đặt của tuần từ `2026-09-19` đến `2026-09-25`
- WHEN nhân viên bấm nút "Copy Prev Week" khi đang xem tuần từ `2026-09-26`
- THEN các ô hợp lệ của tuần mới tự động điền lại số lượng tương ứng từ 7 ngày trước.

## Acceptance checklist
- [ ] REQ-POGRID-01: Lock chuẩn các ô vi phạm Lead time (Today + LeadDays), ActiveDays, Holidays.
- [ ] REQ-POGRID-02: Cảnh báo `!` và khóa Submit nếu `0 < Qty < MOQ` hoặc `0 < DailyTotal < DAY_MIN`.
- [ ] REQ-POGRID-03: Submit tự động gom thành N PO theo DeliveryDate; gán `PENDING_CREDIT_APPROVAL` nếu vượt CreditLimit.
- [ ] REQ-POGRID-04: Nút "Copy Prev Week" điền chuẩn số lượng từ T-7 ngày cho các ô hợp lệ.
