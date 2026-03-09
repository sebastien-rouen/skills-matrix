/**
 * Sidebar navigation component.
 * Manages view switching and active state.
 */

import { emit, getState, updateState, on } from '../state.js';
import { saveCustomTemplate } from '../services/templates.js';
import { escapeHtml } from '../utils/helpers.js';
import { toastSuccess } from './toast.js';

/** @type {number|null} Debounce timer for auto-save */
let autoSaveTimer = null;

/** @type {boolean} Skip auto-save during initial template reload */
let autoSavePaused = false;

/** @type {string} Currently active view name */
let activeView = 'matrix';

/** Navigation items configuration */
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: '📈' },
  { id: 'matrix',    label: 'Matrice',        icon: '📊' },
  { id: 'radar',     label: 'Profil Radar',   icon: '🎯' },
  { id: 'import',    label: 'Données',         icon: '📥' },
  { id: 'settings',  label: 'Paramètres',     icon: '⚙️' },
];

/**
 * Render the sidebar into the given container element.
 * @param {HTMLElement} container - The sidebar container element
 */
export function renderSidebar(container) {
  container.innerHTML = `
    <div class="sidebar">
      <div class="sidebar__brand">
        <div class="sidebar__logo">SM</div>
        <div>
          <div class="sidebar__title">Skills Matrix</div>
          <div class="sidebar__subtitle">Suivi des compétences</div>
        </div>
      </div>

      <nav class="sidebar__nav">
        <div class="sidebar__section-label">Vues</div>
        ${NAV_ITEMS.map(item => `
          <a class="sidebar__link ${item.id === activeView ? 'sidebar__link--active' : ''}"
             href="#${item.id}"
             data-view="${item.id}">
            <span class="sidebar__link-icon">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `).join('')}
      </nav>

      <div class="sidebar__bottom">
        <div class="sidebar__template" id="sidebar-template-panel"></div>
        <div class="sidebar__footer">
          <a href="https://github.com/sebastien-rouen/skills-matrix" target="_blank" rel="noopener"
             class="sidebar__footer-link" title="Voir sur GitHub">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="flex-shrink: 0;">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span>Skills Matrix v2.0.0</span>
          </a>
        </div>
      </div>
    </div>
  `;

  bindEvents(container);
  updateTemplatePanel();
  setupAutoSave();
}

/**
 * Bind click events on sidebar navigation links.
 * @param {HTMLElement} container - The sidebar container element
 */
function bindEvents(container) {
  const links = container.querySelectorAll('.sidebar__link');

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const viewId = link.dataset.view;
      if (viewId && viewId !== activeView) {
        navigateTo(viewId);
      }
    });
  });
}

/**
 * Navigate to a specific view.
 * @param {string} viewId - Target view identifier
 */
export function navigateTo(viewId) {
  activeView = viewId;
  // Update URL hash without triggering hashchange (we push silently)
  history.pushState(null, '', '#' + viewId);
  emit('view:changed', viewId);
  updateActiveLink();
}

/**
 * Update the visual active state of sidebar links.
 */
function updateActiveLink() {
  const links = document.querySelectorAll('.sidebar__link');
  links.forEach(link => {
    link.classList.toggle('sidebar__link--active', link.dataset.view === activeView);
  });
}

/**
 * Update the active template panel in the sidebar.
 */
function updateTemplatePanel() {
  const panel = document.querySelector('#sidebar-template-panel');
  if (!panel) return;

  const state = getState();
  const tpl = state.activeTemplate;

  if (!tpl) {
    panel.innerHTML = '';
    panel.style.display = 'none';
    lastRenderedTemplateId = null;
    return;
  }

  lastRenderedTemplateId = tpl.id;
  panel.style.display = 'block';
  const isBuiltIn = !!tpl.builtIn;
  const autoSave = !!state.autoSaveTemplate;

  panel.innerHTML = `
    <div class="sidebar__template-card">
      <div class="sidebar__template-header">
        <span class="sidebar__template-icon">${isBuiltIn ? '📦' : '💾'}</span>
        <div class="sidebar__template-info">
          <span class="sidebar__template-title">${escapeHtml(tpl.title)}</span>
          <span class="sidebar__template-badge">${isBuiltIn ? 'Intégré' : 'Personnalisé'}</span>
        </div>
      </div>
      ${isBuiltIn ? `
        <div class="sidebar__template-readonly">Lecture seule</div>
      ` : `
        <label class="sidebar__template-toggle">
          <span class="sidebar__template-toggle-track">
            <input type="checkbox" id="autosave-toggle" ${autoSave ? 'checked' : ''}>
            <span class="sidebar__template-toggle-slider"></span>
          </span>
          <span>Auto-sauvegarde</span>
        </label>
      `}
    </div>
  `;

  // Bind toggle
  const toggle = panel.querySelector('#autosave-toggle');
  toggle?.addEventListener('change', () => {
    updateState({ autoSaveTemplate: toggle.checked });
    if (toggle.checked) {
      toastSuccess('Auto-sauvegarde activée.');
    }
  });
}

/** @type {Function|null} Unsubscribe from state changes */
let unsubAutoSave = null;

/** @type {string|null} Last rendered template ID (avoid unnecessary DOM updates) */
let lastRenderedTemplateId = null;

/**
 * Setup the auto-save listener for state changes.
 * Debounces saves to avoid excessive writes.
 */
function setupAutoSave() {
  if (unsubAutoSave) {
    unsubAutoSave();
    unsubAutoSave = null;
  }

  unsubAutoSave = on('state:changed', () => {
    const state = getState();
    const currentTplId = state.activeTemplate?.id || null;

    // Re-render le panel seulement si le template actif a change
    if (currentTplId !== lastRenderedTemplateId) {
      updateTemplatePanel();
    }

    if (autoSavePaused) return;
    if (!state.autoSaveTemplate) return;
    if (!state.activeTemplate) return;
    if (state.activeTemplate.builtIn) return;

    // Debounce : sauvegarde 2s apres la derniere modification
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      const current = getState();
      if (!current.activeTemplate || current.activeTemplate.builtIn) return;
      if (!current.autoSaveTemplate) return;

      const result = await saveCustomTemplate({
        title: current.activeTemplate.title,
        description: current.activeTemplate.description || '',
        members: current.members,
        categories: current.categories || {},
      });
      if (result?.success) {
        console.log('[AutoSave] Template sauvegardé :', current.activeTemplate.title);
      }
    }, 2000);
  });
}

/**
 * Pause or resume auto-save (used during template reload to avoid write-back).
 * @param {boolean} paused
 */
export function setAutoSavePaused(paused) {
  autoSavePaused = paused;
}

/**
 * Get the currently active view name.
 * @returns {string} Active view identifier
 */
export function getActiveView() {
  return activeView;
}
