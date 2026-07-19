// Notification System
// Reusable function to show notifications for CRUD operations

class NotificationSystem {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create notification container if it doesn't exist
    if (!document.getElementById("notification-container")) {
      this.container = document.createElement("div");
      this.container.id = "notification-container";
      this.container.className = "notification-container";
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById("notification-container");
    }
  }

  show(type, message) {
    const notification = document.createElement("div");
    notification.className = `notification notification--${type}`;

    const icon = type === "success" ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    const iconClass =
      type === "success"
        ? "notification__icon--success"
        : "notification__icon--error";

    notification.innerHTML = `
      <span class="notification__icon ${iconClass}">${icon}</span>
      <span class="notification__message">${message}</span>
      <button class="notification__close" aria-label="Close notification">&times;</button>
    `;

    // Add to container
    this.container.appendChild(notification);

    // Trigger animation
    setTimeout(() => {
      notification.classList.add("notification--visible");
    }, 10);

    // Auto remove after 4 seconds
    const autoRemove = setTimeout(() => {
      this.remove(notification);
    }, 4000);

    // Manual close
    const closeBtn = notification.querySelector(".notification__close");
    closeBtn.addEventListener("click", () => {
      clearTimeout(autoRemove);
      this.remove(notification);
    });
  }

  remove(notification) {
    notification.classList.remove("notification--visible");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300); // Match CSS transition duration
  }
}

// Global instance
const notificationSystem = new NotificationSystem();

// Global function for easy use
function showNotification(type, message) {
  notificationSystem.show(type, message);
}
