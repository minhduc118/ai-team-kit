# Specs: Auth Login Feature

## Endpoints

### POST /api/auth/login
**Request:**
```json
{ "email": "user@example.com", "password": "secret123" }
```
**Response 200:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 900,
  "user": { "id": 1, "email": "user@example.com", "tenantId": "T1" }
}
```
**Error 401:** Invalid credentials

### POST /api/auth/refresh
**Request:** `{ "refreshToken": "eyJ..." }`
**Response:** New access token pair

### POST /api/auth/logout
**Request:** Bearer token in header
**Response 204:** No content (blacklists refresh token)

## Validation
- email: valid format, max 255 chars
- password: min 8 chars

## Error Codes
| Code | Message |
|------|---------|
| AUTH_001 | Invalid email or password |
| AUTH_002 | Token expired |
| AUTH_003 | Token invalid |
| AUTH_004 | Too many attempts |
