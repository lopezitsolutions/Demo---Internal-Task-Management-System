/**
 * ITWMS Main Shared Logic
 * Handles sidebar, authentication, and role-based visibility
 */

function initSidebar() {
  const sidebarLinks = document.querySelectorAll(".sidebar-menu a");
  const currentPath = window.location.pathname;

  sidebarLinks.forEach((link) => {
    // Remove active class
    link.classList.remove("active");

    // Add active class to current page
    const href = link.getAttribute("href");
    if (href && href !== "#" && currentPath.includes(href)) {
      link.classList.add("active");
    }
  });

  // Special case for dashboard
  if (currentPath.includes("dashboard.html") || currentPath.endsWith("/")) {
    const dashLink =
      document.querySelector('a[href="dashboard.html"]') ||
      document.getElementById("sidebar-dashboard");
    if (dashLink) dashLink.classList.add("active");
  }
}

function setupMobileToggle() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  // Create overlay if it doesn't exist
  let overlay = document.querySelector(".sidebar-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
  }

  // Handle toggle button clicks
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest(".menu-toggle");
    const closeBtn = e.target.closest(".sidebar-close");

    if (toggle) {
      sidebar.classList.toggle("open");
      overlay.classList.toggle("visible");
    } else if (closeBtn) {
      sidebar.classList.remove("open");
      overlay.classList.remove("visible");
    } else if (
      overlay.classList.contains("visible") &&
      !e.target.closest(".sidebar")
    ) {
      sidebar.classList.remove("open");
      overlay.classList.remove("visible");
    }
  });
}

function updateSidebarUser(profile) {
  const sidebarUsername = document.getElementById("sidebar-username");
  if (!sidebarUsername) return;

  let user = profile;
  if (!user) {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } else {
    // If profile is provided, save it to localStorage for other components
    localStorage.setItem("user", JSON.stringify(profile));
  }

  sidebarUsername.textContent =
    user.nickname || user.name || user.username || "User";

  const userRoleLabel =
    typeof user.role === "object" && user.role?.name
      ? user.role.name
      : user.role;

  // Also apply role visibility if profile is available
  if (user.roleName || userRoleLabel) {
    if (typeof window.applyRoleBasedVisibility === "function") {
      window.applyRoleBasedVisibility();
    } else {
      applyRoleVisibility(user.roleName || userRoleLabel);
    }
  }
}

function applyRoleVisibility(role) {
  if (typeof window.applyRoleBasedVisibility === "function") {
    window.applyRoleBasedVisibility();
    return;
  }

  if (!role) {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    role = user.roleName || user.role?.name || "Employee";
  }

  console.log(`[applyRoleVisibility] Applying visibility for role: ${role}`);

  document.querySelectorAll(".admin-only").forEach((node) => {
    node.classList.toggle("hidden", role !== "Admin");
  });
  document.querySelectorAll(".manager-only").forEach((node) => {
    node.classList.toggle("hidden", role !== "Admin" && role !== "Manager");
  });
  document.querySelectorAll(".employee-only").forEach((node) => {
    node.classList.toggle("hidden", role !== "Employee");
  });
}

// Settings modal handling
function openSettingsModal() {
  const settingsModal = document.getElementById("settings-modal");
  if (!settingsModal) return;

  // Populate modal with current profile data from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const modalAccountName = document.getElementById("modal-account-name");
  const modalAccountEmail = document.getElementById("modal-account-email");
  const modalAccountRole = document.getElementById("modal-account-role");
  const modalAccountDepartment = document.getElementById(
    "modal-account-department",
  );

  if (modalAccountName)
    modalAccountName.textContent = user.nickname || user.name || "Unknown";
  if (modalAccountEmail)
    modalAccountEmail.textContent = user.email || "No email";
  if (modalAccountRole)
    modalAccountRole.textContent =
      user.roleName || user.role?.name || "Unknown";
  if (modalAccountDepartment)
    modalAccountDepartment.textContent =
      user.depName || user.department?.name || "Unassigned";

  settingsModal.classList.remove("hidden");
}

function closeSettingsModal() {
  const settingsModal = document.getElementById("settings-modal");
  if (settingsModal) {
    settingsModal.classList.add("hidden");
  }
}

function createResetModalIfMissing() {
  let resetModal = document.getElementById("reset-modal");
  if (resetModal) return resetModal;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div id="reset-modal" class="modal hidden">
      <div class="modal-content">
        <div class="modal-header">
          <h4>Reset Password</h4>
          <button id="close-reset-modal" class="close-button">&times;</button>
        </div>
        <form id="reset-password-form">
          <label>
            Email
            <input type="text" name="identifier" required />
          </label>
          <p class="help-text">
            Enter your email address to receive a reset link.
          </p>
          <div class="modal-actions">
            <button type="button" id="cancel-reset" class="ghost-button">
              Cancel
            </button>
            <button type="submit" class="primary-button">
              Send reset link
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  resetModal = wrapper.firstElementChild;
  if (resetModal) {
    document.body.appendChild(resetModal);
  }
  return resetModal;
}

function openResetModal() {
  let resetModal = document.getElementById("reset-modal");
  if (!resetModal) {
    resetModal = createResetModalIfMissing();
  }
  if (!resetModal) return;
  resetModal.classList.remove("hidden");
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
    closeResetModal();
  } catch (error) {
    alert(
      "Failed to send password reset link: " +
        (error?.message || "Please try again later."),
    );
  }
}

function closeResetModal() {
  const resetModal = document.getElementById("reset-modal");
  if (resetModal) {
    resetModal.classList.add("hidden");
  }
}

function setupSettingsLink() {
  document.addEventListener("click", (e) => {
    const settingsLink = e.target.closest("#sidebar-settings");
    if (settingsLink) {
      e.preventDefault();
      const currentPath = window.location.pathname;
      if (!currentPath.includes("settings.html")) {
        openSettingsModal();
      }
      return;
    }

    if (e.target.matches("#close-settings-modal")) {
      closeSettingsModal();
    }

    const settingsModal = document.getElementById("settings-modal");
    if (settingsModal && e.target === settingsModal) {
      closeSettingsModal();
    }

    const resetPasswordBtn = document.getElementById("reset-password-btn");
    if (e.target.matches("#reset-password-btn") && resetPasswordBtn) {
      e.preventDefault();
      openResetModal();
      return;
    }

    if (
      e.target.matches("#close-reset-modal") ||
      e.target.matches("#cancel-reset")
    ) {
      closeResetModal();
    }

    const resetModal = document.getElementById("reset-modal");
    if (resetModal && e.target === resetModal) {
      closeResetModal();
    }
  });

  if (!document.getElementById("reset-password-form")) {
    createResetModalIfMissing();
  }
  const resetPasswordForm = document.getElementById("reset-password-form");
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", handleForgotPasswordSubmit);
  }
}

// Add to DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  initSidebar();
  updateSidebarUser();
  applyRoleVisibility();
  setupMobileToggle();
  setupSettingsLink();

  // Initialize RBAC system
  if (typeof initRBAC === "function") {
    initRBAC();
  } else {
    console.warn(
      "[main.js] RBAC system not loaded. Make sure rbac.js is included before main.js",
    );
  }
});

// Make it globally accessible
window.applyRoleVisibility = applyRoleVisibility;
window.initRBAC =
  typeof initRBAC !== "undefined"
    ? initRBAC
    : () => console.warn("RBAC not loaded");

// Global logout function
window.itwmsLogout = function () {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
  window.location.replace("/index.html");
};

// Fetch utilities
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
      (responseText.includes("Database")
        ? "Server database connection error."
        : "Request failed");
    throw new Error(message);
  }

  const result = payload?.data ?? payload ?? {};
  console.log("[fetchJson] Returning:", result);
  return result;
}
