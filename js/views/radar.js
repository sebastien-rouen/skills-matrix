/**
 * Radar view - Multi-member skill profiles with Chart.js radar charts.
 * Supports up to 5 overlaid members, team average, category filter,
 * and critical skill indicators.
 */

import { getState } from '../state.js';
import { getAllSkillNames, isSkillCritical, getSkillStats } from '../models/data.js';
import { toastWarning } from '../components/toast.js';
import {
  getInitials, escapeHtml, getSkillLabel, getAppetenceIcon, average,
  SKILL_LEVELS, APPETENCE_LEVELS, MEMBER_COLORS,
} from '../utils/helpers.js';

/** Max number of simultaneously selected members */
const MAX_SELECTED = 5;

/** Max skills displayed on the radar */
const MAX_RADAR_SKILLS = 12;

/** @type {Object|null} Active Chart.js instance */
let chartInstance = null;

/** @type {string[]} IDs of currently selected members (max 5) */
let selectedMemberIds = [];

/** @type {boolean} Whether to show the team average overlay */
let showTeamAverage = false;

/** @type {string} Category filter - empty means all */
let categoryFilter = '';

/** @type {{ key: string|null, ascending: boolean }} Compare table sort state */
let compareSort = { key: null, ascending: true };

/**
 * Render the radar view.
 * @param {HTMLElement} container - The view container element
 */
export function renderRadarView(container) {
  const state = getState();

  if (state.members.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🎯</div>
        <h3 class="empty-state__title">Aucune donnée</h3>
        <p class="empty-state__description">Importez des données pour voir les profils radar.</p>
      </div>
    `;
    return;
  }

  // Default to first member if none selected or stale
  if (selectedMemberIds.length === 0) {
    selectedMemberIds = [state.members[0].id];
  } else {
    // Remove stale IDs
    const validIds = new Set(state.members.map(m => m.id));
    selectedMemberIds = selectedMemberIds.filter(id => validIds.has(id));
    if (selectedMemberIds.length === 0) {
      selectedMemberIds = [state.members[0].id];
    }
  }

  const allSkills = getAllSkillNames(state.members);
  const categories = state.categories || {};
  const threshold = state.settings?.criticalThreshold ?? 2;

  // Filter skills by category
  let filteredSkills = allSkills;
  if (categoryFilter && categories[categoryFilter]) {
    const catSet = new Set(categories[categoryFilter]);
    filteredSkills = allSkills.filter(s => catSet.has(s));
  }

  // Limit to MAX_RADAR_SKILLS
  const radarSkills = filteredSkills.length > MAX_RADAR_SKILLS
    ? filteredSkills.slice(0, MAX_RADAR_SKILLS)
    : filteredSkills;

  // Pre-compute critical skill set
  const criticalSet = new Set();
  for (const skill of radarSkills) {
    if (isSkillCritical(state.members, skill, threshold)) {
      criticalSet.add(skill);
    }
  }

  // Resolve selected members
  const selectedMembers = selectedMemberIds
    .map(id => state.members.find(m => m.id === id))
    .filter(Boolean);

  // Category options
  const catNames = Object.keys(categories).filter(c => categories[c].length > 0);

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Profil Radar</h1>
        <p class="page-header__subtitle">Visualisation multi-profils et analyse des compétences</p>
      </div>
    </div>

    <!-- Controls: category + team average -->
    <div class="radar-controls" style="margin-bottom: var(--space-3);">
      ${catNames.length > 0 ? `
        <span class="radar-controls__label">Catégorie :</span>
        <select class="form-select" id="radar-category-filter" style="max-width: 220px;">
          <option value="">Toutes</option>
          ${catNames.map(c => `
            <option value="${escapeHtml(c)}" ${categoryFilter === c ? 'selected' : ''}>${escapeHtml(c)}</option>
          `).join('')}
        </select>
      ` : ''}

      <label style="display: inline-flex; align-items: center; gap: var(--space-2); margin-left: var(--space-4); cursor: pointer;">
        <input type="checkbox" id="radar-team-avg" ${showTeamAverage ? 'checked' : ''}>
        <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Moyenne équipe</span>
      </label>
    </div>

    <!-- Chips: member multi-select -->
    <div class="radar-chips" id="radar-chips">
      ${state.members.map((m, _i) => {
        const selIndex = selectedMemberIds.indexOf(m.id);
        const isSelected = selIndex !== -1;
        const color = isSelected ? MEMBER_COLORS[selIndex % MEMBER_COLORS.length] : null;
        return `
          <div class="radar-chip ${isSelected ? 'radar-chip--active' : ''}"
               data-member-id="${m.id}"
               ${color ? `style="border-color: ${color.point}; background: ${color.point};"` : ''}>
            ${isSelected ? `<span class="radar-chip__dot"></span>` : ''}
            ${escapeHtml(m.name)}
          </div>
        `;
      }).join('')}
    </div>

    <!-- Chart + Detail panel -->
    <div class="radar-chart-container">
      <div class="card">
        <div class="radar-chart-wrapper">
          <canvas id="radar-canvas"></canvas>
        </div>
        <!-- Legend -->
        <div class="radar-legend">
          ${selectedMembers.map((m, i) => {
            const color = MEMBER_COLORS[i % MEMBER_COLORS.length];
            return `
              <div class="radar-legend__item">
                <span class="radar-legend__color" style="background: ${color.point};"></span>
                ${escapeHtml(m.name)}
              </div>
            `;
          }).join('')}
          ${showTeamAverage ? `
            <div class="radar-legend__item">
              <span class="radar-legend__color" style="background: #94A3B8; border-style: dashed;"></span>
              Moyenne équipe
            </div>
          ` : ''}
          <div class="radar-legend__critical">⚠ = Compétence critique</div>
        </div>
      </div>

      <!-- Detail panel -->
      <div class="card member-profile" id="radar-detail-panel">
        ${selectedMembers.length === 1
          ? renderSingleProfile(selectedMembers[0], radarSkills, criticalSet)
          : renderCompareTable(selectedMembers, radarSkills, criticalSet)
        }
      </div>
    </div>
  `;

  bindRadarEvents(container, state);
  drawRadarChart(selectedMembers, state.members, radarSkills, showTeamAverage, criticalSet);
}

/**
 * Render a single member's detailed profile with criticality badges.
 * @param {Object} member - The selected member
 * @param {string[]} radarSkills - Skills shown on radar
 * @param {Set<string>} criticalSet - Set of critical skill names
 * @returns {string} HTML
 */
function renderSingleProfile(member, radarSkills, criticalSet) {
  const skills = Object.entries(member.skills).sort((a, b) => b[1].level - a[1].level);
  const expertCount = skills.filter(([, e]) => e.level === 4).length;
  const confirmedCount = skills.filter(([, e]) => e.level === 3).length;
  const avgLevel = skills.length > 0
    ? (skills.reduce((sum, [, e]) => sum + e.level, 0) / skills.length).toFixed(1)
    : '0';
  const criticalCovered = skills.filter(([name, e]) => criticalSet.has(name) && e.level >= 3).length;
  const totalCritical = [...criticalSet].filter(s => member.skills[s] !== undefined || radarSkills.includes(s)).length;

  return `
    <div class="member-profile__header">
      <div class="member-profile__avatar">${getInitials(member.name)}</div>
      <div>
        <div class="member-profile__name">${escapeHtml(member.name)}</div>
        <div class="member-profile__role">${escapeHtml(member.role)}</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-bottom: var(--space-6);">
      <div style="text-align: center; padding: var(--space-3); background: var(--color-bg-secondary); border-radius: var(--radius-lg);">
        <div style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: #6EE7B7;">
          ${expertCount}
        </div>
        <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">Expert</div>
      </div>
      <div style="text-align: center; padding: var(--space-3); background: var(--color-bg-secondary); border-radius: var(--radius-lg);">
        <div style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: #93C5FD;">
          ${confirmedCount}
        </div>
        <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">Confirmé</div>
      </div>
      <div style="text-align: center; padding: var(--space-3); background: var(--color-bg-secondary); border-radius: var(--radius-lg);">
        <div style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: var(--color-primary-700);">
          ${avgLevel}
        </div>
        <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">Score moyen</div>
      </div>
      <div style="text-align: center; padding: var(--space-3); background: var(--color-bg-secondary); border-radius: var(--radius-lg);">
        <div style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: ${criticalCovered === totalCritical ? '#6EE7B7' : '#FCA5A5'};">
          ${criticalCovered}/${totalCritical}
        </div>
        <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">Critiques couvertes</div>
      </div>
    </div>

    <div class="member-profile__skills">
      ${skills.map(([name, entry]) => {
        const isCritical = criticalSet.has(name);
        return `
          <div class="member-skill-row">
            <span class="member-skill-row__name">
              ${escapeHtml(name)}
              ${isCritical
                ? '<span class="badge badge--critical">Critique</span>'
                : '<span class="badge badge--success">OK</span>'
              }
            </span>
            <div class="member-skill-row__level">
              ${[1, 2, 3, 4].map(i => `
                <div class="member-skill-row__dot ${i <= entry.level ? 'member-skill-row__dot--filled' : ''}"
                     style="${i <= entry.level ? `background: ${SKILL_LEVELS[entry.level].color};` : ''}">
                </div>
              `).join('')}
            </div>
            <span class="member-skill-row__appetence">
              ${getAppetenceIcon(entry.appetence) || '-'}
            </span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Render a comparison table for multiple selected members.
 * @param {Object[]} members - Selected members (2+)
 * @param {string[]} radarSkills - Skills on the radar
 * @param {Set<string>} criticalSet - Set of critical skill names
 * @returns {string} HTML
 */
function renderCompareTable(members, radarSkills, criticalSet) {
  // Collect all skills across selected members
  const allSkillNames = new Set();
  for (const m of members) {
    for (const s of Object.keys(m.skills)) allSkillNames.add(s);
  }
  // Default sort: radar skills first, then alphabetically
  const radarSet = new Set(radarSkills);
  let sortedSkills = [...allSkillNames].sort((a, b) => {
    const aInRadar = radarSet.has(a);
    const bInRadar = radarSet.has(b);
    if (aInRadar && !bInRadar) return -1;
    if (!aInRadar && bInRadar) return 1;
    return a.localeCompare(b, 'fr');
  });

  // Apply sort if active
  if (compareSort.key) {
    sortedSkills = [...sortedSkills].sort((a, b) => {
      let va, vb;
      if (compareSort.key === 'skill') {
        va = a.toLowerCase();
        vb = b.toLowerCase();
      } else if (compareSort.key === 'critical') {
        va = criticalSet.has(a) ? 1 : 0;
        vb = criticalSet.has(b) ? 1 : 0;
      } else {
        // Sort by a specific member's level (key = member ID)
        const member = members.find(m => m.id === compareSort.key);
        va = member?.skills[a]?.level ?? 0;
        vb = member?.skills[b]?.level ?? 0;
      }
      if (va < vb) return compareSort.ascending ? -1 : 1;
      if (va > vb) return compareSort.ascending ? 1 : -1;
      return 0;
    });
  }

  /** Get sort arrow indicator */
  const sortArrow = (key) => {
    if (compareSort.key !== key) return '<span class="sort-indicator">⇅</span>';
    return `<span class="sort-indicator sort-indicator--active">${compareSort.ascending ? '↑' : '↓'}</span>`;
  };

  return `
    <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-4); font-size: var(--font-size-lg);">
      Comparaison (${members.length} membres)
    </div>
    <div style="overflow-x: auto;">
      <table class="radar-compare-table">
        <thead>
          <tr>
            <th>
              <span class="compare-sort-header" data-sort-key="skill" style="cursor: pointer;">
                Compétence ${sortArrow('skill')}
              </span>
            </th>
            ${members.map((m, i) => {
              const color = MEMBER_COLORS[i % MEMBER_COLORS.length];
              return `<th class="radar-compare-table__member-header">
                <span class="compare-sort-header" data-sort-key="${m.id}" style="cursor: pointer;">
                  <span class="radar-compare-table__color-dot" style="background: ${color.point};"></span>
                  ${escapeHtml(m.name)} ${sortArrow(m.id)}
                </span>
              </th>`;
            }).join('')}
            <th>
              <span class="compare-sort-header" data-sort-key="critical" style="cursor: pointer;">
                Criticité ${sortArrow('critical')}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          ${sortedSkills.map(skill => {
            const isCritical = criticalSet.has(skill);
            return `
              <tr>
                <td>${escapeHtml(skill)}</td>
                ${members.map(m => {
                  const level = m.skills[skill]?.level ?? 0;
                  const bg = SKILL_LEVELS[level]?.color || '#E2E8F0';
                  const textColor = SKILL_LEVELS[level]?.textColor || '#64748B';
                  return `<td>
                    <span class="radar-compare-table__level" style="background: ${bg}; color: ${textColor};" title="${getSkillLabel(level)}">
                      ${level}
                    </span>
                  </td>`;
                }).join('')}
                <td>
                  ${isCritical
                    ? '<span class="badge badge--critical">Critique</span>'
                    : '<span class="badge badge--success">OK</span>'
                  }
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Draw the Chart.js radar chart for selected members.
 * @param {Object[]} selectedMembers - Selected member objects
 * @param {Object[]} allMembers - All team members (for average)
 * @param {string[]} skills - Skills to display on the radar
 * @param {boolean} showAvg - Whether to show team average
 * @param {Set<string>} criticalSet - Critical skill names
 */
function drawRadarChart(selectedMembers, allMembers, skills, showAvg, criticalSet) {
  const canvas = document.getElementById('radar-canvas');
  if (!canvas) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  if (typeof Chart === 'undefined') {
    canvas.parentElement.innerHTML = '<p style="padding: var(--space-8); text-align: center; color: var(--color-text-secondary);">Chart.js non chargé. Vérifiez votre connexion internet.</p>';
    return;
  }

  if (skills.length === 0) {
    canvas.parentElement.innerHTML = '<p style="padding: var(--space-8); text-align: center; color: var(--color-text-secondary);">Aucune compétence à afficher.</p>';
    return;
  }

  // Build datasets: one per selected member
  const datasets = selectedMembers.map((member, i) => {
    const color = MEMBER_COLORS[i % MEMBER_COLORS.length];
    return {
      label: member.name,
      data: skills.map(s => member.skills[s]?.level ?? 0),
      backgroundColor: color.bg,
      borderColor: color.border,
      borderWidth: 2,
      pointBackgroundColor: color.point,
      pointRadius: 4,
    };
  });

  // Optional team average dataset
  if (showAvg) {
    datasets.push({
      label: 'Moyenne équipe',
      data: skills.map(s => {
        const levels = allMembers.map(m => m.skills[s]?.level ?? 0);
        return average(levels);
      }),
      backgroundColor: 'rgba(148, 163, 184, 0.08)',
      borderColor: 'rgba(148, 163, 184, 0.6)',
      borderWidth: 2,
      borderDash: [6, 4],
      pointBackgroundColor: '#94A3B8',
      pointRadius: 3,
    });
  }

  // Labels: append ⚠ for critical skills
  const labels = skills.map(s => {
    const display = s.length > 14 ? s.substring(0, 13) + '…' : s;
    return criticalSet.has(s) ? display + ' ⚠' : display;
  });

  // Point label colors: red for critical skills
  const pointLabelColors = skills.map(s =>
    criticalSet.has(s) ? '#EF4444' : '#334155'
  );

  const ctx = canvas.getContext('2d');

  chartInstance = new Chart(ctx, {
    type: 'radar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          min: 0,
          max: 4,
          ticks: {
            stepSize: 1,
            display: true,
            font: { size: 10 },
            color: '#94A3B8',
            backdropColor: 'transparent',
            callback: (value) => ['', 'Déb.', 'Int.', 'Conf.', 'Exp.'][value] || '',
          },
          grid: {
            color: 'rgba(203, 213, 225, 0.4)',
          },
          angleLines: {
            color: 'rgba(203, 213, 225, 0.3)',
          },
          pointLabels: {
            font: { size: 11, weight: '500' },
            color: pointLabelColors,
          },
        },
      },
      plugins: {
        legend: {
          display: false, // We use our custom legend
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw;
              if (context.dataset.borderDash) {
                return `${context.dataset.label}: ${Number(value).toFixed(1)}`;
              }
              return `${context.dataset.label}: ${getSkillLabel(Math.round(value))} (${Math.round(value)})`;
            },
          },
        },
      },
    },
  });
}

/**
 * Bind events for the radar view controls.
 * @param {HTMLElement} container - View container
 * @param {Object} state - Current state
 */
function bindRadarEvents(container, state) {
  // Category filter
  const catSelect = container.querySelector('#radar-category-filter');
  catSelect?.addEventListener('change', (e) => {
    categoryFilter = e.target.value;
    renderRadarView(container);
  });

  // Team average toggle
  const avgCheckbox = container.querySelector('#radar-team-avg');
  avgCheckbox?.addEventListener('change', (e) => {
    showTeamAverage = e.target.checked;
    renderRadarView(container);
  });

  // Compare table sort headers
  container.querySelectorAll('.compare-sort-header').forEach(header => {
    header.addEventListener('click', () => {
      const key = header.dataset.sortKey;
      if (compareSort.key === key) {
        compareSort.ascending = !compareSort.ascending;
      } else {
        compareSort = { key, ascending: true };
      }
      renderRadarView(container);
    });
  });

  // Chip clicks - toggle member selection
  container.querySelectorAll('.radar-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const memberId = chip.dataset.memberId;
      const idx = selectedMemberIds.indexOf(memberId);

      if (idx !== -1) {
        // Deselect - but keep at least 1
        if (selectedMemberIds.length > 1) {
          selectedMemberIds.splice(idx, 1);
        }
      } else {
        // Select - enforce max
        if (selectedMemberIds.length >= MAX_SELECTED) {
          toastWarning(`Maximum ${MAX_SELECTED} membres sélectionnés.`);
          return;
        }
        selectedMemberIds.push(memberId);
      }

      renderRadarView(container);
    });
  });
}

/**
 * Cleanup the radar chart instance (call before view change).
 */
export function destroyRadarChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}
