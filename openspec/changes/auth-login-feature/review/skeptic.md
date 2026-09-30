# Skeptic Review: auth-login-feature

## Điểm yếu / Vấn đề cần giải quyết

### 🔴 Critical
- Chưa có spec về password reset flow — người dùng quên mật khẩu thì sao?
- Thiếu mô tả về multi-tenant isolation — token của tenant A có thể dùng cho tenant B không?

### 🟡 Warning
- Rate limiting 5 req/min quá chặt cho mobile app (offline → online burst)
- Chưa nói rõ CORS policy
- Refresh token rotation: nếu client gửi đồng thời 2 request thì race condition?

### ✅ Tốt
- JWT stateless approach phù hợp scale
- bcrypt cost 12 hợp lý
- Token rotation an toàn

## Đề xuất
1. Thêm spec password reset
2. Nêu rõ tenant isolation rules
3. Tăng rate limit lên 20 req/min hoặc dùng sliding window
