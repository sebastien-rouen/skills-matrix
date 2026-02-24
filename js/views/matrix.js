/**
 * Matrix view - Main heatmap table showing members x skills.
 * Supports inline editing, sorting, and filtering.
 */

import { getState, updateSkill, updateMember } from '../state.js';
import { getAllSkillNames, getAllRoles, isSkillCritical } from '../models/data.js';
import { renderFilters, applyFilters } from '../components/filters.js';
import { toastSuccess } from '../components/toast.js';
import {
  getInitials, getSkillLabel, getAppetenceIcon, escapeHtml,
  SKILL_LEVELS, APPETENCE_LEVELS, downloadFile,
} from '../utils/helpers.js';
import { exportCSV, exportDetailedCSV } from '../services/exporter.js';

/** @type {Object|null} Current sort configuration */
let sortConfig = { key: null, ascending: true };

/** @type {HTMLElement|null} Currently open inline editor */
let activeEditor = null;

/**
 * Render the matrix view.
 * @param {HTMLElement} container - The view container element
 */
export function renderMatrixView(container) {
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

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Matrice de compétences</h1>
        <p class="page-header__subtitle">${state.members.length} membre(s) · ${allSkills.length} compétence(s)</p>
      </div>
      <div class="page-header__actions">
        <button class="btn btn--secondary btn--sm" id="matrix-export-csv">📥 Export CSV</button>
        <button class="btn btn--secondary btn--sm" id="matrix-export-detailed">📥 Export détaillé</button>
      </div>
    </div>

    <div id="matrix-filters"></div>

    <!-- Legend -->
    <div class="legend" style="margin-bottom: var(--space-4);">
      ${SKILL_LEVELS.map(l => `
        <div class="legend__item">
          <div class="legend__color" style="background: ${l.color};"></div>
          <span>${l.label}</span>
        </div>
      `).join('')}
    </div>

    <!-- Matrix Table -->
    <div class="matrix-container" id="matrix-table-container">
      ${renderTable(sortedMembers, groupedSkills, state)}
    </div>
  `;

  // Render filters into the dedicated container
  renderFilters(container.querySelector('#matrix-filters'));

  bindMatrixEvents(container, state);
}

/**
 * Render an empty state when no data is available.
 * @param {HTMLElement} container - The view container element
 */
function renderEmptyState(container) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state__icon">📊</div>
      <h3 class="empty-state__title">Aucune donnée</h3>
      <p class="empty-state__description">
        Commencez par importer des données depuis l'onglet Import pour voir la matrice de compétences.
      </p>
      <button class="btn btn--primary" id="goto-import-btn">Aller à l'import</button>
    </div>
  `;

  container.querySelector('#goto-import-btn')?.addEventListener('click', () => {
    import('../state.js').then(m => m.emit('view:changed', 'import'));
  });
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
  for (const [, skills] of Object.entries(groupedSkills)) {
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
      html += `<th colspan="${skills.length}" style="text-align: center;">${escapeHtml(catName)}</th>`;
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
    <span class="sort-header" data-sort="appetences" style="cursor: pointer;">
      Appétences ${getSortIndicator('appetences')}
    </span>
  </th>`;

  const maxLen = state.settings?.skillNameMaxLength || 0;
  const threshold = state.settings?.criticalThreshold ?? 2;

  for (const skill of flatSkills) {
    const critical = isSkillCritical(state.members, skill, threshold);
    const displayName = maxLen > 0 && skill.length > maxLen
      ? skill.substring(0, maxLen - 1) + '…'
      : skill;
    html += `<th>
      <span class="sort-header" data-sort="skill:${skill}" style="cursor: pointer;" title="${escapeHtml(skill)}">
        ${escapeHtml(displayName)}
        ${critical ? ' <span style="color: #FCA5A5;" title="Compétence critique">⚠</span>' : ''}
        ${getSortIndicator('skill:' + skill)}
      </span>
    </th>`;
  }
  html += '</tr></thead>';

  // Body rows
  html += '<tbody>';
  for (const member of members) {
    html += '<tr>';
    html += `<td>
      <div class="member-name editable-cell" data-member-id="${member.id}" data-field="name">
        <div class="member-avatar">${getInitials(member.name)}</div>
        <div>
          <div>${escapeHtml(member.name)}</div>
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
    html += `<td>
      <div class="editable-cell editable-cell--chips" data-member-id="${member.id}" data-field="appetences">
        ${member.appetences
          ? member.appetences.split(',').map(a => a.trim()).filter(Boolean).map(a => `<span class="cell-chip cell-chip--appetence">${escapeHtml(a)}</span>`).join('')
          : '<span class="cell-chip cell-chip--empty">-</span>'
        }
      </div>
    </td>`;

    for (const skill of flatSkills) {
      const entry = member.skills[skill];
      const level = entry?.level ?? 0;
      const appetence = entry?.appetence ?? 0;
      const appetenceIcon = getAppetenceIcon(appetence);

      html += `<td>
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
    } else if (config.key === 'appetences') {
      va = a.appetences.toLowerCase();
      vb = b.appetences.toLowerCase();
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
  // Sort headers
  container.querySelectorAll('.sort-header').forEach(header => {
    header.addEventListener('click', () => {
      const key = header.dataset.sort;
      if (sortConfig.key === key) {
        sortConfig.ascending = !sortConfig.ascending;
      } else {
        sortConfig = { key, ascending: true };
      }
      renderMatrixView(container);
    });
  });

  // Skill cell click → inline edit
  container.querySelectorAll('.skill-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      openInlineEditor(cell, container);
    });
  });

  // Editable cells click → inline editors for name, role, appetences
  container.querySelectorAll('.editable-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      const field = cell.dataset.field;
      const memberId = cell.dataset.memberId;
      if (field === 'name') {
        openNameEditor(cell, memberId, container);
      } else if (field === 'role') {
        openChipEditor(cell, memberId, 'role', state, container);
      } else if (field === 'appetences') {
        openChipEditor(cell, memberId, 'appetences', state, container);
      }
    });
  });

  // Close editor on outside click
  document.addEventListener('click', closeActiveEditor);

  // Export buttons
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

  const commit = () => {
    const newName = input.value.trim();
    if (newName && newName !== member.name) {
      updateMember(memberId, { name: newName });
      renderMatrixView(viewContainer);
    }
    closeActiveEditor();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') closeActiveEditor();
  });
  input.addEventListener('blur', () => {
    // Small delay to allow click events inside editor
    setTimeout(commit, 100);
  });
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

  // Collect all known values across members for suggestions (same field)
  const allValues = new Set();
  for (const m of state.members) {
    (m[field] || '').split(',').forEach(v => {
      const trimmed = v.trim();
      if (trimmed) allValues.add(trimmed);
    });
  }
  // Suggestions = all known values not already selected
  const suggestions = [...allValues].sort((a, b) => a.localeCompare(b, 'fr'));

  // Cross-field suggestions: when editing role, suggest appetences and vice versa
  const crossField = field === 'role' ? 'appetences' : 'role';
  const crossValues = new Set();
  for (const m of state.members) {
    (m[crossField] || '').split(',').forEach(v => {
      const trimmed = v.trim();
      if (trimmed && !allValues.has(trimmed)) crossValues.add(trimmed);
    });
  }
  const crossSuggestions = [...crossValues].sort((a, b) => a.localeCompare(b, 'fr'));
  const crossLabel = field === 'role' ? 'Depuis appétences' : 'Depuis ownership';

  const editor = document.createElement('div');
  editor.className = 'inline-edit inline-edit--chips';

  const label = field === 'role' ? 'Ownership' : 'Appétences';

  const renderEditorContent = () => {
    const filteredCross = crossSuggestions.filter(s => !currentValues.includes(s));
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
      ${filteredCross.length > 0 ? `
        <div class="inline-edit__label inline-edit__label--cross" style="margin-top: 6px;">${crossLabel}</div>
        <div class="inline-edit__chip-list">
          ${filteredCross.map(s => `
            <span class="inline-edit__chip inline-edit__chip--cross" data-value="${escapeHtml(s)}">
              ↔ ${escapeHtml(s)}
            </span>
          `).join('')}
        </div>
      ` : ''}
      <div style="margin-top: 6px; display: flex; gap: 4px;">
        <input type="text" class="inline-edit__input" placeholder="Ajouter..." style="flex: 1;" />
        <button class="inline-edit__add-btn" title="Ajouter">+</button>
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

    // Add cross-field suggestion chip (from appetences/ownership)
    editor.querySelectorAll('.inline-edit__chip--cross').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = chip.dataset.value;
        if (!currentValues.includes(val)) currentValues.push(val);
        if (!allValues.has(val)) allValues.add(val);
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
