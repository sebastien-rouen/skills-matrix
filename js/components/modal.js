/**
 * Reusable modal dialog component.
 * Provides open/close/confirm functionality.
 */

/** @type {HTMLElement|null} Currently active modal backdrop */
let activeBackdrop = null;

/**
 * Show a modal dialog.
 * @param {Object} options - Modal configuration
 * @param {string} options.title - Modal title
 * @param {string} options.body - Modal body HTML content
 * @param {string} [options.confirmLabel='Confirmer'] - Confirm button label
 * @param {string} [options.cancelLabel='Annuler'] - Cancel button label
 * @param {string} [options.confirmClass='btn--primary'] - Confirm button CSS class
 * @param {Function} [options.onConfirm] - Callback when confirmed
 * @param {Function} [options.onCancel] - Callback when cancelled
 * @returns {HTMLElement} The modal backdrop element
 */
export function showModal({
  title,
  body,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  confirmClass = 'btn--primary',
  onConfirm,
  onCancel,
}) {
  closeModal(); // Close any existing modal

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal__header">
        <h3 class="modal__title">${title}</h3>
        <button class="modal__close" data-action="close">&times;</button>
      </div>
      <div class="modal__body">${body}</div>
      <div class="modal__footer">
        <button class="btn btn--ghost" data-action="cancel">${cancelLabel}</button>
        <button class="btn ${confirmClass}" data-action="confirm">${confirmLabel}</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  // Trigger the visible transition on next frame
  requestAnimationFrame(() => {
    backdrop.classList.add('modal-backdrop--visible');
  });

  // Bind events
  backdrop.querySelector('[data-action="close"]').addEventListener('click', () => {
    closeModal();
    onCancel?.();
  });

  backdrop.querySelector('[data-action="cancel"]').addEventListener('click', () => {
    closeModal();
    onCancel?.();
  });

  backdrop.querySelector('[data-action="confirm"]').addEventListener('click', () => {
    onConfirm?.();
    closeModal();
  });

  // Close on backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeModal();
      onCancel?.();
    }
  });

  // Close on Escape key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      onCancel?.();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  activeBackdrop = backdrop;
  return backdrop;
}

/**
 * Show a simple confirmation dialog.
 * @param {string} title - Dialog title
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
 */
export function confirm(title, message) {
  return new Promise((resolve) => {
    showModal({
      title,
      body: `<p>${message}</p>`,
      confirmLabel: 'Confirmer',
      confirmClass: 'btn--danger',
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}

/**
 * Close the currently active modal.
 */
export function closeModal() {
  if (activeBackdrop) {
    activeBackdrop.classList.remove('modal-backdrop--visible');
    setTimeout(() => {
      activeBackdrop?.remove();
      activeBackdrop = null;
    }, 250);
  }
}
