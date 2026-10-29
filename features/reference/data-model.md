# Data Model Reference

**Status:** Integrated schema through **Feature 5** (`users`, `sessions`, `lists`, `todos` with optional `dueDate`).  
**Authority for new work:** feature specs in `features/` — update this file in the same PR when schema changes.  
**Architecture:** [ADR-0003 — MySQL relational database](../../docs/adr/0003-mysql-relational-database.md)

## Feature provenance

| Table / column | Introduced |
|----------------|------------|
| `users`, `sessions` | Feature 1 |
| `lists` | Feature 2 |
| `todos` | Feature 3 |
| Profile read/update of existing `users` columns | Feature 4 |
| `todos.dueDate` | Feature 5 |

---

## `users`

| Column | Type | Rules |
|--------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `fName` | STRING | Required; trimmed on profile update |
| `lName` | STRING | Required; trimmed on profile update |
| `email` | STRING | Required, unique; trimmed on profile update |
| `username` | STRING(100) | Required, unique; trimmed and stored lowercase (`beforeValidate` hook and profile update) |
| `password` | STRING(255) | Required; bcrypt hash only (never returned by API). Profile update replaces the hash only when a new password is sent |
| `role` | STRING(20) | Default `worker`; returned on profile read, not writable via profile update |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

**Sequelize:** `defaultScope` excludes `password` from query results. Use `unscoped()` when comparing passwords at login.

---

## `sessions`

| Column | Type | Rules |
|--------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `token` | STRING | Required; JWT string; cleared to `""` on logout |
| `email` | STRING | Required |
| `expirationDate` | DATE | Required; 24-hour lifetime from creation |
| `userId` | INTEGER FK | Required → `users.id` |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

---

## `lists`

| Column | Type | Rules |
|--------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING(100) | Required; trimmed; max 100 characters |
| `userId` | INTEGER FK | Required → `users.id`; set from the authenticated user on create |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

---

## `todos`

| Column | Type | Rules |
|--------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `listId` | INTEGER FK | Required → `lists.id`; deleting a list deletes its todos (`onDelete: CASCADE`) |
| `title` | STRING(255) | Required; trimmed; max 255 characters |
| `completed` | BOOLEAN | Required; default `false` |
| `dueDate` | DATEONLY | Nullable; optional on create and update. `null` means no due date. Cleared by `PUT` with `dueDate: null`; omitted `dueDate` leaves the stored value |
| `userId` | INTEGER FK | Required → `users.id`; set from the authenticated user on create |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

---

## Associations

* `User hasMany Session` — `onDelete: CASCADE`
* `Session belongsTo User`
* `User hasMany List` — `onDelete: CASCADE`
* `List belongsTo User`
* `List hasMany Todo` — `onDelete: CASCADE`
* `Todo belongsTo List` — `onDelete: CASCADE`
* `User hasMany Todo`
* `Todo belongsTo User`
