/**
 * Feature 3 — Todo List Item Management
 * Spec: features/feature-3-todo-list-item-management.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, resetTestDatabase, registerUser } from "./helpers.js";

const createList = async (authHeader, name) => {
  const response = await request(app)
    .post("/todo/lists")
    .set(authHeader)
    .send({ name });

  expect(response.status).toBe(201);
  return response.body;
};

const postTodo = (authHeader, listId, body) =>
  request(app).post(`/todo/lists/${listId}/todos`).set(authHeader).send(body);

describe("Feature 3 — Todo List Item Management", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-3.1 — Add tasks to a list", () => {
    it("User adds a todo to a list via dialog", async () => {
      const user = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const list = await createList(user.authHeader, "Groceries");

      const invalidList = await postTodo(user.authHeader, "nope", {
        title: "Buy milk",
      });
      expect(invalidList.status).toBe(400);
      expect(invalidList.body).toEqual({ message: "Invalid list id." });

      const tooLong = await postTodo(user.authHeader, list.id, {
        title: "a".repeat(256),
      });
      expect(tooLong.status).toBe(400);
      expect(tooLong.body).toEqual({
        message: "Todo title must be 255 characters or fewer.",
      });

      const boundary = await postTodo(user.authHeader, list.id, {
        title: "b".repeat(255),
      });
      expect(boundary.status).toBe(201);
      expect(boundary.body.title).toHaveLength(255);

      const response = await postTodo(user.authHeader, list.id, {
        title: "  Buy milk  ",
        completed: true,
        listId: 12345,
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        listId: list.id,
        title: "Buy milk",
        completed: false,
        userId: user.user.userId,
      });
      expect(response.body.createdAt).toEqual(expect.any(String));
      expect(response.body.updatedAt).toEqual(expect.any(String));

      const stored = await db.todo.findByPk(response.body.id);
      expect(stored.title).toBe("Buy milk");
      expect(stored.completed).toBe(false);
      expect(stored.userId).toBe(user.user.userId);
      expect(stored.listId).toBe(list.id);
    });

    it("User adds a todo with an empty title", async () => {
      const user = await registerUser();
      const list = await createList(user.authHeader, "Groceries");

      const empty = await postTodo(user.authHeader, list.id, { title: "" });
      const whitespace = await postTodo(user.authHeader, list.id, { title: "   " });
      const missing = await postTodo(user.authHeader, list.id, {});

      expect(empty.status).toBe(400);
      expect(empty.body).toEqual({ message: "Todo title is required." });
      expect(whitespace.status).toBe(400);
      expect(whitespace.body).toEqual({ message: "Todo title is required." });
      expect(missing.status).toBe(400);
      expect(missing.body).toEqual({ message: "Todo title is required." });
      expect(await db.todo.count()).toBe(0);
    });
  });

  describe("US-3.2 — View tasks in a list", () => {
    it("User only sees their own todos when opening items", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });
      const listA = await createList(userA.authHeader, "Work");
      const listB = await createList(userB.authHeader, "Work");

      const mine = await postTodo(userA.authHeader, listA.id, { title: "My task" });
      const theirs = await postTodo(userB.authHeader, listB.id, { title: "Their task" });
      expect(mine.status).toBe(201);
      expect(theirs.status).toBe(201);

      const response = await request(app)
        .get(`/todo/lists/${listA.id}/todos`)
        .set(userA.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.map((todo) => todo.title)).toEqual(["My task"]);
      expect(response.body.every((todo) => todo.userId === userA.user.userId)).toBe(true);
      expect(response.body.some((todo) => todo.title === "Their task")).toBe(false);

      const missing = await request(app)
        .get("/todo/lists/999999/todos")
        .set(userA.authHeader);
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({ message: "List with id=999999 not found." });
    });
  });

  describe("US-3.3 — Complete tasks", () => {
    it("User marks a todo as complete", async () => {
      const user = await registerUser();
      const list = await createList(user.authHeader, "Groceries");
      const milk = await postTodo(user.authHeader, list.id, { title: "Buy milk" });
      const eggs = await postTodo(user.authHeader, list.id, { title: "Buy eggs" });
      expect(milk.status).toBe(201);
      expect(eggs.status).toBe(201);

      const invalidCompleted = await request(app)
        .put(`/todo/todos/${milk.body.id}`)
        .set(user.authHeader)
        .send({ completed: "yes" });
      expect(invalidCompleted.status).toBe(400);
      expect(invalidCompleted.body).toEqual({
        message: "Completed must be true or false.",
      });

      const response = await request(app)
        .put(`/todo/todos/${milk.body.id}`)
        .set(user.authHeader)
        .send({ completed: true, userId: 999, listId: 12345 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: milk.body.id,
        listId: list.id,
        title: "Buy milk",
        completed: true,
        userId: user.user.userId,
      });

      const stored = await db.todo.findByPk(milk.body.id);
      expect(stored.completed).toBe(true);
      expect(stored.userId).toBe(user.user.userId);
      expect(stored.listId).toBe(list.id);

      const listed = await request(app)
        .get(`/todo/lists/${list.id}/todos`)
        .set(user.authHeader);
      expect(listed.status).toBe(200);
      expect(listed.body.map((todo) => todo.title)).toEqual(["Buy eggs", "Buy milk"]);
      expect(listed.body.map((todo) => todo.completed)).toEqual([false, true]);
    });

    it("User marks a completed todo as incomplete", async () => {
      const user = await registerUser();
      const list = await createList(user.authHeader, "Groceries");
      const created = await postTodo(user.authHeader, list.id, { title: "Buy milk" });
      expect(created.status).toBe(201);

      const completed = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(user.authHeader)
        .send({ completed: true });
      expect(completed.status).toBe(200);
      expect(completed.body.completed).toBe(true);

      const response = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(user.authHeader)
        .send({ completed: false });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: created.body.id,
        title: "Buy milk",
        completed: false,
        userId: user.user.userId,
        listId: list.id,
      });

      const stored = await db.todo.findByPk(created.body.id);
      expect(stored.completed).toBe(false);
    });
  });

  describe("US-3.4 — Edit and remove tasks", () => {
    it("User edits a todo title", async () => {
      const user = await registerUser();
      const list = await createList(user.authHeader, "Groceries");
      const created = await postTodo(user.authHeader, list.id, { title: "Buy milk" });
      expect(created.status).toBe(201);
      const todoId = created.body.id;

      const invalid = await request(app)
        .put("/todo/todos/nope")
        .set(user.authHeader)
        .send({ title: "Buy oat milk" });
      expect(invalid.status).toBe(400);
      expect(invalid.body).toEqual({ message: "Invalid todo id." });

      const missing = await request(app)
        .put("/todo/todos/999999")
        .set(user.authHeader)
        .send({ title: "Buy oat milk" });
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({ message: "Todo with id=999999 not found." });

      const emptyBody = await request(app)
        .put(`/todo/todos/${todoId}`)
        .set(user.authHeader)
        .send({});
      expect(emptyBody.status).toBe(400);
      expect(emptyBody.body).toEqual({
        message: "Todo title or completed status is required.",
      });

      const emptyTitle = await request(app)
        .put(`/todo/todos/${todoId}`)
        .set(user.authHeader)
        .send({ title: "   " });
      expect(emptyTitle.status).toBe(400);
      expect(emptyTitle.body).toEqual({ message: "Todo title is required." });

      const tooLong = await request(app)
        .put(`/todo/todos/${todoId}`)
        .set(user.authHeader)
        .send({ title: "c".repeat(256) });
      expect(tooLong.status).toBe(400);
      expect(tooLong.body).toEqual({
        message: "Todo title must be 255 characters or fewer.",
      });

      const response = await request(app)
        .put(`/todo/todos/${todoId}`)
        .set(user.authHeader)
        .send({ title: "  Buy oat milk  ", userId: 999, listId: 12345 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: todoId,
        listId: list.id,
        title: "Buy oat milk",
        completed: false,
        userId: user.user.userId,
      });

      const stored = await db.todo.findByPk(todoId);
      expect(stored.title).toBe("Buy oat milk");
      expect(stored.userId).toBe(user.user.userId);
      expect(stored.listId).toBe(list.id);
    });

    it("User deletes a todo", async () => {
      const user = await registerUser();
      const list = await createList(user.authHeader, "Groceries");
      const created = await postTodo(user.authHeader, list.id, { title: "Buy milk" });
      expect(created.status).toBe(201);
      const todoId = created.body.id;

      const invalid = await request(app).delete("/todo/todos/nope").set(user.authHeader);
      expect(invalid.status).toBe(400);
      expect(invalid.body).toEqual({ message: "Invalid todo id." });

      const missing = await request(app)
        .delete("/todo/todos/999999")
        .set(user.authHeader);
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({ message: "Todo with id=999999 not found." });

      const response = await request(app)
        .delete(`/todo/todos/${todoId}`)
        .set(user.authHeader);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Todo deleted." });
      expect(await db.todo.findByPk(todoId)).toBeNull();

      const listed = await request(app)
        .get(`/todo/lists/${list.id}/todos`)
        .set(user.authHeader);
      expect(listed.status).toBe(200);
      expect(listed.body).toEqual([]);
    });
  });

  describe("US-3.5 — Private items only", () => {
    it("User cannot read todos in another user's list", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });
      const secret = await createList(userB.authHeader, "Secret");
      const hidden = await postTodo(userB.authHeader, secret.id, {
        title: "Hidden task",
      });
      expect(hidden.status).toBe(201);

      const response = await request(app)
        .get(`/todo/lists/${secret.id}/todos`)
        .set(userA.authHeader);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: `List with id=${secret.id} not found.`,
      });
      expect(JSON.stringify(response.body)).not.toContain("Hidden task");

      const stored = await db.todo.findByPk(hidden.body.id);
      expect(stored.title).toBe("Hidden task");
      expect(stored.userId).toBe(userB.user.userId);
    });

    it("User attempts to add a todo to another user's list", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });
      const secret = await createList(userB.authHeader, "Secret");

      const response = await postTodo(userA.authHeader, secret.id, {
        title: "Intruder task",
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: `List with id=${secret.id} not found.`,
      });
      expect(await db.todo.count({ where: { listId: secret.id } })).toBe(0);
      expect(await db.todo.count({ where: { title: "Intruder task" } })).toBe(0);
    });

    it("User attempts to rename another user's todo", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });
      const list = await createList(userB.authHeader, "Secret");
      const created = await postTodo(userB.authHeader, list.id, {
        title: "Hidden task",
      });
      expect(created.status).toBe(201);
      const todoId = created.body.id;

      const response = await request(app)
        .put(`/todo/todos/${todoId}`)
        .set(userA.authHeader)
        .send({ title: "Hijacked" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: `Todo with id=${todoId} not found.`,
      });

      const stored = await db.todo.findByPk(todoId);
      expect(stored.title).toBe("Hidden task");
      expect(stored.userId).toBe(userB.user.userId);
    });

    it("User attempts to delete another user's todo", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });
      const list = await createList(userB.authHeader, "Secret");
      const created = await postTodo(userB.authHeader, list.id, {
        title: "Hidden task",
      });
      expect(created.status).toBe(201);
      const todoId = created.body.id;

      const response = await request(app)
        .delete(`/todo/todos/${todoId}`)
        .set(userA.authHeader);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: `Todo with id=${todoId} not found.`,
      });

      const stored = await db.todo.findByPk(todoId);
      expect(stored).not.toBeNull();
      expect(stored.title).toBe("Hidden task");
      expect(stored.userId).toBe(userB.user.userId);
    });

    it("Client cannot assign a todo to another user on create", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const list = await createList(userA.authHeader, "Groceries");

      const response = await postTodo(userA.authHeader, list.id, {
        title: "Buy milk",
        userId: 999,
      });

      expect(response.status).toBe(201);
      expect(response.body.userId).toBe(userA.user.userId);
      expect(response.body.userId).not.toBe(999);
      expect(response.body.listId).toBe(list.id);
      expect(response.body.title).toBe("Buy milk");
      expect(response.body.completed).toBe(false);

      const stored = await db.todo.findByPk(response.body.id);
      expect(stored.userId).toBe(userA.user.userId);
      expect(stored.listId).toBe(list.id);
    });

    it("Unauthenticated API request for todos", async () => {
      const response = await request(app).get("/todo/lists/1/todos");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized! No token provided.");
    });
  });

  describe("US-3.6 — Lists carry their items", () => {
    it("Deleting a list removes its todos", async () => {
      const user = await registerUser();
      const list = await createList(user.authHeader, "Groceries");
      const milk = await postTodo(user.authHeader, list.id, { title: "Buy milk" });
      const eggs = await postTodo(user.authHeader, list.id, { title: "Buy eggs" });
      expect(milk.status).toBe(201);
      expect(eggs.status).toBe(201);

      const response = await request(app)
        .delete(`/todo/lists/${list.id}`)
        .set(user.authHeader);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "List deleted." });
      expect(await db.todo.findByPk(milk.body.id)).toBeNull();
      expect(await db.todo.findByPk(eggs.body.id)).toBeNull();
      expect(await db.todo.count({ where: { listId: list.id } })).toBe(0);

      const listed = await request(app)
        .get(`/todo/lists/${list.id}/todos`)
        .set(user.authHeader);
      expect(listed.status).toBe(404);
      expect(listed.body).toEqual({
        message: `List with id=${list.id} not found.`,
      });
      expect(JSON.stringify(listed.body)).not.toContain("Buy milk");
      expect(JSON.stringify(listed.body)).not.toContain("Buy eggs");
    });
  });
});
