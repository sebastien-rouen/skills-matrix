/**
 * Data model definitions and validation for the Skills Matrix.
 * Provides factory functions and schema validation.
 */

import { generateId, clamp } from '../utils/helpers.js';

/**
 * Create a new member object with default values.
 * @param {Object} props - Member properties
 * @param {string} props.name - Member full name
 * @param {string} [props.role=''] - Member ownership (comma-separated)
 * @param {string} [props.appetences=''] - Member appetences (free text)
 * @param {string[]} [props.groups=[]] - Groups the member belongs to
 * @param {Object} [props.skills={}] - Skills map { skillName: { level, appetence } }
 * @returns {Object} Member object with generated ID
 */
export function createMember({ name, role = '', appetences = '', groups = [], skills = {} } = {}) {
  return {
    id: generateId(),
    name: name?.trim() || 'Sans nom',
    role: role?.trim() || '',
    appetences: appetences?.trim() || '',
    groups: Array.isArray(groups) ? groups.map(g => g.trim()).filter(Boolean) : [],
    skills: { ...skills },
  };
}

/**
 * Create a skill entry for a member.
 * @param {number} [level=0] - Skill level (0-4)
 * @param {number} [appetence=0] - Appetence level (0-3)
 * @returns {Object} Skill entry { level, appetence }
 */
export function createSkillEntry(level = 0, appetence = 0) {
  return {
    level: clamp(Number(level) || 0, 0, 4),
    appetence: clamp(Number(appetence) || 0, 0, 3),
  };
}

/**
 * Validate and sanitize a member object.
 * @param {Object} member - Raw member data
 * @returns {Object} Sanitized member object
 */
export function validateMember(member) {
  const sanitized = createMember({
    name: member.name,
    role: member.role,
    appetences: member.appetences,
    groups: member.groups,
  });

  if (member.id) sanitized.id = member.id;

  if (member.skills && typeof member.skills === 'object') {
    for (const [skillName, entry] of Object.entries(member.skills)) {
      if (skillName.trim()) {
        sanitized.skills[skillName.trim()] = createSkillEntry(
          entry?.level,
          entry?.appetence
        );
      }
    }
  }

  return sanitized;
}

/**
 * Get all unique skill names across all members.
 * @param {Object[]} members - Array of member objects
 * @returns {string[]} Sorted list of unique skill names
 */
export function getAllSkillNames(members) {
  const names = new Set();
  for (const member of members) {
    for (const skillName of Object.keys(member.skills)) {
      names.add(skillName);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'fr'));
}

/**
 * Get all unique roles across all members.
 * @param {Object[]} members - Array of member objects
 * @returns {string[]} Sorted list of unique roles
 */
export function getAllRoles(members) {
  const roles = new Set();
  for (const member of members) {
    if (member.role) roles.add(member.role);
  }
  return [...roles].sort((a, b) => a.localeCompare(b, 'fr'));
}

/**
 * Get all unique groups across all members.
 * @param {Object[]} members - Array of member objects
 * @returns {string[]} Sorted list of unique group names
 */
export function getAllGroups(members) {
  const groups = new Set();
  for (const member of members) {
    for (const g of (member.groups || [])) {
      if (g) groups.add(g);
    }
  }
  return [...groups].sort((a, b) => a.localeCompare(b, 'fr'));
}

/**
 * Compute skill statistics across all members.
 * @param {Object[]} members - Array of member objects
 * @param {string} skillName - Skill to analyze
 * @returns {Object} Stats: { total, none, beginner, intermediate, confirmed, expert, avgLevel, maxAppetence, coverage }
 */
export function getSkillStats(members, skillName) {
  const stats = {
    total: members.length,
    levels: [0, 0, 0, 0, 0], // count per level 0-4
    avgLevel: 0,
    maxAppetence: 0,
    highAppetenceCount: 0,
    coverage: 0,
  };

  let levelSum = 0;
  let withSkill = 0;

  for (const member of members) {
    const entry = member.skills[skillName];
    const level = entry?.level ?? 0;
    const appetence = entry?.appetence ?? 0;

    stats.levels[level]++;
    levelSum += level;
    if (level > 0) withSkill++;
    if (appetence > stats.maxAppetence) stats.maxAppetence = appetence;
    if (appetence >= 3) stats.highAppetenceCount++;
  }

  stats.avgLevel = members.length > 0 ? levelSum / members.length : 0;
  stats.coverage = members.length > 0 ? (withSkill / members.length) * 100 : 0;

  return stats;
}

/**
 * Determine if a skill is critical (fewer than threshold people at Confirmed or Expert level).
 * @param {Object[]} members - Array of member objects
 * @param {string} skillName - Skill to check
 * @param {number} [threshold=2] - Minimum confirmed/expert count
 * @returns {boolean} True if the skill is critical
 */
export function isSkillCritical(members, skillName, threshold = 2) {
  const stats = getSkillStats(members, skillName);
  const confirmedOrExpert = stats.levels[3] + stats.levels[4];
  return confirmedOrExpert < threshold;
}

/**
 * Build default categories from skill names using a simple heuristic.
 * @param {string[]} skillNames - List of skill names
 * @param {Object} [existingCategories={}] - Existing category assignments
 * @returns {Object} Categories map { categoryName: [skillName, ...] }
 */
export function buildCategories(skillNames, existingCategories = {}) {
  // Collect already-categorized skills
  const categorized = new Set();
  for (const skills of Object.values(existingCategories)) {
    for (const s of skills) categorized.add(s);
  }

  const result = { ...existingCategories };

  // Put uncategorized skills into "Autres"
  for (const name of skillNames) {
    if (!categorized.has(name)) {
      if (!result['Autres']) result['Autres'] = [];
      result['Autres'].push(name);
    }
  }

  return result;
}

/**
 * Create a complete application state object with defaults.
 * @returns {Object} Default application state
 */
export function createDefaultState() {
  return {
    members: [],
    categories: {},
    activeDemo: null,
    filters: {
      search: '',
      category: '',
      role: '',
      group: '',
      minLevel: 0,
      showCriticalOnly: false,
    },
    settings: {
      criticalThreshold: 2,
      skillNameMaxLength: 12,
      csvDelimiter: ';',
    },
    activeTemplate: null,
    autoSaveTemplate: true,
  };
}
