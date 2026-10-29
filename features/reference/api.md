# API Reference

**Base path:** `/todo/`  
**Status:** Integrated API through **Feature 4** (user profile management).  
**Authority for new work:** feature specs in `features/` — update this file in the same PR when routes or payloads change.

**Auth:** Send `Authorization: Bearer <token>` on protected routes.  
**Errors:** `{ "message": "Human-readable explanation." }` unless noted.

## Feature provenance

| Area | Feature |
|------|---------|
| Register, login, logout | 1 |
| List CRUD | 2 |
| Todo items | 3 |
| Profile read and update | 4 |

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

## Profile (Feature 4)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/todo/users/:id` | Yes | Fetch the authenticated user's own profile |
| `PUT` | `/todo/users/:id` | Yes | Update the authenticated user's own profile |

Both routes succeed only when `:id` is the caller's user id. Another user's id returns `404`.

**Update body:**
```json
{
  "fName": "Jane",
  "lName": "Doe",
  "email": "jane@example.com",
  "username": "jdoe",
  "password": "newpassword123"
}
```

`fName`, `lName`, `email`, and `username` are required. `password` is optional; omit it to leave the current password unchanged. `role` in the body is ignored. Fields are trimmed; `username` is stored lowercase.

**Profile object** (`200` get · `200` update):
```json
{
  "id": 42,
  "fName": "Jane",
  "lName": "Doe",
  "email": "jane@example.com",
  "username": "jdoe",
  "role": "worker",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:05:00.000Z"
}
```

The password hash is never included.

**Profile errors:** missing or blank first name `400` (`"First name is required."`); missing or blank last name `400` (`"Last name is required."`); missing or blank email `400` (`"Email is required."`); missing or blank username `400` (`"Username is required."`); password present and shorter than 8 characters `400` (`"Password must be at least 8 characters."`); duplicate username `400` (`"Username is already taken."`); duplicate email `400` (`"Email is already registered."`); invalid user id `400` (`"Invalid user id."`); missing or unowned user `404` (`"User with id=<id> not found."`); missing or invalid token `401`.

---

## Lists (Feature 2)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/todo/lists` | Yes | Lists owned by the caller, alphabetical by name |
| `POST` | `/todo/lists` | Yes | Create a list owned by the caller |
| `PUT` | `/todo/lists/:listId` | Yes | Rename a list owned by the caller |
| `DELETE` | `/todo/lists/:listId` | Yes | Delete a list owned by the caller |

**Create / rename body:**
```json
{ "name": "Groceries" }
```

`userId` in the body is ignored. The saved owner is always the authenticated user.

**List object** (`201` create · `200` rename · each `GET` element):
```json
{
  "id": 1,
  "name": "Groceries",
  "userId": 42,
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Delete success** (`200`):
```json
{ "message": "List deleted." }
```

**List errors:** empty or whitespace-only name `400` (`"List name is required."`); name longer than 100 characters `400` (`"List name must be 100 characters or fewer."`); invalid `listId` `400` (`"Invalid list id."`); missing or unowned list `404` (`"List with id=<id> not found."`); missing or invalid token `401`.

Deleting a list also deletes its todos.

---

## Todos (Feature 3)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/todo/lists/:listId/todos` | Yes | Todos in a list owned by the caller |
| `POST` | `/todo/lists/:listId/todos` | Yes | Add a todo to a list owned by the caller |
| `PUT` | `/todo/todos/:id` | Yes | Update title and/or `completed` on a todo owned by the caller |
| `DELETE` | `/todo/todos/:id` | Yes | Delete a todo owned by the caller |

Todos are ordered incomplete first, then by `createdAt` ascending (`id` ascending breaks remaining ties).

**Create body:**
```json
{ "title": "Buy milk" }
```

`userId`, `listId`, and `completed` in the body are ignored. The saved owner is the authenticated user, the list is the `:listId` path parameter, and `completed` is `false`.

**Update body** (at least one field):
```json
{ "title": "Buy oat milk", "completed": true }
```

`userId` and `listId` in the body are ignored. A todo stays on the list and user it was created with.

**Todo object** (`201` create · `200` update · each `GET` element):
```json
{
  "id": 10,
  "listId": 1,
  "title": "Buy milk",
  "completed": false,
  "userId": 42,
  "createdAt": "2026-07-02T12:05:00.000Z",
  "updatedAt": "2026-07-02T12:05:00.000Z"
}
```

**Delete success** (`200`):
```json
{ "message": "Todo deleted." }
```

**Todo errors:** empty or whitespace-only title `400` (`"Todo title is required."`); title longer than 255 characters `400` (`"Todo title must be 255 characters or fewer."`); update body with neither `title` nor `completed` `400` (`"Todo title or completed status is required."`); `completed` present but not a boolean `400` (`"Completed must be true or false."`); invalid `listId` `400` (`"Invalid list id."`); invalid todo id `400` (`"Invalid todo id."`); missing or unowned parent list `404` (`"List with id=<id> not found."`); missing or unowned todo `404` (`"Todo with id=<id> not found."`); missing or invalid token `401`.
