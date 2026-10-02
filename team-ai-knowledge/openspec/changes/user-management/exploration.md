# Exploration: user-management

## 1. Hiện trạng
Hệ thống MT-GRMS (SGMS) đã có định nghĩa Entity `User` và `Role` kế thừa `BaseTenantEntity` trong `Domain.Entities.Identity`. Tuy nhiên, chưa có bộ API Use Case (Application) và UI Frontend (React + Antd) để quản lý danh sách người dùng, tạo mới, chỉnh sửa và phân quyền/đổi trạng thái.

## 2. Assumptions & Non-Goals
### Assumptions
- Người dùng truy cập API đã được xác thực qua JWT Token chứa `TenantId` và `UserId`.
- Mỗi User thuộc về 1 `TenantId`, có thể gán vào 1 `BranchId` cụ thể hoặc tất cả chi nhánh.
- Mật khẩu mặc định khi tạo mới sẽ được tạo ngẫu nhiên hoặc đặt theo chuẩn tạm thời để đổi lại khi đăng nhập lần đầu.

### Non-Goals
- Không xây dựng lại Auth/Login Service.
- Không triển khai hệ thống ma trận phân quyền động (Dynamic Matrix Permissions) phức tạp ở giai đoạn này.

## 3. Các phương án thiết kế (Options)

### Option A: Quản lý người dùng chuẩn RESTful CRUD + Single Role per User (Khuyên dùng)
- **Mô tả**: Mỗi User có 1 Role duy nhất (`RoleId`), hỗ trợ lọc/tìm kiếm theo `TenantId`, `BranchId`, `Status`. Đổi trạng thái qua endpoint toggle status.
- **Ưu điểm**: Đơn giản, dễ bảo trì, tuân thủ Clean Architecture sẵn có của dự án.
- **Nhược điểm**: Mỗi người dùng chỉ giữ 1 vai trò duy nhất trong hệ thống.

### Option B: Quản lý người dùng đa vai trò (Multi-Role per User) + Custom Permissions
- **Mô tả**: Cho phép 1 User có nhiều Roles và gán đè thêm Custom Permissions theo dạng JSON.
- **Ưu điểm**: Linh hoạt cao cho chuỗi lớn.
- **Nhược điểm**: Phức tạp hoá DB, khó quản lý middleware kiểm tra quyền ở giai đoạn đầu.

## 4. Phương án chọn & Lý do
**Chọn Option A**:
- Lý do: Đáp ứng 100% nhu cầu vận hành chuỗi cửa hàng tạp hoá MT-GRMS, đảm bảo nguyên tắc Karpathy (viết code tối giản, đúng nhu cầu).

## 5. Rủi ro & Biện pháp giảm thiểu
- **Rủi ro**: Lộ dữ liệu người dùng giữa các Tenant (Multi-Tenant leak).
- **Giảm thiểu**: Bắt buộc lọc `TenantId` từ JWT Token ở tất cả truy vấn Repository / EF Core Global Query Filter.
