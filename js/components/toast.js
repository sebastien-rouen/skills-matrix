/**
 * Toast notification component.
 * Shows temporary messages that auto-dismiss.
 */

/** @type {HTMLElement|null} Toast container element */
let container = null;

/** Toast type icons and their semantic meaning */
const TOAST_ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

/**
 * Initialize the toast container (call once on app start).
 */
export function initToasts() {
  if (container) return;

  container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);
}

/**
 * Show a toast notification.
 * @param {string} message - Message to display
 * @param {('success'|'error'|'warning'|'info')} [type='info'] - Toast type
 * @param {number} [duration=3500] - Auto-dismiss delay in ms (0 = no auto-dismiss)
 */
export function showToast(message, type = 'info', duration = 3500) {
  if (!container) initToasts();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${TOAST_ICONS[type] || 'ℹ'}</span>
    <span class="toast__message">${message}</span>
    <button class="toast__close">&times;</button>
  `;

  container.appendChild(toast);

  // Bind close button
  toast.querySelector('.toast__close').addEventListener('click', () => {
    dismissToast(toast);
  });

  // Auto-dismiss after duration
  if (duration > 0) {
    setTimeout(() => dismissToast(toast), duration);
  }
}

/**
 * Dismiss a specific toast element with animation.
 * @param {HTMLElement} toast - The toast element to remove
 */
function dismissToast(toast) {
  if (!toast || !toast.parentNode) return;

  toast.classList.add('toast--leaving');
  setTimeout(() => toast.remove(), 300);
}

// Convenience methods

/**
 * Show a success toast.
 * @param {string} message - Success message
 */
export function toastSuccess(message) {
  showToast(message, 'success');
}

/**
 * Show an error toast.
 * @param {string} message - Error message
 */
export function toastError(message) {
  showToast(message, 'error', 5000);
}

/**
 * Show a warning toast.
 * @param {string} message - Warning message
 */
export function toastWarning(message) {
  showToast(message, 'warning', 4000);
}

/**
 * Show an info toast.
 * @param {string} message - Info message
 */
export function toastInfo(message) {
  showToast(message, 'info');
}
