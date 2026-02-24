/**
 * Application entry point.
 * Initializes state, renders the UI, and manages view routing.
 */

import { initState, on, getState } from './state.js';
import { renderSidebar, navigateTo } from './components/sidebar.js';
import { initToasts } from './components/toast.js';
import { renderMatrixView } from './views/matrix.js';
import { renderDashboardView } from './views/dashboard.js';
import { renderRadarView, destroyRadarChart } from './views/radar.js';
import { renderImportView } from './views/import.js';
import { renderSettingsView } from './views/settings.js';

/** @type {Object<string, Function>} View renderers mapped by view ID */
const VIEW_RENDERERS = {
  matrix: renderMatrixView,
  dashboard: renderDashboardView,
  radar: renderRadarView,
  import: renderImportView,
  settings: renderSettingsView,
};

/** @type {string} Currently active view */
let currentView = 'matrix';

/**
 * Initialize the application.
 * Sets up state, renders the initial UI, and subscribes to events.
 */
function init() {
  // Initialize toast notifications
  initToasts();

  // Initialize state from localStorage
  initState();

  // Render sidebar
  const sidebarEl = document.getElementById('app-sidebar');
  if (sidebarEl) renderSidebar(sidebarEl);

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

  // Initial render - check if data exists, show import if empty
  const state = getState();
  if (state.members.length === 0) {
    currentView = 'import';
    navigateTo('import');
  } else {
    renderCurrentView();
  }
}

/**
 * Switch to a new view.
 * @param {string} viewId - The target view ID
 */
function switchView(viewId) {
  if (!VIEW_RENDERERS[viewId]) return;

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
