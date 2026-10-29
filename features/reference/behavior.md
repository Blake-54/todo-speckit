# Behavior & Rules Reference

**Living snapshot** of product rules currently in force on `dev` (not API shapes or columns — see [api.md](./api.md) and [data-model.md](./data-model.md)).

These files answer: *"What rules does the app enforce right now?"*  
They do **not** authorize new scope — implement only from `features/feature-*.md` (**FR-00N** + Gherkin). Deep scenarios stay in the introducing feature; this file is an **index**.

**Related:** [ADR-0002 — Security architecture](../../docs/adr/0002-security-architecture.md)

---

## Maintenance

| When | Action |
|------|--------|
| Feature changes a product rule (sort, ownership, validation, UI rule) | Update this file in the **same PR** |
| Feature only changes routes/payloads/schema | Update [api.md](./api.md) / [data-model.md](./data-model.md); touch this file only if rules changed |
| Drift suspected | Compare this file → code + mapped tests; fix reference or code |

---

## Auth & sessions

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Login is **username + password** (not email-only) | Auth API + Login UI | Feature 1 |
| Passwords hashed with bcrypt (`SALT_ROUNDS = 10`); hash never returned | Register/login APIs; user `defaultScope` | Feature 1 |
| Session = JWT stored server-side; client sends `Authorization: Bearer <token>` | `authenticate` middleware + `sessions` table | Feature 1 |
| Session lifetime **24 hours** from creation | Session create on register/login (`expiresIn: 86400`) | Feature 1 |
| Login reuses a non-expired session for the same user when one exists | Login/register session helper | Feature 1 |
| Logout invalidates the server session (token cleared to `""`) and removes client `user` storage | Logout API + `authServices.logoutUser` | Feature 1 |
| Unauthenticated protected API → `401` | `authenticate` | Feature 1 |
| Unauthenticated protected UI → redirect to login | Router `beforeEach` | Feature 1 |
| Signed-in user visiting login/register → redirect to home | Router `beforeEach` | Feature 1 |
| Default role for new users is `worker` | Register | Feature 1 |
| Username normalized `trim().toLowerCase()` on save | User model hook + auth controller + profile update | Feature 1, Feature 4 |
| Shared `emailRules` for registration and Edit Profile (required + format `"Enter a valid email address."`) | `frontend/src/config/validation.js` | Feature 1, Feature 4 |
| Profile update trims `fName`, `lName`, `email`, and `username`; blank required strings are rejected | Profile update | Feature 4 |
| Profile password is optional; when sent it must be at least 8 characters and is bcrypt-hashed; when omitted the stored hash is unchanged | Profile update | Feature 4 |
| Profile `role` is read-only | Profile update ignores `role` | Feature 4 |
| Duplicate profile username → `"Username is already taken."`; duplicate email → `"Email is already registered."` | Profile update | Feature 4 |
| After a successful profile save, `localStorage` key `user` is refreshed (session token kept) and `user-logged-in` is dispatched | Edit Profile dialog | Feature 4 |

## Ownership & isolation

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Every authenticated request resolves to `req.user.id` from the session | `authenticate` | Feature 1 |
| `GET /todo/lists` returns only the caller's lists, ordered alphabetically by name | List read | Feature 2 |
| Create sets `userId` from the session; a `userId` in the body is ignored | List create | Feature 2 |
| Rename and delete apply only when `id` and `userId` both match; cross-user access is `404` | `getAccessibleListOrNull` | Feature 2 |
| A list's owner never changes after create | List update writes `name` only | Feature 2 |
| List names are trimmed; empty or whitespace-only names are rejected | List create/rename + dashboard form | Feature 2 |
| List names longer than 100 characters are rejected | List create/rename | Feature 2 |
| A todo belongs to exactly one list and one user for its lifetime | Todo create sets `listId` from the path and `userId` from the session; update does not change either | Feature 3 |
| `GET /todo/lists/:listId/todos` returns only the caller's todos for an owned list, incomplete first, then `createdAt` ascending | Todo read | Feature 3 |
| Create sets `userId` from the session and `listId` from `:listId`; body `userId`, `listId`, and `completed` are ignored | Todo create | Feature 3 |
| New todos start `completed: false` | Todo create | Feature 3 |
| Todo titles are trimmed; empty or whitespace-only titles are rejected | Todo create/update + items dialog forms | Feature 3 |
| Todo titles longer than 255 characters are rejected | Todo create/update | Feature 3 |
| Read, update, and delete apply only when the todo `id` and `userId` both match; a missing or unowned parent list or todo is `404` | `getAccessibleListOrNull`, `getAccessibleTodoOrNull` | Feature 3 |
| Deleting a list deletes every todo in that list | List delete + `List hasMany Todo` `onDelete: CASCADE` | Feature 3 |
| A user may read and update only their own profile; another user's id is `404` with `"User with id=<id> not found."` | `getAccessibleUserOrNull` | Feature 4 |

## UI

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Login and register are full-screen auth layouts (no `MenuBar`) | `App.vue` + Login/Register views | Feature 1 |
| Signed-in home is one lists view: heading **My Lists**, **+ New List**, and edit/delete dialogs on each row | `Dashboard.vue` | Feature 2 |
| Each list row has an **Items** icon that opens that list's items dialog; add, edit, and delete todos use dialogs opened from there | `Dashboard.vue` | Feature 3 |
| **+ Add Item** is only inside the list-items dialog; it and **Add** use class `oc-cta` | `Dashboard.vue` | Feature 3 |
| Empty todos copy is **No todos in this list yet.** | `Dashboard.vue` | Feature 3 |
| Completed todos show struck-through, muted titles | `Dashboard.vue` | Feature 3 |
| Empty lists copy is **No lists yet. Create your first list.** | `Dashboard.vue` | Feature 2 |
| List and todo API failures use `<v-alert type="error">` | `Dashboard.vue` | Feature 2, Feature 3 |
| `MenuBar` is hidden on login and register | `MenuBar.vue` + `App.vue` | Feature 2 |
| `MenuBar` shows a user icon (`mdi-account-circle`) that opens a profile dropdown with full name, username, email, **Edit Profile** (`oc-cta`), and **Log out** | `MenuBar.vue` | Feature 4 |
| Logout is only **Log out** in the profile dropdown; the menu bar has no **Sign out** button | `MenuBar.vue` | Feature 4 |
| **Log out** clears the server session, removes `localStorage` key `user`, and redirects to login | `authServices.logoutUser` | Feature 1, Feature 4 |
| Edit Profile pre-fills name, email, and username; password fields start empty. Invalid email, a password shorter than 8 characters, and mismatched passwords are blocked in the form. API errors stay in an error alert with the dialog open | `MenuBar.vue` | Feature 4 |
| Session stored in `localStorage` key `user` | `Utils.setStore` after login/register | Feature 1 |
| Auth form errors via `<v-alert type="error">`; client validation blocks empty/invalid submit | Login/Register views | Feature 1 |

## Errors (product convention)

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Error body shape `{ "message": "Human-readable explanation." }` | Controllers | Feature 1 |
| Missing/invalid session on protected routes uses `401` | `authenticate` | Feature 1 |
| Unowned or missing list uses `404` with `"List with id=<id> not found."` | List update/delete; todo read/create on that list | Feature 2, Feature 3 |
| Invalid list id uses `400` with `"Invalid list id."` | List update/delete; todo read/create | Feature 2, Feature 3 |
| Unowned or missing todo uses `404` with `"Todo with id=<id> not found."` | Todo update/delete | Feature 3 |
| Invalid todo id uses `400` with `"Invalid todo id."` | Todo update/delete | Feature 3 |
| Empty todo title uses `400` with `"Todo title is required."` | Todo create/update | Feature 3 |
| Missing or unowned profile uses `404` with `"User with id=<id> not found."` (never `403`) | Profile read/update | Feature 4 |
| Invalid user id uses `400` with `"Invalid user id."` | Profile read/update | Feature 4 |
| Profile password shorter than 8 characters uses `400` with `"Password must be at least 8 characters."` | Profile update | Feature 4 |
| Blank profile first name uses `400` with `"First name is required."` | Profile update | Feature 4 |

---

## How to use

| Question | Look here |
|----------|-----------|
| What rule is in force now? | This file |
| Why was this rule chosen? | Feature FR / Gherkin, or ADR |
| Exact scenario / test name | Introducing `feature-N-*.md` Test Coverage Map |
| Routes and payloads | [api.md](./api.md) |
| Tables and columns | [data-model.md](./data-model.md) |
