const taskElements = {
  sidebarUsername: document.getElementById("sidebar-username"),
  signoutBtn: document.getElementById("signout-btn"),
  newTaskBtn: document.getElementById("new-task-btn"),
  tasksCount: document.getElementById("tasks-count"),
  tasksTableBody: document.getElementById("tasks-table-body"),
  tasksListError: document.getElementById("tasks-list-error"),
  taskForm: document.getElementById("task-form"),
  taskFormModal: document.getElementById("task-form-modal"),
  taskFormModalTitle: document.getElementById("task-form-modal-title"),
  taskFormSubmit: document.getElementById("task-form-submit"),
  taskFormError: document.getElementById("task-form-error"),
  cancelTaskForm: document.getElementById("cancel-task-form"),
  closeTaskFormModal: document.getElementById("close-task-form-modal"),
  taskViewModal: document.getElementById("task-view-modal"),
  taskViewModalTitle: document.getElementById("task-view-modal-title"),
  closeTaskViewModal: document.getElementById("close-task-view-modal"),
  taskViewEditBtn: document.getElementById("task-view-edit-btn"),
  taskViewDeleteBtn: document.getElementById("task-view-delete-btn"),
  noteSelect: document.getElementById("task-note-select"),
  assignSelect: document.getElementById("task-assign-select"),
  detailBody: document.getElementById("task-detail-body"),
  detailError: document.getElementById("task-detail-error"),
  statusFilter: document.getElementById("status-filter"),
  loadingIndicator: document.getElementById("tasks-loading-indicator"),
};

const MAX_USER_LIST_PAGES = 500;

const taskState = {
  tasks: [],
  notes: [],
  users: [],
  profile: null,
  editingTaskId: null,
  viewingTaskId: null,
  selectedStatus: localStorage.getItem("selectedTaskStatus") || "All",
  isLoading: false,
};

/**
 * RBAC Helpers for Tasks Module
 */
function getCurrentUserRole() {
  if (typeof getCurrentRole === "function") {
    return getCurrentRole();
  }
  // Fallback if RBAC not loaded
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.roleName || user.role || "Employee";
  } catch {
    return "Employee";
  }
}

function getCurrentUserId() {
  if (typeof getCurrentUser === "function") {
    const user = getCurrentUser();
    return user?.id;
  }
  // Fallback
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Filter tasks based on user role
 * - Admin: sees all tasks
 * - Manager: sees tasks assigned to users in their department
 * - Employee: sees only tasks assigned to them
 */
function filterTasksByRole(tasks) {
  // Use the global RBAC function if available
  if (typeof filterItemsByRole === "function") {
    return filterItemsByRole(tasks, "assignedTo", taskState.users);
  }
  // Fallback to local logic
  const role = getCurrentUserRole();
  const userId = getCurrentUserId();

  if (role === "Employee" && userId) {
    return tasks.filter((task) => {
      const assignedId = task.assignedToUser?.id ?? task.assignedTo;
      const isAssigned = assignedId == userId;
      const isCollaborator = Array.isArray(task.collaborators)
        ? task.collaborators.some(
            (collab) => String(collab.id ?? collab.userId) === String(userId),
          )
        : false;
      return isAssigned || isCollaborator;
    });
  }

  // Admins and Managers see all tasks (fallback)
  return tasks;
}

/**
 * Check if current user can perform action on task
 */
function canEditTask(task) {
  const role = getCurrentUserRole();
  const userId = getCurrentUserId();

  if (role === "Admin" || role === "Manager") return true;
  if (role === "Employee") {
    // Employees can edit their own tasks (only status will be editable)
    const assignedId = task?.assignedToUser?.id ?? task?.assignedTo;
    return assignedId == userId;
  }
  return false;
}

function canDeleteTask(task) {
  const role = getCurrentUserRole();
  return role === "Admin" || role === "Manager";
}

function canUpdateTaskStatus(task) {
  const role = getCurrentUserRole();
  const userId = getCurrentUserId();

  if (role === "Admin" || role === "Manager") return true;
  if (role === "Employee") {
    // Employee can only update status of tasks assigned to them
    const assignedId = task?.assignedToUser?.id ?? task?.assignedTo;
    return assignedId == userId;
  }
  return false;
}

function canApproveTask(task) {
  const role = getCurrentUserRole();
  // Only Admin or Manager can approve tasks
  return role === "Admin" || role === "Manager";
}

function canRejectTask(task) {
  const role = getCurrentUserRole();
  // Only Admin or Manager can reject tasks
  return role === "Admin" || role === "Manager";
}

function canSubmitForApproval(task) {
  const role = getCurrentUserRole();
  const userId = getCurrentUserId();

  if (role !== "Employee") return false;

  // Employee can only submit their own tasks
  const assignedId = task?.assignedToUser?.id ?? task?.assignedTo;
  return assignedId == userId;
}

function isAdminOrManager() {
  const role = getCurrentUserRole();
  return role === "Admin" || role === "Manager";
}

function canManageCollaborators() {
  return isAdminOrManager();
}

function getCollaboratorUserIds(task) {
  if (!task || !Array.isArray(task.collaborators)) return [];
  return task.collaborators
    .map((collab) => String(collab.id ?? collab.userId))
    .filter(Boolean);
}

function isTaskCollaborator(task, userId) {
  const ids = getCollaboratorUserIds(task);
  return ids.includes(String(userId));
}

function getUserLabel(user) {
  if (!user) return "Unknown user";
  return escapeHtml(
    user.nickname || user.name || user.email || `User ${user.id}`,
  );
}

/**
 * Task Status Utilities
 */
function humanizeStatus(key) {
  if (!key) return "";
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getStatusStyle(status) {
  const styles = {
    to_do:
      "background-color: rgba(107, 114, 128, 0.1); color: #374151; border: 1px solid rgba(107, 114, 128, 0.2);",
    in_progress:
      "background-color: rgba(59, 130, 246, 0.1); color: #1d4ed8; border: 1px solid rgba(59, 130, 246, 0.2);",
    pending_approval:
      "background-color: rgba(251, 146, 60, 0.1); color: #c2410c; border: 1px solid rgba(251, 146, 60, 0.2);",
    completed:
      "background-color: rgba(34, 197, 94, 0.1); color: #15803d; border: 1px solid rgba(34, 197, 94, 0.2);",
    rejected:
      "background-color: rgba(239, 68, 68, 0.1); color: #b91c1c; border: 1px solid rgba(239, 68, 68, 0.2);",
    cancelled:
      "background-color: rgba(239, 68, 68, 0.1); color: #b91c1c; border: 1px solid rgba(239, 68, 68, 0.2);",
    All: "background-color: #f3f4f6; color: #1f2937; border: 1px solid #d1d5db;",
  };
  return styles[status] || styles.to_do;
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === "completed") return false;
  const now = new Date();
  const due = new Date(dueDate);
  return due < now;
}

/**
 * Apply role-based button visibility to task row
 */
function applyTaskRowPermissions(tr, task) {
  const editBtn = tr.querySelector('[data-action="edit-task"]');
  const deleteBtn = tr.querySelector('[data-action="delete-task"]');

  const role = getCurrentUserRole();
  const taskStatus = task?.taskStatus ?? "to_do";

  // Disable editing when task is pending approval
  let canEdit = false;
  if (taskStatus === "pending_approval") {
    canEdit = false;
  } else {
    canEdit =
      role === "Admin" || role === "Manager" || (role === "Employee" && false); // Employees edit via dropdown
  }

  const canDelete = role === "Admin" || role === "Manager";

  if (editBtn) {
    if (role === "Employee") {
      editBtn.style.display = "none";
    } else {
      editBtn.disabled = !canEdit;
      editBtn.classList.toggle("disabled", !canEdit);
      if (!canEdit) {
        if (taskStatus === "pending_approval") {
          editBtn.title = "Cannot edit task while pending approval";
        } else {
          editBtn.title = "You don't have permission to edit this task";
        }
      }
    }
  }

  if (deleteBtn) {
    if (role === "Employee") {
      deleteBtn.style.display = "none";
    } else {
      deleteBtn.disabled = !canDelete;
      deleteBtn.classList.toggle("disabled", !canDelete);
      if (!canDelete) {
        deleteBtn.title = "You don't have permission to delete this task";
      }
    }
  }
}

/**
 * Apply role-based form field visibility
 */
function applyTaskFormPermissions(task = null) {
  const role = getCurrentUserRole();
  const taskForm = taskElements.taskForm;
  if (!taskForm) return;

  // Get the current task being edited if not provided
  if (!task && taskState.editingTaskId) {
    task = findTaskInList(taskState.editingTaskId);
  }

  // Get form fields
  const nameField = taskForm.querySelector('[name="taskName"]');
  const descField = taskForm.querySelector('[name="description"]');
  const noteField = taskForm.querySelector('[name="noteId"]');
  const assignField = taskForm.querySelector('[name="assignedTo"]');
  const statusField = taskForm.querySelector('[name="taskStatus"]');
  const dueField = taskForm.querySelector('[name="dueDate"]');

  // Check if task is pending approval - disable all editing
  const taskStatus = task?.taskStatus ?? "to_do";
  if (taskStatus === "pending_approval") {
    if (nameField) nameField.disabled = true;
    if (descField) descField.disabled = true;
    if (noteField) noteField.disabled = true;
    if (assignField) assignField.disabled = true;
    if (statusField) statusField.disabled = true;
    if (dueField) dueField.disabled = true;

    // Hide fields visually
    if (nameField?.parentElement)
      nameField.parentElement.parentElement.classList.add("hidden");
    if (descField?.parentElement)
      descField.parentElement.parentElement.classList.add("hidden");
    if (noteField?.parentElement)
      noteField.parentElement.parentElement.classList.add("hidden");
    if (assignField?.parentElement)
      assignField.parentElement.parentElement.classList.add("hidden");
    if (dueField?.parentElement)
      dueField.parentElement.parentElement.classList.add("hidden");

    return;
  }

  if (role === "Employee") {
    // Employees can only see and modify task status
    if (nameField) nameField.disabled = true;
    if (descField) descField.disabled = true;
    if (noteField) noteField.disabled = true;
    if (assignField) assignField.disabled = true;
    if (dueField) dueField.disabled = true;
    if (statusField) statusField.disabled = false; // Allow status change

    // Hide fields visually for employees
    if (nameField?.parentElement)
      nameField.parentElement.parentElement.classList.add("hidden");
    if (descField?.parentElement)
      descField.parentElement.parentElement.classList.add("hidden");
    if (noteField?.parentElement)
      noteField.parentElement.parentElement.classList.add("hidden");
    if (assignField?.parentElement)
      assignField.parentElement.parentElement.classList.add("hidden");
    if (dueField?.parentElement)
      dueField.parentElement.parentElement.classList.add("hidden");
  }
}

/**
 * Check if user can create new task
 */
function canCreateTask() {
  const role = getCurrentUserRole();
  return role === "Admin" || role === "Manager";
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

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

function noteLabel(note) {
  if (!note) return "";
  const title =
    note.noteName ||
    note.title ||
    note.noteTitle ||
    note.subject ||
    (note.content ? String(note.content).slice(0, 48) : "");
  const trimmed = title && String(title).trim();
  return trimmed
    ? `${trimmed}${String(title).length > 48 ? "…" : ""}`
    : `Note #${note.id}`;
}

function apiDateToDatetimeLocal(value) {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/);
  if (m) {
    return `${m[1]}T${m[2]}:${m[3]}`;
  }
  const dOnly = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dOnly) {
    return `${dOnly[1]}T00:00`;
  }
  return "";
}

function datetimeLocalToApi(value) {
  if (value == null || String(value).trim() === "") return null;
  const s = String(value);
  if (!s.includes("T")) {
    return `${s} 00:00:00`;
  }
  const [date, timePart] = s.split("T");
  const [hh = "00", mm = "00"] = (timePart || "").split(":");
  return `${date} ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
}

function updateSidebarUser(profile) {
  if (!taskElements.sidebarUsername) return;
  taskElements.sidebarUsername.textContent = profile?.nickname || "User";
}

function setSidebarActiveState() {
  const currentPath = window.location.pathname;
  const links = [
    ["sidebar-dashboard", "dashboard.html"],
    ["sidebar-departments", "department.html"],
    ["sidebar-users", "users.html"],
    ["sidebar-notes", "notes.html"],
    ["sidebar-tasks-link", "tasks.html"],
    ["sidebar-audit", "audit.html"],
    ["sidebar-settings", "settings.html"],
  ];
  links.forEach(([id]) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("active");
  });
  const match = links.find(([, fragment]) => currentPath.includes(fragment));
  if (match) {
    const el = document.getElementById(match[0]);
    if (el) el.classList.add("active");
  } else if (
    currentPath.includes("dashboard.html") ||
    currentPath.endsWith("/")
  ) {
    const el = document.getElementById("sidebar-dashboard");
    if (el) el.classList.add("active");
  }
}

if (taskElements.signoutBtn) {
  taskElements.signoutBtn.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    window.location.replace("/index.html");
  });
}

function setInlineError(el, message) {
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.hidden = false;
  } else {
    el.textContent = "";
    el.hidden = true;
  }
}

function renderNoteOptions() {
  if (!taskElements.noteSelect) return;
  const current = taskElements.noteSelect.value;
  taskElements.noteSelect.innerHTML = '<option value="">— None —</option>';
  taskState.notes.forEach((note) => {
    if (!note || note.id == null) return;
    const opt = document.createElement("option");
    opt.value = String(note.id);
    opt.textContent = noteLabel(note) || `Note ${note.id}`;
    taskElements.noteSelect.appendChild(opt);
  });
  if (
    current &&
    ![...taskElements.noteSelect.options].some((o) => o.value === current)
  ) {
    const opt = document.createElement("option");
    opt.value = current;
    opt.textContent = `Note ${current}`;
    taskElements.noteSelect.appendChild(opt);
  }
  if (
    current &&
    [...taskElements.noteSelect.options].some((o) => o.value === current)
  ) {
    taskElements.noteSelect.value = current;
  }
}

function renderAssignOptions() {
  if (!taskElements.assignSelect) return;
  const current = taskElements.assignSelect.value;
  taskElements.assignSelect.innerHTML =
    '<option value="">— Unassigned —</option>';
  taskState.users.forEach((user) => {
    if (!user || user.id == null) return;
    const opt = document.createElement("option");
    opt.value = String(user.id);
    const label = user.nickname || user.email || `User ${user.id}`;
    opt.textContent = label;
    taskElements.assignSelect.appendChild(opt);
  });
  if (
    current &&
    ![...taskElements.assignSelect.options].some((o) => o.value === current)
  ) {
    const opt = document.createElement("option");
    opt.value = current;
    opt.textContent = `User ${current}`;
    taskElements.assignSelect.appendChild(opt);
  }
  if (
    current &&
    [...taskElements.assignSelect.options].some((o) => o.value === current)
  ) {
    taskElements.assignSelect.value = current;
  }
}

function showModal(el) {
  if (el) el.classList.remove("hidden");
}

function hideModal(el) {
  if (el) el.classList.add("hidden");
}

function showAccessDenied(message = "Access Denied") {
  console.warn(`[RBAC] ${message}`);
  alert(
    `${message}. Your role does not have permission to perform this action.`,
  );
}

function closeTaskViewModal() {
  taskState.viewingTaskId = null;
  hideModal(taskElements.taskViewModal);
  setInlineError(taskElements.detailError, "");
  if (taskElements.detailBody) taskElements.detailBody.innerHTML = "";
}

function closeTaskFormModal() {
  taskState.editingTaskId = null;
  hideModal(taskElements.taskFormModal);
  setInlineError(taskElements.taskFormError, "");
  if (taskElements.taskForm) {
    taskElements.taskForm.reset();
    const status = taskElements.taskForm.querySelector('[name="taskStatus"]');
    if (status) status.value = "to_do";
  }
}

function resetFormForCreate() {
  if (!taskElements.taskForm) return;
  taskElements.taskForm.reset();
  const status = taskElements.taskForm.querySelector('[name="taskStatus"]');
  if (status) status.value = "to_do";
  setInlineError(taskElements.taskFormError, "");
}

function openCreateTaskModal() {
  // Check if user can create tasks
  if (!canCreateTask()) {
    showAccessDenied("You don't have permission to create tasks");
    return;
  }

  closeTaskViewModal();
  taskState.editingTaskId = null;
  resetFormForCreate();
  if (taskElements.taskFormModalTitle)
    taskElements.taskFormModalTitle.textContent = "Create task";
  if (taskElements.taskFormSubmit)
    taskElements.taskFormSubmit.textContent = "Save task";
  showModal(taskElements.taskFormModal);
  applyTaskFormPermissions();
}

function applyFormFromTask(task) {
  if (!taskElements.taskForm || !task) return;
  const currentNoteId =
    (task.note?.id ?? task.noteId != null)
      ? (task.noteId?.id ?? task.noteId)
      : "";
  const currentAssignedTo =
    (task.assignedToUser?.id ?? task.assignedTo != null)
      ? (task.assignedTo?.id ?? task.assignedTo)
      : "";
  taskElements.taskForm.taskName.value = task.taskName ?? "";
  taskElements.taskForm.description.value = task.description ?? "";
  taskElements.taskForm.noteId.value =
    currentNoteId !== "" ? String(currentNoteId) : "";
  taskElements.taskForm.assignedTo.value =
    currentAssignedTo !== "" ? String(currentAssignedTo) : "";
  const status = task.taskStatus ?? "to_do";
  const statusEl = taskElements.taskForm.querySelector('[name="taskStatus"]');
  if (statusEl) {
    const allowed = [...statusEl.options].map((o) => o.value);
    statusEl.value = allowed.includes(status)
      ? status
      : statusEl.options[0]?.value || "to_do";
    statusEl.setAttribute("style", getStatusStyle(statusEl.value));
  }
  const due = taskElements.taskForm.querySelector('[name="dueDate"]');
  if (due) {
    due.value = apiDateToDatetimeLocal(task.dueDate);
  }
}

async function openEditTaskModal(id) {
  closeTaskViewModal();

  // Check if user can edit tasks
  if (!canEditTask()) {
    showAccessDenied("You don't have permission to edit tasks");
    return;
  }

  // Check if task is pending approval - prevent editing
  const cachedTask = findTaskInList(id);
  if (cachedTask?.taskStatus === "pending_approval") {
    showAccessDenied("Cannot edit task while pending approval");
    return;
  }

  taskState.editingTaskId = id;
  resetFormForCreate();
  if (taskElements.taskFormModalTitle)
    taskElements.taskFormModalTitle.textContent = "Edit task";
  if (taskElements.taskFormSubmit)
    taskElements.taskFormSubmit.textContent = "Update task";
  showModal(taskElements.taskFormModal);

  const cached = findTaskInList(id);
  if (cached) {
    applyFormFromTask(cached);
  }

  try {
    const task = await fetchJson(apiPath(`/api/tasks/${id}`));
    if (task) {
      // Double-check pending approval status from fresh data
      if (task.taskStatus === "pending_approval") {
        closeTaskFormModal();
        showAccessDenied("Cannot edit task while pending approval");
        return;
      }

      applyFormFromTask(task);
      const idx = taskState.tasks.findIndex((t) => String(t.id) === String(id));
      if (idx >= 0) {
        taskState.tasks[idx] = { ...taskState.tasks[idx], ...task };
      }
    }
  } catch (error) {
    console.error("Unable to load task for edit:", error);
    setInlineError(
      taskElements.taskFormError,
      error.message || "Unable to load task.",
    );
  }

  applyTaskFormPermissions();
}

function renderTaskDetail(task) {
  if (!taskElements.taskViewModalTitle || !taskElements.detailBody) return;
  taskElements.taskViewModalTitle.textContent =
    task.taskName || `Task #${task.id}`;
  const collabs = Array.isArray(task.collaborators) ? task.collaborators : [];
  const canManage = canManageCollaborators();
  const assignedToId = String(task.assignedToUser?.id ?? task.assignedTo ?? "");

  const collabHtml =
    collabs.length === 0
      ? '<p class="meta-text">No collaborators yet.</p>'
      : `<ul class="task-collab-list">${collabs
          .map((c) => {
            const userId = String(c.id ?? c.userId ?? "");
            const isAssigned = assignedToId && userId === assignedToId;
            const name = getUserLabel(c);
            const email =
              c.email && c.nickname ? ` (${escapeHtml(c.email)})` : "";
            const badge = isAssigned ? "Assigned" : "Collaborator";
            return `
              <li class="task-collab-item">
                <div class="task-collab-summary">
                  <span class="task-collab-avatar">${escapeHtml(
                    String(name)
                      .trim()
                      .split(" ")
                      .map((part) => part[0] || "")
                      .slice(0, 2)
                      .join("")
                      .toUpperCase(),
                  )}</span>
                  <div>
                    <p class="task-collab-name">${name}${email}</p>
                    <span class="collab-badge">${badge}</span>
                  </div>
                </div>
                ${canManage ? `<button type="button" class="ghost-button task-collab-remove" data-action="remove-collaborator" data-user-id="${escapeHtml(userId)}">Remove</button>` : ""}
              </li>`;
          })
          .join("")}</ul>`;

  const detailNoteDisplay =
    task.note?.noteName ?? task.note?.id ?? task.noteId ?? null;
  const detailAssignedTo =
    task.assignedToUser?.nickname ??
    task.assignedToUser?.id ??
    task.assignedTo ??
    null;

  // Create status badge HTML
  const taskStatus = task.taskStatus ?? "to_do";
  const statusBadgeClass = `status-badge status-badge-${taskStatus}`;
  const statusDisplayText = humanizeStatus(taskStatus);
  const statusStyle = getStatusStyle(taskStatus);

  const collaboratorControls = canManage
    ? `
      <div class="task-collab-controls">
        <label>
          Search users
          <input type="search" id="collaborator-search" placeholder="Search users by name or email" autocomplete="off" />
        </label>
        <label>
          Select user
          <select id="collaborator-user-select">
            <option value="">Select collaborator</option>
          </select>
        </label>
        <button type="button" id="add-collaborator-btn" class="secondary-button">Add collaborator</button>
      </div>
    `
    : "";

  taskElements.detailBody.innerHTML = `
    <div class="task-collab-section">
      <dl class="task-detail-dl">
        <dt>ID</dt><dd>${escapeHtml(task.id)}</dd>
        <dt>Name</dt><dd>${escapeHtml(task.taskName ?? "—")}</dd>
        <dt>Description</dt><dd>${escapeHtml(task.description ?? "—")}</dd>
        <dt>Status</dt><dd><span class="${statusBadgeClass}" style="${statusStyle}">${statusDisplayText}</span></dd>
        <dt>Due</dt><dd>${escapeHtml(task.dueDate ?? "—")}</dd>
        <dt>Note</dt><dd>${escapeHtml(detailNoteDisplay ?? "—")}</dd>
        <dt>Created by</dt><dd>${escapeHtml(task.createdByUser?.nickname ?? task.createdBy ?? "—")}</dd>
        <dt>Assigned to</dt><dd>${escapeHtml(detailAssignedTo ?? "—")}</dd>
        <dt>Created</dt><dd class="department-table-meta">${escapeHtml(task.createdAt ?? "—")}</dd>
        <dt>Updated</dt><dd class="department-table-meta">${escapeHtml(task.updatedAt ?? "—")}</dd>
        <dt>Collaborators</dt><dd>${collabHtml}</dd>
      </dl>
      ${collaboratorControls}
    </div>
  `;

  // Update approval action buttons based on task status and user role
  updateApprovalButtons(task);

  if (canManage) {
    populateCollaboratorSelect(task, "");
  }
}

function updateApprovalButtons(task) {
  const approvalActionsContainer = document.getElementById(
    "task-approval-actions",
  );
  if (!approvalActionsContainer) return;

  const taskStatus = task?.taskStatus ?? "to_do";
  const taskId = task?.id;
  const role = getCurrentUserRole();
  const userId = getCurrentUserId();

  // Clear the container first
  approvalActionsContainer.innerHTML = "";
  approvalActionsContainer.classList.add("hidden");

  // Check if user is employee and task is in to_do or in_progress
  if (role === "Employee") {
    const assignedId = task?.assignedToUser?.id ?? task?.assignedTo;
    if (assignedId == userId) {
      if (taskStatus === "to_do") {
        approvalActionsContainer.innerHTML = `
          <button type="button" class="approval-button" style="${getStatusStyle("in_progress")}" data-action="set-in-progress" data-task-id="${taskId}">
            Set In Progress
          </button>
        `;
        approvalActionsContainer.classList.remove("hidden");
      } else if (taskStatus === "in_progress") {
        approvalActionsContainer.innerHTML = `
          <button type="button" class="approval-button approval-button-for-approval" data-action="submit-for-approval" data-task-id="${taskId}">
            Submit for Approval
          </button>
        `;
        approvalActionsContainer.classList.remove("hidden");
      }
    }
  }

  // Check if user is admin or manager and task is pending approval
  if (
    (role === "Admin" || role === "Manager") &&
    taskStatus === "pending_approval"
  ) {
    approvalActionsContainer.innerHTML = `
      <button type="button" class="approval-button approval-button-approve" data-action="approve-task" data-task-id="${taskId}">
        ✓ Approve
      </button>
      <span class="approval-status-separator"></span>
      <button type="button" class="approval-button approval-button-reject" data-action="reject-task" data-task-id="${taskId}">
        ✕ Reject
      </button>
    `;
    approvalActionsContainer.classList.remove("hidden");
  }
}

function findTaskInList(id) {
  return taskState.tasks.find((t) => String(t.id) === String(id));
}

async function loadTaskCollaborators(taskId) {
  try {
    const data = await fetchJson(apiPath(`/api/tasks/${taskId}/collaborators`));
    const collaborators = Array.isArray(data) ? data : [];
    return collaborators;
  } catch (error) {
    console.warn("Unable to load task collaborators:", error);
    return [];
  }
}

function filterUserCandidates(task, searchTerm = "") {
  const excludedIds = new Set(getCollaboratorUserIds(task));
  const normalized = String(searchTerm).trim().toLowerCase();
  return taskState.users
    .filter((user) => user && user.id != null)
    .filter((user) => !excludedIds.has(String(user.id)))
    .filter((user) => {
      if (!normalized) return true;
      const value =
        `${user.nickname || ""} ${user.name || ""} ${user.email || ""}`.toLowerCase();
      return value.includes(normalized);
    });
}

function populateCollaboratorSelect(task, searchTerm = "") {
  const select = taskElements.detailBody?.querySelector(
    "#collaborator-user-select",
  );
  if (!select || !task) return;
  const candidates = filterUserCandidates(task, searchTerm);
  select.innerHTML = `<option value="">Select collaborator</option>`;
  if (!candidates.length) {
    select.innerHTML += `<option value="" disabled>No users available</option>`;
    return;
  }
  candidates.forEach((user) => {
    const option = document.createElement("option");
    option.value = String(user.id);
    option.textContent = getUserLabel(user);
    select.appendChild(option);
  });
}

async function addTaskCollaborator(taskId, userId) {
  if (!userId) return;
  try {
    await fetchJson(apiPath(`/api/tasks/${taskId}/collaborators`), {
      method: "POST",
      body: JSON.stringify({ userId: Number(userId) }),
    });
    return true;
  } catch (error) {
    console.error("Unable to add collaborator:", error);
    setInlineError(
      taskElements.detailError,
      error.message || "Unable to add collaborator.",
    );
    return false;
  }
}

async function removeTaskCollaborator(taskId, userId) {
  if (!userId) return false;
  try {
    await fetchJson(apiPath(`/api/tasks/${taskId}/collaborators/${userId}`), {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    console.error("Unable to remove collaborator:", error);
    setInlineError(
      taskElements.detailError,
      error.message || "Unable to remove collaborator.",
    );
    return false;
  }
}

function clearCollaboratorError() {
  setInlineError(taskElements.detailError, "");
}

async function refreshTaskCollaborators(task) {
  if (!task || task.id == null) return task;
  const collaborators = await loadTaskCollaborators(task.id);
  task.collaborators = collaborators;
  if (
    taskState.viewingTaskId &&
    String(taskState.viewingTaskId) === String(task.id)
  ) {
    renderTaskDetail(task);
  }
  return task;
}

function handleTaskDetailClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const taskId = taskState.viewingTaskId;
  if (!taskId) return;

  if (action === "remove-collaborator") {
    const userId = button.dataset.userId;
    if (!userId) return;
    if (!confirm("Remove this collaborator from the task?")) return;
    removeTaskCollaborator(taskId, userId).then((success) => {
      if (success) {
        const currentTask = findTaskInList(taskId) || { id: taskId };
        refreshTaskCollaborators(currentTask);
      }
    });
  }

  if (action === "add-collaborator") {
    const select = taskElements.detailBody?.querySelector(
      "#collaborator-user-select",
    );
    const selectedUserId = select?.value;
    if (!selectedUserId) {
      setInlineError(taskElements.detailError, "Select a user before adding.");
      return;
    }
    addTaskCollaborator(taskId, selectedUserId).then((success) => {
      if (success) {
        clearCollaboratorError();
        const currentTask = findTaskInList(taskId) || { id: taskId };
        refreshTaskCollaborators(currentTask);
      }
    });
  }

  if (action === "set-in-progress") {
    setTaskInProgress(taskId);
  }

  if (action === "submit-for-approval") {
    submitTaskForApproval(taskId);
  }

  if (action === "approve-task") {
    approveTask(taskId);
  }

  if (action === "reject-task") {
    rejectTask(taskId);
  }
}

function handleTaskDetailInput(event) {
  if (event.target?.id !== "collaborator-search") return;
  const searchTerm = event.target.value || "";
  const task = findTaskInList(taskState.viewingTaskId);
  if (!task) return;
  populateCollaboratorSelect(task, searchTerm);
}

function handleApprovalActionsClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const taskId = button.dataset.taskId;
  if (!taskId) return;

  if (action === "set-in-progress") {
    setTaskInProgress(taskId);
  } else if (action === "submit-for-approval") {
    submitTaskForApproval(taskId);
  } else if (action === "approve-task") {
    approveTask(taskId);
  } else if (action === "reject-task") {
    rejectTask(taskId);
  }
}

function renderSkeletons() {
  if (!taskElements.tasksTableBody) return;
  taskElements.tasksTableBody.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><div class="skeleton skeleton-text" style="width: 30px"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 150px"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 80px"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 100px"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 120px"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 100px"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 100px"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 120px"></div></td>
    `;
    taskElements.tasksTableBody.appendChild(tr);
  }
}

function initFilterUI() {
  if (!taskElements.statusFilter) return;

  // Set initial value from state
  taskElements.statusFilter.value = taskState.selectedStatus;
  taskElements.statusFilter.setAttribute(
    "style",
    getStatusStyle(taskState.selectedStatus),
  );

  taskElements.statusFilter.addEventListener("change", (e) => {
    if (taskState.isLoading) return;

    const status = e.target.value;
    taskState.selectedStatus = status;
    localStorage.setItem("selectedTaskStatus", status);

    // Update style immediately
    e.target.setAttribute("style", getStatusStyle(status));

    loadTasks(status);
  });
}

function renderTasks() {
  if (!taskElements.tasksTableBody) return;
  taskElements.tasksTableBody.innerHTML = "";

  // Apply role-based filtering (additional client-side check if needed)
  const role = getCurrentUserRole();
  let rows = taskState.tasks;

  rows = rows.filter(
    (t) => t && (t.deletedAt === null || t.deletedAt === undefined),
  );
  rows.sort((a, b) => {
    const ua = String(a.updatedAt || a.createdAt || "");
    const ub = String(b.updatedAt || b.createdAt || "");
    return ub.localeCompare(ua);
  });

  if (!rows.length) {
    const statusLabel =
      taskState.selectedStatus === "All"
        ? ""
        : ` ${taskState.selectedStatus.toLowerCase()}`;
    taskElements.tasksTableBody.innerHTML = `
      <tr class="department-table-empty">
        <td colspan="8">
          <div class="tasks-empty-state">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 3h6a1 1 0 0 1 1 1v2H8V4a1 1 0 0 1 1-1z"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            <p>No${statusLabel} tasks found.</p>
          </div>
        </td>
      </tr>`;
    if (taskElements.tasksCount) taskElements.tasksCount.textContent = "0";
    return;
  }

  const fragment = document.createDocumentFragment();
  rows.forEach((task) => {
    const tr = document.createElement("tr");
    const id = escapeHtml(task.id);

    // Apply overdue highlighting
    if (isOverdue(task.dueDate, task.taskStatus)) {
      tr.classList.add("overdue-item");
    }

    const noteDisplay =
      task.note?.noteName ?? task.note?.id ?? task.noteId ?? "—";
    const assignedDisplay =
      task.assignedToUser?.nickname ??
      task.assignedToUser?.id ??
      task.assignedTo ??
      "—";
    // Render status differently for Employees: show submit/readonly controls
    const statusKey = (task.taskStatus || "to_do").toString();
    const statusStyle = getStatusStyle(statusKey);
    const statusDisplayText = humanizeStatus(statusKey);

    let statusDisplay = "";
    let actionsHtml = "";

    if (role === "Employee") {
      // Employee sees a read-only badge
      statusDisplay = `<span class="status-badge status-badge-${statusKey}" style="${statusStyle}">${statusDisplayText}</span>`;

      // Actions column for Employee
      actionsHtml = `
        <button type="button" class="secondary-button table-action-btn" data-action="view-task" data-id="${id}">View</button>
      `;

      if (statusKey === "to_do") {
        actionsHtml += `
          <button type="button" class="approval-button table-action-btn" style="${getStatusStyle("in_progress")}" data-action="set-in-progress" data-task-id="${id}" data-id="${id}">
            Set In Progress
          </button>`;
      } else if (statusKey === "in_progress") {
        actionsHtml += `
          <button type="button" class="approval-button approval-button-for-approval table-action-btn" data-action="submit-for-approval" data-task-id="${id}" data-id="${id}">
            Submit for Approval
          </button>`;
      }
    } else if (role === "Admin") {
      // Admins see a status dropdown with approval-related options
      const adminOptions = [
        "to_do",
        "in_progress",
        "pending_approval",
        "completed",
        "rejected",
        "cancelled",
      ];
      const optionsHtml = adminOptions
        .map(
          (opt) =>
            `<option value="${opt}" ${opt === statusKey ? "selected" : ""}>${humanizeStatus(opt)}</option>`,
        )
        .join("");
      statusDisplay = `<select class="status-select" data-task-id="${id}" style="${statusStyle}">${optionsHtml}</select>`;

      actionsHtml = `
        <button type="button" class="secondary-button table-action-btn" data-action="view-task" data-id="${id}">View</button>
        <button type="button" class="secondary-button table-action-btn" data-action="edit-task" data-id="${id}">Edit</button>
        <button type="button" class="ghost-button table-action-btn" data-action="delete-task" data-id="${id}">Delete</button>
      `;
    } else {
      // Other non-employee roles (e.g., Manager) see a readonly badge
      statusDisplay = `<span class="status-badge status-badge-${statusKey}" style="${statusStyle}">${statusDisplayText}</span>`;

      actionsHtml = `
        <button type="button" class="secondary-button table-action-btn" data-action="view-task" data-id="${id}">View</button>
        <button type="button" class="secondary-button table-action-btn" data-action="edit-task" data-id="${id}">Edit</button>
        <button type="button" class="ghost-button table-action-btn" data-action="delete-task" data-id="${id}">Delete</button>
      `;
    }

    tr.innerHTML = `
      <td>${id}</td>
      <td class="department-table-desc">${escapeHtml(task.taskName ?? "—")}</td>
      <td>${statusDisplay}</td>
      <td class="department-table-meta">${escapeHtml(task.dueDate ?? "—")}</td>
      <td>${escapeHtml(noteDisplay)}</td>
      <td>${escapeHtml(assignedDisplay)}</td>
      <td class="department-table-meta">${escapeHtml(task.updatedAt ?? "—")}</td>
      <td class="department-table-actions">
        <div class="table-actions-container">
          ${actionsHtml}
        </div>
      </td>
    `;

    // Apply role-based button permissions
    applyTaskRowPermissions(tr, task);

    fragment.appendChild(tr);
  });

  taskElements.tasksTableBody.appendChild(fragment);
  if (taskElements.tasksCount) {
    taskElements.tasksCount.textContent = String(rows.length);
  }
}

async function openViewTaskModal(id) {
  closeTaskFormModal();
  taskState.viewingTaskId = id;
  setInlineError(taskElements.detailError, "");
  if (taskElements.detailBody) {
    taskElements.detailBody.innerHTML = '<p class="meta-text">Loading…</p>';
  }
  if (taskElements.taskViewModalTitle) {
    taskElements.taskViewModalTitle.textContent = "Task";
  }
  showModal(taskElements.taskViewModal);

  const cached = findTaskInList(id);
  if (cached) {
    renderTaskDetail(cached);
  }

  try {
    const [task, collaborators] = await Promise.all([
      fetchJson(apiPath(`/api/tasks/${id}`)),
      loadTaskCollaborators(id),
    ]);

    if (!task) {
      throw new Error("Empty response for task.");
    }
    if (Array.isArray(collaborators)) {
      task.collaborators = collaborators;
    }
    renderTaskDetail(task);

    const idx = taskState.tasks.findIndex((t) => String(t.id) === String(id));
    if (idx >= 0) {
      taskState.tasks[idx] = { ...taskState.tasks[idx], ...task };
    }
  } catch (error) {
    console.error("Unable to load task:", error);
    setInlineError(
      taskElements.detailError,
      error.message || "Unable to load task details.",
    );
    if (cached) {
      // Keep previously rendered task while user inspects stale data
      renderTaskDetail(cached);
    }
  }
}

async function loadProfile() {
  try {
    const profile = await fetchJson(apiPath("/api/auth/me"));
    taskState.profile = profile;
    updateSidebarUser(profile);
    setSidebarActiveState();
    return profile;
  } catch (error) {
    console.error("Unable to load profile:", error);
    window.location.replace("/index.html");
  }
}

async function loadNotes() {
  try {
    const data = await fetchJson(apiPath("/api/notes"));
    const list = Array.isArray(data) ? data : [];
    // Filter notes by role
    const filtered = filterItemsByRole(list, "ownerId", taskState.users);
    taskState.notes = filtered.filter(
      (n) => n && (n.deletedAt === null || n.deletedAt === undefined),
    );
    renderNoteOptions();
  } catch (error) {
    console.error("Unable to load notes:", error);
    taskState.notes = [];
    renderNoteOptions();
  }
}

async function loadUsersForAssign() {
  try {
    const pageSize = 100;
    const aggregated = [];
    let page = 1;
    let totalPages = 1;

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
      if (!response.ok || !json || json.success === false) {
        throw new Error(
          (json && json.message) || `Users request failed (${response.status})`,
        );
      }
      const chunk = Array.isArray(json.data) ? json.data : [];
      aggregated.push(...chunk);
      const pag = json.pagination;
      if (pag && typeof pag === "object") {
        totalPages = Math.max(1, parseInt(pag.totalPages, 10) || 1);
      } else {
        totalPages = 1;
      }
      page += 1;
      if (page > MAX_USER_LIST_PAGES) break;
    } while (page <= totalPages);

    taskState.users = aggregated.filter(
      (u) => u && (u.deletedAt === null || u.deletedAt === undefined),
    );
    renderAssignOptions();
  } catch (error) {
    console.error("Unable to load users:", error);
    taskState.users = [];
    renderAssignOptions();
  }
}

async function loadTasks(status = taskState.selectedStatus) {
  setInlineError(taskElements.tasksListError, "");
  taskState.isLoading = true;

  if (taskElements.loadingIndicator) {
    taskElements.loadingIndicator.hidden = false;
  }

  renderSkeletons();

  try {
    const role = getCurrentUserRole();
    const endpoint = role === "Employee" ? "/api/tasks/my" : "/api/tasks";

    let url;
    if (status === "All") {
      url = apiPath(endpoint);
    } else {
      url = apiPath(`${endpoint}?status=${encodeURIComponent(status)}`);
    }

    const data = await fetchJson(url);
    const list = Array.isArray(data) ? data : [];
    taskState.tasks = list;

    renderTasks();
  } catch (error) {
    console.error("Unable to load tasks:", error);
    taskState.tasks = [];
    renderTasks();
    setInlineError(
      taskElements.tasksListError,
      error.message || "Unable to load tasks.",
    );
    if (typeof showNotification === "function") {
      showNotification("error", "Failed to load tasks. Please try again.");
    }
  } finally {
    taskState.isLoading = false;
    if (taskElements.loadingIndicator) {
      taskElements.loadingIndicator.hidden = true;
    }
  }
}

async function saveTask(event) {
  event.preventDefault();
  if (!taskElements.taskForm) return;

  const formData = new FormData(taskElements.taskForm);
  const taskName = (formData.get("taskName") || "").toString().trim();
  const description = (formData.get("description") || "").toString();
  const noteVal = formData.get("noteId");
  const assignVal = formData.get("assignedTo");
  const noteId =
    noteVal === null || String(noteVal).trim() === ""
      ? null
      : parseInt(String(noteVal), 10);
  const assignedTo =
    assignVal === null || String(assignVal).trim() === ""
      ? null
      : parseInt(String(assignVal), 10);
  const taskStatus = (formData.get("taskStatus") || "to_do").toString();
  const dueRaw = formData.get("dueDate");
  const dueDate = datetimeLocalToApi(dueRaw);

  if (!taskName) {
    setInlineError(taskElements.taskFormError, "Task name is required.");
    return;
  }

  const taskId = taskState.editingTaskId;
  const role = getCurrentUserRole();

  const basePayload = {
    taskName,
    description,
    taskStatus,
    ...(noteId != null ? { noteId } : {}),
    ...(assignedTo != null ? { assignedTo } : {}),
    ...(dueDate ? { dueDate } : {}),
  };

  let payload;

  if (role === "Employee") {
    // Employees can only update task status
    payload = { taskStatus };
  } else {
    // Admins and Managers can update all fields
    payload = basePayload;
  }

  setInlineError(taskElements.taskFormError, "");

  try {
    if (taskId) {
      await fetchJson(apiPath(`/api/tasks/${taskId}`), {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      const profileId = taskState.profile?.id;
      const fullPayload = {
        ...payload,
        ...(profileId != null ? { createdBy: profileId } : {}),
      };
      await fetchJson(apiPath("/api/tasks"), {
        method: "POST",
        body: JSON.stringify(fullPayload),
      });
    }
    await loadTasks();
    closeTaskFormModal();
    if (typeof showNotification === "function") {
      showNotification(
        "success",
        taskId ? "Task updated successfully" : "Task added successfully",
      );
    }
  } catch (error) {
    setInlineError(
      taskElements.taskFormError,
      error.message || "Unable to save task.",
    );
    if (typeof showNotification === "function") {
      showNotification("error", "Failed to save task. Please try again.");
    }
  }
}

async function updateTaskStatus(id, status) {
  try {
    let task = findTaskInList(id);
    if (!task) {
      task = await fetchJson(apiPath(`/api/tasks/${id}`));
    }

    const payload = {
      taskName: task?.taskName ?? "",
      description: task?.description ?? "",
      taskStatus: status,
      dueDate: task?.dueDate ?? "",
    };

    const assignedTo = task?.assignedToUser?.id ?? task?.assignedTo;
    if (assignedTo != null && assignedTo !== "") {
      payload.assignedTo = assignedTo;
    }

    await fetchJson(apiPath(`/api/tasks/${id}`), {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    // Update local state
    const localTask = findTaskInList(id);
    if (localTask) localTask.taskStatus = status;

    // Reload current list
    await loadTasks();

    if (typeof showNotification === "function") {
      showNotification("success", "Task status updated successfully");
    }
  } catch (error) {
    if (typeof showNotification === "function") {
      showNotification(
        "error",
        "Failed to update task status. Please try again.",
      );
    }
    // Revert select value
    const select = document.querySelector(
      `.status-select[data-task-id="${id}"]`,
    );
    if (select) {
      const task = findTaskInList(id);
      select.value = task?.taskStatus ?? "to_do";
    }
  }
}

async function setTaskInProgress(taskId) {
  if (!taskId) return;

  const button = document.querySelector(
    `[data-action="set-in-progress"][data-task-id="${taskId}"]`,
  );
  if (button) {
    button.disabled = true;
    button.classList.add("approval-loading");
  }

  try {
    const response = await fetchJson(apiPath(`/api/tasks/${taskId}`), {
      method: "PUT",
      body: JSON.stringify({ taskStatus: "in_progress" }),
    });

    // Update local state with response data
    const localTask = findTaskInList(taskId);
    if (localTask && response && response.taskStatus) {
      localTask.taskStatus = response.taskStatus;
    } else if (localTask) {
      localTask.taskStatus = "in_progress";
    }

    // Refresh the detail view if still viewing this task
    if (
      taskState.viewingTaskId &&
      String(taskState.viewingTaskId) === String(taskId)
    ) {
      await openViewTaskModal(taskId);
    }

    // Immediately update task list UI
    try {
      renderTasks();
    } catch (e) {
      // ignore render errors
    }

    if (typeof showNotification === "function") {
      showNotification("success", "Task set to In Progress successfully");
    }
  } catch (error) {
    if (typeof showNotification === "function") {
      showNotification(
        "error",
        error.message || "Failed to update task status",
      );
    }
    setInlineError(
      taskElements.detailError,
      error.message || "Failed to update task status",
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.classList.remove("approval-loading");
    }
  }
}

async function submitTaskForApproval(taskId) {
  if (!taskId) return;

  const button = document.querySelector(
    `[data-action="submit-for-approval"][data-task-id="${taskId}"]`,
  );
  if (button) {
    button.disabled = true;
    button.classList.add("approval-loading");
  }

  try {
    const response = await fetchJson(apiPath(`/api/tasks/${taskId}`), {
      method: "PUT",
      body: JSON.stringify({ taskStatus: "pending_approval" }),
    });

    // Update local state with response data
    const localTask = findTaskInList(taskId);
    if (localTask && response && response.taskStatus) {
      localTask.taskStatus = response.taskStatus;
    } else if (localTask) {
      localTask.taskStatus = "pending_approval";
    }

    // Refresh the detail view if still viewing this task
    if (
      taskState.viewingTaskId &&
      String(taskState.viewingTaskId) === String(taskId)
    ) {
      await openViewTaskModal(taskId);
    }

    // Immediately update task list UI
    try {
      renderTasks();
    } catch (e) {
      // ignore render errors
    }

    if (typeof showNotification === "function") {
      showNotification("success", "Task submitted for approval successfully");
    }
  } catch (error) {
    if (typeof showNotification === "function") {
      showNotification(
        "error",
        error.message || "Failed to submit task for approval",
      );
    }
    setInlineError(
      taskElements.detailError,
      error.message || "Failed to submit task for approval",
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.classList.remove("approval-loading");
    }
  }
}

async function approveTask(taskId) {
  if (!taskId) return;

  const button = document.querySelector(
    `[data-action="approve-task"][data-task-id="${taskId}"]`,
  );
  if (button) {
    button.disabled = true;
    button.classList.add("approval-loading");
  }

  try {
    const response = await fetchJson(apiPath(`/api/tasks/${taskId}`), {
      method: "PUT",
      body: JSON.stringify({ taskStatus: "completed" }),
    });

    // Update local state with response data
    const localTask = findTaskInList(taskId);
    if (localTask && response && response.taskStatus) {
      localTask.taskStatus = response.taskStatus;
    } else if (localTask) {
      localTask.taskStatus = "completed";
    }

    // Refresh the detail view if still viewing this task
    if (
      taskState.viewingTaskId &&
      String(taskState.viewingTaskId) === String(taskId)
    ) {
      await openViewTaskModal(taskId);
    }

    // Immediately update task list UI
    try {
      renderTasks();
    } catch (e) {
      // ignore render errors
    }
    if (typeof showNotification === "function") {
      showNotification("success", "Task approved successfully");
    }
  } catch (error) {
    if (typeof showNotification === "function") {
      showNotification("error", error.message || "Failed to approve task");
    }
    setInlineError(
      taskElements.detailError,
      error.message || "Failed to approve task",
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.classList.remove("approval-loading");
    }
  }
}

async function rejectTask(taskId) {
  if (!taskId) return;

  const button = document.querySelector(
    `[data-action="reject-task"][data-task-id="${taskId}"]`,
  );
  if (button) {
    button.disabled = true;
    button.classList.add("approval-loading");
  }

  try {
    const response = await fetchJson(apiPath(`/api/tasks/${taskId}`), {
      method: "PUT",
      body: JSON.stringify({ taskStatus: "rejected" }),
    });

    // Update local state with response data
    const localTask = findTaskInList(taskId);
    if (localTask && response && response.taskStatus) {
      localTask.taskStatus = response.taskStatus;
    } else if (localTask) {
      localTask.taskStatus = "rejected";
    }

    // Refresh the detail view if still viewing this task
    if (
      taskState.viewingTaskId &&
      String(taskState.viewingTaskId) === String(taskId)
    ) {
      await openViewTaskModal(taskId);
    }

    // Immediately update task list UI
    try {
      renderTasks();
    } catch (e) {
      // ignore render errors
    }
    if (typeof showNotification === "function") {
      showNotification("success", "Task rejected successfully");
    }
  } catch (error) {
    if (typeof showNotification === "function") {
      showNotification("error", error.message || "Failed to reject task");
    }
    setInlineError(
      taskElements.detailError,
      error.message || "Failed to reject task",
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.classList.remove("approval-loading");
    }
  }
}

function handleTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (!id) return;

  if (action === "view-task") {
    openViewTaskModal(id);
    return;
  }
  if (action === "edit-task") {
    openEditTaskModal(id);
    return;
  }
  if (action === "delete-task") {
    deleteTaskById(id);
  }
  // Inline approval actions from table rows
  if (action === "set-in-progress") {
    setTaskInProgress(id);
    return;
  }
  if (action === "submit-for-approval") {
    submitTaskForApproval(id);
    return;
  }
  if (action === "approve-task") {
    approveTask(id);
    return;
  }
  if (action === "reject-task") {
    rejectTask(id);
    return;
  }
}

function handleModalBackdropClick(event) {
  if (event.target === taskElements.taskViewModal) {
    closeTaskViewModal();
  }
  if (event.target === taskElements.taskFormModal) {
    closeTaskFormModal();
  }
}

async function deleteTaskById(id) {
  if (!id) return;
  if (!confirm("Are you sure you want to delete this task?")) return;

  try {
    await fetchJson(apiPath(`/api/tasks/${id}`), {
      method: "DELETE",
    });
    if (
      taskState.viewingTaskId &&
      String(taskState.viewingTaskId) === String(id)
    ) {
      closeTaskViewModal();
    }
    await loadTasks();
    if (typeof showNotification === "function") {
      showNotification("success", "Task deleted successfully");
    }
  } catch (error) {
    console.error("Failed to delete task:", error);
    if (typeof showNotification === "function") {
      showNotification("error", "Failed to delete task. Please try again.");
    }
  }
}

function registerEvents() {
  if (taskElements.newTaskBtn) {
    taskElements.newTaskBtn.addEventListener("click", openCreateTaskModal);
  }

  if (taskElements.taskForm) {
    taskElements.taskForm.addEventListener("submit", saveTask);
    const statusEl = taskElements.taskForm.querySelector('[name="taskStatus"]');
    if (statusEl) {
      statusEl.addEventListener("change", (e) => {
        e.target.setAttribute("style", getStatusStyle(e.target.value));
      });
    }
  }

  if (taskElements.cancelTaskForm) {
    taskElements.cancelTaskForm.addEventListener("click", (event) => {
      event.preventDefault();
      closeTaskFormModal();
    });
  }

  if (taskElements.closeTaskFormModal) {
    taskElements.closeTaskFormModal.addEventListener(
      "click",
      closeTaskFormModal,
    );
  }

  if (taskElements.closeTaskViewModal) {
    taskElements.closeTaskViewModal.addEventListener(
      "click",
      closeTaskViewModal,
    );
  }

  if (taskElements.taskViewDeleteBtn) {
    taskElements.taskViewDeleteBtn.addEventListener("click", () => {
      if (taskState.viewingTaskId) {
        deleteTaskById(taskState.viewingTaskId);
      }
    });
  }

  if (taskElements.taskViewEditBtn) {
    taskElements.taskViewEditBtn.addEventListener("click", () => {
      if (taskState.viewingTaskId) {
        openEditTaskModal(taskState.viewingTaskId);
      }
    });
  }

  if (taskElements.tasksTableBody) {
    taskElements.tasksTableBody.addEventListener("click", handleTableClick);
    taskElements.tasksTableBody.addEventListener("change", (event) => {
      const select = event.target.closest(".status-select");
      if (!select) return;
      const taskId = select.dataset.taskId;
      if (!taskId) return;

      // Update style immediately
      select.setAttribute("style", getStatusStyle(select.value));

      updateTaskStatus(taskId, select.value);
    });
  }

  if (taskElements.taskViewModal) {
    taskElements.taskViewModal.addEventListener(
      "click",
      handleModalBackdropClick,
    );
  }

  if (taskElements.taskFormModal) {
    taskElements.taskFormModal.addEventListener(
      "click",
      handleModalBackdropClick,
    );
  }

  if (taskElements.detailBody) {
    taskElements.detailBody.addEventListener("click", handleTaskDetailClick);
    taskElements.detailBody.addEventListener("input", handleTaskDetailInput);
  }

  // Add event listeners for approval actions
  const approvalActionsContainer = document.getElementById(
    "task-approval-actions",
  );
  if (approvalActionsContainer) {
    approvalActionsContainer.addEventListener(
      "click",
      handleApprovalActionsClick,
    );
  }

  initFilterUI();
}

async function initTasksPage() {
  registerEvents();
  await loadProfile();
  await Promise.all([loadNotes(), loadUsersForAssign()]);
  await loadTasks();
}

window.addEventListener("DOMContentLoaded", initTasksPage);

// Settings modal sign out handler
const signoutModalBtn = document.getElementById("signout-modal-btn");
if (signoutModalBtn) {
  signoutModalBtn.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    window.location.replace("/index.html");
  });
}
