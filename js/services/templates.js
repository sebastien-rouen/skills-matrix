/**
 * Service templates - lit et écrit dans la collection `skills_templates` (blob JSON).
 * Source de vérité unique : PocketBase. Pas de fallback localStorage.
 */

import { createMember } from '../models/data.js';
import { downloadFile } from '../utils/helpers.js';
import { getPb } from './pb-client.js';

// ── API publique ──────────────────────────────────────────────────────────────

/**
 * Retourne la liste des templates disponibles depuis PocketBase.
 * @returns {Promise<{ templates: Object[], fromServer: boolean }>}
 */
export async function getCustomTemplates() {
    try {
        const items = await getPb()
            .collection('skills_templates')
            .getFullList({ sort: 'ordre,title' });
        const templates = items.map(t => ({
            id:          t.slug,
            pbId:        t.id,
            title:       t.title,
            description: t.description || '',
            builtIn:     !!t.built_in,
            local:       true,
        }));
        return { templates, fromServer: true };
    } catch {
        return { templates: [], fromServer: false };
    }
}

/**
 * Charge les données complètes d'un template (membres + catégories).
 * @param {string} id - Slug du template
 * @returns {Promise<{ members: Object[], categories: Object }|null>}
 */
export async function loadCustomTemplate(id) {
    try {
        const tpl = await getPb()
            .collection('skills_templates')
            .getFirstListItem(`slug="${id}"`, { requestKey: null });
        const raw = tpl.data || {};
        const members = (raw.members || []).map(m =>
            createMember({
                name:       m.name,
                role:       m.role       || '',
                appetences: m.appetences || '',
                groups:     m.groups     || [],
                skills:     m.skills     || {},
            })
        );
        const categories = applyOrderedCategories(raw.categories || {}, raw.categoryOrder);
        const objectives = raw.objectives || {};
        return { members, categories, objectives };
    } catch {
        return null;
    }
}

/**
 * Crée ou met à jour un template dans PocketBase.
 * @param {Object} template - { title, description, members, categories }
 * @returns {Promise<{ success: boolean, fromServer: boolean, data?: Object }>}
 */
export async function saveCustomTemplate(template) {
    try {
        const slug = slugify(template.title);
        const rec = await getPb().collection('skills_templates').create({
            slug,
            title:       template.title,
            description: template.description || '',
            built_in:    false,
            ordre:       100,
            data: {
                members:    template.members    || [],
                categories: template.categories || {},
            },
        });
        return { success: true, fromServer: true, data: { id: slug, pbId: rec.id } };
    } catch {
        return { success: false, fromServer: false };
    }
}

/**
 * Met à jour les données d'un template existant dans PocketBase (members + categories).
 * Fonctionne pour tous les templates, y compris les builtIn.
 * @param {string} id - Slug du template
 * @param {Object} data - { members, categories }
 * @returns {Promise<boolean>} Succès
 */
export async function updateCustomTemplate(id, data) {
    try {
        const categoryOrder = Object.keys(data.categories || {});
        const payload = { members: data.members, categories: data.categories, categoryOrder };
        if (data.objectives !== undefined) payload.objectives = data.objectives;
        const res = await fetch(`/api/templates/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Supprime un template depuis PocketBase.
 * @param {string} id - Slug du template
 * @returns {Promise<{ success: boolean, fromServer: boolean }>}
 */
export async function deleteCustomTemplate(id) {
    try {
        const tpl = await getPb()
            .collection('skills_templates')
            .getFirstListItem(`slug="${id}"`);
        if (tpl.built_in) return { success: false, fromServer: true };
        await getPb().collection('skills_templates').delete(tpl.id);
        return { success: true, fromServer: true };
    } catch {
        return { success: false, fromServer: false };
    }
}

/**
 * Exporte un template en fichier JSON téléchargeable.
 */
export function exportTemplateAsFile(template) {
    const data = { id: template.id, title: template.title,
        description: template.description || '', members: template.members,
        categories: template.categories || {} };
    downloadFile(JSON.stringify(data, null, 2), (template.id || 'template') + '.json', 'application/json');
}

/**
 * Importe un template depuis une chaîne JSON.
 */
export async function importTemplateFromFile(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (!data.members || !Array.isArray(data.members)) {
            throw new Error('Format invalide : tableau members manquant');
        }
        return await saveCustomTemplate({ title: data.title || 'Template importé',
            description: data.description || '', members: data.members,
            categories: data.categories || {} });
    } catch (err) {
        console.error('[Templates] Import échoué :', err);
        return null;
    }
}

/**
 * Reorder a categories object using an explicit order array.
 * Fallback: original key insertion order if categoryOrder is absent.
 * @param {Object} categories - { catName: [skills] }
 * @param {string[]} [categoryOrder] - Explicit ordered category names
 * @returns {Object} Categories in correct order
 */
export function applyOrderedCategories(categories, categoryOrder) {
    if (!categoryOrder || !categoryOrder.length) return categories;
    const ordered = {};
    for (const name of categoryOrder) {
        if (categories[name] !== undefined) ordered[name] = categories[name];
    }
    // Ajouter les catégories non listées dans categoryOrder (sécurité)
    for (const [name, skills] of Object.entries(categories)) {
        if (!(name in ordered)) ordered[name] = skills;
    }
    return ordered;
}

function slugify(str) {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
