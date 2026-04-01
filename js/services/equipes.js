/**
 * Service équipes + membres.
 * Gère le CRUD des équipes et de leurs membres dans PocketBase.
 *
 * Accès par code équipe (URL ?equipe=CODE) → pas d'authentification requise.
 */

import { getPb } from './pb-client.js';

// ── Équipes ───────────────────────────────────────────────────────────────────

/**
 * Charge une équipe par son code (slug URL).
 * @param {string} code - Code unique de l'équipe (ex: "tribu-data")
 * @returns {Promise<Object|null>} Équipe PB ou null si inexistante
 */
export async function getEquipe(code) {
    try {
        return await getPb()
            .collection('skills_equipes')
            .getFirstListItem(`code="${code}"`);
    } catch (e) {
        if (e.status === 404) return null;
        throw e;
    }
}

/**
 * Charge toutes les équipes.
 * @returns {Promise<Object[]>}
 */
export async function getAllEquipes() {
    return getPb().collection('skills_equipes').getFullList({ sort: 'name' });
}

/**
 * Crée une nouvelle équipe.
 * @param {string} name - Nom affiché
 * @param {string} code - Slug unique (lettres minuscules, chiffres, tirets)
 * @param {string} [description]
 * @returns {Promise<Object>} Équipe créée
 */
export async function createEquipe(name, code, description = '') {
    return getPb().collection('skills_equipes').create({ name, code, description });
}

/**
 * Met à jour une équipe.
 * @param {string} id - ID PocketBase
 * @param {Object} data - { name?, description? }
 * @returns {Promise<Object>}
 */
export async function updateEquipe(id, data) {
    return getPb().collection('skills_equipes').update(id, data);
}

// ── Membres ───────────────────────────────────────────────────────────────────

/**
 * Charge tous les membres d'une équipe.
 * @param {string} equipeId - ID PocketBase de l'équipe
 * @returns {Promise<Object[]>}
 */
export async function getMembres(equipeId) {
    return getPb()
        .collection('skills_membres')
        .getFullList({ filter: `equipe="${equipeId}"`, sort: 'name' });
}

/**
 * Ajoute un membre à une équipe.
 * @param {string} equipeId
 * @param {{ name: string, role?: string, appetences?: string, groups?: string[] }} data
 * @returns {Promise<Object>} Membre créé
 */
export async function addMembre(equipeId, data) {
    return getPb().collection('skills_membres').create({
        equipe: equipeId,
        name: data.name,
        role: data.role || '',
        appetences: data.appetences || '',
        groups: data.groups || [],
        avatar_color: data.avatar_color || '',
    });
}

/**
 * Met à jour un membre.
 * @param {string} id - ID PocketBase du membre
 * @param {Object} data - Champs à modifier
 * @returns {Promise<Object>}
 */
export async function updateMembre(id, data) {
    return getPb().collection('skills_membres').update(id, data);
}

/**
 * Supprime un membre (et cascade ses évaluations via PB).
 * @param {string} id - ID PocketBase du membre
 * @returns {Promise<void>}
 */
export async function removeMembre(id) {
    return getPb().collection('skills_membres').delete(id);
}

/**
 * Génère un code équipe valide depuis un nom.
 * @param {string} name
 * @returns {string} Slug kebab-case
 */
export function generateEquipeCode(name) {
    return name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
}
