/**
 * Centralized state store with pub/sub event system.
 * Single source of truth for the entire application.
 */

import { createDefaultState } from './models/data.js';
import { save, load } from './services/storage.js';

/** @type {Object} The application state */
let state = createDefaultState();

/** @type {Map<string, Set<Function>>} Event listeners by event name */
const listeners = new Map();

/**
 * Get a deep clone of the current state.
 * @returns {Object} Current state copy
 */
export function getState() {
  return structuredClone(state);
}

/**
 * Replace the entire state and persist it.
 * @param {Object} newState - New state object
 * @param {boolean} [silent=false] - Skip emitting events if true
 */
export function setState(newState, silent = false) {
  state = structuredClone(newState);
  save(state);
  if (!silent) emit('state:changed', state);
}

/**
 * Update a portion of the state by merging partial data.
 * @param {Object} partial - Partial state to merge at the top level
 */
export function updateState(partial) {
  state = { ...structuredClone(state), ...structuredClone(partial) };
  save(state);
  emit('state:changed', state);
}

/**
 * Subscribe to an event.
 * @param {string} event - Event name
 * @param {Function} callback - Listener function
 * @returns {Function} Unsubscribe function
 */
export function on(event, callback) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(callback);

  return () => listeners.get(event)?.delete(callback);
}

/**
 * Emit an event to all registered listeners.
 * @param {string} event - Event name
 * @param {...*} args - Arguments to pass to listeners
 */
export function emit(event, ...args) {
  const handlers = listeners.get(event);
  if (!handlers) return;
  for (const handler of handlers) {
    try {
      handler(...args);
    } catch (err) {
      console.error(`[State] Error in listener for "${event}":`, err);
    }
  }
}

/**
 * Initialize the state from localStorage, or use defaults.
 */
export function initState() {
  const saved = load();
  if (saved && saved.members) {
    const defaults = createDefaultState();
    state = {
      ...defaults,
      ...saved,
      filters: { ...defaults.filters, ...(saved.filters || {}) },
      settings: { ...defaults.settings, ...(saved.settings || {}) },
    };
  }
  emit('state:initialized', state);
  emit('state:changed', state);
}

// --- Convenience mutators ---

/**
 * Add one or more members to the state.
 * @param {Object[]} members - Members to add
 */
export function addMembers(members) {
  const current = getState();
  current.members.push(...structuredClone(members));
  setState(current);
  emit('members:added', members);
}

/**
 * Replace all members (used on import).
 * @param {Object[]} members - New members array
 */
export function replaceMembers(members) {
  const current = getState();
  current.members = structuredClone(members);
  setState(current);
  emit('members:replaced', members);
}

/**
 * Update a single member by ID.
 * @param {string} memberId - Member ID
 * @param {Object} updates - Partial member data to merge
 */
export function updateMember(memberId, updates) {
  const current = getState();
  const idx = current.members.findIndex(m => m.id === memberId);
  if (idx === -1) return;

  current.members[idx] = { ...current.members[idx], ...structuredClone(updates) };
  setState(current);
  emit('member:updated', current.members[idx]);
}

/**
 * Remove a member by ID.
 * @param {string} memberId - Member ID
 */
export function removeMember(memberId) {
  const current = getState();
  current.members = current.members.filter(m => m.id !== memberId);
  setState(current);
  emit('member:removed', memberId);
}

/**
 * Update a specific skill for a member.
 * @param {string} memberId - Member ID
 * @param {string} skillName - Skill name
 * @param {Object} skillEntry - { level, appetence }
 */
export function updateSkill(memberId, skillName, skillEntry) {
  const current = getState();
  const member = current.members.find(m => m.id === memberId);
  if (!member) return;

  member.skills[skillName] = { ...skillEntry };
  setState(current);
  emit('skill:updated', { memberId, skillName, ...skillEntry });
}

/**
 * Update the categories map.
 * @param {Object} categories - New categories map
 */
export function updateCategories(categories) {
  updateState({ categories: structuredClone(categories) });
  emit('categories:updated', categories);
}

/**
 * Update application settings.
 * @param {Object} settings - Partial settings object to merge
 */
export function updateSettings(settings) {
  const current = getState();
  current.settings = { ...current.settings, ...settings };
  setState(current);
  emit('settings:changed', current.settings);
}

/**
 * Update filter settings.
 * @param {Object} filters - Partial filter object
 */
export function updateFilters(filters) {
  const current = getState();
  current.filters = { ...current.filters, ...filters };
  setState(current);
  emit('filters:changed', current.filters);
}

/**
 * Reset the entire state to defaults.
 */
export function resetState() {
  state = createDefaultState();
  save(state);
  emit('state:changed', state);
  emit('state:reset');
}
