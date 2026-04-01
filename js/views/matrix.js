/**
 * Matrix view - Main heatmap table showing members x skills.
 * Supports inline editing, sorting, and filtering.
 */

import { getState, updateSkill, updateMember, renameSkill, isShareMode, getShareMemberName } from '../state.js';
import { getAllSkillNames, getAllRoles, isSkillCritical } from '../models/data.js';
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

/** Lit la disposition depuis le hash (#matrix/transposed). */
function getLayoutFromHash() {
  return location.hash.replace('#', '').split('/')[1] === 'transposed' ? 'transposed' : 'default';
}

/** Écrit la disposition dans le hash sans créer d'entrée d'historique. */
function setLayoutInHash(layout) {
  const view = location.hash.replace('#', '').split('/')[0] || 'matrix';
  const newHash = layout === 'transposed' ? `#${view}/transposed` : `#${view}`;
  history.replaceState(null, '', location.search + newHash);
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
}

/**
 * Render the matrix view.
 * @param {HTMLElement} container - The view container element
 */
export function renderMatrixView(container) {
  // Synchronise la disposition depuis le hash (refresh ou lien direct)
  matrixLayout = getLayoutFromHash();

  const state = getState();

  if (state.members.length === 0) {
    renderEmptyState(container);
    return;
  }

  const allSkills = getAllSkillNames(state.members);
  const threshold = state.settings?.criticalThreshold ?? 2;
  const { filteredMembers, filteredSkills } = applyFilters(
    state.members, allSkills, state.filters, state.categories, threshold
  );

  // Sort members if a sort key is set
  const sortedMembers = applySorting(filteredMembers, sortConfig);

  // Group skills by category
  const groupedSkills = groupSkillsByCategory(filteredSkills, state.categories);

  const inShareMode = isShareMode();
  const shareMember = getShareMemberName();

  // Préserver la position de scroll avant le re-render (sauf après un tri)
  const skipRestore = _skipScrollRestore;
  _skipScrollRestore = false;
  const prevTableContainer = container.querySelector('#matrix-table-container');
  const savedScrollTop = prevTableContainer?.scrollTop ?? 0;
  const savedScrollLeft = prevTableContainer?.scrollLeft ?? 0;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Matrice de compétences</h1>
        <p class="page-header__subtitle">${state.members.length} membre(s) · ${allSkills.length} compétence(s)${
          inShareMode && shareMember ? ` · Édition : ${escapeHtml(shareMember)}` : ''
        }</p>
      </div>
      ${inShareMode ? '' : `
        <div class="page-header__actions">
          <button class="btn btn--secondary btn--sm" id="matrix-export-csv">📥 Export CSV</button>
          <button class="btn btn--secondary btn--sm" id="matrix-export-detailed">📥 Export détaillé</button>
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

    <!-- Matrix Table -->
    <div class="matrix-container" id="matrix-table-container">
      ${matrixLayout === 'transposed'
        ? renderTransposedTable(sortedMembers, groupedSkills, state)
        : renderTable(sortedMembers, groupedSkills, state)}
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
}

/**
 * Render an empty state when no data is available.
 * @param {HTMLElement} container - The view container element
 */
function renderEmptyState(container) {
  renderOnboarding(container);
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

  for (const skill of flatSkills) {
    const critical = isSkillCritical(state.members, skill, threshold);
    const displayName = maxLen > 0 && skill.length > maxLen
      ? skill.substring(0, maxLen - 1) + '…'
      : skill;
    const catStart = categoryStartSkills.has(skill) ? ' category-start' : '';
    const isTruncated = maxLen > 0 && skill.length > maxLen;
    const tooltipAttr = isTruncated ? ` data-tooltip="${escapeHtml(skill)}"` : '';
    html += `<th class="${catStart}" data-skill-header="${escapeHtml(skill)}"${tooltipAttr}>
      <span class="skill-name" data-rename-skill="${escapeHtml(skill)}" style="cursor: pointer;" title="Cliquer pour renommer">
        ${escapeHtml(displayName)}${critical ? ' <span style="color: var(--color-level-beginner);" title="Compétence critique">⚠</span>' : ''}
      </span>
      <span class="sort-header" data-sort="skill:${skill}" style="cursor: pointer;" title="Trier">
        ${getSortIndicator('skill:' + skill)}
      </span>
    </th>`;
  }
  html += '</tr></thead>';

  // Body rows
  const shareMode = isShareMode();
  const shareTarget = getShareMemberName();
  html += '<tbody>';
  for (const member of members) {
    const isShareTarget = shareMode && member.name === shareTarget;
    const isShareLocked = shareMode && member.name !== shareTarget;
    html += `<tr class="${isShareTarget ? 'matrix-row--share-active' : ''}${isShareLocked ? ' matrix-row--share-locked' : ''}">`;
    const lastUp = timeAgo(member.lastUpdated);
    html += `<td>
      <div class="member-name editable-cell" data-member-id="${member.id}" data-field="name">
        <div class="member-avatar">${getInitials(member.name)}</div>
        <div>
          <div>${escapeHtml(member.name)}</div>
          ${lastUp ? `<div class="member-last-updated" title="${new Date(member.lastUpdated).toLocaleString('fr-FR')}">${lastUp}</div>` : ''}
        </div>
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
      const appetenceIcon = getAppetenceIcon(appetence);

      const tdCatClass = categoryStartSkills.has(skill) ? ' class="category-start"' : '';
      html += `<td${tdCatClass}>
        <div class="skill-cell skill-cell--level-${level}"
             data-member-id="${member.id}"
             data-skill="${escapeHtml(skill)}"
             data-level="${level}"
             data-appetence="${appetence}"
             title="${escapeHtml(skill)}: ${getSkillLabel(level)}${appetence > 0 ? ' · Appétence: ' + APPETENCE_LEVELS[appetence]?.label : ''}">
          <span class="skill-cell__level">${level > 0 ? level : '·'}</span>
          ${appetenceIcon ? `<span class="skill-cell__appetence">${appetenceIcon}</span>` : ''}
        </div>
      </td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';

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
    html += `<th class="transposed-member-header${isShareTarget ? ' transposed-member-header--active' : ''}">
      <div class="transposed-member-card">
        <div class="member-avatar">${getInitials(member.name)}</div>
        <div class="transposed-member-name" title="${escapeHtml(member.name)}">${escapeHtml(member.name)}</div>
        ${firstRole ? `<div class="transposed-member-role" title="${escapeHtml(firstRole)}">${escapeHtml(firstRole)}</div>` : ''}
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

    html += '<tr>';
    html += `<th class="transposed-skill-label">
      <span class="skill-name" data-rename-skill="${escapeHtml(skill)}" style="cursor: pointer;" title="Cliquer pour renommer">
        ${escapeHtml(skill)}${critical ? ' <span style="color: var(--color-level-beginner);" title="Compétence critique">⚠</span>' : ''}
      </span>
    </th>`;

    for (const member of members) {
      const isShareLocked = shareMode && member.name !== shareTarget;
      const entry = member.skills[skill];
      const level = entry?.level ?? 0;
      const appetence = entry?.appetence ?? 0;
      const appetenceIcon = getAppetenceIcon(appetence);
      html += `<td>
        <div class="skill-cell skill-cell--level-${level}${isShareLocked ? ' skill-cell--locked' : ''}"
             data-member-id="${member.id}" data-skill="${escapeHtml(skill)}"
             data-level="${level}" data-appetence="${appetence}"
             title="${escapeHtml(member.name)} · ${escapeHtml(skill)} : ${getSkillLabel(level)}${appetence > 0 ? ' · Appétence : ' + APPETENCE_LEVELS[appetence]?.label : ''}">
          <span class="skill-cell__level">${level > 0 ? level : '·'}</span>
          ${appetenceIcon ? `<span class="skill-cell__appetence">${appetenceIcon}</span>` : ''}
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

  // Toggle de disposition (défaut / transposé) — met à jour le hash sans créer d'entrée d'historique
  container.querySelector('#matrix-layout-default')?.addEventListener('click', () => {
    if (matrixLayout !== 'default') { setLayoutInHash('default'); renderMatrixView(container); }
  });
  container.querySelector('#matrix-layout-transposed')?.addEventListener('click', () => {
    if (matrixLayout !== 'transposed') { setLayoutInHash('transposed'); renderMatrixView(container); }
  });

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
  }
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
      updateSkill(memberId, skillName, { level: newLevel, appetence: newAppetence });

      // Update the cell visually without full re-render
      cell.className = `skill-cell skill-cell--level-${newLevel}`;
      cell.dataset.level = newLevel;
      cell.dataset.appetence = newAppetence;
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
    });
  });

  // Prevent editor clicks from closing
  editor.addEventListener('click', (e) => e.stopPropagation());
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

    if (e.key === 'Enter' && focused) {
      e.preventDefault();
      focused.click();
      return;
    }

    if (e.key === 'Escape' && focused) {
      focused.classList.remove('skill-cell--focused');
      return;
    }
  };

  document.addEventListener('keydown', _keyboardListener);
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
