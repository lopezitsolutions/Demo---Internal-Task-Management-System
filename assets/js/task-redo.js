const taskRedoElements = {
  redoModal: null,
  redoForm: null,
  redoTaskName: null,
  redoDescription: null,
  redoNoteSelect: null,
  redoAssignSelect: null,
  redoDueDate: null,
  redoError: null,
};

const taskRedoState = {
  originalTaskId: null,
  originalTask: null,
};

function apiPath(path) {
  // Delegates to api-base.js — single source of truth for API URL resolution.
  return window.itwmsApiPath(path);
}

function getAuthHeaders(additionalHeaders = {}) {
  const token = localStorage.getItem("authToken");
  const headers = { "Content-Type": "application/json", ...additionalHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: getAuthHeaders(options.headers) });
  const text = await response.text();
  let json = null;
  if (text) { try { json = JSON.parse(text); } catch { json = null; } }
  if (!response.ok) {
    const msg = json && typeof json === "object" ? json.message || json.error : null;
    throw new Error((typeof msg === "string" && msg) || `Request failed with status ${response.status}`);
  }
  if (json && typeof json === "object" && json.success === false) throw new Error(json.message || "Request failed.");
  if (!json || typeof json !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(json, "data")) return json.data;
  return json;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

function createRedoModal() {
  if (taskRedoElements.redoModal) return taskRedoElements.redoModal;
  const modal = document.createElement("div");
  modal.id = "redo-modal";
  modal.className = "modal hidden";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "redo-modal-title");
  modal.innerHTML = `
    <div class="modal-content tasks-modal-content tasks-modal-content--form">
      <div class="modal-header">
        <h3 id="redo-modal-title">Redo Task</h3>
        <button type="button" id="close-redo-modal" class="close-button" aria-label="Close">&times;</button>
      </div>
      <form id="redo-form" class="tasks-modal-form">
        <div class="form-grid tasks-form-grid">
          <label class="tasks-form-span">
            Task name
            <input id="redo-task-name" name="taskName" type="text" placeholder="Task name" required />
          </label>
          <label class="tasks-form-span">
            Description
            <textarea id="redo-description" name="description" rows="3" placeholder="Description"></textarea>
          </label>
          <label>
            Note
            <select id="redo-note-select" name="noteId"></select>
          </label>
          <label>
            Assigned to
            <select id="redo-assign-select" name="assignedTo"></select>
          </label>
          <label>
            Due date
            <input id="redo-due-date" name="dueDate" type="datetime-local" />
          </label>
        </div>
        <p id="redo-error" class="tasks-inline-error" hidden></p>
        <div class="modal-actions tasks-modal-actions">
          <button type="submit" class="primary-button" id="redo-submit">Create redo task</button>
          <button type="button" id="cancel-redo" class="ghost-button">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  taskRedoElements.redoModal = modal;
  taskRedoElements.redoForm = modal.querySelector("#redo-form");
  taskRedoElements.redoTaskName = modal.querySelector("#redo-task-name");
  taskRedoElements.redoDescription = modal.querySelector("#redo-description");
  taskRedoElements.redoNoteSelect = modal.querySelector("#redo-note-select");
  taskRedoElements.redoAssignSelect = modal.querySelector("#redo-assign-select");
  taskRedoElements.redoDueDate = modal.querySelector("#redo-due-date");
  taskRedoElements.redoError = modal.querySelector("#redo-error");
  registerRedoModalEvents();
  return modal;
}

function registerRedoModalEvents() {
  const modal = taskRedoElements.redoModal;
  if (!modal) return;
  const closeBtn = modal.querySelector("#close-redo-modal");
  const cancelBtn = modal.querySelector("#cancel-redo");
  const form = modal.querySelector("#redo-form");
  if (closeBtn) closeBtn.addEventListener("click", closeRedoModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeRedoModal);
  if (form) form.addEventListener("submit", submitRedo);
  if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) closeRedoModal(); });
}

async function openRedoModal(taskId) {
  taskRedoState.originalTaskId = taskId;
  createRedoModal();
  if (taskRedoElements.redoError) { taskRedoElements.redoError.textContent = ""; taskRedoElements.redoError.hidden = true; }
  try {
    const task = await fetchJson(apiPath(`/api/tasks/${taskId}`));
    taskRedoState.originalTask = task;
    if (taskRedoElements.redoTaskName) taskRedoElements.redoTaskName.value = task?.taskName ? `Redo: ${task.taskName}` : "";
    if (taskRedoElements.redoDescription) taskRedoElements.redoDescription.value = task?.description || "";
    if (taskRedoElements.redoNoteSelect) {
      const noteId = task?.note?.id ?? task?.noteId ?? "";
      taskRedoElements.redoNoteSelect.innerHTML = `<option value="${noteId}">Same note</option>`;
      taskRedoElements.redoNoteSelect.disabled = true;
      taskRedoElements.redoNoteSelect.value = String(noteId);
    }
    if (taskRedoElements.redoAssignSelect) {
      const assignedTo = task?.assignedToUser?.id ?? task?.assignedTo ?? "";
      taskRedoElements.redoAssignSelect.innerHTML = `<option value="${assignedTo}">Same assignee</option>`;
      taskRedoElements.redoAssignSelect.disabled = true;
      taskRedoElements.redoAssignSelect.value = String(assignedTo);
    }
    const noteId = task?.noteId;
    if (noteId && taskRedoElements.redoDueDate) {
      try {
        const note = await fetchJson(apiPath(`/api/notes/${noteId}`));
        const noteDue = note?.dueDate;
        if (noteDue) {
          const dueInput = taskRedoElements.redoDueDate;
          const maxDue = new Date(noteDue);
          const now = new Date();
          const minDue = now > maxDue ? now : new Date(now.getTime() + 3600000);
          dueInput.min = minDue.toISOString().slice(0, 16);
          dueInput.max = maxDue.toISOString().slice(0, 16);
        }
      } catch (e) { console.warn("Could not load note for due date validation:", e); }
    }
  } catch (error) {
    console.error("Failed to load original task:", error);
    if (taskRedoElements.redoError) {
      taskRedoElements.redoError.textContent = "Failed to load original task details.";
      taskRedoElements.redoError.hidden = false;
    }
  }
  const modal = taskRedoElements.redoModal;
  if (modal) modal.classList.remove("hidden");
}

function closeRedoModal() {
  const modal = taskRedoElements.redoModal;
  if (modal) modal.classList.add("hidden");
  taskRedoState.originalTaskId = null;
  taskRedoState.originalTask = null;
}

async function submitRedo(event) {
  event.preventDefault();
  const taskId = taskRedoState.originalTaskId;
  if (!taskId) return;
  const taskName = taskRedoElements.redoTaskName?.value?.trim() || "";
  const description = taskRedoElements.redoDescription?.value?.trim() || "";
  const dueDate = taskRedoElements.redoDueDate?.value || null;
  if (!taskName) {
    if (taskRedoElements.redoError) {
      taskRedoElements.redoError.textContent = "Task name is required.";
      taskRedoElements.redoError.hidden = false;
    }
    return;
  }
  try {
    const noteId = taskRedoElements.redoNoteSelect?.value || null;
    const assignedTo = taskRedoElements.redoAssignSelect?.value || null;
    const result = await fetchJson(apiPath(`/api/tasks/${taskId}/redo`), {
      method: "POST",
      body: JSON.stringify({ taskName, description, ...(dueDate ? { dueDate: dueDate.replace("T", " ") + ":00" } : {}), ...(noteId ? { noteId: parseInt(noteId, 10) } : {}), ...(assignedTo ? { assignedTo: parseInt(assignedTo, 10) } : {}) }),
    });
    closeRedoModal();
    if (typeof showNotification === "function") showNotification("success", "Redo task created successfully");
    if (window.itwmsApiCache) window.itwmsApiCache.invalidate("/api/tasks");
    // Prepend the new redo task to local state and re-render — no full reload needed.
    // The API response contains the newly created redo task.
    if (typeof taskState !== "undefined" && Array.isArray(taskState.tasks) && result) {
      // Also mark the original rejected task with its redo count if visible
      const originalTask = taskState.tasks.find((t) => String(t.id) === String(taskId));
      if (originalTask) originalTask.redoCount = (originalTask.redoCount ?? 0) + 1;
      // Prepend the new redo task
      taskState.tasks.unshift(result);
      if (taskState.pagination) taskState.pagination.total = (taskState.pagination.total ?? 0) + 1;
    }
    if (typeof renderTasks === "function") renderTasks();
  } catch (error) {
    console.error("Failed to create redo:", error);
    if (taskRedoElements.redoError) {
      taskRedoElements.redoError.textContent = error.message || "Failed to create redo task.";
      taskRedoElements.redoError.hidden = false;
    }
    if (typeof showNotification === "function") showNotification("error", "Failed to create redo task.");
  }
}

window.openRedoModal = openRedoModal;
window.closeRedoModal = closeRedoModal;
