/**
 * Radar view - Multi-member skill profiles with Chart.js radar charts.
 * Supports up to 5 overlaid members, team average, category filter,
 * and critical skill indicators.
 */

import { getState } from '../state.js';
import { getCategorizedSkillNames, isSkillCritical, getSkillStats, getAllGroups } from '../models/data.js';
import { toastWarning, toastSuccess } from '../components/toast.js';
import {
  getInitials, escapeHtml, getSkillLabel, getAppetenceIcon, average,
  SKILL_LEVELS, APPETENCE_LEVELS, MEMBER_COLORS,
} from '../utils/helpers.js';
import { buildMatrixHash } from './matrix.js';

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

/** @type {string} Group filter - empty means all */
let groupFilter = '';

/** @type {boolean} Whether to show objectives overlay on the radar */
let showObjectives = true;

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

  const allSkills = getCategorizedSkillNames(state.members, state.categories);
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

  // Category & group options
  const catNames = Object.keys(categories).filter(c => categories[c].length > 0);
  const groups = getAllGroups(state.members);

  // Filter chips by group
  const visibleMembers = groupFilter
    ? state.members.filter(m => (m.groups || []).includes(groupFilter))
    : state.members;

  // Objectives data for the radar
  const objectives = state.objectives || {};
  const hasObjectives = radarSkills.some(s => objectives[s]?.minExperts);

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Profil Radar</h1>
        <p class="page-header__subtitle">Visualisation multi-profils et analyse des compétences</p>
      </div>
      <div class="page-header__actions">
        <button class="btn btn--secondary btn--sm" id="radar-export-png">📷 Export PNG</button>
      </div>
    </div>

    <!-- Controls: category + group + toggles -->
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

      ${groups.length > 0 ? `
        <span class="radar-controls__label" style="margin-left: var(--space-3);">Groupe :</span>
        <select class="form-select" id="radar-group-filter" style="max-width: 180px;">
          <option value="">Tous</option>
          ${groups.map(g => `
            <option value="${escapeHtml(g)}" ${groupFilter === g ? 'selected' : ''}>${escapeHtml(g)}</option>
          `).join('')}
        </select>
      ` : ''}

      <label class="radar-controls__toggle">
        <input type="checkbox" id="radar-team-avg" ${showTeamAverage ? 'checked' : ''}>
        <span>Moyenne équipe</span>
      </label>

      ${hasObjectives ? `
        <label class="radar-controls__toggle">
          <input type="checkbox" id="radar-objectives" ${showObjectives ? 'checked' : ''}>
          <span>Objectifs</span>
        </label>
      ` : ''}
    </div>

    <!-- Chips: member multi-select -->
    <div class="radar-chips" id="radar-chips">
      ${visibleMembers.map((m, _i) => {
        const selIndex = selectedMemberIds.indexOf(m.id);
        const isSelected = selIndex !== -1;
        const color = isSelected ? MEMBER_COLORS[selIndex % MEMBER_COLORS.length] : null;
        const firstGroup = (m.groups && m.groups.length > 0) ? m.groups[0] : '';
        return `
          <div class="radar-chip ${isSelected ? 'radar-chip--active' : ''}"
               data-member-id="${m.id}"
               ${color ? `style="border-color: ${color.point}; background: ${color.point};"` : ''}>
            ${isSelected ? `<span class="radar-chip__dot"></span>` : ''}
            ${escapeHtml(m.name)}
            ${firstGroup ? `<span class="radar-chip__group">${escapeHtml(firstGroup)}</span>` : ''}
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
          ${showObjectives && hasObjectives ? `
            <div class="radar-legend__item">
              <span class="radar-legend__color" style="background: transparent; border: 2px dashed #F59E0B;"></span>
              Objectif équipe
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
  drawRadarChart(selectedMembers, state.members, radarSkills, showTeamAverage, criticalSet, showObjectives ? objectives : {});
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
  const motivatedCount = skills.filter(([, e]) => e.appetence >= 2).length;
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

    <div class="radar-profile-stats">
      <div class="radar-profile-stat">
        <div class="radar-profile-stat__value" style="color: #6EE7B7;">${expertCount}</div>
        <div class="radar-profile-stat__label">Expert</div>
      </div>
      <div class="radar-profile-stat">
        <div class="radar-profile-stat__value" style="color: #93C5FD;">${confirmedCount}</div>
        <div class="radar-profile-stat__label">Confirmé</div>
      </div>
      <div class="radar-profile-stat">
        <div class="radar-profile-stat__value" style="color: #C4B5FD;">${motivatedCount}</div>
        <div class="radar-profile-stat__label">Motivé</div>
      </div>
      <div class="radar-profile-stat">
        <div class="radar-profile-stat__value" style="color: var(--color-primary-400);">${avgLevel}</div>
        <div class="radar-profile-stat__label">Score moyen</div>
      </div>
      <div class="radar-profile-stat">
        <div class="radar-profile-stat__value" style="color: ${criticalCovered === totalCritical ? '#6EE7B7' : '#FCA5A5'};">${criticalCovered}/${totalCritical}</div>
        <div class="radar-profile-stat__label">Critiques</div>
      </div>
    </div>

    <div class="member-profile__skills">
      ${skills.map(([name, entry]) => {
        const isCritical = criticalSet.has(name);
        return `
          <div class="member-skill-row">
            <span class="member-skill-row__status ${isCritical ? 'member-skill-row__status--critical' : 'member-skill-row__status--ok'}" title="${isCritical ? 'Critique' : 'OK'}"></span>
            <a class="member-skill-row__name action-card__link" href="${buildMatrixHash('default', { search: name })}">${escapeHtml(name)}</a>
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
 * Render brief visual insights when comparing multiple members.
 * Highlights: gaps, complementarity, strengths overlap, critical risks.
 * @param {Object[]} members - Selected members
 * @param {string[]} skills - All compared skills
 * @param {Set<string>} criticalSet - Critical skill names
 * @returns {string} HTML
 */
function renderCompareInsights(members, skills, criticalSet) {
  const tips = [];

  // 1. Gaps collectifs : skills ou personne n'a >= 3
  const teamGaps = skills.filter(s =>
    members.every(m => (m.skills[s]?.level ?? 0) < 3)
  );

  // 2. Forces communes : skills ou tout le monde a >= 3
  const sharedStrengths = skills.filter(s =>
    members.every(m => (m.skills[s]?.level ?? 0) >= 3)
  );

  // 3. Complementarite : un seul membre couvre (>= 3) une skill que les autres n'ont pas (< 2)
  const complementary = [];
  for (const s of skills) {
    const strong = members.filter(m => (m.skills[s]?.level ?? 0) >= 3);
    const weak = members.filter(m => (m.skills[s]?.level ?? 0) < 2);
    if (strong.length === 1 && weak.length >= members.length - 1) {
      complementary.push({ skill: s, member: strong[0].name });
    }
  }

  // 4. Critiques non couvertes par le sous-groupe
  const uncoveredCritical = [...criticalSet].filter(s =>
    members.every(m => (m.skills[s]?.level ?? 0) < 3)
  );

  // Build tips
  if (uncoveredCritical.length > 0) {
    tips.push({
      icon: '🚨',
      color: '#FEE2E2',
      border: '#FECACA',
      text: `<strong>${uncoveredCritical.length} critique${uncoveredCritical.length > 1 ? 's' : ''} non couvert${uncoveredCritical.length > 1 ? 'es' : 'e'}</strong> par ce groupe : ${uncoveredCritical.slice(0, 3).map(s => escapeHtml(s)).join(', ')}${uncoveredCritical.length > 3 ? '...' : ''}`,
    });
  }

  if (complementary.length > 0) {
    const items = complementary.slice(0, 3).map(c =>
      `<strong>${escapeHtml(c.member)}</strong> sur ${escapeHtml(c.skill)}`
    ).join(', ');
    tips.push({
      icon: '🧩',
      color: '#E0F2FE',
      border: '#BAE6FD',
      text: `Complementarite : ${items}${complementary.length > 3 ? '...' : ''}`,
    });
  }

  if (sharedStrengths.length > 0) {
    tips.push({
      icon: '💪',
      color: '#D1FAE5',
      border: '#A7F3D0',
      text: `${sharedStrengths.length} force${sharedStrengths.length > 1 ? 's' : ''} commune${sharedStrengths.length > 1 ? 's' : ''} : ${sharedStrengths.slice(0, 4).map(s => escapeHtml(s)).join(', ')}${sharedStrengths.length > 4 ? '...' : ''}`,
    });
  }

  if (teamGaps.length > 0) {
    tips.push({
      icon: '📉',
      color: '#FEF3C7',
      border: '#FDE68A',
      text: `${teamGaps.length} lacune${teamGaps.length > 1 ? 's' : ''} collective${teamGaps.length > 1 ? 's' : ''} : ${teamGaps.slice(0, 4).map(s => escapeHtml(s)).join(', ')}${teamGaps.length > 4 ? '...' : ''}`,
    });
  }

  if (tips.length === 0) return '';

  return `
    <div class="compare-insights" style="display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4);">
      ${tips.map(t => `
        <div style="display: flex; align-items: flex-start; gap: var(--space-2); padding: var(--space-2) var(--space-3); background: ${t.color}; border: 1px solid ${t.border}; border-radius: var(--radius-lg); font-size: var(--font-size-xs); line-height: 1.5;">
          <span style="flex-shrink: 0;">${t.icon}</span>
          <span>${t.text}</span>
        </div>
      `).join('')}
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

    ${renderCompareInsights(members, sortedSkills, criticalSet)}

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
                <td><a class="action-card__link" href="${buildMatrixHash('default', { search: skill })}">${escapeHtml(skill)}</a></td>
                ${members.map(m => {
                  const level = m.skills[skill]?.level ?? 0;
                  const appetence = m.skills[skill]?.appetence ?? 0;
                  const bg = SKILL_LEVELS[level]?.color || '#E2E8F0';
                  const textColor = SKILL_LEVELS[level]?.textColor || '#64748B';
                  const appIcon = getAppetenceIcon(appetence);
                  return `<td>
                    <span class="radar-compare-table__level" style="background: ${bg}; color: ${textColor};" title="${getSkillLabel(level)}${appetence > 0 ? ' · Appétence : ' + APPETENCE_LEVELS[appetence]?.label : ''}">
                      ${level}${appIcon ? `<span class="radar-compare-table__appetence">${appIcon}</span>` : ''}
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
 * @param {Object} [objectives={}] - Objectives map { skillName: { minExperts } }
 */
function drawRadarChart(selectedMembers, allMembers, skills, showAvg, criticalSet, objectives = {}) {
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

  // Optional objectives overlay
  const hasObjData = skills.some(s => objectives[s]?.minExperts);
  if (hasObjData) {
    // Translate minExperts into a radar level: we show the target as a level (capped at 4)
    // Logic: minExperts is "how many people at level 3+", so we display the target level itself (e.g. 3 = Confirmé)
    datasets.push({
      label: 'Objectif équipe',
      data: skills.map(s => {
        const obj = objectives[s];
        if (!obj?.minExperts) return 0;
        // Show as level 3 (Confirmé) — the minimum expected proficiency
        return 3;
      }),
      backgroundColor: 'rgba(245, 158, 11, 0.04)',
      borderColor: 'rgba(245, 158, 11, 0.5)',
      borderWidth: 2,
      borderDash: [4, 4],
      pointBackgroundColor: 'rgba(245, 158, 11, 0.6)',
      pointRadius: 2,
      pointStyle: 'dash',
      fill: false,
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

  // Group filter
  const groupSelect = container.querySelector('#radar-group-filter');
  groupSelect?.addEventListener('change', (e) => {
    groupFilter = e.target.value;
    renderRadarView(container);
  });

  // Team average toggle
  const avgCheckbox = container.querySelector('#radar-team-avg');
  avgCheckbox?.addEventListener('change', (e) => {
    showTeamAverage = e.target.checked;
    renderRadarView(container);
  });

  // Objectives toggle
  const objCheckbox = container.querySelector('#radar-objectives');
  objCheckbox?.addEventListener('change', (e) => {
    showObjectives = e.target.checked;
    renderRadarView(container);
  });

  // Export PNG
  container.querySelector('#radar-export-png')?.addEventListener('click', () => {
    const canvas = document.getElementById('radar-canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'profil-radar.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    toastSuccess('Image exportée.');
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
