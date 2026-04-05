/**
 * Dashboard view - Refactored layout:
 *   1. Health Banner (synthèse une ligne)
 *   2. KPI Cards enrichis (fusion KPI + rings)
 *   3. Actions prioritaires (fusion formation + mentorat + objectifs)
 *   4. Top Experts (podium)
 *   5. Détail : Répartition par catégorie (collapsible) + Plan individuel
 */

import { getState, togglePinnedSkill, togglePinnedMember } from '../state.js';
import { getCategorizedSkillNames, getAllGroups, getSkillStats as _getSkillStats, isSkillCritical } from '../models/data.js';
import { escapeHtml, average, getSkillLabel, SKILL_LEVELS } from '../utils/helpers.js';
import { getDemoScenarios } from '../services/demos.js';
import { renderOnboarding } from '../components/onboarding.js';
import { buildMatrixHash } from './matrix.js';

// ── Memoization getSkillStats ────────────────────────────────────────────────
let _statsCacheRef = null;
const _statsCache = new Map();

/**
 * Version mémoïsée de getSkillStats - O(1) après le premier appel par compétence/rendu.
 * @param {Object[]} members
 * @param {string} skill
 */
function getSkillStats(members, skill) {
  if (_statsCacheRef !== members) {
    _statsCache.clear();
    _statsCacheRef = members;
  }
  if (!_statsCache.has(skill)) {
    _statsCache.set(skill, _getSkillStats(members, skill));
  }
  return _statsCache.get(skill);
}

// ── Constantes ───────────────────────────────────────────────────────────────
const DASH_SECTIONS = [
  { id: 'dash-kpi', label: 'Synthèse', icon: '📈' },
  { id: 'dash-actions', label: 'Actions', icon: '🎯' },
  { id: 'dash-appetence', label: 'Appétence', icon: '🔥' },
  { id: 'dash-experts', label: 'Experts', icon: '🏆' },
  { id: 'dash-groups', label: 'Groupes', icon: '📂', needsGroups: true },
  { id: 'dash-breakdown', label: 'Détail', icon: '📊' },
  { id: 'dash-plans', label: 'Plans', icon: '🗺️' },
];

// ── Main render ──────────────────────────────────────────────────────────────

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
  const allSkills = getCategorizedSkillNames(state.members, state.categories);
  const criticalSkills = allSkills.filter(s => isSkillCritical(state.members, s, threshold));
  const avgCoverage = average(allSkills.map(s => getSkillStats(state.members, s).coverage));
  const groups = getAllGroups(state.members);

  // Pré-calculs globaux
  const globals = computeGlobals(state.members, allSkills);

  const navLinks = DASH_SECTIONS
    .filter(s => !s.needsGroups || groups.length > 0)
    .map(s => `<a class="settings-summary__link" href="#${s.id}" data-target="${s.id}"><span class="settings-summary__icon">${s.icon}</span><span class="settings-summary__label">${s.label}</span></a>`)
    .join('');

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Dashboard</h1>
        <p class="page-header__subtitle">Vue d'ensemble des compétences de l'équipe</p>
      </div>
    </div>

    <!-- Health Banner -->
    ${renderHealthBanner(state.members, allSkills, criticalSkills, globals, state)}

    <nav class="settings-summary" id="dash-nav">
      ${navLinks}
    </nav>

    <!-- Pinned items -->
    ${renderPinnedSection(state, allSkills, threshold)}

    <!-- KPI Cards enrichis -->
    <div id="dash-kpi">
      ${renderEnrichedKpis(state.members, allSkills, criticalSkills, avgCoverage, state.categories, threshold, groups, globals)}
    </div>

    <!-- Bus Factor Alerts -->
    ${globals.singlePoints.length > 0 ? renderBusFactorAlerts(globals.singlePoints, state.members) : ''}

    <!-- Contextual Advice (demo) -->
    ${renderDemoAdvice(state)}

    <!-- Actions prioritaires (objectifs + formation + mentorat fusionnés) -->
    <div id="dash-actions">
      ${renderActionsSection(state.members, allSkills, threshold, state.objectives || {}, state.categories)}
    </div>

    <!-- Heatmap Appetence -->
    ${renderAppetenceHeatmap(state.members, allSkills, state.categories)}

    <!-- Top Experts -->
    <div class="card" style="margin-top: var(--space-6);" id="dash-experts">
      <div class="card__header">
        <h3 class="card__title">Top experts</h3>
        <span class="badge badge--info">Classement</span>
      </div>
      ${renderTopExperts(state.members)}
    </div>

    <!-- Comparaison inter-groupes -->
    ${groups.length > 0 ? renderGroupComparison(state.members, allSkills, groups, threshold, state.categories) : ''}

    <!-- Répartition par compétence (groupée par catégorie, collapsible) -->
    <div class="card dash-section--collapsible" style="margin-top: var(--space-6);" id="dash-breakdown">
      <div class="card__header dash-section__toggle" data-collapse="breakdown-content">
        <h3 class="card__title">Répartition par compétence</h3>
        <div style="display: flex; align-items: center; gap: var(--space-3);">
          <div class="legend" style="margin: 0;">
            ${SKILL_LEVELS.map(l => `
              <div class="legend__item">
                <div class="legend__color" style="background: ${l.color};"></div>
                <span>${l.label}</span>
              </div>
            `).join('')}
          </div>
          <span class="dash-section__chevron">▾</span>
        </div>
      </div>
      <div class="dash-section__body" id="breakdown-content">
        ${renderCriticalityByCategory(state.members, allSkills, state.categories, threshold)}
      </div>
    </div>

    <!-- Plans de développement individuels -->
    <div class="card dash-section--collapsible" style="margin-top: var(--space-6);" id="dash-plans">
      <div class="card__header dash-section__toggle" data-collapse="plans-content">
        <h3 class="card__title">Plan de développement individuel</h3>
        <span class="dash-section__chevron">▾</span>
      </div>
      <div class="dash-section__body" id="plans-content">
        ${renderDevPlansSection(state.members, allSkills, threshold)}
      </div>
    </div>
  `;

  bindDashboardEvents(container, state.members, allSkills, threshold);
  bindDashboardNav(container);
  bindCollapsibleSections(container);
}

// ── Pré-calculs globaux ──────────────────────────────────────────────────────

/**
 * Calcule les statistiques globales de l'équipe (une seule passe).
 */
function computeGlobals(members, allSkills) {
  let totalEntries = 0, expertCount = 0, confirmedCount = 0;
  let intermediateCount = 0, beginnerCount = 0, noneCount = 0;
  let highAppCount = 0, medAppCount = 0, lowAppCount = 0;
  let totalLevel = 0;

  for (const member of members) {
    for (const entry of Object.values(member.skills)) {
      totalEntries++;
      totalLevel += entry.level;
      if (entry.level === 0) noneCount++;
      else if (entry.level === 1) beginnerCount++;
      else if (entry.level === 2) intermediateCount++;
      else if (entry.level === 3) confirmedCount++;
      else if (entry.level === 4) expertCount++;

      if (entry.appetence >= 3) highAppCount++;
      else if (entry.appetence === 2) medAppCount++;
      else lowAppCount++;
    }
  }

  const globalAvg = totalEntries > 0 ? totalLevel / totalEntries : 0;
  const confirmedPlusPct = totalEntries > 0 ? Math.round(((confirmedCount + expertCount) / totalEntries) * 100) : 0;
  const appetencePct = totalEntries > 0 ? Math.round(((highAppCount + medAppCount) / totalEntries) * 100) : 0;

  // Bus factor
  const singlePoints = [];
  for (const skill of allSkills) {
    const stats = getSkillStats(members, skill);
    const ce = stats.levels[3] + stats.levels[4];
    if (ce === 1) {
      const holder = members.find(m => (m.skills[skill]?.level ?? 0) >= 3);
      singlePoints.push({ skill, holder: holder?.name || '?' });
    }
  }

  return {
    totalEntries, expertCount, confirmedCount, intermediateCount,
    beginnerCount, noneCount, highAppCount, medAppCount, lowAppCount,
    globalAvg, confirmedPlusPct, appetencePct, singlePoints,
  };
}

// ── Pinned Items ────────────────────────────────────────────────────────────

/**
 * Affiche les compétences et membres épinglés en haut du dashboard.
 * @param {Object} state
 * @param {string[]} allSkills
 * @param {number} threshold
 * @returns {string} HTML
 */
function renderPinnedSection(state, allSkills, threshold) {
  const pinnedSkills = (state.pinnedSkills || []).filter(s => allSkills.includes(s));
  const pinnedMembers = (state.pinnedMembers || []).filter(id => state.members.some(m => m.id === id));

  if (pinnedSkills.length === 0 && pinnedMembers.length === 0) return '';

  const skillCards = pinnedSkills.map(skill => {
    const stats = getSkillStats(state.members, skill);
    const ce = stats.levels[3] + stats.levels[4];
    const critical = isSkillCritical(state.members, skill, threshold);
    const coverageColor = stats.coverage >= 75 ? 'var(--color-success)' : stats.coverage >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';
    return `
      <div class="pinned-card">
        <button class="pinned-card__unpin" data-unpin-skill="${escapeHtml(skill)}" title="Retirer des épingles">✕</button>
        <a class="pinned-card__title action-card__link" href="${buildMatrixHash('default', { search: skill })}">${escapeHtml(skill)}</a>
        ${critical ? '<span class="pinned-card__badge pinned-card__badge--danger">Critique</span>' : ''}
        <div class="pinned-card__stats">
          <span>${ce} C+E</span>
          <span style="color: ${coverageColor};">${Math.round(stats.coverage)}%</span>
          <span>Moy. ${stats.avgLevel.toFixed(1)}</span>
        </div>
      </div>
    `;
  }).join('');

  const memberCards = pinnedMembers.map(id => {
    const m = state.members.find(mm => mm.id === id);
    if (!m) return '';
    let expertCount = 0, confirmedCount = 0, totalLevel = 0, count = 0;
    for (const entry of Object.values(m.skills)) {
      count++;
      totalLevel += entry.level;
      if (entry.level === 4) expertCount++;
      if (entry.level === 3) confirmedCount++;
    }
    const avg = count > 0 ? (totalLevel / count).toFixed(1) : '0';
    return `
      <div class="pinned-card pinned-card--member">
        <button class="pinned-card__unpin" data-unpin-member="${m.id}" title="Retirer des épingles">✕</button>
        <div class="pinned-card__title">${escapeHtml(m.name)}</div>
        ${m.role ? `<div class="pinned-card__sub">${escapeHtml(m.role)}</div>` : ''}
        <div class="pinned-card__stats">
          <span>${expertCount} Expert</span>
          <span>${confirmedCount} Conf.</span>
          <span>Moy. ${avg}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="pinned-section" id="dash-pinned">
      ${skillCards}${memberCards}
    </div>
  `;
}

// ── Heatmap Appétence ────────────────────────────────────────────────────────

/**
 * Render une heatmap croisant niveau vs appétence.
 * Identifie les potentiels (niveau bas + appétence forte) et les sous-exploités (niveau haut + appétence basse).
 * @param {Object[]} members
 * @param {string[]} allSkills
 * @param {Object} categories
 * @returns {string} HTML
 */
function renderAppetenceHeatmap(members, allSkills, categories) {
  // Construire la matrice : pour chaque compétence, compter les membres dans chaque case niveau×appétence
  // Puis identifier les opportunités de formation (niveau 0-2, appétence 2-3)
  const opportunities = [];
  const underused = [];

  for (const skill of allSkills) {
    for (const member of members) {
      const entry = member.skills[skill];
      if (!entry) continue;
      const { level, appetence } = entry;
      // Opportunité : niveau bas (0-2) + appétence forte (2-3)
      if (level <= 2 && appetence >= 2) {
        opportunities.push({ skill, member: member.name, level, appetence });
      }
      // Sous-exploité : niveau haut (3-4) + appétence basse (0-1)
      if (level >= 3 && appetence <= 1) {
        underused.push({ skill, member: member.name, level, appetence });
      }
    }
  }

  // Trier : opportunités par appétence desc puis niveau asc, sous-exploités par niveau desc
  opportunities.sort((a, b) => b.appetence - a.appetence || a.level - b.level);
  underused.sort((a, b) => b.level - a.level || a.appetence - b.appetence);

  const appLabels = ['', '▪', '▪▪', '🔥'];

  const oppHtml = opportunities.slice(0, 12).map(o => `
    <div class="appetence-heatmap-card appetence-heatmap-card--opportunity">
      <a class="appetence-heatmap-card__skill action-card__link" href="${buildMatrixHash('default', { search: o.skill })}">${escapeHtml(o.skill)}</a>
      <span class="appetence-heatmap-card__member">${escapeHtml(o.member)}</span>
      <span class="appetence-heatmap-card__detail">Niv. ${o.level} · App. ${appLabels[o.appetence]}</span>
    </div>
  `).join('');

  const underHtml = underused.slice(0, 8).map(u => `
    <div class="appetence-heatmap-card appetence-heatmap-card--underused">
      <a class="appetence-heatmap-card__skill action-card__link" href="${buildMatrixHash('default', { search: u.skill })}">${escapeHtml(u.skill)}</a>
      <span class="appetence-heatmap-card__member">${escapeHtml(u.member)}</span>
      <span class="appetence-heatmap-card__detail">Niv. ${u.level} · App. ${u.appetence === 0 ? 'Aucune' : 'Faible'}</span>
    </div>
  `).join('');

  if (opportunities.length === 0 && underused.length === 0) return '';

  return `
    <div class="card dash-section--collapsible" style="margin-top: var(--space-6);" id="dash-appetence">
      <div class="card__header dash-section__toggle" data-collapse="appetence-content">
        <h3 class="card__title">Heatmap appétence vs niveau</h3>
        <span class="dash-section__chevron">▾</span>
      </div>
      <div class="dash-section__body" id="appetence-content">
        ${opportunities.length > 0 ? `
          <div class="appetence-section">
            <h4 class="appetence-section__title appetence-section__title--opportunity">
              Potentiels de montée en compétence
              <span class="badge badge--info">${opportunities.length}</span>
            </h4>
            <p class="appetence-section__desc">Niveau bas + appétence forte = candidats idéaux pour formation.</p>
            <div class="appetence-heatmap-grid">${oppHtml}</div>
            ${opportunities.length > 12 ? `<p class="appetence-section__more">+ ${opportunities.length - 12} autre(s)...</p>` : ''}
          </div>
        ` : ''}
        ${underused.length > 0 ? `
          <div class="appetence-section" style="margin-top: var(--space-4);">
            <h4 class="appetence-section__title appetence-section__title--underused">
              Experts peu motivés
              <span class="badge badge--warning">${underused.length}</span>
            </h4>
            <p class="appetence-section__desc">Niveau haut + appétence basse = risque de désengagement.</p>
            <div class="appetence-heatmap-grid">${underHtml}</div>
            ${underused.length > 8 ? `<p class="appetence-section__more">+ ${underused.length - 8} autre(s)...</p>` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ── Bus Factor Alerts ────────────────────────────────────────────────────────

/**
 * Bloc d'alerte dédié aux SPOF (Single Point Of Failure / Bus Factor).
 * Affiche chaque compétence reposant sur un seul Confirmé/Expert.
 * @param {Object[]} singlePoints - [{ skill, holder }]
 * @param {Object[]} members
 * @returns {string} HTML
 */
function renderBusFactorAlerts(singlePoints, members) {
  const severity = singlePoints.length > 5 ? 'critical' : singlePoints.length > 2 ? 'warning' : 'minor';

  // Grouper par holder pour montrer les personnes les plus critiques
  const byHolder = {};
  for (const sp of singlePoints) {
    if (!byHolder[sp.holder]) byHolder[sp.holder] = [];
    byHolder[sp.holder].push(sp.skill);
  }
  const sortedHolders = Object.entries(byHolder).sort((a, b) => b[1].length - a[1].length);

  const cardsHtml = singlePoints.map(sp => {
    const initials = sp.holder.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    return `
      <div class="bus-factor-card">
        <a class="bus-factor-card__skill action-card__link" href="${buildMatrixHash('default', { search: sp.skill })}">${escapeHtml(sp.skill)}</a>
        <div class="bus-factor-card__holder">
          <span class="bus-factor-card__avatar">${initials}</span>
          <span>${escapeHtml(sp.holder)}</span>
        </div>
      </div>
    `;
  }).join('');

  const holdersHtml = sortedHolders.slice(0, 5).map(([name, skills]) => {
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const pct = Math.round((skills.length / singlePoints.length) * 100);
    return `
      <div class="bus-factor-holder">
        <span class="bus-factor-holder__avatar">${initials}</span>
        <div class="bus-factor-holder__info">
          <span class="bus-factor-holder__name">${escapeHtml(name)}</span>
          <div class="bus-factor-holder__bar">
            <div class="bus-factor-holder__bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
        <span class="bus-factor-holder__count">${skills.length}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="bus-factor-alert bus-factor-alert--${severity}">
      <div class="bus-factor-alert__header">
        <div class="bus-factor-alert__icon-wrap">
          <span class="bus-factor-alert__icon">🚌</span>
          <span class="bus-factor-alert__count">${singlePoints.length}</span>
        </div>
        <div>
          <strong class="bus-factor-alert__title">Bus Factor : ${singlePoints.length} compétence${singlePoints.length > 1 ? 's' : ''} à risque</strong>
          <p class="bus-factor-alert__desc">Compétences reposant sur une seule personne Confirmé/Expert.</p>
        </div>
      </div>
      <div class="bus-factor-alert__body">
        <div class="bus-factor-alert__skills">${cardsHtml}</div>
        ${sortedHolders.length > 0 ? `
          <div class="bus-factor-alert__holders">
            <strong class="bus-factor-alert__holders-title">Personnes clés</strong>
            ${holdersHtml}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ── 1. Health Banner ─────────────────────────────────────────────────────────

/**
 * Barre de synthèse colorée tout en haut du dashboard.
 */
function renderHealthBanner(members, allSkills, criticalSkills, globals, state) {
  const healthPct = allSkills.length > 0
    ? Math.round(((allSkills.length - criticalSkills.length) / allSkills.length) * 100)
    : 100;

  let level, color, bgColor, borderColor, message;
  if (healthPct >= 80 && globals.singlePoints.length <= 1) {
    level = 'good';
    color = '#065F46';
    bgColor = '#ECFDF5';
    borderColor = '#A7F3D0';
    message = `Équipe en bonne santé - ${allSkills.length} compétences suivies, couverture solide.`;
  } else if (healthPct >= 50) {
    level = 'warning';
    color = '#92400E';
    bgColor = '#FFFBEB';
    borderColor = '#FDE68A';
    const parts = [];
    if (criticalSkills.length > 0) parts.push(`${criticalSkills.length} compétence(s) critique(s)`);
    if (globals.singlePoints.length > 0) parts.push(`${globals.singlePoints.length} SPOF`);
    message = `Points d'attention : ${parts.join(', ')}.`;
  } else {
    level = 'danger';
    color = '#991B1B';
    bgColor = '#FEF2F2';
    borderColor = '#FECACA';
    message = `Situation critique - ${criticalSkills.length} compétence(s) en alerte, actions requises.`;
  }

  // Si un démo est chargé, on ajoute un badge
  const demoBadge = state.activeDemo
    ? '<span class="health-banner__demo">Demo</span>'
    : '';

  return `
    <div class="health-banner health-banner--${level}" style="background: ${bgColor}; border-color: ${borderColor}; color: ${color};">
      <span class="health-banner__indicator" style="background: ${color};"></span>
      <span class="health-banner__message">${message}</span>
      ${demoBadge}
    </div>
  `;
}

// ── 2. KPI Cards enrichis ────────────────────────────────────────────────────

/**
 * Grille de KPIs enrichis : chaque card contient le chiffre + un sous-detail visible
 * + une mini-visualisation (ring, barre) intégrée.
 */
function renderEnrichedKpis(members, allSkills, criticalSkills, avgCoverage, categories, threshold, groups, globals) {
  // Roles breakdown pour la card Membres
  const roleCounts = {};
  for (const m of members) {
    const role = m.role || 'Non défini';
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }
  const roleBreakdown = Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([role, count]) => `${count} ${escapeHtml(role)}`)
    .join(', ');

  // Categories breakdown
  const catEntries = Object.entries(categories);
  const catBreakdown = catEntries.length > 0
    ? catEntries.slice(0, 3).map(([name, skills]) => {
        const count = skills.filter(s => allSkills.includes(s)).length;
        return `${count} ${escapeHtml(name)}`;
      }).join(', ')
    : 'Non catégorisées';

  // Health percentage
  const healthPct = allSkills.length > 0
    ? Math.round(((allSkills.length - criticalSkills.length) / allSkills.length) * 100)
    : 100;

  // Score color
  const avgColor = globals.globalAvg >= 3 ? '#10B981' : globals.globalAvg >= 2 ? '#3B82F6' : '#F59E0B';
  const riskColor = globals.singlePoints.length > 3 ? '#DC2626' : globals.singlePoints.length > 0 ? '#F59E0B' : '#10B981';

  // Coverage ring
  const coverageRing = miniRingSvg(Math.round(avgCoverage), '#3B82F6');
  const healthRing = miniRingSvg(healthPct, healthPct >= 80 ? '#10B981' : healthPct >= 50 ? '#F59E0B' : '#DC2626');
  const appetenceRing = miniRingSvg(globals.appetencePct, '#8B5CF6');

  // Critical skills popin
  const criticalList = criticalSkills.slice(0, 6);

  return `
    <div class="kpi-grid-v2">

      <!-- Membres -->
      <div class="kpi-v2 dashboard-popin">
        <div class="kpi-v2__icon kpi-card__icon--blue">👥</div>
        <div class="kpi-v2__body">
          <div class="kpi-v2__value">${members.length}</div>
          <div class="kpi-v2__label">Membres</div>
          <div class="kpi-v2__detail">${roleBreakdown}</div>
        </div>
        ${renderKpiPopin('Composition de l\'équipe', `
          ${Object.entries(roleCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([role, count]) =>
            `<div class="dashboard-popin__row"><span class="dashboard-popin__row-label">${escapeHtml(role)}</span><span class="dashboard-popin__row-value">${count}</span></div>`
          ).join('')}
        `)}
      </div>

      <!-- Couverture (avec mini-ring) -->
      <div class="kpi-v2 kpi-v2--ring dashboard-popin">
        <div class="kpi-v2__ring">${coverageRing}</div>
        <div class="kpi-v2__body">
          <div class="kpi-v2__value">${avgCoverage.toFixed(0)}%</div>
          <div class="kpi-v2__label">Couverture</div>
          <div class="kpi-v2__detail">${allSkills.length} compétences suivies</div>
        </div>
        ${renderKpiPopin('Couverture des compétences', `
          <div class="dashboard-popin__desc">% de membres ayant au moins le niveau Débutant</div>
          <div class="dashboard-popin__list">
            <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Renseignées (≥1)</span><span class="dashboard-popin__row-value">${globals.totalEntries - globals.noneCount}</span></div>
            <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Vides (0)</span><span class="dashboard-popin__row-value">${globals.noneCount}</span></div>
          </div>
          ${catBreakdown !== 'Non catégorisées' ? `<div class="dashboard-popin__divider"></div><div class="dashboard-popin__highlight dashboard-popin__highlight--info">${catBreakdown}</div>` : ''}
        `)}
      </div>

      <!-- Santé équipe (avec mini-ring) -->
      <div class="kpi-v2 kpi-v2--ring dashboard-popin">
        <div class="kpi-v2__ring">${healthRing}</div>
        <div class="kpi-v2__body">
          <div class="kpi-v2__value">${healthPct}%</div>
          <div class="kpi-v2__label">Santé équipe</div>
          <div class="kpi-v2__detail">${criticalSkills.length > 0 ? criticalSkills.length + ' alerte(s)' : 'Aucune alerte'}</div>
        </div>
        ${renderKpiPopin('Compétences critiques', `
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
          ` : `<div class="dashboard-popin__highlight dashboard-popin__highlight--success">Toutes les compétences sont couvertes</div>`}
        `)}
      </div>

      <!-- Score moyen (avec mini-barre) -->
      <div class="kpi-v2 dashboard-popin">
        <div class="kpi-v2__icon" style="background: ${avgColor}22; color: ${avgColor};">📈</div>
        <div class="kpi-v2__body">
          <div class="kpi-v2__value">${globals.globalAvg.toFixed(1)}<span class="kpi-v2__suffix">/4</span></div>
          <div class="kpi-v2__label">Score moyen</div>
          <div class="kpi-v2__mini-bar">
            <div class="kpi-v2__mini-bar-fill" style="width: ${(globals.globalAvg / 4 * 100).toFixed(0)}%; background: ${avgColor};"></div>
          </div>
        </div>
        ${renderKpiPopin('Répartition des niveaux', `
          <div class="dashboard-popin__list">
            <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Expert (4)</span><span class="dashboard-popin__row-value">${globals.expertCount}</span></div>
            <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Confirmé (3)</span><span class="dashboard-popin__row-value">${globals.confirmedCount}</span></div>
            <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Intermédiaire (2)</span><span class="dashboard-popin__row-value">${globals.intermediateCount}</span></div>
            <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Débutant (1)</span><span class="dashboard-popin__row-value">${globals.beginnerCount}</span></div>
            <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Non évalué (0)</span><span class="dashboard-popin__row-value">${globals.noneCount}</span></div>
          </div>
        `)}
      </div>

      <!-- Bus Factor -->
      <div class="kpi-v2 dashboard-popin">
        <div class="kpi-v2__icon" style="background: ${riskColor}22; color: ${riskColor};">🚌</div>
        <div class="kpi-v2__body">
          <div class="kpi-v2__value">${globals.singlePoints.length}</div>
          <div class="kpi-v2__label">Bus Factor</div>
          <div class="kpi-v2__detail">${globals.singlePoints.length > 0 ? 'SPOF détectés' : 'Aucun risque'}</div>
        </div>
        ${renderKpiPopin('Single Point of Failure', `
          <div class="dashboard-popin__desc">Compétences avec exactement 1 seul Confirmé/Expert</div>
          ${globals.singlePoints.length > 0 ? `
            <div class="dashboard-popin__list">
              ${globals.singlePoints.slice(0, 6).map(sp => `
                <div class="dashboard-popin__row">
                  <span class="dashboard-popin__row-label">${escapeHtml(sp.skill)}</span>
                  <span class="dashboard-popin__row-value">${escapeHtml(sp.holder)}</span>
                </div>
              `).join('')}
            </div>
            ${globals.singlePoints.length > 6 ? `<div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: var(--space-2);">+ ${globals.singlePoints.length - 6} autre(s)…</div>` : ''}
          ` : `<div class="dashboard-popin__highlight dashboard-popin__highlight--success">Aucun risque de dépendance individuelle</div>`}
        `)}
      </div>

      <!-- Appétence (avec mini-ring) -->
      <div class="kpi-v2 kpi-v2--ring dashboard-popin">
        <div class="kpi-v2__ring">${appetenceRing}</div>
        <div class="kpi-v2__body">
          <div class="kpi-v2__value">${globals.appetencePct}%</div>
          <div class="kpi-v2__label">Appétence</div>
          <div class="kpi-v2__detail">${globals.highAppCount} forte, ${globals.medAppCount} moyenne</div>
        </div>
        ${renderKpiPopin('Engagement & Appétence', `
          <div class="dashboard-popin__desc">% d'entrées avec appétence moyenne ou forte (≥ 2).</div>
          <div class="dashboard-popin__list">
            <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Forte (3)</span><span class="dashboard-popin__row-value">${globals.highAppCount}</span></div>
            <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Moyenne (2)</span><span class="dashboard-popin__row-value">${globals.medAppCount}</span></div>
            <div class="dashboard-popin__row"><span class="dashboard-popin__row-label">Faible/nulle (0-1)</span><span class="dashboard-popin__row-value">${globals.lowAppCount}</span></div>
          </div>
        `)}
      </div>

      ${groups.length > 0 ? renderGroupsKpi(members, groups) : ''}
    </div>
  `;
}

/**
 * Mini SVG ring inline pour les KPI cards.
 */
function miniRingSvg(pct, color) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * pct / 100);
  return `
    <svg width="44" height="44" viewBox="0 0 44 44" class="kpi-v2__ring-svg">
      <circle cx="22" cy="22" r="${r}" fill="none" stroke="var(--color-neutral-200)" stroke-width="4" />
      <circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="4"
              stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
              stroke-linecap="round" />
    </svg>`;
}

/**
 * Helper : contenu de la popin d'un KPI.
 */
function renderKpiPopin(title, contentHtml) {
  return `
    <div class="dashboard-popin__content">
      <div class="dashboard-popin__title">${title}</div>
      <div class="dashboard-popin__list">${contentHtml}</div>
    </div>
  `;
}

/**
 * KPI card Groupes.
 */
function renderGroupsKpi(members, groups) {
  const groupCounts = {};
  for (const g of groups) {
    groupCounts[g] = members.filter(m => (m.groups || []).includes(g)).length;
  }
  const sortedGroups = Object.entries(groupCounts).sort((a, b) => b[1] - a[1]);
  const topGroups = sortedGroups.slice(0, 3).map(([name, count]) => `${count} ${escapeHtml(name)}`).join(', ');

  return `
    <div class="kpi-v2 dashboard-popin">
      <div class="kpi-v2__icon" style="background: #E0E7FF; color: #4338CA;">🏷</div>
      <div class="kpi-v2__body">
        <div class="kpi-v2__value">${groups.length}</div>
        <div class="kpi-v2__label">Groupes</div>
        <div class="kpi-v2__detail">${topGroups}</div>
      </div>
      ${renderKpiPopin('Répartition par groupe', `
        ${sortedGroups.slice(0, 6).map(([name, count]) => `
          <div class="dashboard-popin__row">
            <span class="dashboard-popin__row-label">${escapeHtml(name)}</span>
            <span class="dashboard-popin__row-value">${count} pers.</span>
          </div>
        `).join('')}
      `)}
    </div>
  `;
}

// ── 3. Actions prioritaires (fusion formation + mentorat + objectifs) ─────

/**
 * Section unifiée "Actions prioritaires" :
 * - Objectifs d'équipe (si définis)
 * - Cards fusionnées formation/mentorat
 * - Alertes appétence
 */
function renderActionsSection(members, allSkills, threshold, objectives, categories) {
  const criticalSkills = allSkills.filter(s => isSkillCritical(members, s, threshold));
  const actionItems = computeActionItems(members, allSkills, threshold);

  const objectiveEntries = Object.entries(objectives).filter(([skill]) => allSkills.includes(skill));
  const hasObjectives = objectiveEntries.length > 0;

  return `
    <div class="card" style="margin-top: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Actions prioritaires</h3>
        <span class="badge ${criticalSkills.length > 0 ? 'badge--critical' : 'badge--success'}">
          ${criticalSkills.length > 0 ? criticalSkills.length + ' alerte(s)' : 'OK'}
        </span>
      </div>

      ${hasObjectives ? renderObjectivesBlock(members, allSkills, objectiveEntries, threshold) : ''}

      ${actionItems.length > 0 ? `
        <div class="card__subtitle" style="padding: var(--space-3) var(--space-5) 0; font-size: var(--font-size-xs); color: var(--color-text-secondary);">
          Compétences à risque : formation et mentorat recommandés
        </div>
        <div class="action-list">
          ${actionItems.map(item => renderActionCard(item)).join('')}
        </div>
      ` : `
        <p style="padding: var(--space-4); color: var(--color-text-secondary); text-align: center;">Aucune action prioritaire - couverture suffisante.</p>
      `}

      ${renderAppetenceAlerts(members, allSkills)}
    </div>
  `;
}

/**
 * Calcule les items d'action fusionnés (formation + mentorat en une seule liste).
 */
function computeActionItems(members, skills, threshold) {
  const items = [];

  for (const skill of skills) {
    const stats = getSkillStats(members, skill);
    const confirmedOrExpert = stats.levels[3] + stats.levels[4];
    if (confirmedOrExpert >= threshold) continue;

    // Experts (niveau 4) et confirmés (niveau 3) = mentors potentiels
    const experts = [];
    const confirmed = [];
    const learners = [];

    for (const m of members) {
      const entry = m.skills[skill];
      if (!entry) continue;
      const initials = m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const person = { name: m.name, initials };

      if (entry.level === 4) experts.push(person);
      else if (entry.level === 3) confirmed.push(person);

      if (entry.level < 3 && entry.appetence >= 2) learners.push(person);
    }

    const urgency = confirmedOrExpert === 0 ? 'high' : 'medium';

    items.push({
      skill, urgency, confirmedOrExpert,
      experts, confirmed, learners,
      avgLevel: stats.avgLevel,
      highAppetence: stats.highAppetenceCount,
      hasMentors: experts.length > 0 || confirmed.length > 0,
    });
  }

  // Tri : urgence haute d'abord, puis par nombre de candidats
  items.sort((a, b) => {
    if (a.urgency === 'high' && b.urgency !== 'high') return -1;
    if (b.urgency === 'high' && a.urgency !== 'high') return 1;
    return b.learners.length - a.learners.length;
  });

  return items.slice(0, 10);
}

/**
 * Render une card d'action unifiée (fusion formation + mentorat).
 */
function renderActionCard(item) {
  const urgClass = item.urgency === 'high' ? 'critical' : 'warning';
  const urgLabel = item.urgency === 'high' ? 'Urgente' : 'Moyenne';
  const maxDots = 4;
  const filledDots = Math.min(item.confirmedOrExpert, maxDots);

  const renderPersons = (persons, cssClass) => persons.map(p =>
    `<span class="action-card__person action-card__person--${cssClass}"><span class="action-card__avatar">${p.initials}</span>${escapeHtml(p.name)}</span>`
  ).join('');

  return `
    <div class="action-card action-card--${urgClass}">
      <div class="action-card__header">
        <a class="action-card__skill action-card__link" href="${buildMatrixHash('default', { search: item.skill })}">${escapeHtml(item.skill)}</a>
        <span class="action-card__urgency action-card__urgency--${urgClass}">${urgLabel}</span>
      </div>

      <div class="action-card__gauge" title="${item.confirmedOrExpert} Confirmé(s)/Expert(s)">
        ${Array.from({ length: maxDots }, (_, i) =>
          `<span class="action-card__dot ${i < filledDots ? 'action-card__dot--filled' : ''}"></span>`
        ).join('')}
        <span class="action-card__gauge-label">${item.confirmedOrExpert} couvert${item.confirmedOrExpert > 1 ? 's' : ''}</span>
      </div>

      ${item.hasMentors ? `
        <div class="action-card__mentors-block">
          ${item.experts.length > 0 ? `
            <div class="action-card__row">
              <span class="action-card__role-badge action-card__role-badge--expert">Expert</span>
              <div class="action-card__people">${renderPersons(item.experts, 'expert')}</div>
            </div>
          ` : ''}
          ${item.confirmed.length > 0 ? `
            <div class="action-card__row">
              <span class="action-card__role-badge action-card__role-badge--confirmed">Confirmé</span>
              <div class="action-card__people">${renderPersons(item.confirmed, 'confirmed')}</div>
            </div>
          ` : ''}
          ${item.learners.length > 0 ? `
            <div class="action-card__arrow">↓</div>
            <div class="action-card__row">
              <span class="action-card__role-badge action-card__role-badge--learner">Motivé</span>
              <div class="action-card__people">${renderPersons(item.learners, 'learner')}</div>
            </div>
          ` : ''}
        </div>
      ` : `
        <div class="action-card__no-mentor">Aucun mentor interne - formation externe recommandée</div>
        ${item.learners.length > 0 ? `
          <div class="action-card__row">
            <span class="action-card__role-badge action-card__role-badge--learner">Motivé</span>
            <div class="action-card__people">${renderPersons(item.learners, 'learner')}</div>
          </div>
        ` : ''}
      `}
    </div>
  `;
}

/**
 * Bloc objectifs intégré dans la section Actions (compact).
 */
function renderObjectivesBlock(members, allSkills, entries, threshold) {
  let metCount = 0;

  const rows = entries.map(([skill, obj]) => {
    const target = obj.minExperts || 2;
    const stats = getSkillStats(members, skill);
    const current = stats.levels[3] + stats.levels[4];
    const pct = Math.min(Math.round((current / target) * 100), 100);
    const isMet = current >= target;
    if (isMet) metCount++;
    const barColor = isMet ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';

    // Détail par niveau
    const detailHtml = [4, 3, 2, 1, 0].map(lvl => {
      const names = members.filter(m => (m.skills[skill]?.level ?? 0) === lvl).map(m => m.name);
      if (names.length === 0) return '';
      const bold = lvl >= 3;
      return `<div class="objective-detail__level"><span class="objective-detail__badge" style="background:${SKILL_LEVELS[lvl].color};color:${SKILL_LEVELS[lvl].textColor};">${SKILL_LEVELS[lvl].label}</span><span class="objective-detail__names${bold ? ' objective-detail__names--strong' : ''}">${names.map(n => escapeHtml(n)).join(', ')}</span></div>`;
    }).join('');
    const motivated = members.filter(m => (m.skills[skill]?.appetence ?? 0) >= 2 && (m.skills[skill]?.level ?? 0) < 3);
    const motivatedHtml = motivated.length > 0
      ? `<div class="objective-detail__motivated">Motivés : ${motivated.map(m => escapeHtml(m.name)).join(', ')}</div>`
      : '';

    return `
      <div class="objective-row objective-row--expandable">
        <div class="objective-row__info">
          <a class="objective-row__skill action-card__link" href="${buildMatrixHash('default', { search: skill })}">${escapeHtml(skill)}</a>
          <span class="objective-row__target">${current} / ${target} Confirmé(s)/Expert(s)</span>
        </div>
        <div class="objective-row__bar">
          <div class="objective-row__bar-fill" style="width: ${pct}%; background: ${barColor};"></div>
        </div>
        <span class="objective-row__badge badge ${isMet ? 'badge--success' : 'badge--warning'}">${isMet ? 'Atteint' : `${pct}%`}</span>
        <span class="objective-row__toggle">▸</span>
        <div class="objective-row__detail">${detailHtml}${motivatedHtml}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="objectives-block">
      <div class="objectives-block__header">
        <span class="objectives-block__title">Objectifs d'équipe</span>
        <span class="badge ${metCount === entries.length ? 'badge--success' : 'badge--info'}">${metCount}/${entries.length}</span>
        <button class="btn btn--ghost btn--sm" id="objectives-toggle-all" title="Tout déplier / replier">▸ Tout</button>
      </div>
      <div class="objectives-list">
        ${rows}
      </div>
    </div>
  `;
}

/**
 * Alertes appétence (info level).
 */
function renderAppetenceAlerts(members, skills) {
  const risks = [];
  const strengths = [];

  for (const skill of skills) {
    const stats = getSkillStats(members, skill);
    if (stats.highAppetenceCount === 0 && stats.levels.slice(1).some(c => c > 0)) {
      risks.push({ skill, avgLevel: stats.avgLevel, coverage: stats.coverage, count: 0, motivated: [] });
    } else if (stats.highAppetenceCount >= 2) {
      const motivated = members
        .filter(m => (m.skills[skill]?.appetence ?? 0) >= 3)
        .map(m => ({ name: m.name, initials: m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }));
      strengths.push({ skill, avgLevel: stats.avgLevel, coverage: stats.coverage, count: stats.highAppetenceCount, motivated });
    }
  }

  if (risks.length === 0 && strengths.length === 0) return '';

  const renderRiskCards = (items) => items.map(a => {
    const pct = (a.avgLevel / 4) * 100;
    return `
      <div class="alert-card alert-card--info">
        <div class="alert-card__header">
          <a class="alert-card__skill action-card__link" href="${buildMatrixHash('default', { search: a.skill })}">${escapeHtml(a.skill)}</a>
          <span class="alert-card__badge badge badge--info">Couv. ${a.coverage.toFixed(0)}%</span>
        </div>
        <div class="alert-card__level-gauge">
          <span class="alert-card__level-label">Niveau moy.</span>
          <div class="alert-card__level-track">
            <div class="alert-card__level-fill alert-card__level-fill--info" style="width: ${pct.toFixed(0)}%;"></div>
            <span class="alert-card__level-value">${a.avgLevel.toFixed(1)}</span>
          </div>
          <span class="alert-card__level-max">/4</span>
        </div>
      </div>`;
  }).join('');

  const renderStrengthCards = (items) => items.map(a => {
    const pct = (a.avgLevel / 4) * 100;
    const chips = a.motivated.map(p =>
      `<span class="alert-card__chip"><span class="alert-card__chip-avatar">${p.initials}</span>${escapeHtml(p.name)}</span>`
    ).join('');
    return `
      <div class="alert-card alert-card--success">
        <div class="alert-card__header">
          <a class="alert-card__skill action-card__link" href="${buildMatrixHash('default', { search: a.skill })}">${escapeHtml(a.skill)}</a>
          <span class="alert-card__badge badge badge--success">${a.count} motivé(s)</span>
        </div>
        <div class="alert-card__people">${chips}</div>
        <div class="alert-card__level-gauge">
          <span class="alert-card__level-label">Niveau moy.</span>
          <div class="alert-card__level-track">
            <div class="alert-card__level-fill alert-card__level-fill--success" style="width: ${pct.toFixed(0)}%;"></div>
            <span class="alert-card__level-value">${a.avgLevel.toFixed(1)}</span>
          </div>
          <span class="alert-card__level-max">/4</span>
        </div>
      </div>`;
  }).join('');

  let html = '';

  if (strengths.length > 0) {
    html += `
      <div class="alert-group alert-group--success" style="margin-top: var(--space-4);">
        <div class="alert-group__header">
          <span class="alert-group__icon">🔥</span>
          <span class="alert-group__title">Appétences fortes</span>
          <span class="alert-group__count">${strengths.length}</span>
        </div>
        <div class="alert-group__desc">Compétences avec au moins 2 membres très motivés - levier de montée en compétence</div>
        <div class="alert-group__items">
          ${renderStrengthCards(strengths.sort((a, b) => b.count - a.count).slice(0, 6))}
        </div>
      </div>
    `;
  }

  if (risks.length > 0) {
    html += `
      <div class="alert-group alert-group--info" style="margin-top: var(--space-4);">
        <div class="alert-group__header">
          <span class="alert-group__icon">💡</span>
          <span class="alert-group__title">Risque appétence</span>
          <span class="alert-group__count">${risks.length}</span>
        </div>
        <div class="alert-group__desc">Aucune appétence forte - risque de perte de compétence</div>
        <div class="alert-group__items">
          ${renderRiskCards(risks.slice(0, 6))}
        </div>
      </div>
    `;
  }

  return html;
}

// ── 4. Top Experts ───────────────────────────────────────────────────────────

/**
 * Render the top experts ranking section with podium.
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

  html += '</div>';

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

  html += '</div>';
  return html;
}

// ── 4b. Comparaison inter-groupes ───────────────────────────────────────────

/**
 * Render le bloc de comparaison inter-groupes.
 * Affiche un tableau comparatif avec KPIs par groupe.
 * @param {Object[]} members
 * @param {string[]} allSkills
 * @param {string[]} groups
 * @param {number} threshold
 * @param {Object} categories
 * @returns {string} HTML
 */
function renderGroupComparison(members, allSkills, groups, threshold, categories) {
  const groupStats = groups.map(g => {
    const gMembers = members.filter(m => (m.groups || []).includes(g));
    if (gMembers.length === 0) return { name: g, count: 0, avgLevel: 0, coverage: 0, criticals: 0, experts: 0, topSkill: '-' };

    let totalLevel = 0, totalEntries = 0, expertCount = 0;
    for (const m of gMembers) {
      for (const entry of Object.values(m.skills)) {
        totalEntries++;
        totalLevel += entry.level;
        if (entry.level === 4) expertCount++;
      }
    }
    const avgLevel = totalEntries > 0 ? totalLevel / totalEntries : 0;
    const coverageSum = allSkills.reduce((sum, s) => sum + getSkillStats(gMembers, s).coverage, 0);
    const coverage = allSkills.length > 0 ? coverageSum / allSkills.length : 0;
    const criticals = allSkills.filter(s => isSkillCritical(gMembers, s, threshold)).length;

    // Meilleure compétence du groupe (plus haut niveau moyen)
    let topSkill = '-';
    let topAvg = 0;
    for (const skill of allSkills) {
      const stats = getSkillStats(gMembers, skill);
      if (stats.avgLevel > topAvg) { topAvg = stats.avgLevel; topSkill = skill; }
    }

    return { name: g, count: gMembers.length, avgLevel, coverage, criticals, experts: expertCount, topSkill };
  });

  const rowsHtml = groupStats.map(gs => {
    const coverageColor = gs.coverage >= 75 ? 'var(--color-success)' : gs.coverage >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';
    return `
      <tr class="group-compare-row">
        <td class="group-compare-row__name">
          <a class="action-card__link" href="${buildMatrixHash('default', { group: gs.name })}">${escapeHtml(gs.name)}</a>
        </td>
        <td class="group-compare-row__count">${gs.count}</td>
        <td><span class="group-compare-row__avg">${gs.avgLevel.toFixed(1)}</span></td>
        <td>
          <div class="group-compare-row__bar-wrap">
            <div class="group-compare-row__bar" style="width: ${gs.coverage.toFixed(0)}%; background: ${coverageColor};"></div>
          </div>
          <span class="group-compare-row__pct">${gs.coverage.toFixed(0)}%</span>
        </td>
        <td class="${gs.criticals > 0 ? 'group-compare-row__critical' : ''}">${gs.criticals}</td>
        <td>${gs.experts}</td>
        <td class="group-compare-row__top">${escapeHtml(gs.topSkill)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="card dash-section--collapsible" style="margin-top: var(--space-6);" id="dash-groups">
      <div class="card__header dash-section__toggle" data-collapse="groups-content">
        <h3 class="card__title">Comparaison inter-groupes</h3>
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="badge badge--info">${groups.length} groupe${groups.length > 1 ? 's' : ''}</span>
          <span class="dash-section__chevron">▾</span>
        </div>
      </div>
      <div class="dash-section__body" id="groups-content">
        <div class="group-compare-table-wrap">
          <table class="group-compare-table">
            <thead>
              <tr>
                <th>Groupe</th>
                <th>Membres</th>
                <th>Niveau moy.</th>
                <th>Couverture</th>
                <th>Critiques</th>
                <th>Experts</th>
                <th>Point fort</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ── 5. Répartition par catégorie (collapsible) ──────────────────────────────

/**
 * Render les barres de criticité groupées par catégorie, avec accordéons.
 */
function renderCriticalityByCategory(members, allSkills, categories, threshold) {
  const catEntries = Object.entries(categories);

  if (catEntries.length === 0) {
    // Pas de catégories : liste plate
    return `<div class="criticality-list">${renderCriticalityBars(members, allSkills, threshold)}</div>`;
  }

  const categorized = new Set();
  let html = '';

  for (const [catName, catSkills] of catEntries) {
    const inCategory = catSkills.filter(s => allSkills.includes(s));
    if (inCategory.length === 0) continue;
    for (const s of inCategory) categorized.add(s);

    const critCount = inCategory.filter(s => isSkillCritical(members, s, threshold)).length;

    html += `
      <div class="category-group">
        <div class="category-group__header" data-collapse="cat-${catName.replace(/\s+/g, '-')}">
          <span class="category-group__name">${escapeHtml(catName)}</span>
          <span class="category-group__meta">${inCategory.length} comp. ${critCount > 0 ? `· <span style="color: var(--color-danger);">${critCount} critique(s)</span>` : ''}</span>
          <span class="category-group__chevron">▾</span>
        </div>
        <div class="category-group__body" id="cat-${catName.replace(/\s+/g, '-')}">
          <div class="criticality-list">${renderCriticalityBars(members, inCategory, threshold)}</div>
        </div>
      </div>
    `;
  }

  // Non-catégorisées
  const uncategorized = allSkills.filter(s => !categorized.has(s));
  if (uncategorized.length > 0) {
    html += `
      <div class="category-group">
        <div class="category-group__header" data-collapse="cat-uncategorized">
          <span class="category-group__name" style="font-style: italic;">Non catégorisées</span>
          <span class="category-group__meta">${uncategorized.length} comp.</span>
          <span class="category-group__chevron">▾</span>
        </div>
        <div class="category-group__body" id="cat-uncategorized">
          <div class="criticality-list">${renderCriticalityBars(members, uncategorized, threshold)}</div>
        </div>
      </div>
    `;
  }

  return html;
}

/**
 * Render criticality bars for a list of skills.
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
        <a class="criticality-item__name action-card__link" href="${buildMatrixHash('default', { search: skill })}">${escapeHtml(skill)}</a>
        <div class="criticality-item__bar">${segments}</div>
        ${critical
          ? '<span class="criticality-item__badge badge badge--critical">Critique</span>'
          : '<span class="criticality-item__badge badge badge--success">OK</span>'
        }
      </div>
    `;
  }).join('');
}

// ── 6. Plan de développement individuel ──────────────────────────────────────

/**
 * Render le sélecteur de membre pour le plan de dev.
 */
function renderDevPlansSection(members, allSkills, threshold) {
  if (members.length === 0) return '';

  const options = members.map(m =>
    `<option value="${m.id}">${escapeHtml(m.name)}</option>`
  ).join('');

  return `
    <div class="dev-plan-picker">
      <label class="dev-plan-picker__label" for="dev-plan-member-select">Membre</label>
      <select class="form-select dev-plan-picker__select" id="dev-plan-member-select">
        <option value="">Choisir un membre...</option>
        ${options}
      </select>
    </div>
    <div id="dev-plan-content">
      <div class="dev-plan-empty-state">
        <div class="dev-plan-empty-state__icon">🎯</div>
        <div class="dev-plan-empty-state__text">Sélectionnez un membre pour afficher ses recommandations de progression</div>
      </div>
    </div>
  `;
}

/**
 * Compute a development plan for a single member.
 */
function computeDevPlan(member, allMembers, allSkills, threshold) {
  const recommendations = [];

  for (const skill of allSkills) {
    const entry = member.skills[skill];
    const level = entry?.level ?? 0;
    const appetence = entry?.appetence ?? 0;

    if (level >= 4) continue;

    const stats = getSkillStats(allMembers, skill);
    const confirmedOrExpert = stats.levels[3] + stats.levels[4];
    const isCritical = confirmedOrExpert < threshold;

    let priority = 0;
    let reason = '';

    if (isCritical && appetence >= 2) {
      priority = 3;
      reason = 'Critique + forte appétence';
    } else if (isCritical && level > 0) {
      priority = 2;
      reason = 'Compétence critique';
    } else if (appetence >= 3 && level < 3) {
      priority = 2;
      reason = 'Forte appétence';
    } else if (appetence >= 2 && level < 3) {
      priority = 1;
      reason = 'Appétence moyenne';
    } else {
      continue;
    }

    const mentors = allMembers
      .filter(m => m.id !== member.id && (m.skills[skill]?.level ?? 0) >= 3)
      .map(m => ({ name: m.name, level: m.skills[skill].level, initials: m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }));

    recommendations.push({
      skill, currentLevel: level, targetLevel: Math.min(level + 1, 4),
      appetence, priority, reason, mentors: mentors.slice(0, 3),
    });
  }

  recommendations.sort((a, b) => b.priority - a.priority || b.appetence - a.appetence);
  return { member, recommendations: recommendations.slice(0, 8) };
}

/**
 * Render le plan de dev d'un membre.
 */
function renderDevPlanContent(container, plan) {
  const m = plan.member;
  const initials = m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const skillEntries = Object.values(m.skills);
  const totalSkills = skillEntries.length;
  const avgLevel = totalSkills > 0 ? (skillEntries.reduce((s, e) => s + e.level, 0) / totalSkills) : 0;
  const expertCount = skillEntries.filter(e => e.level >= 4).length;
  const confirmedCount = skillEntries.filter(e => e.level === 3).length;
  const highAppCount = skillEntries.filter(e => e.appetence >= 3).length;

  if (plan.recommendations.length === 0) {
    container.innerHTML = `
      <div class="dev-plan-profile">
        <div class="dev-plan-profile__avatar">${initials}</div>
        <div class="dev-plan-profile__info">
          <div class="dev-plan-profile__name">${escapeHtml(m.name)}</div>
          <div class="dev-plan-profile__role">${m.role ? escapeHtml(m.role) : 'Pas de rôle'}</div>
        </div>
        <div class="dev-plan-profile__stats">
          <span class="dev-plan-profile__stat dev-plan-profile__stat--expert">${expertCount} expert</span>
          <span class="dev-plan-profile__stat dev-plan-profile__stat--confirmed">${confirmedCount} confirmé</span>
        </div>
      </div>
      <div class="dev-plan-empty-state">
        <div class="dev-plan-empty-state__icon">🏆</div>
        <div class="dev-plan-empty-state__text">${escapeHtml(m.name)} est bien positionné(e) - aucune recommandation prioritaire</div>
      </div>
    `;
    return;
  }

  const priorityLabels = { 3: 'Haute', 2: 'Moyenne', 1: 'Basse' };
  const priorityIcons = { 3: '🔴', 2: '🟠', 1: '🔵' };
  const priorityGradients = {
    3: 'linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 100%)',
    2: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
    1: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)',
  };
  const priorityBorders = { 3: '#FECACA', 2: '#FDE68A', 1: '#BFDBFE' };

  container.innerHTML = `
    <div class="dev-plan-profile">
      <div class="dev-plan-profile__avatar">${initials}</div>
      <div class="dev-plan-profile__info">
        <div class="dev-plan-profile__name">${escapeHtml(m.name)}</div>
        <div class="dev-plan-profile__role">${m.role ? escapeHtml(m.role) : 'Pas de rôle'}</div>
      </div>
      <div class="dev-plan-profile__stats">
        <span class="dev-plan-profile__stat dev-plan-profile__stat--expert">${expertCount} expert</span>
        <span class="dev-plan-profile__stat dev-plan-profile__stat--confirmed">${confirmedCount} confirmé</span>
        <span class="dev-plan-profile__stat dev-plan-profile__stat--appetence">${highAppCount} motivé</span>
      </div>
      <div class="dev-plan-profile__score">
        <div class="dev-plan-profile__score-value">${avgLevel.toFixed(1)}</div>
        <div class="dev-plan-profile__score-label">Score moy.</div>
      </div>
    </div>
    <div class="dev-plan-list">
      ${plan.recommendations.map((rec, idx) => {
        const progressPct = Math.round((rec.currentLevel / 4) * 100);
        const targetPct = Math.round((rec.targetLevel / 4) * 100);
        const mentorBadge = rec.mentors.length > 0
          ? `<span class="dev-plan-card__mentor-badge">${rec.mentors.length} mentor${rec.mentors.length > 1 ? 's' : ''}</span>`
          : `<span class="dev-plan-card__mentor-badge dev-plan-card__mentor-badge--none">Externe</span>`;

        return `
        <div class="dev-plan-card" style="background: ${priorityGradients[rec.priority]}; border-color: ${priorityBorders[rec.priority]};">
          <div class="dev-plan-card__rank">${idx + 1}</div>
          <div class="dev-plan-card__body">
            <div class="dev-plan-card__header">
              <span class="dev-plan-card__skill">${escapeHtml(rec.skill)}</span>
              <span class="dev-plan-card__priority">${priorityIcons[rec.priority]} ${priorityLabels[rec.priority]}</span>
            </div>
            <div class="dev-plan-card__progress">
              <div class="dev-plan-card__progress-track">
                <div class="dev-plan-card__progress-current" style="width: ${progressPct}%; background: ${SKILL_LEVELS[rec.currentLevel]?.color};"></div>
                <div class="dev-plan-card__progress-target" style="left: ${targetPct}%;"></div>
              </div>
              <div class="dev-plan-card__progress-labels">
                <span>${getSkillLabel(rec.currentLevel)}</span>
                <span class="dev-plan-card__progress-arrow">→ ${getSkillLabel(rec.targetLevel)}</span>
              </div>
            </div>
            <div class="dev-plan-card__footer">
              <span class="dev-plan-card__reason">${escapeHtml(rec.reason)}</span>
              ${mentorBadge}
            </div>
            ${rec.mentors.length > 0 ? `
              <div class="dev-plan-card__mentors">
                ${rec.mentors.map(mt => `
                  <span class="dev-plan-card__mentor" title="${escapeHtml(mt.name)} - ${mt.level === 4 ? 'Expert' : 'Confirmé'}">
                    <span class="dev-plan-card__mentor-avatar">${mt.initials}</span>
                    ${escapeHtml(mt.name)}
                  </span>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}

// ── Events ───────────────────────────────────────────────────────────────────

/**
 * Bind interactive events for the dashboard.
 */
function bindDashboardEvents(container, members, allSkills, threshold) {
  // Unpin buttons
  container.querySelectorAll('[data-unpin-skill]').forEach(btn => {
    btn.addEventListener('click', () => {
      togglePinnedSkill(btn.dataset.unpinSkill);
    });
  });
  container.querySelectorAll('[data-unpin-member]').forEach(btn => {
    btn.addEventListener('click', () => {
      togglePinnedMember(btn.dataset.unpinMember);
    });
  });

  // Dev plan selector
  const select = container.querySelector('#dev-plan-member-select');
  const content = container.querySelector('#dev-plan-content');

  if (select && content) {
    select.addEventListener('change', () => {
      const memberId = select.value;
      if (!memberId) {
        content.innerHTML = '';
        return;
      }
      const member = members.find(m => m.id === memberId);
      if (!member) return;
      const plan = computeDevPlan(member, members, allSkills, threshold);
      renderDevPlanContent(content, plan);
    });
  }

  // Objectifs cliquables
  container.querySelectorAll('.objective-row--expandable').forEach(row => {
    row.addEventListener('click', () => {
      const toggle = row.querySelector('.objective-row__toggle');
      const wasOpen = row.classList.toggle('objective-row--expanded');
      if (toggle) toggle.textContent = wasOpen ? '▾' : '▸';
    });
  });

  // Tout déplier / replier
  container.querySelector('#objectives-toggle-all')?.addEventListener('click', () => {
    const rows = container.querySelectorAll('.objective-row--expandable');
    const allOpen = [...rows].every(r => r.classList.contains('objective-row--expanded'));
    rows.forEach(r => {
      r.classList.toggle('objective-row--expanded', !allOpen);
      const t = r.querySelector('.objective-row__toggle');
      if (t) t.textContent = allOpen ? '▸' : '▾';
    });
    const btn = container.querySelector('#objectives-toggle-all');
    if (btn) btn.textContent = allOpen ? '▸ Tout' : '▾ Tout';
  });

  // Category accordéons
  container.querySelectorAll('.category-group__header').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.dataset.collapse;
      const body = document.getElementById(targetId);
      const chevron = header.querySelector('.category-group__chevron');
      if (body) {
        const isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : '';
        if (chevron) chevron.textContent = isOpen ? '▸' : '▾';
        header.classList.toggle('category-group__header--collapsed', isOpen);
      }
    });
  });
}

/**
 * Bind collapsible sections (card-level toggle).
 */
function bindCollapsibleSections(container) {
  container.querySelectorAll('.dash-section__toggle').forEach(toggle => {
    toggle.style.cursor = 'pointer';
    toggle.addEventListener('click', () => {
      const targetId = toggle.dataset.collapse;
      const body = document.getElementById(targetId);
      const chevron = toggle.querySelector('.dash-section__chevron');
      if (body) {
        const isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : '';
        if (chevron) chevron.textContent = isOpen ? '▸' : '▾';
      }
    });
  });
}

/**
 * Bind sticky nav + scrollspy.
 */
function bindDashboardNav(container) {
  const links = container.querySelectorAll('#dash-nav .settings-summary__link');
  if (!links.length) return;

  const setActive = (id) => {
    links.forEach(l => l.classList.toggle('settings-summary__link--active', l.dataset.target === id));
  };

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      setActive(link.dataset.target);
      const target = document.getElementById(link.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Scrollspy
  const sections = [...links].map(l => document.getElementById(l.dataset.target)).filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-10% 0px -75% 0px', threshold: 0 });
    sections.forEach(s => observer.observe(s));

    const nav = container.querySelector('#dash-nav');
    if (nav) {
      const mo = new MutationObserver(() => observer.disconnect());
      mo.observe(nav.parentNode || container, { childList: true, subtree: false });
    }
  }
}

// ── Demo Advice ──────────────────────────────────────────────────────────────

/**
 * Render contextual advice when a demo scenario is loaded.
 */
function renderDemoAdvice(state) {
  const demoId = state.activeDemo;
  if (!demoId) return '';

  const scenarios = getDemoScenarios();
  const scenario = scenarios.find(s => s.id === demoId);
  if (!scenario) return '';

  const nameMap = new Map();
  for (const m of state.members) {
    const firstName = m.name.split(' ')[0];
    const initials = m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    nameMap.set(firstName, initials);
    if (m.name !== firstName) nameMap.set(m.name, initials);
  }

  const namesSorted = [...nameMap.keys()].sort((a, b) => b.length - a.length);

  const chipifyAdvice = (html) => {
    let result = html;
    for (const name of namesSorted) {
      const initials = nameMap.get(name);
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
