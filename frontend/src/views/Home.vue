<script setup>
import { computed } from "vue";
import authServices from "../services/authServices.js";
import Utils from "../config/utils.js";

const user = computed(() => Utils.getStore("user"));
const firstName = computed(() => user.value?.fName || "");

const handleSignOut = async () => {
  await authServices.logoutUser();
};
</script>

<template>
  <v-container class="py-10">
    <h1 class="text-h4 mb-4">Welcome, {{ firstName }}</h1>
    <v-btn
      color="primary"
      variant="elevated"
      class="oc-cta"
      @click="handleSignOut"
    >
      Sign out
    </v-btn>
  </v-container>
</template>
