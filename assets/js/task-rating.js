const taskRatingElements = {
  ratingModal: null,
  ratingStars: null,
  ratingComment: null,
  ratingError: null,
  ratingDisplay: null,
};

const taskRatingState = {
  currentTaskId: null,
  currentRating: 0,
  existingRating: null,
  canEdit: true,
};

function apiPath(path) {
  // Delegates to api-base.js — single source of truth for API URL resolution.
  return window.itwmsApiPath(path);
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

function getCurrentUserRole() {
  if (typeof getCurrentRole === "function") return getCurrentRole();
  try { const user = JSON.parse(localStorage.getItem("user") || "{}"); return user.roleName || user.role || "Employee"; }
  catch { return "Employee"; }
}

function normalizeRoleName(role) {
  return String(role || "").trim().toLowerCase();
}

function getRaterRoleFromRating(ratingData) {
  if (!ratingData) return null;
  const user =
    ratingData.ratedByUser ??
    ratingData.user ??
    ratingData.rater ??
    ratingData.createdByUser ??
    ratingData.updatedByUser ??
    null;
  if (user) {
    return user.roleName ?? user.role?.name ?? user.role ?? null;
  }
  return (
    ratingData.ratedByRole ??
    ratingData.raterRole ??
    ratingData.raterRoleName ??
    ratingData.updatedByRole ??
    null
  );
}

function isRatingLockedByAdmin(ratingData) {
  return normalizeRoleName(getRaterRoleFromRating(ratingData)) === "admin";
}

function canEditTaskRating(ratingData) {
  const role = getCurrentUserRole();
  if (role === "Admin") return true;
  if (role !== "Manager") return false;
  if (!ratingData || ratingData.rating == null) return true;
  return !isRatingLockedByAdmin(ratingData);
}

function canOpenRatingModal(task) {
  if (typeof window.canRateTaskForUser === "function") {
    return window.canRateTaskForUser(task);
  }
  const role = getCurrentUserRole();
  return role === "Admin" || role === "Manager";
}

function createRatingModal() {
  if (taskRatingElements.ratingModal) return taskRatingElements.ratingModal;
  const modal = document.createElement("div");
  modal.id = "rating-modal";
  modal.className = "modal hidden";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "rating-modal-title");
  modal.innerHTML = `
    <div class="modal-content tasks-modal-content tasks-modal-content--form">
      <div class="modal-header">
        <h3 id="rating-modal-title">Rate Task</h3>
        <button type="button" id="close-rating-modal" class="close-button" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="star-rating-section">
          <p class="rating-label">How would you rate this task?</p>
          <div class="star-rating" id="star-rating" data-rating="0">
            <span class="star" data-value="1">☆</span>
            <span class="star" data-value="2">☆</span>
            <span class="star" data-value="3">☆</span>
            <span class="star" data-value="4">☆</span>
            <span class="star" data-value="5">☆</span>
          </div>
          <p class="rating-value-display" id="rating-value-display">No rating selected</p>
        </div>
        <label class="rating-comment-label">
          Comment (optional)
          <textarea id="rating-comment" rows="3" placeholder="Add feedback about the task completion..."></textarea>
        </label>
        <p id="rating-locked-message" class="meta-text rating-locked-message" hidden></p>
        <p id="rating-error" class="tasks-inline-error" hidden></p>
      </div>
      <div class="modal-actions tasks-modal-actions">
        <button type="button" class="primary-button" id="rating-submit">Submit Rating</button>
        <button type="button" id="cancel-rating" class="ghost-button">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  taskRatingElements.ratingModal = modal;
  taskRatingElements.ratingStars = modal.querySelectorAll(".star");
  taskRatingElements.ratingComment = modal.querySelector("#rating-comment");
  taskRatingElements.ratingError = modal.querySelector("#rating-error");
  registerRatingModalEvents();
  return modal;
}

function registerRatingModalEvents() {
  const modal = taskRatingElements.ratingModal;
  if (!modal) return;
  const closeBtn = modal.querySelector("#close-rating-modal");
  const cancelBtn = modal.querySelector("#cancel-rating");
  const submitBtn = modal.querySelector("#rating-submit");
  const stars = modal.querySelectorAll(".star");
  if (closeBtn) closeBtn.addEventListener("click", closeRatingModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeRatingModal);
  if (submitBtn) submitBtn.addEventListener("click", submitRating);
  if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) closeRatingModal(); });
  stars.forEach((star) => {
    star.addEventListener("mouseenter", () => {
      if (!taskRatingState.canEdit) return;
      previewRating(parseInt(star.dataset.value, 10));
    });
    star.addEventListener("mouseleave", () => restoreRating());
    star.addEventListener("click", () => {
      if (!taskRatingState.canEdit) return;
      setRating(parseInt(star.dataset.value, 10));
    });
  });
}

function previewRating(value) {
  const stars = taskRatingElements.ratingStars;
  if (!stars) return;
  stars.forEach((star) => {
    const starValue = parseInt(star.dataset.value, 10);
    star.textContent = starValue <= value ? "★" : "☆";
    star.classList.toggle("star--active", starValue <= value);
  });
  const display = document.getElementById("rating-value-display");
  if (display) display.textContent = `${value} star${value !== 1 ? "s" : ""}`;
}

function restoreRating() {
  previewRating(taskRatingState.currentRating);
}

function setRating(value) {
  if (!taskRatingState.canEdit) return;
  taskRatingState.currentRating = value;
  previewRating(value);
}

function applyRatingModalMode(ratingData) {
  const modal = taskRatingElements.ratingModal;
  if (!modal) return;

  const hasRating = Boolean(ratingData && ratingData.rating != null);
  const canEdit = taskRatingState.canEdit;
  const title = modal.querySelector("#rating-modal-title");
  const submitBtn = modal.querySelector("#rating-submit");
  const lockedMsg = modal.querySelector("#rating-locked-message");
  const starContainer = modal.querySelector("#star-rating");
  const comment = taskRatingElements.ratingComment;

  if (title) {
    title.textContent = hasRating ? "View Rating" : "Rate Task";
  }

  if (submitBtn) {
    submitBtn.hidden = !canEdit;
    submitBtn.textContent = hasRating ? "Update Rating" : "Submit Rating";
  }

  if (comment) {
    comment.readOnly = !canEdit;
    comment.disabled = !canEdit;
  }

  if (starContainer) {
    starContainer.classList.toggle("star-rating--readonly", !canEdit);
  }

  if (lockedMsg) {
    if (!canEdit && hasRating && getCurrentUserRole() === "Manager") {
      lockedMsg.textContent =
        "This rating was set or updated by an administrator and can no longer be edited.";
      lockedMsg.hidden = false;
    } else {
      lockedMsg.textContent = "";
      lockedMsg.hidden = true;
    }
  }
}

async function openRatingModal(taskId) {
  const task =
    typeof window.getTaskFromList === "function"
      ? window.getTaskFromList(taskId)
      : null;

  if (!canOpenRatingModal(task)) {
    showAccessDenied("You don't have permission to rate this task");
    return;
  }

  taskRatingState.currentTaskId = taskId;
  taskRatingState.currentRating = 0;
  taskRatingState.existingRating = null;
  taskRatingState.canEdit = true;

  createRatingModal();
  await loadExistingRating(taskId);
  taskRatingState.canEdit = canEditTaskRating(taskRatingState.existingRating);
  applyRatingModalMode(taskRatingState.existingRating);

  const modal = taskRatingElements.ratingModal;
  if (modal) modal.classList.remove("hidden");
}

function closeRatingModal() {
  const modal = taskRatingElements.ratingModal;
  if (modal) modal.classList.add("hidden");
  taskRatingState.currentTaskId = null;
  taskRatingState.currentRating = 0;
  taskRatingState.existingRating = null;
  taskRatingState.canEdit = true;
  if (taskRatingElements.ratingComment) {
    taskRatingElements.ratingComment.value = "";
    taskRatingElements.ratingComment.readOnly = false;
    taskRatingElements.ratingComment.disabled = false;
  }
  if (taskRatingElements.ratingError) {
    taskRatingElements.ratingError.textContent = "";
    taskRatingElements.ratingError.hidden = true;
  }
  const lockedMsg = taskRatingElements.ratingModal?.querySelector("#rating-locked-message");
  if (lockedMsg) {
    lockedMsg.textContent = "";
    lockedMsg.hidden = true;
  }
}

async function loadExistingRating(taskId) {
  const data = await fetchTaskRating(taskId);
  if (data && data.rating != null) {
    taskRatingState.existingRating = data;
    setRating(data.rating);
    if (taskRatingElements.ratingComment) {
      taskRatingElements.ratingComment.value = data.comment || "";
    }
  } else {
    taskRatingState.existingRating = null;
    setRating(0);
    if (taskRatingElements.ratingComment) taskRatingElements.ratingComment.value = "";
  }
}

async function fetchTaskRating(taskId) {
  try {
    const data = await fetchJson(apiPath(`/api/tasks/${taskId}/rating`));
    if (data && data.rating != null) return data;
    return null;
  } catch (error) {
    console.log("No existing rating found:", error);
    return null;
  }
}

function buildTaskRatingDisplayHtml(ratingData) {
  if (!ratingData || ratingData.rating == null) return "";
  const ratingValue = Number(ratingData.rating);
  if (!Number.isFinite(ratingValue) || ratingValue < 1) return "";
  const comment = (ratingData.comment || "").trim();
  const starsHtml = Array.from({ length: 5 }, (_, i) =>
    `<span class="star-display ${i < ratingValue ? "star-display--filled" : ""}">★</span>`
  ).join("");
  const commentHtml = comment
    ? `<p class="task-rating-remarks"><span class="rating-label">Remarks</span>${escapeHtml(comment)}</p>`
    : "";
  return `<div class="task-rating-display"><p class="rating-label">Task rating</p><div class="star-rating-display">${starsHtml}<span class="rating-number">${ratingValue}/5</span></div>${commentHtml}</div>`;
}

async function submitRating() {
  const taskId = taskRatingState.currentTaskId;
  if (!taskId) return;

  if (!taskRatingState.canEdit) {
    showAccessDenied("This rating cannot be edited");
    return;
  }

  const rating = taskRatingState.currentRating;
  if (rating < 1 || rating > 5) {
    if (taskRatingElements.ratingError) {
      taskRatingElements.ratingError.textContent = "Please select a rating between 1 and 5 stars.";
      taskRatingElements.ratingError.hidden = false;
    }
    return;
  }
  const comment = taskRatingElements.ratingComment?.value?.trim() || "";
  const wasUpdate = Boolean(taskRatingState.existingRating);
  try {
    const method = wasUpdate ? "PUT" : "POST";
    await fetchJson(apiPath(`/api/tasks/${taskId}/rate`), {
      method,
      body: JSON.stringify({ rating, comment }),
    });
    closeRatingModal();
    if (typeof showNotification === "function") {
      showNotification(
        "success",
        wasUpdate ? "Rating updated" : "Rating submitted"
      );
    }
    if (window.itwmsApiCache) {
      window.itwmsApiCache.invalidate("/api/tasks");
      window.itwmsApiCache.invalidate(`/api/tasks/${taskId}`);
      window.itwmsApiCache.invalidate(`/api/tasks/${taskId}/rating`);
    }
    if (typeof loadTasks === "function") loadTasks();
    const viewModal = document.getElementById("task-view-modal");
    if (viewModal && !viewModal.classList.contains("hidden") && typeof openViewTaskModal === "function") {
      openViewTaskModal(taskId);
    }
  } catch (error) {
    console.error("Failed to submit rating:", error);
    if (taskRatingElements.ratingError) {
      taskRatingElements.ratingError.textContent = error.message || "Failed to submit rating.";
      taskRatingElements.ratingError.hidden = false;
    }
    if (typeof showNotification === "function") showNotification("error", "Failed to submit rating.");
  }
}

function renderStarRatingDisplay(containerId, rating, maxRating = 5) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let html = '<div class="star-rating-display">';
  for (let i = 1; i <= maxRating; i++) {
    html += `<span class="star-display ${i <= rating ? "star-display--filled" : ""}">★</span>`;
  }
  html += `<span class="rating-number">${rating || 0}/${maxRating}</span>`;
  html += "</div>";
  container.innerHTML = html;
}

function showAccessDenied(message = "Access Denied") {
  console.warn(`[RBAC] ${message}`);
  alert(`${message}. Your role does not have permission.`);
}

window.openRatingModal = openRatingModal;
window.closeRatingModal = closeRatingModal;
window.renderStarRatingDisplay = renderStarRatingDisplay;
window.fetchTaskRating = fetchTaskRating;
window.buildTaskRatingDisplayHtml = buildTaskRatingDisplayHtml;
window.canEditTaskRating = canEditTaskRating;
