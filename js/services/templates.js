/**
 * Custom templates service.
 * Primary: JSON files in templates/ via Express API (/api/templates).
 * Fallback: localStorage when the server is not running.
 */

import { createMember } from '../models/data.js';
import { downloadFile } from '../utils/helpers.js';

const API_URL = '/api/templates';
const LS_KEY = 'skills-matrix-templates';

/** @type {boolean|null} Cached server availability (null = not checked yet) */
let serverAvailable = null;

/**
 * Check if the Express API server is reachable.
 * Caches the result for the session.
 * @returns {Promise<boolean>}
 */
async function isServerAvailable() {
  if (serverAvailable !== null) return serverAvailable;
  try {
    const res = await fetch(API_URL);
    if (!res.ok) { serverAvailable = false; return false; }
    const data = await res.json();
    // Notre API retourne un tableau JSON — si ce n'est pas le cas, ce n'est pas notre serveur
    serverAvailable = Array.isArray(data);
  } catch {
    serverAvailable = false;
  }
  return serverAvailable;
}

/**
 * Force re-check server availability (e.g. after a failed call).
 */
function resetServerCheck() {
  serverAvailable = null;
}

// ── localStorage helpers ──

function getLSTemplates() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function setLSTemplates(templates) {
  localStorage.setItem(LS_KEY, JSON.stringify(templates));
}

// ── Public API ──

/**
 * Get all templates (server files + localStorage fallback).
 * @returns {Promise<{templates: Object[], fromServer: boolean}>}
 */
export async function getCustomTemplates() {
  const online = await isServerAvailable();

  if (online) {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('API error');
      const index = await res.json();
      const results = await Promise.all(
        index.map(async (entry) => {
          try {
            const r = await fetch('templates/' + entry.file);
            if (!r.ok) return null;
            const tpl = await r.json();
            // Propager le flag local/builtIn depuis l'index
            tpl.local = !!entry.local;
            tpl.builtIn = !entry.local;
            return tpl;
          } catch { return null; }
        })
      );
      return { templates: results.filter(Boolean), fromServer: true };
    } catch {
      resetServerCheck();
    }
  }

  // Fallback localStorage (tous les templates LS sont "locaux")
  const lsTemplates = getLSTemplates().map(t => ({ ...t, local: true, builtIn: false }));
  return { templates: lsTemplates, fromServer: false };
}

/**
 * Create a new template.
 * Tries the API first, falls back to localStorage.
 * @param {Object} template - { title, description, members, categories }
 * @returns {Promise<{success: boolean, fromServer: boolean, data?: Object}>}
 */
export async function saveCustomTemplate(template) {
  const id = slugify(template.title);
  const payload = {
    id,
    title: template.title,
    description: template.description || '',
    members: template.members,
    categories: template.categories || {},
  };

  const online = await isServerAvailable();

  if (online) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, fromServer: true, data };
      }
      // Le serveur a repondu mais refuse (405, 500…) — fallback localStorage
    } catch {
      // Erreur reseau — fallback localStorage
    }
    resetServerCheck();
  }

  // Fallback localStorage
  const entry = { ...payload, createdAt: new Date().toISOString() };
  const templates = getLSTemplates();
  const idx = templates.findIndex(t => t.id === id);
  if (idx >= 0) templates[idx] = entry;
  else templates.push(entry);
  setLSTemplates(templates);
  return { success: true, fromServer: false, data: entry };
}

/**
 * Delete a template by id.
 * Tries the API first, falls back to localStorage.
 * @param {string} id - Template id
 * @returns {Promise<{success: boolean, fromServer: boolean}>}
 */
export async function deleteCustomTemplate(id) {
  const online = await isServerAvailable();

  if (online) {
    try {
      const res = await fetch(`${API_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) return { success: true, fromServer: true };
      if (res.status === 403) return { success: false, fromServer: true, reason: 'builtin' };
    } catch {
      resetServerCheck();
    }
  }

  // Fallback localStorage
  const templates = getLSTemplates();
  const filtered = templates.filter(t => t.id !== id);
  if (filtered.length === templates.length) return { success: false, fromServer: false };
  setLSTemplates(filtered);
  return { success: true, fromServer: false };
}

/**
 * Load a template's data by id.
 * Assigns fresh IDs to members via createMember.
 * @param {string} id - Template id
 * @returns {Promise<Object|null>} { members, categories } or null
 */
export async function loadCustomTemplate(id) {
  const { templates } = await getCustomTemplates();
  const tpl = templates.find(t => t.id === id);
  if (!tpl) return null;

  const members = tpl.members.map(m =>
    createMember({
      name: m.name,
      role: m.role,
      appetences: m.appetences || '',
      groups: m.groups || [],
      skills: m.skills,
    })
  );

  return { members, categories: tpl.categories || {} };
}

/**
 * Export a template as a downloadable JSON file.
 * @param {Object} template - Template object to export
 */
export function exportTemplateAsFile(template) {
  const data = {
    id: template.id,
    title: template.title,
    description: template.description || '',
    members: template.members,
    categories: template.categories || {},
  };
  const filename = (template.id || 'template') + '.json';
  downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
}

/**
 * Import a template from a JSON file content string.
 * @param {string} jsonString - Raw JSON string
 * @returns {Promise<{success: boolean, fromServer: boolean, data?: Object}|null>}
 */
export async function importTemplateFromFile(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.members || !Array.isArray(data.members)) {
      throw new Error('Format invalide : tableau members manquant');
    }
    return await saveCustomTemplate({
      title: data.title || 'Template importe',
      description: data.description || '',
      members: data.members,
      categories: data.categories || {},
    });
  } catch (err) {
    console.error('[Templates] Import failed:', err);
    return null;
  }
}

/**
 * Slugify a string for use as template ID / filename.
 * @param {string} str
 * @returns {string}
 */
function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
