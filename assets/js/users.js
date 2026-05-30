const userElements = {
  sidebarUsername: document.getElementById("sidebar-username"),
  signoutBtn: document.getElementById("signout-btn"),
  createUserBtn: document.getElementById("create-user-btn"),
  usersCount: document.getElementById("users-count"),
  usersTableBody: document.getElementById("users-table-body"),
  userForm: document.getElementById("user-form"),
  userFormTitle: document.getElementById("user-form-title"),
  cancelUserForm: document.getElementById("cancel-user-form"),
  depSelect: document.getElementById("user-dep-select"),
  pagination: document.getElementById("users-pagination"),
  prevPage: document.getElementById("users-prev-page"),
  nextPage: document.getElementById("users-next-page"),
  pageInfo: document.getElementById("users-page-info"),
  userModal: document.getElementById("user-form-modal"),
  closeUserModalBtn: document.getElementById("close-user-form-modal"),
};

const MAX_USER_LIST_PAGES = 500;

const userState = {
  users: [],
  departments: [],
  editingUserId: null,
  pageFetchSize: 100,
  pagination: null,
};

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

async function fetchJsonEnvelope(url, options = {}) {
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

  return json;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

function departmentLabel(dept) {
  return dept.depName ?? dept.name ?? "";
}

async function loadProfile() {
  try {
    const profile = await fetchJson(apiPath("/api/auth/me"));
    // updateSidebarUser is now a global from main.js and handles localStorage
    if (typeof updateSidebarUser === "function") {
      updateSidebarUser(profile);
    }
    // initSidebar from main.js handles the active state
    if (typeof initSidebar === "function") {
      initSidebar();
    }
    return profile;
  } catch (error) {
    console.error("Unable to load profile:", error);
    window.location.replace("/index.html");
  }
}

function signOut() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
  window.location.replace("/index.html");
}

function renderDepartmentOptions() {
  if (!userElements.depSelect) return;
  const current = userElements.depSelect.value;
  userElements.depSelect.innerHTML = '<option value="">— None —</option>';
  userState.departments.forEach((dept) => {
    const opt = document.createElement("option");
    opt.value = String(dept.id);
    opt.textContent = departmentLabel(dept) || `Department ${dept.id}`;
    userElements.depSelect.appendChild(opt);
  });
  if (
    current &&
    [...userElements.depSelect.options].some(
      (option) => option.value === current,
    )
  ) {
    userElements.depSelect.value = current;
  }
}

function resetUserForm() {
  userState.editingUserId = null;
  if (userElements.userFormTitle)
    userElements.userFormTitle.textContent = "Create user";
  if (userElements.userForm) {
    userElements.userForm.reset();
    const roleSelect = userElements.userForm.querySelector('[name="roleId"]');
    if (roleSelect) roleSelect.value = "3";
  }
}

function showUserModal() {
  if (userElements.userModal) {
    userElements.userModal.classList.remove("hidden");
  }
}

function hideUserModal() {
  if (userElements.userModal) {
    userElements.userModal.classList.add("hidden");
  }
}

function openCreateForm() {
  resetUserForm();
  showUserModal();
}

function openEditForm(user) {
  if (!userElements.userForm) return;
  userState.editingUserId = user.id;
  userElements.userFormTitle.textContent = "Edit user";
  userElements.userForm.email.value = user.email ?? "";
  userElements.userForm.nickname.value = user.nickname ?? "";
  userElements.userForm.phoneNum.value = user.phoneNum ?? "";
  userElements.userForm.depId.value =
    user.department?.id != null ? String(user.department.id) : "";
  userElements.userForm.roleId.value = String(user.role?.id ?? "3");
  showUserModal();
}

function updatePaginationUi() {
  const pag = userElements.pagination;
  const info = userElements.pageInfo;
  if (!pag || !info) return;

  const total = userState.pagination?.total ?? userState.users.length;
  info.textContent =
    total > 0
      ? `Showing all ${total} user${total === 1 ? "" : "s"} (loaded from API)`
      : "";
  pag.hidden = true;
}

function renderUsers() {
  if (!userElements.usersTableBody) return;

  userElements.usersTableBody.innerHTML = "";

  if (!userState.users.length) {
    userElements.usersTableBody.innerHTML = `
      <tr class="department-table-empty">
        <td colspan="8">No users found for this page.</td>
      </tr>`;
    if (userElements.usersCount) {
      userElements.usersCount.textContent = String(
        userState.pagination?.total ?? 0,
      );
    }
    updatePaginationUi();
    return;
  }

  const fragment = document.createDocumentFragment();

  userState.users.forEach((user) => {
    const tr = document.createElement("tr");
    const email = user.email ?? "";
    const nick = user.nickname ?? "";
    const phone =
      user.phoneNum != null && user.phoneNum !== "" ? user.phoneNum : "—";
    const dep = user.department?.name ?? "—";
    const role = user.role?.name ?? "—";
    tr.innerHTML = `
      <td>${escapeHtml(user.id)}</td>
      <td class="users-cell-email department-table-desc">${escapeHtml(email || "—")}</td>
      <td>${escapeHtml(nick || "—")}</td>
      <td class="department-table-meta">${escapeHtml(phone)}</td>
      <td>${escapeHtml(dep)}</td>
      <td>${escapeHtml(role)}</td>
      <td class="department-table-meta">${escapeHtml(user.updatedAt ?? "—")}</td>
      <td class="department-table-actions">
        <button type="button" class="secondary-button table-action-btn" data-action="edit-user" data-id="${escapeHtml(user.id)}">Edit</button>
        <button type="button" class="ghost-button table-action-btn" data-action="delete-user" data-id="${escapeHtml(user.id)}">Delete</button>
      </td>
    `;
    fragment.appendChild(tr);
  });

  userElements.usersTableBody.appendChild(fragment);
  if (userElements.usersCount) {
    userElements.usersCount.textContent = String(
      userState.pagination?.total ?? userState.users.length,
    );
  }
  updatePaginationUi();
}

function findUserById(id) {
  return userState.users.find((u) => String(u.id) === String(id));
}

async function loadDepartments() {
  try {
    const departments = await fetchJson(apiPath("/api/departments"));
    const list = Array.isArray(departments) ? departments : [];
    userState.departments = list.filter(
      (row) => row && (row.deletedAt === null || row.deletedAt === undefined),
    );
    renderDepartmentOptions();
  } catch (error) {
    console.error("Unable to load departments:", error);
    userState.departments = [];
    renderDepartmentOptions();
  }
}

async function loadUsers() {
  try {
    const pageSize = userState.pageFetchSize;
    const aggregated = [];
    let page = 1;
    let totalPages = 1;
    let reportedTotal = null;

    do {
      const envelope = await fetchJsonEnvelope(
        apiPath(`/api/users?page=${page}&limit=${pageSize}`),
      );
      const chunk = Array.isArray(envelope.data) ? envelope.data : [];
      aggregated.push(...chunk);
      const pag = envelope.pagination;
      if (pag && typeof pag === "object") {
        if (pag.total != null) reportedTotal = pag.total;
        totalPages = Math.max(1, parseInt(pag.totalPages, 10) || 1);
      } else {
        totalPages = 1;
      }
      page += 1;
      if (page > MAX_USER_LIST_PAGES) {
        console.warn(
          "[users] Stopped after max pages; increase MAX_USER_LIST_PAGES if needed.",
        );
        break;
      }
    } while (page <= totalPages);

    userState.users = aggregated;
    const total = reportedTotal != null ? reportedTotal : aggregated.length;
    userState.pagination = {
      total,
      page: 1,
      limit: aggregated.length || pageSize,
      totalPages: 1,
    };
    renderUsers();
  } catch (error) {
    console.error("Unable to load users:", error);
    userState.users = [];
    userState.pagination = null;
    renderUsers();
    alert(error.message || "Unable to load users.");
  }
}

async function saveUser(event) {
  event.preventDefault();
  if (!userElements.userForm) return;

  const formData = new FormData(userElements.userForm);
  const email = (formData.get("email") || "").toString().trim();
  const nickname = (formData.get("nickname") || "").toString().trim();
  const phoneRaw = formData.get("phoneNum");
  const phoneNum =
    phoneRaw === null ||
    phoneRaw === undefined ||
    String(phoneRaw).trim() === ""
      ? null
      : String(phoneRaw).trim();
  const depVal = formData.get("depId");
  const depId =
    depVal === null || depVal === undefined || String(depVal).trim() === ""
      ? null
      : parseInt(String(depVal), 10);
  const roleId = parseInt(String(formData.get("roleId") || "3"), 10);

  if (!email || !nickname) {
    alert("Email and nickname are required.");
    return;
  }

  const payload = {
    email,
    nickname,
    phoneNum,
    depId: depId != null && !Number.isNaN(depId) ? depId : null,
    roleId: Number.isNaN(roleId) ? 3 : roleId,
  };

  const userId = userState.editingUserId;
  const url = userId ? apiPath(`/api/users/${userId}`) : apiPath("/api/users");
  const method = userId ? "PUT" : "POST";

  try {
    await fetchJson(url, {
      method,
      body: JSON.stringify(payload),
    });

    await loadUsers();
    resetUserForm();
    hideUserModal();
    showNotification(
      "success",
      userId ? "User updated successfully" : "User created successfully",
    );
  } catch (error) {
    showNotification("error", "Failed to save user. Please try again.");
  }
}

async function deleteUser(id) {
  const existing = findUserById(id);
  const label = existing
    ? existing.nickname || existing.email || `ID ${id}`
    : `ID ${id}`;
  if (!confirm(`Delete user "${label}"? This cannot be undone.`)) return;

  try {
    await fetchJson(apiPath(`/api/users/${id}`), {
      method: "DELETE",
    });
    await loadUsers();
    if (userState.editingUserId === id) {
      resetUserForm();
      hideUserModal();
    }
    showNotification("success", "User deleted successfully");
  } catch (error) {
    showNotification("error", "Failed to delete user. Please try again.");
  }
}

function handleUserTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "edit-user") {
    const user = findUserById(id);
    if (user) {
      openEditForm(user);
    }
    return;
  }

  if (action === "delete-user") {
    deleteUser(id);
  }
}

function registerEvents() {
  if (userElements.signoutBtn) {
    userElements.signoutBtn.addEventListener("click", signOut);
  }
  if (userElements.createUserBtn) {
    userElements.createUserBtn.addEventListener("click", openCreateForm);
  }
  if (userElements.userForm) {
    userElements.userForm.addEventListener("submit", saveUser);
  }
  if (userElements.cancelUserForm) {
    userElements.cancelUserForm.addEventListener("click", (event) => {
      event.preventDefault();
      resetUserForm();
      hideUserModal();
    });
  }
  if (userElements.closeUserModalBtn) {
    userElements.closeUserModalBtn.addEventListener("click", () => {
      resetUserForm();
      hideUserModal();
    });
  }
  if (userElements.usersTableBody) {
    userElements.usersTableBody.addEventListener("click", handleUserTableClick);
  }
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

async function initUsersPage() {
  registerEvents();
  resetUserForm();
  await loadProfile();
  await loadDepartments();
  await loadUsers();
}

window.addEventListener("DOMContentLoaded", initUsersPage);
