/**
 * Role-Based Access Control (RBAC) System
 * Manages user permissions based on roles: Admin, Manager, Employee
 */

// Role definitions
const ROLES = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

// Permissions matrix - defines what each role can do
const PERMISSIONS = {
  [ROLES.ADMIN]: {
    modules: [
      "dashboard",
      "users",
      "department",
      "tasks",
      "notes",
      "audit",
      "settings",
      "create-issue",
    ],
    users: {
      view: true,
      create: true,
      edit: true,
      delete: true,
    },
    departments: {
      view: true,
      create: true,
      edit: true,
      delete: true,
    },
    tasks: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      assign: true,
      viewAll: true,
    },
    notes: {
      view: true,
      create: true,
      edit: true,
      delete: true,
    },
    audit: {
      view: true,
    },
    settings: {
      view: true,
      edit: true,
    },
  },
  [ROLES.MANAGER]: {
    modules: ["dashboard", "tasks", "notes", "department", "settings"],
    users: {
      view: false,
      create: false,
      edit: false,
      delete: false,
    },
    departments: {
      view: true,
      create: false,
      edit: false,
      delete: false,
    },
    tasks: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      assign: true,
      viewAll: true,
    },
    notes: {
      view: true,
      create: true,
      edit: true,
      delete: true,
    },
    audit: {
      view: false,
    },
    settings: {
      view: true,
      edit: false,
    },
  },
  [ROLES.EMPLOYEE]: {
    modules: ["dashboard", "tasks", "settings", "notes"],
    users: {
      view: false,
      create: false,
      edit: false,
      delete: false,
    },
    departments: {
      view: false,
      create: false,
      edit: false,
      delete: false,
    },
    tasks: {
      view: true,
      create: false,
      edit: false,
      delete: false,
      assign: false,
      viewAll: false, // Employees only see assigned tasks
      updateStatus: true,
    },
    notes: {
      view: true,
      create: false,
      edit: false,
      delete: false,
    },
    audit: {
      view: false,
    },
    settings: {
      view: true,
      edit: false,
    },
  },
};

const MODULE_BY_PAGE = {
  "dashboard.html": "dashboard",
  "users.html": "users",
  "department.html": "department",
  "tasks.html": "tasks",
  "notes.html": "notes",
  "audit.html": "audit",
  "settings.html": "settings",
  "create-issue.html": "create-issue",
};

const ROLE_HOME_PAGE = {
  [ROLES.ADMIN]: "/assets/html/dashboard.html",
  [ROLES.MANAGER]: "/assets/html/dashboard.html",
  [ROLES.EMPLOYEE]: "/assets/html/tasks.html",
};

const PUBLIC_PAGES = ["index.html"];

function normalizeRoleValue(roleValue) {
  if (!roleValue) return ROLES.EMPLOYEE;
  if (typeof roleValue === "string") return roleValue.trim();
  if (typeof roleValue === "object") {
    if (roleValue.name) return String(roleValue.name).trim();
    if (roleValue.id) return String(roleValue.id).trim();
  }
  return ROLES.EMPLOYEE;
}

function getAuthToken() {
  return localStorage.getItem("authToken");
}

function isAuthenticated() {
  return Boolean(getAuthToken() && getCurrentUser());
}

function redirectToLogin() {
  window.location.replace("/index.html");
}

function redirectToRoleHomepage() {
  const role = getCurrentRole();
  const target = ROLE_HOME_PAGE[role] || "/assets/html/dashboard.html";
  window.location.replace(target);
}

function getCurrentPageModule() {
  const path = window.location.pathname.split("/").pop();
  return MODULE_BY_PAGE[path] || null;
}

function getAccessibleSidebarLinks() {
  const role = getCurrentRole();
  const rolePerms = PERMISSIONS[role];
  return rolePerms ? rolePerms.modules : [];
}

function requireAuth() {
  if (!isAuthenticated()) {
    console.warn("[RBAC] Not authenticated. Redirecting to login.");
    redirectToLogin();
    return false;
  }
  return true;
}

function ensurePageAccess() {
  const currentPage = window.location.pathname.split("/").pop();
  if (PUBLIC_PAGES.includes(currentPage)) {
    return true;
  }

  if (!requireAuth()) {
    return false;
  }

  const module = getCurrentPageModule();
  if (!module) {
    return true;
  }
  if (!canAccessModule(module)) {
    showAccessDenied(`Your role cannot access the ${module} page.`);
    redirectToRoleHomepage();
    return false;
  }
  return true;
}

function canManageTasks() {
  return hasPermission("tasks", "edit") || hasPermission("tasks", "assign");
}

function canViewTeamData() {
  return getCurrentRole() === ROLES.ADMIN || getCurrentRole() === ROLES.MANAGER;
}

function canEditNotes() {
  return hasPermission("notes", "edit");
}

function validateToken() {
  return Boolean(getAuthToken());
}

/**
 * Get current user from localStorage
 * @returns {Object} User object with role info
 */
function getCurrentUser() {
  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.error("Error parsing user from localStorage:", e);
    return null;
  }
}

/**
 * Get current user's role
 * @returns {string} Role name (Admin, Manager, Employee)
 */
function getCurrentRole() {
  const user = getCurrentUser();
  if (!user) return ROLES.EMPLOYEE;

  if (user.role) {
    return normalizeRoleValue(user.role);
  }

  return normalizeRoleValue(user.roleName || user.role || ROLES.EMPLOYEE);
}

/**
 * Get current user's role ID
 * @returns {number|null} Role ID
 */
function getCurrentRoleId() {
  const user = getCurrentUser();
  if (!user) return null;

  // Handle new structure: user.role.id
  if (user.role && typeof user.role === "object" && user.role.id) {
    return user.role.id;
  }

  return null;
}

/**
 * Get current user's department ID
 * @returns {number} Department ID
 */
function getCurrentDepartmentId() {
  const user = getCurrentUser();
  if (!user) return null;

  // Handle new structure: user.department.id
  if (
    user.department &&
    typeof user.department === "object" &&
    user.department.id
  ) {
    return user.department.id;
  }

  return null;
}

/**
 * Check if user has a specific permission
 * @param {string} resource - Resource type (users, departments, tasks, notes, audit, settings)
 * @param {string} action - Action (view, create, edit, delete, etc.)
 * @returns {boolean} True if user has permission
 */
function hasPermission(resource, action) {
  const role = getCurrentRole();
  const rolePerms = PERMISSIONS[role];

  if (!rolePerms || !rolePerms[resource]) {
    return false;
  }

  return rolePerms[resource][action] === true;
}

/**
 * Check if user can access a specific module
 * @param {string} module - Module name (dashboard, users, tasks, etc.)
 * @returns {boolean} True if user has access to module
 */
function canAccessModule(module) {
  const role = getCurrentRole();
  const rolePerms = PERMISSIONS[role];
  return rolePerms && rolePerms.modules.includes(module);
}

/**
 * Check if user can perform an action on a resource
 * @param {string} resource - Resource type
 * @param {string} action - Action to perform
 * @returns {boolean} True if user has permission
 */
function checkPermission(resource, action) {
  const hasAccess = hasPermission(resource, action);
  if (!hasAccess) {
    console.warn(
      `[RBAC] Access denied: ${getCurrentRole()} cannot ${action} ${resource}`,
    );
  }
  return hasAccess;
}

/**
 * Apply role-based visibility to DOM elements
 * Uses data attributes: data-role="admin", data-role="manager", data-role="employee"
 * or classes: admin-only, manager-only, employee-only
 */
function applyRoleBasedVisibility() {
  const role = getCurrentRole();

  // Handle data-role attributes
  document.querySelectorAll("[data-role]").forEach((element) => {
    const allowedRoles = element
      .getAttribute("data-role")
      .split(",")
      .map((r) => r.trim());
    const isVisible = allowedRoles.includes(role);
    element.classList.toggle("hidden", !isVisible);
  });

  // Handle classes (legacy)
  document.querySelectorAll(".admin-only").forEach((element) => {
    element.classList.toggle("hidden", role !== ROLES.ADMIN);
  });

  document.querySelectorAll(".manager-only").forEach((element) => {
    element.classList.toggle(
      "hidden",
      role !== ROLES.ADMIN && role !== ROLES.MANAGER,
    );
  });

  document.querySelectorAll(".employee-only").forEach((element) => {
    element.classList.toggle("hidden", role !== ROLES.EMPLOYEE);
  });

  // Hide unavailable modules
  document.querySelectorAll("[data-module]").forEach((element) => {
    const module = element.getAttribute("data-module");
    const hasAccess = canAccessModule(module);
    element.classList.toggle("hidden", !hasAccess);
  });
}

/**
 * Show an access denied message
 * @param {string} message - Optional custom message
 */
function showAccessDenied(message = "Access Denied") {
  console.warn(`[RBAC] ${message}`);
  alert(
    `${message}. Your role does not have permission to perform this action.`,
  );
}

/**
 * Disable/enable form controls based on permissions
 * @param {string} resource - Resource type
 * @param {string} action - Action to check
 * @param {HTMLElement} element - Element to enable/disable
 */
function setButtonPermission(resource, action, element) {
  if (!element) return;

  const hasAccess = hasPermission(resource, action);
  element.disabled = !hasAccess;
  element.classList.toggle("disabled", !hasAccess);

  if (!hasAccess) {
    element.title = `Your role does not have permission to ${action} this item`;
  }
}

/**
 * Filter array of items based on user's visibility
 * For employees: only return items assigned to them
 * For managers: return items where assignee is in their department
 * @param {Array} items - Items to filter
 * @param {string} assigneeField - Field name containing assignee info (default: 'assignedTo')
 * @param {Array} users - Optional array of users for department lookup
 * @returns {Array} Filtered items
 */
function filterItemsByRole(items, assigneeField = "assignedTo", users = []) {
  const role = getCurrentRole();
  const user = getCurrentUser();
  const departmentId = getCurrentDepartmentId();

  if (role === ROLES.EMPLOYEE && user?.id) {
    // Employees only see tasks assigned to them
    return items.filter(
      (item) =>
        item[assigneeField] === user.id ||
        item[assigneeField]?.id === user.id ||
        item[assigneeField]?.toString() === user.id?.toString(),
    );
  }

  if (role === ROLES.MANAGER && departmentId && users.length > 0) {
    // Managers see items assigned to users in their department
    const departmentUserIds = users
      .filter(
        (u) => u.depId === departmentId || u.departmentId === departmentId,
      )
      .map((u) => u.id);

    return items.filter((item) => {
      const assigneeId = item[assigneeField]?.id || item[assigneeField];
      return (
        departmentUserIds.includes(assigneeId) ||
        departmentUserIds.includes(parseInt(assigneeId)) ||
        departmentUserIds.includes(String(assigneeId))
      );
    });
  }

  // Admins see all items
  return items;
}

/**
 * Check if user can update the status of a specific task
 * @param {Object} task - Task object
 * @returns {boolean} True if user can update status
 */
function canUpdateTaskStatus(task) {
  const role = getCurrentRole();
  const user = getCurrentUser();

  if (role === ROLES.ADMIN || role === ROLES.MANAGER) {
    return true;
  }

  if (role === ROLES.EMPLOYEE && user?.id) {
    // Employees can only update status of tasks assigned to them
    return (
      task.assignedTo === user.id ||
      task.assignedTo?.id === user.id ||
      String(task.assignedTo) === String(user.id)
    );
  }

  return false;
}

/**
 * Update sidebar visibility based on role
 */
function updateSidebarByRole() {
  const accessibleModules = getAccessibleSidebarLinks();

  const sidebarLinks = {
    dashboard: "sidebar-dashboard",
    users: "sidebar-users",
    department: "sidebar-department",
    tasks: "sidebar-tasks",
    notes: "sidebar-notes",
    audit: "sidebar-audit",
    settings: "sidebar-settings",
    "create-issue": "sidebar-create-issue",
  };

  Object.entries(sidebarLinks).forEach(([module, elementId]) => {
    const element = document.getElementById(elementId);
    if (element) {
      const isAccessible = accessibleModules.includes(module);
      element.closest("li")?.classList.toggle("hidden", !isAccessible);
    }
  });
}

/**
 * Initialize RBAC system on page load
 */
function initRBAC() {
  console.log(`[RBAC] Initializing for role: ${getCurrentRole()}`);
  if (!ensurePageAccess()) {
    return;
  }
  applyRoleBasedVisibility();
  updateSidebarByRole();
}

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRBAC);
} else {
  initRBAC();
}

// Export for use in modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ROLES,
    PERMISSIONS,
    getCurrentUser,
    getCurrentRole,
    hasPermission,
    canAccessModule,
    checkPermission,
    applyRoleBasedVisibility,
    showAccessDenied,
    setButtonPermission,
    filterItemsByRole,
    getAccessibleSidebarLinks,
    updateSidebarByRole,
    initRBAC,
  };
}
