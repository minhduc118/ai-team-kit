# Design Brief: Auth Login Feature

## Architecture
```
Client → POST /auth/login → AuthController → AuthService → UserRepo + TokenService
                                                          ↓
                                                    JWT pair (access + refresh)
```

## Components
- `AuthController` — xử lý HTTP requests
- `AuthService` — business logic: validate, generate tokens
- `TokenService` — create/verify/revoke JWT
- `UserRepository` — data access

## Data Flow
1. User gửi `{email, password}`
2. AuthService validate credentials
3. Generate access token (15min) + refresh token (7d)
4. Store refresh token trong Redis
5. Return tokens + user info

## Security
- bcrypt cost factor: 12
- Rate limiting: 5 requests/minute per IP
- Token rotation on refresh
