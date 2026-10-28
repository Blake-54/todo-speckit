/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Register from "../src/views/Register.vue";
import authServices from "../src/services/authServices.js";
import { mountWithPlugins, createTestRouter } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  default: {
    loginUser: vi.fn(),
    registerUser: vi.fn(),
    logoutUser: vi.fn(),
  },
}));

async function getForm(wrapper) {
  return wrapper.findComponent({ name: "VForm" });
}

async function getTextFields(wrapper) {
  return wrapper.findAllComponents({ name: "VTextField" });
}

async function fillValidRegisterForm(wrapper, overrides = {}) {
  const values = {
    fName: "Jane",
    lName: "Doe",
    email: "jane@example.com",
    username: "jdoe",
    password: "password123",
    confirmPassword: "password123",
    ...overrides,
  };

  const fields = await getTextFields(wrapper);
  const ordered = [
    values.fName,
    values.lName,
    values.email,
    values.username,
    values.password,
    values.confirmPassword,
  ];

  for (let i = 0; i < fields.length; i++) {
    await fields[i].vm.$emit("update:modelValue", ordered[i]);
  }

  await flushPromises();
}

async function submitRegisterForm(wrapper) {
  const form = wrapper.findComponent({ name: "VForm" });
  await form.trigger("submit");
  await flushPromises();
}

describe("Feature 1 — Register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("US-1.1 — Registration", () => {
    it("User submits registration with invalid email format", async () => {
      const { wrapper } = await mountWithPlugins(Register, {
        router: await createTestRouter("/register"),
      });
      const form = await getForm(wrapper);

      await fillValidRegisterForm(wrapper, { email: "notanemail" });
      await submitRegisterForm(wrapper);
      const validation = await form.vm.validate();

      expect(validation.valid).toBe(false);
      expect(wrapper.text()).toContain("Enter a valid email address.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with missing username", async () => {
      const { wrapper } = await mountWithPlugins(Register, {
        router: await createTestRouter("/register"),
      });
      const form = await getForm(wrapper);

      await fillValidRegisterForm(wrapper, { username: "" });
      await submitRegisterForm(wrapper);
      const validation = await form.vm.validate();

      expect(validation.valid).toBe(false);
      expect(wrapper.text()).toContain("Username is required.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with password too short", async () => {
      const { wrapper } = await mountWithPlugins(Register, {
        router: await createTestRouter("/register"),
      });
      const form = await getForm(wrapper);

      await fillValidRegisterForm(wrapper, {
        password: "short",
        confirmPassword: "short",
      });
      await submitRegisterForm(wrapper);
      const validation = await form.vm.validate();

      expect(validation.valid).toBe(false);
      expect(wrapper.text()).toContain("Password must be at least 8 characters.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with mismatched passwords", async () => {
      const { wrapper } = await mountWithPlugins(Register, {
        router: await createTestRouter("/register"),
      });
      const form = await getForm(wrapper);

      await fillValidRegisterForm(wrapper, { confirmPassword: "differentpassword" });
      await submitRegisterForm(wrapper);
      const validation = await form.vm.validate();

      expect(validation.valid).toBe(false);
      expect(wrapper.text()).toContain("Passwords do not match.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User registers with a duplicate username", async () => {
      authServices.registerUser.mockRejectedValue({
        response: { data: { message: "Username is already taken." } },
      });

      const { wrapper } = await mountWithPlugins(Register, {
        router: await createTestRouter("/register"),
      });

      await fillValidRegisterForm(wrapper);
      await submitRegisterForm(wrapper);

      expect(authServices.registerUser).toHaveBeenCalled();
      expect(wrapper.text()).toContain("Username is already taken.");
      expect(wrapper.findComponent({ name: "VAlert" }).exists()).toBe(true);
    });

    it("User registers with a duplicate email", async () => {
      authServices.registerUser.mockRejectedValue({
        response: { data: { message: "Email is already registered." } },
      });

      const { wrapper } = await mountWithPlugins(Register, {
        router: await createTestRouter("/register"),
      });

      await fillValidRegisterForm(wrapper);
      await submitRegisterForm(wrapper);

      expect(authServices.registerUser).toHaveBeenCalled();
      expect(wrapper.text()).toContain("Email is already registered.");
      expect(wrapper.findComponent({ name: "VAlert" }).exists()).toBe(true);
    });
  });
});
