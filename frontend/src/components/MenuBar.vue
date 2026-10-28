<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import authServices from "../services/authServices.js";
import Utils from "../config/utils.js";

const user = ref(Utils.getStore("user"));

const displayName = computed(() => {
  const current = user.value;
  if (!current) {
    return "";
  }

  return [current.fName, current.lName].filter(Boolean).join(" ");
});

const refreshUser = () => {
  user.value = Utils.getStore("user");
};

const handleSignOut = () => authServices.logoutUser();

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
    <span class="mr-4">{{ displayName }}</span>
    <v-btn
      color="primary"
      variant="elevated"
      class="oc-cta mr-2"
      @click="handleSignOut"
    >
      Sign out
    </v-btn>
  </v-app-bar>
</template>
