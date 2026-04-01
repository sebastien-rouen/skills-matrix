/**
 * Service de partage de templates.
 * Gere la creation/revocation de liens et le mode partage (lecture du token URL).
 */

const SHARE_API = '/api/share';
const SESSION_KEY = 'skills-matrix-share-token';

/**
 * Detecter un token de partage dans l'URL (?share=TOKEN) ou en sessionStorage.
 * Si le token vient de l'URL, il est memorise en sessionStorage.
 * Si l'URL ne contient pas de token mais que sessionStorage en a un, il est restaure.
 * @returns {string|null} Le token ou null
 */
export function getShareTokenFromURL() {
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('share');

  if (urlToken) {
    sessionStorage.setItem(SESSION_KEY, urlToken);
    return urlToken;
  }

  // Pas de token dans l'URL : verifier sessionStorage
  const savedToken = sessionStorage.getItem(SESSION_KEY);
  if (savedToken) {
    // Reinjecter le parametre dans l'URL sans recharger
    const url = new URL(window.location.href);
    url.searchParams.set('share', savedToken);
    history.replaceState(null, '', url.toString());
    return savedToken;
  }

  return null;
}

/**
 * Clear the share token from sessionStorage (on revocation or invalid token).
 */
export function clearShareSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Valider un token et charger les donnees du template partage.
 * @param {string} token
 * @returns {Promise<Object|null>} { templateId, title, members, categories } ou null
 */
export async function loadSharedTemplate(token) {
  try {
    const res = await fetch(`${SHARE_API}/${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Sauvegarder les competences d'un membre via le lien de partage.
 * @param {string} token - Token de partage
 * @param {string} memberName - Nom du membre
 * @param {Object} skills - Objet skills { skillName: { level, appetence } }
 * @returns {Promise<boolean>} Succes
 */
export async function saveSharedSkills(token, memberName, skills) {
  try {
    const res = await fetch(`${SHARE_API}/${encodeURIComponent(token)}/skills`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberName, skills }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Sauvegarder les catégories via le lien de partage.
 * @param {string} token - Token de partage
 * @param {Object} categories - Map catégorie → [skills]
 * @returns {Promise<boolean>} Succes
 */
export async function saveSharedCategories(token, categories, members) {
  try {
    const res = await fetch(`${SHARE_API}/${encodeURIComponent(token)}/categories`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories, members }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Generer un lien de partage pour un template.
 * @param {string} templateId
 * @returns {Promise<{success: boolean, token?: string}>}
 */
export async function createShareLink(templateId) {
  try {
    const res = await fetch(SHARE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId }),
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch {
    return { success: false };
  }
}

/**
 * Revoquer un lien de partage.
 * @param {string} token
 * @returns {Promise<boolean>}
 */
export async function revokeShareLink(token) {
  try {
    const res = await fetch(`${SHARE_API}/${encodeURIComponent(token)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Lister les liens de partage actifs pour un template.
 * @param {string} templateId
 * @returns {Promise<Array<{token: string, createdAt: string}>>}
 */
export async function listShareLinks(templateId) {
  try {
    const res = await fetch(`/api/shares/${encodeURIComponent(templateId)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
