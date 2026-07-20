const apiEndpoints = {
  profile: "/api/auth/me",
  stats: "/api/dashboard/stats",
  users: "/api/users",
  departments: "/api/departments",
  notes: "/api/notes",
  tasks: "/api/tasks",
  audit: "/api/audit-trails",
  logout: "/api/auth/logout",
  resetPassword: "/api/auth/reset-password",
};

function apiUrl(path) {
  if (
    typeof window !== "undefined" &&
    typeof window.itwmsApiPath === "function"
  ) {
    return window.itwmsApiPath(path);
  }
  return path.startsWith("/") ? path : `/${path}`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

const state = {
  profile: null,
  summary: {},
  stats: {
    overview: {
      tasks: { total: 0 },
      notes: { total: 0 },
    },
  },
  users: [],
  departments: [],
  notes: [],
  tasks: [],
  audit: [],
  editing: {
    userId: null,
    departmentId: null,
    noteId: null,
    taskId: null,
  },
};

const elements = {
  profileName: document.getElementById("nickname"),
  currentRole: document.getElementById("current-role"),
  sidebarUsername: document.getElementById("sidebar-username"),
  sidebarTasks: document.getElementById("sidebar-dashboard"),
  sidebarSettings: document.getElementById("sidebar-settings"),
  refreshButton: document.getElementById("dashboard-refresh"),
  signoutButton: document.getElementById("signout-btn"),
  // Stats elements
  statsGrid: document.getElementById("stats-grid"),
  refreshStatsButton: document.getElementById("refresh-stats"),
  // Settings modal elements
  settingsModal: document.getElementById("settings-modal"),
  closeSettingsModal: document.getElementById("close-settings-modal"),
  modalAccountName: document.getElementById("modal-account-name"),
  modalAccountEmail: document.getElementById("modal-account-email"),
  modalAccountRole: document.getElementById("modal-account-role"),
  modalAccountDepartment: document.getElementById("modal-account-department"),
  resetPasswordBtn: document.getElementById("reset-password-btn"),
  signoutModalBtn: document.getElementById("signout-modal-btn"),
  // Reset password modal elements
  resetModal: document.getElementById("reset-modal"),
  closeResetModal: document.getElementById("close-reset-modal"),
  resetPasswordForm: document.getElementById("reset-password-form"),
  cancelReset: document.getElementById("cancel-reset"),
  usersList: document.getElementById("users-list"),
  departmentsList: document.getElementById("department-list"),
  notesList: document.getElementById("notes-list"),
  tasksList: document.getElementById("tasks-list"),
  boardTitle: document.getElementById("board-title"),
  boardColumns: document.getElementById("board-columns"),
  auditList: document.getElementById("audit-list"),
  auditSearch: document.getElementById("audit-search"),
  toggleUserForm: document.getElementById("toggle-user-form"),
  toggleDepartmentForm: document.getElementById("toggle-department-form"),
  toggleNoteForm: document.getElementById("toggle-note-form"),
  toggleTaskForm: document.getElementById("toggle-task-form"),
  userFormModal: document.getElementById("user-form-modal"),
  departmentFormModal: document.getElementById("department-form-modal"),
  closeUserFormModal: document.getElementById("close-user-form-modal"),
  closeDeptFormModal: document.getElementById("close-dept-form-modal"),
  userFormTitle: document.getElementById("user-form-title"),
  deptFormTitle: document.getElementById("dept-form-title"),
  noteFormCard: document.getElementById("note-form-card"),
  taskFormCard: document.getElementById("task-form-card"),
  userForm: document.getElementById("user-form"),
  departmentForm: document.getElementById("department-form"),
  noteForm: document.getElementById("note-form"),
  taskForm: document.getElementById("task-form"),
  cancelUserForm: document.getElementById("cancel-user-form"),
  cancelDepartmentForm: document.getElementById("cancel-department-form"),
  cancelNoteForm: document.getElementById("cancel-note-form"),
  cancelTaskForm: document.getElementById("cancel-task-form"),
};

function setSummaryLabels(role) {
  // Summary cards removed - this function is kept for backward compatibility
}

function renderStatsSkeleton() {
  if (!elements.statsGrid) return;
  elements.statsGrid.innerHTML = `
    <div class="stat-skeleton">
      <div class="skeleton-icon"></div>
      <div class="skeleton-value"></div>
      <div class="skeleton-label"></div>
    </div>
    <div class="stat-skeleton">
      <div class="skeleton-icon"></div>
      <div class="skeleton-value"></div>
      <div class="skeleton-label"></div>
    </div>
    <div class="stat-skeleton">
      <div class="skeleton-icon"></div>
      <div class="skeleton-value"></div>
      <div class="skeleton-label"></div>
    </div>
    <div class="stat-skeleton">
      <div class="skeleton-icon"></div>
      <div class="skeleton-value"></div>
      <div class="skeleton-label"></div>
    </div>
  `;
}

function renderStatsError(error) {
  if (!elements.statsGrid) return;
  elements.statsGrid.innerHTML = `
    <div class="stats-error">
      <p>Failed to load statistics</p>
      <p style="font-size: 0.9rem; margin: 8px 0 0;">${error.message}</p>
    </div>
  `;
}

const DASHBOARD_ICONS = {
  users: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  departments: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m-1 4h1m4-4h1m-1 4h1"/></svg>',
  notes: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  tasks: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 3h6a1 1 0 0 1 1 1v2H8V4a1 1 0 0 1 1-1z"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
  audit: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
};

function getStatCard(iconKey, value, label, subtitle = "") {
  const safeValue = value !== undefined && value !== null ? value : "0";
  return `
    <article class="stat-card">
      <div class="stat-icon">${DASHBOARD_ICONS[iconKey] || ""}</div>
      <div class="stat-value">${safeValue}</div>
      <p class="stat-label">${label}</p>
      ${subtitle ? `<p class="stat-sublabel">${subtitle}</p>` : ""}
    </article>
  `;
}

function renderStats(stats) {
  if (!elements.statsGrid) return;

  const isAdmin = state.profile?.roleName === "Admin";
  const overview = stats.overview || {};
  const cards = [];

  const usersCount = overview.users ?? 0;
  cards.push(getStatCard("users", usersCount, isAdmin ? "Total Users" : "Department Users", isAdmin ? "Across all departments" : "In your department"));

  if (isAdmin) {
    const deptCount = overview.departments ?? 0;
    cards.push(getStatCard("departments", deptCount, "Departments", "Active departments"));
  }

  const notesTotal = overview.notes?.total ?? 0;
  const notesActive = overview.notes?.active ?? 0;
  const notesArchived = overview.notes?.archived ?? 0;
  cards.push(getStatCard("notes", notesTotal, "Notes", `${notesActive} active · ${notesArchived} archived`));

  const t = overview.tasks || {};
  cards.push(getStatCard("tasks", t.total ?? 0, "Tasks", `${t.to_do ?? 0} to do · ${t.pending_approval ?? 0} pending approval · ${t.in_progress ?? 0} in progress · ${t.completed ?? 0} completed · ${t.rejected ?? 0} rejected · ${t.cancelled ?? 0} cancelled`));

  if (isAdmin) {
    const auditCount = overview.auditTrails ?? 0;
    cards.push(getStatCard("audit", auditCount, "Audit Trails", "Total audit records"));
  }

  elements.statsGrid.innerHTML = cards.join("");
}

function renderDepartmentStats(stats) {
  const existing = document.getElementById("department-stats-section");
  if (existing) existing.remove();

  const departments = stats.departments || [];
  if (!departments.length) return;

  const isAdmin = state.profile?.roleName === "Admin";
  const sectionLabel = isAdmin ? "Department Breakdown" : "Your Department";

  const deptCards = departments.map((dept) => {
    const notesTotal = dept.notes?.total ?? 0;
    const notesActive = dept.notes?.active ?? 0;
    const notesArchived = dept.notes?.archived ?? 0;
    const t = dept.tasks || {};
    const tasksTotal = t.total ?? 0;
    const usersCount = dept.users ?? 0;
    const hasActivity = notesTotal > 0 || tasksTotal > 0 || usersCount > 0;

    const taskPills = [
      t.to_do > 0 ? `<span class="detail-pill detail-pill--pending">${t.to_do} to do</span>` : "",
      t.pending_approval > 0 ? `<span class="detail-pill detail-pill--pending">${t.pending_approval} pending approval</span>` : "",
      t.in_progress > 0 ? `<span class="detail-pill detail-pill--progress">${t.in_progress} in progress</span>` : "",
      t.completed > 0 ? `<span class="detail-pill detail-pill--done">${t.completed} completed</span>` : "",
      t.rejected > 0 ? `<span class="detail-pill detail-pill--cancelled">${t.rejected} rejected</span>` : "",
      t.cancelled > 0 ? `<span class="detail-pill detail-pill--cancelled">${t.cancelled} cancelled</span>` : "",
    ].join("");

    return `
      <article class="dept-card ${hasActivity ? "dept-card--active" : "dept-card--empty"}">
        <div class="dept-card-header">
          <h3 class="dept-card-name">${escapeHtml(dept.name || `Department ${dept.id}`)}</h3>
          <span class="dept-card-id">#${dept.id}</span>
        </div>
        <div class="dept-card-metrics">
          <div class="dept-metric"><span class="dept-metric-icon">${DASHBOARD_ICONS.users}</span><span class="dept-metric-value">${usersCount}</span><span class="dept-metric-label">Users</span></div>
          <div class="dept-metric"><span class="dept-metric-icon">${DASHBOARD_ICONS.notes}</span><span class="dept-metric-value">${notesTotal}</span><span class="dept-metric-label">Notes</span></div>
          <div class="dept-metric"><span class="dept-metric-icon">${DASHBOARD_ICONS.tasks}</span><span class="dept-metric-value">${tasksTotal}</span><span class="dept-metric-label">Tasks</span></div>
        </div>
        <div class="dept-card-details">
          <div class="dept-detail-row">
            <span class="dept-detail-label">Notes:</span>
            <span class="dept-detail-values">
              <span class="detail-pill detail-pill--active">${notesActive} active</span>
              ${notesArchived > 0 ? `<span class="detail-pill detail-pill--archived">${notesArchived} archived</span>` : ""}
            </span>
          </div>
          <div class="dept-detail-row">
            <span class="dept-detail-label">Tasks:</span>
            <span class="dept-detail-values">${taskPills || '<span class="detail-pill detail-pill--none">No tasks</span>'}</span>
          </div>
        </div>
      </article>
    `;
  }).join("");

  const section = document.createElement("section");
  section.id = "department-stats-section";
  section.className = "stats-section";
  section.setAttribute("aria-label", "Department statistics");
  section.innerHTML = `
    <div class="stats-toolbar"><div><h2 class="stats-title">${escapeHtml(sectionLabel)}</h2></div></div>
    <div class="dept-grid">${deptCards}</div>
  `;

  const statsSection = document.querySelector(".stats-section");
  if (statsSection && statsSection.parentNode) {
    statsSection.parentNode.insertBefore(section, statsSection.nextSibling);
  }
}

async function loadStats() {
  try {
    console.log("[loadStats] Fetching stats from", apiEndpoints.stats);
    renderStatsSkeleton();

    const isAdmin = state.profile?.roleName === "Admin";
    const scope = isAdmin ? "global" : "department";

    const url = apiUrl(`${apiEndpoints.stats}?scope=${scope}`);
    const response = await fetchJson(url);

    console.log("[loadStats] Stats received:", response);
    state.stats = response;
    renderStats(response);
    renderDepartmentStats(response);
  } catch (error) {
    console.error("[loadStats] ERROR:", error.message);
    renderStatsError(error);
  }
}

function showError(error) {
  console.error(error);
}

function setBoardTitle(profile) {
  if (!elements.boardTitle) return;
  const boardName =
    profile.workspaceName ||
    profile.company ||
    profile.organization ||
    profile.teamName ||
    profile.team ||
    profile.roleName ||
    "Workspace";
  elements.boardTitle.textContent = `${boardName} board`;
}

function getAuthHeaders(additionalHeaders = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...additionalHeaders,
  };

  const token = localStorage.getItem("authToken");
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function fetchJson(url, options = {}) {
  console.log("[fetchJson] Fetching:", url, "Options:", options);
  const token = localStorage.getItem("authToken");
  console.log(
    "[fetchJson] Token from localStorage:",
    token ? "present" : "MISSING",
  );

  const response = await fetch(url, {
    ...options,
    headers: getAuthHeaders(options.headers),
  });

  console.log("[fetchJson] Response status:", response.status);

  const responseText = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(responseText);
  } catch (e) {
    console.warn("[fetchJson] Failed to parse JSON response:", responseText);
  }

  if (!response.ok) {
    console.error("[fetchJson] Error response:", payload || responseText);
    const message =
      payload?.message ||
      responseText ||
      response.statusText ||
      `HTTP ${response.status}`;
    throw new Error(String(message));
  }

  const result = payload?.data ?? payload ?? {};
  console.log("[fetchJson] Returning:", result);
  return result;
}

async function fetchJsonEnvelope(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: getAuthHeaders(options.headers),
  });

  const responseText = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(responseText);
  } catch (e) {
    console.warn(
      "[fetchJsonEnvelope] Failed to parse JSON response:",
      responseText,
    );
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      responseText ||
      response.statusText ||
      `HTTP ${response.status}`;
    throw new Error(String(message));
  }

  if (payload && typeof payload === "object" && payload.success === false) {
    throw new Error(
      String(
        payload.message ||
          responseText ||
          response.statusText ||
          `HTTP ${response.status}`,
      ),
    );
  }
  return payload || {};
}

const MAX_USER_PAGES_DASHBOARD = 500;

async function fetchAllUsersPages() {
  const pageSize = 100;
  const aggregated = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = apiUrl(`${apiEndpoints.users}?page=${page}&limit=${pageSize}`);
    const envelope = await fetchJsonEnvelope(url);
    const chunk = Array.isArray(envelope.data) ? envelope.data : [];
    aggregated.push(...chunk);
    const pag = envelope.pagination;
    if (pag && typeof pag === "object") {
      totalPages = Math.max(1, parseInt(pag.totalPages, 10) || 1);
    } else {
      totalPages = 1;
    }
    page += 1;
    if (page > MAX_USER_PAGES_DASHBOARD) {
      console.warn("[dashboard] User list capped by MAX_USER_PAGES_DASHBOARD.");
      break;
    }
  } while (page <= totalPages);

  return aggregated;
}

async function loadProfile() {
  try {
    console.log("[loadProfile] Fetching profile from", apiEndpoints.profile);
    const profile = await fetchJson(apiUrl(apiEndpoints.profile));
    console.log("[loadProfile] Profile received:", profile);

    state.profile = profile;
    elements.profileName.textContent =
      profile.nickname || profile.name || profile.username || "User";
    const roleName = profile.role?.name || profile.roleName;
    elements.currentRole.textContent = roleName ? `Role: ${roleName}` : "";

    // Refresh visibility with latest role
    if (typeof window.applyRoleVisibility === "function") {
      window.applyRoleVisibility(roleName);
    }

    // Removed redundant sidebar code
    setSummaryLabels(roleName);
    setBoardTitle(profile);
  } catch (error) {
    console.error("[loadProfile] ERROR:", error.message);
    showError(error);

    // Check if debug mode is enabled
    const debugMode =
      new URLSearchParams(window.location.search).get("debug") === "1";
    if (debugMode) {
      console.warn(
        "[loadProfile] DEBUG MODE ENABLED - not redirecting. Please check console for error details.",
      );
      // Try fallback profile
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.id) {
        console.log("[loadProfile] Using cached user from localStorage");
        state.profile = user;
        elements.profileName.textContent = user.nickname || user.name || "User";
        const roleName = user.role?.name || user.roleName || "Unknown";
        elements.currentRole.textContent = "Role: " + roleName;
        elements.sidebarUsername.textContent =
          user.nickname || user.name || "User";
        setRoleVisibility(roleName);
        setSummaryLabels(roleName);
        return;
      }
    }

    console.log("[loadProfile] Redirecting to login...");
    window.location.replace("/index.html");
  }
}

async function loadSummary() {
  try {
    const summary = await fetchJson(apiUrl(apiEndpoints.summary));
    // Adjust summary based on role
    const role = state.profile?.roleName;
    if (role === "Employee") {
      // Employees only see their task count
      const userTasks = state.tasks.length;
      state.summary = {
        ...summary,
        taskCount: userTasks,
        userCount: 0,
        departmentCount: 0,
      };
    } else if (role === "Manager") {
      // Managers see team data
      state.summary = summary;
    } else {
      state.summary = summary;
    }
  } catch (error) {
    showError(error);
  }
}

function renderList(container, items, renderItem) {
  if (!container) {
    console.error("[renderList] container element not found");
    return;
  }

  console.log("[renderList] Container:", container);
  console.log("[renderList] Items:", items);

  container.innerHTML = "";
  if (!Array.isArray(items) || !items.length) {
    container.innerHTML =
      '<div class="card"><p class="card-meta">No records found.</p></div>';
    return;
  }
  items.forEach((item) => container.appendChild(renderItem(item)));
}

function createCard(contentHtml) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = contentHtml;
  return card;
}

function renderUsers(users) {
  renderList(elements.usersList, users, (user) => {
    const displayDept = user.depName || user.department?.name || "Unassigned";
    return createCard(`
      <div>
        <p class="card-title">${user.nickname || user.name || user.username || "User"}</p>
        <p class="card-meta">${user.email || "No email"} • ${user.roleName || user.role?.name || "Unknown"}</p>
        <p class="card-meta">Department: ${displayDept}</p>
        <div class="card-actions">
          <button class="secondary-button" data-action="edit-user" data-id="${user.id}">Edit</button>
        </div>
      </div>
    `);
  });
}

function renderDepartments(departments) {
  renderList(elements.departmentsList, departments, (department) => {
    const manager = state.users.find(
      (user) => String(user.id) === String(department.managerId),
    );
    return createCard(`
      <div>
        <p class="card-title">${department.depName || department.name}</p>
        <p class="card-meta">Manager: ${manager?.nickname || "Unassigned"}</p>
        <div class="card-actions">
          <button class="secondary-button" data-action="edit-department" data-id="${department.id}">Edit</button>
        </div>
      </div>
    `);
  });
}

function renderNotes(notes) {
  renderList(elements.notesList, notes, (note) => {
    return createCard(`
      <div>
        <p class="card-title">${note.title}</p>
        <p class="card-meta">${note.summary || "No summary available"}</p>
        <div class="card-actions">
          <button class="secondary-button" data-action="edit-note" data-id="${note.id}">Edit</button>
          <button class="secondary-button" data-action="create-task-from-note" data-id="${note.id}">Create task</button>
        </div>
      </div>
    `);
  });
}

function renderTasks(tasks) {
  renderList(elements.tasksList, tasks, (task) => {
    const assignee = state.users.find(
      (user) => user.id === task.assignedTo || user.id === task.assigneeId,
    );
    const statusValue = task.taskStatus || task.status || "Pending";
    const dueDate = task.dueDate
      ? new Date(task.dueDate).toLocaleDateString()
      : "No due date";
    const assigneeName = assignee
      ? assignee.nickname || assignee.name || assignee.username || "User"
      : "Unassigned";
    return createCard(`
      <div>
        <p class="card-title">${task.taskName || task.title || "Unnamed task"}</p>
        <p class="card-meta">Assigned to: ${assigneeName}</p>
        <p class="card-meta">${task.description || "No description"}</p>
        <p class="card-meta">Due: ${dueDate}</p>
        <div class="card-actions">
          <select data-action="status-change" data-id="${task.id}">
            <option value="Pending" ${statusValue === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Ongoing" ${statusValue === "Ongoing" ? "selected" : ""}>Ongoing</option>
            <option value="In Progress" ${statusValue === "In Progress" ? "selected" : ""}>In Progress</option>
            <option value="Done" ${statusValue === "Done" ? "selected" : ""}>Done</option>
          </select>
          <button class="secondary-button" data-action="edit-task" data-id="${task.id}">Edit</button>
          <button class="ghost-button" data-action="delete-task" data-id="${task.id}">Delete</button>
          <span class="status-pill status-${statusValue.toLowerCase().replace(/\s+/g, "-")}">${statusValue}</span>
        </div>
      </div>
    `);
  });
  renderBoard(tasks);
}

function getTaskStatus(task) {
  const status = (task.taskStatus || task.status || "Pending").trim();
  return status || "Pending";
}

function renderBoard(tasks) {
  if (!elements.boardColumns) return;

  const statusGroups = tasks.reduce((acc, task) => {
    const status = getTaskStatus(task);
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, {});

  const knownOrder = [
    "Backlog",
    "To Do",
    "ToDo",
    "In Progress",
    "Ongoing",
    "QA",
    "QA Testing",
    "Bug",
    "Bug/Issues",
    "Completed",
  ];

  const columns = Object.keys(statusGroups).sort((a, b) => {
    const aIndex = knownOrder.findIndex(
      (item) => item.toLowerCase() === a.toLowerCase(),
    );
    const bIndex = knownOrder.findIndex(
      (item) => item.toLowerCase() === b.toLowerCase(),
    );
    if (aIndex !== -1 || bIndex !== -1)
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    return a.localeCompare(b);
  });

  elements.boardColumns.innerHTML = "";

  columns.forEach((status) => {
    const cards = statusGroups[status];
    const column = document.createElement("article");
    column.className = "board-column";
    column.innerHTML = `
      <div class="column-header">
        <div>
          <p class="column-label">${status.toUpperCase()}</p>
          <h3>${status}</h3>
        </div>
        <span class="column-count">${cards.length}</span>
      </div>
      <div class="column-list" data-status="${status}"></div>
    `;

    elements.boardColumns.appendChild(column);

    const columnList = column.querySelector(".column-list");
    renderList(columnList, cards, (task) => {
      const assignee = state.users.find(
        (user) => user.id === task.assignedTo || user.id === task.assigneeId,
      );
      const statusValue = getTaskStatus(task);
      const assigneeName = assignee
        ? assignee.nickname || assignee.name || assignee.username || "User"
        : "Unassigned";
      return createCard(`
        <div>
          <p class="card-title">${task.taskName || task.title || "Unnamed task"}</p>
          <p class="card-meta">${task.id ? `#${task.id}` : "No ID"} • ${assigneeName}</p>
          <p class="card-meta">${task.description || "No description"}</p>
          <div class="card-actions">
            <span class="status-pill status-${statusValue.toLowerCase().replace(/\s+/g, "-")}">${statusValue}</span>
          </div>
        </div>
      `);
    });
  });
}

function renderAudit(logs) {
  renderList(elements.auditList, logs, (log) => {
    return createCard(`
      <div>
        <p class="card-title">${log.action || "System action"}</p>
        <p class="card-meta">${log.user || "Unknown user"} • ${new Date(log.timestamp).toLocaleString()}</p>
        <p class="card-meta">${log.details || ""}</p>
      </div>
    `);
  });
}

async function loadUsers() {
  try {
    const users = await fetchAllUsersPages();
    // Store ALL users for task assignments (every API page merged)
    state.users = users;

    // Filter for rendering based on role
    const role = state.profile?.roleName;
    let displayUsers = users;
    if (role === "Manager") {
      // Managers see users in their department
      const userDept = state.profile.depId;
      displayUsers = users.filter((u) => u.depId === userDept);
    } else if (role === "Employee") {
      // Employees don't see user management panel
      displayUsers = [];
    }

    renderUsers(displayUsers);
    populateUserFormSelects();
    populateTaskFormSelects();
  } catch (error) {
    showError(error);
  }
}

async function loadDepartments() {
  try {
    const departments = await fetchJson(apiUrl(apiEndpoints.departments));
    // Filter based on role
    const role = state.profile?.roleName;
    if (role === "Employee") {
      // Employees don't see department management
      state.departments = [];
    } else {
      state.departments = departments;
    }
    renderDepartments(state.departments);
    populateDepartmentFormSelects();
  } catch (error) {
    showError(error);
  }
}

async function loadNotes() {
  try {
    const notes = await fetchJson(apiUrl(apiEndpoints.notes));
    // Filter based on role - managers see notes owned by their department users
    state.notes = filterItemsByRole(notes, "ownerId", state.users);
    try {
      renderNotes(state.notes);
    } catch (error) {
      console.error("[loadNotes] Failed to render notes:", error);
    }
    populateTaskNoteSelect();
  } catch (error) {
    showError(error);
  }
}

async function loadTasks() {
  try {
    const tasks = await fetchJson(apiUrl(apiEndpoints.tasks));
    // Filter based on role using RBAC function
    state.tasks = filterItemsByRole(tasks, "assignedTo", state.users);
    try {
      renderTasks(state.tasks);
    } catch (error) {
      console.error("[loadTasks] Failed to render tasks:", error);
    }
  } catch (error) {
    showError(error);
  }
}

async function loadAudit() {
  try {
    state.audit = await fetchJson(apiUrl(apiEndpoints.audit));
    renderAudit(state.audit);
  } catch (error) {
    showError(error);
  }
}

function populateUserFormSelects() {
  const departmentSelect = elements.userForm.departmentId;
  if (!departmentSelect) return;

  departmentSelect.innerHTML =
    '<option value="">Unassigned</option>' +
    state.departments
      .map((dept) => `<option value="${dept.id}">${dept.name}</option>`)
      .join("");
}

function populateDepartmentFormSelects() {
  const managerSelect = elements.departmentForm.managerId;
  if (!managerSelect) return;

  managerSelect.innerHTML =
    '<option value="">Unassigned</option>' +
    state.users
      .filter((user) => {
        const role = user.roleName || user.role?.name;
        return role === "Manager" || role === "Admin";
      })
      .map(
        (user) =>
          `<option value="${user.id}">${user.nickname || user.name || user.username || "User"}</option>`,
      )
      .join("");
}

function populateTaskFormSelects() {
  const assigneeSelect = elements.taskForm.assignedTo;
  if (!assigneeSelect) return;
  assigneeSelect.innerHTML =
    '<option value="">Unassigned</option>' +
    state.users
      .filter((user) => {
        const role = user.roleName || user.role?.name;
        return role === "Employee" || role === "Manager";
      })
      .map(
        (user) =>
          `<option value="${user.id}">${user.nickname || user.name || user.username || "User"}</option>`,
      )
      .join("");
}

function populateTaskNoteSelect() {
  if (!elements.taskForm) {
    console.warn("[populateTaskNoteSelect] task form element not found");
    return;
  }

  const noteSelect = elements.taskForm.noteId;
  if (!noteSelect) {
    console.warn("[populateTaskNoteSelect] note select element not found");
    return;
  }

  if (!Array.isArray(state.notes)) {
    console.error(
      "[populateTaskNoteSelect] notes response is invalid",
      state.notes,
    );
    noteSelect.innerHTML = '<option value="">No notes available</option>';
    return;
  }

  if (!state.notes.length) {
    noteSelect.innerHTML = '<option value="">No notes available</option>';
    return;
  }

  noteSelect.innerHTML =
    '<option value="">Select note</option>' +
    state.notes
      .map((note) => `<option value="${note.id}">${note.title}</option>`)
      .join("");
}

function toggleSection(element) {
  element.classList.toggle("hidden");
}

function resetForm(form) {
  form.reset();
}

function showSettingsModal() {
  // Populate modal with current profile data
  if (state.profile) {
    const displayName = state.profile.nickname;
    const displayRole =
      state.profile.role?.name || state.profile.roleName || "Unknown";
    const displayDept =
      state.profile.department?.name || state.profile.depName || "Unassigned";

    elements.modalAccountName.textContent = displayName;
    elements.modalAccountEmail.textContent = state.profile.email || "No email";
    elements.modalAccountRole.textContent = displayRole;
    elements.modalAccountDepartment.textContent = displayDept;
  }
  elements.settingsModal.classList.remove("hidden");
}

function hideSettingsModal() {
  elements.settingsModal.classList.add("hidden");
}

function showResetModal() {
  hideSettingsModal();
  elements.resetModal.classList.remove("hidden");
}

function hideResetModal() {
  elements.resetModal.classList.add("hidden");
  elements.resetPasswordForm.reset();
}

async function resetPassword(event) {
  event.preventDefault();
  const formData = new FormData(elements.resetPasswordForm);
  const data = Object.fromEntries(formData);

  if (data.newPassword !== data.confirmPassword) {
    alert("New passwords do not match");
    return;
  }

  try {
    await fetchJson(apiUrl(apiEndpoints.resetPassword), {
      method: "POST",
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    });
    alert("Password reset successfully!");
    hideResetModal();
  } catch (error) {
    showError(error);
  }
}


function openUserModal() {
  state.editing.userId = null;
  if (elements.userFormTitle) elements.userFormTitle.textContent = "Create User";
  resetForm(elements.userForm);
  elements.userFormModal?.classList.remove("hidden");
}

function closeUserModal() {
  elements.userFormModal?.classList.add("hidden");
  resetForm(elements.userForm);
  state.editing.userId = null;
}

function openDepartmentModal() {
  state.editing.departmentId = null;
  if (elements.deptFormTitle) elements.deptFormTitle.textContent = "Create Department";
  resetForm(elements.departmentForm);
  elements.departmentFormModal?.classList.remove("hidden");
}

function closeDepartmentModal() {
  elements.departmentFormModal?.classList.add("hidden");
  resetForm(elements.departmentForm);
  state.editing.departmentId = null;
}

function registerEvents() {
  elements.refreshButton?.addEventListener("click", loadDashboard);
  elements.refreshStatsButton?.addEventListener("click", loadStats);
  elements.signoutButton?.addEventListener("click", signOut);
  elements.sidebarTasks?.addEventListener("click", (e) => {
    e.preventDefault();
    const taskPanel = document.getElementById("task-management-panel");
    if (taskPanel) {
      taskPanel.scrollIntoView({ behavior: "smooth" });
    } else {
      toggleSection(elements.taskFormCard);
    }
  });

  elements.sidebarSettings?.addEventListener("click", (e) => {
    e.preventDefault();
    showSettingsModal();
  });
  // Settings modal events
  elements.closeSettingsModal?.addEventListener("click", hideSettingsModal);
  elements.resetPasswordBtn?.addEventListener("click", showResetModal);
  elements.signoutModalBtn?.addEventListener("click", signOut);
  // Reset password modal events
  elements.closeResetModal?.addEventListener("click", hideResetModal);
  elements.cancelReset?.addEventListener("click", hideResetModal);
  elements.resetPasswordForm?.addEventListener("submit", resetPassword);
  // Close modals when clicking outside
  elements.settingsModal?.addEventListener("click", (e) => {
    if (e.target === elements.settingsModal) {
      hideSettingsModal();
    }
  });
  elements.resetModal?.addEventListener("click", (e) => {
    if (e.target === elements.resetModal) {
      hideResetModal();
    }
  });
  elements.toggleUserForm?.addEventListener("click", () =>
    openUserModal(),
  );
  elements.toggleDepartmentForm?.addEventListener("click", () =>
    openDepartmentModal(),
  );
  elements.toggleNoteForm?.addEventListener("click", () =>
    toggleSection(elements.noteFormCard),
  );
  elements.toggleTaskForm?.addEventListener("click", () =>
    toggleSection(elements.taskFormCard),
  );

  elements.cancelUserForm?.addEventListener("click", () => {
    closeUserModal();
  });

  elements.cancelDepartmentForm?.addEventListener("click", () => {
    closeDepartmentModal();
  });

  elements.closeUserFormModal?.addEventListener("click", closeUserModal);
  elements.closeDeptFormModal?.addEventListener("click", closeDepartmentModal);

  // Close modals on backdrop click
  elements.userFormModal?.addEventListener("click", (e) => {
    if (e.target === elements.userFormModal) closeUserModal();
  });
  elements.departmentFormModal?.addEventListener("click", (e) => {
    if (e.target === elements.departmentFormModal) closeDepartmentModal();
  });

  elements.cancelNoteForm?.addEventListener("click", () => {
    elements.noteFormCard.classList.add("hidden");
    resetForm(elements.noteForm);
    state.editing.noteId = null;
  });

  elements.cancelTaskForm?.addEventListener("click", () => {
    elements.taskFormCard.classList.add("hidden");
    resetForm(elements.taskForm);
    state.editing.taskId = null;
  });

  elements.userForm?.addEventListener("submit", handleUserSubmit);
  elements.departmentForm?.addEventListener("submit", handleDepartmentSubmit);
  elements.noteForm?.addEventListener("submit", handleNoteSubmit);
  elements.taskForm?.addEventListener("submit", handleTaskSubmit);
  elements.auditSearch?.addEventListener("input", handleAuditSearch);

  document.body.addEventListener("click", handleCardActions);
  document.body.addEventListener("change", handleSelectChanges);
}

function buildPayload(form) {
  return Object.fromEntries(new FormData(form));
}

async function handleUserSubmit(event) {
  event.preventDefault();
  const payload = buildPayload(elements.userForm);
  const method = state.editing.userId ? "PATCH" : "POST";
  const url = state.editing.userId
    ? apiUrl(`${apiEndpoints.users}/${state.editing.userId}`)
    : apiUrl(apiEndpoints.users);

  try {
    await fetchJson(url, {
      method,
      body: JSON.stringify(payload),
    });
    resetForm(elements.userForm);
    closeUserModal();
    state.editing.userId = null;
    await loadUsers();
    await loadSummary();
  } catch (error) {
    showError(error);
  }
}

async function handleDepartmentSubmit(event) {
  event.preventDefault();
  const payload = buildPayload(elements.departmentForm);
  const method = state.editing.departmentId ? "PATCH" : "POST";
  const url = state.editing.departmentId
    ? apiUrl(`${apiEndpoints.departments}/${state.editing.departmentId}`)
    : apiUrl(apiEndpoints.departments);

  try {
    await fetchJson(url, {
      method,
      body: JSON.stringify(payload),
    });
    resetForm(elements.departmentForm);
    closeDepartmentModal();
    state.editing.departmentId = null;
    await loadDepartments();
    await loadSummary();
  } catch (error) {
    showError(error);
  }
}

async function handleNoteSubmit(event) {
  event.preventDefault();
  const payload = buildPayload(elements.noteForm);
  const method = state.editing.noteId ? "PATCH" : "POST";
  const url = state.editing.noteId
    ? apiUrl(`${apiEndpoints.notes}/${state.editing.noteId}`)
    : apiUrl(apiEndpoints.notes);

  try {
    await fetchJson(url, {
      method,
      body: JSON.stringify(payload),
    });
    resetForm(elements.noteForm);
    elements.noteFormCard.classList.add("hidden");
    state.editing.noteId = null;
    await loadNotes();
    await loadSummary();
  } catch (error) {
    showError(error);
  }
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  const rawPayload = buildPayload(elements.taskForm);
  const payload = {
    taskName: rawPayload.taskName,
    description: rawPayload.description || "",
    noteId: rawPayload.noteId ? Number(rawPayload.noteId) : null,
    assignedTo: rawPayload.assignedTo ? Number(rawPayload.assignedTo) : null,
    dueDate: rawPayload.dueDate || null,
    taskStatus: rawPayload.status || "Pending",
    status: rawPayload.status || "Pending",
  };

  const method = state.editing.taskId ? "PATCH" : "POST";
  const url = state.editing.taskId
    ? apiUrl(`${apiEndpoints.tasks}/${state.editing.taskId}`)
    : apiUrl(apiEndpoints.tasks);

  try {
    await fetchJson(url, {
      method,
      body: JSON.stringify(payload),
    });
    resetForm(elements.taskForm);
    elements.taskFormCard.classList.add("hidden");
    state.editing.taskId = null;
    await loadTasks();
    await loadSummary();
  } catch (error) {
    showError(error);
  }
}

async function handleCardActions(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (!action || !id) return;

  switch (action) {
    case "edit-user":
      return editUser(id);
    case "edit-department":
      return editDepartment(id);
    case "edit-note":
      return editNote(id);
    case "edit-task":
      return editTask(id);
    case "delete-task":
      return deleteTask(id);
    case "create-task-from-note":
      return createTaskFromNote(id);
    default:
      break;
  }
}

async function editTask(taskId) {
  const task = state.tasks.find((item) => String(item.id) === String(taskId));
  if (!task) return;
  if (!elements.taskForm) {
    console.warn("[editTask] task form element not found");
    return;
  }

  state.editing.taskId = task.id;
  elements.taskForm.taskName.value = task.taskName || task.title || "";
  elements.taskForm.description.value = task.description || "";
  elements.taskForm.assignedTo.value = task.assignedTo || task.assigneeId || "";
  if (elements.taskForm.noteId) {
    elements.taskForm.noteId.value = task.noteId || "";
  }
  elements.taskForm.dueDate.value = task.dueDate
    ? task.dueDate.split(" ")[0]
    : "";
  elements.taskForm.status.value = task.taskStatus || task.status || "Pending";
  elements.taskFormCard.classList.remove("hidden");
}

async function deleteTask(taskId) {
  const confirmed = window.confirm(
    "Delete this task? This action cannot be undone.",
  );
  if (!confirmed) return;

  try {
    await fetchJson(apiUrl(`${apiEndpoints.tasks}/${taskId}`), {
      method: "DELETE",
    });
    await loadTasks();
    await loadSummary();
  } catch (error) {
    showError(error);
  }
}

async function handleSelectChanges(event) {
  const action = event.target.dataset.action;
  const id = event.target.dataset.id;
  if (action !== "status-change" || !id) return;

  await updateTaskStatus(id, event.target.value);
}

async function editUser(userId) {
  const user = state.users.find((item) => String(item.id) === String(userId));
  if (!user) return;

  state.editing.userId = user.id;
  if (elements.userFormTitle) elements.userFormTitle.textContent = "Edit User";
  if (elements.userForm.email) elements.userForm.email.value = user.email || "";
  if (elements.userForm.nickname) elements.userForm.nickname.value = user.nickname || "";
  if (elements.userForm.phoneNum) elements.userForm.phoneNum.value = user.phoneNum || "";
  if (elements.userForm.role)
    elements.userForm.role.value = user.roleName || user.role?.name || "Employee";
  if (elements.userForm.departmentId)
    elements.userForm.departmentId.value = user.depId || user.department?.id || "";
  elements.userFormModal.classList.remove("hidden");
}

async function editDepartment(departmentId) {
  const department = state.departments.find((item) => String(item.id) === String(departmentId));
  if (!department) return;

  state.editing.departmentId = department.id;
  if (elements.deptFormTitle) elements.deptFormTitle.textContent = "Edit Department";
  elements.departmentForm.name.value = department.name || department.depName || "";
  elements.departmentForm.managerId.value = department.managerId || "";
  elements.departmentFormModal.classList.remove("hidden");
}

async function editNote(noteId) {
  const note = state.notes.find((item) => item.id === noteId);
  if (!note) return;

  state.editing.noteId = note.id;
  elements.noteForm.title.value = note.title || "";
  elements.noteForm.summary.value = note.summary || "";
  elements.noteForm.details.value = note.details || "";
  elements.noteFormCard.classList.remove("hidden");
}

function createTaskFromNote(noteId) {
  const note = state.notes.find((item) => item.id === noteId);
  if (!note) {
    console.warn("[createTaskFromNote] Note not found:", noteId);
    return;
  }

  if (!elements.taskForm) {
    console.warn("[createTaskFromNote] task form element not found");
    return;
  }

  elements.taskForm.taskName.value = `Follow up: ${note.title}`;
  elements.taskForm.description.value = note.summary || "";
  if (elements.taskForm.noteId) {
    elements.taskForm.noteId.value = note.id;
  }
  elements.taskFormCard.classList.remove("hidden");
}

async function updateTaskStatus(taskId, status) {
  try {
    await fetchJson(apiUrl(`${apiEndpoints.tasks}/${taskId}`), {
      method: "PATCH",
      body: JSON.stringify({ taskStatus: status, status }),
    });
    await loadTasks();
  } catch (error) {
    showError(error);
  }
}

function filterAuditLogs(query) {
  const normalized = query.trim().toLowerCase();
  const filtered = state.audit.filter((entry) => {
    return (
      entry.action?.toLowerCase().includes(normalized) ||
      entry.user?.toLowerCase().includes(normalized) ||
      entry.details?.toLowerCase().includes(normalized)
    );
  });
  renderAudit(filtered);
}

function handleAuditSearch(event) {
  filterAuditLogs(event.target.value);
}

async function signOut() {
  try {
    await fetchJson(apiUrl(apiEndpoints.logout), { method: "POST" });
  } catch {
    // ignore failures, still redirect to login
  }
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
  window.location.replace("/index.html");
}

async function loadDashboard() {
  console.log(
    "[loadDashboard] ==================== START ====================",
  );
  try {
    await loadProfile();
    console.log("[loadDashboard] Profile loaded successfully");

    // Load data based on role
    const role = state.profile?.roleName;
    if (role === "Admin") {
      await Promise.all([
        loadStats(),
        loadSummary(),
        loadUsers(),
        loadDepartments(),
        loadNotes(),
        loadTasks(),
        loadAudit(),
      ]);
    } else if (role === "Manager") {
      await Promise.all([
        loadStats(),
        loadSummary(),
        loadUsers(),
        loadDepartments(),
        loadNotes(),
        loadTasks(),
        loadAudit(),
      ]);
    } else {
      // Employee
      await loadTasks(); // Load tasks first for summary
      await Promise.all([loadStats(), loadSummary(), loadNotes()]);
    }

    console.log("[loadDashboard] All data loaded successfully");
    console.log(
      "[loadDashboard] ==================== END (success) ====================",
    );
  } catch (error) {
    console.error("[loadDashboard] CRITICAL ERROR:", error);
    console.log(
      "[loadDashboard] ==================== END (error) ====================",
    );
    throw error;
  }
}

console.log("[dashboard.js] Script loaded, waiting for DOMContentLoaded");

document.addEventListener("DOMContentLoaded", () => {
  console.log("[dashboard.js] DOMContentLoaded event fired");
  try {
    registerEvents();
    console.log("[dashboard.js] Event handlers registered");
    loadDashboard();
  } catch (error) {
    console.error("[dashboard.js] INITIALIZATION ERROR:", error);
  }
});
