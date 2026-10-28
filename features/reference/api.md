# API Reference

**Base path:** `/todo/`  
**Status:** Integrated API through **Feature 1** (authentication).  
**Authority for new work:** feature specs in `features/` — update this file in the same PR when routes or payloads change.

**Auth:** Send `Authorization: Bearer <token>` on protected routes.  
**Errors:** `{ "message": "Human-readable explanation." }` unless noted.

## Feature provenance

| Area | Feature |
|------|---------|
| Register, login, logout | 1 |
| Authenticated `GET /todo/lists` (empty array until list persistence) | 1 |

---

## Authentication (Feature 1)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/todo/register` | No | Create account |
| `POST` | `/todo/login` | No | Sign in; returns session payload |
| `POST` | `/todo/logout` | Yes | Invalidate session token |

**Register body:**
```json
{
  "fName": "Jane",
  "lName": "Doe",
  "email": "jdoe@example.com",
  "username": "jdoe",
  "password": "password123"
}
```

**Login body:**
```json
{
  "username": "jdoe",
  "password": "password123"
}
```

**Register / login success** (`201` register · `200` login):
```json
{
  "userId": 1,
  "username": "jdoe",
  "email": "jdoe@example.com",
  "fName": "Jane",
  "lName": "Doe",
  "role": "worker",
  "token": "<jwt>"
}
```

Password hashes are never included in API responses.

**Logout success** (`200`):
```json
{
  "message": "Signed out successfully."
}
```

**Common auth errors:** missing fields `400`; password < 8 chars `400` (`"Password must be at least 8 characters."`); duplicate username `"Username is already taken."`; duplicate email `"Email is already registered."`; invalid login `401` with `"Invalid username or password."`; missing/invalid token on protected routes `401` (`"Unauthorized! No token provided."` or `"Unauthorized! Invalid or expired token."`).

---

## Lists (Feature 1 foundation)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/todo/lists` | Yes | Lists owned by the caller |

**Success (`200`):** JSON array. List CRUD and persistence ship in Feature 2; this endpoint currently returns `[]` scoped to the authenticated user.

**Unauthenticated:** `401`.
