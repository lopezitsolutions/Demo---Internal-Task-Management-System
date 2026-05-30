/**
 * Demo Mode Interceptor
 * Intercepts all fetch() calls and routes them to the in-memory DemoStore.
 * This enables the entire application to run without a backend server.
 *
 * Include this file (along with demo-data.js and demo-store.js) in your HTML
 * BEFORE all other scripts (including the auth guard) to activate demo mode.
 */

(function () {
  "use strict";

  const DEMO_MODE_KEY = "itwmsDemoMode";
  const DEMO_USER_KEY = "demoUser";
  const DEMO_ROLE_KEY = "demoRole";

  // ─── EARLY AUTH BOOTSTRAP ───
  // This runs synchronously before any other script to ensure auth state
  // is ready before auth guards execute.
  function earlyBootstrap() {
    // Check if we're in demo mode or should auto-enable it
    const explicit = localStorage.getItem(DEMO_MODE_KEY);
    const hasRole = localStorage.getItem(DEMO_ROLE_KEY);
    const hasUser = localStorage.getItem(DEMO_USER_KEY);

    // Auto-enable for file://, localhost, or when demo data exists
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    const isLocal = protocol === "file:" || host === "localhost" || host === "127.0.0.1";

    if (explicit === "1" || explicit === "true" || hasRole || hasUser || isLocal) {
      // Force demo mode ON and ensure auth token exists
      localStorage.setItem(DEMO_MODE_KEY, "1");

      // Ensure we have a demo user selected
      let role = hasRole;
      if (!role) {
        // Default to Admin if no role selected yet
        role = "Admin";
        localStorage.setItem(DEMO_ROLE_KEY, role);
      }

      // Ensure auth token exists
      if (!localStorage.getItem("authToken")) {
        localStorage.setItem("authToken", "demo-token-" + Date.now());
      }

      // Ensure user object exists
      if (!localStorage.getItem("user") && !localStorage.getItem(DEMO_USER_KEY)) {
        const demoUsers = {
          Admin: {
            id: 1,
            nickname: "Alex Admin",
            email: "admin@itwms.demo",
            roleName: "Admin",
            depName: "Operations",
            department: { id: 1, name: "Operations" },
            role: { id: 1, name: "Admin" }
          },
          Manager: {
            id: 2,
            nickname: "Maria Manager",
            email: "manager@itwms.demo",
            roleName: "Manager",
            depName: "Operations",
            department: { id: 1, name: "Operations" },
            role: { id: 2, name: "Manager" }
          },
          Employee: {
            id: 4,
            nickname: "Sarah Dev",
            email: "sarah@itwms.demo",
            roleName: "Employee",
            depName: "Engineering",
            department: { id: 2, name: "Engineering" },
            role: { id: 3, name: "Employee" }
          }
        };
        const user = demoUsers[role] || demoUsers["Admin"];
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
      }

      return true;
    }

    return false;
  }

  // Run bootstrap immediately
  const isDemoActive = earlyBootstrap();

  // Check if demo mode should be active
  function isDemoMode() {
    const explicit = localStorage.getItem(DEMO_MODE_KEY);
    if (explicit === "1" || explicit === "true") return true;
    if (explicit === "0" || explicit === "false") return false;

    // Auto-enable if we detect we're running from file:// or localhost without a backend
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    if (protocol === "file:" || host === "localhost" || host === "127.0.0.1") {
      return true;
    }

    return false;
  }

  // Activate demo mode
  function activateDemoMode() {
    if (!isDemoMode()) {
      console.log("[demo-mode] Demo mode is disabled.");
      return;
    }

    console.log("[demo-mode] 🎮 Demo mode activated. All API calls will be intercepted.");
    localStorage.setItem(DEMO_MODE_KEY, "1");

    // Ensure demo store is initialized
    if (typeof window.DemoStore === "undefined" || !window.DemoStore.getUsers) {
      console.error("[demo-mode] DemoStore not available. Make sure demo-data.js and demo-store.js are loaded before demo-mode.js");
      return;
    }

    // Ensure a demo user is logged in
    ensureDemoUser();

    // Override the global fetch
    interceptFetch();

    // Override apiPath to return relative paths (avoids CORS issues)
    overrideApiPath();

    console.log("[demo-mode] ✅ Interceptor ready.");
  }

  function ensureDemoUser() {
    let user = window.DemoStore.getCurrentUser();
    if (!user) {
      // Check if a role was selected from index.html
      const role = localStorage.getItem(DEMO_ROLE_KEY) || "Admin";
      const demoUsers = {
        Admin: {
          id: 1,
          nickname: "Alex Admin",
          email: "admin@itwms.demo",
          roleName: "Admin",
          depName: "Operations",
          department: { id: 1, name: "Operations" },
          role: { id: 1, name: "Admin" }
        },
        Manager: {
          id: 2,
          nickname: "Maria Manager",
          email: "manager@itwms.demo",
          roleName: "Manager",
          depName: "Operations",
          department: { id: 1, name: "Operations" },
          role: { id: 2, name: "Manager" }
        },
        Employee: {
          id: 4,
          nickname: "Sarah Dev",
          email: "sarah@itwms.demo",
          roleName: "Employee",
          depName: "Engineering",
          department: { id: 2, name: "Engineering" },
          role: { id: 3, name: "Employee" }
        }
      };
      user = demoUsers[role] || demoUsers["Admin"];
      window.DemoStore.setCurrentUser(user);
      localStorage.setItem("authToken", "demo-token-" + Date.now());
      localStorage.setItem("user", JSON.stringify(user));
      console.log("[demo-mode] Logged in as", user.roleName, ":", user.nickname);
    }
  }

  function overrideApiPath() {
    // Override window.itwmsApiPath to return relative paths
    window.itwmsApiPath = function (path) {
      const normalized = path.startsWith("/") ? path : `/${path}`;
      return normalized;
    };
    // Also set __API_BASE__ to empty for same-origin behavior
    window.__API_BASE__ = "";
  }

  // ─── Fetch Interceptor ───
  function interceptFetch() {
    const originalFetch = window.fetch;

    window.fetch = async function (resource, init = {}) {
      const url = typeof resource === "string" ? resource : resource.url || resource.toString();

      // Only intercept API calls
      if (!url.includes("/api/")) {
        return originalFetch.apply(this, arguments);
      }

      console.log("[demo-mode] 🎯 Intercepted:", init.method || "GET", url);

      try {
        const response = handleApiRequest(url, init);
        if (response) {
          // Simulate network delay for realism (50-200ms)
          await simulateDelay(50, 200);
          return response;
        }
      } catch (error) {
        console.error("[demo-mode] Error handling request:", error);
        return new Response(
          JSON.stringify({ success: false, message: error.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Fallback to original fetch for non-matching routes
      return originalFetch.apply(this, arguments);
    };
  }

  function simulateDelay(min, max) {
    return new Promise((resolve) => {
      setTimeout(resolve, min + Math.random() * (max - min));
    });
  }

  // ─── Request Router ───
  function handleApiRequest(url, init) {
    const method = (init.method || "GET").toUpperCase();
    const parsedUrl = new URL(url, window.location.origin);
    const path = parsedUrl.pathname;
    const query = Object.fromEntries(parsedUrl.searchParams);

    // Parse request body if present
    let body = null;
    if (init.body) {
      try {
        body = JSON.parse(init.body);
      } catch (e) {
        body = init.body;
      }
    }

    // ─── AUTH ROUTES ───
    if (path === "/api/auth/login" || path === "/api/auth/login/") {
      return handleLogin(body);
    }
    if (path === "/api/auth/me" || path === "/api/auth/me/") {
      return handleGetProfile();
    }
    if (path === "/api/auth/logout" || path === "/api/auth/logout/") {
      return handleLogout();
    }
    if (path === "/api/auth/forgot-password" || path === "/api/auth/forgot-password/") {
      return handleForgotPassword(body);
    }
    if (path === "/api/auth/reset-password" || path === "/api/auth/reset-password/") {
      return handleResetPassword(body);
    }

    // ─── DASHBOARD ───
    if (path === "/api/dashboard/stats" || path === "/api/dashboard/stats/") {
      return handleGetStats(query);
    }

    // ─── USERS ───
    const usersMatch = path.match(/^\/api\/users\/?$/);
    if (usersMatch) {
      if (method === "GET") return handleGetUsers(query);
      if (method === "POST") return handleCreateUser(body);
    }
    const userByIdMatch = path.match(/^\/api\/users\/(\d+)\/?$/);
    if (userByIdMatch) {
      const id = userByIdMatch[1];
      if (method === "GET") return handleGetUserById(id);
      if (method === "PUT" || method === "PATCH") return handleUpdateUser(id, body);
      if (method === "DELETE") return handleDeleteUser(id);
    }

    // ─── DEPARTMENTS ───
    const deptsMatch = path.match(/^\/api\/departments\/?$/);
    if (deptsMatch) {
      if (method === "GET") return handleGetDepartments();
      if (method === "POST") return handleCreateDepartment(body);
    }
    const deptByIdMatch = path.match(/^\/api\/departments\/(\d+)\/?$/);
    if (deptByIdMatch) {
      const id = deptByIdMatch[1];
      if (method === "GET") return handleGetDepartmentById(id);
      if (method === "PUT" || method === "PATCH") return handleUpdateDepartment(id, body);
      if (method === "DELETE") return handleDeleteDepartment(id);
    }

    // ─── NOTES ───
    const notesMatch = path.match(/^\/api\/notes\/?$/);
    if (notesMatch) {
      if (method === "GET") return handleGetNotes(query);
      if (method === "POST") return handleCreateNote(body);
    }
    const noteByIdMatch = path.match(/^\/api\/notes\/(\d+)\/?$/);
    if (noteByIdMatch) {
      const id = noteByIdMatch[1];
      if (method === "GET") return handleGetNoteById(id);
      if (method === "PUT" || method === "PATCH") return handleUpdateNote(id, body);
      if (method === "DELETE") return handleDeleteNote(id);
    }

    // ─── TASKS ───
    const tasksMatch = path.match(/^\/api\/tasks\/?$/);
    if (tasksMatch) {
      if (method === "GET") return handleGetTasks(query);
      if (method === "POST") return handleCreateTask(body);
    }
    const myTasksMatch = path.match(/^\/api\/tasks\/my\/?$/);
    if (myTasksMatch) {
      if (method === "GET") return handleGetMyTasks(query);
    }
    const taskByIdMatch = path.match(/^\/api\/tasks\/(\d+)\/?$/);
    if (taskByIdMatch) {
      const id = taskByIdMatch[1];
      if (method === "GET") return handleGetTaskById(id);
      if (method === "PUT" || method === "PATCH") return handleUpdateTask(id, body);
      if (method === "DELETE") return handleDeleteTask(id);
    }

    // ─── TASK COLLABORATORS ───
    const collabMatch = path.match(/^\/api\/tasks\/(\d+)\/collaborators\/?$/);
    if (collabMatch) {
      const taskId = collabMatch[1];
      if (method === "GET") return handleGetCollaborators(taskId);
      if (method === "POST") return handleAddCollaborator(taskId, body);
    }
    const removeCollabMatch = path.match(/^\/api\/tasks\/(\d+)\/collaborators\/(\d+)\/?$/);
    if (removeCollabMatch) {
      const taskId = removeCollabMatch[1];
      const userId = removeCollabMatch[2];
      if (method === "DELETE") return handleRemoveCollaborator(taskId, userId);
    }

    // ─── AUDIT TRAILS ───
    const auditMatch = path.match(/^\/api\/audit-trails\/?$/);
    if (auditMatch) {
      if (method === "GET") return handleGetAuditTrails(query);
    }

    console.warn("[demo-mode] Unhandled route:", method, path);
    return null; // Let original fetch handle it
  }

  // ─── Response Helpers ───
  function jsonResponse(data, status = 200) {
    const body = JSON.stringify({
      success: true,
      data: data,
      ...(data && data.pagination ? {} : {}),
    });
    return new Response(body, {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  function envelopeResponse(data, pagination = null, status = 200) {
    const payload = { success: true, data };
    if (pagination) payload.pagination = pagination;
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  function errorResponse(message, status = 400) {
    return new Response(
      JSON.stringify({ success: false, message, error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }

  function emptyResponse(status = 204) {
    return new Response(null, { status });
  }

  // ─── Auth Handlers ───
  function handleLogin(body) {
    if (!body || (!body.email && !body.username)) {
      return errorResponse("Please provide email/username and password", 401);
    }
    const identifier = body.email || body.username;
    const user = window.DemoStore.getUsers().find(
      (u) => u.email === identifier || u.nickname === identifier || u.username === identifier
    );
    if (!user) {
      return errorResponse("Invalid credentials", 401);
    }
    // In demo mode, any password is accepted
    const token = "demo-token-" + user.id + "-" + Date.now();
    window.DemoStore.setCurrentUser(user);
    localStorage.setItem("authToken", token);
    localStorage.setItem("user", JSON.stringify(user));
    return jsonResponse({ token, user });
  }

  function handleGetProfile() {
    const profile = window.DemoStore.getUserProfile();
    if (!profile) {
      return errorResponse("Not authenticated", 401);
    }
    return jsonResponse(profile);
  }

  function handleLogout() {
    window.DemoStore.setCurrentUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem(DEMO_USER_KEY);
    localStorage.removeItem(DEMO_ROLE_KEY);
    // Redirect to role selection page after logout
    setTimeout(() => {
      window.location.replace("/index.html");
    }, 100);
    return jsonResponse({ message: "Logged out successfully" });
  }

  function handleForgotPassword(body) {
    const identifier = body?.email || body?.username || "";
    if (!identifier) {
      return errorResponse("Please provide an email or username");
    }
    return jsonResponse({
      message: "If the account exists, a reset link has been sent to " + identifier,
    });
  }

  function handleResetPassword(body) {
    if (!body?.password || !body?.token) {
      return errorResponse("Password and token are required");
    }
    return jsonResponse({ message: "Password reset successfully" });
  }

  // ─── Stats Handler ───
  function handleGetStats(query) {
    const stats = window.DemoStore.getStats(query.scope);
    return jsonResponse(stats);
  }

  // ─── User Handlers ───
  function handleGetUsers(query) {
    let users = window.DemoStore.getUsers();
    const page = parseInt(query.page || "1", 10);
    const limit = parseInt(query.limit || "100", 10);
    const total = users.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const paginated = users.slice(start, start + limit);
    return envelopeResponse(paginated, {
      page,
      limit,
      total,
      totalPages,
    });
  }

  function handleGetUserById(id) {
    const user = window.DemoStore.getUserById(id);
    if (!user) return errorResponse("User not found", 404);
    return jsonResponse(user);
  }

  function handleCreateUser(body) {
    if (!body?.email || !body?.nickname) {
      return errorResponse("Email and nickname are required");
    }
    const user = window.DemoStore.createUser(body);
    return jsonResponse(user, 201);
  }

  function handleUpdateUser(id, body) {
    const user = window.DemoStore.updateUser(id, body);
    if (!user) return errorResponse("User not found", 404);
    return jsonResponse(user);
  }

  function handleDeleteUser(id) {
    const success = window.DemoStore.deleteUser(id);
    if (!success) return errorResponse("User not found", 404);
    return emptyResponse(204);
  }

  // ─── Department Handlers ───
  function handleGetDepartments() {
    return jsonResponse(window.DemoStore.getDepartments());
  }

  function handleGetDepartmentById(id) {
    const dept = window.DemoStore.getDepartmentById(id);
    if (!dept) return errorResponse("Department not found", 404);
    return jsonResponse(dept);
  }

  function handleCreateDepartment(body) {
    if (!body?.depName && !body?.name) {
      return errorResponse("Department name is required");
    }
    const dept = window.DemoStore.createDepartment(body);
    return jsonResponse(dept, 201);
  }

  function handleUpdateDepartment(id, body) {
    const dept = window.DemoStore.updateDepartment(id, body);
    if (!dept) return errorResponse("Department not found", 404);
    return jsonResponse(dept);
  }

  function handleDeleteDepartment(id) {
    const success = window.DemoStore.deleteDepartment(id);
    if (!success) return errorResponse("Department not found", 404);
    return emptyResponse(204);
  }

  // ─── Note Handlers ───
  function handleGetNotes(query) {
    const notes = window.DemoStore.getNotes(query.status);
    return jsonResponse(notes);
  }

  function handleGetNoteById(id) {
    const note = window.DemoStore.getNoteById(id);
    if (!note) return errorResponse("Note not found", 404);
    // Embed tasks
    const tasks = window.DemoStore.getTasks().filter((t) => {
      const nid = t.note?.id ?? t.noteId;
      return String(nid) === String(id);
    });
    note.tasks = tasks;
    return jsonResponse(note);
  }

  function handleCreateNote(body) {
    if (!body?.noteName && !body?.title) {
      return errorResponse("Note name is required");
    }
    const note = window.DemoStore.createNote(body);
    return jsonResponse(note, 201);
  }

  function handleUpdateNote(id, body) {
    const note = window.DemoStore.updateNote(id, body);
    if (!note) return errorResponse("Note not found", 404);
    return jsonResponse(note);
  }

  function handleDeleteNote(id) {
    const success = window.DemoStore.deleteNote(id);
    if (!success) return errorResponse("Note not found", 404);
    return emptyResponse(204);
  }

  // ─── Task Handlers ───
  function handleGetTasks(query) {
    const currentUser = window.DemoStore.getCurrentUser();
    const role = currentUser?.roleName || "Employee";
    const userId = currentUser?.id;
    const tasks = window.DemoStore.getTasks(query.status, userId, role);
    return jsonResponse(tasks);
  }

  function handleGetMyTasks(query) {
    const currentUser = window.DemoStore.getCurrentUser();
    const userId = currentUser?.id;
    const tasks = window.DemoStore.getMyTasks(userId, query.status);
    return jsonResponse(tasks);
  }

  function handleGetTaskById(id) {
    const task = window.DemoStore.getTaskById(id);
    if (!task) return errorResponse("Task not found", 404);
    return jsonResponse(task);
  }

  function handleCreateTask(body) {
    if (!body?.taskName && !body?.title) {
      return errorResponse("Task name is required");
    }
    const task = window.DemoStore.createTask(body);
    return jsonResponse(task, 201);
  }

  function handleUpdateTask(id, body) {
    const task = window.DemoStore.updateTask(id, body);
    if (!task) return errorResponse("Task not found", 404);
    return jsonResponse(task);
  }

  function handleDeleteTask(id) {
    const success = window.DemoStore.deleteTask(id);
    if (!success) return errorResponse("Task not found", 404);
    return emptyResponse(204);
  }

  // ─── Collaborator Handlers ───
  function handleGetCollaborators(taskId) {
    const collabs = window.DemoStore.getTaskCollaborators(taskId);
    return jsonResponse(collabs);
  }

  function handleAddCollaborator(taskId, body) {
    if (!body?.userId) {
      return errorResponse("userId is required");
    }
    const success = window.DemoStore.addTaskCollaborator(taskId, body.userId);
    if (!success) {
      return errorResponse("Collaborator already exists or invalid user", 409);
    }
    return jsonResponse({ message: "Collaborator added" }, 201);
  }

  function handleRemoveCollaborator(taskId, userId) {
    const success = window.DemoStore.removeTaskCollaborator(taskId, userId);
    if (!success) return errorResponse("Collaborator not found", 404);
    return emptyResponse(204);
  }

  // ─── Audit Trail Handlers ───
  function handleGetAuditTrails(query) {
    const filters = {
      id: query.id || "",
      recordId: query.recordId || "",
      table: query.table || "",
      search: query.search || "",
      userId: query.userId || "",
      actionType: query.actionType || "",
      startDate: query.startDate || "",
      endDate: query.endDate || "",
    };
    let trails = window.DemoStore.getAuditTrails(filters);

    const page = parseInt(query.page || "1", 10);
    const limit = parseInt(query.limit || "10", 10);
    const total = trails.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const paginated = trails.slice(start, start + limit);

    return envelopeResponse(paginated, {
      page,
      limit,
      total,
      totalPages,
    });
  }

  // ─── Redirect Interceptor ───
  // Prevent page scripts from redirecting to login.html in demo mode.
  // Instead, redirect to index.html (role selection) or let demo mode handle auth.
  function interceptRedirects() {
    const originalReplace = window.location.replace;
    const originalAssign = window.location.assign;

    function shouldBlock(urlStr) {
      return isDemoMode() && (
        urlStr.includes("login.html") ||
        urlStr.includes("/assets/html/login.html") ||
        urlStr === "/index.html" && !localStorage.getItem(DEMO_ROLE_KEY)
      );
    }

    window.location.replace = function (url) {
      const urlStr = String(url);
      if (shouldBlock(urlStr)) {
        console.log("[demo-mode] 🚫 Blocked redirect to", urlStr, "- sending to index.html instead");
        return originalReplace.call(window.location, "/index.html");
      }
      return originalReplace.call(window.location, url);
    };

    window.location.assign = function (url) {
      const urlStr = String(url);
      if (shouldBlock(urlStr)) {
        console.log("[demo-mode] 🚫 Blocked navigation to", urlStr, "- sending to index.html instead");
        return originalAssign.call(window.location, "/index.html");
      }
      return originalAssign.call(window.location, url);
    };

    // Also intercept direct href changes to login.html
    let hrefBlocked = false;
    Object.defineProperty(window.location, "href", {
      set: function (url) {
        if (shouldBlock(String(url)) && !hrefBlocked) {
          hrefBlocked = true;
          console.log("[demo-mode] 🚫 Blocked href to", String(url), "- sending to index.html instead");
          window.location.href = "/index.html";
          hrefBlocked = false;
          return;
        }
        // Use the original setter via Object.getOwnPropertyDescriptor on a fresh object
        const loc = document.createElement("a");
        loc.href = url;
        if (loc.href !== window.location.href) {
          originalAssign.call(window.location, url);
        }
      },
      get: function () {
        return window.location.toString();
      },
    });
  }

  // ─── Initialize ───
  function init() {
    if (!isDemoMode()) {
      console.log("[demo-mode] Demo mode is disabled.");
      return;
    }
    // Intercept redirects FIRST, before any page script can fire them
    interceptRedirects();
    // Then activate the rest
    activateDemoMode();
  }

  // Run immediately — do NOT wait for DOMContentLoaded.
  // Page scripts run on DOMContentLoaded and may call loadProfile() before
  // our interceptor is ready if we wait.
  init();

  // Also expose a way to manually toggle
  window.toggleDemoMode = function (enabled) {
    localStorage.setItem(DEMO_MODE_KEY, enabled ? "1" : "0");
    window.location.reload();
  };

  window.isDemoModeActive = isDemoMode;
})();
