# Tasks: auth-login-feature

## Backend Tasks

- [ ] BE-01: Setup AuthModule (NestJS) + dependencies (bcrypt, jsonwebtoken, ioredis)
- [ ] BE-02: UserEntity + UserRepository (với password hash)
- [ ] BE-03: AuthService.login() — validate + generate tokens
- [ ] BE-04: TokenService — create/verify/revoke JWT
- [ ] BE-05: POST /auth/login endpoint
- [ ] BE-06: POST /auth/refresh endpoint
- [ ] BE-07: POST /auth/logout endpoint
- [ ] BE-08: JWT Guard + decorator @CurrentUser
- [ ] BE-09: Rate limiting middleware (5 → 20 req/min, sliding window)
- [ ] BE-10: Unit tests AuthService (>80% coverage)
- [ ] BE-11: E2E tests auth flow

## Frontend Tasks

- [ ] FE-01: Login form component (email + password + submit)
- [ ] FE-02: API integration AuthService.ts
- [ ] FE-03: Zustand auth store (token, user, isAuthenticated)
- [ ] FE-04: Axios interceptor tự động refresh token
- [ ] FE-05: Protected route HOC
- [ ] FE-06: Logout button

## Estimate
BE: 5 ngày | FE: 3 ngày | Total: ~8 ngày
