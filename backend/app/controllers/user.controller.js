import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { getAccessibleUserOrNull } from "../authorization/authorization.js";

const SALT_ROUNDS = 10;

const parseUserId = (value) => {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);
  if (!Number.isSafeInteger(id)) {
    return null;
  }

  return id;
};

const notFound = (userId) => ({
  message: `User with id=${userId} not found.`,
});

const toProfile = (user) => ({
  id: user.id,
  fName: user.fName,
  lName: user.lName,
  email: user.email,
  username: user.username,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const exports = {};

exports.findOne = async (req, res) => {
  const userId = parseUserId(req.params.id);
  if (userId === null) {
    return res.status(400).send({ message: "Invalid user id." });
  }

  try {
    const user = await getAccessibleUserOrNull(req, userId);
    if (!user) {
      return res.status(404).send(notFound(userId));
    }

    return res.send(toProfile(user));
  } catch (err) {
    logger.error(`Profile fetch failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to load profile." });
  }
};

exports.update = async (req, res) => {
  const userId = parseUserId(req.params.id);
  if (userId === null) {
    return res.status(400).send({ message: "Invalid user id." });
  }

  try {
    const user = await getAccessibleUserOrNull(req, userId);
    if (!user) {
      return res.status(404).send(notFound(userId));
    }

    const { fName, lName, email, username, password } = req.body ?? {};

    if (
      password !== undefined &&
      password !== null &&
      (typeof password !== "string" || password.length < 8)
    ) {
      return res.status(400).send({ message: "Password must be at least 8 characters." });
    }

    if (!fName?.trim()) {
      return res.status(400).send({ message: "First name is required." });
    }
    if (!lName?.trim()) {
      return res.status(400).send({ message: "Last name is required." });
    }
    if (!email?.trim()) {
      return res.status(400).send({ message: "Email is required." });
    }
    if (!username?.trim()) {
      return res.status(400).send({ message: "Username is required." });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim();

    const existingUsername = await db.user.findOne({
      where: {
        username: normalizedUsername,
        id: { [Op.ne]: user.id },
      },
    });
    if (existingUsername) {
      return res.status(400).send({ message: "Username is already taken." });
    }

    const existingEmail = await db.user.findOne({
      where: {
        email: trimmedEmail,
        id: { [Op.ne]: user.id },
      },
    });
    if (existingEmail) {
      return res.status(400).send({ message: "Email is already registered." });
    }

    const updates = {
      fName: fName.trim(),
      lName: lName.trim(),
      email: trimmedEmail,
      username: normalizedUsername,
    };

    if (typeof password === "string") {
      updates.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    await user.update(updates);
    const fresh = await db.user.findByPk(user.id);

    return res.send(toProfile(fresh));
  } catch (err) {
    logger.error(`Profile update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update profile." });
  }
};

export default exports;
