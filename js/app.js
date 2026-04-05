/**
 * Application entry point.
 * Initializes state, renders the UI, and manages view routing.
 * Supports share mode via ?share=TOKEN and équipe mode via ?equipe=CODE.
 */

import { initState, initFromPocketBase, on, getState, updateState, replaceMembers, updateCategories, isShareMode } from './state.js';
import { renderSidebar, navigateTo, setAutoSavePaused } from './components/sidebar.js';
import { initToasts, toastError } from './components/toast.js';
import { renderMatrixView, cleanupMatrixView } from './views/matrix.js';
import { renderDashboardView } from './views/dashboard.js';
import { renderRadarView, destroyRadarChart } from './views/radar.js';
import { renderImportView } from './views/import.js';
import { renderSettingsView } from './views/settings.js';
import { renderMyProfileView } from './views/my-profile.js';
import { loadCustomTemplate, applyOrderedCategories } from './services/templates.js';
import { getShareTokenFromURL, loadSharedTemplate, clearShareSession } from './services/share.js';
import { showMemberSelectModal, initShareAutoSave } from './components/share-bar.js';
import { initCommandPalette } from './components/command-palette.js';

/** @type {Object<string, Function>} View renderers mapped by view ID */
const VIEW_RENDERERS = {
  matrix: renderMatrixView,
  dashboard: renderDashboardView,
  radar: renderRadarView,
  import: renderImportView,
  settings: renderSettingsView,
  'my-profile': renderMyProfileView,
};

/** @type {string[]} Vues accessibles en mode partage */
const SHARE_ALLOWED_VIEWS = ['matrix', 'dashboard', 'radar', 'settings', 'my-profile'];

/** @type {string} Currently active view */
let currentView = 'matrix';

/**
 * Read the view ID from the current URL hash.
 * Supports optional sub-params after "/" (e.g. "#matrix/transposed").
 * @returns {string|null} Valid view ID or null
 */
function getViewFromHash() {
  const hash = location.hash.replace('#', '').split('/')[0];
  return VIEW_RENDERERS[hash] ? hash : null;
}

/**
 * Reload data from the active template file (if any).
 * Enables collaborative editing: on refresh, the latest file content is loaded.
 */
async function reloadActiveTemplate() {
  const state = getState();
  const tpl = state.activeTemplate;
  if (!tpl?.id) return;

  try {
    setAutoSavePaused(true);
    const data = await loadCustomTemplate(tpl.id);
    if (data) {
      replaceMembers(data.members);
      updateCategories(data.categories);
      if (data.objectives) updateState({ objectives: data.objectives });
    }
  } finally {
    setAutoSavePaused(false);
  }
}

/**
 * Lit le code équipe depuis l'URL (?equipe=CODE).
 * @returns {string|null}
 */
function getEquipeCodeFromURL() {
  return new URLSearchParams(location.search).get('equipe') || null;
}

/**
 * Initialise le mode équipe PocketBase si ?equipe=CODE est présent dans l'URL.
 * @returns {Promise<boolean>} true si le mode équipe est activé
 */
async function initEquipeMode() {
  const code = getEquipeCodeFromURL();
  if (!code) return false;

  const ok = await initFromPocketBase(code);
  if (!ok) {
    toastError(`Équipe "${code}" introuvable. Vérifiez le lien ou créez l'équipe.`);
    return false;
  }

  return true;
}

/**
 * Initialize share mode from URL token.
 * Loads the shared template data and configures restricted state.
 * @returns {Promise<boolean>} true if share mode activated
 */
async function initShareMode() {
  const token = getShareTokenFromURL();
  if (!token) return false;

  const data = await loadSharedTemplate(token);
  if (!data) {
    clearShareSession();
    showShareLinkError();
    return false;
  }

  // Créer les membres avec les données du template partagé
  const { createMember } = await import('./models/data.js');
  const members = data.members.map(m => createMember({
    name: m.name,
    role: m.role,
    appetences: m.appetences || '',
    groups: m.groups || [],
    skills: m.skills,
  }));

  // Configurer le state en mode partagé
  updateState({
    members,
    categories: applyOrderedCategories(data.categories || {}, data.categoryOrder),
    shareMode: true,
    shareToken: token,
    shareMemberName: null,
    activeTemplate: {
      id: data.templateId,
      title: data.title,
      builtIn: false,
      local: true,
    },
    autoSaveTemplate: false,
  });

  return true;
}

/**
 * Remplace toute l'interface par une page d'erreur conviviale
 * quand un lien de partage est invalide ou révoqué.
 */
function showShareLinkError() {
  sessionStorage.setItem('shareError', '1');
  document.body.innerHTML = `
    <div class="share-error" role="main">
      <div class="share-error__card">
        <div class="share-error__emoji" aria-hidden="true">🔒</div>
        <h1 class="share-error__title">Lien invalide ou révoqué</h1>
        <p class="share-error__desc">
          Ce lien de partage n'existe plus ou a été désactivé par le facilitateur.
        </p>
        <div class="share-error__hint">
          <span class="share-error__hint-icon" aria-hidden="true">💬</span>
          <div class="share-error__hint-text">
            <strong>Que faire ?</strong>
            Demandez un nouveau lien à votre facilitateur. Il peut en générer un depuis
            le panneau de partage de la Skills Matrix.
          </div>
        </div>
        <p class="share-error__footer">Skills Matrix · BastaVerse</p>
      </div>
    </div>
  `;
}

/**
 * Initialize the application.
 * Sets up state, renders the initial UI, and subscribes to events.
 */
async function init() {
  // Si l'onglet a déjà vu une erreur de lien de partage et que l'URL ne contient
  // aucun token valide, on bloque l'accès (empêche le contournement par suppression des params)
  if (sessionStorage.getItem('shareError') && !getShareTokenFromURL() && !getEquipeCodeFromURL()) {
    showShareLinkError();
    return;
  }

  // Initialize toast notifications
  initToasts();

  // Palette de recherche (Ctrl+K / Cmd+K)
  initCommandPalette();

  // Initialize state from localStorage
  initState();

  // Détecter le mode équipe PocketBase (?equipe=CODE) - priorité sur le mode partage
  const equipeMode = await initEquipeMode();

  // Détecter le mode partage (?share=TOKEN) - ignoré si mode équipe actif
  const shareMode = !equipeMode && await initShareMode();

  // Afficher la sidebar (filtree en mode partage)
  const sidebarEl = document.getElementById('app-sidebar');
  if (sidebarEl) renderSidebar(sidebarEl);

  if (shareMode) {
    // Initialiser l'auto-save vers le serveur
    initShareAutoSave();
    // Afficher la modale de selection du membre
    showMemberSelectModal();
  } else {
    // Mode normal : recharger le template actif (await pour eviter le cache localStorage)
    await reloadActiveTemplate();
  }

  // Subscribe to view change events
  on('view:changed', (viewId) => {
    switchView(viewId);
    // Rafraîchir depuis le serveur à chaque ouverture des paramètres (données potentiellement obsolètes)
    if (viewId === 'settings' && !isShareMode()) {
      reloadActiveTemplate();
    }
  });

  // Re-render current view when state changes
  on('state:changed', () => {
    renderCurrentView();
  });

  // Re-render when state is reset
  on('state:reset', () => {
    renderCurrentView();
  });

  // Handle browser back/forward navigation
  window.addEventListener('popstate', () => {
    const viewId = getViewFromHash();
    if (viewId && viewId !== currentView) {
      navigateTo(viewId);
    }
  });

  // Determine initial view
  const hashView = getViewFromHash();
  const state = getState();

  if (equipeMode || shareMode) {
    // Mode équipe ou partage : toujours commencer par la matrice
    const validHash = hashView && SHARE_ALLOWED_VIEWS.includes(hashView);
    navigateTo(validHash ? hashView : 'matrix');
  } else if (hashView) {
    navigateTo(hashView);
  } else if (state.members.length === 0) {
    navigateTo('import');
  } else {
    navigateTo('matrix');
  }
}

/**
 * Switch to a new view.
 * @param {string} viewId - The target view ID
 */
function switchView(viewId) {
  if (!VIEW_RENDERERS[viewId]) return;

  // En mode partage, bloquer les vues interdites
  if (isShareMode() && !SHARE_ALLOWED_VIEWS.includes(viewId)) return;

  // Cleanup previous view if needed
  if (currentView === 'radar') destroyRadarChart();
  if (currentView === 'matrix') cleanupMatrixView();

  currentView = viewId;

  // Hide all views, show active one
  document.querySelectorAll('.view').forEach(el => {
    el.classList.remove('view--active');
  });

  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.classList.add('view--active');
    renderCurrentView();
  }
}

/**
 * Render the currently active view.
 */
function renderCurrentView() {
  const container = document.getElementById(`view-${currentView}`);
  const renderer = VIEW_RENDERERS[currentView];

  if (container && renderer) {
    renderer(container);
  }
}

// Start the application when the DOM is ready
document.addEventListener('DOMContentLoaded', init);
