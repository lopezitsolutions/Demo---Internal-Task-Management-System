/**
 * Reports Module (Employee Report Feed)
 * Adapted from the production reports.js for demo mode.
 * Preserves the real status workflow (draft -> submitted -> reviewed -> archived)
 * and role permissions. Simplified: single-page feed instead of infinite scroll,
 * and no server-side rich-content table styling normalization.
 */

const reportElements = {
  createReportBtn: document.getElementById("create-report-btn"),
  reportsCount: document.getElementById("reports-count"),
  reportsFeed: document.getElementById("reports-feed"),
  reportsListError: document.getElementById("reports-list-error"),
  reportForm: document.getElementById("report-form"),
  reportFormModal: document.getElementById("report-form-modal"),
  reportFormModalTitle: document.getElementById("report-form-modal-title"),
  reportFormSubmit: document.getElementById("report-form-submit"),
  submitReportBtn: document.getElementById("submit-report-btn"),
  cancelReportForm: document.getElementById("cancel-report-form"),
  closeReportFormModal: document.getElementById("close-report-form-modal"),
  reportViewModal: document.getElementById("report-view-modal"),
  reportViewModalTitle: document.getElementById("report-view-modal-title"),
  closeReportViewModal: document.getElementById("close-report-view-modal"),
  reportViewEditBtn: document.getElementById("report-view-edit-btn"),
  reportViewArchiveBtn: document.getElementById("report-view-archive-btn"),
  detailBody: document.getElementById("report-detail-body"),
  reportFormError: document.getElementById("report-form-error"),
  statusFilter: document.getElementById("reports-status-filter"),
  depFilter: document.getElementById("reports-dep-filter"),
  depFilterWrap: document.getElementById("reports-dep-filter-wrap"),
  userFilter: document.getElementById("reports-user-filter"),
  userFilterWrap: document.getElementById("reports-user-filter-wrap"),
  sortSelect: document.getElementById("reports-sort-select"),
  dateFrom: document.getElementById("reports-date-from"),
  dateTo: document.getElementById("reports-date-to"),
  dateClear: document.getElementById("reports-date-clear"),
};

const reportState = {
  reports: [],
  users: [],
  departments: [],
  editingReportId: null,
  viewingReportId: null,
  selectedStatus: "",
  filters: { depId: "", authorId: "", dateFrom: "", dateTo: "" },
  sort: { field: "updatedAt", direction: "desc" },
  isLoading: false,
};

let ckEditor = null;
let ckEditorInitPromise = null;

// ─── Permissions (ported from production reports.js) ───
function getCurrentUserRole() {
  if (typeof getCurrentRole === "function") return getCurrentRole();
  try { const user = JSON.parse(localStorage.getItem("user") || "{}"); return user.roleName || user.role || "Employee"; }
  catch { return "Employee"; }
}
function getCurrentUserId() {
  try { const user = JSON.parse(localStorage.getItem("user") || "{}"); return user.id ?? null; }
  catch { return null; }
}
function getCurrentDepartmentId() {
  try { const user = JSON.parse(localStorage.getItem("user") || "{}"); return user.depId ?? user.departmentId ?? user.department?.id ?? null; }
  catch { return null; }
}
function canCreateReport() {
  const role = getCurrentUserRole();
  return role === "Admin" || role === "Manager" || role === "Employee";
}
function canEditReport(report) {
  const userId = getCurrentUserId();
  const role = getCurrentUserRole();
  const authorId = report.authorId ?? report.userId ?? report.author?.id;
  if (String(authorId) !== String(userId)) return false;
  if (role === "Employee") return report.status === "draft";
  return report.status === "draft" || report.status === "submitted";
}
function canArchiveReport(report) {
  const role = getCurrentUserRole();
  if (report.status === "archived") return false;
  if (role === "Admin") return true;
  if (role === "Manager") {
    const managerDepId = getCurrentDepartmentId();
    const reportDepId = report.depId ?? report.department?.id;
    return managerDepId != null && reportDepId != null && String(managerDepId) === String(reportDepId);
  }
  return false;
}
function canUseReportDepFilter() { return getCurrentUserRole() === "Admin"; }
function canUseReportUserFilter() {
  const role = getCurrentUserRole();
  return role === "Admin" || (role === "Manager" && getCurrentDepartmentId() != null);
}

// ─── API helpers ───
function apiPath(path) {
  if (typeof window.itwmsApiPath === "function") return window.itwmsApiPath(path);
  return path;
}
function getAuthHeaders(additionalHeaders = {}) {
  const token = localStorage.getItem("authToken");
  const headers = { "Content-Type": "application/json", ...additionalHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: getAuthHeaders(options.headers) });
  const text = await response.text();
  let json = null;
  if (text) { try { json = JSON.parse(text); } catch { json = null; } }
  if (!response.ok) {
    const msg = json && typeof json === "object" ? json.message || json.error : null;
    throw new Error((typeof msg === "string" && msg) || `Request failed with status ${response.status}`);
  }
  if (json && typeof json === "object" && json.success === false) throw new Error(json.message || "Request failed.");
  if (!json || typeof json !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(json, "data")) return json.data;
  return json;
}
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}
function formatDate(dateString) {
  if (!dateString) return "—";
  try { return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return dateString; }
}

// ─── Status labels ───
const STATUS_LABELS = { draft: "Draft", submitted: "Submitted", reviewed: "Reviewed", archived: "Archived" };
const STATUS_BADGE_CLASS = {
  draft: "report-feed-card__status-badge--draft",
  submitted: "report-feed-card__status-badge--submitted",
  reviewed: "report-feed-card__status-badge--reviewed",
  archived: "report-feed-card__status-badge--archived",
};
function getStatusLabel(status) { return STATUS_LABELS[status] || status; }
function getStatusBadgeClass(status) { return STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.draft; }

function getAuthorDisplayName(report) {
  return report.author?.nickname || report.user?.nickname || `User ${report.userId ?? ""}`;
}
function getDepartmentName(report) {
  return report.department?.depName || "—";
}
function buildAuthorAvatarHtml(report) {
  const name = getAuthorDisplayName(report);
  const initials = String(name).split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
  return `<span class="report-feed-card__avatar report-feed-card__avatar--initials" aria-hidden="true">${escapeHtml(initials)}</span>`;
}

// ─── CKEditor ───
async function initCkEditor() {
  if (ckEditor) return ckEditor;
  if (ckEditorInitPromise) return ckEditorInitPromise;
  if (typeof ClassicEditor === "undefined") { console.warn("CKEditor 5 not loaded"); return null; }
  const element = document.getElementById("report-editor");
  if (!element) return null;
  ckEditorInitPromise = ClassicEditor.create(element, {
    licenseKey: "GPL",
    toolbar: {
      items: ["heading", "|", "bold", "italic", "|", "link", "bulletedList", "numberedList", "|", "outdent", "indent", "|", "blockQuote", "|", "insertTable", "|", "undo", "redo"],
      shouldNotGroupWhenFull: true,
    },
    table: { contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"] },
    placeholder: "Start writing your report…",
  })
    .then((editor) => { ckEditor = editor; return editor; })
    .catch((error) => { console.error("CKEditor init failed:", error); ckEditorInitPromise = null; return null; });
  return ckEditorInitPromise;
}
function getEditorContent() { return ckEditor ? ckEditor.getData() : ""; }
async function setEditorContent(html) {
  const editor = await initCkEditor();
  if (!editor) return;
  editor.setData(html || "");
}
function isEditorContentEmpty() {
  if (!ckEditor) return true;
  const text = ckEditor.getData().replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  return !text;
}

// ─── Filters ───
function configureReportFilters() {
  if (reportElements.depFilterWrap) reportElements.depFilterWrap.hidden = !canUseReportDepFilter();
  if (reportElements.userFilterWrap) reportElements.userFilterWrap.hidden = !canUseReportUserFilter();
}
async function loadFilterData() {
  const role = getCurrentUserRole();
  try {
    if (role === "Admin") {
      const [departments, usersResp] = await Promise.all([
        fetchJson(apiPath("/api/departments")).catch(() => []),
        fetchJson(apiPath("/api/users?limit=100")).catch(() => []),
      ]);
      reportState.departments = departments || [];
      reportState.users = usersResp || [];
    } else if (role === "Manager") {
      const usersResp = await fetchJson(apiPath("/api/users?limit=100")).catch(() => []);
      reportState.users = usersResp || [];
    }
  } catch (error) {
    console.warn("Unable to load filter data:", error);
  }
}
function departmentLabel(dept) { return dept?.depName ?? dept?.name ?? `Department ${dept?.id}`; }
function renderReportDepartmentFilterOptions() {
  if (!reportElements.depFilter) return;
  reportElements.depFilter.innerHTML = '<option value="">All Departments</option>';
  reportState.departments.forEach((dept) => {
    if (!dept || dept.id == null) return;
    const opt = document.createElement("option");
    opt.value = String(dept.id);
    opt.textContent = departmentLabel(dept);
    reportElements.depFilter.appendChild(opt);
  });
}
function renderReportUserFilterOptions() {
  if (!reportElements.userFilter) return;
  const depId = reportState.filters.depId;
  reportElements.userFilter.innerHTML = '<option value="">All Users</option>';
  reportState.users
    .filter((u) => !depId || String(u.depId ?? u.department?.id) === String(depId))
    .forEach((user) => {
      const opt = document.createElement("option");
      opt.value = String(user.id);
      opt.textContent = user.nickname || user.email || `User ${user.id}`;
      reportElements.userFilter.appendChild(opt);
    });
}
async function populateReportFilters() {
  configureReportFilters();
  await loadFilterData();
  renderReportDepartmentFilterOptions();
  renderReportUserFilterOptions();
}
function updateDateClearVisibility() {
  if (!reportElements.dateClear) return;
  const hasDate = reportState.filters.dateFrom || reportState.filters.dateTo;
  reportElements.dateClear.hidden = !hasDate;
}
function clearDateFilters() {
  reportState.filters.dateFrom = "";
  reportState.filters.dateTo = "";
  if (reportElements.dateFrom) reportElements.dateFrom.value = "";
  if (reportElements.dateTo) reportElements.dateTo.value = "";
  updateDateClearVisibility();
  loadReports();
}

// ─── Feed rendering ───
function applyReportSort(rows) {
  const field = reportState.sort.field || "updatedAt";
  const direction = reportState.sort.direction || "desc";
  return [...rows].sort((a, b) => {
    let aVal, bVal;
    if (field === "author") { aVal = getAuthorDisplayName(a); bVal = getAuthorDisplayName(b); }
    else { aVal = a[field] ?? ""; bVal = b[field] ?? ""; }
    aVal = String(aVal).toLowerCase();
    bVal = String(bVal).toLowerCase();
    if (aVal < bVal) return direction === "asc" ? -1 : 1;
    if (aVal > bVal) return direction === "asc" ? 1 : -1;
    return 0;
  });
}
function handleReportSortSelect(value) {
  const raw = String(value || "updatedAt-desc");
  const dash = raw.lastIndexOf("-");
  reportState.sort.field = dash > 0 ? raw.slice(0, dash) : "updatedAt";
  reportState.sort.direction = dash > 0 && raw.slice(dash + 1) === "asc" ? "asc" : "desc";
  renderReports();
}
function buildReportCardHtml(report) {
  const id = escapeHtml(report.id);
  const statusLabel = getStatusLabel(report.status);
  const statusClass = getStatusBadgeClass(report.status);
  const authorName = escapeHtml(getAuthorDisplayName(report));
  const actionButtons = [];
  if (canEditReport(report)) actionButtons.push(`<button type="button" class="report-feed-card__action-btn" data-action="edit-report" data-id="${id}">Edit</button>`);
  if (canArchiveReport(report)) actionButtons.push(`<button type="button" class="report-feed-card__action-btn" data-action="archive-report" data-id="${id}">Archive</button>`);
  const actionsHtml = actionButtons.length
    ? `<div class="report-feed-card__actions">${actionButtons.join('<span class="report-feed-card__action-sep" aria-hidden="true">·</span>')}</div>`
    : "";
  return `
    <article class="report-feed-card" data-report-id="${id}">
      <header class="report-feed-card__header">
        <div class="report-feed-card__header-left">
          <h3 class="report-feed-card__title">${escapeHtml(report.title || "Untitled report")}</h3>
          <div class="report-feed-card__author-row">
            ${buildAuthorAvatarHtml(report)}
            <span class="report-feed-card__author-name">${authorName}</span>
            <span class="report-feed-card__dept-name">${escapeHtml(getDepartmentName(report))}</span>
            <div class="report-feed-card__status-group">
              <span class="report-feed-card__status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>
              ${actionsHtml}
            </div>
          </div>
        </div>
        <div class="report-feed-card__header-right">
          <p>Created: ${escapeHtml(formatDate(report.createdAt))}</p>
          <p>Updated: ${escapeHtml(formatDate(report.updatedAt))}</p>
        </div>
      </header>
      <div class="report-feed-card__body">
        <div class="report-feed-card__rich-content">${report.content || "<p>No content provided.</p>"}</div>
      </div>
    </article>
  `;
}
function renderReports() {
  const feed = reportElements.reportsFeed;
  if (!feed) return;
  const rows = applyReportSort(reportState.reports);
  if (!rows.length) {
    feed.innerHTML = `<div class="reports-feed-empty">${reportState.isLoading ? "Loading reports..." : "No reports found."}</div>`;
  } else {
    feed.innerHTML = rows.map((report) => buildReportCardHtml(report)).join("");
  }
  if (reportElements.reportsCount) reportElements.reportsCount.textContent = String(rows.length);
}
function findReportInList(id) { return reportState.reports.find((r) => String(r.id) === String(id)); }

async function loadReports() {
  reportState.isLoading = true;
  renderReports();
  setInlineError(reportElements.reportsListError, "");
  try {
    const params = new URLSearchParams();
    if (reportState.selectedStatus) params.append("status", reportState.selectedStatus);
    if (reportState.filters.depId) params.append("depId", reportState.filters.depId);
    if (reportState.filters.authorId) params.append("authorId", reportState.filters.authorId);
    if (reportState.filters.dateFrom) params.append("from", reportState.filters.dateFrom);
    if (reportState.filters.dateTo) params.append("to", reportState.filters.dateTo);
    const data = await fetchJson(apiPath(`/api/reports?${params.toString()}`));
    reportState.reports = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Unable to load reports:", error);
    reportState.reports = [];
    setInlineError(reportElements.reportsListError, error.message || "Unable to load reports.");
  } finally {
    reportState.isLoading = false;
    renderReports();
  }
}

// ─── Create / Edit modal ───
function setInlineError(el, message) {
  if (!el) return;
  if (message) { el.textContent = message; el.hidden = false; }
  else { el.textContent = ""; el.hidden = true; }
}
function showModal(el) { if (el) el.classList.remove("hidden"); }
function hideModal(el) { if (el) el.classList.add("hidden"); }
function showAccessDenied(message = "Access Denied") {
  console.warn(`[RBAC] ${message}`);
  alert(`${message}. Your role does not have permission.`);
}

async function openCreateReportModal() {
  if (!canCreateReport()) { showAccessDenied("No permission to create reports"); return; }
  reportState.editingReportId = null;
  if (reportElements.reportFormModalTitle) reportElements.reportFormModalTitle.textContent = "Create report";
  if (reportElements.reportFormSubmit) reportElements.reportFormSubmit.textContent = "Save as draft";
  if (reportElements.submitReportBtn) reportElements.submitReportBtn.style.display = "";
  if (reportElements.reportForm) reportElements.reportForm.reset();
  setInlineError(reportElements.reportFormError, "");
  showModal(reportElements.reportFormModal);
  await setEditorContent("");
}
async function openEditReportModal(id) {
  const report = findReportInList(id);
  if (!report) return;
  if (!canEditReport(report)) { showAccessDenied("No permission to edit this report"); return; }
  reportState.editingReportId = id;
  if (reportElements.reportFormModalTitle) reportElements.reportFormModalTitle.textContent = "Edit report";
  if (reportElements.reportFormSubmit) reportElements.reportFormSubmit.textContent = report.status === "draft" ? "Update draft" : "Save changes";
  if (reportElements.submitReportBtn) reportElements.submitReportBtn.style.display = report.status === "draft" ? "" : "none";
  if (reportElements.reportForm) reportElements.reportForm.title.value = report.title || "";
  setInlineError(reportElements.reportFormError, "");
  if (reportElements.reportViewModal && !reportElements.reportViewModal.classList.contains("hidden")) hideModal(reportElements.reportViewModal);
  showModal(reportElements.reportFormModal);
  await setEditorContent(report.content || "");
}
async function closeReportFormModal() {
  const returnToViewId = reportState.viewingReportId;
  reportState.editingReportId = null;
  hideModal(reportElements.reportFormModal);
  setInlineError(reportElements.reportFormError, "");
  if (reportElements.reportForm) reportElements.reportForm.reset();
  await setEditorContent("");
  if (returnToViewId) {
    const report = findReportInList(returnToViewId);
    if (report) refreshViewReportModal(report);
    else closeReportViewModal();
  }
}

async function saveReport(event) {
  event.preventDefault();
  if (!reportElements.reportForm) return;
  const title = (reportElements.reportForm.title?.value || "").trim();
  await initCkEditor();
  const content = getEditorContent();
  if (!title) { setInlineError(reportElements.reportFormError, "Title is required."); return; }
  if (isEditorContentEmpty()) { setInlineError(reportElements.reportFormError, "Add report content before saving."); return; }
  const payload = { title, content };
  const reportId = reportState.editingReportId;
  const url = reportId ? apiPath(`/api/reports/${reportId}`) : apiPath("/api/reports");
  const method = reportId ? "PUT" : "POST";
  setInlineError(reportElements.reportFormError, "");
  try {
    await fetchJson(url, { method, body: JSON.stringify(payload) });
    hideModal(reportElements.reportFormModal);
    await loadReports();
    if (typeof showNotification === "function") showNotification("success", reportId ? "Report updated" : "Report saved as draft");
  } catch (error) {
    setInlineError(reportElements.reportFormError, error.message || "Unable to save.");
    if (typeof showNotification === "function") showNotification("error", "Failed to save report.");
  }
}
async function submitReport() {
  if (!reportElements.reportForm) return;
  const title = (reportElements.reportForm.title?.value || "").trim();
  await initCkEditor();
  const content = getEditorContent();
  if (!title) { setInlineError(reportElements.reportFormError, "Title is required."); return; }
  if (isEditorContentEmpty()) { setInlineError(reportElements.reportFormError, "Add report content before saving."); return; }
  const payload = { title, content, status: "submitted" };
  const reportId = reportState.editingReportId;
  const url = reportId ? apiPath(`/api/reports/${reportId}`) : apiPath("/api/reports");
  const method = reportId ? "PUT" : "POST";
  setInlineError(reportElements.reportFormError, "");
  try {
    await fetchJson(url, { method, body: JSON.stringify(payload) });
    hideModal(reportElements.reportFormModal);
    await loadReports();
    if (typeof showNotification === "function") showNotification("success", "Report submitted for review");
  } catch (error) {
    setInlineError(reportElements.reportFormError, error.message || "Unable to submit.");
    if (typeof showNotification === "function") showNotification("error", "Failed to submit report.");
  }
}

// ─── View modal + status workflow ───
function buildReportDetailBodyHtml(report) {
  return `
    <div class="report-meta-bar">
      <span>Status: <strong>${escapeHtml(getStatusLabel(report.status))}</strong></span>
      <span>Author: ${escapeHtml(getAuthorDisplayName(report))}</span>
      <span>Department: ${escapeHtml(getDepartmentName(report))}</span>
      <span>Created: ${escapeHtml(formatDate(report.createdAt))}</span>
      <span>Updated: ${escapeHtml(formatDate(report.updatedAt))}</span>
    </div>
    <div class="report-detail-content">${report.content || "<p>No content</p>"}</div>
    <div class="status-workflow-actions" id="report-status-actions"></div>
  `;
}
function renderStatusActions(report) {
  const container = document.getElementById("report-status-actions");
  if (!container) return;
  container.innerHTML = "";
  const role = getCurrentUserRole();
  const userId = getCurrentUserId();
  const authorId = report.authorId ?? report.userId;
  const actions = [];
  if (report.status === "draft" && String(authorId) === String(userId)) {
    actions.push({ label: "Submit for Review", action: "submit", class: "secondary-button" });
  }
  if (report.status === "submitted" && (role === "Admin" || role === "Manager")) {
    actions.push({ label: "Mark Reviewed", action: "review", class: "secondary-button" });
  }
  if (report.status !== "draft" && (role === "Admin" || String(authorId) === String(userId))) {
    actions.push({ label: "Back to Draft", action: "revert-draft", class: "ghost-button" });
  }
  actions.forEach((btn) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = btn.class;
    button.textContent = btn.label;
    button.dataset.action = btn.action;
    button.dataset.reportId = report.id;
    container.appendChild(button);
  });
}
function openViewReportModal(id) {
  reportState.viewingReportId = id;
  const report = findReportInList(id);
  if (!report) return;
  if (reportElements.reportViewModalTitle) reportElements.reportViewModalTitle.textContent = report.title || `Report #${id}`;
  if (reportElements.detailBody) reportElements.detailBody.innerHTML = buildReportDetailBodyHtml(report);
  renderStatusActions(report);
  if (reportElements.reportViewEditBtn) reportElements.reportViewEditBtn.style.display = canEditReport(report) ? "" : "none";
  if (reportElements.reportViewArchiveBtn) reportElements.reportViewArchiveBtn.style.display = canArchiveReport(report) ? "" : "none";
  showModal(reportElements.reportViewModal);
}
function refreshViewReportModal(report) {
  if (!report) return;
  openViewReportModal(report.id);
}
function closeReportViewModal() {
  reportState.viewingReportId = null;
  hideModal(reportElements.reportViewModal);
  if (reportElements.detailBody) reportElements.detailBody.innerHTML = "";
}

async function updateReportStatus(reportId, status) {
  try {
    await fetchJson(apiPath(`/api/reports/${reportId}/status`), { method: "PUT", body: JSON.stringify({ status }) });
    await loadReports();
    if (reportState.viewingReportId && String(reportState.viewingReportId) === String(reportId)) {
      if (status === "archived") closeReportViewModal();
      else {
        const updated = findReportInList(reportId);
        if (updated) refreshViewReportModal(updated);
      }
    }
    if (typeof showNotification === "function") showNotification("success", `Status updated to ${getStatusLabel(status)}`);
  } catch (error) {
    console.error("Failed to update status:", error);
    if (typeof showNotification === "function") showNotification("error", error.message || "Failed to update status.");
  }
}
async function archiveReport(id) {
  const report = findReportInList(id);
  if (!report || !canArchiveReport(report)) { showAccessDenied("No permission to archive this report"); return; }
  if (!confirm("Archive this report?")) return;
  await updateReportStatus(id, "archived");
}
function handleFeedClick(event) {
  const button = event.target.closest("[data-action]");
  if (button) {
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (!id) return;
    if (action === "edit-report") { openEditReportModal(id); return; }
    if (action === "archive-report") { archiveReport(id); }
    return;
  }
  const card = event.target.closest(".report-feed-card[data-report-id]");
  if (!card) return;
  openViewReportModal(card.dataset.reportId);
}
function handleStatusActionsClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action, reportId = button.dataset.reportId;
  if (!reportId) return;
  const statusMap = { submit: "submitted", review: "reviewed", archive: "archived", "revert-draft": "draft" };
  const newStatus = statusMap[action];
  if (newStatus) updateReportStatus(reportId, newStatus);
}

// ─── Init ───
function registerReportEvents() {
  if (reportElements.createReportBtn) reportElements.createReportBtn.addEventListener("click", () => openCreateReportModal());
  if (reportElements.reportForm) reportElements.reportForm.addEventListener("submit", saveReport);
  if (reportElements.submitReportBtn) reportElements.submitReportBtn.addEventListener("click", submitReport);
  if (reportElements.cancelReportForm) reportElements.cancelReportForm.addEventListener("click", (e) => { e.preventDefault(); closeReportFormModal(); });
  if (reportElements.closeReportFormModal) reportElements.closeReportFormModal.addEventListener("click", () => closeReportFormModal());
  if (reportElements.closeReportViewModal) reportElements.closeReportViewModal.addEventListener("click", closeReportViewModal);
  if (reportElements.reportViewEditBtn) reportElements.reportViewEditBtn.addEventListener("click", () => { if (reportState.viewingReportId) openEditReportModal(reportState.viewingReportId); });
  if (reportElements.reportViewArchiveBtn) reportElements.reportViewArchiveBtn.addEventListener("click", () => { if (reportState.viewingReportId) archiveReport(reportState.viewingReportId); });
  if (reportElements.reportsFeed) reportElements.reportsFeed.addEventListener("click", handleFeedClick);
  if (reportElements.reportViewModal) reportElements.reportViewModal.addEventListener("click", (e) => { if (e.target === reportElements.reportViewModal) closeReportViewModal(); });
  if (reportElements.statusFilter) reportElements.statusFilter.addEventListener("change", (e) => { reportState.selectedStatus = e.target.value; loadReports(); });
  if (reportElements.depFilter) reportElements.depFilter.addEventListener("change", (e) => { reportState.filters.depId = e.target.value; renderReportUserFilterOptions(); loadReports(); });
  if (reportElements.userFilter) reportElements.userFilter.addEventListener("change", (e) => { reportState.filters.authorId = e.target.value; loadReports(); });
  if (reportElements.sortSelect) reportElements.sortSelect.addEventListener("change", (e) => handleReportSortSelect(e.target.value));
  if (reportElements.dateFrom) reportElements.dateFrom.addEventListener("change", (e) => { reportState.filters.dateFrom = e.target.value; updateDateClearVisibility(); loadReports(); });
  if (reportElements.dateTo) reportElements.dateTo.addEventListener("change", (e) => { reportState.filters.dateTo = e.target.value; updateDateClearVisibility(); loadReports(); });
  if (reportElements.dateClear) reportElements.dateClear.addEventListener("click", clearDateFilters);
  updateDateClearVisibility();
  document.addEventListener("click", (e) => {
    const container = document.getElementById("report-status-actions");
    if (container && container.contains(e.target)) handleStatusActionsClick(e);
  });
}

async function initReportsPage() {
  try {
    registerReportEvents();
    await populateReportFilters();
    await loadReports();
  } catch (error) {
    console.error("[reports.js] initReportsPage failed:", error);
    if (typeof showNotification === "function") showNotification("error", "Failed to load reports. Please refresh.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initReportsPage);
} else {
  initReportsPage();
}
