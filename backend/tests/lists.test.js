/**
 * Feature 2 — Todo List Management
 * Spec: features/feature-2-todo-list-management.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, resetTestDatabase, registerUser } from "./helpers.js";

const createList = (authHeader, body) =>
  request(app).post("/todo/lists").set(authHeader).send(body);

describe("Feature 2 — Todo List Management", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-2.1 — Create todo lists", () => {
    it("User creates a new list", async () => {
      const user = await registerUser({
        email: "a@example.com",
        username: "usera",
      });

      const response = await createList(user.authHeader, { name: "  Groceries  " });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        name: "Groceries",
        userId: user.user.userId,
      });
      expect(response.body.createdAt).toEqual(expect.any(String));
      expect(response.body.updatedAt).toEqual(expect.any(String));

      const stored = await db.list.findByPk(response.body.id);
      expect(stored.name).toBe("Groceries");
      expect(stored.userId).toBe(user.user.userId);
    });

    it("User creates a list with an empty name", async () => {
      const user = await registerUser();

      const empty = await createList(user.authHeader, { name: "" });
      const whitespace = await createList(user.authHeader, { name: "   " });
      const missing = await createList(user.authHeader, {});

      expect(empty.status).toBe(400);
      expect(empty.body).toEqual({ message: "List name is required." });
      expect(whitespace.status).toBe(400);
      expect(whitespace.body).toEqual({ message: "List name is required." });
      expect(missing.status).toBe(400);
      expect(missing.body).toEqual({ message: "List name is required." });
      expect(await db.list.count()).toBe(0);
    });

    it("User creates a list with a name that is too long", async () => {
      const user = await registerUser();
      const tooLong = "a".repeat(101);

      const response = await createList(user.authHeader, { name: tooLong });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "List name must be 100 characters or fewer.",
      });
      expect(await db.list.count()).toBe(0);

      const boundary = await createList(user.authHeader, { name: "b".repeat(100) });
      expect(boundary.status).toBe(201);
      expect(boundary.body.name).toHaveLength(100);
    });
  });

  describe("US-2.2 — View my lists", () => {
    it("Dashboard loads with existing lists", async () => {
      const user = await registerUser({
        email: "a@example.com",
        username: "usera",
      });

      await createList(user.authHeader, { name: "Work" });
      await createList(user.authHeader, { name: "Personal" });

      const response = await request(app).get("/todo/lists").set(user.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.map((list) => list.name)).toEqual(["Personal", "Work"]);
      expect(response.body.every((list) => list.userId === user.user.userId)).toBe(true);
    });

    it("User cannot see another user's lists", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });

      await createList(userA.authHeader, { name: "Personal" });
      await createList(userB.authHeader, { name: "Secret Project" });

      const response = await request(app).get("/todo/lists").set(userA.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.map((list) => list.name)).toEqual(["Personal"]);
      expect(response.body.every((list) => list.userId === userA.user.userId)).toBe(true);
      expect(response.body.some((list) => list.name === "Secret Project")).toBe(false);
    });
  });

  describe("US-2.4 — Rename and delete lists", () => {
    it("User renames a list", async () => {
      const user = await registerUser();
      const created = await createList(user.authHeader, { name: "Groceries" });

      const invalid = await request(app)
        .put("/todo/lists/nope")
        .set(user.authHeader)
        .send({ name: "Shopping" });

      expect(invalid.status).toBe(400);
      expect(invalid.body).toEqual({ message: "Invalid list id." });

      const empty = await request(app)
        .put(`/todo/lists/${created.body.id}`)
        .set(user.authHeader)
        .send({ name: "   " });

      expect(empty.status).toBe(400);
      expect(empty.body).toEqual({ message: "List name is required." });

      const response = await request(app)
        .put(`/todo/lists/${created.body.id}`)
        .set(user.authHeader)
        .send({ name: "  Shopping  ", userId: 999 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: created.body.id,
        name: "Shopping",
        userId: user.user.userId,
      });

      const stored = await db.list.findByPk(created.body.id);
      expect(stored.name).toBe("Shopping");
      expect(stored.userId).toBe(user.user.userId);
    });

    it("User deletes a list", async () => {
      const user = await registerUser();
      const created = await createList(user.authHeader, { name: "Groceries" });

      const invalid = await request(app)
        .delete("/todo/lists/nope")
        .set(user.authHeader);

      expect(invalid.status).toBe(400);
      expect(invalid.body).toEqual({ message: "Invalid list id." });

      const response = await request(app)
        .delete(`/todo/lists/${created.body.id}`)
        .set(user.authHeader);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "List deleted." });
      expect(await db.list.findByPk(created.body.id)).toBeNull();
    });
  });

  describe("US-2.5 — Private lists only", () => {
    it("User attempts to rename another user's list", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });
      const created = await createList(userB.authHeader, { name: "Secret Project" });
      const listId = created.body.id;

      const response = await request(app)
        .put(`/todo/lists/${listId}`)
        .set(userA.authHeader)
        .send({ name: "Hijacked" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: `List with id=${listId} not found.`,
      });

      const stored = await db.list.findByPk(listId);
      expect(stored.name).toBe("Secret Project");
      expect(stored.userId).toBe(userB.user.userId);
    });

    it("User attempts to delete another user's list", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });
      const created = await createList(userB.authHeader, { name: "Secret Project" });
      const listId = created.body.id;

      const response = await request(app)
        .delete(`/todo/lists/${listId}`)
        .set(userA.authHeader);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: `List with id=${listId} not found.`,
      });

      const stored = await db.list.findByPk(listId);
      expect(stored).not.toBeNull();
      expect(stored.name).toBe("Secret Project");
      expect(stored.userId).toBe(userB.user.userId);
    });

    it("Client cannot assign a list to another user on create", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });

      const response = await createList(userA.authHeader, {
        name: "Groceries",
        userId: 999,
      });

      expect(response.status).toBe(201);
      expect(response.body.userId).toBe(userA.user.userId);
      expect(response.body.userId).not.toBe(999);
      expect(response.body.name).toBe("Groceries");

      const stored = await db.list.findByPk(response.body.id);
      expect(stored.userId).toBe(userA.user.userId);
    });

    it("Unauthenticated API request to lists", async () => {
      const response = await request(app).get("/todo/lists");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized! No token provided.");
    });
  });
});
