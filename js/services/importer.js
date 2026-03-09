/**
 * Import service for parsing CSV/TSV data into member objects.
 * Supports auto-detection of delimiter and flexible cell formats.
 */

import { createMember, createSkillEntry } from '../models/data.js';

/**
 * Detect the delimiter used in the raw input text.
 * Checks for tab (TSV), semicolon, or comma (CSV).
 * @param {string} text - Raw pasted text
 * @returns {string} Detected delimiter character
 */
export function detectDelimiter(text) {
  const firstLine = text.split('\n')[0] || '';

  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;

  if (tabCount >= semiCount && tabCount >= commaCount && tabCount > 0) return '\t';
  if (semiCount >= commaCount && semiCount > 0) return ';';
  if (commaCount > 0) return ',';

  return '\t'; // default fallback
}

/**
 * Parse a skill cell value into { level, appetence }.
 * Supports formats: "3/2", "3;2", "3-2", "3", or empty.
 * @param {string} cellValue - Raw cell value
 * @returns {Object} { level: number, appetence: number }
 */
export function parseSkillCell(cellValue) {
  const trimmed = (cellValue || '').trim();
  if (!trimmed || trimmed === '-' || trimmed === '') {
    return { level: 0, appetence: 0 };
  }

  // Try splitting by / ; or -
  const parts = trimmed.split(/[\/;\-]/);

  const level = Math.min(4, Math.max(0, parseInt(parts[0], 10) || 0));
  const appetence = parts.length > 1
    ? Math.min(3, Math.max(0, parseInt(parts[1], 10) || 0))
    : 0;

  return { level, appetence };
}

/**
 * Parse raw CSV/TSV text into an array of member objects.
 * Expected format:
 *   Header row: Nom, Ownership, Appétences, Skill1, Skill2, ...
 *   Data rows:  John, Dev, IA/Cloud, 3/2, 1/1, ...
 *
 * @param {string} text - Raw pasted text
 * @returns {Object} { members: Object[], skills: string[], errors: string[] }
 */
export function parseImportData(text) {
  const errors = [];

  if (!text || !text.trim()) {
    errors.push('Le texte est vide.');
    return { members: [], skills: [], errors };
  }

  const delimiter = detectDelimiter(text);
  const lines = text.trim().split('\n').map(line => line.trim()).filter(Boolean);

  if (lines.length < 2) {
    errors.push('Au moins 2 lignes requises (en-tête + données).');
    return { members: [], skills: [], errors };
  }

  // Parse header row
  const headers = lines[0].split(delimiter).map(h => h.trim());

  if (headers.length < 4) {
    errors.push('L\'en-tête doit contenir au moins : Nom, Ownership, Appétences et une compétence (ou Groupes + une compétence).');
    return { members: [], skills: [], errors };
  }

  // Detecter si la colonne 3 (index 3) est "Groupes"
  const col3 = headers[3]?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
  const hasGroupsCol = col3.startsWith('groupe');
  const skillStart = hasGroupsCol ? 4 : 3;

  if (headers.length <= skillStart) {
    errors.push('L\'en-tête doit contenir au moins une compétence après les colonnes fixes.');
    return { members: [], skills: [], errors };
  }

  const skillNames = headers.slice(skillStart);
  const members = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delimiter).map(c => c.trim());
    const name = cells[0] || '';
    const role = cells[1] || '';
    const appetences = cells[2] || '';
    const groups = hasGroupsCol
      ? (cells[3] || '').split(',').map(g => g.trim()).filter(Boolean)
      : [];

    if (!name) {
      errors.push(`Ligne ${i + 1}: nom manquant, ligne ignorée.`);
      continue;
    }

    const skills = {};
    for (let j = 0; j < skillNames.length; j++) {
      const cellValue = cells[j + skillStart] || '';
      const { level, appetence } = parseSkillCell(cellValue);
      skills[skillNames[j]] = createSkillEntry(level, appetence);
    }

    members.push(createMember({ name, role, appetences, groups, skills }));
  }

  return { members, skills: skillNames, errors };
}

/**
 * Generate a CSV template string for users to fill in.
 * @param {string[]} [skillNames=[]] - Optional predefined skill names
 * @returns {string} CSV template content
 */
export function generateTemplate(skillNames = []) {
  const defaultSkills = skillNames.length > 0
    ? skillNames
    : ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL', 'Docker', 'Git'];

  const header = ['Nom', 'Ownership', 'Appétences', 'Groupes', ...defaultSkills].join(';');
  const example1 = ['Jean Dupont', 'Développeur', 'IA, Cloud', 'Mission X, Tribu Data', ...defaultSkills.map(() =>
    `${Math.floor(Math.random() * 5)}/${Math.floor(Math.random() * 4)}`)].join(';');
  const example2 = ['Marie Martin', 'Tech Lead', 'Architecture, DevOps', 'Mission Y', ...defaultSkills.map(() =>
    `${Math.floor(Math.random() * 5)}/${Math.floor(Math.random() * 4)}`)].join(';');

  return [
    '# Format: Niveau(0-4)/Appétence(0-3)',
    '# Niveaux: 0=Aucun, 1=Débutant, 2=Intermédiaire, 3=Confirmé, 4=Expert',
    '# Appétence: 0=Aucune, 1=Faible, 2=Moyen, 3=Fort',
    '#',
    header,
    example1,
    example2,
  ].join('\n');
}

/**
 * Validate parsed import data and return a summary.
 * @param {Object} parseResult - Result from parseImportData
 * @returns {Object} Validation summary with counts and status
 */
export function validateImport(parseResult) {
  const { members, skills, errors } = parseResult;

  return {
    isValid: members.length > 0,
    memberCount: members.length,
    skillCount: skills.length,
    errorCount: errors.length,
    errors,
    summary: members.length > 0
      ? `${members.length} membre(s) avec ${skills.length} compétence(s) détectée(s).`
      : 'Aucun membre détecté.',
  };
}
