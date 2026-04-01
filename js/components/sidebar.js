/**
 * Sidebar navigation component.
 * Manages view switching and active state.
 */

import { emit, getState, updateState, on, isShareMode } from '../state.js';
import { updateCustomTemplate } from '../services/templates.js';
import { createShareLink, listShareLinks, revokeShareLink } from '../services/share.js';
import { escapeHtml } from '../utils/helpers.js';
import { toastSuccess, toastError, toastInfo } from './toast.js';
import { openPalette } from './command-palette.js';

/** @type {number|null} Debounce timer for auto-save */
let autoSaveTimer = null;

/** @type {boolean} Skip auto-save during initial template reload */
let autoSavePaused = false;

/** @type {string} Currently active view name */
let activeView = 'matrix';

/** @type {string|null} Last rendered template ID (avoid unnecessary DOM updates) */
let lastRenderedTemplateId = null;

/** Navigation items configuration */
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: '📈' },
  { id: 'matrix',    label: 'Matrice',        icon: '📊' },
  { id: 'radar',     label: 'Profil Radar',   icon: '🎯' },
  { id: 'import',    label: 'Données',         icon: '📥' },
  { id: 'settings',  label: 'Paramètres',     shareLabel: 'Référentiel', icon: '⚙️' },
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
        ${NAV_ITEMS
          .filter(item => !isShareMode() || ['matrix', 'dashboard', 'radar', 'settings'].includes(item.id))
          .map(item => `
          <a class="sidebar__link ${item.id === activeView ? 'sidebar__link--active' : ''}"
             href="#${item.id}"
             data-view="${item.id}">
            <span class="sidebar__link-icon">${item.icon}</span>
            <span>${isShareMode() && item.shareLabel ? item.shareLabel : item.label}</span>
          </a>
        `).join('')}
      </nav>

      <button class="sidebar__search-hint" id="sidebar-search-btn" title="Recherche rapide (Ctrl+K)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <span>Rechercher...</span>
        <kbd class="sidebar__search-kbd">Ctrl+K</kbd>
      </button>

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
  setupHamburger();
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
      closeMobileSidebar();
    });
  });

  // Bouton recherche rapide (Ctrl+K)
  container.querySelector('#sidebar-search-btn')?.addEventListener('click', () => {
    closeMobileSidebar();
    openPalette();
  });
}

/**
 * Navigate to a specific view.
 * @param {string} viewId - Target view identifier
 */
export function navigateTo(viewId) {
  activeView = viewId;
  // Preserver les parametres de requete (ex: ?share=TOKEN) lors de la navigation
  const search = window.location.search;
  // Preserver les sous-parametres du hash (ex: /transposed) si on reste sur la meme vue
  const currentHash = window.location.hash.replace('#', '');
  const [currentBase, currentSub] = currentHash.split('/');
  const newHash = currentBase === viewId && currentSub
    ? `#${viewId}/${currentSub}`
    : `#${viewId}`;
  history.pushState(null, '', search + newHash);
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

  // Masquer le panneau template en mode partage
  if (isShareMode()) {
    panel.innerHTML = '';
    panel.style.display = 'none';
    return;
  }

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
      ${isBuiltIn ? `` : `
        <label class="sidebar__template-toggle">
          <span class="sidebar__template-toggle-track">
            <input type="checkbox" id="autosave-toggle" ${autoSave ? 'checked' : ''}>
            <span class="sidebar__template-toggle-slider"></span>
          </span>
          <span>Auto-sauvegarde</span>
        </label>
      `}
      <button class="btn btn--sm sidebar__share-btn" id="sidebar-share-btn" title="Générer un lien de partage">
        🔗 Partager
      </button>
      <div id="sidebar-share-links" class="sidebar__share-links"></div>
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

  // Bind share button : reutilise le lien existant ou en cree un nouveau
  const shareBtn = panel.querySelector('#sidebar-share-btn');
  shareBtn?.addEventListener('click', async () => {
    // Verifier si un lien existe deja
    const existing = await listShareLinks(tpl.id);
    let shareUrl;
    if (existing.length > 0) {
      shareUrl = `${window.location.origin}${window.location.pathname}?share=${existing[0].token}`;
    } else {
      const result = await createShareLink(tpl.id);
      if (!result.success) {
        toastError('Impossible de créer le lien de partage.');
        return;
      }
      shareUrl = `${window.location.origin}${window.location.pathname}?share=${result.token}`;
      loadShareLink(tpl.id);
    }
    await copyToClipboard(shareUrl);
    // Feedback visuel inline : "Copié ✓" en vert pendant 2s
    const original = shareBtn.textContent;
    shareBtn.textContent = 'Copié ✓';
    shareBtn.classList.add('sidebar__share-btn--copied');
    setTimeout(() => {
      shareBtn.textContent = original;
      shareBtn.classList.remove('sidebar__share-btn--copied');
    }, 2000);
  });

  // Charger le lien existant (tous les templates, builtIn ou non)
  loadShareLink(tpl.id);
}

/**
 * Copy text to clipboard.
 * @param {string} text
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback pour les contextes non-securises
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }
}

/**
 * Load and display the active share link for a template (max 1).
 * @param {string} templateId
 */
async function loadShareLink(templateId) {
  const container = document.querySelector('#sidebar-share-links');
  if (!container) return;

  const links = await listShareLinks(templateId);
  if (links.length === 0) {
    container.innerHTML = '';
    return;
  }

  const link = links[0];
  const date = new Date(link.createdAt).toLocaleDateString('fr-FR');
  container.innerHTML = `
    <div class="sidebar__share-item">
      <span class="sidebar__share-date" title="Créé le ${date}">Lien actif · ${date}</span>
      <button class="sidebar__share-revoke" data-token="${escapeHtml(link.token)}" aria-label="Révoquer ce lien de partage" title="Révoquer">✕</button>
    </div>
  `;

  container.querySelector('.sidebar__share-revoke')?.addEventListener('click', async () => {
    const ok = await revokeShareLink(link.token);
    if (ok) {
      toastSuccess('Lien de partage révoqué.');
      loadShareLink(templateId);
    }
  });
}

/** @type {Function|null} Unsubscribe from state changes */
let unsubAutoSave = null;

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

    // Capturer l'ID immédiatement pour éviter la race condition :
    // si le template change dans les 2s, on n'écrase pas le mauvais enregistrement
    const templateIdSnapshot = state.activeTemplate.id;

    // Debounce : sauvegarde 2s après la dernière modification
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      if (autoSavePaused) return;
      const current = getState();
      if (!current.autoSaveTemplate) return;
      // Ignorer si le template a changé pendant le délai
      if (current.activeTemplate?.id !== templateIdSnapshot) return;

      await updateCustomTemplate(templateIdSnapshot, {
        members: current.members,
        categories: current.categories || {},
      });
      // Sauvegarde silencieuse — pas de toast pour ne pas perturber l'UX
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
 * Close the mobile sidebar overlay.
 */
function closeMobileSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const btn = document.getElementById('hamburger-btn');
  sidebar?.classList.remove('app__sidebar--open');
  overlay?.classList.remove('sidebar-overlay--visible');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

/**
 * Setup hamburger toggle and overlay for mobile navigation.
 */
function setupHamburger() {
  const btn = document.getElementById('hamburger-btn');
  const overlay = document.getElementById('sidebar-overlay');
  const sidebar = document.getElementById('app-sidebar');
  if (!btn || !overlay || !sidebar) return;

  btn.addEventListener('click', () => {
    const isOpen = sidebar.classList.contains('app__sidebar--open');
    if (isOpen) {
      closeMobileSidebar();
    } else {
      sidebar.classList.add('app__sidebar--open');
      overlay.classList.add('sidebar-overlay--visible');
      btn.setAttribute('aria-expanded', 'true');
    }
  });

  overlay.addEventListener('click', closeMobileSidebar);
}

/**
 * Get the currently active view name.
 * @returns {string} Active view identifier
 */
export function getActiveView() {
  return activeView;
}
