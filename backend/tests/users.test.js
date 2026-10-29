/**
 * Feature 4 — User Profile Management
 * Spec: features/feature-4-user-profile-management.md
 */

import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, resetTestDatabase, registerUser } from "./helpers.js";

const profileSnapshot = async (userId) => {
  const row = await db.user.unscoped().findByPk(userId);
  return {
    fName: row.fName,
    lName: row.lName,
    email: row.email,
    username: row.username,
    password: row.password,
    role: row.role,
  };
};

describe("Feature 4 — User Profile Management", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-4.2 — Edit profile", () => {
    it("User saves profile changes", async () => {
      const user = await registerUser({
        fName: "Jane",
        lName: "Doe",
        email: "jane@example.com",
        username: "jdoe",
      });
      const userId = user.user.userId;
      const before = await profileSnapshot(userId);

      const response = await request(app)
        .put(`/todo/users/${userId}`)
        .set(user.authHeader)
        .send({
          fName: "  Janet ",
          lName: " Smith ",
          email: " janet@example.com ",
          username: " Janet ",
          password: "newpassword123",
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: userId,
        fName: "Janet",
        lName: "Smith",
        email: "janet@example.com",
        username: "janet",
        role: "worker",
      });
      expect(response.body.createdAt).toEqual(expect.any(String));
      expect(response.body.updatedAt).toEqual(expect.any(String));
      expect(response.body).not.toHaveProperty("password");
      expect(JSON.stringify(response.body)).not.toContain(before.password);

      const after = await profileSnapshot(userId);
      expect(await bcrypt.compare("newpassword123", after.password)).toBe(true);
      expect(await bcrypt.compare("password123", after.password)).toBe(false);
      expect(after.role).toBe("worker");
    });

    it("User fetches their own profile", async () => {
      const user = await registerUser({
        fName: "Jane",
        lName: "Doe",
        email: "jane@example.com",
        username: "jdoe",
      });
      const userId = user.user.userId;

      const response = await request(app)
        .get(`/todo/users/${userId}`)
        .set(user.authHeader);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: userId,
        fName: "Jane",
        lName: "Doe",
        email: "jane@example.com",
        username: "jdoe",
        role: "worker",
      });
      expect(response.body.createdAt).toEqual(expect.any(String));
      expect(response.body.updatedAt).toEqual(expect.any(String));
      expect(response.body).not.toHaveProperty("password");

      const stored = await db.user.unscoped().findByPk(userId);
      expect(JSON.stringify(response.body)).not.toContain(stored.password);
    });

    it("User attempts to fetch another user's profile", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
        fName: "Alice",
        lName: "A",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
        fName: "Bob",
        lName: "B",
      });

      const response = await request(app)
        .get(`/todo/users/${userB.user.userId}`)
        .set(userA.authHeader);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: `User with id=${userB.user.userId} not found.`,
      });
    });

    it("User attempts to update another user's profile", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
        fName: "Alice",
        lName: "A",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
        fName: "Bob",
        lName: "B",
      });
      const before = await profileSnapshot(userB.user.userId);

      const response = await request(app)
        .put(`/todo/users/${userB.user.userId}`)
        .set(userA.authHeader)
        .send({
          fName: "Hacked",
          lName: "User",
          email: "hacked@example.com",
          username: "hacked",
          password: "newpassword123",
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: `User with id=${userB.user.userId} not found.`,
      });
      expect(await profileSnapshot(userB.user.userId)).toEqual(before);
    });

    it("Unauthenticated profile API request", async () => {
      const response = await request(app).get("/todo/users/1");

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/);
    });

    it("Profile update rejects a password that is too short", async () => {
      const user = await registerUser();
      const userId = user.user.userId;
      const before = await profileSnapshot(userId);

      const response = await request(app)
        .put(`/todo/users/${userId}`)
        .set(user.authHeader)
        .send({ password: "short" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Password must be at least 8 characters.",
      });
      expect(await profileSnapshot(userId)).toEqual(before);
    });

    it("Profile update rejects missing required fields", async () => {
      const user = await registerUser({
        fName: "Jane",
        lName: "Doe",
        email: "jane@example.com",
        username: "jdoe",
      });
      const userId = user.user.userId;
      const before = await profileSnapshot(userId);

      const response = await request(app)
        .put(`/todo/users/${userId}`)
        .set(user.authHeader)
        .send({
          lName: "Doe",
          email: "jane@example.com",
          username: "jdoe",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "First name is required." });
      expect(await profileSnapshot(userId)).toEqual(before);
    });

    it("Profile update rejects a duplicate username", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
        fName: "Alice",
        lName: "A",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
        fName: "Bob",
        lName: "B",
      });
      const beforeB = await profileSnapshot(userB.user.userId);

      const response = await request(app)
        .put(`/todo/users/${userA.user.userId}`)
        .set(userA.authHeader)
        .send({
          fName: "Alice",
          lName: "A",
          email: "a@example.com",
          username: "userb",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Username is already taken." });
      expect((await profileSnapshot(userB.user.userId)).username).toBe("userb");
      expect(await profileSnapshot(userB.user.userId)).toEqual(beforeB);
    });

    it("Profile update rejects a duplicate email", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
        fName: "Alice",
        lName: "A",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
        fName: "Bob",
        lName: "B",
      });
      const beforeB = await profileSnapshot(userB.user.userId);

      const response = await request(app)
        .put(`/todo/users/${userA.user.userId}`)
        .set(userA.authHeader)
        .send({
          fName: "Alice",
          lName: "A",
          email: "b@example.com",
          username: "usera",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Email is already registered." });
      expect((await profileSnapshot(userB.user.userId)).email).toBe("b@example.com");
      expect(await profileSnapshot(userB.user.userId)).toEqual(beforeB);
    });

    it("Unauthenticated profile update API request", async () => {
      const response = await request(app).put("/todo/users/1").send({
        fName: "Jane",
        lName: "Doe",
        email: "jane@example.com",
        username: "jdoe",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/);
    });
  });
});
