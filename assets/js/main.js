/**
 * ITWMS Main Shared Logic v2.0
 * Enhanced sidebar, authentication, role-based visibility, and accessibility
 */

(function() {
  "use strict";

  // ===== Mobile Sidebar Toggle =====
  function initSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const menuToggle = document.querySelector(".menu-toggle");
    const sidebarClose = document.querySelector(".sidebar-close");
    const overlay = document.querySelector(".sidebar-overlay");

    if (!sidebar || !menuToggle) return;

    function openSidebar() {
      sidebar.classList.add("open");
      if (overlay) overlay.classList.add("visible");
      menuToggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";

      // Focus trap for accessibility
      const focusableElements = sidebar.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length) {
        focusableElements[0].focus();
      }
    }

    function closeSidebar() {
      sidebar.classList.remove("open");
      if (overlay) overlay.classList.remove("visible");
      menuToggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      menuToggle.focus();
    }

    menuToggle.addEventListener("click", () => {
      if (sidebar.classList.contains("open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    if (sidebarClose) {
      sidebarClose.addEventListener("click", closeSidebar);
    }

    if (overlay) {
      overlay.addEventListener("click", closeSidebar);
    }

    // Close on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sidebar.classList.contains("open")) {
        closeSidebar();
      }
    });

    // Close when clicking a link (mobile)
    sidebar.querySelectorAll("a[href]").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
          closeSidebar();
        }
      });
    });
  }

  // ===== Active Sidebar State =====
  function setSidebarActiveState() {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split("/").pop() || "dashboard.html";

    document.querySelectorAll(".sidebar-menu a").forEach((link) => {
      link.classList.remove("active");
      const href = link.getAttribute("href");
      if (href && currentPage.includes(href)) {
        link.classList.add("active");
      }
    });
  }

  // ===== User Profile in Sidebar =====
  function updateSidebarUser(profile) {
    const usernameEl = document.getElementById("sidebar-username");
    const userRoleEl = document.getElementById("sidebar-user-role");
    const userAvatarEl = document.getElementById("sidebar-user-avatar");

    let user = profile;
    if (!user) {
      try {
        user = JSON.parse(localStorage.getItem("user") || "{}");
      } catch {
        user = {};
      }
    }

    const name = user.nickname || user.name || user.username || "User";
    const role = user.roleName || (user.role && user.role.name) || "Employee";
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    if (usernameEl) usernameEl.textContent = name;
    if (userRoleEl) userRoleEl.textContent = role;
    if (userAvatarEl) userAvatarEl.textContent = initials;

    // Save to localStorage
    if (profile) {
      localStorage.setItem("user", JSON.stringify(profile));
    }

    // Apply role visibility
    const roleName = user.roleName || (user.role && user.role.name);
    if (roleName) {
      applyRoleVisibility(roleName);
    }
  }

  // ===== Role-Based Visibility =====
  function applyRoleVisibility(role) {
    if (!role) {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        role = user.roleName || (user.role && user.role.name) || "Employee";
      } catch {
        role = "Employee";
      }
    }

    const isAdmin = role === "Admin";
    const isManager = role === "Manager";
    const isEmployee = role === "Employee";

    // Handle .admin-only elements
    document.querySelectorAll(".admin-only").forEach((el) => {
      el.classList.toggle("hidden", !isAdmin);
    });

    // Handle .manager-only elements
    document.querySelectorAll(".manager-only").forEach((el) => {
      el.classList.toggle("hidden", !isAdmin && !isManager);
    });

    // Handle .employee-only elements
    document.querySelectorAll(".employee-only").forEach((el) => {
      el.classList.toggle("hidden", !isEmployee);
    });

    // Handle data-role attributes
    document.querySelectorAll("[data-role]").forEach((el) => {
      const allowedRoles = el.dataset.role.split(",").map((r) => r.trim());
      el.classList.toggle("hidden", !allowedRoles.includes(role));
    });
  }

  // ===== Settings Modal =====
  function initSettingsModal() {
    const settingsModal = document.getElementById("settings-modal");
    if (!settingsModal) return;

    const closeBtn = document.getElementById("close-settings-modal");
    const signoutBtn = document.getElementById("signout-modal-btn");
    const resetPasswordBtn = document.getElementById("reset-password-btn");

    function openSettings() {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      document.getElementById("modal-account-name").textContent = 
        user.nickname || user.name || "Unknown";
      document.getElementById("modal-account-email").textContent = 
        user.email || "No email";
      document.getElementById("modal-account-role").textContent = 
        user.roleName || (user.role && user.role.name) || "Unknown";
      document.getElementById("modal-account-department").textContent = 
        user.depName || (user.department && user.department.name) || "Unassigned";

      settingsModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }

    function closeSettings() {
      settingsModal.classList.add("hidden");
      document.body.style.overflow = "";
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", closeSettings);
    }

    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) closeSettings();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !settingsModal.classList.contains("hidden")) {
        closeSettings();
      }
    });

    if (signoutBtn) {
      signoutBtn.addEventListener("click", () => {
        itwmsLogout();
      });
    }

    if (resetPasswordBtn) {
      resetPasswordBtn.addEventListener("click", () => {
        closeSettings();
        openResetModal();
      });
    }

    // Settings button in sidebar
    const sidebarSettingsBtn = document.getElementById("sidebar-settings-btn");
    if (sidebarSettingsBtn) {
      sidebarSettingsBtn.addEventListener("click", openSettings);
    }
  }

  // ===== Reset Password Modal =====
  function initResetModal() {
    const resetModal = document.getElementById("reset-modal");
    if (!resetModal) return;

    const closeBtn = document.getElementById("close-reset-modal");
    const cancelBtn = document.getElementById("cancel-reset");
    const form = document.getElementById("reset-password-form");

    function closeReset() {
      resetModal.classList.add("hidden");
      document.body.style.overflow = "";
      if (form) form.reset();
    }

    if (closeBtn) closeBtn.addEventListener("click", closeReset);
    if (cancelBtn) cancelBtn.addEventListener("click", closeReset);

    resetModal.addEventListener("click", (e) => {
      if (e.target === resetModal) closeReset();
    });

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const identifier = form.querySelector('[name="identifier"]')?.value?.trim();
        if (!identifier) return;

        try {
          const payload = identifier.includes("@") 
            ? { email: identifier } 
            : { username: identifier };

          await fetchJson(apiPath("/api/auth/forgot-password"), {
            method: "POST",
            body: JSON.stringify(payload),
          });

          showNotification("success", "Reset link sent to your email");
          closeReset();
        } catch (error) {
          showNotification("error", error.message || "Failed to send reset link");
        }
      });
    }
  }

  function openResetModal() {
    const resetModal = document.getElementById("reset-modal");
    if (resetModal) {
      resetModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  }

  // ===== Sign Out =====
  function itwmsLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("refreshToken");
    window.location.replace("/index.html");
  }

  // ===== Fetch Utilities =====
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
      const msg = json && typeof json === "object" ? json.message || json.error : null;
      throw new Error(
        (typeof msg === "string" && msg) || `Request failed with status ${response.status}`
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

  function apiPath(path) {
    if (typeof window !== "undefined" && typeof window.itwmsApiPath === "function") {
      return window.itwmsApiPath(path);
    }
    const normalized = path.startsWith("/") ? path : `/${path}`;
    if (typeof window !== "undefined" && window.__API_BASE__) {
      const base = String(window.__API_BASE__).replace(/\/$/, "");
      return `${base}${normalized}`;
    }
    return normalized;
  }

  // ===== Notification System =====
  function showNotification(type, message) {
    let container = document.getElementById("notification-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "notification-container";
      container.className = "notification-container";
      document.body.appendChild(container);
    }

    const icons = {
      success: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
      error: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      warning: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };

    const notification = document.createElement("div");
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
      <span class="notification__icon notification__icon--${type}">${icons[type] || "•"}</span>
      <span class="notification__message">${message}</span>
      <button class="notification__close" aria-label="Close notification">&times;</button>
    `;

    container.appendChild(notification);

    requestAnimationFrame(() => {
      notification.classList.add("notification--visible");
    });

    const autoRemove = setTimeout(() => {
      removeNotification(notification);
    }, 5000);

    notification.querySelector(".notification__close").addEventListener("click", () => {
      clearTimeout(autoRemove);
      removeNotification(notification);
    });
  }

  function removeNotification(notification) {
    notification.classList.remove("notification--visible");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }


  // ===== Generic Modal Close Handler =====
  // Handles close buttons for all modals that don't have their own JS handler
  document.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("[data-modal-close]");
    if (!closeBtn) return;

    const modal = closeBtn.closest(".modal");
    if (!modal) return;

    // Try to find the cancel button in the same modal and trigger its click
    const cancelBtn = modal.querySelector("[data-modal-cancel], .modal-footer .ghost-button, .tasks-modal-actions .ghost-button");
    if (cancelBtn) {
      cancelBtn.click();
    } else {
      // Fallback: just hide the modal
      modal.classList.add("hidden");
      document.body.style.overflow = "";
    }
  });

  // ===== Initialize =====
  function init() {
    initSidebar();
    setSidebarActiveState();
    updateSidebarUser();
    applyRoleVisibility();
    initSettingsModal();
    initResetModal();

    // Sidebar signout
    const sidebarSignout = document.getElementById("sidebar-signout");
    if (sidebarSignout) {
      sidebarSignout.addEventListener("click", itwmsLogout);
    }

    // Initialize RBAC
    if (typeof initRBAC === "function") {
      initRBAC();
    }
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose globals
  window.applyRoleVisibility = applyRoleVisibility;
  window.updateSidebarUser = updateSidebarUser;
  window.setSidebarActiveState = setSidebarActiveState;
  window.itwmsLogout = itwmsLogout;
  window.fetchJson = fetchJson;
  window.apiPath = apiPath;
  window.getAuthHeaders = getAuthHeaders;
  window.showNotification = showNotification;
  window.openResetModal = openResetModal;
})();
