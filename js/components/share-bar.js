/**
 * Share mode component.
 * Shows a modal to select member name on load,
 * then displays a member banner above the matrix filters.
 * Handles auto-save of skills to the server.
 */

import { getState, updateState, on, isShareMode, getShareMemberName } from '../state.js';
import { toastSuccess, toastInfo } from './toast.js';
import { saveSharedSkills } from '../services/share.js';
import { escapeHtml, getInitials } from '../utils/helpers.js';

/** @type {number|null} Debounce timer for auto-save in share mode */
let shareSaveTimer = null;

/** @type {boolean} Auto-save listener deja initialise */
let autoSaveSetup = false;

/**
 * Show the member selection modal.
 * Blocks interaction until a member is selected.
 */
export function showMemberSelectModal() {
  const state = getState();
  if (state.shareMemberName) return;

  const memberNames = state.members.map(m => m.name).sort((a, b) => a.localeCompare(b, 'fr'));

  // Creer le backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'share-member-modal';
  backdrop.className = 'modal-backdrop modal-backdrop--visible';

  backdrop.innerHTML = `
    <div class="modal" style="max-width: 420px;">
      <div class="modal__header">
        <h3 class="modal__title">Bienvenue !</h3>
      </div>
      <div class="modal__body">
        <p style="margin-bottom: var(--space-4); color: var(--color-text-secondary);">
          Vous accédez à la matrice de compétences
          <strong>${escapeHtml(state.activeTemplate?.title || '')}</strong>.
        </p>
        <p style="margin-bottom: var(--space-4); color: var(--color-text-primary); font-weight: 600;">
          Sélectionnez votre nom pour remplir vos compétences :
        </p>
        <select id="share-modal-select" class="form-select" style="width: 100%;">
          <option value="">-- Choisir votre nom --</option>
          ${memberNames.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')}
        </select>
      </div>
      <div class="modal__footer">
        <button class="btn btn--primary" id="share-modal-confirm" disabled>Valider</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const select = backdrop.querySelector('#share-modal-select');
  const confirmBtn = backdrop.querySelector('#share-modal-confirm');

  select.addEventListener('change', () => {
    confirmBtn.disabled = !select.value;
  });

  confirmBtn.addEventListener('click', () => {
    const name = select.value;
    if (!name) return;
    updateState({ shareMemberName: name });
    backdrop.remove();
    toastInfo(`Bienvenue ${name} ! Vous pouvez maintenant remplir vos compétences.`);
  });

  // Focus le select
  requestAnimationFrame(() => select.focus());
}

/**
 * Render the member banner inside the matrix view.
 * Called by renderMatrixView when in share mode with a selected member.
 * @param {HTMLElement} container - Element ou inserer le bandeau
 */
export function renderShareMemberBanner(container) {
  const state = getState();
  const memberName = state.shareMemberName;
  if (!memberName) return;

  const member = state.members.find(m => m.name === memberName);
  if (!member) return;

  const banner = document.createElement('div');
  banner.className = 'share-member-banner';
  banner.innerHTML = `
    <div class="share-member-banner__info">
      <div class="share-member-banner__avatar">${getInitials(memberName)}</div>
      <div>
        <div class="share-member-banner__name">${escapeHtml(memberName)}</div>
        <div class="share-member-banner__hint">Cliquez sur vos cellules pour renseigner vos compétences</div>
      </div>
    </div>
    <button class="btn btn--ghost btn--sm" id="share-change-member">Changer de membre</button>
  `;

  container.insertBefore(banner, container.firstChild);

  banner.querySelector('#share-change-member')?.addEventListener('click', () => {
    updateState({ shareMemberName: null });
    showMemberSelectModal();
  });
}

/**
 * Initialize the share auto-save listener.
 * Debounces saves to the server after skill edits.
 */
export function initShareAutoSave() {
  if (autoSaveSetup) return;
  autoSaveSetup = true;

  on('skill:updated', () => {
    if (!isShareMode()) return;
    const state = getState();
    const memberName = state.shareMemberName;
    const token = state.shareToken;
    if (!memberName || !token) return;

    const member = state.members.find(m => m.name === memberName);
    if (!member) return;

    if (shareSaveTimer) clearTimeout(shareSaveTimer);
    shareSaveTimer = setTimeout(async () => {
      const ok = await saveSharedSkills(token, memberName, member.skills);
      if (ok) {
        toastSuccess('Compétences sauvegardées.');
      }
    }, 1500);
  });
}
