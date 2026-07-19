const noteElements = {
  sidebarUsername: document.getElementById("sidebar-username"),
  signoutBtn: document.getElementById("signout-btn"),
  toggleNoteForm: document.getElementById("toggle-note-form"),
  noteFormCard: document.getElementById("note-form-card"),
  noteForm: document.getElementById("note-form"),
  cancelNoteForm: document.getElementById("cancel-note-form"),
  notesList: document.getElementById("notes-list"),
  notesRefresh: document.getElementById("notes-refresh"),
  depSelect: document.querySelector('select[name="depId"]'),
  tasksModal: document.getElementById("tasks-modal"),
  tasksModalTitle: document.getElementById("tasks-modal-title"),
  tasksModalList: document.getElementById("tasks-modal-list"),
  closeTasksModal: document.getElementById("close-tasks-modal"),
  filterTabs: document.getElementById("notes-filter-tabs"),
};

const noteState = {
  notes: [],
  departments: [],
  editingNoteId: null,
  selectedNoteId: null,
  users: [],
  currentTasks: [],
  currentStatus: "Active",
  isLoading: false,
};

function getCurrentRoleName() {
  if (typeof getCurrentRole === "function") {
    return getCurrentRole();
  }
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.roleName || user.role || "Employee";
  } catch {
    return "Employee";
  }
}

function canCreateNote() {
  if (typeof hasPermission === "function") {
    return hasPermission("notes", "create");
  }
  return getCurrentRoleName() !== "Employee";
}

function canEditNote() {
  if (typeof hasPermission === "function") {
    return hasPermission("notes", "edit");
  }
  return getCurrentRoleName() !== "Employee";
}

function canDeleteNote() {
  if (typeof hasPermission === "function") {
    return hasPermission("notes", "delete");
  }
  return getCurrentRoleName() === "Admin" || getCurrentRoleName() === "Manager";
}

function apiPath(path) {
  if (
    typeof window !== "undefined" &&
    typeof window.itwmsApiPath === "function"
  ) {
    return window.itwmsApiPath(path);
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined" && window.__API_BASE__) {
    const base = String(window.__API_BASE__).replace(/\/$/, "");
    return `${base}${normalized}`;
  }
  return normalized;
}

function getAuthHeaders(additionalHeaders = {}) {
  const token = localStorage.getItem("authToken");
  const headers = {
    "Content-Type": "application/json",
    ...additionalHeaders,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === "completed" || status === "Archived") return false;
  const now = new Date();
  const due = new Date(dueDate);
  return due < now;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: getAuthHeaders(options.headers),
  });

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const msg =
      json && typeof json === "object" ? json.message || json.error : null;
    throw new Error(
      (typeof msg === "string" && msg) ||
        `Request failed with status ${response.status}`,
    );
  }

  if (json && typeof json === "object" && json.success === false) {
    throw new Error(json.message || "Request failed.");
  }

  if (!json || typeof json !== "object") {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(json, "data")) {
    return json.data;
  }

  return json;
}

async function loadDepartments() {
  try {
    const departments = await fetchJson(apiPath("/api/departments"));
    noteState.departments = departments || [];
    populateDepartmentSelect();
  } catch (error) {
    console.error("Failed to load departments:", error);
  }
}

async function loadProfile() {
  try {
    const profile = await fetchJson(apiPath("/api/auth/me"));
    localStorage.setItem("user", JSON.stringify(profile));
    return profile;
  } catch (error) {
    console.error("Unable to load profile:", error);
    window.location.replace("/index.html");
  }
}

function populateDepartmentSelect() {
  if (!noteElements.depSelect) return;
  noteElements.depSelect.innerHTML =
    '<option value="">Select department</option>';
  noteState.departments.forEach((dep) => {
    const option = document.createElement("option");
    option.value = dep.id;
    option.textContent = dep.depName || dep.name || "Unnamed department";
    noteElements.depSelect.appendChild(option);
  });
}

async function loadNotes(status = "Active") {
  try {
    noteState.isLoading = true;
    noteState.currentStatus = status;
    renderLoadingState();
    renderTabs();

    const statusParam = status ? `?status=${encodeURIComponent(status)}` : "";
    const notes = await fetchJson(apiPath(`/api/notes${statusParam}`));
    noteState.notes = notes || [];
    renderNotes();
  } catch (error) {
    console.error("Failed to load notes:", error);
    showError(error.message || "Failed to load notes");
  } finally {
    noteState.isLoading = false;
  }
}

function renderNotes() {
  if (!noteElements.notesList) return;

  // Show empty state if no notes
  if (noteState.notes.length === 0) {
    noteElements.notesList.innerHTML = `
      <div class="notes-empty-state">
        <div class="empty-state-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
        <p class="empty-state-message">
          No ${noteState.currentStatus.toLowerCase()} notes found
        </p>
        <p class="empty-state-hint">
          ${
            noteState.currentStatus === "Active"
              ? "Create a new note to get started"
              : "Switch to Active to see your notes"
          }
        </p>
      </div>
    `;
    return;
  }

  noteElements.notesList.innerHTML = "";
  noteState.notes.forEach((note) => {
    const noteItem = document.createElement("div");
    noteItem.className = `card note-item ${note.id == noteState.selectedNoteId ? "selected" : ""}`;

    // Apply overdue highlighting
    if (isOverdue(note.dueDate, note.status)) {
      noteItem.classList.add("overdue-item");
    }

    noteItem.setAttribute("data-note-id", note.id);
    noteItem.addEventListener("click", () => handleNoteClick(note.id));

    const statusClass =
      note.status === "Active" ? "status-active" : "status-archived";

    // Determine if note is read-only (archived notes are read-only for non-admin/manager)
    const isArchived = note.status === "Archived";
    const canEditArchived =
      isArchived &&
      (getCurrentRoleName() === "Admin" || getCurrentRoleName() === "Manager");
    const canEditThisNote = canEditNote() && (!isArchived || canEditArchived);
    const canDeleteThisNote =
      canDeleteNote() && (!isArchived || canEditArchived);

    noteItem.innerHTML = `
      <div class="note-header">
        <div class="note-content">
          <h3>${note.noteName}</h3>
        </div>
        <span class="status-pill ${statusClass}">${note.status}</span>
      </div>
      <p class="note-description">${note.description || "No description provided."}</p>
      <div class="note-meta">
        <div class="note-meta-item">
          <strong>Department:</strong> ${getDepartmentName(note.department || note.depId)}
        </div>
        <div class="note-meta-item">
          <strong>Due Date:</strong> ${new Date(note.dueDate).toLocaleDateString()}
        </div>
        <div class="note-meta-item">
          <strong>Created:</strong> ${new Date(note.createdAt).toLocaleString()}
        </div>
      </div>
      <div class="note-actions">
        <button class="secondary-button edit-btn" data-id="${note.id}" ${
          canEditThisNote
            ? ""
            : 'disabled title="' +
              (isArchived
                ? "Archived notes cannot be edited"
                : "No permission to edit") +
              '"'
        }>Edit</button>
        <button class="ghost-button delete-btn" data-id="${note.id}" style="color: var(--danger); border-color: rgba(255, 127, 127, 0.2);" ${
          canDeleteThisNote
            ? ""
            : 'disabled title="' +
              (isArchived
                ? "Archived notes cannot be deleted"
                : "No permission to delete") +
              '"'
        }>Delete</button>
      </div>
    `;
    noteElements.notesList.appendChild(noteItem);
  });

  // Add event listeners for edit and delete
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering note click
      if (!canEditNote()) {
        showAccessDenied("You don't have permission to edit notes");
        return;
      }
      editNote(e.target.dataset.id);
    });
  });
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering note click
      if (!canDeleteNote()) {
        showAccessDenied("You don't have permission to delete notes");
        return;
      }
      deleteNote(e.target.dataset.id);
    });
  });
}

function renderTabs() {
  if (!noteElements.filterTabs) return;

  const tabs = noteElements.filterTabs.querySelectorAll(".filter-tab");
  tabs.forEach((tab) => {
    const tabStatus = tab.dataset.status;
    if (tabStatus === noteState.currentStatus) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });
}

function renderLoadingState() {
  if (!noteElements.notesList) return;

  if (noteState.isLoading) {
    noteElements.notesList.innerHTML = `
      <div class="notes-loading-state">
        <div class="loading-spinner"></div>
        <p class="loading-text">Loading ${noteState.currentStatus.toLowerCase()} notes...</p>
      </div>
    `;
  }
}

function showError(message) {
  if (!noteElements.notesList) return;
  noteElements.notesList.innerHTML = `
    <div class="notes-error-state">
      <div class="error-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
      <p class="error-message">${escapeHtml(message)}</p>
      <button class="secondary-button" onclick="loadNotes(noteState.currentStatus)">
        Try Again
      </button>
    </div>
  `;
}

function getDepartmentName(depIdOrDepartment) {
  // Handle nested department object from API
  if (depIdOrDepartment && typeof depIdOrDepartment === "object") {
    return depIdOrDepartment.depName || depIdOrDepartment.name || "Unknown";
  }
  // Handle depId lookup from old system
  if (depIdOrDepartment) {
    const dep = noteState.departments.find((d) => d.id == depIdOrDepartment);
    return dep ? dep.depName || dep.name || "Unknown" : "Unknown";
  }
  return "Unknown";
}

function getCurrentUserId() {
  if (typeof getCurrentUser === "function") {
    const user = getCurrentUser();
    return user?.id ?? null;
  }
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.id ?? null;
  } catch {
    return null;
  }
}

function canManageTaskCollaborators() {
  return hasPermission("tasks", "edit") || hasPermission("tasks", "assign");
}

function canJoinTask() {
  return getCurrentRoleName() === "Employee";
}

function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getUserLabel(user) {
  if (!user) return "Unknown user";
  return user.nickname || user.name || user.email || `User ${user.id}`;
}

function getCollaboratorUserIds(task) {
  if (!task || !Array.isArray(task.collaborators)) return [];
  return task.collaborators
    .map((collab) => String((collab.id ?? collab.userId) || ""))
    .filter(Boolean);
}

function isTaskCollaborator(task, userId) {
  if (!task || !userId) return false;
  return getCollaboratorUserIds(task).includes(String(userId));
}

async function loadUsers() {
  if (!canManageTaskCollaborators()) {
    noteState.users = [];
    return;
  }

  try {
    const allUsers = [];
    let page = 1;
    let totalPages = 1;
    const pageSize = 100;

    do {
      const response = await fetch(
        apiPath(`/api/users?page=${page}&limit=${pageSize}`),
        {
          headers: getAuthHeaders(),
        },
      );
      const text = await response.text();
      let json = null;
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
      }
      if (!response.ok || (json && json.success === false)) {
        throw new Error(
          (json && (json.message || json.error)) ||
            `Users request failed (${response.status})`,
        );
      }

      const batch = Array.isArray(json?.data) ? json.data : [];
      allUsers.push(...batch);
      totalPages = Number(json?.pagination?.totalPages || 1);
      page += 1;
    } while (page <= totalPages && page <= 10);

    noteState.users = allUsers.filter(
      (user) =>
        user && (user.deletedAt === null || user.deletedAt === undefined),
    );
  } catch (error) {
    console.error("Failed to load users:", error);
    noteState.users = [];
  }
}

async function loadTaskCollaborators(taskId) {
  try {
    const data = await fetchJson(apiPath(`/api/tasks/${taskId}/collaborators`));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn("Unable to load task collaborators:", error);
    return [];
  }
}

async function refreshTaskList() {
  if (noteState.selectedNoteId != null) {
    await fetchTasksByNote(noteState.selectedNoteId);
  }
}

function buildUserOptions(task) {
  const existing = new Set(getCollaboratorUserIds(task));
  const options = noteState.users
    .filter((user) => user && user.id != null && !existing.has(String(user.id)))
    .map(
      (user) =>
        `<option value="${escapeHtml(user.id)}">${escapeHtml(getUserLabel(user))}</option>`,
    );
  if (!options.length) {
    return '<option value="">No users available</option>';
  }
  return `<option value="">Select collaborator</option>${options.join("")}`;
}

function renderTasks(tasks) {
  if (!noteElements.tasksModalList) return;
  noteState.currentTasks = tasks || [];
  noteElements.tasksModalList.innerHTML = "";

  if (!tasks || tasks.length === 0) {
    noteElements.tasksModalList.innerHTML =
      '<p class="meta-text">No tasks are associated with this note.</p>';
    return;
  }

  tasks.forEach((task) => {
    const taskId = escapeHtml(task.id);
    const collaborators = Array.isArray(task.collaborators)
      ? task.collaborators
      : [];
    const collaboratorHtml = collaborators.length
      ? `<ul class="note-task-collab-list">${collaborators
          .map((collab) => {
            const userId = escapeHtml(collab.id ?? collab.userId ?? "");
            const label = escapeHtml(getUserLabel(collab));
            const removeButton = canManageTaskCollaborators()
              ? `<button type="button" class="ghost-button task-action-btn" data-action="remove-collaborator" data-task-id="${taskId}" data-user-id="${userId}">Remove</button>`
              : "";
            return `<li class="note-task-collab-item"><span>${label}</span>${removeButton}</li>`;
          })
          .join("")}</ul>`
      : '<p class="meta-text">No collaborators yet.</p>';

    const joinButton =
      canJoinTask() && !isTaskCollaborator(task, getCurrentUserId())
        ? `<button type="button" class="secondary-button task-action-btn" data-action="join-task" data-task-id="${taskId}">Join task</button>`
        : "";

    const addCollaboratorControls = canManageTaskCollaborators()
      ? `
        <div class="note-task-collab-add">
          <select class="task-collab-select" data-task-id="${taskId}">
            ${buildUserOptions(task)}
          </select>
          <button type="button" class="secondary-button task-action-btn" data-action="add-collaborator" data-task-id="${taskId}">Add collaborator</button>
        </div>
      `
      : "";

    const taskCard = document.createElement("div");
    taskCard.className = "task-item note-task-item";

    // Apply overdue highlighting
    if (isOverdue(task.dueDate, task.status || task.taskStatus)) {
      taskCard.classList.add("overdue-item");
    }

    taskCard.innerHTML = `
      <div class="task-header">
        <div>
          <h3>${escapeHtml(task.taskName || task.name || `Task ${task.id}`)}</h3>
          <span class="status-pill status-${String(
            task.status || task.taskStatus || "pending",
          )
            .toLowerCase()
            .replace(
              /\s+/g,
              "-",
            )}">${escapeHtml(task.status || task.taskStatus || "Pending")}</span>
        </div>
        <div class="note-task-actions">
          ${joinButton}
        </div>
      </div>
      <p class="task-description">${escapeHtml(task.description || "No description provided.")}</p>
      <div class="task-meta">
        <div><strong>Due:</strong> ${escapeHtml(task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date")}</div>
        <div><strong>Assigned to:</strong> ${escapeHtml(task.assignedToUser?.nickname ?? task.assignedToUser?.name ?? task.assignedTo ?? "Unassigned")}</div>
      </div>
      <div class="note-task-collaborators">
        <h4>Collaborators</h4>
        ${collaboratorHtml}
      </div>
      ${addCollaboratorControls}
    `;
    noteElements.tasksModalList.appendChild(taskCard);
  });
}

async function fetchTasksByNote(noteId) {
  try {
    // First, try to find the note with embedded tasks
    const note = noteState.notes.find((n) => n.id == noteId);
    let tasksByNote = [];

    if (note && Array.isArray(note.tasks)) {
      // Use embedded tasks from the note
      tasksByNote = note.tasks.map((task) => ({
        ...task,
        noteId: noteId, // Ensure noteId is set for API calls
      }));
    } else {
      // Fallback to fetching tasks separately
      const allTasks = await fetchJson(apiPath(`/api/tasks`));
      tasksByNote = Array.isArray(allTasks)
        ? allTasks.filter((task) => taskMatchesNote(task, noteId))
        : [];

      // Ensure tasks have noteId for API calls
      tasksByNote = tasksByNote.map((task) => ({
        ...task,
        noteId: task.noteId || noteId,
      }));
    }

    // Load collaborators for each task
    await Promise.all(
      tasksByNote.map(async (task) => {
        if (!Array.isArray(task.collaborators)) {
          task.collaborators = await loadTaskCollaborators(task.id);
        }
        return task;
      }),
    );

    noteState.currentTasks = tasksByNote;
    renderTasks(tasksByNote);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    showError(error.message || "Failed to load tasks");
  }
}

async function addTaskCollaborator(taskId, userId) {
  if (!taskId || !userId) return;

  // Find the task to get its noteId
  const task = noteState.currentTasks.find((t) => t && t.id == taskId);
  const noteId = task?.noteId || noteState.selectedNoteId;

  try {
    await fetchJson(apiPath(`/api/tasks/${taskId}/collaborators`), {
      method: "POST",
      body: JSON.stringify({
        userId: Number(userId),
        ...(noteId != null ? { noteId } : {}),
      }),
    });
  } catch (error) {
    console.error("Failed to add collaborator:", error);
    showNotification("error", "Failed to add collaborator. Please try again.");
  }
}

async function removeTaskCollaborator(taskId, userId) {
  if (!taskId || !userId) return;
  try {
    await fetchJson(apiPath(`/api/tasks/${taskId}/collaborators/${userId}`), {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Failed to remove collaborator:", error);
    showNotification(
      "error",
      "Failed to remove collaborator. Please try again.",
    );
  }
}

async function joinTaskAsCollaborator(taskId) {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    alert("Unable to determine current user.");
    return;
  }

  // Find the task to get its noteId
  const task = noteState.currentTasks.find((t) => t && t.id == taskId);
  const noteId = task?.noteId || noteState.selectedNoteId;

  try {
    await fetchJson(apiPath(`/api/tasks/${taskId}/collaborators`), {
      method: "POST",
      body: JSON.stringify({
        userId: Number(currentUserId),
        ...(noteId != null ? { noteId } : {}),
      }),
    });
    showNotification("success", "Joined task successfully");
  } catch (error) {
    console.error("Failed to join task:", error);
    showNotification("error", "Failed to join task. Please try again.");
  }
}

function handleTaskModalClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const taskId = button.dataset.taskId;
  const action = button.dataset.action;
  if (!taskId || !action) return;

  if (action === "join-task") {
    event.preventDefault();
    joinTaskAsCollaborator(taskId).then(() => refreshTaskList());
    return;
  }

  if (action === "add-collaborator") {
    event.preventDefault();
    if (!canManageTaskCollaborators()) {
      showAccessDenied(
        "You don't have permission to add collaborators to this task",
      );
      return;
    }
    const select = noteElements.tasksModalList.querySelector(
      `select.task-collab-select[data-task-id="${taskId}"]`,
    );
    const userId = select?.value;
    if (!userId) {
      alert("Select a user before adding a collaborator.");
      return;
    }
    addTaskCollaborator(taskId, userId).then(() => refreshTaskList());
    return;
  }

  if (action === "remove-collaborator") {
    event.preventDefault();
    if (!canManageTaskCollaborators()) {
      showAccessDenied(
        "You don't have permission to remove collaborators from this task",
      );
      return;
    }
    const userId = button.dataset.userId;
    if (!userId) return;
    if (!confirm("Remove this collaborator from the task?")) return;
    removeTaskCollaborator(taskId, userId).then(() => refreshTaskList());
  }
}

function showError(message) {
  if (!noteElements.tasksModalList) return;
  noteElements.tasksModalList.innerHTML = `<p class="meta-text error">Error: ${escapeHtml(message)}</p>`;
}

function showLoadingState() {
  if (noteElements.tasksModalList) {
    noteElements.tasksModalList.innerHTML =
      '<p class="meta-text">Loading tasks...</p>';
  }
}

function openTasksModal(note) {
  if (!noteElements.tasksModal) return;
  const title = note
    ? `Tasks for: ${escapeHtml(note.noteName)}`
    : "Tasks for selected note";
  if (noteElements.tasksModalTitle) {
    noteElements.tasksModalTitle.textContent = title;
  }
  noteElements.tasksModal.classList.remove("hidden");
  noteElements.tasksModal.setAttribute("aria-hidden", "false");
}

function closeTasksModal() {
  if (!noteElements.tasksModal) return;
  noteElements.tasksModal.classList.add("hidden");
  noteElements.tasksModal.setAttribute("aria-hidden", "true");
}

function showAccessDenied(message = "Access Denied") {
  console.warn(`[RBAC] ${message}`);
  alert(
    `${message}. Your role does not have permission to perform this action.`,
  );
}

function showNoteForm(note = null) {
  if (!canCreateNote() && !noteState.editingNoteId) {
    showAccessDenied("You don't have permission to create notes");
    return;
  }

  noteElements.noteFormCard.classList.remove("hidden");
  if (note) {
    noteState.editingNoteId = note.id;
    noteElements.noteForm.noteName.value = note.noteName;
    noteElements.noteForm.description.value = note.description;
    noteElements.noteForm.depId.value =
      note.depId ?? note.departmentId ?? note.depId?.id ?? "";
    noteElements.noteForm.dueDate.value = note.dueDate.split(" ")[0]; // YYYY-MM-DD
    noteElements.noteForm.status.value = note.status;
  } else {
    noteState.editingNoteId = null;
    noteElements.noteForm.reset();
  }
}

function hideNoteForm() {
  noteElements.noteFormCard.classList.add("hidden");
  noteState.editingNoteId = null;
  noteElements.noteForm.reset();
}

async function saveNote(event) {
  event.preventDefault();
  const formData = new FormData(noteElements.noteForm);
  const noteData = {
    noteName: formData.get("noteName"),
    description: formData.get("description"),
    depId: parseInt(formData.get("depId")),
    dueDate: formData.get("dueDate"),
    status: formData.get("status"),
  };

  try {
    if (noteState.editingNoteId) {
      if (!canEditNote()) {
        showAccessDenied("You don't have permission to edit notes");
        return;
      }
      await fetchJson(apiPath(`/api/notes/${noteState.editingNoteId}`), {
        method: "PUT",
        body: JSON.stringify(noteData),
      });
    } else {
      if (!canCreateNote()) {
        showAccessDenied("You don't have permission to create notes");
        return;
      }
      await fetchJson(apiPath("/api/notes"), {
        method: "POST",
        body: JSON.stringify(noteData),
      });
    }
    hideNoteForm();
    await loadNotes(noteState.currentStatus);
    showNotification(
      "success",
      noteState.editingNoteId
        ? "Note updated successfully"
        : "Note added successfully",
    );
  } catch (error) {
    console.error("Failed to save note:", error);
    showNotification("error", "Failed to save note. Please try again.");
  }
}

async function editNote(id) {
  const note = noteState.notes.find((n) => n.id == id);
  if (note) {
    showNoteForm(note);
  }
}

async function deleteNote(id) {
  if (!confirm("Are you sure you want to delete this note?")) return;
  try {
    await fetchJson(apiPath(`/api/notes/${id}`), {
      method: "DELETE",
    });
    await loadNotes(noteState.currentStatus);
    showNotification("success", "Note deleted successfully");
  } catch (error) {
    console.error("Failed to delete note:", error);
    showNotification("error", "Failed to delete note. Please try again.");
  }
}

function handleNoteClick(noteId) {
  noteState.selectedNoteId = noteId;
  renderNotes(); // Re-render to highlight selected note

  const note = noteState.notes.find((item) => item.id == noteId);
  openTasksModal(note);
  showLoadingState();
  fetchTasksByNote(noteId);
}

function taskMatchesNote(task, noteId) {
  if (!task) return false;
  if (task.note && task.note.id != null) {
    return task.note.id == noteId;
  }
  if (task.noteId != null) {
    return task.noteId == noteId;
  }
  if (task.note_id != null) {
    return task.note_id == noteId;
  }
  if (task.note && task.noteId != null) {
    return task.note.noteId == noteId;
  }
  return false;
}

function showAccessDenied(message = "Access Denied") {
  console.warn(`[RBAC] ${message}`);
  alert(
    `${message}. Your role does not have permission to perform this action.`,
  );
}

// Event listeners
document.addEventListener("DOMContentLoaded", async () => {
  await loadProfile();
  await loadDepartments();
  await loadNotes();

  if (canManageTaskCollaborators()) {
    await loadUsers();
  }

  if (noteElements.tasksModalList) {
    noteElements.tasksModalList.addEventListener("click", handleTaskModalClick);
  }

  // Sign out
  if (noteElements.signoutBtn) {
    noteElements.signoutBtn.addEventListener("click", () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.location.replace("/index.html");
    });
  }

  // Toggle form
  if (noteElements.toggleNoteForm) {
    if (!canCreateNote()) {
      noteElements.toggleNoteForm.classList.add("hidden");
    } else {
      noteElements.toggleNoteForm.addEventListener("click", () =>
        showNoteForm(),
      );
    }
  }

  // Cancel form
  if (noteElements.cancelNoteForm) {
    noteElements.cancelNoteForm.addEventListener("click", hideNoteForm);
  }

  // Form submit
  if (noteElements.noteForm) {
    noteElements.noteForm.addEventListener("submit", saveNote);
  }

  // Refresh
  if (noteElements.notesRefresh) {
    noteElements.notesRefresh.addEventListener("click", loadNotes);
  }

  // Filter tabs
  if (noteElements.filterTabs) {
    noteElements.filterTabs.addEventListener("click", (event) => {
      const tab = event.target.closest(".filter-tab");
      if (tab) {
        const status = tab.dataset.status;
        loadNotes(status);
      }
    });
  }

  // Tasks modal close button
  if (noteElements.closeTasksModal) {
    noteElements.closeTasksModal.addEventListener("click", closeTasksModal);
  }

  if (noteElements.tasksModal) {
    noteElements.tasksModal.addEventListener("click", (event) => {
      if (event.target === noteElements.tasksModal) {
        closeTasksModal();
      }
    });
  }

  // Settings modal sign out handler
  const signoutModalBtn = document.getElementById("signout-modal-btn");
  if (signoutModalBtn) {
    signoutModalBtn.addEventListener("click", () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.location.replace("/index.html");
    });
  }
});
