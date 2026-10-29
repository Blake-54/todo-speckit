/**
 * Feature 4 — User Profile Management
 * Spec: features/feature-4-user-profile-management.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import MenuBar from "../src/components/MenuBar.vue";
import apiClient from "../src/services/services.js";
import Utils from "../src/config/utils.js";
import appRouter from "../src/router.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const sessionUser = {
  userId: 42,
  username: "jdoe",
  email: "jane@example.com",
  fName: "Jane",
  lName: "Doe",
  role: "worker",
  token: "token-a",
};

const profile = {
  id: 42,
  fName: "Jane",
  lName: "Doe",
  email: "jane@example.com",
  username: "jdoe",
  role: "worker",
  createdAt: "2026-07-02T12:00:00.000Z",
  updatedAt: "2026-07-02T12:00:00.000Z",
};

function signIn() {
  Utils.setStore("user", { ...sessionUser });
}

const MenuBarHarness = {
  components: { MenuBar },
  template: "<v-app><MenuBar /></v-app>",
};

async function mountMenuBar() {
  signIn();
  const mounted = await mountWithPlugins(MenuBarHarness);
  await flushPromises();
  return mounted.wrapper;
}

function findButton(wrapper, label) {
  return wrapper.findAllComponents({ name: "VBtn" }).find((button) =>
    button.text().includes(label)
  );
}

async function clickButton(wrapper, label) {
  const button = findButton(wrapper, label);
  expect(button, label).toBeTruthy();
  await button.trigger("click");
  await flushPromises();
}

function textFields(wrapper) {
  return wrapper.findAllComponents({ name: "VTextField" });
}

async function openProfileMenu(wrapper) {
  const button = wrapper.findAllComponents({ name: "VBtn" }).find((entry) =>
    entry.attributes("aria-label") === "User profile"
  );
  expect(button).toBeTruthy();
  await button.trigger("click");
  await flushPromises();
}

async function openEditDialog(wrapper) {
  await openProfileMenu(wrapper);
  await clickButton(wrapper, "Edit Profile");
  await flushPromises();
}

function visibleText() {
  return document.body.textContent;
}

describe("Feature 4 — User Profile Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiClient.get.mockResolvedValue({ data: { ...profile } });
    apiClient.put.mockResolvedValue({ status: 200, data: { ...profile } });
    apiClient.post.mockResolvedValue({
      status: 200,
      data: { message: "Signed out successfully." },
    });
  });

  describe("US-4.1 — View profile from the menu bar", () => {
    it("User opens the profile dropdown from the menu bar", async () => {
      const wrapper = await mountMenuBar();

      await openProfileMenu(wrapper);

      const menu = wrapper.findComponent({ name: "VMenu" });
      expect(menu.props("modelValue")).toBe(true);

      const profileItem = wrapper.findAllComponents({ name: "VListItem" }).find((item) =>
        item.props("title") === "Jane Doe"
      );
      expect(profileItem).toBeTruthy();
      expect(profileItem.text()).toContain("jdoe");
      expect(profileItem.text()).toContain("jane@example.com");
      expect(findButton(wrapper, "Edit Profile")).toBeTruthy();
      expect(visibleText()).toContain("Log out");
    });
  });

  describe("US-4.2 — Edit profile", () => {
    it("User opens the edit profile dialog", async () => {
      const wrapper = await mountMenuBar();

      await openEditDialog(wrapper);

      const dialog = wrapper.findComponent({ name: "VDialog" });
      expect(dialog.exists()).toBe(true);
      expect(wrapper.findComponent({ name: "VCardTitle" }).text()).toBe("Edit Profile");

      const fields = textFields(wrapper);
      expect(fields[0].props("modelValue")).toBe("Jane");
      expect(fields[1].props("modelValue")).toBe("Doe");
      expect(fields[2].props("modelValue")).toBe("jane@example.com");
      expect(fields[3].props("modelValue")).toBe("jdoe");
      expect(fields[4].props("modelValue")).toBe("");
      expect(fields[5].props("modelValue")).toBe("");
      expect(apiClient.get).toHaveBeenCalledWith("users/42");
    });

    it("User cancels the edit profile dialog", async () => {
      const wrapper = await mountMenuBar();
      await openEditDialog(wrapper);

      const fields = textFields(wrapper);
      await fields[0].setValue("Changed");
      await fields[2].setValue("changed@example.com");
      await clickButton(wrapper, "Cancel");

      expect(wrapper.findComponent({ name: "VDialog" }).exists()).toBe(false);
      expect(apiClient.put).not.toHaveBeenCalled();
      expect(Utils.getStore("user")).toEqual(sessionUser);
    });

    it("User saves profile changes", async () => {
      const updated = {
        id: 42,
        fName: "Janet",
        lName: "Smith",
        email: "janet@example.com",
        username: "janet",
        role: "worker",
        createdAt: "2026-07-02T12:00:00.000Z",
        updatedAt: "2026-07-02T12:05:00.000Z",
      };
      apiClient.put.mockResolvedValue({ status: 200, data: updated });

      const wrapper = await mountMenuBar();
      await openEditDialog(wrapper);

      const fields = textFields(wrapper);
      await fields[0].setValue("Janet");
      await fields[1].setValue("Smith");
      await fields[2].setValue("janet@example.com");
      await fields[3].setValue("janet");
      await clickButton(wrapper, "Save");

      expect(apiClient.put).toHaveBeenCalledWith("users/42", {
        fName: "Janet",
        lName: "Smith",
        email: "janet@example.com",
        username: "janet",
      });
      expect(wrapper.findComponent({ name: "VDialog" }).exists()).toBe(false);
      expect(Utils.getStore("user")).toEqual({
        userId: 42,
        fName: "Janet",
        lName: "Smith",
        email: "janet@example.com",
        username: "janet",
        role: "worker",
        token: "token-a",
      });
      expect(Utils.getStore("user")).not.toHaveProperty("password");

      await openProfileMenu(wrapper);

      const profileItem = wrapper.findAllComponents({ name: "VListItem" }).find((item) =>
        item.props("title") === "Janet Smith"
      );
      expect(profileItem).toBeTruthy();
      expect(profileItem.text()).toContain("janet");
      expect(profileItem.text()).toContain("janet@example.com");
    });

    it("User saves profile with invalid email format", async () => {
      const wrapper = await mountMenuBar();
      await openEditDialog(wrapper);

      const fields = textFields(wrapper);
      await fields[2].setValue("notanemail");
      await clickButton(wrapper, "Save");

      expect(fields[2].text()).toContain("Enter a valid email address.");
      expect(apiClient.put).not.toHaveBeenCalled();
    });

    it("User saves profile with mismatched passwords", async () => {
      const wrapper = await mountMenuBar();
      await openEditDialog(wrapper);

      const fields = textFields(wrapper);
      await fields[4].setValue("password123");
      await fields[5].setValue("different123");
      await clickButton(wrapper, "Save");

      expect(fields[5].text()).toContain("Passwords do not match.");
      expect(apiClient.put).not.toHaveBeenCalled();
    });

    it("User saves profile with a password that is too short", async () => {
      const wrapper = await mountMenuBar();
      await openEditDialog(wrapper);

      const fields = textFields(wrapper);
      await fields[4].setValue("short");
      await fields[5].setValue("short");
      await clickButton(wrapper, "Save");

      expect(fields[4].text()).toContain("Password must be at least 8 characters.");
      expect(apiClient.put).not.toHaveBeenCalled();
    });

    it("Profile update API returns an error", async () => {
      apiClient.put.mockRejectedValue({
        response: {
          status: 400,
          data: { message: "Username is already taken." },
        },
      });

      const wrapper = await mountMenuBar();
      await openEditDialog(wrapper);
      await clickButton(wrapper, "Save");

      const alert = wrapper.findComponent({ name: "VAlert" });
      expect(alert.exists()).toBe(true);
      expect(alert.props("type")).toBe("error");
      expect(alert.text()).toContain("Username is already taken.");
      const dialog = wrapper.findComponent({ name: "VDialog" });
      expect(dialog.exists()).toBe(true);
      expect(wrapper.findComponent({ name: "VCardTitle" }).text()).toBe("Edit Profile");
    });
  });

  describe("US-4.3 — Log out from profile", () => {
    it("User logs out from the profile dropdown", async () => {
      const wrapper = await mountMenuBar();
      await openProfileMenu(wrapper);

      const logOut = wrapper.findAllComponents({ name: "VListItem" }).find((item) =>
        item.props("title") === "Log out"
      );
      expect(logOut).toBeTruthy();
      await logOut.trigger("click");
      await flushPromises();

      expect(apiClient.post).toHaveBeenCalledWith("logout");
      expect(localStorage.getItem("user")).toBeNull();
      expect(appRouter.currentRoute.value.name).toBe("login");
    });
  });

  describe("US-4.4 — Single logout entry point", () => {
    it("Menu bar does not show Sign out", async () => {
      const wrapper = await mountMenuBar();

      const signOut = wrapper.findAllComponents({ name: "VBtn" }).find((button) =>
        button.text().trim() === "Sign out"
      );
      expect(signOut).toBeUndefined();
      expect(wrapper.text()).not.toContain("Sign out");
    });
  });
});
