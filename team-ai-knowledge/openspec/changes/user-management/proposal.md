# Proposal: user-management

## Vấn đề
Hệ thống quản lý chuỗi cửa hàng tạp hoá MT-GRMS (SaaS đa tenant) cần cơ chế quản lý người dùng và phân quyền linh hoạt theo từng Tenant (Chủ chuỗi cửa hàng) và từng Chi nhánh/Cửa hàng. Hiện tại cần có giao diện và API tập trung để Admin/Tenant Manager quản lý danh sách nhân viên, tạo tài khoản mới, phân quyền truy cập và kiểm soát trạng thái tài khoản.

## Mục tiêu
Cung cấp bộ tính năng Quản lý người dùng (User Management) cho hệ thống MT-GRMS:
- Cho phép Quản trị viên (System Admin / Tenant Admin / Store Manager) xem danh sách người dùng thuộc Tenant/Chi nhánh của mình.
- Hỗ trợ tạo mới người dùng, gán vai trò (Role: Store Manager, Cashier, Inventory Staff,...).
- Hỗ trợ xem chi tiết, cập nhật thông tin cá nhân, cập nhật vai trò, và đổi trạng thái (Active / Inactive / Locked).
- Hỗ trợ đổi/đặt lại mật khẩu ban đầu cho nhân viên.
- Đảm bảo kiểm soát truy cập và phân lập dữ liệu triệt để theo `TenantId`.

## Phạm vi
- **In scope**:
  - API Backend (.NET 8): CRUD User, Lọc/Phân trang User theo Tenant/Branch/Status/Role, Đổi trạng thái User (Activate/Deactivate), Reset Password.
  - UI Frontend (Vite + React + Antd): Trang danh sách User (Table + Search + Filter), Modal/Drawer Tạo/Sửa User, Badge trạng thái, Modal Reset Password.
  - Phân quyền RBAC & cô lập dữ liệu theo `TenantId`.
- **Out of scope**:
  - Đăng nhập / Đăng xuất / Refresh Token / OAuth (thuộc Auth Module).
  - Quản lý ma trận phân quyền chi tiết động (Custom Dynamic Permissions - nếu phát triển sẽ ở change riêng).

## Người dùng liên quan
- **System Admin**: Quản lý tất cả tài khoản trong toàn bộ hệ thống SaaS.
- **Tenant Admin (Chủ chuỗi)**: Quản lý người dùng trong phạm vi Doanh nghiệp/Tenant của mình.
- **Store Manager (Quản lý cửa hàng)**: Quản lý nhân viên thuộc chi nhánh của mình.

## Tiêu chí thành công
- [ ] API backend hỗ trợ lấy danh sách phân trang, tìm kiếm và lọc user theo TenantId.
- [ ] Cho phép tạo mới tài khoản thành công với thông tin bắt buộc (Email, Full Name, Role, Branch).
- [ ] Cho phép khóa/kích hoạt tài khoản và reset mật khẩu thành công.
- [ ] UI trên Frontend hiển thị danh sách chuẩn Antd, thao tác mượt mà.
- [ ] Tuân thủ 100% Tenant Isolation (User Tenant A không thể xem/sửa User Tenant B).
