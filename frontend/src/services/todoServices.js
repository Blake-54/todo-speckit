import apiClient from "./services.js";

const todoServices = {
  getLists() {
    return apiClient.get("lists");
  },

  createList(payload) {
    return apiClient.post("lists", payload);
  },

  updateList(listId, payload) {
    return apiClient.put(`lists/${listId}`, payload);
  },

  deleteList(listId) {
    return apiClient.delete(`lists/${listId}`);
  },

  getTodos(listId) {
    return apiClient.get(`lists/${listId}/todos`);
  },

  createTodo(listId, payload) {
    return apiClient.post(`lists/${listId}/todos`, payload);
  },

  updateTodo(todoId, payload) {
    return apiClient.put(`todos/${todoId}`, payload);
  },

  deleteTodo(todoId) {
    return apiClient.delete(`todos/${todoId}`);
  },
};

export default todoServices;
