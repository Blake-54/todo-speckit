<script setup>
import { onMounted, ref, watch } from "vue";
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

const itemsDialog = ref(false);
const itemsList = ref(null);
const todos = ref([]);
const todosLoading = ref(false);
const todoLoadError = ref("");

const addItemDialog = ref(false);
const newTodoTitle = ref("");
const addTodoError = ref("");
const addingTodo = ref(false);
const addTodoForm = ref(null);

const editItemDialog = ref(false);
const editTodoTitle = ref("");
const editTodoError = ref("");
const editingTodo = ref(false);
const editTodoForm = ref(null);

const deleteItemDialog = ref(false);
const deleteTodoError = ref("");
const deletingTodo = ref(false);
const selectedTodo = ref(null);

const listNameRules = [(value) => !!value?.trim() || "List name is required."];
const todoTitleRules = [(value) => !!value?.trim() || "Todo title is required."];

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

const loadTodos = async () => {
  if (!itemsList.value) {
    return;
  }

  todosLoading.value = true;
  todoLoadError.value = "";

  try {
    const response = await todoServices.getTodos(itemsList.value.id);
    todos.value = response.data;
  } catch (error) {
    todoLoadError.value = error.response?.data?.message || "Failed to load todos.";
    todos.value = [];
  } finally {
    todosLoading.value = false;
  }
};

const openItems = async (list) => {
  itemsList.value = list;
  todos.value = [];
  todoLoadError.value = "";
  addItemDialog.value = false;
  editItemDialog.value = false;
  deleteItemDialog.value = false;
  todosLoading.value = true;
  itemsDialog.value = true;
  await loadTodos();
};

const closeItems = () => {
  itemsDialog.value = false;
};

watch(itemsDialog, (open) => {
  if (!open) {
    addItemDialog.value = false;
    editItemDialog.value = false;
    deleteItemDialog.value = false;
  }
});

const openAddItem = () => {
  newTodoTitle.value = "";
  addTodoError.value = "";
  addItemDialog.value = true;
};

const handleAddTodo = async () => {
  addTodoError.value = "";
  const { valid } = await addTodoForm.value.validate();

  if (!valid) {
    return;
  }

  addingTodo.value = true;

  try {
    await todoServices.createTodo(itemsList.value.id, {
      title: newTodoTitle.value.trim(),
    });
    addItemDialog.value = false;
    await loadTodos();
  } catch (error) {
    addTodoError.value = error.response?.data?.message || "Failed to add todo.";
  } finally {
    addingTodo.value = false;
  }
};

const openEditTodo = (todo) => {
  selectedTodo.value = todo;
  editTodoTitle.value = todo.title;
  editTodoError.value = "";
  editItemDialog.value = true;
};

const handleEditTodo = async () => {
  editTodoError.value = "";
  const { valid } = await editTodoForm.value.validate();

  if (!valid) {
    return;
  }

  editingTodo.value = true;

  try {
    await todoServices.updateTodo(selectedTodo.value.id, {
      title: editTodoTitle.value.trim(),
    });
    editItemDialog.value = false;
    await loadTodos();
  } catch (error) {
    editTodoError.value = error.response?.data?.message || "Failed to update todo.";
  } finally {
    editingTodo.value = false;
  }
};

const openDeleteTodo = (todo) => {
  selectedTodo.value = todo;
  deleteTodoError.value = "";
  deleteItemDialog.value = true;
};

const handleDeleteTodo = async () => {
  deleteTodoError.value = "";
  deletingTodo.value = true;

  try {
    await todoServices.deleteTodo(selectedTodo.value.id);
    deleteItemDialog.value = false;
    await loadTodos();
  } catch (error) {
    deleteTodoError.value = error.response?.data?.message || "Failed to delete todo.";
  } finally {
    deletingTodo.value = false;
  }
};

const handleToggleTodo = async (todo, completed) => {
  todoLoadError.value = "";

  try {
    await todoServices.updateTodo(todo.id, { completed: completed === true });
    await loadTodos();
  } catch (error) {
    todoLoadError.value = error.response?.data?.message || "Failed to update todo.";
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
                :aria-label="`View items for ${list.name}`"
                @click="openItems(list)"
              >
                <v-icon icon="mdi-format-list-bulleted" />
              </v-btn>
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

    <v-dialog v-if="itemsDialog" v-model="itemsDialog" max-width="640">
      <v-card>
        <v-card-item>
          <template #title>
            {{ itemsList?.name }} — Items
          </template>
          <template #append>
            <v-btn
              color="primary"
              variant="elevated"
              class="oc-cta"
              @click="openAddItem"
            >
              + Add Item
            </v-btn>
          </template>
        </v-card-item>

        <v-card-text>
          <v-progress-linear
            v-if="todosLoading"
            indeterminate
            color="primary"
            class="todos-loading mb-4"
          />

          <v-alert v-if="todoLoadError" type="error" class="mb-4">
            {{ todoLoadError }}
          </v-alert>

          <p v-if="!todosLoading && !todoLoadError && todos.length === 0">
            No todos in this list yet.
          </p>

          <v-list v-else-if="!todosLoading && todos.length > 0" lines="one">
            <v-list-item v-for="todo in todos" :key="todo.id">
              <template #prepend>
                <v-checkbox
                  :model-value="todo.completed"
                  color="primary"
                  hide-details
                  density="compact"
                  :aria-label="`Complete ${todo.title}`"
                  @update:model-value="(value) => handleToggleTodo(todo, value)"
                />
              </template>
              <template #title>
                <span
                  :class="{
                    'text-decoration-line-through text-medium-emphasis': todo.completed,
                  }"
                >
                  {{ todo.title }}
                </span>
              </template>
              <template #append>
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  :aria-label="`Edit ${todo.title}`"
                  @click="openEditTodo(todo)"
                >
                  <v-icon icon="mdi-pencil" />
                </v-btn>
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  :aria-label="`Delete ${todo.title}`"
                  @click="openDeleteTodo(todo)"
                >
                  <v-icon icon="mdi-delete" />
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" variant="text" @click="closeItems">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-if="addItemDialog" v-model="addItemDialog" max-width="480">
      <v-card>
        <v-card-item>
          <v-card-title>Add item</v-card-title>
        </v-card-item>
        <v-card-text>
          <v-form ref="addTodoForm" @submit.prevent="handleAddTodo">
            <v-text-field
              v-model="newTodoTitle"
              label="Todo title"
              :rules="todoTitleRules"
              class="mb-2"
            />

            <v-alert v-if="addTodoError" type="error" class="mb-4">
              {{ addTodoError }}
            </v-alert>

            <div class="d-flex justify-end ga-2">
              <v-btn
                color="secondary"
                variant="text"
                type="button"
                @click="addItemDialog = false"
              >
                Cancel
              </v-btn>
              <v-btn
                color="primary"
                variant="elevated"
                class="oc-cta"
                type="submit"
                :loading="addingTodo"
              >
                Add
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-if="editItemDialog" v-model="editItemDialog" max-width="480">
      <v-card>
        <v-card-item>
          <v-card-title>Edit item</v-card-title>
        </v-card-item>
        <v-card-text>
          <v-form ref="editTodoForm" @submit.prevent="handleEditTodo">
            <v-text-field
              v-model="editTodoTitle"
              label="Todo title"
              :rules="todoTitleRules"
              class="mb-2"
            />

            <v-alert v-if="editTodoError" type="error" class="mb-4">
              {{ editTodoError }}
            </v-alert>

            <div class="d-flex justify-end ga-2">
              <v-btn
                color="secondary"
                variant="text"
                type="button"
                @click="editItemDialog = false"
              >
                Cancel
              </v-btn>
              <v-btn
                color="primary"
                variant="elevated"
                class="oc-cta"
                type="submit"
                :loading="editingTodo"
              >
                Save
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-if="deleteItemDialog" v-model="deleteItemDialog" max-width="480">
      <v-card>
        <v-card-item>
          <v-card-title>Delete item</v-card-title>
        </v-card-item>
        <v-card-text>
          <p class="mb-4">Delete {{ selectedTodo?.title }}?</p>

          <v-alert v-if="deleteTodoError" type="error" class="mb-4">
            {{ deleteTodoError }}
          </v-alert>

          <div class="d-flex justify-end ga-2">
            <v-btn
              color="secondary"
              variant="text"
              @click="deleteItemDialog = false"
            >
              Cancel
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              class="oc-cta"
              :loading="deletingTodo"
              @click="handleDeleteTodo"
            >
              Delete
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>
