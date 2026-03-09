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
 * Show a styled form modal to create a new template.
 * @param {number} memberCount - Number of members in current data (for preview)
 * @param {number} skillCount - Number of skills in current data (for preview)
 * @returns {Promise<{title: string, description: string}|null>} Form data or null if cancelled
 */
export function promptCreateTemplate(memberCount, skillCount) {
  return new Promise((resolve) => {
    const backdrop = showModal({
      title: 'Nouveau template',
      body: `
        <div style="display: flex; flex-direction: column; gap: var(--space-4);">
          <div style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); background: var(--color-bg-secondary); border-radius: var(--radius-lg); border: 1px solid var(--color-border);">
            <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--color-primary-100); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">📦</div>
            <div>
              <div style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-text-primary);">${memberCount} membre${memberCount > 1 ? 's' : ''} · ${skillCount} competence${skillCount > 1 ? 's' : ''}</div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">Ces donnees seront enregistrees dans le template</div>
            </div>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="tpl-title">Nom du template *</label>
            <input class="form-input" type="text" id="tpl-title" placeholder="Ex : Equipe Produit Q1 2026" autocomplete="one-time-code" data-lpignore="true" data-1p-ignore data-form-type="other" autofocus>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="tpl-description">Description</label>
            <input class="form-input" type="text" id="tpl-description" placeholder="Ex : 12 devs, focus IA et Cloud" autocomplete="one-time-code" data-lpignore="true" data-1p-ignore data-form-type="other">
          </div>
        </div>
      `,
      confirmLabel: 'Creer le template',
      confirmClass: 'btn--primary',
      onConfirm: () => {
        const title = backdrop.querySelector('#tpl-title').value.trim();
        if (!title) {
          resolve(null);
          return;
        }
        const description = backdrop.querySelector('#tpl-description').value.trim();
        resolve({ title, description });
      },
      onCancel: () => resolve(null),
    });

    // Focus le champ titre apres l'animation d'ouverture
    requestAnimationFrame(() => {
      const input = backdrop.querySelector('#tpl-title');
      input?.focus();
      // Valider avec Enter
      backdrop.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.activeElement?.id?.startsWith('tpl-')) {
          e.preventDefault();
          backdrop.querySelector('[data-action="confirm"]')?.click();
        }
      });
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
