/**
 * API Source service - Import de donnees depuis des sources API externes.
 * Gere une liste de sources configurables (URL + token + type).
 */

import { createSkillEntry } from '../models/data.js';
import { generateId } from '../utils/helpers.js';

const STORAGE_KEY = 'skills-matrix-api-sources';

// ============================================================
// Gestion des sources (CRUD localStorage)
// ============================================================

/**
 * Charger la liste des sources API.
 * @returns {Array<{ id: string, name: string, url: string, token: string, type: string }>}
 */
export function loadApiSources() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
}

/**
 * Sauvegarder la liste des sources.
 * @param {Array} sources
 */
export function saveApiSources(sources) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
}

/**
 * Ajouter une source.
 * @param {{ name: string, url: string, token: string, type: string }} source
 * @returns {Array} Liste mise a jour
 */
export function addApiSource(source) {
  const sources = loadApiSources();
  sources.push({ ...source, id: generateId() });
  saveApiSources(sources);
  return sources;
}

/**
 * Supprimer une source par ID.
 * @param {string} id
 * @returns {Array} Liste mise a jour
 */
export function removeApiSource(id) {
  const sources = loadApiSources().filter(s => s.id !== id);
  saveApiSources(sources);
  return sources;
}

/**
 * Mettre a jour une source.
 * @param {string} id
 * @param {Object} updates
 * @returns {Array} Liste mise a jour
 */
export function updateApiSource(id, updates) {
  const sources = loadApiSources();
  const idx = sources.findIndex(s => s.id === id);
  if (idx >= 0) sources[idx] = { ...sources[idx], ...updates };
  saveApiSources(sources);
  return sources;
}

// ============================================================
// Connexion et fetch
// ============================================================

/**
 * Construire les headers d'authentification.
 * @param {string} token
 * @returns {HeadersInit}
 */
function buildHeaders(token) {
  const headers = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

/**
 * Fetcher une URL et retourner les donnees brutes.
 * @param {string} url
 * @param {string} token
 * @returns {Promise<{ success: boolean, data?: *, error?: string }>}
 */
export async function fetchSource(url, token) {
  if (!url) {
    return { success: false, error: 'Saisissez une URL' };
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(token),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Erreur HTTP ${response.status} (${response.statusText})`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    const msg = error.name === 'TypeError'
      ? 'Impossible de joindre l\'URL (CORS ou reseau)'
      : error.message;
    return { success: false, error: msg };
  }
}

// ============================================================
// Validation par type
// ============================================================

/**
 * Valider les donnees selon le type de source.
 * @param {*} data
 * @param {string} type - 'members' | 'skills' | 'groups'
 * @returns {{ valid: boolean, error?: string, summary?: string }}
 */
export function validateApiData(data, type) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Reponse invalide (pas un objet JSON)' };
  }

  if (type === 'members') {
    if (!Array.isArray(data.members) || data.members.length === 0) {
      return { valid: false, error: 'Le champ "members" est manquant ou vide' };
    }
    const allSkills = new Set();
    for (const member of data.members) {
      if (!member.name || typeof member.name !== 'string') {
        return { valid: false, error: 'Un membre n\'a pas de nom valide' };
      }
      if (!member.skills || typeof member.skills !== 'object') {
        return { valid: false, error: `Membre "${member.name}" : champ "skills" manquant` };
      }
      for (const s of Object.keys(member.skills)) allSkills.add(s);
    }
    return {
      valid: true,
      summary: `${data.members.length} membre(s), ${allSkills.size} competence(s)`,
    };
  }

  if (type === 'skills') {
    if (!Array.isArray(data.skills) || data.skills.length === 0) {
      return { valid: false, error: 'Le champ "skills" est manquant ou vide' };
    }
    return {
      valid: true,
      summary: `${data.skills.length} competence(s)`,
    };
  }

  if (type === 'groups') {
    if (!Array.isArray(data.groups) || data.groups.length === 0) {
      return { valid: false, error: 'Le champ "groups" est manquant ou vide' };
    }
    for (const g of data.groups) {
      if (!g.name || typeof g.name !== 'string') {
        return { valid: false, error: 'Un groupe n\'a pas de nom valide' };
      }
    }
    const totalMembers = new Set(data.groups.flatMap(g => g.members || [])).size;
    return {
      valid: true,
      summary: `${data.groups.length} groupe(s), ${totalMembers} membre(s)`,
    };
  }

  return { valid: false, error: `Type de source inconnu : "${type}"` };
}

/**
 * Tester la connexion d'une source.
 * @param {string} url
 * @param {string} token
 * @param {string} type
 * @returns {Promise<{ success: boolean, data?: *, error?: string, summary?: string }>}
 */
export async function testConnection(url, token, type) {
  const result = await fetchSource(url, token);
  if (!result.success) return result;

  const validation = validateApiData(result.data, type);
  if (!validation.valid) return { success: false, error: validation.error };

  return { success: true, data: result.data, summary: validation.summary };
}

// ============================================================
// Conversion des donnees
// ============================================================

/**
 * Convertir les donnees API (type members) en membres pour le state.
 * @param {Object} apiData
 * @returns {Object[]}
 */
export function convertApiDataToMembers(apiData) {
  return apiData.members.map(raw => {
    const skills = {};

    for (const [skillName, entry] of Object.entries(raw.skills || {})) {
      const trimmed = skillName.trim();
      if (!trimmed) continue;

      if (typeof entry === 'number') {
        skills[trimmed] = createSkillEntry(entry, 0);
      } else if (entry && typeof entry === 'object') {
        skills[trimmed] = createSkillEntry(entry.level, entry.appetence);
      }
    }

    // Normaliser les groupes
    let groups = [];
    if (Array.isArray(raw.groups)) {
      groups = raw.groups.map(g => String(g).trim()).filter(Boolean);
    } else if (typeof raw.groups === 'string' && raw.groups) {
      groups = raw.groups.split(',').map(g => g.trim()).filter(Boolean);
    }

    return {
      id: generateId(),
      name: (raw.name || 'Sans nom').trim(),
      role: (raw.role || '').trim(),
      appetences: (raw.appetences || '').trim(),
      groups,
      skills,
    };
  });
}

/**
 * Extraire la liste des skills depuis une source type 'skills'.
 * @param {Object} apiData - { skills: string[] }
 * @returns {string[]}
 */
export function convertApiDataToSkills(apiData) {
  return apiData.skills
    .map(s => String(s).trim())
    .filter(Boolean);
}

/**
 * Appliquer les groupes depuis une source type 'groups' aux membres existants.
 * @param {Object} apiData - { groups: [{ name, members: string[] }] }
 * @param {Object[]} existingMembers - Membres existants dans le state
 * @returns {Object[]} Membres mis a jour avec les groupes assignes
 */
export function applyGroupsToMembers(apiData, existingMembers) {
  const updated = existingMembers.map(m => ({ ...m, groups: [...(m.groups || [])] }));

  for (const group of apiData.groups) {
    const groupName = group.name?.trim();
    if (!groupName) continue;

    for (const memberName of (group.members || [])) {
      const trimmed = memberName.trim();
      const member = updated.find(m => m.name.toLowerCase() === trimmed.toLowerCase());
      if (member && !member.groups.includes(groupName)) {
        member.groups.push(groupName);
      }
    }
  }

  return updated;
}

// ============================================================
// Labels et constantes
// ============================================================

/** Types de sources disponibles */
export const SOURCE_TYPES = [
  { value: 'members', label: 'Membres + Skills' },
  { value: 'skills', label: 'Liste de skills' },
  { value: 'groups', label: 'Groupes' },
];

/**
 * Obtenir le label d'un type de source.
 * @param {string} type
 * @returns {string}
 */
export function getSourceTypeLabel(type) {
  return SOURCE_TYPES.find(t => t.value === type)?.label || type;
}
