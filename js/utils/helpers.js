/**
 * Utility helpers for the Skills Matrix application.
 * Pure functions with no side effects.
 */

/**
 * Generate a unique identifier.
 * @returns {string} A unique ID string
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Debounce a function call.
 * @param {Function} fn - The function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Extract initials from a full name (up to 2 characters).
 * @param {string} name - Full name
 * @returns {string} Initials (e.g. "JD" for "John Doe")
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('');
}

/**
 * Skill level definitions with labels, colors, and numeric values.
 */
export const SKILL_LEVELS = [
  { value: 0, label: 'Aucun',          labelEn: 'None',         color: '#E2E8F0', textColor: '#64748B' },
  { value: 1, label: 'Débutant',       labelEn: 'Beginner',     color: '#FCA5A5', textColor: '#991B1B' },
  { value: 2, label: 'Intermédiaire',  labelEn: 'Intermediate', color: '#FDE68A', textColor: '#92400E' },
  { value: 3, label: 'Confirmé',       labelEn: 'Confirmed',    color: '#93C5FD', textColor: '#1E40AF' },
  { value: 4, label: 'Expert',         labelEn: 'Expert',       color: '#6EE7B7', textColor: '#065F46' },
];

/**
 * Appetence level definitions.
 */
export const APPETENCE_LEVELS = [
  { value: 0, label: 'Aucune',  icon: '' },
  { value: 1, label: 'Faible',  icon: '♡' },
  { value: 2, label: 'Moyen',   icon: '♥' },
  { value: 3, label: 'Fort',    icon: '🔥' },
];

/**
 * Color palette for multi-member radar overlays (up to 6 members).
 */
export const MEMBER_COLORS = [
  { bg: 'rgba(59, 130, 246, 0.12)',  border: 'rgba(59, 130, 246, 0.8)',  point: '#3B82F6', label: 'Bleu' },
  { bg: 'rgba(16, 185, 129, 0.12)',  border: 'rgba(16, 185, 129, 0.8)',  point: '#10B981', label: 'Vert' },
  { bg: 'rgba(245, 158, 11, 0.12)',  border: 'rgba(245, 158, 11, 0.8)',  point: '#F59E0B', label: 'Orange' },
  { bg: 'rgba(139, 92, 246, 0.12)',  border: 'rgba(139, 92, 246, 0.8)',  point: '#8B5CF6', label: 'Violet' },
  { bg: 'rgba(236, 72, 153, 0.12)',  border: 'rgba(236, 72, 153, 0.8)',  point: '#EC4899', label: 'Rose' },
  { bg: 'rgba(20, 184, 166, 0.12)',  border: 'rgba(20, 184, 166, 0.8)',  point: '#14B8A6', label: 'Teal' },
];

/**
 * Get the label for a skill level value.
 * @param {number} level - Skill level (0-4)
 * @returns {string} Localized label
 */
export function getSkillLabel(level) {
  return SKILL_LEVELS[level]?.label ?? 'Inconnu';
}

/**
 * Get the appetence icon for a given value.
 * @param {number} appetence - Appetence value (0-3)
 * @returns {string} Icon character
 */
export function getAppetenceIcon(appetence) {
  return APPETENCE_LEVELS[appetence]?.icon ?? '';
}

/**
 * Get the appetence label for a given value.
 * @param {number} appetence - Appetence value (0-3)
 * @returns {string} Label
 */
export function getAppetenceLabel(appetence) {
  return APPETENCE_LEVELS[appetence]?.label ?? 'Inconnu';
}

/**
 * Sanitize a string for safe HTML insertion.
 * @param {string} str - Raw string
 * @returns {string} Escaped HTML string
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Clamp a number between min and max bounds.
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum bound
 * @param {number} max - Maximum bound
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Compute the average of an array of numbers, ignoring NaN/null.
 * @param {number[]} values - Array of numeric values
 * @returns {number} Average or 0 if empty
 */
export function average(values) {
  const valid = values.filter(v => typeof v === 'number' && !isNaN(v));
  if (valid.length === 0) return 0;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

/**
 * Sort an array of objects by a given key.
 * @param {Object[]} arr - Array of objects
 * @param {string} key - Property name to sort by
 * @param {boolean} [ascending=true] - Sort direction
 * @returns {Object[]} New sorted array
 */
export function sortBy(arr, key, ascending = true) {
  return [...arr].sort((a, b) => {
    const va = a[key] ?? '';
    const vb = b[key] ?? '';
    if (va < vb) return ascending ? -1 : 1;
    if (va > vb) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * Format a date as a relative time string (e.g. "il y a 5 min").
 * @param {string|null} isoDate - ISO date string
 * @returns {string} Relative time or empty string if no date
 */
export function timeAgo(isoDate) {
  if (!isoDate) return '';
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return '';

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days}j`;

  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;

  return `il y a ${Math.floor(months / 12)} an(s)`;
}

/**
 * Download a string as a file in the browser.
 * @param {string} content - File content
 * @param {string} filename - Download file name
 * @param {string} [mimeType='text/csv'] - MIME type
 */
export function downloadFile(content, filename, mimeType = 'text/csv') {
  const bom = mimeType.startsWith('text/') ? '\uFEFF' : '';
  const blob = new Blob([bom + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
