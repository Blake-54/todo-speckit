/**
 * Feature 2 — Todo List Management
 * Spec: features/feature-2-todo-list-management.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Dashboard from "../src/views/Dashboard.vue";
import todoServices from "../src/services/todoServices.js";
import appRouter from "../src/router.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/todoServices.js", () => ({
  default: {
    getLists: vi.fn(),
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
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
