/**
 * Dashboard view - KPIs, criticality analysis, and training priorities.
 */

import { getState } from '../state.js';
import { getAllSkillNames, getAllGroups, getSkillStats, isSkillCritical } from '../models/data.js';
import { escapeHtml, average, getSkillLabel, SKILL_LEVELS } from '../utils/helpers.js';
import { getDemoScenarios } from '../services/demos.js';
import { renderOnboarding } from '../components/onboarding.js';

/**
 * Render the dashboard view.
 * @param {HTMLElement} container - The view container element
 */
export function renderDashboardView(container) {
  const state = getState();

  if (state.members.length === 0) {
    renderOnboarding(container);
    return;
  }

  const threshold = state.settings?.criticalThreshold ?? 2;
  const allSkills = getAllSkillNames(state.members);
  const criticalSkills = allSkills.filter(s => isSkillCritical(state.members, s, threshold));
  const avgCoverage = average(allSkills.map(s => getSkillStats(state.members, s).coverage));
  const trainingPriorities = computeTrainingPriorities(state.members, allSkills, threshold);

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Dashboard</h1>
        <p class="page-header__subtitle">Vue d'ensemble des compétences de l'équipe</p>
      </div>
    </div>

    <!-- KPI Cards -->
    ${renderKpiCards(state.members, allSkills, criticalSkills, avgCoverage, state.categories, threshold, getAllGroups(state.members))}

    <!-- Contextual Advice (when a demo is loaded) -->
    ${renderDemoAdvice(state)}

    <!-- Team Overview Rings -->
    ${renderTeamOverview(state.members, allSkills, criticalSkills)}

    <div class="dashboard-grid">
      <!-- Alerts -->
      <div class="card">
        <div class="card__header">
          <h3 class="card__title">Alertes</h3>
          <span class="badge ${criticalSkills.length > 0 ? 'badge--critical' : 'badge--success'}">
            ${criticalSkills.length > 0 ? criticalSkills.length + ' alerte(s)' : 'Aucune alerte'}
          </span>
        </div>
        <div class="alerts-list">
          ${renderAlerts(state.members, allSkills, threshold)}
        </div>
      </div>

      <!-- Training Priorities -->
      <div class="card">
        <div class="card__header">
          <h3 class="card__title">Priorités de formation</h3>
        </div>
        ${renderTrainingTable(trainingPriorities)}
      </div>
    </div>

    <!-- Top Experts -->
    <div class="card" style="margin-top: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Top experts</h3>
        <span class="badge badge--info">Classement</span>
      </div>
      ${renderTopExperts(state.members)}
    </div>

    <!-- Development & Mentoring -->
    ${renderDevelopmentSection(state.members, allSkills)}

    <!-- Criticality Breakdown -->
    <div class="card" style="margin-top: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Répartition par compétence</h3>
        <div class="legend" style="margin: 0;">
          ${SKILL_LEVELS.map(l => `
            <div class="legend__item">
              <div class="legend__color" style="background: ${l.color};"></div>
              <span>${l.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="criticality-list">
        ${renderCriticalityBars(state.members, allSkills, threshold)}
      </div>
    </div>
  `;
}

/**
 * Render the KPI cards with detailed hover popins.
 * @param {Object[]} members - All members
 * @param {string[]} allSkills - All skill names
 * @param {string[]} criticalSkills - Critical skill names
 * @param {number} avgCoverage - Average coverage percentage
 * @param {Object} categories - Skill categories
 * @param {number} threshold - Critical threshold
 * @param {string[]} groups - All group names
 * @returns {string} KPI grid HTML
 */
function renderKpiCards(members, allSkills, criticalSkills, avgCoverage, categories, threshold, groups) {
  // --- Membres popin data ---
  const roleCounts = {};
  for (const m of members) {
    const role = m.role || 'Non défini';
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }
  const roleRows = Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([role, count]) =>
      `<div class="dashboard-popin__row"><span class="dashboard-popin__row-label">${escapeHtml(role)}</span><span class="dashboard-popin__row-value">${count}</span></div>`
    ).join('');
  const avgSkillsPerMember = members.length > 0
    ? Math.round(members.reduce((sum, m) => sum + Object.keys(m.skills).length, 0) / members.length)
    : 0;

  // --- Compétences popin data ---
  const catEntries = Object.entries(categories);
  const categorized = new Set();
  for (const [, skills] of catEntries) {
    for (const s of skills) categorized.add(s);
  }
  const uncategorizedCount = allSkills.filter(s => !categorized.has(s)).length;
  const catRows = catEntries
    .map(([name, skills]) => {
      const count = skills.filter(s => allSkills.includes(s)).length;
      return { name, count };
    })
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(c =>
      `<div class="dashboard-popin__row"><span class="dashboard-popin__row-label">${escapeHtml(c.name)}</span><span class="dashboard-popin__row-value">${c.count}</span></div>`
    ).join('');

  // --- Couverture popin data ---
  const skillCoverages = allSkills.map(s => ({ name: s, coverage: getSkillStats(members, s).coverage }));
  const bestCovered = [...skillCoverages].sort((a, b) => b.coverage - a.coverage).slice(0, 3);
  const worstCovered = [...skillCoverages].sort((a, b) => a.coverage - b.coverage).slice(0, 3);

  // --- Critiques popin data ---
  const criticalList = criticalSkills.slice(0, 6);

  return `
    <div class="kpi-grid">
      <div class="kpi-card dashboard-popin">
        <div class="kpi-card__icon kpi-card__icon--blue">👥</div>
        <div>
          <div class="kpi-card__value">${members.length}</div>
          <div class="kpi-card__label">Membres</div>
        </div>
        <div class="dashboard-popin__content">
          <div class="dashboard-popin__title">Composition de l'equipe</div>
          <div class="dashboard-popin__desc">Répartition par ownership</div>
          <div class="dashboard-popin__list">${roleRows}</div>
          <div class="dashboard-popin__divider"></div>
          <div class="dashboard-popin__highlight dashboard-popin__highlight--info">
            ~${avgSkillsPerMember} compétences renseignées par membre en moyenne
          </div>
        </div>
      </div>

      <div class="kpi-card dashboard-popin">
        <div class="kpi-card__icon kpi-card__icon--green">🎯</div>
        <div>
          <div class="kpi-card__value">${allSkills.length}</div>
          <div class="kpi-card__label">Compétences suivies</div>
        </div>
        <div class="dashboard-popin__content">
          <div class="dashboard-popin__title">Répartition par catégorie</div>
          <div class="dashboard-popin__list">${catRows}</div>
          ${uncategorizedCount > 0 ? `
            <div class="dashboard-popin__row"><span class="dashboard-popin__row-label" style="font-style: italic;">Non catégorisées</span><span class="dashboard-popin__row-value">${uncategorizedCount}</span></div>
          ` : ''}
          ${catEntries.length === 0 ? `
            <div class="dashboard-popin__highlight dashboard-popin__highlight--warning">
              Aucune catégorie définie - configurez-les dans Paramètres
            </div>
          ` : ''}
        </div>
      </div>

      <div class="kpi-card dashboard-popin">
        <div class="kpi-card__icon kpi-card__icon--orange">📊</div>
        <div>
          <div class="kpi-card__value">${avgCoverage.toFixed(0)}%</div>
          <div class="kpi-card__label">Couverture moyenne</div>
        </div>
        <div class="dashboard-popin__content">
          <div class="dashboard-popin__title">Couverture des compétences</div>
          <div class="dashboard-popin__desc">% de membres ayant au moins le niveau Débutant</div>
          <div class="dashboard-popin__list">
            ${bestCovered.map(s =>
              `<div class="dashboard-popin__row"><span class="dashboard-popin__row-label">${escapeHtml(s.name)}</span><span class="dashboard-popin__row-value" style="color: var(--color-success);">${s.coverage.toFixed(0)}%</span></div>`
            ).join('')}
          </div>
          ${worstCovered.length > 0 && worstCovered[0].coverage < 100 ? `
            <div class="dashboard-popin__divider"></div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--space-1);">Moins couvertes :</div>
            <div class="dashboard-popin__list">
              ${worstCovered.map(s =>
                `<div class="dashboard-popin__row"><span class="dashboard-popin__row-label">${escapeHtml(s.name)}</span><span class="dashboard-popin__row-value" style="color: #D97706;">${s.coverage.toFixed(0)}%</span></div>`
              ).join('')}
            </div>
          ` : ''}
        </div>
      </div>

      <div class="kpi-card dashboard-popin">
        <div class="kpi-card__icon kpi-card__icon--red">⚠</div>
        <div>
          <div class="kpi-card__value">${criticalSkills.length}</div>
          <div class="kpi-card__label">Compétences critiques</div>
        </div>
        <div class="dashboard-popin__content">
          <div class="dashboard-popin__title">Compétences critiques</div>
          <div class="dashboard-popin__desc">Moins de ${threshold} Confirmé(s)/Expert(s)</div>
          ${criticalList.length > 0 ? `
            <div class="dashboard-popin__list">
              ${criticalList.map(s => {
                const stats = getSkillStats(members, s);
                const ce = stats.levels[3] + stats.levels[4];
                return `<div class="dashboard-popin__row">
                  <span class="dashboard-popin__row-label">${escapeHtml(s)}</span>
                  <span class="dashboard-popin__row-value" style="color: ${ce === 0 ? '#DC2626' : '#D97706'};">${ce === 0 ? 'Aucun' : ce + ' pers.'}</span>
                </div>`;
              }).join('')}
            </div>
            ${criticalSkills.length > 6 ? `<div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: var(--space-2);">+ ${criticalSkills.length - 6} autre(s)…</div>` : ''}
          ` : `
            <div class="dashboard-popin__highlight dashboard-popin__highlight--success">
              Toutes les compétences sont couvertes
            </div>
          `}
        </div>
      </div>

      ${renderScoreKpi(members)}

      ${renderBusFactorKpi(members, allSkills)}

      ${groups.length > 0 ? renderGroupsKpi(members, groups) : ''}
    </div>
  `;
}

/**
 * Render the Score Moyen KPI card.
 * Shows global average skill level (0-4).
 */
function renderScoreKpi(members) {
  let totalLevel = 0;
  let count = 0;
  const memberScores = [];

  for (const m of members) {
    const entries = Object.values(m.skills);
    if (entries.length === 0) continue;
    const avg = entries.reduce((s, e) => s + e.level, 0) / entries.length;
    memberScores.push({ name: m.name, avg });
    totalLevel += entries.reduce((s, e) => s + e.level, 0);
    count += entries.length;
  }

  const globalAvg = count > 0 ? (totalLevel / count) : 0;
  const topMembers = [...memberScores].sort((a, b) => b.avg - a.avg).slice(0, 4);
  const bottomMembers = [...memberScores].sort((a, b) => a.avg - b.avg).slice(0, 3);
  const avgColor = globalAvg >= 3 ? '#10B981' : globalAvg >= 2 ? '#3B82F6' : '#F59E0B';

  return `
    <div class="kpi-card dashboard-popin">
      <div class="kpi-card__icon" style="background: ${avgColor}22; color: ${avgColor};">📈</div>
      <div>
        <div class="kpi-card__value">${globalAvg.toFixed(1)}<span style="font-size: var(--font-size-sm); color: var(--color-text-tertiary);">/4</span></div>
        <div class="kpi-card__label">Score moyen</div>
      </div>
      <div class="dashboard-popin__content">
        <div class="dashboard-popin__title">Niveau moyen global</div>
        <div class="dashboard-popin__desc">Moyenne de toutes les evaluations membre x competence</div>
        ${topMembers.length > 0 ? `
          <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--space-1);">Meilleurs scores :</div>
          <div class="dashboard-popin__list">
            ${topMembers.map(m => `
              <div class="dashboard-popin__row">
                <span class="dashboard-popin__row-label">${escapeHtml(m.name)}</span>
                <span class="dashboard-popin__row-value" style="color: var(--color-success);">${m.avg.toFixed(1)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${bottomMembers.length > 0 && bottomMembers[0].avg < globalAvg ? `
          <div class="dashboard-popin__divider"></div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--space-1);">A accompagner :</div>
          <div class="dashboard-popin__list">
            ${bottomMembers.map(m => `
              <div class="dashboard-popin__row">
                <span class="dashboard-popin__row-label">${escapeHtml(m.name)}</span>
                <span class="dashboard-popin__row-value" style="color: #D97706;">${m.avg.toFixed(1)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Render the Bus Factor KPI card.
 * Skills where only 1 person is Confirmed or Expert = single point of failure.
 */
function renderBusFactorKpi(members, allSkills) {
  const singlePoints = [];
  for (const skill of allSkills) {
    const stats = getSkillStats(members, skill);
    const ce = stats.levels[3] + stats.levels[4];
    if (ce === 1) {
      const holder = members.find(m => (m.skills[skill]?.level ?? 0) >= 3);
      singlePoints.push({ skill, holder: holder?.name || '?' });
    }
  }

  const riskColor = singlePoints.length > 3 ? '#DC2626' : singlePoints.length > 0 ? '#F59E0B' : '#10B981';

  return `
    <div class="kpi-card dashboard-popin">
      <div class="kpi-card__icon" style="background: ${riskColor}22; color: ${riskColor};">🚌</div>
      <div>
        <div class="kpi-card__value">${singlePoints.length}</div>
        <div class="kpi-card__label">Bus Factor</div>
      </div>
      <div class="dashboard-popin__content">
        <div class="dashboard-popin__title">Single Point of Failure</div>
        <div class="dashboard-popin__desc">Competences avec exactement 1 seul Confirme/Expert</div>
        ${singlePoints.length > 0 ? `
          <div class="dashboard-popin__list">
            ${singlePoints.slice(0, 6).map(sp => `
              <div class="dashboard-popin__row">
                <span class="dashboard-popin__row-label">${escapeHtml(sp.skill)}</span>
                <span class="dashboard-popin__row-value">${escapeHtml(sp.holder)}</span>
              </div>
            `).join('')}
          </div>
          ${singlePoints.length > 6 ? `<div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: var(--space-2);">+ ${singlePoints.length - 6} autre(s)…</div>` : ''}
          <div class="dashboard-popin__divider"></div>
          <div class="dashboard-popin__highlight dashboard-popin__highlight--warning">
            Si cette personne part, la competence est perdue
          </div>
        ` : `
          <div class="dashboard-popin__highlight dashboard-popin__highlight--success">
            Aucun risque de dependance individuelle
          </div>
        `}
      </div>
    </div>
  `;
}

/**
 * Render the Groups KPI card.
 * Shows number of groups with member distribution.
 */
function renderGroupsKpi(members, groups) {
  const groupCounts = {};
  for (const g of groups) {
    groupCounts[g] = members.filter(m => (m.groups || []).includes(g)).length;
  }
  const sortedGroups = Object.entries(groupCounts).sort((a, b) => b[1] - a[1]);
  const avgPerGroup = groups.length > 0
    ? (sortedGroups.reduce((s, [, c]) => s + c, 0) / groups.length).toFixed(1)
    : 0;
  const membersWithGroup = members.filter(m => (m.groups || []).length > 0).length;

  return `
    <div class="kpi-card dashboard-popin">
      <div class="kpi-card__icon" style="background: #E0E7FF; color: #4338CA;">🏷</div>
      <div>
        <div class="kpi-card__value">${groups.length}</div>
        <div class="kpi-card__label">Groupes</div>
      </div>
      <div class="dashboard-popin__content">
        <div class="dashboard-popin__title">Repartition par groupe</div>
        <div class="dashboard-popin__desc">${membersWithGroup}/${members.length} membre(s) dans au moins un groupe</div>
        <div class="dashboard-popin__list">
          ${sortedGroups.slice(0, 6).map(([name, count]) => `
            <div class="dashboard-popin__row">
              <span class="dashboard-popin__row-label">${escapeHtml(name)}</span>
              <span class="dashboard-popin__row-value">${count} pers.</span>
            </div>
          `).join('')}
        </div>
        ${groups.length > 6 ? `<div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: var(--space-2);">+ ${groups.length - 6} autre(s)…</div>` : ''}
        <div class="dashboard-popin__divider"></div>
        <div class="dashboard-popin__highlight dashboard-popin__highlight--info">
          ~${avgPerGroup} membre(s) par groupe en moyenne
        </div>
      </div>
    </div>
  `;
}

/**
 * Render alert items for critical skills and low-appetence risks.
 * Grouped by severity with visual hierarchy.
 * @param {Object[]} members - All members
 * @param {string[]} skills - All skill names
 * @param {number} [threshold=2] - Critical threshold
 * @returns {string} Alerts HTML
 */
function renderAlerts(members, skills, threshold = 2) {
  const criticals = [];
  const warnings = [];
  const infos = [];

  for (const skill of skills) {
    const stats = getSkillStats(members, skill);
    const confirmedOrExpert = stats.levels[3] + stats.levels[4];
    const bestLevel = stats.levels[4] > 0 ? 4 : stats.levels[3] > 0 ? 3 : stats.levels[2] > 0 ? 2 : stats.levels[1] > 0 ? 1 : 0;

    if (confirmedOrExpert < threshold) {
      const entry = {
        skill,
        confirmedOrExpert,
        bestLevel,
        coverage: stats.coverage,
        highApp: stats.highAppetenceCount,
      };
      if (confirmedOrExpert === 0) criticals.push(entry);
      else warnings.push(entry);
    }

    if (stats.highAppetenceCount === 0 && stats.levels.slice(1).some(c => c > 0)) {
      infos.push({ skill, avgLevel: stats.avgLevel, coverage: stats.coverage });
    }
  }

  if (criticals.length === 0 && warnings.length === 0 && infos.length === 0) {
    return `
      <div class="alerts-empty">
        <div class="alerts-empty__icon">✅</div>
        <div class="alerts-empty__text">Aucune alerte - toutes les compétences sont bien couvertes.</div>
      </div>
    `;
  }

  let html = '';

  // Critical alerts
  if (criticals.length > 0) {
    html += `
      <div class="alert-group alert-group--critical">
        <div class="alert-group__header">
          <span class="alert-group__icon">🔴</span>
          <span class="alert-group__title">Critique</span>
          <span class="alert-group__count">${criticals.length}</span>
        </div>
        <div class="alert-group__desc">Aucun Confirmé ou Expert - couverture à risque immédiat</div>
        <div class="alert-group__items">
          ${criticals.slice(0, 5).map(a => `
            <div class="alert-card alert-card--critical">
              <div class="alert-card__header">
                <span class="alert-card__skill">${escapeHtml(a.skill)}</span>
                <span class="alert-card__badge badge badge--critical">0 expert</span>
              </div>
              <div class="alert-card__meta">
                Meilleur niveau : <strong>${getSkillLabel(a.bestLevel)}</strong> · Couverture : ${a.coverage.toFixed(0)}%
                ${a.highApp > 0 ? ` · ${a.highApp} appétence(s) forte(s)` : ''}
              </div>
              <div class="alert-card__bar">
                <div class="alert-card__bar-fill alert-card__bar-fill--critical" style="width: ${a.coverage.toFixed(0)}%;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Warning alerts
  if (warnings.length > 0) {
    html += `
      <div class="alert-group alert-group--warning">
        <div class="alert-group__header">
          <span class="alert-group__icon">🟠</span>
          <span class="alert-group__title">Attention</span>
          <span class="alert-group__count">${warnings.length}</span>
        </div>
        <div class="alert-group__desc">Couverture fragile - moins de ${threshold} Confirmé(s)/Expert(s)</div>
        <div class="alert-group__items">
          ${warnings.slice(0, 5).map(a => `
            <div class="alert-card alert-card--warning">
              <div class="alert-card__header">
                <span class="alert-card__skill">${escapeHtml(a.skill)}</span>
                <span class="alert-card__badge badge badge--warning">${a.confirmedOrExpert} pers.</span>
              </div>
              <div class="alert-card__meta">
                Meilleur niveau : <strong>${getSkillLabel(a.bestLevel)}</strong> · Couverture : ${a.coverage.toFixed(0)}%
              </div>
              <div class="alert-card__bar">
                <div class="alert-card__bar-fill alert-card__bar-fill--warning" style="width: ${a.coverage.toFixed(0)}%;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Info alerts
  if (infos.length > 0) {
    html += `
      <div class="alert-group alert-group--info">
        <div class="alert-group__header">
          <span class="alert-group__icon">💡</span>
          <span class="alert-group__title">Risque appétence</span>
          <span class="alert-group__count">${infos.length}</span>
        </div>
        <div class="alert-group__desc">Aucune appétence forte - risque de perte de compétence</div>
        <div class="alert-group__items">
          ${infos.slice(0, 4).map(a => {
            const pct = (a.avgLevel / 4) * 100;
            return `
            <div class="alert-card alert-card--info">
              <div class="alert-card__header">
                <span class="alert-card__skill">${escapeHtml(a.skill)}</span>
                <span class="alert-card__badge badge badge--info">Couv. ${a.coverage.toFixed(0)}%</span>
              </div>
              <div class="alert-card__level-gauge">
                <span class="alert-card__level-label">Niveau moy.</span>
                <div class="alert-card__level-track">
                  <div class="alert-card__level-fill" style="width: ${pct.toFixed(0)}%;"></div>
                  <span class="alert-card__level-value">${a.avgLevel.toFixed(1)}</span>
                </div>
                <span class="alert-card__level-max">/4</span>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  return html;
}

/**
 * Render criticality breakdown bars for each skill.
 * @param {Object[]} members - All members
 * @param {string[]} skills - All skill names
 * @param {number} [threshold=2] - Critical threshold
 * @returns {string} HTML bars
 */
function renderCriticalityBars(members, skills, threshold = 2) {
  if (skills.length === 0) return '<p style="color: var(--color-text-secondary);">Aucune compétence.</p>';

  return skills.map(skill => {
    const stats = getSkillStats(members, skill);
    const critical = isSkillCritical(members, skill, threshold);
    const total = members.length;

    const segments = SKILL_LEVELS.map((l, i) => {
      const count = stats.levels[i];
      const pct = total > 0 ? (count / total) * 100 : 0;
      if (pct === 0) return '';
      const cssClass = ['none', 'beginner', 'intermediate', 'confirmed', 'expert'][i];
      return `<div class="criticality-item__segment criticality-item__segment--${cssClass}" style="width: ${pct}%;" title="${count} ${l.label}">${count > 0 ? count : ''}</div>`;
    }).join('');

    return `
      <div class="criticality-item">
        <span class="criticality-item__name">${escapeHtml(skill)}</span>
        <div class="criticality-item__bar">${segments}</div>
        ${critical
          ? '<span class="criticality-item__badge badge badge--critical">Critique</span>'
          : '<span class="criticality-item__badge badge badge--success">OK</span>'
        }
      </div>
    `;
  }).join('');
}

/**
 * Compute training priorities based on skill gaps and appetence.
 * @param {Object[]} members - All members
 * @param {string[]} skills - All skill names
 * @param {number} [threshold=2] - Critical threshold
 * @returns {Object[]} Sorted training priorities
 */
function computeTrainingPriorities(members, skills, threshold = 2) {
  const priorities = [];

  for (const skill of skills) {
    const stats = getSkillStats(members, skill);
    const confirmedOrExpert = stats.levels[3] + stats.levels[4];
    const hasGap = confirmedOrExpert < threshold;

    if (!hasGap) continue;

    // Find members who would benefit from training (low skill + high appetence)
    const candidates = members.filter(m => {
      const entry = m.skills[skill];
      return entry && entry.level < 3 && entry.appetence >= 2;
    });

    const urgency = confirmedOrExpert === 0 ? 'high' : 'medium';

    priorities.push({
      skill,
      urgency,
      confirmedOrExpert,
      candidates: candidates.map(c => c.name),
      avgLevel: stats.avgLevel,
      highAppetence: stats.highAppetenceCount,
    });
  }

  // Sort: high urgency first, then by candidate count
  priorities.sort((a, b) => {
    if (a.urgency === 'high' && b.urgency !== 'high') return -1;
    if (b.urgency === 'high' && a.urgency !== 'high') return 1;
    return b.candidates.length - a.candidates.length;
  });

  return priorities.slice(0, 10);
}

/**
 * Render the training priorities as cards with visual gauges.
 * @param {Object[]} priorities - Computed training priorities
 * @returns {string} Cards HTML
 */
function renderTrainingTable(priorities) {
  if (priorities.length === 0) {
    return '<p style="padding: var(--space-4); color: var(--color-text-secondary); text-align: center;">Aucune priorité de formation - couverture suffisante.</p>';
  }

  return `
    <div class="training-list">
      ${priorities.map(p => {
        const urgClass = p.urgency === 'high' ? 'critical' : 'warning';
        const urgLabel = p.urgency === 'high' ? 'Urgente' : 'Moyenne';
        // Expert gauge: dots out of a small scale (e.g. 4 dots)
        const maxDots = 4;
        const filledDots = Math.min(p.confirmedOrExpert, maxDots);

        return `
        <div class="training-card training-card--${urgClass}">
          <div class="training-card__left">
            <div class="training-card__urgency training-card__urgency--${urgClass}">${urgLabel}</div>
          </div>
          <div class="training-card__body">
            <div class="training-card__header">
              <span class="training-card__skill">${escapeHtml(p.skill)}</span>
              <div class="training-card__expert-gauge" title="${p.confirmedOrExpert} Confirmé(s)/Expert(s)">
                ${Array.from({ length: maxDots }, (_, i) =>
                  `<span class="training-card__dot ${i < filledDots ? 'training-card__dot--filled' : ''}"></span>`
                ).join('')}
                <span class="training-card__expert-count">${p.confirmedOrExpert}</span>
              </div>
            </div>
            ${p.candidates.length > 0 ? `
              <div class="training-card__candidates">
                <span class="training-card__candidates-label">Candidats :</span>
                ${p.candidates.map(c => {
                  const ini = c.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                  return `<span class="training-card__candidate"><span class="training-card__candidate-avatar">${ini}</span>${escapeHtml(c)}</span>`;
                }).join('')}
              </div>
            ` : `
              <div class="training-card__no-candidate">Aucun candidat motivé identifié</div>
            `}
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}

/**
 * Render team overview with circular progress rings and hover popins.
 * @param {Object[]} members - All members
 * @param {string[]} allSkills - All skill names
 * @param {string[]} criticalSkills - Critical skill names
 * @returns {string} HTML for the team overview section
 */
function renderTeamOverview(members, allSkills, criticalSkills) {
  const avgCoverage = average(allSkills.map(s => getSkillStats(members, s).coverage));
  const healthPct = allSkills.length > 0
    ? Math.round(((allSkills.length - criticalSkills.length) / allSkills.length) * 100)
    : 100;

  // Level distribution across all skills and members
  let totalEntries = 0;
  let expertCount = 0;
  let confirmedCount = 0;
  let beginnerCount = 0;
  let intermediateCount = 0;
  let noneCount = 0;
  for (const member of members) {
    for (const entry of Object.values(member.skills)) {
      totalEntries++;
      if (entry.level === 0) noneCount++;
      if (entry.level === 1) beginnerCount++;
      if (entry.level === 2) intermediateCount++;
      if (entry.level === 3) confirmedCount++;
      if (entry.level === 4) expertCount++;
    }
  }
  const confirmedPlusPct = totalEntries > 0 ? Math.round(((confirmedCount + expertCount) / totalEntries) * 100) : 0;

  // Appetence engagement
  let highAppCount = 0;
  let lowAppCount = 0;
  let medAppCount = 0;
  for (const member of members) {
    for (const entry of Object.values(member.skills)) {
      if (entry.appetence >= 3) highAppCount++;
      else if (entry.appetence === 2) medAppCount++;
      else lowAppCount++;
    }
  }
  const appetencePct = totalEntries > 0 ? Math.round(((highAppCount + medAppCount) / totalEntries) * 100) : 0;

  const nonCritical = allSkills.length - criticalSkills.length;

  return `
    <div class="team-overview">
      ${renderRingCard(healthPct, '#10B981', 'Santé équipe', '%', `
        <div class="dashboard-popin__title">Santé de l'équipe</div>
        <div class="dashboard-popin__desc">Ratio de compétences non-critiques sur le total.</div>
        <div class="dashboard-popin__list">
          <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Compétences saines</span><span class="dashboard-popin__row-value" style="color: var(--color-success);">${nonCritical}</span></div>
          <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Compétences critiques</span><span class="dashboard-popin__row-value" style="color: #DC2626;">${criticalSkills.length}</span></div>
          <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Total</span><span class="dashboard-popin__row-value">${allSkills.length}</span></div>
        </div>
        <div class="dashboard-popin__divider"></div>
        <div class="dashboard-popin__highlight ${healthPct >= 80 ? 'dashboard-popin__highlight--success' : healthPct >= 50 ? 'dashboard-popin__highlight--warning' : 'dashboard-popin__highlight--warning'}">
          ${healthPct >= 80 ? 'Bonne santé globale' : healthPct >= 50 ? 'Quelques points d\'attention' : 'Situation préoccupante - actions requises'}
        </div>
      `)}

      ${renderRingCard(Math.round(avgCoverage), '#3B82F6', 'Couverture', '%', `
        <div class="dashboard-popin__title">Couverture moyenne</div>
        <div class="dashboard-popin__desc">% moyen de membres ayant au moins le niveau Débutant par compétence.</div>
        <div class="dashboard-popin__list">
          <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Entrées renseignées (≥1)</span><span class="dashboard-popin__row-value">${totalEntries - noneCount}</span></div>
          <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Entrées vides (0)</span><span class="dashboard-popin__row-value">${noneCount}</span></div>
          <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Total des entrées</span><span class="dashboard-popin__row-value">${totalEntries}</span></div>
        </div>
        <div class="dashboard-popin__divider"></div>
        <div class="dashboard-popin__highlight dashboard-popin__highlight--info">
          ${members.length} membres × ${allSkills.length} compétences
        </div>
      `)}

      ${renderRingCard(confirmedPlusPct, '#6366F1', 'Confirmés+', '%', `
        <div class="dashboard-popin__title">Niveau Confirmé & Expert</div>
        <div class="dashboard-popin__desc">Répartition des ${totalEntries} entrées membre×compétence.</div>
        <div class="dashboard-popin__list">
          <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Expert (4)</span><span class="dashboard-popin__row-value">${expertCount}</span></div>
          <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Confirmé (3)</span><span class="dashboard-popin__row-value">${confirmedCount}</span></div>
          <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Intermédiaire (2)</span><span class="dashboard-popin__row-value">${intermediateCount}</span></div>
          <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Débutant (1)</span><span class="dashboard-popin__row-value">${beginnerCount}</span></div>
          <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Non évalué (0)</span><span class="dashboard-popin__row-value">${noneCount}</span></div>
        </div>
      `)}

      ${renderRingCard(appetencePct, '#F59E0B', 'Appétence', '%', `
        <div class="dashboard-popin__title">Engagement & Appétence</div>
        <div class="dashboard-popin__desc">% d'entrées avec une appétence moyenne ou forte (≥ 2).</div>
        <div class="dashboard-popin__list">
          <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Forte (3)</span><span class="dashboard-popin__row-value">${highAppCount}</span></div>
          <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Moyenne (2)</span><span class="dashboard-popin__row-value">${medAppCount}</span></div>
          <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Faible ou nulle (0-1)</span><span class="dashboard-popin__row-value">${lowAppCount}</span></div>
        </div>
        <div class="dashboard-popin__divider"></div>
        <div class="dashboard-popin__highlight ${appetencePct >= 40 ? 'dashboard-popin__highlight--success' : 'dashboard-popin__highlight--warning'}">
          ${appetencePct >= 40 ? 'Bonne dynamique de montée en compétence' : 'Appétence faible - stimuler la motivation'}
        </div>
      `)}
    </div>
  `;
}

/**
 * Render a single circular progress ring card with optional popin.
 * @param {number} pct - Percentage value (0-100)
 * @param {string} color - Ring color
 * @param {string} label - Card label
 * @param {string} suffix - Value suffix
 * @param {string} [popinHtml=''] - HTML content for the hover popin
 * @returns {string} HTML for one ring card
 */
function renderRingCard(pct, color, label, suffix, popinHtml = '') {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * pct / 100);

  return `
    <div class="overview-card dashboard-popin">
      <div class="overview-card__ring">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="${r}" fill="none" stroke="#E2E8F0" stroke-width="6" />
          <circle cx="40" cy="40" r="${r}" fill="none" stroke="${color}" stroke-width="6"
                  stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
                  stroke-linecap="round" />
        </svg>
        <div class="overview-card__ring-value">${pct}${suffix}</div>
      </div>
      <div class="overview-card__label">${label}</div>
      ${popinHtml ? `<div class="dashboard-popin__content">${popinHtml}</div>` : ''}
    </div>
  `;
}

/**
 * Render the top experts ranking section with podium for top 3.
 * @param {Object[]} members - All members
 * @returns {string} HTML for the top experts section
 */
function renderTopExperts(members) {
  const ranking = members.map(m => {
    let expertSkills = 0;
    let confirmedSkills = 0;
    for (const entry of Object.values(m.skills)) {
      if (entry.level === 4) expertSkills++;
      if (entry.level === 3) confirmedSkills++;
    }
    const initials = m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    return { name: m.name, role: m.role, expertSkills, confirmedSkills, total: expertSkills + confirmedSkills, initials };
  }).filter(m => m.total > 0)
    .sort((a, b) => b.expertSkills - a.expertSkills || b.confirmedSkills - a.confirmedSkills)
    .slice(0, 8);

  if (ranking.length === 0) {
    return '<p style="padding: var(--space-4); color: var(--color-text-secondary); text-align: center;">Aucun expert identifié.</p>';
  }

  const medals = ['🥇', '🥈', '🥉'];
  const podiumClasses = ['gold', 'silver', 'bronze'];
  const podiumHeights = [140, 100, 80];

  // Build podium for top 3 (displayed as 2nd, 1st, 3rd)
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  // Reorder for podium display: [2nd, 1st, 3rd]
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3.length === 2 ? [top3[1], top3[0]] : [top3[0]];
  const podiumRanks = top3.length >= 3
    ? [1, 0, 2]
    : top3.length === 2 ? [1, 0] : [0];

  let html = '<div class="podium-section">';
  html += '<div class="podium">';

  for (let i = 0; i < podiumOrder.length; i++) {
    const r = podiumOrder[i];
    const rank = podiumRanks[i];
    const height = podiumHeights[rank];

    html += `
      <div class="podium__place podium__place--${podiumClasses[rank]}">
        <div class="podium__avatar podium__avatar--${podiumClasses[rank]}">${escapeHtml(r.initials)}</div>
        <div class="podium__medal">${medals[rank]}</div>
        <div class="podium__name">${escapeHtml(r.name)}</div>
        <div class="podium__role">${r.role ? escapeHtml(r.role) : ''}</div>
        <div class="podium__stats">
          <span class="podium__stat podium__stat--expert">${r.expertSkills} expert${r.expertSkills > 1 ? 's' : ''}</span>
          <span class="podium__stat podium__stat--confirmed">${r.confirmedSkills} confirmé${r.confirmedSkills > 1 ? 's' : ''}</span>
        </div>
        <div class="podium__bar podium__bar--${podiumClasses[rank]}" style="height: ${height}px;">
          <span class="podium__bar-rank">${rank + 1}</span>
        </div>
      </div>
    `;
  }

  html += '</div>'; // .podium

  // Remaining ranks (4th+)
  if (rest.length > 0) {
    html += '<div class="podium-rest">';
    for (let i = 0; i < rest.length; i++) {
      const r = rest[i];
      const rank = i + 4;
      html += `
        <div class="podium-rest__item">
          <div class="podium-rest__rank">${rank}</div>
          <div class="podium-rest__avatar">${escapeHtml(r.initials)}</div>
          <div class="podium-rest__info">
            <div class="podium-rest__name">${escapeHtml(r.name)}</div>
            <div class="podium-rest__detail">${r.role ? escapeHtml(r.role) + ' · ' : ''}${r.expertSkills} expert${r.expertSkills > 1 ? 's' : ''}, ${r.confirmedSkills} confirmé${r.confirmedSkills > 1 ? 's' : ''}</div>
          </div>
          <div class="podium-rest__total">${r.total}</div>
        </div>
      `;
    }
    html += '</div>';
  }

  html += '</div>'; // .podium-section
  return html;
}

/**
 * Compute development & mentoring opportunities per skill.
 * Merges growth potential and mentoring: identifies experts (level 4),
 * confirmés (level 3), and motivated learners (appetence >= 2, level < 3).
 * @param {Object[]} members - All members
 * @param {string[]} allSkills - All skill names
 * @returns {Object[]} Opportunities sorted by relevance
 */
function computeDevelopmentOpportunities(members, allSkills) {
  const opportunities = [];

  for (const skill of allSkills) {
    const experts = [];
    const confirmed = [];
    const learners = [];
    let totalLevel = 0;
    let totalAppetence = 0;
    let entries = 0;

    for (const m of members) {
      const entry = m.skills[skill];
      if (!entry) continue;
      entries++;
      totalLevel += entry.level;
      totalAppetence += entry.appetence;
      const initials = m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const person = { name: m.name, initials };

      if (entry.level === 4) {
        experts.push(person);
      } else if (entry.level === 3) {
        confirmed.push(person);
      }

      if (entry.level < 3 && entry.appetence >= 2) {
        learners.push(person);
      }
    }

    if (learners.length === 0) continue;

    const hasMentors = experts.length > 0 || confirmed.length > 0;
    const avgLevel = entries > 0 ? totalLevel / entries : 0;
    const avgAppetence = entries > 0 ? totalAppetence / entries : 0;

    opportunities.push({
      skill,
      experts,
      confirmed,
      learners,
      hasMentors,
      avgLevel,
      avgAppetence,
      candidateCount: learners.length,
      pairCount: (experts.length + confirmed.length) * learners.length,
    });
  }

  opportunities.sort((a, b) => {
    if (a.hasMentors !== b.hasMentors) return a.hasMentors ? -1 : 1;
    return b.pairCount - a.pairCount || b.candidateCount - a.candidateCount;
  });

  return opportunities;
}

/**
 * Render the unified development & mentoring section.
 * Combines growth potential gauges with mentor/learner identification.
 * Differentiates Expert (level 4) from Confirmé (level 3).
 * @param {Object[]} members - All members
 * @param {string[]} allSkills - All skill names
 * @returns {string} HTML for the development section
 */
function renderDevelopmentSection(members, allSkills) {
  const opportunities = computeDevelopmentOpportunities(members, allSkills);
  if (opportunities.length === 0) return '';

  return `
    <div class="card" style="margin-top: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Développement & Mentorat</h3>
        <span class="badge badge--info">${opportunities.length} compétence${opportunities.length > 1 ? 's' : ''}</span>
      </div>
      <div class="card__subtitle" style="padding: 0 var(--space-5); margin-bottom: var(--space-4); font-size: var(--font-size-xs); color: var(--color-text-secondary);">
        Membres motivés (appétence ≥ 2) pouvant progresser, avec mentors potentiels
      </div>
      <div class="mentoring-list">
        ${opportunities.slice(0, 10).map(opp => {
          const levelPct = (opp.avgLevel / 4 * 100).toFixed(0);
          const appPct = (opp.avgAppetence / 3 * 100).toFixed(0);

          return `
          <div class="mentoring-card">
            <div class="mentoring-card__header">
              <span class="mentoring-card__topic">${escapeHtml(opp.skill)}</span>
              <span class="mentoring-card__count">${opp.candidateCount} candidat${opp.candidateCount > 1 ? 's' : ''}</span>
            </div>
            ${opp.hasMentors ? `
              <div class="mentoring-card__rows">
                ${opp.experts.length > 0 ? `
                  <div class="mentoring-card__row">
                    <span class="mentoring-card__role-badge mentoring-card__role-badge--expert">Expert</span>
                    <div class="mentoring-card__people">
                      ${opp.experts.map(m => `
                        <span class="mentoring-card__person mentoring-card__person--expert">
                          <span class="mentoring-card__avatar">${m.initials}</span>${escapeHtml(m.name)}
                        </span>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
                ${opp.confirmed.length > 0 ? `
                  <div class="mentoring-card__row">
                    <span class="mentoring-card__role-badge mentoring-card__role-badge--confirmed">Confirmé</span>
                    <div class="mentoring-card__people">
                      ${opp.confirmed.map(m => `
                        <span class="mentoring-card__person mentoring-card__person--confirmed">
                          <span class="mentoring-card__avatar">${m.initials}</span>${escapeHtml(m.name)}
                        </span>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
                <div class="mentoring-card__arrow">→</div>
                <div class="mentoring-card__row">
                  <span class="mentoring-card__role-badge mentoring-card__role-badge--learner">Motivé</span>
                  <div class="mentoring-card__people">
                    ${opp.learners.map(l => `
                      <span class="mentoring-card__person mentoring-card__person--learner">
                        <span class="mentoring-card__avatar">${l.initials}</span>${escapeHtml(l.name)}
                      </span>
                    `).join('')}
                  </div>
                </div>
              </div>
            ` : `
              <div class="mentoring-card__rows">
                <div class="mentoring-card__row">
                  <span class="mentoring-card__role-badge mentoring-card__role-badge--learner">Motivé</span>
                  <div class="mentoring-card__people">
                    ${opp.learners.map(l => `
                      <span class="mentoring-card__person mentoring-card__person--learner">
                        <span class="mentoring-card__avatar">${l.initials}</span>${escapeHtml(l.name)}
                      </span>
                    `).join('')}
                  </div>
                </div>
                <div class="mentoring-card__no-mentor">Aucun mentor interne — formation externe recommandée</div>
              </div>
            `}
            <div class="mentoring-card__gauges">
              <div class="growth-card__gauge">
                <span class="growth-card__gauge-label">Niveau</span>
                <div class="growth-card__gauge-track">
                  <div class="growth-card__gauge-fill growth-card__gauge-fill--level" style="width: ${levelPct}%;"></div>
                </div>
                <span class="growth-card__gauge-value">${opp.avgLevel.toFixed(1)}</span>
              </div>
              <div class="growth-card__gauge">
                <span class="growth-card__gauge-label">Appétence</span>
                <div class="growth-card__gauge-track">
                  <div class="growth-card__gauge-fill growth-card__gauge-fill--appetence" style="width: ${appPct}%;"></div>
                </div>
                <span class="growth-card__gauge-value">${opp.avgAppetence.toFixed(1)}</span>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Render contextual advice when a demo scenario is loaded.
 * Highlights member names as person chips.
 * @param {Object} state - Current application state
 * @returns {string} HTML for the advice section (or empty string)
 */
function renderDemoAdvice(state) {
  const demoId = state.activeDemo;
  if (!demoId) return '';

  const scenarios = getDemoScenarios();
  const scenario = scenarios.find(s => s.id === demoId);
  if (!scenario) return '';

  // Build a set of first names and full names from current members
  const nameMap = new Map();
  for (const m of state.members) {
    const firstName = m.name.split(' ')[0];
    const initials = m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    nameMap.set(firstName, initials);
    if (m.name !== firstName) nameMap.set(m.name, initials);
  }

  // Sort by length descending so "Jean-Pierre" matches before "Jean"
  const namesSorted = [...nameMap.keys()].sort((a, b) => b.length - a.length);

  // Replace member names in advice text with person chips
  const chipifyAdvice = (html) => {
    let result = html;
    for (const name of namesSorted) {
      const initials = nameMap.get(name);
      // Match name that is not inside an HTML tag or already chipped
      const regex = new RegExp(`(?<![\\w-])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'g');
      const chip = `<span class="advice-person-chip"><span class="advice-person-chip__avatar">${initials}</span>${escapeHtml(name)}</span>`;
      result = result.replace(regex, chip);
    }
    return result;
  };

  return `
    <div class="advice-panel">
      <div class="advice-panel__header">
        <div class="advice-panel__title">
          <div class="advice-panel__title-icon">💡</div>
          <span>Conseils - ${escapeHtml(scenario.title)}</span>
        </div>
        <span class="advice-panel__badge">Scénario démo</span>
      </div>
      <div class="advice-panel__description">${escapeHtml(scenario.description)}</div>
      <div class="advice-panel__list">
        ${scenario.advice.map((advice, i) => `
          <div class="advice-card">
            <div class="advice-card__number">${i + 1}</div>
            <div class="advice-card__text">${chipifyAdvice(advice)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
