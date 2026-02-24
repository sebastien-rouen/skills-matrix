/**
 * Sidebar navigation component.
 * Manages view switching and active state.
 */

import { emit } from '../state.js';

/** @type {string} Currently active view name */
let activeView = 'matrix';

/** Navigation items configuration */
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: '📈' },
  { id: 'matrix',    label: 'Matrice',        icon: '📊' },
  { id: 'radar',     label: 'Profil Radar',   icon: '🎯' },
  { id: 'import',    label: 'Importer',       icon: '📥' },
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

      <div class="sidebar__footer">
        <div class="sidebar__footer-text">Skills Matrix v1.0</div>
      </div>
    </div>
  `;

  bindEvents(container);
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
 * Get the currently active view name.
 * @returns {string} Active view identifier
 */
export function getActiveView() {
  return activeView;
}
