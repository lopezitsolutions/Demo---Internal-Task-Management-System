/**
 * API paths: demo-only mode. All requests are intercepted by demo-mode.js.
 * No live API endpoint is configured.
 */
(function () {
  function getApiBase() {
    // If /itwms-client-config.js ran, __API_BASE__ is always set (often "" for same-origin proxy).
    // Do not use `if (window.__API_BASE__)` — empty string must win over localStorage or login hits remote + CORS.
    if (
      typeof window !== "undefined" &&
      Object.prototype.hasOwnProperty.call(window, "__API_BASE__")
    ) {
      return String(window.__API_BASE__ ?? "").replace(/\/$/, "");
    }
    try {
      if (typeof localStorage !== "undefined") {
        const fromStorage = localStorage.getItem("itwmsApiBase");
        if (fromStorage) return String(fromStorage).replace(/\/$/, "");
      }
    } catch (_) {
      /* private mode */
    }
    return "";
  }

  function apiPath(path) {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const base =
      getApiBase() || "";
    return base ? `${base}${normalized}` : normalized;
  }

  if (typeof window !== "undefined") {
    const resolvedBase =
      getApiBase() || "";
    if (!Object.prototype.hasOwnProperty.call(window, "__API_BASE__")) {
      window.__API_BASE__ = resolvedBase;
    }
    window.itwmsApiPath = apiPath;
  }
})();

