/**
 * Vue "Mon profil" - accessible uniquement en mode partage.
 * Affiche au membre connecte : resume, repartition par categorie,
 * plan de developpement, competences de mentorat, forces et lacunes.
 */

import { getState, isShareMode, getShareMemberName } from '../state.js';
import { getCategorizedSkillNames, getSkillStats, isSkillCritical } from '../models/data.js';
import {
  escapeHtml, getInitials, getSkillLabel, getAppetenceIcon,
  SKILL_LEVELS, APPETENCE_LEVELS,
} from '../utils/helpers.js';

/**
 * Render the "Mon profil" view.
 * @param {HTMLElement} container
 */
export function renderMyProfileView(container) {
  const state = getState();
  const memberName = getShareMemberName();

  if (!isShareMode() || !memberName) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">👤</div>
        <h3 class="empty-state__title">Profil indisponible</h3>
        <p class="empty-state__description">Sélectionnez votre nom pour accéder à votre profil.</p>
      </div>`;
    return;
  }

  const member = state.members.find(m => m.name === memberName);
  if (!member) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">❌</div>
        <h3 class="empty-state__title">Membre introuvable</h3>
      </div>`;
    return;
  }

  const allSkills = getCategorizedSkillNames(state.members, state.categories);
  const threshold = state.settings?.criticalThreshold ?? 2;
  const skillEntries = Object.entries(member.skills);
  const totalSkills = skillEntries.length;

  // Statistiques globales du membre
  const levels = skillEntries.map(([, e]) => e.level);
  const avgLevel = totalSkills > 0 ? levels.reduce((a, b) => a + b, 0) / totalSkills : 0;
  const expertCount = levels.filter(l => l >= 4).length;
  const confirmedCount = levels.filter(l => l === 3).length;
  const intermediateCount = levels.filter(l => l === 2).length;
  const beginnerCount = levels.filter(l => l === 1).length;
  const noneCount = levels.filter(l => l === 0).length;
  const filledCount = totalSkills - noneCount;
  const filledPct = totalSkills > 0 ? Math.round((filledCount / totalSkills) * 100) : 0;
  const highAppCount = skillEntries.filter(([, e]) => e.appetence >= 3).length;

  // Competences ou le membre peut mentorer (niveau >= 3, et il y a des collegues en dessous)
  const mentoringSkills = computeMentoringSkills(member, state.members, allSkills);

  // Plan de dev (reutilise l'algo du dashboard)
  const devPlan = computeDevPlan(member, state.members, allSkills, threshold);

  // Repartition par categorie
  const categoryBreakdown = computeCategoryBreakdown(member, state.categories);

  // Forces et lacunes
  const strengths = skillEntries
    .filter(([, e]) => e.level >= 3)
    .sort((a, b) => b[1].level - a[1].level || b[1].appetence - a[1].appetence);
  const gaps = skillEntries
    .filter(([, e]) => e.level <= 1 && e.level >= 0)
    .filter(([name]) => isSkillCritical(state.members, name, threshold))
    .sort((a, b) => a[1].level - b[1].level);

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Mon profil</h1>
        <p class="page-header__subtitle">Votre bilan de competences personnel</p>
      </div>
    </div>

    ${renderProfileHeader(member, avgLevel, expertCount, confirmedCount, highAppCount, filledPct, totalSkills, filledCount)}
    ${renderLevelDistribution(expertCount, confirmedCount, intermediateCount, beginnerCount, noneCount, totalSkills)}
    ${renderCategoryBreakdown(categoryBreakdown)}

    <div class="my-profile-grid">
      ${renderStrengths(strengths)}
      ${renderMentoringSection(mentoringSkills)}
    </div>

    ${renderGaps(gaps, state.members, member)}
    ${renderDevPlanSection(devPlan)}
  `;
}

// ── Sections de rendu ────────────────────────────────────────────────────────

/**
 * En-tete du profil avec avatar, stats et jauge de completion.
 */
function renderProfileHeader(member, avgLevel, expertCount, confirmedCount, highAppCount, filledPct, totalSkills, filledCount) {
  const initials = getInitials(member.name);
  return `
    <div class="my-profile-header card">
      <div class="my-profile-header__left">
        <div class="my-profile-header__avatar">${initials}</div>
        <div class="my-profile-header__info">
          <div class="my-profile-header__name">${escapeHtml(member.name)}</div>
          <div class="my-profile-header__role">${member.role ? escapeHtml(member.role) : 'Pas de rôle défini'}</div>
        </div>
      </div>
      <div class="my-profile-header__stats">
        <div class="my-profile-stat">
          <div class="my-profile-stat__value" style="color: ${SKILL_LEVELS[4].color};">${expertCount}</div>
          <div class="my-profile-stat__label">Expert</div>
        </div>
        <div class="my-profile-stat">
          <div class="my-profile-stat__value" style="color: ${SKILL_LEVELS[3].color};">${confirmedCount}</div>
          <div class="my-profile-stat__label">Confirme</div>
        </div>
        <div class="my-profile-stat">
          <div class="my-profile-stat__value">${highAppCount}</div>
          <div class="my-profile-stat__label">Motive</div>
        </div>
        <div class="my-profile-stat">
          <div class="my-profile-stat__value">${avgLevel.toFixed(1)}</div>
          <div class="my-profile-stat__label">Score moy.</div>
        </div>
      </div>
      <div class="my-profile-header__gauge">
        <div class="my-profile-gauge">
          <div class="my-profile-gauge__bar" style="width: ${filledPct}%;"></div>
        </div>
        <div class="my-profile-gauge__label">${filledCount}/${totalSkills} competences renseignees (${filledPct}%)</div>
      </div>
    </div>`;
}

/**
 * Repartition des niveaux sous forme de barres horizontales.
 */
function renderLevelDistribution(expert, confirmed, intermediate, beginner, none, total) {
  if (total === 0) return '';
  const items = [
    { label: 'Expert', count: expert, color: SKILL_LEVELS[4].color },
    { label: 'Confirme', count: confirmed, color: SKILL_LEVELS[3].color },
    { label: 'Intermédiaire', count: intermediate, color: SKILL_LEVELS[2].color },
    { label: 'Débutant', count: beginner, color: SKILL_LEVELS[1].color },
    { label: 'Non renseigné', count: none, color: SKILL_LEVELS[0].color },
  ];
  return `
    <div class="card my-profile-distrib">
      <div class="card__header"><h3 class="card__title">Répartition des niveaux</h3></div>
      <div class="my-profile-distrib__body">
        ${items.map(i => {
          const pct = Math.round((i.count / total) * 100);
          return `
            <div class="my-profile-distrib__row">
              <span class="my-profile-distrib__label">${i.label}</span>
              <div class="my-profile-distrib__track">
                <div class="my-profile-distrib__fill" style="width: ${pct}%; background: ${i.color};"></div>
              </div>
              <span class="my-profile-distrib__count">${i.count}</span>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

/**
 * Repartition par categorie avec score moyen.
 */
function renderCategoryBreakdown(breakdown) {
  if (breakdown.length === 0) return '';
  return `
    <div class="card my-profile-categories">
      <div class="card__header"><h3 class="card__title">Par catégorie</h3></div>
      <div class="my-profile-categories__grid">
        ${breakdown.map(cat => {
          const pct = Math.round((cat.avgLevel / 4) * 100);
          return `
            <div class="my-profile-cat-card">
              <div class="my-profile-cat-card__header">
                <span class="my-profile-cat-card__name">${escapeHtml(cat.name)}</span>
                <span class="my-profile-cat-card__score">${cat.avgLevel.toFixed(1)}/4</span>
              </div>
              <div class="my-profile-distrib__track">
                <div class="my-profile-distrib__fill" style="width: ${pct}%; background: var(--color-primary);"></div>
              </div>
              <div class="my-profile-cat-card__detail">
                ${cat.skills.map(s => `
                  <span class="my-profile-cat-skill" title="${getSkillLabel(s.level)}${s.appetence > 0 ? ' · Appétence : ' + APPETENCE_LEVELS[s.appetence]?.label : ''}">
                    <span class="my-profile-cat-skill__dot" style="background: ${SKILL_LEVELS[s.level].color};"></span>
                    ${escapeHtml(s.name)}
                    ${s.appetence >= 2 ? `<span class="my-profile-cat-skill__app">${getAppetenceIcon(s.appetence)}</span>` : ''}
                  </span>
                `).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

/**
 * Forces du membre (niveau >= 3).
 */
function renderStrengths(strengths) {
  return `
    <div class="card">
      <div class="card__header"><h3 class="card__title">Mes forces</h3></div>
      <div class="my-profile-list">
        ${strengths.length === 0
          ? '<div class="my-profile-list__empty">Aucune compétence à niveau Confirmé ou Expert pour le moment</div>'
          : strengths.slice(0, 10).map(([name, entry]) => `
            <div class="my-profile-list__item">
              <span class="my-profile-list__dot" style="background: ${SKILL_LEVELS[entry.level].color};"></span>
              <span class="my-profile-list__name">${escapeHtml(name)}</span>
              <span class="my-profile-list__badge" style="background: ${SKILL_LEVELS[entry.level].color}; color: ${SKILL_LEVELS[entry.level].textColor};">${getSkillLabel(entry.level)}</span>
              ${entry.appetence >= 2 ? `<span class="my-profile-list__app">${getAppetenceIcon(entry.appetence)}</span>` : ''}
            </div>`).join('')}
      </div>
    </div>`;
}

/**
 * Competences ou le membre peut mentorer des collegues.
 */
function renderMentoringSection(mentoringSkills) {
  return `
    <div class="card">
      <div class="card__header"><h3 class="card__title">Je peux mentorer</h3></div>
      <div class="my-profile-list">
        ${mentoringSkills.length === 0
          ? '<div class="my-profile-list__empty">Montez en compétence pour débloquer le mentorat</div>'
          : mentoringSkills.slice(0, 8).map(s => `
            <div class="my-profile-list__item">
              <span class="my-profile-list__dot" style="background: ${SKILL_LEVELS[s.level].color};"></span>
              <span class="my-profile-list__name">${escapeHtml(s.skill)}</span>
              <span class="my-profile-list__meta">${s.learnerCount} collegue${s.learnerCount > 1 ? 's' : ''} a accompagner</span>
            </div>`).join('')}
      </div>
    </div>`;
}

/**
 * Lacunes critiques - competences ou l'equipe a besoin de renfort et le membre est bas.
 */
function renderGaps(gaps, allMembers, member) {
  if (gaps.length === 0) return '';
  return `
    <div class="card my-profile-gaps">
      <div class="card__header">
        <h3 class="card__title">Compétences critiques à développer</h3>
        <span class="badge badge--critical">${gaps.length} lacune${gaps.length > 1 ? 's' : ''}</span>
      </div>
      <div class="my-profile-gaps__body">
        ${gaps.slice(0, 6).map(([name, entry]) => {
          const mentors = allMembers
            .filter(m => m.id !== member.id && (m.skills[name]?.level ?? 0) >= 3)
            .slice(0, 3);
          return `
            <div class="my-profile-gap-card">
              <div class="my-profile-gap-card__header">
                <span class="my-profile-gap-card__name">${escapeHtml(name)}</span>
                <span class="my-profile-gap-card__level" style="background: ${SKILL_LEVELS[entry.level].color}; color: ${SKILL_LEVELS[entry.level].textColor};">${getSkillLabel(entry.level)}</span>
              </div>
              ${mentors.length > 0 ? `
                <div class="my-profile-gap-card__mentors">
                  Mentors possibles : ${mentors.map(m => `<span class="my-profile-gap-card__mentor">${escapeHtml(m.name)}</span>`).join(', ')}
                </div>` : ''}
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

/**
 * Plan de développement - recommandations priorisees.
 */
function renderDevPlanSection(plan) {
  if (plan.recommendations.length === 0) {
    return `
      <div class="card" style="margin-top: var(--space-4);">
        <div class="card__header"><h3 class="card__title">Plan de développement</h3></div>
        <div class="my-profile-list__empty" style="padding: var(--space-6);">
          Aucune recommandation - continuez à remplir vos compétences et appétences pour obtenir des suggestions.
        </div>
      </div>`;
  }

  const priorityLabels = { 3: 'Haute', 2: 'Moyenne', 1: 'Basse' };
  const priorityColors = { 3: 'var(--color-danger)', 2: 'var(--color-warning)', 1: 'var(--color-primary)' };

  return `
    <div class="card" style="margin-top: var(--space-4);">
      <div class="card__header"><h3 class="card__title">Plan de développement</h3></div>
      <div class="my-profile-devplan">
        ${plan.recommendations.map((rec, idx) => {
          const mentorHtml = rec.mentors.length > 0
            ? `<span class="my-profile-devplan__trainers">Formateurs : ${rec.mentors.map(m =>
                `<span class="my-profile-devplan__trainer"><span class="my-profile-devplan__trainer-avatar">${escapeHtml(m.initials)}</span>${escapeHtml(m.name)}</span>`
              ).join('')}</span>`
            : '<span class="my-profile-devplan__no-trainer">Pas de formateur interne</span>';
          return `
            <div class="my-profile-devplan__item">
              <div class="my-profile-devplan__rank" style="background: ${priorityColors[rec.priority]};">${idx + 1}</div>
              <div class="my-profile-devplan__body">
                <div class="my-profile-devplan__row1">
                  <span class="my-profile-devplan__skill">${escapeHtml(rec.skill)}</span>
                  <span class="my-profile-devplan__levels">${getSkillLabel(rec.currentLevel)} → ${getSkillLabel(rec.targetLevel)}</span>
                  <span class="my-profile-devplan__priority" style="color: ${priorityColors[rec.priority]};">${priorityLabels[rec.priority]}</span>
                </div>
                <div class="my-profile-devplan__row2">
                  ${mentorHtml}
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ── Calculs ──────────────────────────────────────────────────────────────────

/**
 * Calcule les competences ou le membre peut mentorer des collegues.
 */
function computeMentoringSkills(member, allMembers, allSkills) {
  const results = [];
  for (const skill of allSkills) {
    const myLevel = member.skills[skill]?.level ?? 0;
    if (myLevel < 3) continue;
    const learners = allMembers.filter(m =>
      m.id !== member.id && (m.skills[skill]?.level ?? 0) < myLevel - 1
    );
    if (learners.length > 0) {
      results.push({ skill, level: myLevel, learnerCount: learners.length });
    }
  }
  return results.sort((a, b) => b.learnerCount - a.learnerCount);
}

/**
 * Calcule la repartition par categorie pour un membre.
 */
function computeCategoryBreakdown(member, categories) {
  if (!categories || Object.keys(categories).length === 0) return [];
  return Object.entries(categories).map(([catName, skills]) => {
    const memberSkills = skills.map(s => ({
      name: s,
      level: member.skills[s]?.level ?? 0,
      appetence: member.skills[s]?.appetence ?? 0,
    }));
    const avg = memberSkills.length > 0
      ? memberSkills.reduce((sum, s) => sum + s.level, 0) / memberSkills.length
      : 0;
    return { name: catName, avgLevel: avg, skills: memberSkills };
  });
}

/**
 * Calcule le plan de developpement pour un membre (meme algo que dashboard).
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
      .map(m => ({
        name: m.name,
        level: m.skills[skill].level,
        initials: getInitials(m.name),
      }))
      .slice(0, 3);

    recommendations.push({ skill, currentLevel: level, targetLevel: Math.min(level + 1, 4), appetence, priority, reason, mentors });
  }

  recommendations.sort((a, b) => b.priority - a.priority || b.appetence - a.appetence);
  return { member, recommendations: recommendations.slice(0, 8) };
}
