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

    const icon = type === "success" ? "✓" : "⚠";
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
