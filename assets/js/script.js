let loginForm;
let errorMessage;
let forgotPasswordLink;

function resolveApiPath(path) {
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

const loginEndpoint = resolveApiPath("/api/auth/login");
const forgotPasswordEndpoint = resolveApiPath("/api/auth/forgot-password");

console.log("[script.js] Loading...");

function showMessage(message, isError = true) {
  if (!errorMessage) {
    console.warn(
      "[showMessage] errorMessage element not found, logging instead:",
      message,
    );
    return;
  }
  errorMessage.textContent = message;
  errorMessage.classList.toggle("success-message", !isError);
  errorMessage.classList.toggle("error-message", isError);
}

function showError(message) {
  console.log("[showError] Displaying error:", message);
  showMessage(message, true);
}

function showSuccess(message) {
  console.log("[showSuccess] Displaying success:", message);
  showMessage(message, false);
}

async function parseApiErrorResponse(response) {
  const responseText = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(responseText);
  } catch (e) {
    console.warn(
      "[parseApiErrorResponse] Failed to parse response JSON:",
      responseText,
    );
  }
  return (
    payload?.message ||
    payload?.error ||
    payload?.detail ||
    response.statusText ||
    responseText ||
    `HTTP ${response.status}`
  );
}

function buildPasswordResetPayload(identifier) {
  const payload = {};
  const trimmed = identifier.trim();

  if (trimmed.includes("@")) {
    payload.email = trimmed;
  } else {
    payload.username = trimmed;
  }

  return payload;
}

async function submitLogin(event) {
  event.preventDefault();
  console.log(
    "[submitLogin] ==================== START submitLogin ====================",
  );
  console.log("[submitLogin] loginForm:", loginForm);

  if (!loginForm) {
    console.error("[submitLogin] FATAL: loginForm is null");
    showError("Form not initialized. Please refresh the page.");
    return;
  }

  showError("");

  const identifier = loginForm.email?.value?.trim() || "";
  const password = loginForm.password?.value || "";

  console.log(
    "[submitLogin] Input - Email/Username:",
    identifier,
    "Password length:",
    password.length,
  );

  if (!identifier || !password) {
    const msg = "Please enter both username/email and password.";
    console.warn("[submitLogin]", msg);
    showError(msg);
    console.log(
      "[submitLogin] ==================== END (validation failed) ====================",
    );
    return;
  }

  const loginBody = identifier.includes("@")
    ? { email: identifier, password }
    : { username: identifier, password };

  console.log("[submitLogin] Sending to", loginEndpoint, loginBody);

  try {
    const response = await fetch(loginEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginBody),
    });

    console.log("[submitLogin] Response status:", response.status);

    const responseText = await response.text();
    let responseData = null;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error(
        "[submitLogin] Failed to parse JSON response:",
        responseText,
      );
    }

    if (!response.ok) {
      const message =
        responseData?.message ||
        responseData?.error ||
        responseData?.detail ||
        responseText ||
        response.statusText ||
        `Login failed (${response.status})`;
      console.error(
        "[submitLogin] Login failed with status",
        response.status,
        ":",
        message,
      );
      showError(message);
      console.log(
        "[submitLogin] ==================== END (login rejected) ====================",
      );
      return;
    }

    if (!responseData) {
      const msg =
        responseText || response.statusText || `HTTP ${response.status}`;
      console.error(
        "[submitLogin] No JSON data in response. Text:",
        responseText,
      );
      showError(msg);
      return;
    }

    console.log("[submitLogin] Full response data:", responseData);

    const data = responseData?.data || responseData;
    console.log("[submitLogin] Extracted data:", data);

    if (!data || !data.token) {
      const msg =
        responseData?.message ||
        responseData?.error ||
        responseData?.detail ||
        responseText ||
        response.statusText ||
        `HTTP ${response.status}`;
      console.error("[submitLogin] No token in response. Data:", data);
      showError(msg);
      console.log(
        "[submitLogin] ==================== END (no token) ====================",
      );
      return;
    }

    console.log("[submitLogin] Token received:", data.token);
    console.log("[submitLogin] Storing token to localStorage...");
    localStorage.setItem("authToken", data.token);

    if (data.user) {
      console.log("[submitLogin] Storing user to localStorage...");
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    console.log("[submitLogin] Auth complete. Redirecting based on role...");
    console.log(
      "[submitLogin] ==================== END (success) ====================",
    );
    if (typeof redirectToRoleHomepage === "function") {
      redirectToRoleHomepage();
    } else {
      window.location.href = "/assets/html/dashboard.html";
    }
  } catch (error) {
    console.error("[submitLogin] EXCEPTION:", error);
    showError(
      error.message ||
        "Network error. Please check your connection and try again.",
    );
    console.log(
      "[submitLogin] ==================== END (exception) ====================",
    );
  }
}

let toastContainer;

function createToastContainer() {
  if (toastContainer) return toastContainer;
  toastContainer = document.createElement("div");
  toastContainer.className = "toast-container";
  document.body.appendChild(toastContainer);
  return toastContainer;
}

function showToast(message, type = "success") {
  const container = createToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = message;
  container.appendChild(toast);

  const timeoutId = window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(16px)";
    toast.addEventListener(
      "transitionend",
      () => {
        toast.remove();
      },
      { once: true },
    );
  }, 4200);

  toast.addEventListener("mouseenter", () => {
    window.clearTimeout(timeoutId);
  });
  toast.addEventListener("mouseleave", () => {
    window.setTimeout(() => {
      toast.remove();
    }, 1200);
  });
}

function createForgotPasswordModal() {
  let modal = document.getElementById("forgot-password-modal");
  if (modal) return modal;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div id="forgot-password-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="forgot-password-title" aria-describedby="forgot-password-description">
      <div class="modal-content">
        <div class="modal-header">
          <h4 id="forgot-password-title">Reset Password</h4>
          <button id="close-forgot-password" type="button" class="close-button" aria-label="Close reset password dialog">&times;</button>
        </div>
        <form id="forgot-password-form">
          <label for="forgot-password-input">
            Email
            <input id="forgot-password-input" type="email" name="identifier" autocomplete="email" placeholder="name@example.com" required />
          </label>
          <p id="forgot-password-description" class="help-text">
            Enter your email address to receive a reset link.
          </p>
          <p id="forgot-password-validation" class="validation-text" aria-live="assertive"></p>
          <div class="modal-actions">
            <button type="button" id="cancel-forgot-password" class="secondary-button">Cancel</button>
            <button type="submit" class="primary-button">Send reset link</button>
          </div>
        </form>
      </div>
    </div>
  `;

  modal = wrapper.firstElementChild;
  if (!modal) return null;

  document.body.appendChild(modal);
  const form = modal.querySelector("#forgot-password-form");
  const cancelButton = modal.querySelector("#cancel-forgot-password");
  const closeButton = modal.querySelector("#close-forgot-password");

  if (form) {
    form.addEventListener("submit", submitForgotPassword);
  }
  if (cancelButton) {
    cancelButton.addEventListener("click", hideForgotPasswordModal);
  }
  if (closeButton) {
    closeButton.addEventListener("click", hideForgotPasswordModal);
  }
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      hideForgotPasswordModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("visible")) {
      hideForgotPasswordModal();
    }
  });

  return modal;
}

function showModalValidation(message = "") {
  const validation = document.getElementById("forgot-password-validation");
  if (!validation) return;
  validation.textContent = message;
  const input = document.getElementById("forgot-password-input");
  if (input) {
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }
}

function resetForgotPasswordForm() {
  const form = document.getElementById("forgot-password-form");
  if (!form) return;
  form.reset();
  showModalValidation("");
  const submit = form.querySelector("button[type=submit]");
  if (submit) {
    submit.disabled = false;
    submit.classList.remove("loading");
    submit.textContent = "Send reset link";
  }
}

function openForgotPasswordModal(event) {
  if (event) {
    event.preventDefault();
  }
  showError("");
  const modal = createForgotPasswordModal();
  if (!modal) return;
  resetForgotPasswordForm();
  modal.classList.remove("hidden");
  window.requestAnimationFrame(() => {
    modal.classList.add("visible");
  });
  const emailInput = document.getElementById("forgot-password-input");
  if (emailInput) {
    emailInput.focus();
  }
}

function hideForgotPasswordModal() {
  const modal = document.getElementById("forgot-password-modal");
  if (!modal || !modal.classList.contains("visible")) return;
  modal.classList.remove("visible");
  modal.addEventListener(
    "transitionend",
    function onTransitionEnd() {
      modal.classList.add("hidden");
      modal.removeEventListener("transitionend", onTransitionEnd);
    },
    { once: true },
  );
}

async function submitForgotPassword(event) {
  event.preventDefault();
  const form = event.target;
  const identifier = form.identifier?.value?.trim() || "";
  const submitButton = form.querySelector("button[type=submit]");

  showModalValidation("");

  if (!identifier) {
    showModalValidation("Please enter your email address.");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(identifier)) {
    showModalValidation("Please enter a valid email address.");
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.classList.add("loading");
    submitButton.textContent = "Sending...";
  }

  try {
    const response = await fetch(forgotPasswordEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPasswordResetPayload(identifier)),
    });

    if (!response.ok) {
      const message = await parseApiErrorResponse(response);
      showModalValidation(message);
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.classList.remove("loading");
        submitButton.textContent = "Send reset link";
      }
      return;
    }

    const data = await response.json().catch(() => ({}));
    showToast(
      data?.message || `Reset link sent successfully to your email.`,
      "success",
    );
    hideForgotPasswordModal();
    resetForgotPasswordForm();
  } catch (error) {
    console.error("Forgot password request failed:", error);
    showToast(
      error.message || "Failed to send reset link. Please try again.",
      "error",
    );
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.classList.remove("loading");
      submitButton.textContent = "Send reset link";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("[script.js] DOMContentLoaded event fired");
  loginForm = document.getElementById("login-form");
  errorMessage = document.getElementById("error-message");
  forgotPasswordLink = document.getElementById("forgot-password");

  console.log("[script.js] Form elements found:", {
    loginForm: !!loginForm,
    errorMessage: !!errorMessage,
    forgotPasswordLink: !!forgotPasswordLink,
  });

  if (loginForm) {
    loginForm.addEventListener("submit", submitLogin);
    console.log("[script.js] Submit listener attached");
  } else {
    console.error("[script.js] ERROR: login-form not found!");
  }

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", openForgotPasswordModal);
  }

  // Prevent back button navigation
  window.history.pushState(null, null, window.location.href);
  window.addEventListener("popstate", function () {
    window.history.pushState(null, null, window.location.href);
  });
});
