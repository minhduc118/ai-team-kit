# Proposal: Auth Login Feature

## Vấn đề
Hệ thống SGMS cần cơ chế xác thực người dùng an toàn, hỗ trợ multi-tenant.

## Đề xuất
Implement JWT authentication với refresh token pattern. Sử dụng bcrypt để hash password.

## Phương án
1. **JWT stateless** — access token 15 phút, refresh token 7 ngày
2. **Redis store** — lưu refresh tokens để hỗ trợ revoke
3. **Multi-tenant** — tenant_id trong JWT claims
