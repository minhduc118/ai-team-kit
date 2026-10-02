# Proposal: purchase-order-grid-creation

## Vấn đề
Hiện tại việc nhập đơn đặt hàng cho nhà cung cấp (Purchase Order - PO) trong chuỗi cửa hàng tạp hoá MT-GRMS chủ yếu làm thủ công từng đơn cho một ngày cố định. Việc này gây tốn thời gian khi Store Manager / Purchasing Staff cần lên kế hoạch nhập hàng theo chu kỳ (ví dụ: lên lịch nhập hàng cho 14 ngày tới). Đồng thời, nhân viên khó kiểm soát các quy định giao hàng của nhà cung cấp (Lead time, ngày nghỉ/lịch giao, MOQ tối thiểu từng sản phẩm, tổng số lượng tối thiểu theo ngày) và nguy cơ vượt hạn mức tín dụng (Credit Limit).

## Mục tiêu
Cung cấp giao diện & API **Tạo Đơn Đặt Hàng Dạng Ma Trận (PO Grid Creation)** dựa trên thiết kế `create_po_grid.html`:
- Cho phép người dùng chọn Nhà cung cấp, Chi nhánh nhận hàng và khoảng thời gian (xem lịch 14 ngày/2 tuần).
- Hiển thị ma trận số lượng: Dòng = Sản phẩm của Nhà cung cấp (nhóm theo Danh mục), Cột = Các ngày giao hàng trong khoảng thời gian.
- Kiểm tra tự động các ràng buộc:
  - Lead time & Ngày giao hàng hợp lệ (Supplier Active Days & Holidays).
  - Số lượng tối thiểu theo sản phẩm (MOQ).
  - Số lượng tổng tối thiểu theo ngày (Daily Minimum Total).
  - Cảnh báo vượt hạn mức tín dụng công nợ (Credit Limit vs Open AP).
- Hỗ trợ các tiện ích: Tải/Nhập dữ liệu Excel (Export/Import CSV/XLSX), Sao chép số lượng tuần trước (Copy Prev Week), Lưu nháp (Save Draft).
- Tự động tách ma trận thành các đơn PO độc lập khi Submit (Mỗi PO = 1 Supplier + 1 Delivery Date).

## Phạm vi
- **In scope**:
  - **Frontend (Vite + React + Antd/Custom Grid)**: Màn hình ma trận PO theo thiết kế `create_po_grid.html`, bộ lọc (Supplier, Branch, Range, Category, Search, MOQ/Alert checkboxes), tính toán tổng Qty/Amount theo dòng & cột, xem trước danh sách PO tách tự động (PO Preview), các nút chức năng (Draft, Submit, Cancel, Copy Week, Excel Import/Export).
  - **Backend (.NET 8)**:
    - API lấy dữ liệu ma trận sản phẩm & lịch khả dụng của Nhà cung cấp (Lead time, Active days, Holidays).
    - API lưu bản nháp ma trận (Grid Draft).
    - API Submit ma trận: Validate MOQ/Lead time/Credit Limit, tự động phân tách và sinh hàng loạt đơn PO (`PurchaseOrder` + `PurchaseOrderDetail`) theo từng ngày giao hàng.
- **Out of scope**:
  - Giao diện duyệt đơn PO của Manager (nằm ở module/change Duyệt PO).
  - Quy trình nhận hàng / Kho hàng (Goods Receipt / Inbound Note).

## Người dùng liên quan
- **Purchasing Staff / Store Manager (Quản lý cửa hàng)**: Người lập kế hoạch đặt hàng nhập kho theo tuần/tháng.
- **Supplier (Nhà cung cấp)**: Bên tiếp nhận các đơn PO được tạo sau khi Submit.
- **Store Owner / Finance Manager**: Người duyệt đơn PO nếu tổng giá trị vượt hạn mức công nợ (Credit Exceeded).

## Tiêu chí thành công
- [ ] Giao diện Ma trận hiển thị đúng các ngày giao hàng khả dụng dựa theo Lead time và Lịch giao của Nhà cung cấp.
- [ ] Báo lỗi trực quan và chặn Submit nếu có sản phẩm vi phạm MOQ hoặc ngày vi phạm Daily Minimum.
- [ ] Tự động chuyển trạng thái PO thành `PENDING_CREDIT_APPROVAL` nếu tổng công nợ vượt hạn mức tín dụng (`Credit Limit`).
- [ ] Tự động tạo đúng N đơn PO tương ứng với N ngày giao hàng có phát sinh số lượng khi bấm Submit.
- [ ] Hỗ trợ Export/Import dữ liệu qua file Excel (.csv/.xlsx) và Copy dữ liệu từ tuần trước.
