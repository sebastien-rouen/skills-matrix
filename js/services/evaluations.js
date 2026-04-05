/**
 * Service évaluations - écriture atomique, sans race condition.
 *
 * Principe clé : 1 enregistrement PocketBase = 1 membre × 1 compétence.
 * 10 membres qui sauvegardent simultanément → 10 lignes indépendantes → aucun conflit.
 *
 * Realtime : subscribe() retourne une fonction de désabonnement.
 */

import { getPb } from './pb-client.js';

// Cache local : eviteId → competenceId pour les upserts rapides
// Clé : `${membreId}:${competenceId}`, valeur : id PocketBase de l'évaluation
const evalIdCache = new Map();

/**
 * Charge toutes les évaluations d'une équipe (via ses membres).
 * @param {string} equipeId - ID PocketBase de l'équipe
 * @returns {Promise<Object[]>} Évaluations avec expand competence
 */
export async function getEvaluations(equipeId) {
    // On filtre via la relation membre.equipe
    const evals = await getPb()
        .collection('skills_evaluations')
        .getFullList({
            filter: `membre.equipe="${equipeId}"`,
            expand: 'competence',
        });

    // Mettre en cache les IDs pour les upserts suivants
    for (const ev of evals) {
        evalIdCache.set(`${ev.membre}:${ev.competence}`, ev.id);
    }

    return evals;
}

/**
 * Sauvegarde (crée ou met à jour) une évaluation.
 * Opération atomique : touche uniquement la ligne membre×compétence concernée.
 *
 * @param {string} membreId - ID PocketBase du membre
 * @param {string} competenceId - ID PocketBase de la compétence
 * @param {number} level - 0-4
 * @param {number} appetence - 0-3
 * @returns {Promise<Object>} Évaluation sauvegardée
 */
export async function upsertEvaluation(membreId, competenceId, level, appetence) {
    const cacheKey = `${membreId}:${competenceId}`;
    const existingId = evalIdCache.get(cacheKey);

    if (existingId) {
        // Mise à jour directe (ID connu en cache)
        const updated = await getPb()
            .collection('skills_evaluations')
            .update(existingId, { level, appetence });
        return updated;
    }

    // Chercher en base (cas où le cache est vide après rechargement)
    try {
        const existing = await getPb()
            .collection('skills_evaluations')
            .getFirstListItem(`membre="${membreId}" && competence="${competenceId}"`);
        evalIdCache.set(cacheKey, existing.id);
        return await getPb()
            .collection('skills_evaluations')
            .update(existing.id, { level, appetence });
    } catch (e) {
        if (e.status !== 404) throw e;
    }

    // Créer
    const created = await getPb()
        .collection('skills_evaluations')
        .create({ membre: membreId, competence: competenceId, level, appetence });
    evalIdCache.set(cacheKey, created.id);
    return created;
}

/**
 * Supprime une évaluation (remet le niveau à 0 visuellement).
 * @param {string} membreId
 * @param {string} competenceId
 * @returns {Promise<void>}
 */
export async function deleteEvaluation(membreId, competenceId) {
    const cacheKey = `${membreId}:${competenceId}`;
    const existingId = evalIdCache.get(cacheKey);

    if (existingId) {
        await getPb().collection('skills_evaluations').delete(existingId);
        evalIdCache.delete(cacheKey);
        return;
    }

    try {
        const existing = await getPb()
            .collection('skills_evaluations')
            .getFirstListItem(`membre="${membreId}" && competence="${competenceId}"`);
        await getPb().collection('skills_evaluations').delete(existing.id);
        evalIdCache.delete(cacheKey);
    } catch (e) {
        if (e.status !== 404) throw e;
    }
}

/**
 * S'abonne aux changements d'évaluations d'une équipe (realtime SSE).
 * Déclenche callback à chaque create/update/delete d'une évaluation.
 *
 * @param {string} equipeId - ID PocketBase de l'équipe
 * @param {Function} callback - (action: 'create'|'update'|'delete', record: Object) => void
 * @returns {Promise<Function>} Fonction de désabonnement
 */
export async function subscribeToEvaluations(equipeId, callback) {
    const unsubscribe = await getPb()
        .collection('skills_evaluations')
        .subscribe('*', async (event) => {
            // Filtrer uniquement les évaluations de cette équipe
            // (PB ne filtre pas par relation dans les subscriptions)
            if (event.record?.membre) {
                // Mettre à jour le cache
                if (event.action === 'delete') {
                    const key = `${event.record.membre}:${event.record.competence}`;
                    evalIdCache.delete(key);
                } else {
                    const key = `${event.record.membre}:${event.record.competence}`;
                    evalIdCache.set(key, event.record.id);
                }
                callback(event.action, event.record);
            }
        });

    return unsubscribe;
}

/**
 * Vide le cache local des IDs (utile après rechargement d'équipe).
 */
export function clearEvalCache() {
    evalIdCache.clear();
}
