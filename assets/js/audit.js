const auditElements = {
  sidebarUsername: document.getElementById("sidebar-username"),
  signoutBtn: document.getElementById("signout-btn"),
  auditCount: document.getElementById("audit-count"),
  auditTableBody: document.getElementById("audit-table-body"),
  auditPagination: document.getElementById("audit-pagination"),
  prevPage: document.getElementById("audit-prev-page"),
  nextPage: document.getElementById("audit-next-page"),
  pageInfo: document.getElementById("audit-page-info"),
  auditDetailModal: document.getElementById("audit-detail-modal"),
  closeAuditDetailModal: document.getElementById("close-audit-detail-modal"),
  auditDetailTitle: document.getElementById("audit-detail-title"),
  auditOldData: document.getElementById("audit-old-data"),
  auditNewData: document.getElementById("audit-new-data"),
  auditIdFilter: document.getElementById("audit-id-filter"),
  auditRecordIdFilter: document.getElementById("audit-recordid-filter"),
  auditTableFilter: document.getElementById("audit-table-filter"),
  auditSearchFilter: document.getElementById("audit-search-filter"),
  auditUserFilter: document.getElementById("audit-user-filter"),
  auditActionFilter: document.getElementById("audit-action-filter"),
  auditStartDateFilter: document.getElementById("audit-start-date-filter"),
  auditEndDateFilter: document.getElementById("audit-end-date-filter"),
  auditOpenFiltersBtn: document.getElementById("audit-open-filters-btn"),
  auditFilterDrawer: document.getElementById("audit-filter-drawer"),
  auditCloseFiltersBtn: document.getElementById("audit-close-filters-btn"),
  auditFilterBackdrop: document.getElementById("audit-filter-backdrop"),
  auditApplyFilters: document.getElementById("audit-apply-filters"),
  auditClearFilters: document.getElementById("audit-clear-filters"),
};

const auditState = {
  auditTrails: [],
  pagination: null,
  currentPage: 1,
  limit: 10,
  filters: {
    id: "",
    recordId: "",
    table: "",
    search: "",
    userId: "",
    actionType: "",
    startDate: "",
    endDate: "",
  },
  users: [],
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

function updateSidebarUser(profile) {
  if (!auditElements.sidebarUsername) return;
  auditElements.sidebarUsername.textContent = profile?.nickname || "User";
}

function setSidebarActiveState() {
  const currentPath = window.location.pathname;
  const sidebarLinks = document.querySelectorAll(".sidebar-menu a");

  sidebarLinks.forEach((link) => {
    link.classList.remove("active");
  });

  if (currentPath.includes("audit.html")) {
    const auditLink = document.getElementById("sidebar-audit");
    if (auditLink) auditLink.classList.add("active");
  }
}

function signOut() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
  window.location.replace("/index.html");
}

async function loadProfile() {
  try {
    const profile = await fetchJson(apiPath("/api/auth/me"));
    updateSidebarUser(profile);
    setSidebarActiveState();
    return profile;
  } catch (error) {
    console.error("Unable to load profile:", error);
    window.location.replace("/index.html");
  }
}

async function loadUsers() {
  try {
    const users = await fetchJson(apiPath("/api/users"));
    auditState.users = users;
    renderUserFilter();
  } catch (error) {
    console.error("Failed to load users:", error);
  }
}

function renderUserFilter() {
  const select = auditElements.auditUserFilter;
  select.innerHTML = '<option value="">All Users</option>';

  auditState.users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = user.email;
    select.appendChild(option);
  });
}

async function loadAuditTrails(page = 1) {
  try {
    let url = apiPath(
      `/api/audit-trails?page=${page}&limit=${auditState.limit}`,
    );

    // Add filters to URL
    if (auditState.filters.id) {
      url += `&id=${encodeURIComponent(auditState.filters.id)}`;
    }
    if (auditState.filters.recordId) {
      url += `&recordId=${encodeURIComponent(auditState.filters.recordId)}`;
    }
    if (auditState.filters.table) {
      url += `&table=${encodeURIComponent(auditState.filters.table)}`;
    }
    if (auditState.filters.search) {
      url += `&search=${encodeURIComponent(auditState.filters.search)}`;
    }
    if (auditState.filters.userId) {
      url += `&userId=${encodeURIComponent(auditState.filters.userId)}`;
    }
    if (auditState.filters.actionType) {
      url += `&actionType=${encodeURIComponent(auditState.filters.actionType)}`;
    }
    if (auditState.filters.startDate) {
      url += `&startDate=${encodeURIComponent(auditState.filters.startDate)}`;
    }
    if (auditState.filters.endDate) {
      url += `&endDate=${encodeURIComponent(auditState.filters.endDate)}`;
    }

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const json = await response.json();

    // Handle the full envelope response with data and pagination
    if (json && json.data && Array.isArray(json.data)) {
      auditState.auditTrails = json.data;
      auditState.pagination = json.pagination || null;
      auditState.currentPage = page;
      renderAuditTable();
      renderPagination();
    } else {
      throw new Error("Invalid response format");
    }
  } catch (error) {
    console.error("Failed to load audit trails:", error);
    alert("Failed to load audit trails: " + error.message);
  }
}

function trailMatchesSearch(trail, searchText) {
  const normalizedSearch = String(searchText).trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  const values = Object.values(trail).map((value) => {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  });

  const searchable = values.join(" ").toLowerCase();
  return searchable.includes(normalizedSearch);
}

function getFilteredAuditTrails() {
  return auditState.auditTrails.filter((trail) => {
    const idMatch =
      !auditState.filters.id ||
      String(trail.id) === String(auditState.filters.id).trim();
    const recordMatch =
      !auditState.filters.recordId ||
      String(trail.recordId) === String(auditState.filters.recordId).trim();
    const tableMatch =
      !auditState.filters.table ||
      String(trail.tableName || "").toLowerCase() ===
        String(auditState.filters.table).toLowerCase();
    const userMatch =
      !auditState.filters.userId ||
      String(trail.userId) === String(auditState.filters.userId) ||
      String((trail.userEmail || "").toLowerCase()) ===
        String(
          (
            auditState.users.find(
              (user) => String(user.id) === String(auditState.filters.userId),
            )?.email || ""
          ).toLowerCase(),
        );
    const actionMatch =
      !auditState.filters.actionType ||
      String(trail.action || "").toUpperCase() ===
        String(auditState.filters.actionType).toUpperCase();

    const createdDate = trail.createdAt
      ? new Date(trail.createdAt).toISOString().slice(0, 10)
      : "";
    const startDateMatch =
      !auditState.filters.startDate ||
      createdDate >= auditState.filters.startDate;
    const endDateMatch =
      !auditState.filters.endDate || createdDate <= auditState.filters.endDate;

    const searchMatch = trailMatchesSearch(trail, auditState.filters.search);

    return (
      idMatch &&
      recordMatch &&
      tableMatch &&
      userMatch &&
      actionMatch &&
      startDateMatch &&
      endDateMatch &&
      searchMatch
    );
  });
}

function renderAuditTable() {
  const tbody = auditElements.auditTableBody;
  tbody.innerHTML = "";
  const filteredTrails = getFilteredAuditTrails();

  if (filteredTrails.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7" class="department-table-empty">No audit trails found.</td>`;
    tbody.appendChild(tr);
    auditElements.auditCount.textContent = "0";
    return;
  }

  filteredTrails.forEach((trail) => {
    const tr = document.createElement("tr");

    const actionClass = trail.action.toLowerCase();

    tr.innerHTML = `
      <td>${trail.id}</td>
      <td><span class="audit-cell-action ${actionClass}">${trail.action}</span></td>
      <td>${trail.tableName}</td>
      <td>${trail.recordId}</td>
      <td>${trail.userEmail || "N/A"}</td>
      <td class="department-table-meta">${new Date(trail.createdAt).toLocaleString()}</td>
      <td class="department-table-actions">
        <button class="table-action-btn ghost-button" onclick="showAuditDetails(${trail.id})">
          View Details
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  auditElements.auditCount.textContent = filteredTrails.length;
}

function renderPagination() {
  const pagination = auditState.pagination;
  if (!pagination || pagination.totalPages <= 1) {
    auditElements.auditPagination.hidden = true;
    return;
  }

  auditElements.auditPagination.hidden = false;
  auditElements.pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
  auditElements.prevPage.disabled = pagination.page <= 1;
  auditElements.nextPage.disabled = pagination.page >= pagination.totalPages;
}

function showAuditDetails(id) {
  const trail = auditState.auditTrails.find((t) => t.id === id);
  if (!trail) return;

  auditElements.auditDetailTitle.textContent = `Audit Trail #${trail.id} - ${trail.action} ${trail.tableName}`;
  auditElements.auditOldData.textContent = trail.oldData
    ? JSON.stringify(JSON.parse(trail.oldData), null, 2)
    : "N/A";
  auditElements.auditNewData.textContent = trail.newData
    ? JSON.stringify(JSON.parse(trail.newData), null, 2)
    : "N/A";

  auditElements.auditDetailModal.classList.remove("hidden");
}

function closeAuditDetailModal() {
  auditElements.auditDetailModal.classList.add("hidden");
}

// Event listeners
auditElements.prevPage.addEventListener("click", () => {
  if (auditState.currentPage > 1) {
    loadAuditTrails(auditState.currentPage - 1);
  }
});

auditElements.nextPage.addEventListener("click", () => {
  if (
    auditState.pagination &&
    auditState.currentPage < auditState.pagination.totalPages
  ) {
    loadAuditTrails(auditState.currentPage + 1);
  }
});

auditElements.closeAuditDetailModal.addEventListener(
  "click",
  closeAuditDetailModal,
);

auditElements.auditDetailModal.addEventListener("click", (e) => {
  if (e.target === auditElements.auditDetailModal) {
    closeAuditDetailModal();
  }
});

function openFilterDrawer() {
  auditElements.auditFilterDrawer.classList.remove("hidden");
  auditElements.auditFilterDrawer.classList.add("open");
  auditElements.auditFilterBackdrop.classList.add("open");
  auditElements.auditFilterBackdrop.classList.remove("hidden");
  auditElements.auditFilterDrawer.setAttribute("aria-hidden", "false");
}

function closeFilterDrawer() {
  auditElements.auditFilterDrawer.classList.remove("open");
  auditElements.auditFilterBackdrop.classList.remove("open");
  auditElements.auditFilterDrawer.classList.add("hidden");
  auditElements.auditFilterBackdrop.classList.add("hidden");
  auditElements.auditFilterDrawer.setAttribute("aria-hidden", "true");
}

// Filter event listeners
if (auditElements.auditOpenFiltersBtn) {
  auditElements.auditOpenFiltersBtn.addEventListener("click", openFilterDrawer);
}

if (auditElements.auditCloseFiltersBtn) {
  auditElements.auditCloseFiltersBtn.addEventListener(
    "click",
    closeFilterDrawer,
  );
}

if (auditElements.auditFilterBackdrop) {
  auditElements.auditFilterBackdrop.addEventListener(
    "click",
    closeFilterDrawer,
  );
}

auditElements.auditIdFilter.addEventListener("input", (e) => {
  auditState.filters.id = e.target.value.trim();
  auditState.currentPage = 1; // Reset to first page
});

auditElements.auditRecordIdFilter.addEventListener("input", (e) => {
  auditState.filters.recordId = e.target.value.trim();
  auditState.currentPage = 1; // Reset to first page
});

auditElements.auditTableFilter.addEventListener("change", (e) => {
  auditState.filters.table = e.target.value;
  auditState.currentPage = 1; // Reset to first page
});

auditElements.auditActionFilter.addEventListener("change", (e) => {
  auditState.filters.actionType = e.target.value;
  auditState.currentPage = 1;
});

auditElements.auditStartDateFilter.addEventListener("change", (e) => {
  auditState.filters.startDate = e.target.value;
  auditState.currentPage = 1;
});

auditElements.auditEndDateFilter.addEventListener("change", (e) => {
  auditState.filters.endDate = e.target.value;
  auditState.currentPage = 1;
});

auditElements.auditSearchFilter.addEventListener("input", (e) => {
  auditState.filters.search = e.target.value;
  auditState.currentPage = 1; // Reset to first page
});

auditElements.auditUserFilter.addEventListener("change", (e) => {
  auditState.filters.userId = e.target.value;
  auditState.currentPage = 1; // Reset to first page
});

auditElements.auditApplyFilters.addEventListener("click", async () => {
  auditState.currentPage = 1;
  await loadAuditTrails(1);
  closeFilterDrawer();
});

auditElements.auditClearFilters.addEventListener("click", () => {
  auditState.filters.id = "";
  auditState.filters.recordId = "";
  auditState.filters.table = "";
  auditState.filters.search = "";
  auditState.filters.userId = "";
  auditState.filters.actionType = "";
  auditState.filters.startDate = "";
  auditState.filters.endDate = "";
  auditElements.auditIdFilter.value = "";
  auditElements.auditRecordIdFilter.value = "";
  auditElements.auditTableFilter.value = "";
  auditElements.auditSearchFilter.value = "";
  auditElements.auditUserFilter.value = "";
  auditElements.auditActionFilter.value = "";
  auditElements.auditStartDateFilter.value = "";
  auditElements.auditEndDateFilter.value = "";
  auditState.currentPage = 1;
  loadAuditTrails(1);
});

if (auditElements.signoutBtn) {
  auditElements.signoutBtn.addEventListener("click", signOut);
}

// Settings modal handlers
const closeSettingsBtn = document.getElementById("close-settings-modal");
const settingsModal = document.getElementById("settings-modal");
const signoutModalBtn = document.getElementById("signout-modal-btn");

if (closeSettingsBtn && settingsModal) {
  closeSettingsBtn.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
  });
}

if (settingsModal) {
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.add("hidden");
    }
  });
}

if (signoutModalBtn) {
  signoutModalBtn.addEventListener("click", signOut);
}

// Initialize
async function initAuditPage() {
  await loadProfile();
  await loadUsers();
  await loadAuditTrails();
}

window.addEventListener("DOMContentLoaded", initAuditPage);
