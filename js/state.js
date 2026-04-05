/**
 * Centralized state store with pub/sub event system.
 * Single source of truth for the entire application.
 *
 * Deux modes de fonctionnement :
 * - Mode standalone : localStorage (comportement historique)
 * - Mode équipe (URL ?equipe=CODE) : PocketBase, écriture atomique, realtime SSE
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

// ── Mode équipe PocketBase ────────────────────────────────────────────────────

/**
 * Initialise l'application depuis PocketBase pour une équipe donnée.
 * Charge équipe, membres, compétences, catégories et évaluations en parallèle.
 * Active ensuite la synchronisation realtime.
 *
 * @param {string} equipeCode - Code équipe depuis l'URL (?equipe=CODE)
 * @returns {Promise<boolean>} true si l'équipe a été trouvée et chargée
 */
export async function initFromPocketBase(equipeCode) {
    const { getEquipe, getMembres } = await import('./services/equipes.js');
    const { getCategories, getCompetencesForEquipe, buildCategoriesMap, buildCompetenceMap } =
        await import('./services/referentiel.js');
    const { getEvaluations, clearEvalCache } = await import('./services/evaluations.js');

    const equipe = await getEquipe(equipeCode);
    if (!equipe) return false;

    clearEvalCache();

    const [membres, competences, categories, evaluations] = await Promise.all([
        getMembres(equipe.id),
        getCompetencesForEquipe(equipe.id),
        getCategories(),
        getEvaluations(equipe.id),
    ]);

    // Construire la map id→compétence pour les évaluations
    const compById = Object.fromEntries(competences.map(c => [c.id, c]));

    // Construire members[] au format attendu par les vues
    const members = membres.map(m => {
        const memberEvals = evaluations.filter(e => e.membre === m.id);
        const skills = {};
        for (const ev of memberEvals) {
            const comp = compById[ev.competence] || ev.expand?.competence;
            if (comp) skills[comp.name] = { level: ev.level, appetence: ev.appetence ?? 0 };
        }
        return { id: m.id, name: m.name, role: m.role || '',
            appetences: m.appetences || '', groups: m.groups || [], skills };
    });

    const categoriesMap = buildCategoriesMap(categories, competences);
    const competenceMap = buildCompetenceMap(competences);

    // Mettre à jour le state (silent pour éviter un double rendu)
    state = {
        ...createDefaultState(),
        ...load(),
        members,
        categories: categoriesMap,
        equipeId: equipe.id,
        equipeCode,
        competenceMap,
        objectives: equipe.objectives || {},
    };
    save(state);
    emit('state:initialized', state);
    emit('state:changed', state);

    // Activer le realtime
    await setupRealtimeSync(equipe.id, membres, compById);

    return true;
}

/** @type {Function|null} Fonction de désabonnement realtime active */
let _unsubscribeRealtime = null;

/**
 * S'abonne aux évaluations de l'équipe en realtime (SSE PocketBase).
 * Quand un autre membre sauvegarde → le state se met à jour automatiquement.
 *
 * @param {string} equipeId
 * @param {Object[]} membres - Liste des membres PB
 * @param {Object} compById - Map id→compétence
 */
async function setupRealtimeSync(equipeId, membres, compById) {
    if (_unsubscribeRealtime) {
        _unsubscribeRealtime();
        _unsubscribeRealtime = null;
    }

    const { subscribeToEvaluations } = await import('./services/evaluations.js');

    _unsubscribeRealtime = await subscribeToEvaluations(equipeId, (action, record) => {
        const current = getState();

        // Filtrer : ignorer les évaluations d'autres équipes
        const membre = membres.find(m => m.id === record.membre);
        if (!membre) return;

        const comp = compById[record.competence];
        if (!comp) return;

        const memberIdx = current.members.findIndex(m => m.id === record.membre);
        if (memberIdx === -1) return;

        if (action === 'delete') {
            delete current.members[memberIdx].skills[comp.name];
        } else {
            current.members[memberIdx].skills[comp.name] = {
                level: record.level,
                appetence: record.appetence ?? 0,
            };
        }

        // Mise à jour silencieuse du state (pas de save localStorage)
        state = structuredClone(current);
        emit('state:changed', state);
    });
}

/**
 * Désabonne le realtime (ex: changement d'équipe).
 */
export function teardownRealtime() {
    if (_unsubscribeRealtime) {
        _unsubscribeRealtime();
        _unsubscribeRealtime = null;
    }
}

// ── Convenience mutators ──────────────────────────────────────────────────────

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
 * En mode équipe PB : persiste de façon atomique en arrière-plan.
 * @param {string} memberId - Member ID
 * @param {string} skillName - Skill name
 * @param {Object} skillEntry - { level, appetence }
 */
export function updateSkill(memberId, skillName, skillEntry) {
  const current = getState();
  const member = current.members.find(m => m.id === memberId);
  if (!member) return;

  // 1. Mise à jour locale immédiate (optimiste - pas d'attente réseau)
  member.skills[skillName] = { ...skillEntry };
  member.lastUpdated = new Date().toISOString();
  setState(current);
  emit('skill:updated', { memberId, skillName, ...skillEntry });

  // 2. Si mode équipe PB : persistance atomique en arrière-plan
  const competenceId = current.competenceMap?.[skillName];
  if (current.equipeId && competenceId) {
    import('./services/evaluations.js').then(({ upsertEvaluation }) => {
      upsertEvaluation(memberId, competenceId, skillEntry.level, skillEntry.appetence ?? 0)
        .catch(err => console.warn('[State] Sync PB échoué :', err));
    });
  }
}

/**
 * Remove a skill from all members and categories.
 * @param {string} skillName - Skill name to remove
 */
export function removeSkill(skillName) {
  const current = getState();
  for (const member of current.members) {
    delete member.skills[skillName];
  }
  if (current.categories) {
    for (const [catName, skills] of Object.entries(current.categories)) {
      const idx = skills.indexOf(skillName);
      if (idx !== -1) skills.splice(idx, 1);
      if (skills.length === 0) delete current.categories[catName];
    }
  }
  setState(current);
  emit('skill:removed', skillName);
  emit('categories:updated', current.categories);
}

/**
 * Rename a skill across all members and categories.
 * @param {string} oldName - Current skill name
 * @param {string} newName - New skill name
 */
export function renameSkill(oldName, newName) {
  const current = getState();
  for (const member of current.members) {
    if (oldName in member.skills) {
      member.skills[newName] = member.skills[oldName];
      delete member.skills[oldName];
    }
  }
  if (current.categories) {
    for (const [cat, skills] of Object.entries(current.categories)) {
      const idx = skills.indexOf(oldName);
      if (idx !== -1) skills[idx] = newName;
    }
  }
  setState(current);
  emit('skill:renamed', { oldName, newName });
  emit('categories:updated', current.categories);
}

/**
 * Rename a group across all members.
 * @param {string} oldName - Current group name
 * @param {string} newName - New group name
 */
export function renameGroup(oldName, newName) {
  const current = getState();
  for (const member of current.members) {
    if (Array.isArray(member.groups)) {
      const idx = member.groups.indexOf(oldName);
      if (idx !== -1) member.groups[idx] = newName;
    }
  }
  setState(current);
  emit('group:renamed', { oldName, newName });
}

/**
 * Remove a group from all members.
 * @param {string} groupName - Group to remove
 */
export function removeGroup(groupName) {
  const current = getState();
  for (const member of current.members) {
    if (Array.isArray(member.groups)) {
      member.groups = member.groups.filter(g => g !== groupName);
    }
  }
  setState(current);
  emit('group:removed', groupName);
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
 * Check if the app is in share mode.
 * @returns {boolean}
 */
export function isShareMode() {
  return !!state.shareMode;
}

/**
 * Get the selected member name in share mode.
 * @returns {string|null}
 */
export function getShareMemberName() {
  return state.shareMemberName || null;
}

/**
 * Get the share token.
 * @returns {string|null}
 */
export function getShareToken() {
  return state.shareToken || null;
}

/**
 * Indique si l'app tourne en mode équipe PocketBase.
 * @returns {boolean}
 */
export function isEquipeMode() {
  return !!state.equipeId;
}

/**
 * Retourne le code équipe actif (depuis l'URL ?equipe=CODE).
 * @returns {string|null}
 */
export function getEquipeCode() {
  return state.equipeCode || null;
}

/**
 * Toggle a skill in the pinned list.
 * @param {string} skillName
 */
export function togglePinnedSkill(skillName) {
  const current = getState();
  const pinned = current.pinnedSkills || [];
  const idx = pinned.indexOf(skillName);
  if (idx === -1) pinned.push(skillName);
  else pinned.splice(idx, 1);
  current.pinnedSkills = pinned;
  setState(current);
  emit('pins:changed', { pinnedSkills: pinned });
}

/**
 * Toggle a member in the pinned list.
 * @param {string} memberId
 */
export function togglePinnedMember(memberId) {
  const current = getState();
  const pinned = current.pinnedMembers || [];
  const idx = pinned.indexOf(memberId);
  if (idx === -1) pinned.push(memberId);
  else pinned.splice(idx, 1);
  current.pinnedMembers = pinned;
  setState(current);
  emit('pins:changed', { pinnedMembers: pinned });
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
