/**
 * Matrix view - Main heatmap table showing members x skills.
 * Supports inline editing, sorting, and filtering.
 */

import { getState, updateState, updateSkill, updateMember, renameSkill, updateFilters, isShareMode, isEquipeMode, getShareMemberName, on, togglePinnedSkill, togglePinnedMember } from '../state.js';
import { getCategorizedSkillNames, getAllRoles, getAllGroups, isSkillCritical, getSkillStats } from '../models/data.js';
import { renderFilters, applyFilters } from '../components/filters.js';
import { toastSuccess } from '../components/toast.js';
import {
  getInitials, getSkillLabel, getAppetenceIcon, escapeHtml,
  SKILL_LEVELS, APPETENCE_LEVELS, downloadFile, timeAgo,
} from '../utils/helpers.js';
import { exportCSV, exportDetailedCSV } from '../services/exporter.js';
import { renderOnboarding } from '../components/onboarding.js';
import { renderShareMemberBanner } from '../components/share-bar.js';

/** @type {Object|null} Current sort configuration */
let sortConfig = { key: null, ascending: true };

/** @type {boolean} Inhibe la restauration du scroll (ex : après un tri) */
let _skipScrollRestore = false;

/** @type {'default'|'transposed'} Disposition du tableau */
let matrixLayout = 'default';

/** @type {boolean} Mode compact (cellules réduites) */
let compactMode = false;

/** @type {{memberId: string, skill: string}|null} Cellule à focus après re-render */
let _pendingFocusCell = null;

/**
 * Parse hash to extract view, layout and filter params.
 * Format: #matrix/transposed?cat=X&search=Y&role=Z&group=G&level=2&critical=1
 */
function parseHash() {
  const raw = location.hash.replace('#', '');
  const [pathPart, queryPart] = raw.split('?');
  const segments = pathPart.split('/');
  const layout = segments[1] === 'transposed' ? 'transposed' : 'default';
  const params = new URLSearchParams(queryPart || '');
  return { layout, params };
}

/** Lit la disposition depuis le hash (#matrix/transposed). */
function getLayoutFromHash() {
  return parseHash().layout;
}

/**
 * Read filter overrides from hash query params.
 * Returns only the keys that are present (partial object).
 * @returns {Object|null} Filter partial or null if no params
 */
function getFiltersFromHash() {
  const { params } = parseHash();
  if ([...params.keys()].length === 0) return null;
  const f = {};
  if (params.has('search')) f.search = params.get('search');
  if (params.has('cat')) f.category = params.get('cat');
  if (params.has('role')) f.role = params.get('role');
  if (params.has('group')) f.group = params.get('group');
  if (params.has('level')) f.minLevel = parseInt(params.get('level'), 10) || 0;
  if (params.has('critical')) f.showCriticalOnly = params.get('critical') === '1';
  return Object.keys(f).length > 0 ? f : null;
}

/**
 * Build hash string from layout + filters. Exported for cross-view navigation.
 * @param {string} [layout='default'] - Layout mode
 * @param {Object} [filters={}] - Filter partial
 * @returns {string} Hash string like #matrix?cat=Frontend
 */
export function buildMatrixHash(layout = 'default', filters = {}) {
  return buildHash(layout, filters);
}

/** Build hash string from current layout + filters state. */
function buildHash(layout, filters) {
  const view = location.hash.replace('#', '').split(/[/?]/)[0] || 'matrix';
  const base = layout === 'transposed' ? `${view}/transposed` : view;
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('cat', filters.category);
  if (filters.role) params.set('role', filters.role);
  if (filters.group) params.set('group', filters.group);
  if (filters.minLevel > 0) params.set('level', String(filters.minLevel));
  if (filters.showCriticalOnly) params.set('critical', '1');
  const qs = params.toString();
  return `#${base}${qs ? '?' + qs : ''}`;
}

/** Écrit la disposition dans le hash sans créer d'entrée d'historique. */
function setLayoutInHash(layout) {
  const state = getState();
  history.replaceState(null, '', location.search + buildHash(layout, state.filters));
}

/** Sync current filters into the hash (called after filter changes). */
function syncFiltersToHash() {
  history.replaceState(null, '', location.search + buildHash(matrixLayout, getState().filters));
}

/** @type {HTMLElement|null} Currently open inline editor */
let activeEditor = null;

/** @type {Function|null} Référence au listener document 'click' pour pouvoir le retirer */
let _closeEditorListener = null;

/**
 * Nettoie les effets de bord de la vue matrice (tooltip, listener document).
 * À appeler lors du changement de vue.
 */
export function cleanupMatrixView() {
  if (_closeEditorListener) {
    document.removeEventListener('click', _closeEditorListener);
    _closeEditorListener = null;
  }
  teardownKeyboardNavigation();
  const tooltip = document.getElementById('matrix-skill-tooltip');
  if (tooltip) tooltip.remove();
  closeActiveEditor(true);
  // Permettre la restauration des filtres depuis le hash au prochain rendu
  _hashFiltersRestored = false;
}

/**
 * Render the matrix view.
 * @param {HTMLElement} container - The view container element
 */
/** @type {boolean} Guards hash→filters restore (reset on each view entry) */
let _hashFiltersRestored = false;

/** @type {Function|null} Listener filters:changed → sync hash */
let _filtersSyncListener = null;

export function renderMatrixView(container) {
  // Synchronise la disposition depuis le hash (refresh ou lien direct)
  matrixLayout = getLayoutFromHash();

  // Restaurer les filtres depuis le hash à chaque entrée dans la vue
  const hashFilters = getFiltersFromHash();
  if (hashFilters && !_hashFiltersRestored) {
    _hashFiltersRestored = true;
    updateFilters(hashFilters);
    // updateFilters émet filters:changed qui re-render, on laisse ce cycle se terminer
    return;
  }
  _hashFiltersRestored = true;

  // Synchroniser le hash à chaque changement de filtre
  if (!_filtersSyncListener) {
    _filtersSyncListener = () => syncFiltersToHash();
    on('filters:changed', _filtersSyncListener);
  }

  const state = getState();

  if (state.members.length === 0) {
    renderEmptyState(container);
    return;
  }

  const allSkills = getCategorizedSkillNames(state.members, state.categories);
  const threshold = state.settings?.criticalThreshold ?? 2;
  const { filteredMembers, filteredSkills } = applyFilters(
    state.members, allSkills, state.filters, state.categories, threshold
  );

  // Sort members if a sort key is set
  const sortedMembers = applySorting(filteredMembers, sortConfig);

  // Group skills by category
  const groupedSkills = groupSkillsByCategory(filteredSkills, state.categories);

  const hasActiveFilters = !!(state.filters.search || state.filters.category || state.filters.role || state.filters.group || state.filters.minLevel > 0 || state.filters.showCriticalOnly);

  const inShareMode = isShareMode();
  const shareMember = getShareMemberName();

  // Préserver la position de scroll avant le re-render (sauf après un tri)
  const skipRestore = _skipScrollRestore;
  _skipScrollRestore = false;
  const prevTableContainer = container.querySelector('#matrix-table-container');
  const savedScrollTop = prevTableContainer?.scrollTop ?? 0;
  const savedScrollLeft = prevTableContainer?.scrollLeft ?? 0;

  // Sauvegarder le focus du champ de recherche avant le re-render
  const searchInput = container.querySelector('#filter-search');
  const hadSearchFocus = searchInput && document.activeElement === searchInput;
  const savedSearchValue = searchInput?.value ?? '';
  const savedSelectionStart = searchInput?.selectionStart ?? 0;
  const savedSelectionEnd = searchInput?.selectionEnd ?? 0;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Matrice de compétences</h1>
        <p class="page-header__subtitle">${hasActiveFilters
          ? `${filteredMembers.length}/${state.members.length} membres · ${filteredSkills.length}/${allSkills.length} compétences`
          : `${state.members.length} membre(s) · ${allSkills.length} compétence(s)`
        }${inShareMode && shareMember ? ` · Édition : ${escapeHtml(shareMember)}` : ''}</p>
      </div>
      ${inShareMode ? '' : `
        <div class="page-header__actions">
          <button class="btn btn--secondary btn--sm" id="matrix-export-csv">📥 Export CSV</button>
          <button class="btn btn--secondary btn--sm" id="matrix-export-detailed">📥 Export détaillé</button>
          <button class="btn btn--secondary btn--sm" id="matrix-print">🖨️ Imprimer</button>
        </div>
      `}
    </div>

    <div id="matrix-filters"></div>

    <!-- Legend + Toggle de vue -->
    <div class="legend" style="margin-bottom: var(--space-4);">
      ${SKILL_LEVELS.map(l => `
        <div class="legend__item">
          <div class="legend__color" style="background: ${l.color};"></div>
          <span>${l.label}</span>
        </div>
      `).join('')}
      <div class="legend__separator"></div>
      <div class="legend__item">
        <span style="color: var(--color-level-beginner); font-size: var(--font-size-base);">&#9888;</span>
        <span>Critique (&lt; ${threshold} expert(s))</span>
      </div>
      <div class="matrix-layout-toggle" style="margin-left: auto;">
        <label class="matrix-compact-toggle" title="Mode compact : cellules réduites pour voir plus de colonnes">
          <input type="checkbox" id="matrix-compact-check" ${compactMode ? 'checked' : ''} />
          <span>Compact</span>
        </label>
        <button class="matrix-layout-btn ${matrixLayout === 'default' ? 'matrix-layout-btn--active' : ''}"
                id="matrix-layout-default"
                aria-label="Vue par défaut : membres en lignes, compétences en colonnes"
                title="Vue par défaut : membres en lignes, compétences en colonnes">
          ⊞ Membres × Compétences
        </button>
        <button class="matrix-layout-btn ${matrixLayout === 'transposed' ? 'matrix-layout-btn--active' : ''}"
                id="matrix-layout-transposed"
                aria-label="Vue transposée : compétences en lignes, membres en colonnes"
                title="Vue transposée : compétences en lignes, membres en colonnes">
          ⊟ Compétences × Membres
        </button>
      </div>
    </div>

    <!-- Group Tabs -->
    ${renderGroupTabs(state)}

    <!-- Matrix Table -->
    <div class="matrix-container ${compactMode ? 'matrix-container--compact' : ''}" id="matrix-table-container">
      ${matrixLayout === 'transposed'
        ? renderTransposedTable(sortedMembers, groupedSkills, state)
        : renderTable(sortedMembers, groupedSkills, state)}
    </div>

    <!-- Keyboard shortcuts help -->
    <button class="kbd-help-btn" id="kbd-help-toggle" title="Raccourcis clavier" aria-label="Raccourcis clavier">?</button>
    <div class="kbd-help-overlay" id="kbd-help-overlay" hidden>
      <div class="kbd-help-panel">
        <div class="kbd-help-panel__header">
          <span class="kbd-help-panel__title">Raccourcis clavier</span>
          <button class="kbd-help-panel__close" id="kbd-help-close" aria-label="Fermer">&times;</button>
        </div>
        <div class="kbd-help-panel__section">
          <h4>Navigation dans la matrice</h4>
          <div class="kbd-help-row"><span class="kbd-help-keys"><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd></span><span>Se déplacer entre cellules</span></div>
          <div class="kbd-help-row"><span class="kbd-help-keys"><kbd>Entrée</kbd></span><span>Ouvrir l'éditeur complet (niveau + appétence + note)</span></div>
          <div class="kbd-help-row"><span class="kbd-help-keys"><kbd>Échap</kbd></span><span>Quitter la sélection / fermer l'éditeur</span></div>
        </div>
        <div class="kbd-help-panel__section">
          <h4>Saisie rapide (cellule sélectionnée)</h4>
          <div class="kbd-help-row"><span class="kbd-help-keys"><kbd>0</kbd> <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd></span><span>Définir le niveau</span></div>
          <div class="kbd-help-row"><span class="kbd-help-keys"><kbd>⇧0</kbd> <kbd>⇧1</kbd> <kbd>⇧2</kbd> <kbd>⇧3</kbd></span><span>Définir l'appétence → avance auto</span></div>
        </div>
        <div class="kbd-help-panel__section">
          <h4>Filtres et vue</h4>
          <div class="kbd-help-row"><span class="kbd-help-keys"><kbd>/</kbd></span><span>Focus sur la recherche</span></div>
          <div class="kbd-help-row"><span class="kbd-help-keys"><kbd>?</kbd></span><span>Afficher / masquer cette aide</span></div>
        </div>
      </div>
    </div>
  `;

  // Afficher le bandeau membre en mode partage (au-dessus des filtres)
  if (inShareMode && shareMember) {
    renderShareMemberBanner(container.querySelector('#matrix-filters').parentElement);
    // Repositionner le bandeau juste avant les filtres
    const banner = container.querySelector('.share-member-banner');
    const filtersEl = container.querySelector('#matrix-filters');
    if (banner && filtersEl) {
      filtersEl.parentElement.insertBefore(banner, filtersEl);
    }
  }

  // Render filters into the dedicated container
  renderFilters(container.querySelector('#matrix-filters'));

  bindMatrixEvents(container, state);

  // Restaurer la position de scroll après le re-render (pas après un tri)
  const newTableContainer = container.querySelector('#matrix-table-container');
  if (newTableContainer && !skipRestore && (savedScrollTop || savedScrollLeft)) {
    newTableContainer.scrollTop = savedScrollTop;
    newTableContainer.scrollLeft = savedScrollLeft;
  }

  // Restaurer le focus du champ de recherche
  if (hadSearchFocus) {
    const newSearch = container.querySelector('#filter-search');
    if (newSearch) {
      newSearch.focus();
      newSearch.setSelectionRange(savedSelectionStart, savedSelectionEnd);
    }
  }
}

/**
 * Render an empty state when no data is available.
 * @param {HTMLElement} container - The view container element
 */
function renderEmptyState(container) {
  renderOnboarding(container);
}

/**
 * Render group filter tabs above the matrix table.
 * Shows [Tous] [Group1] [Group2] ... when groups exist.
 * @param {Object} state - Current app state
 * @returns {string} Tabs HTML (empty string if no groups)
 */
function renderGroupTabs(state) {
  const groups = getAllGroups(state.members);
  if (groups.length === 0) return '';

  const active = state.filters?.group || '';
  const tabClass = (g) => `matrix-group-tab${g === active ? ' matrix-group-tab--active' : ''}`;
  const memberCount = (g) => {
    if (!g) return state.members.length;
    return state.members.filter(m => (m.groups || []).includes(g)).length;
  };

  return `
    <div class="matrix-group-tabs" id="matrix-group-tabs">
      <button class="${tabClass('')}" data-group="">Tous <span class="matrix-group-tab__count">${memberCount('')}</span></button>
      ${groups.map(g => `
        <button class="${tabClass(g)}" data-group="${escapeHtml(g)}">${escapeHtml(g)} <span class="matrix-group-tab__count">${memberCount(g)}</span></button>
      `).join('')}
    </div>
  `;
}

/**
 * Render the matrix table HTML.
 * @param {Object[]} members - Filtered & sorted members
 * @param {Object} groupedSkills - Skills grouped by category { category: [skills] }
 * @param {Object} state - Current app state
 * @returns {string} Table HTML
 */
function renderTable(members, groupedSkills, state) {
  const flatSkills = [];
  const categoryStartSkills = new Set();
  for (const [, skills] of Object.entries(groupedSkills)) {
    if (skills.length > 0) categoryStartSkills.add(skills[0]);
    flatSkills.push(...skills);
  }

  if (members.length === 0 || flatSkills.length === 0) {
    return '<p style="padding: var(--space-6); text-align: center; color: var(--color-text-secondary);">Aucun résultat avec les filtres actuels.</p>';
  }

  let html = '<table class="matrix-table">';

  // Category header row (if categories exist)
  const catEntries = Object.entries(groupedSkills);
  if (catEntries.length > 1 || (catEntries.length === 1 && catEntries[0][0] !== 'Autres')) {
    html += '<thead><tr class="category-row">';
    html += '<th></th><th></th><th></th>';
    for (const [catName, skills] of catEntries) {
      html += `<th class="category-group" colspan="${skills.length}">${escapeHtml(catName)}</th>`;
    }
    html += '</tr>';
  } else {
    html += '<thead>';
  }

  // Skill names header row
  html += '<tr>';
  html += `<th>
    <span class="sort-header" data-sort="name" style="cursor: pointer;">
      Membre ${getSortIndicator('name')}
    </span>
  </th>`;
  html += `<th>
    <span class="sort-header" data-sort="role" style="cursor: pointer;">
      Ownership ${getSortIndicator('role')}
    </span>
  </th>`;
  html += `<th>
    <span class="sort-header" data-sort="groups" style="cursor: pointer;">
      Groupes ${getSortIndicator('groups')}
    </span>
  </th>`;

  const maxLen = state.settings?.skillNameMaxLength || 0;
  const threshold = state.settings?.criticalThreshold ?? 2;

  const pinnedSkills = state.pinnedSkills || [];
  for (const skill of flatSkills) {
    const critical = isSkillCritical(state.members, skill, threshold);
    const displayName = maxLen > 0 && skill.length > maxLen
      ? skill.substring(0, maxLen - 1) + '…'
      : skill;
    const catStart = categoryStartSkills.has(skill) ? ' category-start' : '';
    const isTruncated = maxLen > 0 && skill.length > maxLen;
    const tooltipAttr = isTruncated ? ` data-tooltip="${escapeHtml(skill)}"` : '';
    const isPinned = pinnedSkills.includes(skill);
    html += `<th class="${catStart}" data-skill-header="${escapeHtml(skill)}" data-col-highlight="${escapeHtml(skill)}"${tooltipAttr}>
      <span class="skill-name" data-rename-skill="${escapeHtml(skill)}" style="cursor: pointer;" title="Cliquer pour renommer">
        ${escapeHtml(displayName)}${critical ? ' <span style="color: var(--color-level-beginner);" title="Compétence critique">⚠</span>' : ''}
      </span>
      <span class="sort-header" data-sort="skill:${skill}" style="cursor: pointer;" title="Trier">
        ${getSortIndicator('skill:' + skill)}
      </span>
      <button class="pin-btn ${isPinned ? 'pin-btn--active' : ''}" data-pin-skill="${escapeHtml(skill)}" title="${isPinned ? 'Retirer des epingles' : 'Epingler sur le dashboard'}">📌</button>
    </th>`;
  }
  html += '</tr></thead>';

  // Body rows
  const shareMode = isShareMode();
  const shareTarget = getShareMemberName();
  html += '<tbody>';

  // Objectives row (first row of tbody - always shown to allow adding objectives)
  const objectives = state.objectives || {};
  if (!shareMode) {
    html += '<tr class="objectives-row">';
    html += '<td colspan="3" class="objectives-row__label">Objectifs</td>';
    for (const skill of flatSkills) {
      const obj = objectives[skill];
      const catStart = categoryStartSkills.has(skill) ? ' category-start' : '';
      if (obj && obj.minExperts) {
        const stats = getSkillStats(state.members, skill);
        const current = stats.levels[3] + stats.levels[4];
        const target = obj.minExperts;
        const met = current >= target;
        const close = !met && current >= target - 1;
        const statusClass = met ? 'met' : close ? 'warn' : 'danger';
        html += `<td class="objectives-cell objectives-cell--${statusClass} objectives-cell--editable${catStart}"
          data-col-highlight="${escapeHtml(skill)}" data-objective-skill="${escapeHtml(skill)}"
          title="${escapeHtml(skill)} : ${current}/${target} Confirmé(s)+Expert(s) - Cliquer pour modifier">
          <span class="objectives-cell__value">${current}/${target}</span>
        </td>`;
      } else {
        html += `<td class="objectives-cell objectives-cell--none objectives-cell--editable${catStart}"
          data-col-highlight="${escapeHtml(skill)}" data-objective-skill="${escapeHtml(skill)}"
          title="Définir un objectif pour ${escapeHtml(skill)}">
          <span class="objectives-cell__value">·</span>
        </td>`;
      }
    }
    html += '</tr>';
  }
  for (const member of members) {
    const isShareTarget = shareMode && member.name === shareTarget;
    const isShareLocked = shareMode && member.name !== shareTarget;
    html += `<tr class="${isShareTarget ? 'matrix-row--share-active' : ''}${isShareLocked ? ' matrix-row--share-locked' : ''}">`;
    const lastUp = timeAgo(member.lastUpdated);
    const isMemberPinned = (state.pinnedMembers || []).includes(member.id);
    html += `<td>
      <div class="member-name editable-cell" data-member-id="${member.id}" data-field="name">
        <div class="member-avatar">${getInitials(member.name)}</div>
        <div>
          <div>${escapeHtml(member.name)}</div>
          ${lastUp ? `<div class="member-last-updated" title="${new Date(member.lastUpdated).toLocaleString('fr-FR')}">${lastUp}</div>` : ''}
        </div>
        <button class="pin-btn pin-btn--member ${isMemberPinned ? 'pin-btn--active' : ''}" data-pin-member="${member.id}" title="${isMemberPinned ? 'Retirer des epingles' : 'Epingler sur le dashboard'}">📌</button>
      </div>
    </td>`;
    html += `<td>
      <div class="editable-cell editable-cell--chips" data-member-id="${member.id}" data-field="role">
        ${member.role
          ? member.role.split(',').map(r => r.trim()).filter(Boolean).map(r => `<span class="cell-chip">${escapeHtml(r)}</span>`).join('')
          : '<span class="cell-chip cell-chip--empty">-</span>'
        }
      </div>
    </td>`;
    const groups = Array.isArray(member.groups) ? member.groups : [];
    html += `<td>
      <div class="editable-cell editable-cell--chips" data-member-id="${member.id}" data-field="groups">
        ${groups.length > 0
          ? groups.map(g => `<span class="cell-chip cell-chip--group">${escapeHtml(g)}</span>`).join('')
          : '<span class="cell-chip cell-chip--empty">-</span>'
        }
      </div>
    </td>`;
    for (const skill of flatSkills) {
      const entry = member.skills[skill];
      const level = entry?.level ?? 0;
      const appetence = entry?.appetence ?? 0;
      const comment = entry?.comment || '';
      const appetenceIcon = getAppetenceIcon(appetence);

      const tdCatClass = categoryStartSkills.has(skill) ? ' class="category-start"' : '';
      html += `<td${tdCatClass} data-col-highlight="${escapeHtml(skill)}">
        <div class="skill-cell skill-cell--level-${level}"
             data-member-id="${member.id}"
             data-skill="${escapeHtml(skill)}"
             data-level="${level}"
             data-appetence="${appetence}"
             data-comment="${escapeHtml(comment)}"
             title="${escapeHtml(skill)}: ${getSkillLabel(level)}${appetence > 0 ? ' · Appétence: ' + APPETENCE_LEVELS[appetence]?.label : ''}${comment ? ' · Note: ' + escapeHtml(comment) : ''}">
          <span class="skill-cell__level">${level > 0 ? level : '·'}</span>
          ${appetenceIcon ? `<span class="skill-cell__appetence">${appetenceIcon}</span>` : ''}
          ${comment ? `<span class="skill-cell__comment" title="${escapeHtml(comment)}">💬</span>` : ''}
        </div>
      </td>`;
    }
    html += '</tr>';
  }
  html += '</tbody>';

  // Summary footer row
  html += '<tfoot><tr class="summary-row">';
  html += '<td colspan="3" class="summary-row__label" title="Nombre de Confirmés + Experts par compétence">Confirmés + Experts</td>';
  for (const skill of flatSkills) {
    const stats = getSkillStats(members, skill);
    const ce = stats.levels[3] + stats.levels[4];
    const coverage = Math.round(stats.coverage);
    const catStart = categoryStartSkills.has(skill) ? ' category-start' : '';
    const barColor = coverage >= 75 ? 'var(--color-success)' : coverage >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';
    html += `<td class="summary-cell${catStart}" data-col-highlight="${escapeHtml(skill)}"
      title="${escapeHtml(skill)} : ${ce} Confirmé(s)+Expert(s), couverture ${coverage}%">
      <div class="summary-cell__inner">
        <span class="summary-cell__value">${ce}</span>
        <div class="summary-cell__bar" style="width: ${coverage}%; background: ${barColor};"></div>
      </div>
    </td>`;
  }
  html += '</tr></tfoot></table>';

  return html;
}

/**
 * Render the transposed matrix table (skills as rows, members as columns).
 * @param {Object[]} members - Filtered & sorted members
 * @param {Object} groupedSkills - Skills grouped by category
 * @param {Object} state - Current app state
 * @returns {string} Table HTML
 */
function renderTransposedTable(members, groupedSkills, state) {
  const flatSkills = [];
  const skillToCategory = {};
  for (const [catName, skills] of Object.entries(groupedSkills)) {
    for (const skill of skills) {
      flatSkills.push(skill);
      skillToCategory[skill] = catName;
    }
  }

  if (members.length === 0 || flatSkills.length === 0) {
    return '<p style="padding: var(--space-6); text-align: center; color: var(--color-text-secondary);">Aucun résultat avec les filtres actuels.</p>';
  }

  const threshold = state.settings?.criticalThreshold ?? 2;
  const shareMode = isShareMode();
  const shareTarget = getShareMemberName();

  let html = '<table class="matrix-table matrix-table--transposed">';

  // En-tête : une colonne par membre
  html += '<thead><tr><th class="transposed-skill-col">Compétence</th>';
  for (const member of members) {
    const isShareTarget = shareMode && member.name === shareTarget;
    const firstRole = member.role ? member.role.split(',')[0].trim() : '';
    const memberGroups = Array.isArray(member.groups) ? member.groups : [];
    html += `<th class="transposed-member-header${isShareTarget ? ' transposed-member-header--active' : ''}" data-col-highlight="${member.id}">
      <div class="transposed-member-card">
        <div class="member-avatar">${getInitials(member.name)}</div>
        <div class="transposed-member-name" title="${escapeHtml(member.name)}">${escapeHtml(member.name)}</div>
        ${firstRole ? `<div class="transposed-member-role" title="${escapeHtml(firstRole)}">${escapeHtml(firstRole)}</div>` : ''}
        ${memberGroups.length > 0 ? `<div class="transposed-member-groups">${memberGroups.map(g => `<span class="transposed-member-group">${escapeHtml(g)}</span>`).join(' ')}</div>` : ''}
      </div>
    </th>`;
  }
  html += '</tr></thead><tbody>';

  let lastCat = null;
  for (const skill of flatSkills) {
    const cat = skillToCategory[skill];
    // Ligne séparateur de catégorie
    if (cat !== lastCat) {
      lastCat = cat;
      html += `<tr class="transposed-category-row"><th colspan="${members.length + 1}">${escapeHtml(cat)}</th></tr>`;
    }

    const critical = isSkillCritical(state.members, skill, threshold);
    const obj = (state.objectives || {})[skill];
    let objIndicator = '';
    if (obj?.minExperts) {
      const st = getSkillStats(state.members, skill);
      const cur = st.levels[3] + st.levels[4];
      const met = cur >= obj.minExperts;
      objIndicator = ` <span class="objectives-inline objectives-inline--${met ? 'met' : 'danger'}" title="Objectif : ${cur}/${obj.minExperts}">${cur}/${obj.minExperts}</span>`;
    }

    html += '<tr>';
    html += `<th class="transposed-skill-label">
      <span class="skill-name" data-rename-skill="${escapeHtml(skill)}" style="cursor: pointer;" title="Cliquer pour renommer">
        ${escapeHtml(skill)}${critical ? ' <span style="color: var(--color-level-beginner);" title="Compétence critique">⚠</span>' : ''}${objIndicator}
      </span>
    </th>`;

    for (const member of members) {
      const isShareLocked = shareMode && member.name !== shareTarget;
      const entry = member.skills[skill];
      const level = entry?.level ?? 0;
      const appetence = entry?.appetence ?? 0;
      const comment = entry?.comment || '';
      const appetenceIcon = getAppetenceIcon(appetence);
      html += `<td data-col-highlight="${member.id}">
        <div class="skill-cell skill-cell--level-${level}${isShareLocked ? ' skill-cell--locked' : ''}"
             data-member-id="${member.id}" data-skill="${escapeHtml(skill)}"
             data-level="${level}" data-appetence="${appetence}"
             data-comment="${escapeHtml(comment)}"
             title="${escapeHtml(member.name)} · ${escapeHtml(skill)} : ${getSkillLabel(level)}${appetence > 0 ? ' · Appétence : ' + APPETENCE_LEVELS[appetence]?.label : ''}${comment ? ' · Note : ' + escapeHtml(comment) : ''}">
          <span class="skill-cell__level">${level > 0 ? level : '·'}</span>
          ${appetenceIcon ? `<span class="skill-cell__appetence">${appetenceIcon}</span>` : ''}
          ${comment ? `<span class="skill-cell__comment" title="${escapeHtml(comment)}">💬</span>` : ''}
        </div>
      </td>`;
    }
    html += '</tr>';
  }

  html += '</tbody></table>';
  return html;
}

/**
 * Group skills by their category. Uncategorized skills go to "Autres".
 * @param {string[]} skills - Skill names to group
 * @param {Object} categories - Categories map
 * @returns {Object} Grouped skills { categoryName: [skillName] }
 */
function groupSkillsByCategory(skills, categories) {
  const skillSet = new Set(skills);
  const grouped = {};
  const used = new Set();

  for (const [catName, catSkills] of Object.entries(categories)) {
    const matching = catSkills.filter(s => skillSet.has(s));
    if (matching.length > 0) {
      grouped[catName] = matching;
      matching.forEach(s => used.add(s));
    }
  }

  const uncategorized = skills.filter(s => !used.has(s));
  if (uncategorized.length > 0) {
    grouped['Autres'] = uncategorized;
  }

  return grouped;
}

/**
 * Apply sorting to members array.
 * @param {Object[]} members - Members to sort
 * @param {Object} config - Sort config { key, ascending }
 * @returns {Object[]} Sorted members
 */
function applySorting(members, config) {
  if (!config.key) return members;

  return [...members].sort((a, b) => {
    let va, vb;

    if (config.key === 'name') {
      va = a.name.toLowerCase();
      vb = b.name.toLowerCase();
    } else if (config.key === 'role') {
      va = a.role.toLowerCase();
      vb = b.role.toLowerCase();
    } else if (config.key === 'groups') {
      va = (Array.isArray(a.groups) ? a.groups.join(', ') : '').toLowerCase();
      vb = (Array.isArray(b.groups) ? b.groups.join(', ') : '').toLowerCase();
    } else if (config.key.startsWith('skill:')) {
      const skillName = config.key.slice(6);
      va = a.skills[skillName]?.level ?? 0;
      vb = b.skills[skillName]?.level ?? 0;
    } else {
      return 0;
    }

    if (va < vb) return config.ascending ? -1 : 1;
    if (va > vb) return config.ascending ? 1 : -1;
    return 0;
  });
}

/**
 * Get the sort indicator arrow for a column.
 * @param {string} key - Sort key
 * @returns {string} HTML for the indicator
 */
function getSortIndicator(key) {
  if (sortConfig.key !== key) return '<span class="sort-indicator">⇅</span>';
  return `<span class="sort-indicator sort-indicator--active">${sortConfig.ascending ? '↑' : '↓'}</span>`;
}

/**
 * Bind all interactive events for the matrix view.
 * @param {HTMLElement} container - View container
 * @param {Object} state - Current state
 */
function bindMatrixEvents(container, state) {
  const inShareMode = isShareMode();
  const shareMember = getShareMemberName();

  // Trouver l'ID du membre sélectionné en mode partage
  const shareMemberId = inShareMode && shareMember
    ? state.members.find(m => m.name === shareMember)?.id
    : null;

  // --- Group tabs ---
  container.querySelectorAll('.matrix-group-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      updateFilters({ group: tab.dataset.group || '' });
    });
  });

  // --- Pin buttons ---
  container.querySelectorAll('[data-pin-skill]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePinnedSkill(btn.dataset.pinSkill);
    });
  });
  container.querySelectorAll('[data-pin-member]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePinnedMember(btn.dataset.pinMember);
    });
  });

  // Tooltips sur les en-têtes tronqués (fixed, échappe au overflow du container)
  let tooltip = document.getElementById('matrix-skill-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'matrix-skill-tooltip';
    tooltip.className = 'matrix-skill-tooltip';
    document.body.appendChild(tooltip);
  }
  container.querySelectorAll('th[data-tooltip]').forEach(th => {
    th.addEventListener('mouseenter', () => {
      tooltip.textContent = th.dataset.tooltip;
      const r = th.getBoundingClientRect();
      tooltip.style.left = (r.left + r.width / 2) + 'px';
      tooltip.style.top = (r.top - 8) + 'px';
      tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
      tooltip.classList.add('matrix-skill-tooltip--visible');
    });
    th.addEventListener('mouseleave', () => {
      tooltip.classList.remove('matrix-skill-tooltip--visible');
    });
  });

  // Toggle de disposition (défaut / transposé) - met à jour le hash sans créer d'entrée d'historique
  container.querySelector('#matrix-layout-default')?.addEventListener('click', () => {
    if (matrixLayout !== 'default') { setLayoutInHash('default'); renderMatrixView(container); }
  });
  container.querySelector('#matrix-layout-transposed')?.addEventListener('click', () => {
    if (matrixLayout !== 'transposed') { setLayoutInHash('transposed'); renderMatrixView(container); }
  });

  // Compact mode toggle
  container.querySelector('#matrix-compact-check')?.addEventListener('change', (e) => {
    compactMode = e.target.checked;
    const tc = container.querySelector('#matrix-table-container');
    if (tc) tc.classList.toggle('matrix-container--compact', compactMode);
  });

  // Column highlight on hover
  const table = container.querySelector('.matrix-table');
  if (table) {
    let lastHighlight = null;
    table.addEventListener('mouseover', (e) => {
      const cell = e.target.closest('[data-col-highlight]');
      const key = cell?.dataset.colHighlight;
      if (key === lastHighlight) return;

      if (lastHighlight) {
        table.querySelectorAll('.col-highlight').forEach(el => el.classList.remove('col-highlight'));
      }
      lastHighlight = key || null;

      if (key) {
        table.querySelectorAll(`[data-col-highlight="${CSS.escape(key)}"]`).forEach(el => {
          el.classList.add('col-highlight');
        });
      }
    });
    table.addEventListener('mouseleave', () => {
      table.querySelectorAll('.col-highlight').forEach(el => el.classList.remove('col-highlight'));
      lastHighlight = null;
    });
  }

  // Objective cells - click to edit target (disabled in share mode)
  if (!inShareMode) {
    container.querySelectorAll('[data-objective-skill]').forEach(cell => {
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        openObjectiveEditor(cell, cell.dataset.objectiveSkill, container);
      });
    });
  }

  // Sort headers
  container.querySelectorAll('.sort-header').forEach(header => {
    header.addEventListener('click', () => {
      const key = header.dataset.sort;
      if (sortConfig.key === key) {
        sortConfig.ascending = !sortConfig.ascending;
      } else {
        sortConfig = { key, ascending: true };
      }
      _skipScrollRestore = true;
      renderMatrixView(container);
    });
  });

  // Skill cell click → inline edit
  container.querySelectorAll('.skill-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      // En mode partage, seul le membre sélectionné peut éditer ses cellules
      if (inShareMode) {
        if (!shareMemberId || cell.dataset.memberId !== shareMemberId) return;
      }
      openInlineEditor(cell, container);
    });
  });

  // Editable cells click → inline editors for name, role, appetences
  // Desactive en mode partage
  if (!inShareMode) {
    container.querySelectorAll('.editable-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        const field = cell.dataset.field;
        const memberId = cell.dataset.memberId;
        if (field === 'name') {
          openNameEditor(cell, memberId, container);
        } else if (field === 'role') {
          openChipEditor(cell, memberId, 'role', state, container);
        } else if (field === 'groups') {
          openGroupsEditor(cell, memberId, state, container);
        }
      });
    });

    // Clic sur le nom d'une compétence → renommer
    container.querySelectorAll('[data-rename-skill]').forEach(span => {
      span.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const th = span.closest('th');
        openSkillRenameEditor(th, span.dataset.renameSkill, container);
      });
    });
  }

  // Close editor on outside click (retrait de l'ancien listener avant d'ajouter le nouveau)
  if (_closeEditorListener) document.removeEventListener('click', _closeEditorListener);
  _closeEditorListener = closeActiveEditor;
  document.addEventListener('click', closeActiveEditor);

  // Navigation clavier (flèches, Entrée, Échap)
  setupKeyboardNavigation(container);

  // Restaurer le focus après re-render (saisie rapide clavier)
  if (_pendingFocusCell) {
    const { memberId, skill } = _pendingFocusCell;
    _pendingFocusCell = null;
    const cell = container.querySelector(`.skill-cell[data-member-id="${memberId}"][data-skill="${CSS.escape(skill)}"]`);
    if (cell) {
      cell.classList.add('skill-cell--focused');
      cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  // Export buttons (masques en mode partage)
  if (!inShareMode) {
    const delimiter = state.settings?.csvDelimiter || ';';
    container.querySelector('#matrix-export-csv')?.addEventListener('click', () => {
      const csv = exportCSV(state.members, state.categories, delimiter);
      downloadFile(csv, 'skills-matrix.csv');
      toastSuccess('CSV exporté.');
    });

    container.querySelector('#matrix-export-detailed')?.addEventListener('click', () => {
      const threshold = state.settings?.criticalThreshold ?? 2;
      const csv = exportDetailedCSV(state.members, state.categories, delimiter, threshold);
      downloadFile(csv, 'skills-matrix-detailed.csv');
      toastSuccess('CSV détaillé exporté.');
    });

    container.querySelector('#matrix-print')?.addEventListener('click', () => {
      window.print();
    });
  }

  // Keyboard shortcuts help
  const overlay = container.querySelector('#kbd-help-overlay');
  const toggleHelp = () => overlay?.toggleAttribute('hidden');
  container.querySelector('#kbd-help-toggle')?.addEventListener('click', toggleHelp);
  container.querySelector('#kbd-help-close')?.addEventListener('click', toggleHelp);
  overlay?.addEventListener('click', (e) => { if (e.target === overlay) toggleHelp(); });
}

/**
 * Open an inline editor on a skill cell.
 * @param {HTMLElement} cell - The clicked skill cell
 * @param {HTMLElement} viewContainer - The matrix view container
 */
function openInlineEditor(cell, viewContainer) {
  closeActiveEditor(true);

  const memberId = cell.dataset.memberId;
  const skillName = cell.dataset.skill;
  const currentLevel = parseInt(cell.dataset.level, 10);
  const currentAppetence = parseInt(cell.dataset.appetence, 10);
  const currentComment = cell.dataset.comment || '';

  const editor = document.createElement('div');
  editor.className = 'inline-edit';
  editor.innerHTML = `
    <div class="inline-edit__label">Niveau</div>
    <div class="inline-edit__options">
      ${SKILL_LEVELS.map(l => `
        <div class="inline-edit__option ${l.value === currentLevel ? 'inline-edit__option--selected' : ''}"
             data-type="level" data-value="${l.value}">
          <div class="inline-edit__color" style="background: ${l.color};"></div>
          <span>${l.value} · ${l.label}</span>
        </div>
      `).join('')}
    </div>
    <div class="inline-edit__label" style="margin-top: 8px;">Appétence</div>
    <div class="inline-edit__options">
      ${APPETENCE_LEVELS.map(a => `
        <div class="inline-edit__option ${a.value === currentAppetence ? 'inline-edit__option--selected' : ''}"
             data-type="appetence" data-value="${a.value}">
          <span>${a.icon || '-'} ${a.label}</span>
        </div>
      `).join('')}
    </div>
    <div class="inline-edit__label" style="margin-top: 8px;">Note</div>
    <textarea class="inline-edit__comment" placeholder="Contexte, formation prevue..." rows="2">${escapeHtml(currentComment)}</textarea>
  `;

  positionEditor(editor, cell);
  document.body.appendChild(editor);
  activeEditor = editor;

  let newLevel = currentLevel;
  let newAppetence = currentAppetence;

  // Handle option clicks
  editor.querySelectorAll('.inline-edit__option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = option.dataset.type;
      const value = parseInt(option.dataset.value, 10);

      if (type === 'level') {
        newLevel = value;
        editor.querySelectorAll('[data-type="level"]').forEach(o =>
          o.classList.toggle('inline-edit__option--selected', parseInt(o.dataset.value) === value)
        );
      } else {
        newAppetence = value;
        editor.querySelectorAll('[data-type="appetence"]').forEach(o =>
          o.classList.toggle('inline-edit__option--selected', parseInt(o.dataset.value) === value)
        );
      }

      // Commit the change immediately on each click
      const comment = editor.querySelector('.inline-edit__comment')?.value.trim() || '';
      updateSkill(memberId, skillName, { level: newLevel, appetence: newAppetence, comment });

      // Update the cell visually without full re-render
      cell.className = `skill-cell skill-cell--level-${newLevel}`;
      cell.dataset.level = newLevel;
      cell.dataset.appetence = newAppetence;
      cell.dataset.comment = comment;
      const levelSpan = cell.querySelector('.skill-cell__level');
      if (levelSpan) levelSpan.textContent = newLevel > 0 ? newLevel : '·';

      let appSpan = cell.querySelector('.skill-cell__appetence');
      const icon = getAppetenceIcon(newAppetence);
      if (icon) {
        if (!appSpan) {
          appSpan = document.createElement('span');
          appSpan.className = 'skill-cell__appetence';
          cell.appendChild(appSpan);
        }
        appSpan.textContent = icon;
      } else if (appSpan) {
        appSpan.remove();
      }

      // Indicateur de commentaire
      updateCommentIndicator(cell, comment);
    });
  });

  // Sauvegarde du commentaire au blur du textarea
  const commentArea = editor.querySelector('.inline-edit__comment');
  commentArea?.addEventListener('blur', () => {
    const comment = commentArea.value.trim();
    updateSkill(memberId, skillName, { level: newLevel, appetence: newAppetence, comment });
    cell.dataset.comment = comment;
    updateCommentIndicator(cell, comment);
  });

  // Prevent editor clicks from closing
  editor.addEventListener('click', (e) => e.stopPropagation());
}

/**
 * Update or create the comment indicator icon on a skill cell.
 * @param {HTMLElement} cell
 * @param {string} comment
 */
function updateCommentIndicator(cell, comment) {
  let indicator = cell.querySelector('.skill-cell__comment');
  if (comment) {
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = 'skill-cell__comment';
      indicator.textContent = '💬';
      cell.appendChild(indicator);
    }
    indicator.title = comment;
  } else if (indicator) {
    indicator.remove();
  }
}

/**
 * Open an inline text editor for the member name.
 * @param {HTMLElement} cell - The clicked cell
 * @param {string} memberId - Member ID
 * @param {HTMLElement} viewContainer - Matrix view container
 */
function openNameEditor(cell, memberId, viewContainer) {
  closeActiveEditor(true);

  const state = getState();
  const member = state.members.find(m => m.id === memberId);
  if (!member) return;

  const editor = document.createElement('div');
  editor.className = 'inline-edit';
  editor.innerHTML = `
    <div class="inline-edit__label">Nom du membre</div>
    <input type="text" class="inline-edit__input" value="${escapeHtml(member.name)}" />
  `;

  positionEditor(editor, cell);
  document.body.appendChild(editor);
  activeEditor = editor;

  const input = editor.querySelector('input');
  input.focus();
  input.select();

  let cancelled = false;
  const commit = () => {
    if (cancelled) return;
    const newName = input.value.trim();
    if (newName && newName !== member.name) {
      updateMember(memberId, { name: newName });
      renderMatrixView(viewContainer);
    }
    closeActiveEditor();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { cancelled = true; closeActiveEditor(); }
  });
  input.addEventListener('blur', () => {
    // Small delay to allow click events inside editor
    setTimeout(commit, 100);
  });
  editor.addEventListener('click', (e) => e.stopPropagation());
}

/**
 * Open an inline editor to rename a skill column.
 * @param {HTMLElement} th - The header cell
 * @param {string} oldName - Current skill name
 * @param {HTMLElement} viewContainer - The matrix view container
 */
function openSkillRenameEditor(th, oldName, viewContainer) {
  closeActiveEditor(true);

  const editor = document.createElement('div');
  editor.className = 'inline-edit';
  editor.innerHTML = `
    <div class="inline-edit__label">Renommer la compétence</div>
    <input type="text" class="inline-edit__input" value="${escapeHtml(oldName)}" />
  `;

  positionEditor(editor, th);
  document.body.appendChild(editor);
  activeEditor = editor;

  const input = editor.querySelector('input');
  input.focus();
  input.select();

  let committed = false;
  const commit = () => {
    if (committed) return;
    if (!editor.parentNode) return; // Editeur deja ferme (clic sur une autre competence)
    committed = true;
    const newName = input.value.trim();
    if (newName && newName !== oldName) {
      renameSkill(oldName, newName);
      toastSuccess(`Compétence renommée : « ${newName} »`);
      renderMatrixView(viewContainer);
    }
    closeActiveEditor();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { committed = true; closeActiveEditor(); }
  });
  input.addEventListener('blur', () => setTimeout(commit, 150));
  editor.addEventListener('click', (e) => e.stopPropagation());
}

/**
 * Open a chip-based inline editor for role or appetences.
 * Shows existing values as toggleable chips, plus an input to add new ones.
 * @param {HTMLElement} cell - The clicked cell
 * @param {string} memberId - Member ID
 * @param {'role'|'appetences'} field - Field to edit
 * @param {Object} state - Current app state
 * @param {HTMLElement} viewContainer - Matrix view container
 */
function openChipEditor(cell, memberId, field, state, viewContainer) {
  closeActiveEditor(true);

  const member = state.members.find(m => m.id === memberId);
  if (!member) return;

  // Current values as array
  const currentValues = (member[field] || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

  // Collect all known values across members for suggestions
  const allValues = new Set();
  for (const m of state.members) {
    (m[field] || '').split(',').forEach(v => {
      const trimmed = v.trim();
      if (trimmed) allValues.add(trimmed);
    });
  }
  // Suggestions = all known values not already selected
  const suggestions = [...allValues].sort((a, b) => a.localeCompare(b, 'fr'));

  const editor = document.createElement('div');
  editor.className = 'inline-edit inline-edit--chips';

  const label = field === 'role' ? 'Ownership' : 'Appétences';

  const renderEditorContent = () => {
    editor.innerHTML = `
      <div class="inline-edit__label">${label}</div>
      <div class="inline-edit__chip-list">
        ${currentValues.map(v => `
          <span class="inline-edit__chip inline-edit__chip--active" data-value="${escapeHtml(v)}">
            ${escapeHtml(v)} <span class="inline-edit__chip-remove">&times;</span>
          </span>
        `).join('')}
      </div>
      <div class="inline-edit__label" style="margin-top: 6px;">Suggestions</div>
      <div class="inline-edit__chip-list">
        ${suggestions.filter(s => !currentValues.includes(s)).map(s => `
          <span class="inline-edit__chip inline-edit__chip--suggestion" data-value="${escapeHtml(s)}">
            + ${escapeHtml(s)}
          </span>
        `).join('') || '<span style="font-size: 11px; color: var(--color-text-secondary);">-</span>'}
      </div>
      <div style="margin-top: 6px; display: flex; gap: 4px;">
        <input type="text" class="inline-edit__input" placeholder="Ajouter..." style="flex: 1;" />
        <button class="inline-edit__add-btn" aria-label="Ajouter" title="Ajouter">+</button>
      </div>
    `;
    bindChipEditorEvents();
  };

  const commitField = () => {
    updateMember(memberId, { [field]: currentValues.join(', ') });
  };

  const bindChipEditorEvents = () => {
    // Remove chip
    editor.querySelectorAll('.inline-edit__chip--active').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = chip.dataset.value;
        const idx = currentValues.indexOf(val);
        if (idx !== -1) currentValues.splice(idx, 1);
        commitField();
        renderEditorContent();
      });
    });

    // Add suggestion chip
    editor.querySelectorAll('.inline-edit__chip--suggestion').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = chip.dataset.value;
        if (!currentValues.includes(val)) currentValues.push(val);
        commitField();
        renderEditorContent();
      });
    });

    // Add via input
    const input = editor.querySelector('.inline-edit__input');
    const addBtn = editor.querySelector('.inline-edit__add-btn');

    const addFromInput = () => {
      const val = input.value.trim();
      if (val && !currentValues.includes(val)) {
        currentValues.push(val);
        if (!allValues.has(val)) allValues.add(val);
        commitField();
        renderEditorContent();
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addFromInput(); }
      if (e.key === 'Escape') {
        closeActiveEditor();
        renderMatrixView(viewContainer);
      }
    });
    addBtn.addEventListener('click', (e) => { e.stopPropagation(); addFromInput(); });
  };

  positionEditor(editor, cell);
  document.body.appendChild(editor);
  activeEditor = editor;

  // Store a cleanup callback to re-render on close
  editor._onClose = () => renderMatrixView(viewContainer);

  renderEditorContent();
  editor.addEventListener('click', (e) => e.stopPropagation());
}

/**
 * Open a chip-based inline editor for member groups.
 * @param {HTMLElement} cell - The clicked cell
 * @param {string} memberId - Member ID
 * @param {Object} state - Current app state
 * @param {HTMLElement} viewContainer - Matrix view container
 */
function openGroupsEditor(cell, memberId, state, viewContainer) {
  closeActiveEditor(true);

  const member = state.members.find(m => m.id === memberId);
  if (!member) return;

  const currentValues = Array.isArray(member.groups) ? [...member.groups] : [];

  // Collect all known groups across members
  const allValues = new Set();
  for (const m of state.members) {
    if (Array.isArray(m.groups)) m.groups.forEach(g => { if (g) allValues.add(g); });
  }
  const suggestions = [...allValues].sort((a, b) => a.localeCompare(b, 'fr'));

  const editor = document.createElement('div');
  editor.className = 'inline-edit inline-edit--chips';

  const renderEditorContent = () => {
    editor.innerHTML = `
      <div class="inline-edit__label">Groupes</div>
      <div class="inline-edit__chip-list">
        ${currentValues.map(v => `
          <span class="inline-edit__chip inline-edit__chip--active" data-value="${escapeHtml(v)}">
            ${escapeHtml(v)} <span class="inline-edit__chip-remove">&times;</span>
          </span>
        `).join('')}
      </div>
      <div class="inline-edit__label" style="margin-top: 6px;">Suggestions</div>
      <div class="inline-edit__chip-list">
        ${suggestions.filter(s => !currentValues.includes(s)).map(s => `
          <span class="inline-edit__chip inline-edit__chip--suggestion" data-value="${escapeHtml(s)}">
            + ${escapeHtml(s)}
          </span>
        `).join('') || '<span style="font-size: 11px; color: var(--color-text-secondary);">-</span>'}
      </div>
      <div style="margin-top: 6px; display: flex; gap: 4px;">
        <input type="text" class="inline-edit__input" placeholder="Ajouter..." style="flex: 1;" />
        <button class="inline-edit__add-btn" aria-label="Ajouter" title="Ajouter">+</button>
      </div>
    `;
    bindEditorEvents();
  };

  const commitField = () => {
    updateMember(memberId, { groups: [...currentValues] });
  };

  const bindEditorEvents = () => {
    editor.querySelectorAll('.inline-edit__chip--active').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = currentValues.indexOf(chip.dataset.value);
        if (idx !== -1) currentValues.splice(idx, 1);
        commitField();
        renderEditorContent();
      });
    });

    editor.querySelectorAll('.inline-edit__chip--suggestion').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!currentValues.includes(chip.dataset.value)) currentValues.push(chip.dataset.value);
        commitField();
        renderEditorContent();
      });
    });

    const input = editor.querySelector('.inline-edit__input');
    const addBtn = editor.querySelector('.inline-edit__add-btn');
    const addFromInput = () => {
      const val = input.value.trim();
      if (val && !currentValues.includes(val)) {
        currentValues.push(val);
        commitField();
        renderEditorContent();
      }
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addFromInput(); }
      if (e.key === 'Escape') { closeActiveEditor(); renderMatrixView(viewContainer); }
    });
    addBtn.addEventListener('click', (e) => { e.stopPropagation(); addFromInput(); });
  };

  positionEditor(editor, cell);
  document.body.appendChild(editor);
  activeEditor = editor;
  editor._onClose = () => renderMatrixView(viewContainer);
  renderEditorContent();
  editor.addEventListener('click', (e) => e.stopPropagation());
}

/**
 * Persist objectives to state, PocketBase and active template.
 * @param {Object} objectives - Updated objectives map
 */
function persistObjectives(objectives) {
  updateState({ objectives });
  if (isEquipeMode()) {
    import('../services/equipes.js').then(({ updateObjectives }) => {
      const state = getState();
      if (state.equipeId) {
        updateObjectives(state.equipeId, objectives)
          .catch(() => {});
      }
    });
  }
  const state = getState();
  if (state.activeTemplate && !isShareMode()) {
    import('../services/templates.js').then(({ updateCustomTemplate }) => {
      updateCustomTemplate(state.activeTemplate.id, {
        members: state.members,
        categories: state.categories || {},
        objectives,
      });
    });
  }
}

/**
 * Open a compact inline editor to set/modify an objective target.
 * @param {HTMLElement} cell - The objectives cell clicked
 * @param {string} skillName - Skill name
 * @param {HTMLElement} viewContainer - Matrix view container
 */
function openObjectiveEditor(cell, skillName, viewContainer) {
  closeActiveEditor(true);

  const state = getState();
  const obj = state.objectives?.[skillName];
  const currentTarget = obj?.minExperts ?? 0;
  const stats = getSkillStats(state.members, skillName);
  const current = stats.levels[3] + stats.levels[4];

  const editor = document.createElement('div');
  editor.className = 'inline-edit inline-edit--objective';

  const renderContent = (val) => {
    const met = val > 0 && current >= val;
    editor.innerHTML = `
      <div class="inline-edit__label">${escapeHtml(skillName)}</div>
      <div class="objective-editor">
        <div class="objective-editor__status">
          Actuellement <strong>${current}</strong> Confirmé(s)+Expert(s)
        </div>
        <div class="objective-editor__stepper">
          <button class="objective-editor__btn" data-delta="-1" ${val <= 0 ? 'disabled' : ''}>−</button>
          <span class="objective-editor__value ${met ? 'objective-editor__value--met' : ''}">${val > 0 ? val : '-'}</span>
          <button class="objective-editor__btn" data-delta="1">+</button>
        </div>
        <div class="objective-editor__hint">${val > 0 ? (met ? 'Objectif atteint' : `Manque ${val - current}`) : 'Pas d\'objectif'}</div>
        ${val > 0 ? '<button class="objective-editor__remove">Retirer l\'objectif</button>' : ''}
      </div>
    `;
    bindEditorEvents(val);
  };

  const bindEditorEvents = (val) => {
    editor.querySelectorAll('.objective-editor__btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const delta = parseInt(btn.dataset.delta, 10);
        const next = Math.max(0, val + delta);
        commitValue(next);
        renderContent(next);
      });
    });
    editor.querySelector('.objective-editor__remove')?.addEventListener('click', (e) => {
      e.stopPropagation();
      commitValue(0);
      renderContent(0);
    });
  };

  const commitValue = (val) => {
    const state = getState();
    const objectives = { ...state.objectives };
    if (val > 0) {
      objectives[skillName] = { minExperts: val };
    } else {
      delete objectives[skillName];
    }
    persistObjectives(objectives);
  };

  positionEditor(editor, cell);
  document.body.appendChild(editor);
  activeEditor = editor;
  editor._onClose = () => renderMatrixView(viewContainer);

  renderContent(currentTarget);
  editor.addEventListener('click', (e) => e.stopPropagation());
}

/**
 * Position a fixed editor element below a target cell, clamped to viewport.
 * @param {HTMLElement} editor - Editor element
 * @param {HTMLElement} target - Target cell
 */
function positionEditor(editor, target) {
  const rect = target.getBoundingClientRect();
  editor.style.left = `${rect.left}px`;
  editor.style.top = `${rect.bottom + 4}px`;

  requestAnimationFrame(() => {
    const editorRect = editor.getBoundingClientRect();
    if (editorRect.right > window.innerWidth) {
      editor.style.left = `${window.innerWidth - editorRect.width - 8}px`;
    }
    if (editorRect.bottom > window.innerHeight) {
      editor.style.top = `${rect.top - editorRect.height - 4}px`;
    }
  });
}

/**
 * Close the currently active inline editor.
 * @param {boolean} [silent=false] - If true, skip the _onClose callback (used when opening another editor)
 */
function closeActiveEditor(silent = false) {
  if (activeEditor) {
    const onClose = !silent && activeEditor._onClose;
    activeEditor.remove();
    activeEditor = null;
    if (onClose) onClose();
  }
}

// ── Keyboard navigation ─────────────────────────────────────────────────────

/** @type {Function|null} Référence au listener clavier pour le retirer proprement */
let _keyboardListener = null;

/**
 * Active la navigation clavier dans la matrice.
 * Flèches pour se déplacer, Entrée pour éditer, Échap pour fermer.
 * @param {HTMLElement} container - Le conteneur de la vue matrice
 */
function setupKeyboardNavigation(container) {
  if (_keyboardListener) {
    document.removeEventListener('keydown', _keyboardListener);
    _keyboardListener = null;
  }

  _keyboardListener = (e) => {
    // Ignorer si un input/textarea est focalisé (filtres, éditeurs)
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    // Ignorer si un éditeur inline est ouvert
    if (activeEditor) return;

    const table = container.querySelector('.matrix-table');
    if (!table) return;

    const cells = table.querySelectorAll('td .skill-cell');
    if (cells.length === 0) return;

    const focused = container.querySelector('.skill-cell--focused');

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();

      if (!focused) {
        // Première pression : focaliser la première cellule
        cells[0]?.classList.add('skill-cell--focused');
        cells[0]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        return;
      }

      const allCells = Array.from(cells);
      const currentIdx = allCells.indexOf(focused);
      if (currentIdx === -1) return;

      // Calculer la grille : nombre de colonnes = cellules par ligne
      const row = focused.closest('tr');
      const colsInRow = row ? row.querySelectorAll('.skill-cell').length : 1;

      let nextIdx = currentIdx;
      if (e.key === 'ArrowRight') nextIdx = Math.min(currentIdx + 1, allCells.length - 1);
      else if (e.key === 'ArrowLeft') nextIdx = Math.max(currentIdx - 1, 0);
      else if (e.key === 'ArrowDown') nextIdx = Math.min(currentIdx + colsInRow, allCells.length - 1);
      else if (e.key === 'ArrowUp') nextIdx = Math.max(currentIdx - colsInRow, 0);

      if (nextIdx !== currentIdx) {
        focused.classList.remove('skill-cell--focused');
        allCells[nextIdx].classList.add('skill-cell--focused');
        allCells[nextIdx].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
      return;
    }

    // Saisie rapide : 0-4 = niveau, Shift+0-3 = appétence
    if (focused && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const digit = parseInt(e.key, 10);
      if (!isNaN(digit)) {
        if (e.shiftKey && digit >= 0 && digit <= 3) {
          // Appétence via Shift+0..3
          e.preventDefault();
          const memberId = focused.dataset.memberId;
          const skillName = focused.dataset.skill;
          const level = parseInt(focused.dataset.level, 10);
          const comment = focused.dataset.comment || '';
          // Calculer la cellule suivante AVANT updateSkill (qui déclenche un re-render)
          _pendingFocusCell = getNextCellCoords(focused, cells, container);
          updateSkill(memberId, skillName, { level, appetence: digit, comment });
          return;
        } else if (!e.shiftKey && digit >= 0 && digit <= 4) {
          // Niveau via 0..4
          e.preventDefault();
          const memberId = focused.dataset.memberId;
          const skillName = focused.dataset.skill;
          const appetence = parseInt(focused.dataset.appetence, 10);
          const comment = focused.dataset.comment || '';
          // Calculer la cellule suivante AVANT updateSkill (qui déclenche un re-render)
          _pendingFocusCell = getNextCellCoords(focused, cells, container);
          updateSkill(memberId, skillName, { level: digit, appetence, comment });
          return;
        }
      }
    }

    if (e.key === 'Enter' && focused) {
      e.preventDefault();
      focused.click();
      return;
    }

    if (e.key === 'Escape' && focused) {
      focused.classList.remove('skill-cell--focused');
      return;
    }

    // "/" → focus search input
    if (e.key === '/') {
      e.preventDefault();
      container.querySelector('#filter-search')?.focus();
      return;
    }

    // "?" → toggle keyboard help overlay
    if (e.key === '?') {
      e.preventDefault();
      container.querySelector('#kbd-help-overlay')?.toggleAttribute('hidden');
      return;
    }
  };

  document.addEventListener('keydown', _keyboardListener);
}

/**
 * Calcule les coordonnées (memberId, skill) de la cellule suivante du même membre.
 * Retourne null si on est à la dernière compétence du membre.
 * @param {HTMLElement} current - Cellule actuellement focalisée
 * @param {NodeList} allCells - Toutes les cellules skill-cell
 * @param {HTMLElement} container - Conteneur de la vue
 * @returns {{memberId: string, skill: string}|null}
 */
function getNextCellCoords(current, allCells, container) {
  const cellArray = Array.from(allCells);
  const currentIdx = cellArray.indexOf(current);
  if (currentIdx === -1) return null;

  const memberId = current.dataset.memberId;
  const isTransposed = !!container.querySelector('.matrix-table--transposed');

  let nextIdx;
  if (isTransposed) {
    const row = current.closest('tr');
    const colsInRow = row ? row.querySelectorAll('.skill-cell').length : 1;
    nextIdx = currentIdx + colsInRow;
  } else {
    nextIdx = currentIdx + 1;
  }

  if (nextIdx < cellArray.length && cellArray[nextIdx].dataset.memberId === memberId) {
    return { memberId, skill: cellArray[nextIdx].dataset.skill };
  }
  return null;
}

/**
 * Retire le listener clavier de la matrice.
 */
function teardownKeyboardNavigation() {
  if (_keyboardListener) {
    document.removeEventListener('keydown', _keyboardListener);
    _keyboardListener = null;
  }
}
