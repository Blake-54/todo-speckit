import db from "../models/index.js";
import logger from "../config/logger.js";
import { getAccessibleListOrNull } from "../authorization/authorization.js";

const NAME_MAX_LENGTH = 100;

const listNameError = (name) => {
  if (typeof name !== "string" || !name.trim()) {
    return "List name is required.";
  }

  if (name.trim().length > NAME_MAX_LENGTH) {
    return "List name must be 100 characters or fewer.";
  }

  return null;
};

const parseListId = (value) => {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);
  if (!Number.isSafeInteger(id)) {
    return null;
  }

  return id;
};

const notFound = (listId) => ({
  message: `List with id=${listId} not found.`,
});

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const lists = await db.list.findAll({
      where: { userId: req.user.id },
      order: [["name", "ASC"]],
    });

    return res.send(lists);
  } catch (err) {
    logger.error(`List fetch failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to load lists." });
  }
};

exports.create = async (req, res) => {
  const nameError = listNameError(req.body?.name);
  if (nameError) {
    return res.status(400).send({ message: nameError });
  }

  try {
    const list = await db.list.create({
      name: req.body.name.trim(),
      userId: req.user.id,
    });

    return res.status(201).send(list);
  } catch (err) {
    logger.error(`List create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create list." });
  }
};

exports.update = async (req, res) => {
  const listId = parseListId(req.params.listId);
  if (listId === null) {
    return res.status(400).send({ message: "Invalid list id." });
  }

  const nameError = listNameError(req.body?.name);
  if (nameError) {
    return res.status(400).send({ message: nameError });
  }

  try {
    const existing = await getAccessibleListOrNull(req, listId);
    if (!existing) {
      return res.status(404).send(notFound(listId));
    }

    await db.list.update(
      { name: req.body.name.trim() },
      { where: { id: listId, userId: req.user.id } }
    );

    const updated = await getAccessibleListOrNull(req, listId);
    return res.send(updated);
  } catch (err) {
    logger.error(`List update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update list." });
  }
};

exports.remove = async (req, res) => {
  const listId = parseListId(req.params.listId);
  if (listId === null) {
    return res.status(400).send({ message: "Invalid list id." });
  }

  try {
    const existing = await getAccessibleListOrNull(req, listId);
    if (!existing) {
      return res.status(404).send(notFound(listId));
    }

    await db.list.destroy({
      where: { id: listId, userId: req.user.id },
    });

    return res.status(200).send({ message: "List deleted." });
  } catch (err) {
    logger.error(`List delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete list." });
  }
};

export default exports;
