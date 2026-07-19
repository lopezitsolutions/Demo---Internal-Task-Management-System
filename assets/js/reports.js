/**
 * Reports Module
 * Derives task/status/department analytics from DEMO_DATA for the demo environment.
 */

const STATUS_META = {
  to_do: { label: "To Do", color: "var(--text-muted)" },
  in_progress: { label: "In Progress", color: "var(--accent)" },
  pending_approval: { label: "Pending Approval", color: "var(--warning)" },
  completed: { label: "Completed", color: "var(--success)" },
  rejected: { label: "Rejected", color: "var(--danger)" },
  cancelled: { label: "Cancelled", color: "var(--danger)" },
};

function reportsGetData() {
  const tasks = (window.DEMO_DATA && DEMO_DATA.tasks) || [];
  const departments = (window.DEMO_DATA && DEMO_DATA.departments) || [];
  const users = (window.DEMO_DATA && DEMO_DATA.users) || [];
  return { tasks, departments, users };
}

function reportsScopedTasks() {
  const { tasks, users } = reportsGetData();
  if (typeof filterItemsByRole === "function") {
    return filterItemsByRole(tasks, "assignedTo", users);
  }
  return tasks;
}

function reportsIsOverdue(task) {
  const closedStatuses = ["completed", "cancelled", "rejected"];
  if (closedStatuses.includes(task.taskStatus)) return false;
  if (!task.dueDate) return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

function renderReportsScopeLabel() {
  const el = document.getElementById("reports-scope-label");
  if (!el) return;
  const role = typeof getCurrentRole === "function" ? getCurrentRole() : "Employee";
  const label =
    role === "Admin"
      ? "Organization-wide performance summary"
      : role === "Manager"
        ? "Performance summary for your department"
        : "Summary of your assigned work";
  el.textContent = label;
}

function renderReportsKpis() {
  const grid = document.getElementById("reports-stats-grid");
  if (!grid) return;

  const tasks = reportsScopedTasks();
  const total = tasks.length;
  const completed = tasks.filter((t) => t.taskStatus === "completed").length;
  const rate = total ? Math.round((completed / total) * 100) : 0;
  const overdue = tasks.filter(reportsIsOverdue).length;

  grid.innerHTML = `
    <article class="stat-card">
      <div class="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 3h6a1 1 0 0 1 1 1v2H8V4a1 1 0 0 1 1-1z"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="15" y2="15"/></svg></div>
      <div class="stat-value">${total}</div>
      <p class="stat-label">Total Tasks</p>
    </article>
    <article class="stat-card">
      <div class="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
      <div class="stat-value">${completed}</div>
      <p class="stat-label">Completed</p>
    </article>
    <article class="stat-card">
      <div class="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg></div>
      <div class="stat-value">${rate}%</div>
      <p class="stat-label">Completion Rate</p>
    </article>
    <article class="stat-card">
      <div class="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
      <div class="stat-value">${overdue}</div>
      <p class="stat-label">Overdue</p>
    </article>
  `;
}

function renderReportsBarList(containerId, entries) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!entries.length) {
    container.innerHTML = `<p class="report-empty">No data available for this view.</p>`;
    return;
  }

  const max = Math.max(...entries.map((e) => e.count), 1);
  container.innerHTML = entries
    .map((entry) => {
      const width = Math.round((entry.count / max) * 100);
      return `
        <div class="report-bar-row">
          <span class="report-bar-label">${entry.label}</span>
          <div class="report-bar-track">
            <div class="report-bar-fill" style="width:${width}%; background:${entry.color};"></div>
          </div>
          <span class="report-bar-count">${entry.count}</span>
        </div>
      `;
    })
    .join("");
}

function renderStatusBreakdown() {
  const tasks = reportsScopedTasks();
  const counts = {};
  tasks.forEach((t) => {
    counts[t.taskStatus] = (counts[t.taskStatus] || 0) + 1;
  });

  const entries = Object.keys(STATUS_META)
    .map((key) => ({
      label: STATUS_META[key].label,
      color: STATUS_META[key].color,
      count: counts[key] || 0,
    }))
    .filter((e) => e.count > 0);

  renderReportsBarList("status-breakdown-body", entries);
}

function renderDepartmentBreakdown() {
  const { users } = reportsGetData();
  const tasks = reportsScopedTasks();

  const userById = {};
  users.forEach((u) => (userById[u.id] = u));

  const counts = {};
  tasks.forEach((t) => {
    const user = userById[t.assignedTo];
    const depName = (user && user.depName) || "Unassigned";
    counts[depName] = (counts[depName] || 0) + 1;
  });

  const palette = ["var(--accent)", "var(--success)", "var(--warning)", "var(--danger)", "var(--text-secondary)"];
  const entries = Object.keys(counts).map((depName, i) => ({
    label: depName,
    color: palette[i % palette.length],
    count: counts[depName],
  }));

  renderReportsBarList("department-breakdown-body", entries);
}

function renderTopContributors() {
  const tbody = document.getElementById("contributors-table-body");
  const countEl = document.getElementById("contributors-count");
  if (!tbody) return;

  const { users } = reportsGetData();
  const tasks = reportsScopedTasks();

  const perUser = {};
  tasks.forEach((t) => {
    if (!t.assignedTo) return;
    if (!perUser[t.assignedTo]) perUser[t.assignedTo] = { assigned: 0, completed: 0 };
    perUser[t.assignedTo].assigned += 1;
    if (t.taskStatus === "completed") perUser[t.assignedTo].completed += 1;
  });

  const rows = Object.keys(perUser)
    .map((userId) => {
      const user = users.find((u) => String(u.id) === String(userId));
      const stat = perUser[userId];
      const rate = stat.assigned ? Math.round((stat.completed / stat.assigned) * 100) : 0;
      return {
        nickname: (user && user.nickname) || `User #${userId}`,
        depName: (user && user.depName) || "—",
        completed: stat.completed,
        assigned: stat.assigned,
        rate,
      };
    })
    .sort((a, b) => b.completed - a.completed || b.rate - a.rate)
    .slice(0, 8);

  if (countEl) countEl.textContent = String(rows.length);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="report-empty">No contributor data available.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (r) => `
        <tr>
          <td>${r.nickname}</td>
          <td>${r.depName}</td>
          <td>${r.completed}</td>
          <td>${r.assigned}</td>
          <td>${r.rate}%</td>
        </tr>
      `,
    )
    .join("");
}

function renderReportsAll() {
  renderReportsScopeLabel();
  renderReportsKpis();
  renderStatusBreakdown();
  renderDepartmentBreakdown();
  renderTopContributors();
}

function initReportsPage() {
  renderReportsAll();

  const refreshBtn = document.getElementById("reports-refresh-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      renderReportsAll();
      if (typeof showNotification === "function") {
        showNotification("success", "Report data refreshed.");
      }
    });
  }

  const exportBtn = document.getElementById("reports-export-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (typeof showNotification === "function") {
        showNotification("success", "Report export started. This is a demo environment, so no file is generated.");
      }
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initReportsPage);
} else {
  initReportsPage();
}
