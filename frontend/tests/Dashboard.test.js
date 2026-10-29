/**
 * Feature 2 — Todo List Management
 * Spec: features/feature-2-todo-list-management.md
 *
 * Feature 3 — Todo List Item Management
 * Spec: features/feature-3-todo-list-item-management.md
 *
 * Feature 5 — Todo Due Date
 * Spec: features/feature-5-todo-due-date.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Dashboard from "../src/views/Dashboard.vue";
import todoServices from "../src/services/todoServices.js";
import appRouter from "../src/router.js";
import { formatDueDate } from "../src/config/validation.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/todoServices.js", () => ({
  default: {
    getLists: vi.fn(),
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
    getTodos: vi.fn(),
    createTodo: vi.fn(),
    updateTodo: vi.fn(),
    deleteTodo: vi.fn(),
  },
}));

const groceries = {
  id: 1,
  name: "Groceries",
  userId: 42,
  createdAt: "2026-07-02T12:00:00.000Z",
  updatedAt: "2026-07-02T12:00:00.000Z",
};

const shopping = {
  ...groceries,
  name: "Shopping",
  updatedAt: "2026-07-02T13:00:00.000Z",
};

function findButton(wrapper, label) {
  return wrapper
    .findAllComponents({ name: "VBtn" })
    .find((button) => button.text().includes(label));
}

async function clickButton(wrapper, label) {
  const button = findButton(wrapper, label);
  expect(button).toBeTruthy();
  await button.trigger("click");
  await flushPromises();
}

async function clickExactButton(wrapper, label) {
  const button = wrapper
    .findAllComponents({ name: "VBtn" })
    .find((item) => item.text().trim() === label);
  expect(button, label).toBeTruthy();
  await button.trigger("click");
  await flushPromises();
}

function findListRow(wrapper, name) {
  return wrapper
    .findAllComponents({ name: "VListItem" })
    .find((item) => item.text().includes(name));
}

function findRowButton(row, ariaLabel) {
  return row
    .findAllComponents({ name: "VBtn" })
    .find((button) => button.attributes("aria-label") === ariaLabel);
}

function findTodoRow(wrapper, title) {
  return wrapper.findAllComponents({ name: "VListItem" }).find((item) => {
    return (
      item.text().includes(title) && item.findComponent({ name: "VCheckbox" }).exists()
    );
  });
}

async function openItems(wrapper, listName) {
  const row = findListRow(wrapper, listName);
  expect(row, listName).toBeTruthy();
  const button = findRowButton(row, `View items for ${listName}`);
  expect(button, listName).toBeTruthy();
  await button.trigger("click");
  await flushPromises();
}

function itemsDialog(wrapper) {
  return wrapper.findAllComponents({ name: "VCard" }).find((card) =>
    card.text().includes("— Items")
  );
}

function todosLoadingIndicator(wrapper) {
  return wrapper
    .findAllComponents({ name: "VProgressLinear" })
    .find((bar) => bar.classes().includes("todos-loading"));
}

async function mountDashboard() {
  const mounted = await mountWithPlugins(Dashboard);
  await flushPromises();
  return mounted.wrapper;
}

describe("Feature 2 — Todo List Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("US-2.1 — Create todo lists", () => {
    it("User creates a new list", async () => {
      todoServices.getLists
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [groceries] });
      todoServices.createList.mockResolvedValue({ status: 201, data: groceries });

      const wrapper = await mountDashboard();
      await clickButton(wrapper, "+ New List");

      const field = wrapper.findComponent({ name: "VTextField" });
      await field.setValue("Groceries");
      await wrapper.findComponent({ name: "VForm" }).trigger("submit");
      await flushPromises();

      expect(todoServices.createList).toHaveBeenCalledWith({ name: "Groceries" });
      expect(wrapper.text()).toContain("Groceries");
      expect(wrapper.findComponent({ name: "VDialog" }).exists()).toBe(false);
    });

    it("User creates a list with an empty name", async () => {
      todoServices.getLists.mockResolvedValue({ data: [] });

      const wrapper = await mountDashboard();
      await clickButton(wrapper, "+ New List");

      const form = wrapper.findComponent({ name: "VForm" });
      const field = wrapper.findComponent({ name: "VTextField" });

      await form.trigger("submit");
      await flushPromises();
      const emptyValidation = await form.vm.validate();

      expect(emptyValidation.valid).toBe(false);
      expect(field.text()).toContain("List name is required.");

      await field.setValue("   ");
      await form.trigger("submit");
      await flushPromises();
      const whitespaceValidation = await form.vm.validate();

      expect(whitespaceValidation.valid).toBe(false);
      expect(field.text()).toContain("List name is required.");
      expect(todoServices.createList).not.toHaveBeenCalled();
    });
  });

  describe("US-2.2 — View my lists", () => {
    it("Dashboard loads with existing lists", async () => {
      todoServices.getLists.mockResolvedValue({
        data: [
          {
            id: 2,
            name: "Personal",
            userId: 42,
            createdAt: "2026-07-02T12:00:00.000Z",
            updatedAt: "2026-07-02T12:00:00.000Z",
          },
          {
            id: 3,
            name: "Work",
            userId: 42,
            createdAt: "2026-07-02T12:00:00.000Z",
            updatedAt: "2026-07-02T12:00:00.000Z",
          },
        ],
      });

      const wrapper = await mountDashboard();

      expect(wrapper.text()).toContain("Personal");
      expect(wrapper.text()).toContain("Work");

      for (const name of ["Personal", "Work"]) {
        const row = findListRow(wrapper, name);
        expect(row, name).toBeTruthy();
        expect(findRowButton(row, "Edit list")).toBeTruthy();
        expect(findRowButton(row, "Delete list")).toBeTruthy();
      }
    });

    it("User has no lists", async () => {
      let resolveLists;
      todoServices.getLists.mockReturnValue(
        new Promise((resolve) => {
          resolveLists = resolve;
        })
      );

      const { wrapper } = await mountWithPlugins(Dashboard);
      const listsLoading = () =>
        wrapper.find(".v-card-text").findComponent({ name: "VProgressLinear" });

      expect(listsLoading().exists()).toBe(true);
      expect(wrapper.text()).not.toContain("No lists yet. Create your first list.");

      resolveLists({ data: [] });
      await flushPromises();

      expect(listsLoading().exists()).toBe(false);
      expect(wrapper.text()).toContain("No lists yet. Create your first list.");
    });
  });

  describe("US-2.3 — Manage list rows", () => {
    it("List rows show edit and delete actions", async () => {
      todoServices.getLists.mockResolvedValue({ data: [groceries] });

      const wrapper = await mountDashboard();
      const row = findListRow(wrapper, "Groceries");
      const editButton = findRowButton(row, "Edit list");
      const deleteButton = findRowButton(row, "Delete list");

      expect(editButton).toBeTruthy();
      expect(editButton.props("size")).toBe("small");
      expect(editButton.attributes("aria-label")).toBe("Edit list");
      expect(deleteButton).toBeTruthy();
      expect(deleteButton.props("size")).toBe("small");
      expect(deleteButton.attributes("aria-label")).toBe("Delete list");
    });
  });

  describe("US-2.4 — Rename and delete lists", () => {
    it("User renames a list", async () => {
      todoServices.getLists
        .mockResolvedValueOnce({ data: [groceries] })
        .mockResolvedValueOnce({ data: [shopping] });
      todoServices.updateList.mockResolvedValue({ status: 200, data: shopping });

      const wrapper = await mountDashboard();
      const row = findListRow(wrapper, "Groceries");
      await findRowButton(row, "Edit list").trigger("click");
      await flushPromises();

      const field = wrapper.findComponent({ name: "VTextField" });
      expect(field.props("modelValue")).toBe("Groceries");

      await field.setValue("Shopping");
      await wrapper.findComponent({ name: "VForm" }).trigger("submit");
      await flushPromises();

      expect(todoServices.updateList).toHaveBeenCalledWith(groceries.id, {
        name: "Shopping",
      });
      expect(wrapper.text()).toContain("Shopping");
      expect(wrapper.text()).not.toContain("Groceries");
      expect(wrapper.findComponent({ name: "VDialog" }).exists()).toBe(false);
    });

    it("User deletes a list", async () => {
      todoServices.getLists
        .mockResolvedValueOnce({ data: [groceries] })
        .mockResolvedValueOnce({ data: [] });
      todoServices.deleteList.mockResolvedValue({
        status: 200,
        data: { message: "List deleted." },
      });

      const wrapper = await mountDashboard();
      const row = findListRow(wrapper, "Groceries");
      await findRowButton(row, "Delete list").trigger("click");
      await flushPromises();

      await clickButton(wrapper, "Delete");

      expect(todoServices.deleteList).toHaveBeenCalledWith(groceries.id);
      expect(wrapper.text()).not.toContain("Groceries");
      expect(wrapper.findComponent({ name: "VDialog" }).exists()).toBe(false);
    });
  });

  describe("US-2.5 — Private lists only", () => {
    it("Unauthenticated user accesses the dashboard", async () => {
      localStorage.clear();
      await appRouter.push("/login");
      await appRouter.isReady();
      await appRouter.push("/");
      await appRouter.isReady();

      expect(appRouter.currentRoute.value.name).toBe("login");
    });
  });
});

const buyMilk = {
  id: 10,
  listId: 1,
  title: "Buy milk",
  completed: false,
  userId: 42,
  createdAt: "2026-07-02T12:05:00.000Z",
  updatedAt: "2026-07-02T12:05:00.000Z",
};

const buyMilkDone = {
  ...buyMilk,
  completed: true,
  updatedAt: "2026-07-02T12:06:00.000Z",
};

const oatMilk = {
  ...buyMilk,
  title: "Buy oat milk",
  updatedAt: "2026-07-02T12:07:00.000Z",
};

describe("Feature 3 — Todo List Item Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("US-3.1 — Add tasks to a list", () => {
    it("User adds a todo to a list via dialog", async () => {
      todoServices.getLists.mockResolvedValue({ data: [groceries] });
      todoServices.getTodos
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [buyMilk] });
      todoServices.createTodo.mockResolvedValue({ status: 201, data: buyMilk });

      const wrapper = await mountDashboard();
      await openItems(wrapper, "Groceries");

      const dialog = itemsDialog(wrapper);
      expect(dialog).toBeTruthy();
      expect(dialog.text()).toContain("Groceries — Items");
      const addItemButton = findButton(wrapper, "+ Add Item");
      expect(addItemButton.classes()).toContain("oc-cta");
      await addItemButton.trigger("click");
      await flushPromises();

      const field = wrapper.findComponent({ name: "VTextField" });
      await field.setValue("Buy milk");

      const addButton = wrapper
        .findAllComponents({ name: "VBtn" })
        .find((button) => button.text().trim() === "Add");
      expect(addButton.classes()).toContain("oc-cta");

      await wrapper.findComponent({ name: "VForm" }).trigger("submit");
      await flushPromises();

      expect(todoServices.createTodo).toHaveBeenCalledWith(groceries.id, {
        title: "Buy milk",
      });
      await expect(todoServices.createTodo.mock.results[0].value).resolves.toMatchObject({
        status: 201,
        data: {
          title: "Buy milk",
          completed: false,
          userId: groceries.userId,
          listId: groceries.id,
        },
      });

      const row = findTodoRow(wrapper, "Buy milk");
      expect(row).toBeTruthy();
      expect(row.text()).toContain("Buy milk");
      expect(row.find(".text-decoration-line-through").exists()).toBe(false);
      expect(itemsDialog(wrapper).text()).toContain("Buy milk");
    });

    it("User adds a todo with an empty title", async () => {
      todoServices.getLists.mockResolvedValue({ data: [groceries] });
      todoServices.getTodos.mockResolvedValue({ data: [] });

      const wrapper = await mountDashboard();
      await openItems(wrapper, "Groceries");
      await clickButton(wrapper, "+ Add Item");

      const form = wrapper.findComponent({ name: "VForm" });
      const field = wrapper.findComponent({ name: "VTextField" });

      await form.trigger("submit");
      await flushPromises();
      const emptyValidation = await form.vm.validate();

      expect(emptyValidation.valid).toBe(false);
      expect(field.text()).toContain("Todo title is required.");

      await field.setValue("   ");
      await form.trigger("submit");
      await flushPromises();
      const whitespaceValidation = await form.vm.validate();

      expect(whitespaceValidation.valid).toBe(false);
      expect(field.text()).toContain("Todo title is required.");
      expect(todoServices.createTodo).not.toHaveBeenCalled();
    });

    it("Add item is only available inside the items dialog", async () => {
      todoServices.getLists.mockResolvedValue({ data: [groceries] });

      const wrapper = await mountDashboard();

      expect(wrapper.text()).toContain("My Lists");
      expect(wrapper.text()).toContain("Groceries");
      expect(wrapper.text()).not.toContain("+ Add Item");
      expect(wrapper.findComponent({ name: "VTextField" }).exists()).toBe(false);
      expect(wrapper.findComponent({ name: "VDialog" }).exists()).toBe(false);
    });
  });

  describe("US-3.2 — View tasks in a list", () => {
    it("List items dialog shows empty state", async () => {
      const personal = {
        id: 4,
        name: "Personal",
        userId: 42,
        createdAt: "2026-07-02T12:00:00.000Z",
        updatedAt: "2026-07-02T12:00:00.000Z",
      };

      let resolveTodos;
      todoServices.getLists.mockResolvedValue({ data: [personal] });
      todoServices.getTodos.mockReturnValue(
        new Promise((resolve) => {
          resolveTodos = resolve;
        })
      );

      const wrapper = await mountDashboard();
      const row = findListRow(wrapper, "Personal");
      await findRowButton(row, "View items for Personal").trigger("click");
      await flushPromises();

      expect(todosLoadingIndicator(wrapper)).toBeTruthy();
      expect(itemsDialog(wrapper).text()).not.toContain("No todos in this list yet.");

      resolveTodos({ data: [] });
      await flushPromises();

      expect(todosLoadingIndicator(wrapper)).toBeFalsy();
      const dialog = itemsDialog(wrapper);
      expect(dialog.text()).toContain("Personal — Items");
      expect(dialog.text()).toContain("No todos in this list yet.");
    });

    it("User opens items for different lists", async () => {
      const work = {
        id: 3,
        name: "Work",
        userId: 42,
        createdAt: "2026-07-02T12:00:00.000Z",
        updatedAt: "2026-07-02T12:00:00.000Z",
      };
      const personal = {
        id: 4,
        name: "Personal",
        userId: 42,
        createdAt: "2026-07-02T12:00:00.000Z",
        updatedAt: "2026-07-02T12:00:00.000Z",
      };
      const callMom = {
        id: 11,
        listId: personal.id,
        title: "Call mom",
        completed: false,
        userId: 42,
        createdAt: "2026-07-02T12:05:00.000Z",
        updatedAt: "2026-07-02T12:05:00.000Z",
      };
      const emailClient = {
        id: 12,
        listId: work.id,
        title: "Email client",
        completed: false,
        userId: 42,
        createdAt: "2026-07-02T12:05:00.000Z",
        updatedAt: "2026-07-02T12:05:00.000Z",
      };
      const writeReport = {
        id: 13,
        listId: work.id,
        title: "Write report",
        completed: false,
        userId: 42,
        createdAt: "2026-07-02T12:06:00.000Z",
        updatedAt: "2026-07-02T12:06:00.000Z",
      };

      todoServices.getLists.mockResolvedValue({ data: [work, personal] });
      todoServices.getTodos.mockImplementation((listId) => {
        if (listId === personal.id) {
          return Promise.resolve({ data: [callMom] });
        }
        if (listId === work.id) {
          return Promise.resolve({ data: [emailClient, writeReport] });
        }
        return Promise.resolve({ data: [] });
      });

      const wrapper = await mountDashboard();
      await openItems(wrapper, "Personal");

      expect(findTodoRow(wrapper, "Call mom")).toBeTruthy();
      expect(findTodoRow(wrapper, "Email client")).toBeFalsy();
      expect(findTodoRow(wrapper, "Write report")).toBeFalsy();

      await clickButton(wrapper, "Close");

      expect(findTodoRow(wrapper, "Call mom")).toBeFalsy();
      expect(wrapper.findComponent({ name: "VDialog" }).exists()).toBe(false);

      await openItems(wrapper, "Work");

      expect(findTodoRow(wrapper, "Email client")).toBeTruthy();
      expect(findTodoRow(wrapper, "Write report")).toBeTruthy();
      expect(findTodoRow(wrapper, "Call mom")).toBeFalsy();
    });
  });

  describe("US-3.3 — Complete tasks", () => {
    it("User marks a todo as complete", async () => {
      todoServices.getLists.mockResolvedValue({ data: [groceries] });
      todoServices.getTodos
        .mockResolvedValueOnce({ data: [buyMilk] })
        .mockResolvedValueOnce({ data: [buyMilkDone] });
      todoServices.updateTodo.mockResolvedValue({ status: 200, data: buyMilkDone });

      const wrapper = await mountDashboard();
      await openItems(wrapper, "Groceries");

      const row = findTodoRow(wrapper, "Buy milk");
      expect(row.find(".text-decoration-line-through").exists()).toBe(false);

      await row.findComponent({ name: "VCheckbox" }).setValue(true);
      await flushPromises();

      expect(todoServices.updateTodo).toHaveBeenCalledWith(buyMilk.id, { completed: true });
      await expect(todoServices.updateTodo.mock.results[0].value).resolves.toMatchObject({
        status: 200,
        data: { completed: true },
      });

      const completed = findTodoRow(wrapper, "Buy milk");
      expect(completed.find(".text-decoration-line-through").exists()).toBe(true);
      expect(completed.find(".text-medium-emphasis").exists()).toBe(true);
    });

    it("User marks a completed todo as incomplete", async () => {
      todoServices.getLists.mockResolvedValue({ data: [groceries] });
      todoServices.getTodos
        .mockResolvedValueOnce({ data: [buyMilkDone] })
        .mockResolvedValueOnce({ data: [buyMilk] });
      todoServices.updateTodo.mockResolvedValue({ status: 200, data: buyMilk });

      const wrapper = await mountDashboard();
      await openItems(wrapper, "Groceries");

      const row = findTodoRow(wrapper, "Buy milk");
      expect(row.find(".text-decoration-line-through").exists()).toBe(true);

      await row.findComponent({ name: "VCheckbox" }).setValue(false);
      await flushPromises();

      expect(todoServices.updateTodo).toHaveBeenCalledWith(buyMilk.id, { completed: false });
      await expect(todoServices.updateTodo.mock.results[0].value).resolves.toMatchObject({
        status: 200,
        data: { completed: false },
      });

      const active = findTodoRow(wrapper, "Buy milk");
      expect(active.find(".text-decoration-line-through").exists()).toBe(false);
    });
  });

  describe("US-3.4 — Edit and remove tasks", () => {
    it("User edits a todo title", async () => {
      todoServices.getLists.mockResolvedValue({ data: [groceries] });
      todoServices.getTodos
        .mockResolvedValueOnce({ data: [buyMilk] })
        .mockResolvedValueOnce({ data: [oatMilk] });
      todoServices.updateTodo.mockResolvedValue({ status: 200, data: oatMilk });

      const wrapper = await mountDashboard();
      await openItems(wrapper, "Groceries");

      const row = findTodoRow(wrapper, "Buy milk");
      await findRowButton(row, "Edit Buy milk").trigger("click");
      await flushPromises();

      const field = wrapper.findComponent({ name: "VTextField" });
      expect(field.props("modelValue")).toBe("Buy milk");

      await field.setValue("Buy oat milk");
      await wrapper.findComponent({ name: "VForm" }).trigger("submit");
      await flushPromises();

      expect(todoServices.updateTodo).toHaveBeenCalledWith(buyMilk.id, {
        title: "Buy oat milk",
      });
      await expect(todoServices.updateTodo.mock.results[0].value).resolves.toMatchObject({
        status: 200,
        data: { title: "Buy oat milk" },
      });
      expect(findTodoRow(wrapper, "Buy oat milk")).toBeTruthy();
      expect(findTodoRow(wrapper, "Buy milk")).toBeFalsy();
    });

    it("User deletes a todo", async () => {
      todoServices.getLists.mockResolvedValue({ data: [groceries] });
      todoServices.getTodos
        .mockResolvedValueOnce({ data: [buyMilk] })
        .mockResolvedValueOnce({ data: [] });
      todoServices.deleteTodo.mockResolvedValue({
        status: 200,
        data: { message: "Todo deleted." },
      });

      const wrapper = await mountDashboard();
      await openItems(wrapper, "Groceries");

      const row = findTodoRow(wrapper, "Buy milk");
      await findRowButton(row, "Delete Buy milk").trigger("click");
      await flushPromises();

      await clickExactButton(wrapper, "Delete");

      expect(todoServices.deleteTodo).toHaveBeenCalledWith(buyMilk.id);
      await expect(todoServices.deleteTodo.mock.results[0].value).resolves.toMatchObject({
        status: 200,
      });
      expect(findTodoRow(wrapper, "Buy milk")).toBeFalsy();
      expect(itemsDialog(wrapper).text()).toContain("No todos in this list yet.");
    });
  });
});

function localIsoDate(offsetDays) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function textFields(wrapper) {
  return wrapper.findAllComponents({ name: "VTextField" });
}

describe("Feature 5 — Todo Due Date", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("US-5.1 — Set a due date when creating a todo", () => {
    it("User adds a todo with a due date", async () => {
      const withDate = {
        ...buyMilk,
        dueDate: "2026-07-15",
      };
      todoServices.getLists.mockResolvedValue({ data: [groceries] });
      todoServices.getTodos
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [withDate] });
      todoServices.createTodo.mockResolvedValue({ status: 201, data: withDate });

      const wrapper = await mountDashboard();
      await openItems(wrapper, "Groceries");
      await clickButton(wrapper, "+ Add Item");

      const fields = textFields(wrapper);
      await fields[0].setValue("Buy milk");
      await fields[1].setValue("2026-07-15");
      await wrapper.findComponent({ name: "VForm" }).trigger("submit");
      await flushPromises();

      expect(todoServices.createTodo).toHaveBeenCalledWith(groceries.id, {
        title: "Buy milk",
        dueDate: "2026-07-15",
      });
      await expect(todoServices.createTodo.mock.results[0].value).resolves.toMatchObject({
        status: 201,
        data: { dueDate: "2026-07-15" },
      });

      const row = findTodoRow(wrapper, "Buy milk");
      expect(row.text()).toContain(formatDueDate("2026-07-15"));
    });
  });

  describe("US-5.3 — Edit or clear a due date", () => {
    it("User sets a due date when editing a todo", async () => {
      const updated = {
        ...buyMilk,
        dueDate: "2026-07-20",
      };
      todoServices.getLists.mockResolvedValue({ data: [groceries] });
      todoServices.getTodos
        .mockResolvedValueOnce({ data: [buyMilk] })
        .mockResolvedValueOnce({ data: [updated] });
      todoServices.updateTodo.mockResolvedValue({ status: 200, data: updated });

      const wrapper = await mountDashboard();
      await openItems(wrapper, "Groceries");

      const row = findTodoRow(wrapper, "Buy milk");
      await findRowButton(row, "Edit Buy milk").trigger("click");
      await flushPromises();

      const fields = textFields(wrapper);
      expect(fields[0].props("modelValue")).toBe("Buy milk");
      expect(fields[1].props("modelValue")).toBe("");

      await fields[1].setValue("2026-07-20");
      await wrapper.findComponent({ name: "VForm" }).trigger("submit");
      await flushPromises();

      expect(todoServices.updateTodo).toHaveBeenCalledWith(buyMilk.id, {
        title: "Buy milk",
        dueDate: "2026-07-20",
      });
      await expect(todoServices.updateTodo.mock.results[0].value).resolves.toMatchObject({
        status: 200,
        data: { dueDate: "2026-07-20" },
      });
      expect(findTodoRow(wrapper, "Buy milk").text()).toContain(formatDueDate("2026-07-20"));
    });

    it("User clears a due date when editing a todo", async () => {
      const withDate = {
        ...buyMilk,
        dueDate: "2026-07-20",
      };
      const cleared = {
        ...buyMilk,
        dueDate: null,
      };
      todoServices.getLists.mockResolvedValue({ data: [groceries] });
      todoServices.getTodos
        .mockResolvedValueOnce({ data: [withDate] })
        .mockResolvedValueOnce({ data: [cleared] });
      todoServices.updateTodo.mockResolvedValue({ status: 200, data: cleared });

      const wrapper = await mountDashboard();
      await openItems(wrapper, "Groceries");

      const row = findTodoRow(wrapper, "Buy milk");
      expect(row.text()).toContain(formatDueDate("2026-07-20"));
      await findRowButton(row, "Edit Buy milk").trigger("click");
      await flushPromises();

      const fields = textFields(wrapper);
      expect(fields[1].props("modelValue")).toBe("2026-07-20");
      await fields[1].setValue("");
      await wrapper.findComponent({ name: "VForm" }).trigger("submit");
      await flushPromises();

      expect(todoServices.updateTodo).toHaveBeenCalledWith(buyMilk.id, {
        title: "Buy milk",
        dueDate: null,
      });
      await expect(todoServices.updateTodo.mock.results[0].value).resolves.toMatchObject({
        status: 200,
        data: { dueDate: null },
      });
      expect(findTodoRow(wrapper, "Buy milk").text()).not.toContain(formatDueDate("2026-07-20"));
    });
  });

  describe("US-5.4 — Spot overdue todos", () => {
    it("Incomplete todo past due date is styled as overdue", async () => {
      const dueDate = localIsoDate(-1);
      const overdue = {
        ...buyMilk,
        dueDate,
        completed: false,
      };
      todoServices.getLists.mockResolvedValue({ data: [groceries] });
      todoServices.getTodos.mockResolvedValue({ data: [overdue] });

      const wrapper = await mountDashboard();
      await openItems(wrapper, "Groceries");

      const row = findTodoRow(wrapper, "Buy milk");
      expect(row.text()).toContain(formatDueDate(dueDate));
      expect(row.find(".text-error").exists()).toBe(true);
    });

    it("Completed todo past due date is not styled as overdue", async () => {
      const dueDate = localIsoDate(-1);
      const done = {
        ...buyMilk,
        dueDate,
        completed: true,
      };
      todoServices.getLists.mockResolvedValue({ data: [groceries] });
      todoServices.getTodos.mockResolvedValue({ data: [done] });

      const wrapper = await mountDashboard();
      await openItems(wrapper, "Groceries");

      const row = findTodoRow(wrapper, "Buy milk");
      expect(row.text()).toContain(formatDueDate(dueDate));
      expect(row.find(".text-error").exists()).toBe(false);
    });
  });
});
