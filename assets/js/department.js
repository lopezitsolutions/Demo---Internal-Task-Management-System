const departmentElements = {
  sidebarUsername: document.getElementById("sidebar-username"),
  signoutBtn: document.getElementById("signout-btn"),
  createDepartmentBtn: document.getElementById("create-department-btn"),
  departmentCount: document.getElementById("department-count"),
  departmentsTableBody: document.getElementById("departments-table-body"),
  departmentForm: document.getElementById("department-form"),
  formTitle: document.getElementById("form-title"),
  cancelDepartmentForm: document.getElementById("cancel-department-form"),
  departmentModal: document.getElementById("department-form-modal"),
  closeDepartmentModalBtn: document.getElementById(
    "close-department-form-modal",
  ),
};

const elements = {
  settingsModal: document.getElementById("settings-modal"),
  modalAccountName: document.getElementById("modal-account-name"),
  modalAccountEmail: document.getElementById("modal-account-email"),
  modalAccountRole: document.getElementById("modal-account-role"),
  modalAccountDepartment: document.getElementById("modal-account-department"),
};

const state = {
  profile: null,
};

const departmentState = {
  departments: [],
  editingDepartmentId: null,
};

/**
 * Optional absolute API origin when the frontend is not same-origin as the API.
 * Set before loading this script: window.__API_BASE__ = "https://api.example.com"
 * (no trailing slash). Defaults to same-origin relative URLs: /api/...
 */
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

/**
 * Handles API envelopes: { success, data }, { success, message, data }, DELETE { message },
 * and 204 No Content.
 */
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

function departmentDisplayName(department) {
  return department.depName ?? department.name ?? "";
}

async function loadProfile() {
  try {
    const profile = await fetchJson(apiPath("/api/auth/me"));
    state.profile = profile;
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

async function loadDepartments() {
  try {
    const departments = await fetchJson(apiPath("/api/departments"));
    const list = Array.isArray(departments) ? departments : [];
    departmentState.departments = list.filter(
      (row) => row && (row.deletedAt === null || row.deletedAt === undefined),
    );
    renderDepartments();
  } catch (error) {
    console.error("Unable to load departments:", error);
    departmentState.departments = [];
    renderDepartments();
  }
}

function findDepartmentById(id) {
  return departmentState.departments.find(
    (department) => String(department.id) === String(id),
  );
}

function showDepartmentModal() {
  if (departmentElements.departmentModal) {
    departmentElements.departmentModal.classList.remove("hidden");
  }
}

function hideDepartmentModal() {
  if (departmentElements.departmentModal) {
    departmentElements.departmentModal.classList.add("hidden");
  }
}

function resetDepartmentForm() {
  departmentState.editingDepartmentId = null;
  if (departmentElements.departmentForm) {
    departmentElements.departmentForm.reset();
  }
  if (departmentElements.formTitle) {
    departmentElements.formTitle.textContent = "Create department";
  }
}

function openCreateForm() {
  resetDepartmentForm();
  showDepartmentModal();
}

function openEditForm(department) {
  if (!departmentElements.departmentForm) return;

  departmentState.editingDepartmentId = department.id;
  if (departmentElements.formTitle) {
    departmentElements.formTitle.textContent = "Edit department";
  }

  const depNameInput =
    departmentElements.departmentForm.querySelector('[name="depName"]');
  const descriptionInput = departmentElements.departmentForm.querySelector(
    '[name="description"]',
  );

  if (depNameInput) {
    depNameInput.value = department.depName || department.name || "";
  }
  if (descriptionInput) {
    descriptionInput.value = department.description || "";
  }

  showDepartmentModal();
}

function renderDepartments() {
  if (!departmentElements.departmentsTableBody) return;

  departmentElements.departmentsTableBody.innerHTML =
    departmentState.departments
      .map((department) => {
        const id = escapeHtml(String(department.id ?? ""));
        const name = escapeHtml(departmentDisplayName(department));
        const description = escapeHtml(department.description || "");
        const createdAt = escapeHtml(department.createdAt || "");
        const updatedAt = escapeHtml(department.updatedAt || "");

        return `
          <tr>
            <td>${id}</td>
            <td>${name}</td>
            <td>${description}</td>
            <td>${createdAt}</td>
            <td>${updatedAt}</td>
            <td class="department-table-actions">
              <button type="button" class="ghost-button" data-action="edit-department" data-id="${id}">
                Edit
              </button>
              <button type="button" class="ghost-button danger" data-action="delete-department" data-id="${id}">
                Delete
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

  if (departmentElements.departmentCount) {
    departmentElements.departmentCount.textContent = String(
      departmentState.departments.length,
    );
  }
}

async function getDepartment(id) {
  return await fetchJson(apiPath(`/api/departments/${id}`));
}

async function saveDepartment(event) {
  event.preventDefault();
  if (!departmentElements.departmentForm) return;

  const formData = new FormData(departmentElements.departmentForm);
  const depName = (formData.get("depName") || "").toString().trim();
  const description = (formData.get("description") || "").toString().trim();

  if (!depName) {
    alert("Department name is required.");
    return;
  }

  const payload = {
    depName,
    description,
  };

  const departmentId = departmentState.editingDepartmentId;
  const url = departmentId
    ? apiPath(`/api/departments/${departmentId}`)
    : apiPath("/api/departments");
  const method = departmentId ? "PUT" : "POST";

  try {
    await fetchJson(url, {
      method,
      body: JSON.stringify(payload),
    });

    await loadDepartments();
    resetDepartmentForm();
    hideDepartmentModal();
    showNotification(
      "success",
      departmentId
        ? "Department updated successfully"
        : "Department created successfully",
    );
  } catch (error) {
    showNotification("error", "Failed to save department. Please try again.");
  }
}

async function deleteDepartment(id) {
  const existing = findDepartmentById(id);
  const label = existing
    ? departmentDisplayName(existing) || `ID ${id}`
    : `ID ${id}`;
  if (!confirm(`Delete department "${label}"? This cannot be undone.`)) return;

  try {
    await fetchJson(apiPath(`/api/departments/${id}`), {
      method: "DELETE",
    });
    await loadDepartments();
    if (departmentState.editingDepartmentId === id) {
      resetDepartmentForm();
      hideDepartmentModal();
    }
    showNotification("success", "Department deleted successfully");
  } catch (error) {
    showNotification("error", "Failed to delete department. Please try again.");
  }
}

async function handleDepartmentAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "edit-department") {
    const department = findDepartmentById(id);
    if (department) {
      if (!departmentDisplayName(department)) {
        try {
          const freshDepartment = await getDepartment(id);
          openEditForm(freshDepartment);
        } catch (e) {
          openEditForm(department);
        }
      } else {
        openEditForm(department);
      }
    }
    return;
  }

  if (action === "delete-department") {
    deleteDepartment(id);
  }
}

function signOut() {
  if (typeof window.itwmsLogout === "function") {
    return window.itwmsLogout();
  }

  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.location.replace("/index.html");
}

function registerEvents() {
  const signoutModalBtn = document.getElementById("signout-modal-btn");

  if (signoutModalBtn) {
    signoutModalBtn.addEventListener("click", signOut);
  }

  if (departmentElements.signoutBtn) {
    departmentElements.signoutBtn.addEventListener("click", signOut);
  }
  if (departmentElements.createDepartmentBtn) {
    departmentElements.createDepartmentBtn.addEventListener(
      "click",
      openCreateForm,
    );
  }
  if (departmentElements.departmentForm) {
    departmentElements.departmentForm.addEventListener(
      "submit",
      saveDepartment,
    );
  }
  if (departmentElements.cancelDepartmentForm) {
    departmentElements.cancelDepartmentForm.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        resetDepartmentForm();
        hideDepartmentModal();
      },
    );
  }
  if (departmentElements.closeDepartmentModalBtn) {
    departmentElements.closeDepartmentModalBtn.addEventListener("click", () => {
      resetDepartmentForm();
      hideDepartmentModal();
    });
  }
  if (departmentElements.departmentsTableBody) {
    departmentElements.departmentsTableBody.addEventListener(
      "click",
      handleDepartmentAction,
    );
  }
}

async function initDepartmentPage() {
  registerEvents();
  resetDepartmentForm();
  await loadProfile();
  await loadDepartments();
}

window.addEventListener("DOMContentLoaded", initDepartmentPage);
