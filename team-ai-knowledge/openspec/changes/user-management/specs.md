# Specs: user-management

## API / Contract
| Method | Path | Request | Response | Lỗi |
|---|---|---|---|---|
| GET | `/api/v1/users` | Query: `page`, `pageSize`, `search`, `roleId`, `status` | `PagedResult<UserDto>` | `401`, `403` |
| GET | `/api/v1/users/{id}` | Path: `id` | `UserDetailDto` | `404 Not Found` |
| POST | `/api/v1/users` | Body: `CreateUserDto` | `UserDto` | `400 Bad Request` (trùng email/username) |
| PUT | `/api/v1/users/{id}` | Body: `UpdateUserDto` | `UserDto` | `404`, `400` |
| PATCH | `/api/v1/users/{id}/status` | Body: `{ isActive: boolean }` | `204 No Content` | `404` |
| POST | `/api/v1/users/{id}/reset-password` | Body: `{ newPassword: string }` | `204 No Content` | `400` |

## ADDED Requirements

### Requirement: REQ-USER-01 Lấy danh sách người dùng theo Tenant
Hệ thống MUST chỉ trả về danh sách người dùng thuộc `TenantId` của tài khoản đang đăng nhập.

#### Scenario: Tenant Admin xem danh sách nhân viên
- GIVEN Tenant Admin đã đăng nhập với `TenantId = tenant-1`
- WHEN gửi yêu cầu `GET /api/v1/users`
- THEN hệ thống trả về HTTP 200 kèm danh sách chỉ gồm các người dùng có `TenantId = tenant-1`.

#### Scenario: Tìm kiếm người dùng theo tên
- GIVEN danh sách người dùng của Tenant
- WHEN nhập từ khóa `"Nguyễn"` vào ô tìm kiếm
- THEN hệ thống chỉ trả về các người dùng có `FullName` hoặc `Username` chứa từ khóa `"Nguyễn"`.

### Requirement: REQ-USER-02 Tạo mới tài khoản người dùng
Hệ thống MUST kiểm tra tính duy nhất của Username và Email trong cùng 1 Tenant trước khi lưu người dùng mới.

#### Scenario: Tạo tài khoản hợp lệ
- GIVEN Tenant Admin nhập thông tin Username `"cashier01"`, Email `"cashier01@store.com"`, RoleId hợp lệ
- WHEN gửi yêu cầu `POST /api/v1/users`
- THEN hệ thống tạo bản ghi User mới trong cơ sở dữ liệu và trả về HTTP 201 Created.

#### Scenario: Tạo tài khoản trùng Email
- GIVEN Email `"cashier01@store.com"` đã tồn tại trong Tenant
- WHEN Tenant Admin gửi yêu cầu `POST /api/v1/users` với Email này
- THEN hệ thống từ chối và trả về HTTP 400 Validation Error với thông báo "Email đã được sử dụng trong hệ thống".

### Requirement: REQ-USER-03 Bật/Tắt trạng thái tài khoản
Hệ thống MUST cho phép Admin chuyển đổi trạng thái `IsActive` của người dùng.

#### Scenario: Vô hiệu hóa người dùng nghỉ việc
- GIVEN người dùng đang ở trạng thái `IsActive = true`
- WHEN gửi `PATCH /api/v1/users/{id}/status` với `{ isActive: false }`
- THEN hệ thống cập nhật `IsActive = false` và không cho phép tài khoản này đăng nhập tiếp.

## Acceptance checklist
- [ ] REQ-USER-01: API `GET /api/v1/users` lọc chuẩn theo `TenantId` và phân trang thành công.
- [ ] REQ-USER-02: API `POST /api/v1/users` validate trùng Email/Username và lưu User mới.
- [ ] REQ-USER-03: API `PATCH /api/v1/users/{id}/status` cập nhật trạng thái `IsActive` thành công.
