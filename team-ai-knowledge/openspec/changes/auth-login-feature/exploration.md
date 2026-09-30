# Exploration: Auth Options

## Phân tích các lựa chọn

### Option 1: Session-based (traditional)
- Pros: Đơn giản, revoke ngay lập tức
- Cons: Không scale tốt, cần sticky session

### Option 2: JWT stateless ✅ Chọn
- Pros: Stateless, scale tốt, multi-tenant friendly
- Cons: Revoke phức tạp → giải quyết bằng Redis

### Option 3: OAuth2 (Firebase/Auth0)
- Pros: Không tự maintain
- Cons: Chi phí, vendor lock-in, không phù hợp yêu cầu

## Kết luận
Dùng JWT + Redis cho refresh token blacklist.
