const settingsElements = {
  accountName: document.getElementById("account-name"),
  accountEmail: document.getElementById("account-email"),
  accountRole: document.getElementById("account-role"),
  accountDepartment: document.getElementById("account-department"),
  sidebarUsername: document.getElementById("sidebar-username"),
  signoutBtn: document.getElementById("signout-btn"),
  signoutBottomBtn: document.getElementById("signout-bottom-btn"),
  resetPasswordBtn: document.getElementById("reset-password-btn"),
  resetModal: document.getElementById("reset-modal"),
  cancelReset: document.getElementById("cancel-reset"),
  resetPasswordForm: document.getElementById("reset-password-form"),
};

function getAuthHeaders() {
  const token = localStorage.getItem("authToken");
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

const debugMode =
  new URLSearchParams(window.location.search).get("debug") === "1";

function apiPath(path) {
  if (
    typeof window !== "undefined" &&
    typeof window.itwmsApiPath === "function"
  ) {
    return window.itwmsApiPath(path);
  }
  return path.startsWith("/") ? path : `/${path}`;
}

async function fetchJson(url, options = {}) {
  console.log("[settings.js] fetchJson:", url, options);
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  console.log("[settings.js] Response status:", response.status);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    console.error("[settings.js] Error response:", payload);
    throw new Error(payload.message || `Request failed: ${response.status}`);
  }

  const payload = await response.json().catch(() => ({}));
  return payload.data ?? payload;
}

function formatDisplayName(profile) {
  return (
    profile.nickname ||
    profile.name ||
    profile.username ||
    profile.email ||
    "User"
  );
}

function updateAccountInfo(profile) {
  const displayName = formatDisplayName(profile);

  if (settingsElements.accountName) {
    settingsElements.accountName.textContent =
      profile.nickname || profile.name || profile.username || "Unknown User";
  }
  if (settingsElements.accountEmail) {
    settingsElements.accountEmail.textContent = profile.email || "No email";
  }
  if (settingsElements.accountRole) {
    settingsElements.accountRole.textContent =
      profile.role?.name || profile.roleName || "Unknown";
  }

  if (settingsElements.accountDepartment) {
    settingsElements.accountDepartment.textContent =
      profile.department?.name || profile.depName || "Unassigned";
  }
  if (settingsElements.sidebarUsername) {
    settingsElements.sidebarUsername.textContent =
      profile.nickname || profile.name || profile.username || "User";
  }
}

function setSidebarActiveState() {
  const currentPath = window.location.pathname;
  const sidebarLinks = document.querySelectorAll(".sidebar-menu a");

  sidebarLinks.forEach((link) => {
    link.classList.remove("active");
  });

  if (currentPath.includes("dashboard.html") || currentPath.endsWith("/")) {
    const dashboardLink = document.getElementById("sidebar-tasks");
    if (dashboardLink) dashboardLink.classList.add("active");
  } else if (currentPath.includes("department.html")) {
    const departmentLink = document.getElementById("sidebar-departments");
    if (departmentLink) departmentLink.classList.add("active");
  } else if (currentPath.includes("settings.html")) {
    const settingsLink = document.getElementById("sidebar-settings");
    if (settingsLink) settingsLink.classList.add("active");
  }
}

function signOut() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
  window.location.replace("/index.html");
}

function showResetModal() {
  settingsElements.resetModal?.classList.remove("hidden");
}

function hideResetModal() {
  settingsElements.resetModal?.classList.add("hidden");
}

function buildPasswordResetPayload(identifier) {
  const trimmed = String(identifier || "").trim();
  return trimmed.includes("@") ? { email: trimmed } : { username: trimmed };
}

async function handleForgotPasswordSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const identifier = String(form.identifier?.value || "").trim();

  if (!identifier) {
    alert("Please enter your email address or username.");
    return;
  }

  try {
    const result = await fetchJson(apiPath("/api/auth/forgot-password"), {
      method: "POST",
      body: JSON.stringify(buildPasswordResetPayload(identifier)),
    });
    const message =
      result?.message || "If the email exists, a reset link was sent";
    alert(message);
    form.reset();
    hideResetModal();
  } catch (error) {
    alert(
      "Failed to send password reset link: " +
        (error?.message || "Please try again later."),
    );
  }
}

async function loadSettings() {
  try {
    const profile = await fetchJson(apiPath("/api/auth/me"));
    updateAccountInfo(profile);
    setSidebarActiveState();
  } catch (error) {
    console.error("Settings load failed:", error);

    if (debugMode) {
      console.warn(
        "[settings.js] DEBUG MODE - loading cached user from localStorage.",
      );
      const cachedUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (cachedUser && Object.keys(cachedUser).length > 0) {
        updateAccountInfo(cachedUser);
        return;
      }
    }

    window.location.replace("/index.html");
  }
}

function initSettingsPage() {
  if (settingsElements.signoutBtn) {
    settingsElements.signoutBtn.addEventListener("click", signOut);
  }
  if (settingsElements.signoutBottomBtn) {
    settingsElements.signoutBottomBtn.addEventListener("click", signOut);
  }
  if (settingsElements.resetPasswordBtn) {
    settingsElements.resetPasswordBtn.addEventListener("click", showResetModal);
  }
  if (settingsElements.cancelReset) {
    settingsElements.cancelReset.addEventListener("click", hideResetModal);
  }
  if (settingsElements.resetPasswordForm) {
    settingsElements.resetPasswordForm.addEventListener(
      "submit",
      handleForgotPasswordSubmit,
    );
  }

  loadSettings();
}

window.addEventListener("DOMContentLoaded", initSettingsPage);
