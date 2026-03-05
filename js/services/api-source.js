/**
 * API Source service - Import de donnees depuis une URL externe.
 * Gere la configuration (URL + token), le test de connexion et l'import.
 */

import { createMember, createSkillEntry } from '../models/data.js';
import { generateId } from '../utils/helpers.js';

const STORAGE_KEY = 'skills-matrix-api-settings';

/**
 * Charger les parametres API depuis localStorage.
 * @returns {{ url: string, token: string }}
 */
export function loadApiSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { url: '', token: '' };
}

/**
 * Sauvegarder les parametres API dans localStorage.
 * @param {string} url
 * @param {string} token
 */
export function saveApiSettings(url, token) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, token }));
}

/**
 * Supprimer les parametres API.
 */
export function clearApiSettings() {
  localStorage.removeItem(STORAGE_KEY);
}

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
 * Valider la structure du JSON recu.
 * Format attendu :
 * {
 *   members: [
 *     { name, role?, appetences?, skills: { [name]: { level: 0-4, appetence?: 0-3 } } }
 *   ]
 * }
 * @param {*} data
 * @returns {{ valid: boolean, error?: string, memberCount?: number, skillCount?: number }}
 */
export function validateApiData(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Reponse invalide (pas un objet JSON)' };
  }
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
    for (const skillName of Object.keys(member.skills)) {
      allSkills.add(skillName);
    }
  }

  return {
    valid: true,
    memberCount: data.members.length,
    skillCount: allSkills.size,
  };
}

/**
 * Tester la connexion et retourner les donnees validees.
 * @param {string} url
 * @param {string} token
 * @returns {Promise<{ success: boolean, data?: Object, error?: string, memberCount?: number, skillCount?: number }>}
 */
export async function testConnection(url, token) {
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
    const validation = validateApiData(data);

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    return {
      success: true,
      data,
      memberCount: validation.memberCount,
      skillCount: validation.skillCount,
    };
  } catch (error) {
    const msg = error.name === 'TypeError'
      ? 'Impossible de joindre l\'URL (CORS ou reseau)'
      : error.message;
    return { success: false, error: msg };
  }
}

/**
 * Convertir les donnees API en membres compatibles avec le state.
 * @param {Object} apiData - Donnees validees depuis l'API
 * @returns {Object[]} Tableau de membres prets a etre injectes dans le state
 */
export function convertApiDataToMembers(apiData) {
  return apiData.members.map(raw => {
    const skills = {};

    for (const [skillName, entry] of Object.entries(raw.skills || {})) {
      const trimmed = skillName.trim();
      if (!trimmed) continue;

      if (typeof entry === 'number') {
        // Format simplifie : { "JavaScript": 3 }
        skills[trimmed] = createSkillEntry(entry, 0);
      } else if (entry && typeof entry === 'object') {
        // Format complet : { "JavaScript": { level: 3, appetence: 2 } }
        skills[trimmed] = createSkillEntry(entry.level, entry.appetence);
      }
    }

    return {
      id: generateId(),
      name: (raw.name || 'Sans nom').trim(),
      role: (raw.role || '').trim(),
      appetences: (raw.appetences || '').trim(),
      skills,
    };
  });
}
