# Design Brief: user-management

## 1. Luồng UI & Endpoint API

### Endpoints (RESTful API)
- `GET /api/v1/users`: Danh sách người dùng (Paging, Lọc theo Username/FullName, RoleId, BranchId, Status).
- `GET /api/v1/users/{id}`: Chi tiết thông tin 1 người dùng.
- `POST /api/v1/users`: Tạo tài khoản người dùng mới.
- `PUT /api/v1/users/{id}`: Cập nhật thông tin cá nhân & vai trò.
- `PATCH /api/v1/users/{id}/status`: Đổi trạng thái Kích hoạt / Khóa.
- `POST /api/v1/users/{id}/reset-password`: Đặt lại mật khẩu.

### UI Screens & Components (React + Antd)
- **UserListPage**: Bảng danh sách `Table`, Filter bar (Input Search, Select Role, Select Branch, Select Status), Nút "Thêm người dùng".
- **UserFormModal**: Modal tạo/sửa thông tin User (`Form` với `Input`, `Select Role`, `Select Branch`).
- **UserStatusBadge**: Component Tag màu xanh (Active) / đỏ (Inactive).

## 2. Trạng thái giao diện (UI States)
- **Loading**: Antd Skeleton / Spin trong bảng khi fetch API.
- **Empty**: Antd Empty component khi không có người dùng nào khớp với bộ lọc.
- **Error**: Antd Notification / Alert hiển thị lỗi trả về từ API (ProblemDetails).

## 3. Quy tắc Nghiệp vụ & Phân quyền
- **Phân quyền**: Chỉ `SystemAdmin`, `TenantAdmin`, và `StoreManager` có quyền quản lý User.
- **Cô lập dữ liệu**: `TenantAdmin` chỉ quản lý user thuộc Tenant của mình. `StoreManager` chỉ quản lý user thuộc Branch của mình.
- **Validation**: Username & Email không được trùng lặp trong cùng Tenant.
