/**
 * Application entry point.
 * Initializes state, renders the UI, and manages view routing.
 * Supports share mode via ?share=TOKEN URL parameter.
 */

import { initState, on, getState, updateState, replaceMembers, updateCategories, isShareMode } from './state.js';
import { renderSidebar, navigateTo, setAutoSavePaused } from './components/sidebar.js';
import { initToasts, toastError } from './components/toast.js';
import { renderMatrixView } from './views/matrix.js';
import { renderDashboardView } from './views/dashboard.js';
import { renderRadarView, destroyRadarChart } from './views/radar.js';
import { renderImportView } from './views/import.js';
import { renderSettingsView } from './views/settings.js';
import { loadCustomTemplate } from './services/templates.js';
import { getShareTokenFromURL, loadSharedTemplate, clearShareSession } from './services/share.js';
import { showMemberSelectModal, initShareAutoSave } from './components/share-bar.js';

/** @type {Object<string, Function>} View renderers mapped by view ID */
const VIEW_RENDERERS = {
  matrix: renderMatrixView,
  dashboard: renderDashboardView,
  radar: renderRadarView,
  import: renderImportView,
  settings: renderSettingsView,
};

/** @type {string[]} Vues accessibles en mode partage */
const SHARE_ALLOWED_VIEWS = ['matrix', 'dashboard', 'radar'];

/** @type {string} Currently active view */
let currentView = 'matrix';

/**
 * Read the view ID from the current URL hash.
 * @returns {string|null} Valid view ID or null
 */
function getViewFromHash() {
  const hash = location.hash.replace('#', '');
  return VIEW_RENDERERS[hash] ? hash : null;
}

/**
 * Reload data from the active template file (if any).
 * Enables collaborative editing: on refresh, the latest file content is loaded.
 */
async function reloadActiveTemplate() {
  const state = getState();
  const tpl = state.activeTemplate;
  if (!tpl || tpl.builtIn) return;

  try {
    setAutoSavePaused(true);
    const data = await loadCustomTemplate(tpl.id);
    if (data) {
      replaceMembers(data.members);
      updateCategories(data.categories);
      console.log('[App] Template rechargé depuis le fichier :', tpl.title);
    }
  } catch (err) {
    console.warn('[App] Impossible de recharger le template :', err.message);
  } finally {
    setAutoSavePaused(false);
  }
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
    toastError('Ce lien de partage est invalide ou a été révoqué.');
    return false;
  }

  // Creer les membres avec les donnees du template partage
  const { createMember } = await import('./models/data.js');
  const members = data.members.map(m => createMember({
    name: m.name,
    role: m.role,
    appetences: m.appetences || '',
    groups: m.groups || [],
    skills: m.skills,
  }));

  // Configurer le state en mode partage
  updateState({
    members,
    categories: data.categories || {},
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

  console.log('[App] Mode partage activé :', data.title);
  return true;
}

/**
 * Initialize the application.
 * Sets up state, renders the initial UI, and subscribes to events.
 */
async function init() {
  // Initialize toast notifications
  initToasts();

  // Initialize state from localStorage
  initState();

  // Detecter le mode partage (?share=TOKEN)
  const shareMode = await initShareMode();

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

  if (shareMode) {
    // En mode partage, toujours commencer par la matrice
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
  if (currentView === 'radar') {
    destroyRadarChart();
  }

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
