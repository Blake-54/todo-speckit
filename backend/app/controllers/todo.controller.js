import db from "../models/index.js";
import logger from "../config/logger.js";
import {
  getAccessibleListOrNull,
  getAccessibleTodoOrNull,
} from "../authorization/authorization.js";

const TITLE_MAX_LENGTH = 255;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DUE_DATE_MESSAGE = "Due date must be a valid date in YYYY-MM-DD format.";

const todoTitleError = (title) => {
  if (typeof title !== "string" || !title.trim()) {
    return "Todo title is required.";
  }

  if (title.trim().length > TITLE_MAX_LENGTH) {
    return "Todo title must be 255 characters or fewer.";
  }

  return null;
};

const dueDateError = (value) => {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string" || !DATE_ONLY_REGEX.test(value)) {
    return DUE_DATE_MESSAGE;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const valid =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;

  if (!valid) {
    return DUE_DATE_MESSAGE;
  }

  return null;
};

const parseRouteId = (value) => {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);
  if (!Number.isSafeInteger(id)) {
    return null;
  }

  return id;
};

const listNotFound = (listId) => ({
  message: `List with id=${listId} not found.`,
});

const todoNotFound = (todoId) => ({
  message: `Todo with id=${todoId} not found.`,
});

const exports = {};

exports.findAll = async (req, res) => {
  const listId = parseRouteId(req.params.listId);
  if (listId === null) {
    return res.status(400).send({ message: "Invalid list id." });
  }

  try {
    const list = await getAccessibleListOrNull(req, listId);
    if (!list) {
      return res.status(404).send(listNotFound(listId));
    }

    const todos = await db.todo.findAll({
      where: { listId, userId: req.user.id },
      order: [
        ["completed", "ASC"],
        ["createdAt", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.send(todos);
  } catch (err) {
    logger.error(`Todo fetch failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to load todos." });
  }
};

exports.create = async (req, res) => {
  const listId = parseRouteId(req.params.listId);
  if (listId === null) {
    return res.status(400).send({ message: "Invalid list id." });
  }

  try {
    const list = await getAccessibleListOrNull(req, listId);
    if (!list) {
      return res.status(404).send(listNotFound(listId));
    }

    const titleError = todoTitleError(req.body?.title);
    if (titleError) {
      return res.status(400).send({ message: titleError });
    }

    const hasDueDate = Object.prototype.hasOwnProperty.call(req.body ?? {}, "dueDate");
    if (hasDueDate) {
      const dateError = dueDateError(req.body.dueDate);
      if (dateError) {
        return res.status(400).send({ message: dateError });
      }
    }

    const todo = await db.todo.create({
      title: req.body.title.trim(),
      listId,
      userId: req.user.id,
      completed: false,
      dueDate: hasDueDate ? req.body.dueDate : null,
    });

    return res.status(201).send(todo);
  } catch (err) {
    logger.error(`Todo create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to add todo." });
  }
};

exports.update = async (req, res) => {
  const todoId = parseRouteId(req.params.id);
  if (todoId === null) {
    return res.status(400).send({ message: "Invalid todo id." });
  }

  const body = req.body ?? {};
  const hasTitle = Object.prototype.hasOwnProperty.call(body, "title");
  const hasCompleted = Object.prototype.hasOwnProperty.call(body, "completed");
  const hasDueDate = Object.prototype.hasOwnProperty.call(body, "dueDate");

  if (!hasTitle && !hasCompleted && !hasDueDate) {
    return res.status(400).send({
      message: "Todo title or completed status is required.",
    });
  }

  if (hasTitle) {
    const titleError = todoTitleError(body.title);
    if (titleError) {
      return res.status(400).send({ message: titleError });
    }
  }

  if (hasCompleted && typeof body.completed !== "boolean") {
    return res.status(400).send({ message: "Completed must be true or false." });
  }

  if (hasDueDate) {
    const dateError = dueDateError(body.dueDate);
    if (dateError) {
      return res.status(400).send({ message: dateError });
    }
  }

  try {
    const existing = await getAccessibleTodoOrNull(req, todoId);
    if (!existing) {
      return res.status(404).send(todoNotFound(todoId));
    }

    const updates = {};
    if (hasTitle) {
      updates.title = body.title.trim();
    }
    if (hasCompleted) {
      updates.completed = body.completed;
    }
    if (hasDueDate) {
      updates.dueDate = body.dueDate;
    }

    await db.todo.update(updates, {
      where: { id: todoId, userId: req.user.id },
    });

    const updated = await getAccessibleTodoOrNull(req, todoId);
    return res.send(updated);
  } catch (err) {
    logger.error(`Todo update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update todo." });
  }
};

exports.remove = async (req, res) => {
  const todoId = parseRouteId(req.params.id);
  if (todoId === null) {
    return res.status(400).send({ message: "Invalid todo id." });
  }

  try {
    const existing = await getAccessibleTodoOrNull(req, todoId);
    if (!existing) {
      return res.status(404).send(todoNotFound(todoId));
    }

    await db.todo.destroy({
      where: { id: todoId, userId: req.user.id },
    });

    return res.status(200).send({ message: "Todo deleted." });
  } catch (err) {
    logger.error(`Todo delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete todo." });
  }
};

export default exports;
