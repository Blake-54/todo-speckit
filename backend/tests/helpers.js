import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";

export const syncTestDatabase = async () => {
  await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
  const [tables] = await db.sequelize.query("SHOW TABLES");
  const tableKey = tables[0] ? Object.keys(tables[0])[0] : null;

  if (tableKey) {
    for (const row of tables) {
      await db.sequelize.query(`DROP TABLE IF EXISTS \`${row[tableKey]}\``);
    }
  }

  await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
  await db.sequelize.sync({ force: true });
};

export const resetTestDatabase = async () => {
  await db.todo.destroy({ where: {} });
  await db.list.destroy({ where: {} });
  await db.session.destroy({ where: {} });
  await db.user.destroy({ where: {} });
};

export const registerUser = async (overrides = {}) => {
  const payload = {
    fName: "Test",
    lName: "User",
    email: "test@example.com",
    username: "testuser",
    password: "password123",
    ...overrides,
  };

  const response = await request(app).post("/todo/register").send(payload);

  return {
    response,
    user: response.body,
    token: response.body.token,
    authHeader: { Authorization: `Bearer ${response.body.token}` },
  };
};
