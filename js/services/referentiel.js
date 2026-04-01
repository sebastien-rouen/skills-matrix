/**
 * Service référentiel global.
 * Catégories et compétences partagées entre toutes les équipes.
 *
 * Lecture publique, écriture admin uniquement (via l'interface PocketBase /_/).
 * Une équipe choisit ses compétences via skills_equipe_competences.
 */

import { getPb } from './pb-client.js';

// ── Catégories ────────────────────────────────────────────────────────────────

/**
 * Charge toutes les catégories du référentiel.
 * @returns {Promise<Object[]>} Triées par ordre
 */
export async function getCategories() {
    return getPb()
        .collection('skills_categories')
        .getFullList({ sort: 'ordre,name' });
}

// ── Compétences ───────────────────────────────────────────────────────────────

/**
 * Charge toutes les compétences du référentiel (avec leur catégorie).
 * @returns {Promise<Object[]>}
 */
export async function getAllCompetences() {
    return getPb()
        .collection('skills_competences')
        .getFullList({ sort: 'name', expand: 'category' });
}

/**
 * Charge les compétences sélectionnées par une équipe.
 * @param {string} equipeId - ID PocketBase de l'équipe
 * @returns {Promise<Object[]>} Compétences avec expand category
 */
export async function getCompetencesForEquipe(equipeId) {
    const pivots = await getPb()
        .collection('skills_equipe_competences')
        .getFullList({
            filter: `equipe="${equipeId}"`,
            expand: 'competence.category',
            sort: 'expand.competence.name',
        });

    // Aplatir : retourner les compétences directement
    return pivots
        .map(p => p.expand?.competence)
        .filter(Boolean);
}

/**
 * Ajoute une compétence au périmètre d'une équipe.
 * @param {string} equipeId
 * @param {string} competenceId
 * @returns {Promise<Object>}
 */
export async function addCompetenceToEquipe(equipeId, competenceId) {
    return getPb().collection('skills_equipe_competences').create({
        equipe: equipeId,
        competence: competenceId,
    });
}

/**
 * Retire une compétence du périmètre d'une équipe.
 * @param {string} equipeId
 * @param {string} competenceId
 * @returns {Promise<void>}
 */
export async function removeCompetenceFromEquipe(equipeId, competenceId) {
    try {
        const pivot = await getPb()
            .collection('skills_equipe_competences')
            .getFirstListItem(`equipe="${equipeId}" && competence="${competenceId}"`);
        await getPb().collection('skills_equipe_competences').delete(pivot.id);
    } catch (e) {
        if (e.status !== 404) throw e;
    }
}

/**
 * Convertit les données PB en format state.categories.
 * { "Frontend": ["JavaScript", "React"], "Backend": ["Python"] }
 *
 * @param {Object[]} categories - Catégories PB
 * @param {Object[]} competences - Compétences PB avec expand.category
 * @returns {Object} Map catégorieName → [nomCompétence]
 */
export function buildCategoriesMap(categories, competences) {
    const result = {};
    const catById = Object.fromEntries(categories.map(c => [c.id, c.name]));

    for (const comp of competences) {
        const catId = comp.category || comp.expand?.category?.id;
        const catName = catById[catId] || 'Autres';
        if (!result[catName]) result[catName] = [];
        result[catName].push(comp.name);
    }

    return result;
}

/**
 * Construit la map nom→id pour les upserts rapides dans state.js.
 * @param {Object[]} competences - Compétences PB
 * @returns {Object} { [nomCompétence]: idPB }
 */
export function buildCompetenceMap(competences) {
    return Object.fromEntries(competences.map(c => [c.name, c.id]));
}
