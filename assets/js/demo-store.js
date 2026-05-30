/**
 * Demo Store
 * In-memory data store with CRUD operations for demo mode.
 * Provides a mutable copy of DEMO_DATA that persists during the session.
 */

(function () {
  "use strict";

  // Deep clone the initial demo data into mutable store
  function deepClone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(deepClone);
    const cloned = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  // Initialize mutable store from DEMO_DATA
  let store = null;

  function initStore() {
    if (!window.DEMO_DATA) {
      console.error("[demo-store] DEMO_DATA not found. Make sure demo-data.js is loaded first.");
      return;
    }
    store = {
      users: deepClone(window.DEMO_DATA.users),
      departments: deepClone(window.DEMO_DATA.departments),
      notes: deepClone(window.DEMO_DATA.notes),
      tasks: deepClone(window.DEMO_DATA.tasks),
      auditTrails: deepClone(window.DEMO_DATA.auditTrails),
      stats: deepClone(window.DEMO_DATA.stats),
    };
    console.log("[demo-store] Store initialized with", store.users.length, "users,");
    console.log("[demo-store]", store.departments.length, "departments,");
    console.log("[demo-store]", store.notes.length, "notes,");
    console.log("[demo-store]", store.tasks.length, "tasks,");
    console.log("[demo-store]", store.auditTrails.length, "audit trails");
  }

  // ID generators
  let nextId = {
    users: 100,
    departments: 100,
    notes: 100,
    tasks: 100,
    auditTrails: 100,
  };

  function generateId(entity) {
    return nextId[entity]++;
  }

  // ─── Users ───
  function getUsers() {
    return store.users.filter((u) => u.deletedAt === null || u.deletedAt === undefined);
  }

  function getUserById(id) {
    return getUsers().find((u) => String(u.id) === String(id));
  }

  function createUser(data) {
    const user = {
      id: generateId("users"),
      email: data.email || "",
      nickname: data.nickname || "",
      phoneNum: data.phoneNum || null,
      depId: data.depId || data.departmentId || null,
      department: null,
      role: { id: data.roleId || 3, name: data.roleId === 1 ? "Admin" : data.roleId === 2 ? "Manager" : "Employee" },
      roleName: data.roleId === 1 ? "Admin" : data.roleId === 2 ? "Manager" : "Employee",
      depName: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    // Resolve department
    if (user.depId) {
      const dept = store.departments.find((d) => d.id === user.depId);
      if (dept) {
        user.department = { id: dept.id, name: dept.depName || dept.name };
        user.depName = dept.depName || dept.name;
      }
    }
    store.users.push(user);
    addAuditTrail("CREATE", "users", String(user.id), null, user);
    updateStats();
    return user;
  }

  function updateUser(id, data) {
    const idx = store.users.findIndex((u) => String(u.id) === String(id));
    if (idx === -1) return null;
    const oldUser = deepClone(store.users[idx]);
    const user = store.users[idx];
    if (data.email !== undefined) user.email = data.email;
    if (data.nickname !== undefined) user.nickname = data.nickname;
    if (data.phoneNum !== undefined) user.phoneNum = data.phoneNum;
    if (data.depId !== undefined || data.departmentId !== undefined) {
      user.depId = data.depId || data.departmentId || null;
      const dept = store.departments.find((d) => d.id === user.depId);
      if (dept) {
        user.department = { id: dept.id, name: dept.depName || dept.name };
        user.depName = dept.depName || dept.name;
      } else {
        user.department = null;
        user.depName = "";
      }
    }
    if (data.roleId !== undefined) {
      user.role = { id: data.roleId, name: data.roleId === 1 ? "Admin" : data.roleId === 2 ? "Manager" : "Employee" };
      user.roleName = data.roleId === 1 ? "Admin" : data.roleId === 2 ? "Manager" : "Employee";
    }
    user.updatedAt = new Date().toISOString();
    addAuditTrail("UPDATE", "users", String(id), oldUser, user);
    return user;
  }

  function deleteUser(id) {
    const idx = store.users.findIndex((u) => String(u.id) === String(id));
    if (idx === -1) return false;
    const user = store.users[idx];
    const oldUser = deepClone(user);
    user.deletedAt = new Date().toISOString();
    addAuditTrail("DELETE", "users", String(id), oldUser, null);
    updateStats();
    return true;
  }

  // ─── Departments ───
  function getDepartments() {
    return store.departments.filter((d) => d.deletedAt === null || d.deletedAt === undefined);
  }

  function getDepartmentById(id) {
    return getDepartments().find((d) => String(d.id) === String(id));
  }

  function createDepartment(data) {
    const dept = {
      id: generateId("departments"),
      depName: data.depName || data.name || "",
      name: data.depName || data.name || "",
      description: data.description || "",
      managerId: data.managerId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    store.departments.push(dept);
    addAuditTrail("CREATE", "departments", String(dept.id), null, dept);
    updateStats();
    return dept;
  }

  function updateDepartment(id, data) {
    const idx = store.departments.findIndex((d) => String(d.id) === String(id));
    if (idx === -1) return null;
    const oldDept = deepClone(store.departments[idx]);
    const dept = store.departments[idx];
    if (data.depName !== undefined || data.name !== undefined) {
      dept.depName = data.depName || data.name || dept.depName;
      dept.name = data.depName || data.name || dept.name;
    }
    if (data.description !== undefined) dept.description = data.description;
    if (data.managerId !== undefined) dept.managerId = data.managerId;
    dept.updatedAt = new Date().toISOString();
    addAuditTrail("UPDATE", "departments", String(id), oldDept, dept);
    return dept;
  }

  function deleteDepartment(id) {
    const idx = store.departments.findIndex((d) => String(d.id) === String(id));
    if (idx === -1) return false;
    const dept = store.departments[idx];
    const oldDept = deepClone(dept);
    dept.deletedAt = new Date().toISOString();
    addAuditTrail("DELETE", "departments", String(id), oldDept, null);
    updateStats();
    return true;
  }

  // ─── Notes ───
  function getNotes(status) {
    let notes = store.notes.filter((n) => n.deletedAt === null || n.deletedAt === undefined);
    if (status && status !== "All") {
      notes = notes.filter((n) => n.status === status);
    }
    return notes;
  }

  function getNoteById(id) {
    return store.notes.find((n) => String(n.id) === String(id) && (n.deletedAt === null || n.deletedAt === undefined));
  }

  function createNote(data) {
    const note = {
      id: generateId("notes"),
      noteName: data.noteName || data.title || "",
      description: data.description || "",
      depId: data.depId || data.departmentId || null,
      department: null,
      departmentId: data.depId || data.departmentId || null,
      dueDate: data.dueDate || null,
      status: data.status || "Active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      tasks: [],
    };
    if (note.depId) {
      const dept = store.departments.find((d) => d.id === note.depId);
      if (dept) {
        note.department = { id: dept.id, depName: dept.depName || dept.name, name: dept.depName || dept.name };
      }
    }
    store.notes.push(note);
    addAuditTrail("CREATE", "notes", String(note.id), null, note);
    updateStats();
    return note;
  }

  function updateNote(id, data) {
    const idx = store.notes.findIndex((n) => String(n.id) === String(id));
    if (idx === -1) return null;
    const oldNote = deepClone(store.notes[idx]);
    const note = store.notes[idx];
    if (data.noteName !== undefined || data.title !== undefined) note.noteName = data.noteName || data.title || note.noteName;
    if (data.description !== undefined) note.description = data.description;
    if (data.depId !== undefined || data.departmentId !== undefined) {
      note.depId = data.depId || data.departmentId || null;
      note.departmentId = note.depId;
      const dept = store.departments.find((d) => d.id === note.depId);
      if (dept) {
        note.department = { id: dept.id, depName: dept.depName || dept.name, name: dept.depName || dept.name };
      }
    }
    if (data.dueDate !== undefined) note.dueDate = data.dueDate;
    if (data.status !== undefined) note.status = data.status;
    note.updatedAt = new Date().toISOString();
    addAuditTrail("UPDATE", "notes", String(id), oldNote, note);
    return note;
  }

  function deleteNote(id) {
    const idx = store.notes.findIndex((n) => String(n.id) === String(id));
    if (idx === -1) return false;
    const note = store.notes[idx];
    const oldNote = deepClone(note);
    note.deletedAt = new Date().toISOString();
    addAuditTrail("DELETE", "notes", String(id), oldNote, null);
    updateStats();
    return true;
  }

  // ─── Tasks ───
  function getTasks(status, userId, role) {
    let tasks = store.tasks.filter((t) => t.deletedAt === null || t.deletedAt === undefined);

    // Role-based filtering
    if (role === "Employee" && userId) {
      tasks = tasks.filter((t) => {
        const assignedId = t.assignedToUser?.id ?? t.assignedTo;
        const isAssigned = String(assignedId) === String(userId);
        const isCollaborator = Array.isArray(t.collaborators)
          ? t.collaborators.some((c) => String(c.id ?? c.userId) === String(userId))
          : false;
        return isAssigned || isCollaborator;
      });
    }

    if (status && status !== "All") {
      tasks = tasks.filter((t) => t.taskStatus === status || t.status === status);
    }

    return tasks;
  }

  function getMyTasks(userId, status) {
    let tasks = store.tasks.filter((t) => {
      if (t.deletedAt !== null && t.deletedAt !== undefined) return false;
      const assignedId = t.assignedToUser?.id ?? t.assignedTo;
      const isAssigned = String(assignedId) === String(userId);
      const isCollaborator = Array.isArray(t.collaborators)
        ? t.collaborators.some((c) => String(c.id ?? c.userId) === String(userId))
        : false;
      return isAssigned || isCollaborator;
    });
    if (status && status !== "All") {
      tasks = tasks.filter((t) => t.taskStatus === status || t.status === status);
    }
    return tasks;
  }

  function getTaskById(id) {
    return store.tasks.find((t) => String(t.id) === String(id) && (t.deletedAt === null || t.deletedAt === undefined));
  }

  function createTask(data) {
    const task = {
      id: generateId("tasks"),
      taskName: data.taskName || data.title || "",
      description: data.description || "",
      noteId: data.noteId || null,
      note: null,
      assignedTo: data.assignedTo || null,
      assignedToUser: null,
      createdBy: data.createdBy || null,
      createdByUser: null,
      dueDate: data.dueDate || null,
      taskStatus: data.taskStatus || data.status || "to_do",
      status: data.taskStatus || data.status || "to_do",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      collaborators: [],
    };

    // Resolve relations
    if (task.noteId) {
      const note = store.notes.find((n) => n.id === task.noteId);
      if (note) task.note = { id: note.id, noteName: note.noteName };
    }
    if (task.assignedTo) {
      const user = store.users.find((u) => u.id === task.assignedTo);
      if (user) task.assignedToUser = { id: user.id, nickname: user.nickname, email: user.email };
    }
    if (task.createdBy) {
      const user = store.users.find((u) => u.id === task.createdBy);
      if (user) task.createdByUser = { id: user.id, nickname: user.nickname, email: user.email };
    }

    store.tasks.push(task);
    addAuditTrail("CREATE", "tasks", String(task.id), null, task);
    updateStats();
    return task;
  }

  function updateTask(id, data) {
    const idx = store.tasks.findIndex((t) => String(t.id) === String(id));
    if (idx === -1) return null;
    const oldTask = deepClone(store.tasks[idx]);
    const task = store.tasks[idx];

    if (data.taskName !== undefined || data.title !== undefined) task.taskName = data.taskName || data.title || task.taskName;
    if (data.description !== undefined) task.description = data.description;
    if (data.noteId !== undefined) {
      task.noteId = data.noteId || null;
      const note = task.noteId ? store.notes.find((n) => n.id === task.noteId) : null;
      task.note = note ? { id: note.id, noteName: note.noteName } : null;
    }
    if (data.assignedTo !== undefined) {
      task.assignedTo = data.assignedTo || null;
      const user = task.assignedTo ? store.users.find((u) => u.id === task.assignedTo) : null;
      task.assignedToUser = user ? { id: user.id, nickname: user.nickname, email: user.email } : null;
    }
    if (data.taskStatus !== undefined || data.status !== undefined) {
      task.taskStatus = data.taskStatus || data.status || task.taskStatus;
      task.status = task.taskStatus;
    }
    if (data.dueDate !== undefined) task.dueDate = data.dueDate;
    task.updatedAt = new Date().toISOString();
    addAuditTrail("UPDATE", "tasks", String(id), oldTask, task);
    return task;
  }

  function deleteTask(id) {
    const idx = store.tasks.findIndex((t) => String(t.id) === String(id));
    if (idx === -1) return false;
    const task = store.tasks[idx];
    const oldTask = deepClone(task);
    task.deletedAt = new Date().toISOString();
    addAuditTrail("DELETE", "tasks", String(id), oldTask, null);
    updateStats();
    return true;
  }

  // ─── Task Collaborators ───
  function getTaskCollaborators(taskId) {
    const task = getTaskById(taskId);
    if (!task) return [];
    return task.collaborators || [];
  }

  function addTaskCollaborator(taskId, userId) {
    const task = getTaskById(taskId);
    if (!task) return false;
    const user = store.users.find((u) => u.id === Number(userId));
    if (!user) return false;
    const exists = task.collaborators.some((c) => String(c.id ?? c.userId) === String(userId));
    if (exists) return false;
    task.collaborators.push({
      id: user.id,
      userId: user.id,
      nickname: user.nickname,
      email: user.email,
    });
    return true;
  }

  function removeTaskCollaborator(taskId, userId) {
    const task = getTaskById(taskId);
    if (!task) return false;
    const before = task.collaborators.length;
    task.collaborators = task.collaborators.filter((c) => String(c.id ?? c.userId) !== String(userId));
    return task.collaborators.length < before;
  }

  // ─── Audit Trails ───
  function getAuditTrails(filters) {
    let trails = [...store.auditTrails];
    if (filters) {
      if (filters.id) trails = trails.filter((t) => String(t.id) === String(filters.id).trim());
      if (filters.recordId) trails = trails.filter((t) => String(t.recordId) === String(filters.recordId).trim());
      if (filters.table) trails = trails.filter((t) => String(t.tableName || "").toLowerCase() === String(filters.table).toLowerCase());
      if (filters.userId) trails = trails.filter((t) => String(t.userId) === String(filters.userId));
      if (filters.actionType) trails = trails.filter((t) => String(t.action || "").toUpperCase() === String(filters.actionType).toUpperCase());
      if (filters.startDate) {
        trails = trails.filter((t) => {
          const d = t.createdAt ? t.createdAt.slice(0, 10) : "";
          return d >= filters.startDate;
        });
      }
      if (filters.endDate) {
        trails = trails.filter((t) => {
          const d = t.createdAt ? t.createdAt.slice(0, 10) : "";
          return d <= filters.endDate;
        });
      }
      if (filters.search) {
        const term = String(filters.search).trim().toLowerCase();
        trails = trails.filter((t) => {
          const haystack = Object.values(t).map((v) => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v))).join(" ").toLowerCase();
          return haystack.includes(term);
        });
      }
    }
    return trails;
  }

  function addAuditTrail(action, tableName, recordId, oldData, newData) {
    const currentUser = getCurrentUser();
    const trail = {
      id: generateId("auditTrails"),
      action: action,
      tableName: tableName,
      recordId: recordId,
      userId: currentUser?.id || 1,
      userEmail: currentUser?.email || "demo@itwms.demo",
      oldData: oldData ? JSON.stringify(oldData) : null,
      newData: newData ? JSON.stringify(newData) : null,
      createdAt: new Date().toISOString(),
    };
    store.auditTrails.unshift(trail);
    return trail;
  }

  // ─── Stats ───
  function getStats(scope) {
    const activeTasks = store.tasks.filter((t) => t.deletedAt === null || t.deletedAt === undefined).length;
    const activeNotes = store.notes.filter((n) => n.deletedAt === null || n.deletedAt === undefined).length;
    return {
      overview: {
        tasks: { total: activeTasks },
        notes: { total: activeNotes },
      },
    };
  }

  function updateStats() {
    store.stats = getStats();
  }

  // ─── Auth / Current User ───
  let currentUser = null;

  function setCurrentUser(user) {
    currentUser = user;
    if (user) {
      localStorage.setItem("demoUser", JSON.stringify(user));
    } else {
      localStorage.removeItem("demoUser");
    }
  }

  function getCurrentUser() {
    if (currentUser) return currentUser;
    try {
      const saved = localStorage.getItem("demoUser");
      if (saved) {
        currentUser = JSON.parse(saved);
        return currentUser;
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  function getUserProfile() {
    const user = getCurrentUser();
    if (!user) return null;
    // Return full profile enriched with department info
    const fullUser = store.users.find((u) => u.id === user.id);
    if (fullUser) {
      return {
        ...fullUser,
        name: fullUser.nickname || fullUser.name || fullUser.username,
        workspaceName: "ITWMS Demo",
        company: "ITWMS Demo Corp",
      };
    }
    return {
      ...user,
      workspaceName: "ITWMS Demo",
      company: "ITWMS Demo Corp",
    };
  }

  // ─── Export ───
  window.DemoStore = {
    init: initStore,
    // Users
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    // Departments
    getDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    // Notes
    getNotes,
    getNoteById,
    createNote,
    updateNote,
    deleteNote,
    // Tasks
    getTasks,
    getMyTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    // Collaborators
    getTaskCollaborators,
    addTaskCollaborator,
    removeTaskCollaborator,
    // Audit
    getAuditTrails,
    // Stats
    getStats,
    // Auth
    setCurrentUser,
    getCurrentUser,
    getUserProfile,
  };

  // Auto-init if DEMO_DATA is already loaded (run immediately)
  if (window.DEMO_DATA) {
    initStore();
  }
})();
