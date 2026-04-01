/**
 * Singleton PocketBase client.
 * Importer getPb() partout où PocketBase est nécessaire.
 */

import PocketBase from 'https://unpkg.com/pocketbase/dist/pocketbase.es.mjs';
import { PB_URL } from './pb-config.js';

/** @type {PocketBase|null} */
let _pb = null;

/**
 * Retourne l'instance PocketBase (créée une seule fois).
 * @returns {PocketBase}
 */
export function getPb() {
    if (!_pb) _pb = new PocketBase(PB_URL);
    return _pb;
}

/**
 * Vérifie si PocketBase est accessible.
 * @returns {Promise<boolean>}
 */
export async function isPbAvailable() {
    try {
        const res = await fetch(`${PB_URL}/api/health`);
        return res.ok;
    } catch {
        return false;
    }
}
