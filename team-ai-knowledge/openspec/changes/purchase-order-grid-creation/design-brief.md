# Design Brief: purchase-order-grid-creation

## 1. Luồng Giao diện & Endpoint API

### API Endpoints
- `GET /api/v1/purchase-orders/grid-init`: Lấy cấu hình ma trận (Danh sách Supplier, Branch, danh mục Category, thông tin Credit AP/Limit của Supplier).
- `GET /api/v1/purchase-orders/grid-products`: Lấy danh sách sản phẩm + MOQ + Lịch giao hàng của Supplier được chọn trong khoảng ngày `dateFrom` -> `dateTo`.
- `POST /api/v1/purchase-orders/grid-submit`: Submit ma trận. Payload chứa danh sách các ô có số lượng đặt. Trả về danh sách mã đơn PO được khởi tạo.
- `POST /api/v1/purchase-orders/grid-draft`: Lưu bản nháp ma trận đặt hàng.
- `POST /api/v1/purchase-orders/grid-export-excel`: Xuất ma trận ra file CSV/XLSX.
- `POST /api/v1/purchase-orders/grid-import-excel`: Đọc file CSV/XLSX tải lên và điền lại vào ma trận số lượng.

### UI Screens & Component Hierarchy (React + Antd)
- **CreatePoGridPage**: Container chính quản lý state của ma trận.
  - **HeaderActionSection**: Hiển thị tiêu đề, trạng thái (Draft / Pending Approval), nút "Back".
  - **FilterBar**: `Select` Supplier, `Select` Branch, `DatePicker.RangePicker`, `Select` Category, `Input.Search` Keyword, Checkbox `MOQ only`, Checkbox `Ordered only`.
  - **GridToolBar**: Nút Download/Upload Excel, Nút chuyển tuần (Prev Week, This Week, Next Week), Nút "Copy Prev Week", Nút "Order Status".
  - **AvailabilityBanner**: Thẻ Alert/Banner hiển thị Lead time, Ngày lễ, Open AP vs Credit Limit.
  - **MatrixTable**: Bảng ma trận dữ liệu:
    - Cột cố định (Left): Tên sản phẩm + SKU, MOQ, Đơn vị tính, Giá nhập.
    - Cột động (Middle): 14 ngày (Format `MM/DD (DoW)`). Nếu là ngày không giao (Lead time violation / Day off / Holiday) -> ô xám `—` disabled. Ô hợp lệ -> `InputNumber`. Nếu `0 < qty < MOQ` -> vi phạm MOQ (viền đỏ + dấu `!`).
    - Cột tổng (Right): Total Qty từng dòng.
    - Dòng tổng (Bottom): Subtotal theo Category & Daily Total Qty theo từng ngày.
  - **ValidationIssueBox**: Danh sách các lỗi cần sửa trước khi Submit (Ví dụ: vi phạm MOQ, tổng số lượng ngày < DAY_MIN, chưa nhập ô nào).
  - **PoPreviewTable**: Bảng xem trước danh sách PO sẽ được tạo (Delivery Date | Total Lines | Total Qty | Total Amount).
  - **FooterBar**: Hiển thị Grand Total Amount, Grand Total Qty, Credit Status Label (Credit OK / Exceeded), Nút Cancel, Save Draft, Submit.

## 2. Quy tắc Nghiệp vụ & Validation Rules
- **Lead Time Rule**: Ngày giao hàng nhỏ hơn `Today + LeadDays` sẽ bị coi là không hợp lệ (ô xám `—`).
- **Active Days Rule**: Ngày nằm ngoài danh sách `activeDays` của Supplier (ví dụ Chủ Nhật) -> ô xám `—`.
- **Holiday Rule**: Ngày nằm trong mảng `holidays` -> ô xám `—`.
- **MOQ Rule**: Nếu `0 < quantity < Product.MOQ` -> Đưa vào `ValidationIssueList`, hiển thị dấu `!` cảnh báo, Disable nút Submit.
- **Daily Minimum Rule**: Nếu tổng số lượng đặt trong ngày `0 < DailyTotal < DAY_MIN` -> Đưa vào `ValidationIssueList`, Disable nút Submit.
- **Credit Approval Rule**: Nếu `OpenAP + GrandAmount > CreditLimit` -> Cho phép Submit nhưng trạng thái PO được gán là `PENDING_CREDIT_APPROVAL` (cần Chủ chuỗi/Kế toán duyệt). Ngược lại là `PENDING_APPROVAL`.

## 3. Database & Entity Schema Impact
- Sử dụng các Entity sẵn có: `PurchaseOrder` và `PurchaseOrderDetail`.
- Khi Submit ma trận có N ngày có phát sinh hàng:
  - Sinh N bản ghi `PurchaseOrder` với `DeliveryDate = Date_i`, `Status = PENDING_APPROVAL / PENDING_CREDIT_APPROVAL`, `SupplierId`, `BranchId`, `TotalAmount`.
  - Sinh tương ứng các `PurchaseOrderDetail` liên kết với `PurchaseOrder` của ngày đó.
