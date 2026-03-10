/**
 * localStorage persistence service.
 * Handles saving and loading the application state.
 */

const STORAGE_KEY = 'skills-matrix-data';

/**
 * Save the application state to localStorage.
 * @param {Object} state - The state object to persist
 */
export function save(state) {
  // Ne pas persister en localStorage en mode partage
  if (state.shareMode) return;
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    console.error('[Storage] Failed to save state:', err);
  }
}

/**
 * Load the application state from localStorage.
 * @returns {Object|null} The saved state, or null if not found/corrupt
 */
export function load() {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;
    return JSON.parse(serialized);
  } catch (err) {
    console.error('[Storage] Failed to load state:', err);
    return null;
  }
}

/**
 * Clear the saved state from localStorage.
 */
export function clear() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('[Storage] Failed to clear state:', err);
  }
}

/**
 * Check if there is a saved state in localStorage.
 * @returns {boolean} True if saved data exists
 */
export function hasSavedData() {
  return localStorage.getItem(STORAGE_KEY) !== null;
}
