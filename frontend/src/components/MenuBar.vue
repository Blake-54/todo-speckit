<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import authServices from "../services/authServices.js";
import userServices from "../services/userServices.js";
import Utils from "../config/utils.js";
import { emailRules } from "../config/validation.js";

const user = ref(Utils.getStore("user"));
const profileMenu = ref(false);

const editDialog = ref(false);
const editForm = ref(null);
const fName = ref("");
const lName = ref("");
const email = ref("");
const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const saving = ref(false);
const errorMessage = ref("");

const fullName = computed(() => {
  const current = user.value;
  if (!current) {
    return "";
  }

  return [current.fName, current.lName].filter(Boolean).join(" ");
});

const usernameLabel = computed(() => user.value?.username ?? "");
const emailLabel = computed(() => user.value?.email ?? "");

const fNameRules = [(value) => !!value?.trim() || "First name is required."];
const lNameRules = [(value) => !!value?.trim() || "Last name is required."];
const usernameRules = [(value) => !!value?.trim() || "Username is required."];
const passwordRules = [
  (value) => !value || value.length >= 8 || "Password must be at least 8 characters.",
];
const confirmPasswordRules = [
  (value) => (value || "") === (password.value || "") || "Passwords do not match.",
];

const refreshUser = () => {
  user.value = Utils.getStore("user");
};

const applyProfile = (profile) => {
  fName.value = profile?.fName ?? "";
  lName.value = profile?.lName ?? "";
  email.value = profile?.email ?? "";
  username.value = profile?.username ?? "";
};

const openEdit = async () => {
  const current = Utils.getStore("user");
  password.value = "";
  confirmPassword.value = "";
  errorMessage.value = "";
  applyProfile(current);
  editDialog.value = true;
  profileMenu.value = false;

  if (!current?.userId) {
    return;
  }

  try {
    const response = await userServices.getUser(current.userId);
    if (!editDialog.value) {
      return;
    }
    applyProfile(response.data);
  } catch {
    // Keep the session values already shown in the form.
  }
};

const cancelEdit = () => {
  editDialog.value = false;
  errorMessage.value = "";
};

const handleSave = async () => {
  errorMessage.value = "";
  const { valid } = await editForm.value.validate();

  if (!valid) {
    return;
  }

  const current = Utils.getStore("user");
  const payload = {
    fName: fName.value.trim(),
    lName: lName.value.trim(),
    email: email.value.trim(),
    username: username.value.trim(),
  };

  if (password.value) {
    payload.password = password.value;
  }

  saving.value = true;

  try {
    const response = await userServices.updateUser(current.userId, payload);
    const updated = response.data;

    Utils.setStore("user", {
      ...current,
      userId: updated.id ?? current.userId,
      fName: updated.fName,
      lName: updated.lName,
      email: updated.email,
      username: updated.username,
      role: updated.role ?? current.role,
    });
    window.dispatchEvent(new CustomEvent("user-logged-in"));
    editDialog.value = false;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Failed to update profile.";
  } finally {
    saving.value = false;
  }
};

const handleLogOut = () => authServices.logoutUser();

onMounted(() => {
  window.addEventListener("user-logged-in", refreshUser);
  window.addEventListener("user-logged-out", refreshUser);
});

onUnmounted(() => {
  window.removeEventListener("user-logged-in", refreshUser);
  window.removeEventListener("user-logged-out", refreshUser);
});
</script>

<template>
  <v-app-bar color="surface" elevation="1">
    <v-spacer />
    <v-menu v-model="profileMenu" location="bottom end">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon
          variant="text"
          color="primary"
          aria-label="User profile"
        >
          <v-icon icon="mdi-account-circle" />
        </v-btn>
      </template>

      <v-card min-width="260">
        <v-list>
          <v-list-item :title="fullName" lines="three">
            <template #subtitle>
              <div>{{ usernameLabel }}</div>
              <div>{{ emailLabel }}</div>
            </template>
          </v-list-item>
        </v-list>
        <v-card-actions>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            @click="openEdit"
          >
            Edit Profile
          </v-btn>
        </v-card-actions>
        <v-list>
          <v-list-item title="Log out" @click="handleLogOut" />
        </v-list>
      </v-card>
    </v-menu>
  </v-app-bar>

  <v-dialog v-if="editDialog" v-model="editDialog" max-width="480">
    <v-card>
      <v-card-item>
        <v-card-title>Edit Profile</v-card-title>
      </v-card-item>
      <v-card-text>
        <v-form ref="editForm" @submit.prevent="handleSave">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="fName"
                label="First name"
                autocomplete="given-name"
                :rules="fNameRules"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="lName"
                label="Last name"
                autocomplete="family-name"
                :rules="lNameRules"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="email"
                label="Email"
                type="email"
                autocomplete="email"
                :rules="emailRules"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="username"
                label="Username"
                autocomplete="username"
                :rules="usernameRules"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="password"
                label="New password"
                type="password"
                autocomplete="new-password"
                :rules="passwordRules"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="confirmPassword"
                label="Confirm password"
                type="password"
                autocomplete="new-password"
                :rules="confirmPasswordRules"
              />
            </v-col>
          </v-row>

          <v-alert v-if="errorMessage" type="error" class="mb-4">
            {{ errorMessage }}
          </v-alert>

          <div class="d-flex justify-end ga-2">
            <v-btn
              color="secondary"
              variant="text"
              type="button"
              @click="cancelEdit"
            >
              Cancel
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              class="oc-cta"
              type="submit"
              :loading="saving"
            >
              Save
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
