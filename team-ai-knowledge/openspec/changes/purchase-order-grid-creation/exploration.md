# Exploration: purchase-order-grid-creation

## 1. Hiện trạng & Phân tích UI mockup (create_po_grid.html)
Thiết kế `create_po_grid.html` cho thấy mô hình đặt hàng theo dạng **Matrix / Grid Scheduler**:
- Đặt hàng theo khung thời gian 2 tuần (14 ngày).
- Lọc theo Nhà cung cấp (Supplier), Chi nhánh (Branch), Khoảng ngày (From - To), Danh mục (Category), Từ khóa (Keyword/SKU), MOQ fail filter, Ordered filter.
- Quy tắc về lịch giao hàng của Supplier (`SUPPLIER_AVAIL`): Lead time (số ngày chờ giao tối thiểu), Active days (ngày làm việc trong tuần), Holidays (ngày lễ/nghỉ).
- Ràng buộc nghiệp vụ: MOQ theo sản phẩm (`qty < moq`), Tối thiểu số lượng đặt theo ngày (`dayQty < DAY_MIN`), Hạn mức công nợ (`OPEN_AP + grandAmt > CREDIT_LIMIT`).
- Khi Submit: Tự động gom các ô có số lượng > 0 thành N đơn Purchase Order (1 PO = 1 Supplier + 1 Delivery Date).

## 2. Assumptions & Non-Goals
### Assumptions
- Hệ thống đã có danh mục Nhà cung cấp, Chi nhánh, Sản phẩm & Giá nhập.
- Dữ liệu lịch giao hàng (Lead time, Active days, Holidays) và Hạn mức tín dụng (Credit Limit, Open AP) được quản lý ở Supplier Service.
- Giao diện Frontend dùng React 19 + TypeScript + Ant Design Table / Custom Matrix Grid.

### Non-Goals
- Không xử lý thanh toán trực tuyến ngay tại thời điểm đặt hàng.
- Không xử lý quy trình nhận hàng tại kho (Inbound Goods Receipt).

## 3. Các phương án kiến trúc & xử lý dữ liệu (Options)

### Option A: Grid State quản lý tại Frontend Client + Tách PO ở Backend Command (Khuyên dùng)
- **Mô tả**:
  - Frontend gọi API `GET /api/v1/purchase-orders/grid-data` để lấy toàn bộ danh sách sản phẩm, MOQ, giá và thông tin lịch giao hàng của Supplier.
  - Client tự tính toán ma trận, validate realtime (MOQ, Lead time, Total Qty) trên UI.
  - Khi Submit, Client gửi JSON chứa mảng các item có `ProductId`, `DeliveryDate`, `Quantity`. Backend tự group theo `DeliveryDate` và tạo hàng loạt bản ghi `PurchaseOrder` trong 1 Database Transaction.
- **Ưu điểm**: Phản hồi UI tức thì (dưới 10ms khi gõ số lượng), giảm tải request cho server, tách PO nguyên khối (Atomic Transaction).
- **Nhược điểm**: Logic validate cần đồng bộ giữa Frontend và Backend.

### Option B: Mỗi thao tác ô nhập đều gọi API Sync Grid State
- **Mô tả**: Gửi request về server mỗi khi thay đổi ô số lượng để server tính toán lại tổng tiền và validate.
- **Ưu điểm**: Server kiểm soát 100% logic.
- **Nhược điểm**: Gây giật lag UI khi nhập nhanh trên bảng ma trận lớn (14 ngày x 50 sản phẩm = 700 ô).

## 4. Phương án chọn & Lý do
**Chọn Option A**:
- Đảm bảo trải nghiệm người dùng mượt mà nhất trên ma trận số lượng.
- Phù hợp với tiêu chuẩn Karpathy (đơn giản, hiệu quả) và Clean Architecture của backend .NET 8.

## 5. Rủi ro & Biện pháp giảm thiểu
- **Rủi ro**: Sai lệch giá nhập hoặc hạn mức công nợ nếu master data thay đổi trong lúc nhân viên đang nhập ma trận.
- **Biện pháp**: Re-validate toàn bộ giá, MOQ và Credit Limit tại Backend Handler khi bấm Submit. Nếu vi phạm, rollback transaction và trả về danh sách lỗi cụ thể.
