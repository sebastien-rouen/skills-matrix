/**
 * Advanced filters component.
 * Provides search, category, role, and level filtering.
 */

import { getState, updateFilters } from '../state.js';
import { getAllRoles } from '../models/data.js';
import { debounce } from '../utils/helpers.js';

/**
 * Render the filters bar into the given container.
 * @param {HTMLElement} container - The filters container element
 */
export function renderFilters(container) {
  const state = getState();
  const roles = getAllRoles(state.members);
  const categoryNames = Object.keys(state.categories);

  container.innerHTML = `
    <div class="filters-bar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-text-tertiary); flex-shrink: 0;">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
      <input
        type="text"
        class="filters-bar__search"
        id="filter-search"
        placeholder="Rechercher un membre ou une compétence..."
        value="${state.filters.search || ''}"
      />

      <div class="filters-bar__divider"></div>

      <select class="filters-bar__select" id="filter-category">
        <option value="">Toutes catégories</option>
        ${categoryNames.map(cat =>
          `<option value="${cat}" ${state.filters.category === cat ? 'selected' : ''}>${cat}</option>`
        ).join('')}
      </select>

      <div class="filters-bar__divider"></div>

      <select class="filters-bar__select" id="filter-role">
        <option value="">Tous ownerships</option>
        ${roles.map(role =>
          `<option value="${role}" ${state.filters.role === role ? 'selected' : ''}>${role}</option>`
        ).join('')}
      </select>

      <div class="filters-bar__divider"></div>

      <select class="filters-bar__select" id="filter-level">
        <option value="0" ${state.filters.minLevel === 0 ? 'selected' : ''}>Tous niveaux</option>
        <option value="1" ${state.filters.minLevel === 1 ? 'selected' : ''}>≥ Débutant</option>
        <option value="2" ${state.filters.minLevel === 2 ? 'selected' : ''}>≥ Intermédiaire</option>
        <option value="3" ${state.filters.minLevel === 3 ? 'selected' : ''}>≥ Confirmé</option>
        <option value="4" ${state.filters.minLevel === 4 ? 'selected' : ''}>Expert uniquement</option>
      </select>

      <div class="filters-bar__divider"></div>

      <label style="display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); color: var(--color-text-secondary); cursor: pointer; white-space: nowrap;">
        <input type="checkbox" id="filter-critical" ${state.filters.showCriticalOnly ? 'checked' : ''} />
        Critiques seuls
      </label>

      <button class="btn btn--ghost btn--sm" id="filter-reset" title="Réinitialiser les filtres">
        ✕
      </button>
    </div>
  `;

  bindFilterEvents(container);
}

/**
 * Bind change/input events to filter controls.
 * @param {HTMLElement} container - The filters container element
 */
function bindFilterEvents(container) {
  const searchInput = container.querySelector('#filter-search');
  const categorySelect = container.querySelector('#filter-category');
  const roleSelect = container.querySelector('#filter-role');
  const levelSelect = container.querySelector('#filter-level');
  const criticalCheckbox = container.querySelector('#filter-critical');
  const resetBtn = container.querySelector('#filter-reset');

  // Debounced search to avoid excessive re-renders
  const debouncedSearch = debounce((value) => {
    updateFilters({ search: value });
  }, 250);

  searchInput?.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });

  categorySelect?.addEventListener('change', (e) => {
    updateFilters({ category: e.target.value });
  });

  roleSelect?.addEventListener('change', (e) => {
    updateFilters({ role: e.target.value });
  });

  levelSelect?.addEventListener('change', (e) => {
    updateFilters({ minLevel: parseInt(e.target.value, 10) });
  });

  criticalCheckbox?.addEventListener('change', (e) => {
    updateFilters({ showCriticalOnly: e.target.checked });
  });

  resetBtn?.addEventListener('click', () => {
    updateFilters({
      search: '',
      category: '',
      role: '',
      minLevel: 0,
      showCriticalOnly: false,
    });
  });
}

/**
 * Apply filters to the members and skills list.
 * @param {Object[]} members - All members
 * @param {string[]} skillNames - All skill names
 * @param {Object} filters - Current filter settings
 * @param {Object} categories - Skill categories
 * @param {number} [criticalThreshold=2] - Minimum confirmed/expert count for critical filter
 * @returns {Object} { filteredMembers, filteredSkills }
 */
export function applyFilters(members, skillNames, filters, categories, criticalThreshold = 2) {
  let filteredMembers = [...members];
  let filteredSkills = [...skillNames];

  // Filter by search text (matches member name, role, or skill name)
  if (filters.search) {
    const query = filters.search.toLowerCase();
    filteredMembers = filteredMembers.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.role.toLowerCase().includes(query) ||
      Object.keys(m.skills).some(s => s.toLowerCase().includes(query))
    );
    filteredSkills = filteredSkills.filter(s => s.toLowerCase().includes(query));
    // If search matches only members, show all skills; if only skills, show all members
    if (filteredSkills.length === 0) filteredSkills = [...skillNames];
    if (filteredMembers.length === 0) filteredMembers = [...members];
  }

  // Filter by role
  if (filters.role) {
    filteredMembers = filteredMembers.filter(m => m.role === filters.role);
  }

  // Filter by category
  if (filters.category && categories[filters.category]) {
    filteredSkills = filteredSkills.filter(s =>
      categories[filters.category].includes(s)
    );
  }

  // Filter by critical skills (fewer than 2 confirmed/expert)
  if (filters.showCriticalOnly) {
    filteredSkills = filteredSkills.filter(skillName => {
      let confirmedOrExpert = 0;
      for (const member of members) {
        const level = member.skills[skillName]?.level ?? 0;
        if (level >= 3) confirmedOrExpert++;
      }
      return confirmedOrExpert < criticalThreshold;
    });
  }

  return { filteredMembers, filteredSkills };
}
