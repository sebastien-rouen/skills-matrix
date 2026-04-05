/**
 * Export service for generating CSV and JSON outputs.
 */

import { getAllSkillNames, getSkillStats, isSkillCritical } from '../models/data.js';
import { getSkillLabel, getAppetenceLabel, SKILL_LEVELS } from '../utils/helpers.js';

/**
 * Export members data as a CSV string.
 * Format: Nom;Ownership;Appétences;Skill1;Skill2;...
 * Cell values: "level/appetence"
 *
 * @param {Object[]} members - Array of member objects
 * @param {Object} [categories={}] - Categories for skill ordering
 * @param {string} [delimiter=';'] - CSV delimiter character
 * @returns {string} CSV content
 */
export function exportCSV(members, categories = {}, delimiter = ';') {
  if (members.length === 0) return '';

  const skills = getOrderedSkills(members, categories);
  const rows = [];

  // Header row
  rows.push(['Nom', 'Ownership', 'Appétences', 'Groupes', ...skills].join(delimiter));

  // Data rows
  for (const member of members) {
    const groupsStr = (member.groups || []).join(', ');
    const cells = [
      escapeCsvField(member.name, delimiter),
      escapeCsvField(member.role, delimiter),
      escapeCsvField(member.appetences || '', delimiter),
      escapeCsvField(groupsStr, delimiter),
      ...skills.map(skill => {
        const entry = member.skills[skill];
        if (!entry) return '0/0';
        return `${entry.level}/${entry.appetence}`;
      }),
    ];
    rows.push(cells.join(delimiter));
  }

  return rows.join('\n');
}

/**
 * Export a rich detailed CSV with multiple analysis sections.
 * Sections: Synthèse, Matrice détaillée, Analyse par compétence, Profil par membre.
 * @param {Object[]} members - Array of member objects
 * @param {Object} [categories={}] - Categories for skill ordering
 * @param {string} [delimiter=';'] - CSV delimiter character
 * @param {number} [threshold=2] - Critical skill threshold
 * @returns {string} Detailed CSV content
 */
export function exportDetailedCSV(members, categories = {}, delimiter = ';', threshold = 2) {
  if (members.length === 0) return '';

  const d = delimiter;
  const skills = getOrderedSkills(members, categories);
  const rows = [];

  // ── Helper: push a blank separator line ──
  const blank = () => rows.push('');

  // ── Helper: compute member stats ──
  const memberStats = (member) => {
    const entries = Object.values(member.skills);
    const total = entries.length;
    if (total === 0) return { total: 0, avgLevel: 0, expert: 0, confirmed: 0, intermediate: 0, beginner: 0, none: 0, coverage: 0 };
    const levels = entries.map(e => e.level);
    return {
      total,
      avgLevel: (levels.reduce((s, l) => s + l, 0) / total).toFixed(1),
      expert: levels.filter(l => l === 4).length,
      confirmed: levels.filter(l => l === 3).length,
      intermediate: levels.filter(l => l === 2).length,
      beginner: levels.filter(l => l === 1).length,
      none: levels.filter(l => l === 0).length,
      coverage: ((levels.filter(l => l > 0).length / total) * 100).toFixed(0),
    };
  };

  // Pre-compute critical set
  const criticalSkills = skills.filter(s => isSkillCritical(members, s, threshold));
  const nonCriticalSkills = skills.filter(s => !isSkillCritical(members, s, threshold));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SECTION 1 - SYNTHÈSE ÉQUIPE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

  rows.push(`SYNTHÈSE ÉQUIPE`);
  rows.push(`Date d'export${d}${dateStr}`);
  blank();
  rows.push(`Indicateur${d}Valeur`);
  rows.push(`Nombre de membres${d}${members.length}`);
  rows.push(`Nombre de compétences${d}${skills.length}`);

  // Global average level
  let globalLevelSum = 0;
  let globalLevelCount = 0;
  for (const m of members) {
    for (const e of Object.values(m.skills)) {
      globalLevelSum += e.level;
      globalLevelCount++;
    }
  }
  const globalAvg = globalLevelCount > 0 ? (globalLevelSum / globalLevelCount).toFixed(2) : '0';
  const globalCoverage = globalLevelCount > 0
    ? ((members.reduce((s, m) => s + Object.values(m.skills).filter(e => e.level > 0).length, 0) / globalLevelCount) * 100).toFixed(0)
    : '0';

  rows.push(`Niveau moyen global${d}${globalAvg}`);
  rows.push(`Couverture globale${d}${globalCoverage}%`);
  rows.push(`Compétences critiques (seuil < ${threshold} Confirmé+)${d}${criticalSkills.length}`);
  rows.push(`Compétences saines${d}${nonCriticalSkills.length}`);

  // Level distribution
  blank();
  rows.push(`Répartition des niveaux${d}Nombre${d}%`);
  const allLevels = members.flatMap(m => Object.values(m.skills).map(e => e.level));
  for (const sl of SKILL_LEVELS) {
    const count = allLevels.filter(l => l === sl.value).length;
    const pct = allLevels.length > 0 ? ((count / allLevels.length) * 100).toFixed(1) : '0';
    rows.push(`${sl.label} (${sl.value})${d}${count}${d}${pct}%`);
  }

  // Category summary
  const catEntries = Object.entries(categories).filter(([, s]) => s.length > 0);
  if (catEntries.length > 0) {
    blank();
    rows.push(`Catégories${d}Nb compétences`);
    for (const [catName, catSkills] of catEntries) {
      const inData = catSkills.filter(s => skills.includes(s));
      rows.push(`${escapeCsvField(catName, d)}${d}${inData.length}`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SECTION 2 - MATRICE DÉTAILLÉE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  blank();
  blank();
  rows.push('MATRICE DÉTAILLÉE');
  blank();

  // Header: Nom | Ownership | Appétences | Groupes | Skill1 (Niveau) | Skill1 (Appétence) | ...
  const headerParts = ['Nom', 'Ownership', 'Appétences', 'Groupes'];
  for (const skill of skills) {
    headerParts.push(`${skill} (Niveau)`, `${skill} (Appétence)`);
  }
  rows.push(headerParts.join(d));

  // Data rows
  for (const member of members) {
    const cells = [
      escapeCsvField(member.name, d),
      escapeCsvField(member.role, d),
      escapeCsvField(member.appetences || '', d),
      escapeCsvField((member.groups || []).join(', '), d),
    ];
    for (const skill of skills) {
      const entry = member.skills[skill];
      cells.push(
        getSkillLabel(entry?.level ?? 0),
        getAppetenceLabel(entry?.appetence ?? 0)
      );
    }
    rows.push(cells.join(d));
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SECTION 3 - ANALYSE PAR COMPÉTENCE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  blank();
  blank();
  rows.push('ANALYSE PAR COMPÉTENCE');
  blank();

  const skillHeader = [
    'Compétence', 'Catégorie', 'Criticité',
    'Niveau moyen', 'Couverture',
    'Expert (4)', 'Confirmé (3)', 'Intermédiaire (2)', 'Débutant (1)', 'Aucun (0)',
    'Appétence max', 'Forte appétence (nb)',
  ];
  rows.push(skillHeader.join(d));

  // Reverse category lookup
  const skillCategoryMap = {};
  for (const [catName, catSkills] of Object.entries(categories)) {
    for (const s of catSkills) skillCategoryMap[s] = catName;
  }

  for (const skill of skills) {
    const stats = getSkillStats(members, skill);
    const critical = isSkillCritical(members, skill, threshold);
    const cat = skillCategoryMap[skill] || 'Autres';
    rows.push([
      escapeCsvField(skill, d),
      escapeCsvField(cat, d),
      critical ? 'CRITIQUE' : 'OK',
      stats.avgLevel.toFixed(2),
      `${stats.coverage.toFixed(0)}%`,
      stats.levels[4],
      stats.levels[3],
      stats.levels[2],
      stats.levels[1],
      stats.levels[0],
      stats.maxAppetence,
      stats.highAppetenceCount,
    ].join(d));
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SECTION 4 - PROFIL PAR MEMBRE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  blank();
  blank();
  rows.push('PROFIL PAR MEMBRE');
  blank();

  const memberHeader = [
    'Membre', 'Ownership', 'Appétences', 'Groupes',
    'Nb compétences', 'Niveau moyen', 'Couverture',
    'Expert (4)', 'Confirmé (3)', 'Intermédiaire (2)', 'Débutant (1)', 'Aucun (0)',
    'Critiques couvertes', 'Critiques non couvertes',
  ];
  rows.push(memberHeader.join(d));

  for (const member of members) {
    const ms = memberStats(member);
    const coveredCritical = criticalSkills.filter(s => (member.skills[s]?.level ?? 0) >= 3).length;
    const uncoveredCritical = criticalSkills.length - coveredCritical;

    rows.push([
      escapeCsvField(member.name, d),
      escapeCsvField(member.role, d),
      escapeCsvField(member.appetences || '', d),
      escapeCsvField((member.groups || []).join(', '), d),
      ms.total,
      ms.avgLevel,
      `${ms.coverage}%`,
      ms.expert,
      ms.confirmed,
      ms.intermediate,
      ms.beginner,
      ms.none,
      coveredCritical,
      uncoveredCritical,
    ].join(d));
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SECTION 5 - COMPÉTENCES CRITIQUES (détail)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (criticalSkills.length > 0) {
    blank();
    blank();
    rows.push('COMPÉTENCES CRITIQUES - DÉTAIL');
    blank();

    const critHeader = ['Compétence', 'Confirmé+ (nb)', ...members.map(m => m.name)];
    rows.push(critHeader.join(d));

    for (const skill of criticalSkills) {
      const stats = getSkillStats(members, skill);
      const confirmedPlus = stats.levels[3] + stats.levels[4];
      const cells = [
        escapeCsvField(skill, d),
        confirmedPlus,
        ...members.map(m => {
          const level = m.skills[skill]?.level ?? 0;
          return `${level} - ${getSkillLabel(level)}`;
        }),
      ];
      rows.push(cells.join(d));
    }
  }

  return rows.join('\n');
}

/**
 * Export members data as a Markdown document.
 * Sections : synthèse, matrice, compétences critiques, objectifs, priorités de formation, catégories.
 * @param {Object[]} members
 * @param {Object} [categories={}]
 * @param {number} [threshold=2]
 * @param {Object} [objectives={}]
 * @returns {string} Markdown content
 */
export function exportMarkdown(members, categories = {}, threshold = 2, objectives = {}) {
  if (members.length === 0) return '# Skills Matrix\n\nAucune donnée.';

  const skills = getOrderedSkills(members, categories);
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  const lines = [];
  const levelIcons = ['⬜', '🟥', '🟧', '🟦', '🟩'];

  lines.push('# 📊 Skills Matrix - Export');
  lines.push('');
  lines.push(`> Exporté le ${dateStr} - ${members.length} membres, ${skills.length} compétences`);
  lines.push('');

  // ── Synthèse ──
  const criticals = skills.filter(s => isSkillCritical(members, s, threshold));
  lines.push('## 📋 Synthèse');
  lines.push('');
  lines.push(`| Indicateur | Valeur |`);
  lines.push(`|------------|--------|`);
  lines.push(`| Membres | ${members.length} |`);
  lines.push(`| Compétences | ${skills.length} |`);
  lines.push(`| Compétences critiques | ${criticals.length} |`);
  const objEntries = Object.entries(objectives).filter(([s]) => skills.includes(s));
  const objMet = objEntries.filter(([s, o]) => {
    const st = getSkillStats(members, s);
    return (st.levels[3] + st.levels[4]) >= (o.minExperts || 2);
  });
  if (objEntries.length > 0) {
    lines.push(`| Objectifs d'équipe | ${objMet.length}/${objEntries.length} atteints |`);
  }
  lines.push('');

  // ── Matrice ──
  lines.push('## 📊 Matrice des compétences');
  lines.push('');
  const header = `| Membre | Rôle | ${skills.join(' | ')} |`;
  const sep = `|--------|------|${skills.map(() => ':---:').join('|')}|`;
  lines.push(header);
  lines.push(sep);
  for (const m of members) {
    const cells = skills.map(s => {
      const lvl = m.skills[s]?.level ?? 0;
      return levelIcons[lvl];
    });
    lines.push(`| ${m.name} | ${m.role || '-'} | ${cells.join(' | ')} |`);
  }
  lines.push('');
  lines.push('> ⬜ Aucun · 🟥 Débutant · 🟧 Intermédiaire · 🟦 Confirmé · 🟩 Expert');
  lines.push('');

  // ── Objectifs d'équipe ──
  if (objEntries.length > 0) {
    lines.push('## 🎯 Objectifs d\'équipe');
    lines.push('');
    lines.push('| Compétence | Cible | Actuel | Statut |');
    lines.push('|------------|:-----:|:------:|--------|');
    for (const [skill, obj] of objEntries) {
      const target = obj.minExperts || 2;
      const stats = getSkillStats(members, skill);
      const current = stats.levels[3] + stats.levels[4];
      const met = current >= target;
      lines.push(`| ${skill} | ${target} Confirmé+ | ${current} | ${met ? '✅ Atteint' : '⚠️ ' + Math.round((current / target) * 100) + '%'} |`);
    }
    lines.push('');
  }

  // ── Compétences critiques ──
  if (criticals.length > 0) {
    lines.push('## 🚨 Compétences critiques');
    lines.push('');
    lines.push('| Compétence | Confirmé+ | Niv. moyen | Formateurs internes | À former (motivés) |');
    lines.push('|------------|:---------:|:----------:|--------------------|--------------------|');
    for (const s of criticals) {
      const stats = getSkillStats(members, s);
      const confirmed = stats.levels[3] + stats.levels[4];
      const trainers = members.filter(m => (m.skills[s]?.level ?? 0) >= 3).map(m => m.name);
      const learners = members.filter(m => {
        const e = m.skills[s];
        return e && e.level < 3 && (e.appetence ?? 0) >= 2;
      }).map(m => m.name);
      lines.push(`| **${s}** | ${confirmed}/${threshold} | ${stats.avgLevel.toFixed(1)} | ${trainers.join(', ') || '-'} | ${learners.join(', ') || '-'} |`);
    }
    lines.push('');
  }

  // ── Priorités de formation ──
  const trainingPriorities = computeTrainingPrioritiesForExport(members, skills, threshold);
  if (trainingPriorities.length > 0) {
    lines.push('## 📚 Priorités de formation');
    lines.push('');
    lines.push('| # | Compétence | Urgence | Couvert | Formateurs | Candidats motivés |');
    lines.push('|:-:|------------|---------|:-------:|------------|-------------------|');
    trainingPriorities.forEach((p, i) => {
      const urgLabel = p.urgency === 'high' ? '🔴 Haute' : '🟠 Moyenne';
      lines.push(`| ${i + 1} | **${p.skill}** | ${urgLabel} | ${p.confirmedOrExpert}/${threshold} | ${p.trainers.join(', ') || '-'} | ${p.learners.join(', ') || '-'} |`);
    });
    lines.push('');
  }

  // ── Par catégorie ──
  const catEntries = Object.entries(categories).filter(([, s]) => s.length > 0);
  if (catEntries.length > 0) {
    lines.push('## 🏷️ Par catégorie');
    lines.push('');
    for (const [catName, catSkills] of catEntries) {
      lines.push(`### ${catName}`);
      lines.push('');
      for (const s of catSkills) {
        if (!skills.includes(s)) continue;
        const stats = getSkillStats(members, s);
        const crit = isSkillCritical(members, s, threshold);
        lines.push(`- ${crit ? '⚠️' : '✅'} ${s} - moy. ${stats.avgLevel.toFixed(1)}, couverture ${stats.coverage.toFixed(0)}%`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// exportXLSX déplacé dans exporter-xlsx.js (styles, formules, légendes)

/**
 * Calcule les priorités de formation pour l'export (même algo que le dashboard).
 * @param {Object[]} members
 * @param {string[]} skills
 * @param {number} threshold
 * @returns {Object[]}
 */
export function computeTrainingPrioritiesForExport(members, skills, threshold) {
  const priorities = [];
  for (const skill of skills) {
    const stats = getSkillStats(members, skill);
    const confirmedOrExpert = stats.levels[3] + stats.levels[4];
    if (confirmedOrExpert >= threshold) continue;
    const learners = members.filter(m => {
      const e = m.skills[skill];
      return e && e.level < 3 && (e.appetence ?? 0) >= 2;
    });
    const trainers = members.filter(m => (m.skills[skill]?.level ?? 0) >= 3);
    priorities.push({
      skill,
      urgency: confirmedOrExpert === 0 ? 'high' : 'medium',
      confirmedOrExpert,
      learners: learners.map(c => c.name),
      trainers: trainers.map(t => t.name),
      avgLevel: stats.avgLevel,
    });
  }
  priorities.sort((a, b) => {
    if (a.urgency === 'high' && b.urgency !== 'high') return -1;
    if (b.urgency === 'high' && a.urgency !== 'high') return 1;
    return b.learners.length - a.learners.length;
  });
  return priorities.slice(0, 15);
}

/**
 * Export the full application state as a JSON string.
 * @param {Object} state - Application state
 * @returns {string} JSON string
 */
export function exportJSON(state) {
  return JSON.stringify(state, null, 2);
}

/**
 * Parse a JSON string back into application state.
 * @param {string} jsonString - JSON content
 * @returns {Object|null} Parsed state or null on error
 */
export function parseJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.members || !Array.isArray(data.members)) {
      throw new Error('Invalid format: missing members array');
    }
    return data;
  } catch (err) {
    console.error('[Exporter] Failed to parse JSON:', err);
    return null;
  }
}

/**
 * Get skill names ordered by category, then alphabetically.
 * @param {Object[]} members - Array of member objects
 * @param {Object} categories - Categories map
 * @returns {string[]} Ordered skill names
 */
export function getOrderedSkills(members, categories) {
  const allSkills = getAllSkillNames(members);

  if (Object.keys(categories).length === 0) return allSkills;

  const ordered = [];
  const used = new Set();

  for (const [, skillNames] of Object.entries(categories)) {
    for (const name of skillNames) {
      if (allSkills.includes(name) && !used.has(name)) {
        ordered.push(name);
        used.add(name);
      }
    }
  }

  return ordered;
}

/**
 * Escape a field value for CSV (handle delimiter, quotes, newlines).
 * @param {string} value - Raw field value
 * @param {string} [delimiter=';'] - CSV delimiter character
 * @returns {string} Escaped CSV field
 */
function escapeCsvField(value, delimiter = ';') {
  if (!value) return '';
  if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
