# openspec/specs — Spec gốc theo capability

Mỗi capability có một file `openspec/specs/<capability>/spec.md`, là "sự thật hiện tại" của hệ thống.

- **Không sửa tay.** Spec gốc chỉ thay đổi khi một change chạy `/sep-archive`: MCP tool `sep_chuyen_trang_thai archived`
  merge `openspec/changes/<change>/specs.md` (định dạng delta) vào đây và commit cùng lúc.
- Capability của change được chọn lúc `/sep-spec` (tham số `capability`, mặc định = tên change).
  Nhiều change cùng capability (VD: `supplier-management`, `supplier-import-excel`) sẽ cộng dồn vào cùng một spec.

## Định dạng delta trong specs.md của change

```markdown
## ADDED Requirements
### Requirement: REQ-01 Tạo nhà cung cấp
Hệ thống MUST cho phép Store Manager tạo nhà cung cấp trong tenant của mình.

#### Scenario: Tạo thành công
- GIVEN ...
- WHEN ...
- THEN ...

## MODIFIED Requirements
### Requirement: REQ-03 Tìm kiếm nhà cung cấp
(nội dung đầy đủ mới — thay thế block cùng tên trong spec gốc)

## REMOVED Requirements
### Requirement: REQ-07 Xuất CSV
```

Khi merge: ADDED → thêm, MODIFIED → thay block cùng tên, REMOVED → xoá theo tên. Lịch sử merge ghi ở cuối spec gốc.
