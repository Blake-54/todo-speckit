<script setup>
import { onMounted, ref } from "vue";
import todoServices from "../services/todoServices.js";

const lists = ref([]);
const loading = ref(true);
const loadError = ref("");

const createDialog = ref(false);
const newListName = ref("");
const createError = ref("");
const creating = ref(false);
const createForm = ref(null);

const renameDialog = ref(false);
const editName = ref("");
const renameError = ref("");
const renaming = ref(false);
const renameForm = ref(null);

const deleteDialog = ref(false);
const deleteError = ref("");
const deleting = ref(false);

const selectedList = ref(null);

const listNameRules = [(value) => !!value?.trim() || "List name is required."];

const loadLists = async () => {
  loading.value = true;
  loadError.value = "";

  try {
    const response = await todoServices.getLists();
    lists.value = response.data;
  } catch (error) {
    loadError.value = error.response?.data?.message || "Failed to load lists.";
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  newListName.value = "";
  createError.value = "";
  createDialog.value = true;
};

const handleCreate = async () => {
  createError.value = "";
  const { valid } = await createForm.value.validate();

  if (!valid) {
    return;
  }

  creating.value = true;

  try {
    await todoServices.createList({ name: newListName.value.trim() });
    createDialog.value = false;
    await loadLists();
  } catch (error) {
    createError.value = error.response?.data?.message || "Failed to create list.";
  } finally {
    creating.value = false;
  }
};

const openRename = (list) => {
  selectedList.value = list;
  editName.value = list.name;
  renameError.value = "";
  renameDialog.value = true;
};

const handleRename = async () => {
  renameError.value = "";
  const { valid } = await renameForm.value.validate();

  if (!valid) {
    return;
  }

  renaming.value = true;

  try {
    await todoServices.updateList(selectedList.value.id, {
      name: editName.value.trim(),
    });
    renameDialog.value = false;
    await loadLists();
  } catch (error) {
    renameError.value = error.response?.data?.message || "Failed to update list.";
  } finally {
    renaming.value = false;
  }
};

const openDelete = (list) => {
  selectedList.value = list;
  deleteError.value = "";
  deleteDialog.value = true;
};

const handleDelete = async () => {
  deleteError.value = "";
  deleting.value = true;

  try {
    await todoServices.deleteList(selectedList.value.id);
    deleteDialog.value = false;
    await loadLists();
  } catch (error) {
    deleteError.value = error.response?.data?.message || "Failed to delete list.";
  } finally {
    deleting.value = false;
  }
};

onMounted(loadLists);
</script>

<template>
  <v-container class="py-6">
    <v-card elevation="2">
      <v-card-item>
        <template #title>
          <h1 class="text-h4">My Lists</h1>
        </template>
        <template #append>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            @click="openCreate"
          >
            + New List
          </v-btn>
        </template>
      </v-card-item>

      <v-card-text>
        <v-progress-linear
          v-if="loading"
          indeterminate
          color="primary"
          class="mb-4"
        />

        <v-alert v-if="loadError" type="error" class="mb-4">
          {{ loadError }}
        </v-alert>

        <p v-else-if="!loading && lists.length === 0">
          No lists yet. Create your first list.
        </p>

        <v-list v-else-if="!loading" lines="one">
          <v-list-item
            v-for="list in lists"
            :key="list.id"
            :title="list.name"
          >
            <template #append>
              <v-btn
                icon
                size="small"
                variant="text"
                aria-label="Edit list"
                @click="openRename(list)"
              >
                <v-icon icon="mdi-pencil" />
              </v-btn>
              <v-btn
                icon
                size="small"
                variant="text"
                aria-label="Delete list"
                @click="openDelete(list)"
              >
                <v-icon icon="mdi-delete" />
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <v-dialog v-if="createDialog" v-model="createDialog" max-width="480">
      <v-card>
        <v-card-item>
          <v-card-title>New list</v-card-title>
        </v-card-item>
        <v-card-text>
          <v-form ref="createForm" @submit.prevent="handleCreate">
            <v-text-field
              v-model="newListName"
              label="List name"
              :rules="listNameRules"
              class="mb-2"
            />

            <v-alert v-if="createError" type="error" class="mb-4">
              {{ createError }}
            </v-alert>

            <div class="d-flex justify-end ga-2">
              <v-btn
                color="secondary"
                variant="text"
                type="button"
                @click="createDialog = false"
              >
                Cancel
              </v-btn>
              <v-btn
                color="primary"
                variant="elevated"
                class="oc-cta"
                type="submit"
                :loading="creating"
              >
                Create
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-if="renameDialog" v-model="renameDialog" max-width="480">
      <v-card>
        <v-card-item>
          <v-card-title>Rename list</v-card-title>
        </v-card-item>
        <v-card-text>
          <v-form ref="renameForm" @submit.prevent="handleRename">
            <v-text-field
              v-model="editName"
              label="List name"
              :rules="listNameRules"
              class="mb-2"
            />

            <v-alert v-if="renameError" type="error" class="mb-4">
              {{ renameError }}
            </v-alert>

            <div class="d-flex justify-end ga-2">
              <v-btn
                color="secondary"
                variant="text"
                type="button"
                @click="renameDialog = false"
              >
                Cancel
              </v-btn>
              <v-btn
                color="primary"
                variant="elevated"
                class="oc-cta"
                type="submit"
                :loading="renaming"
              >
                Save
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-if="deleteDialog" v-model="deleteDialog" max-width="480">
      <v-card>
        <v-card-item>
          <v-card-title>Delete list</v-card-title>
        </v-card-item>
        <v-card-text>
          <p class="mb-4">Delete {{ selectedList?.name }}?</p>

          <v-alert v-if="deleteError" type="error" class="mb-4">
            {{ deleteError }}
          </v-alert>

          <div class="d-flex justify-end ga-2">
            <v-btn
              color="secondary"
              variant="text"
              @click="deleteDialog = false"
            >
              Cancel
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              class="oc-cta"
              :loading="deleting"
              @click="handleDelete"
            >
              Delete
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>
