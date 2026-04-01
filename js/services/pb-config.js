/**
 * Configuration de l'URL PocketBase.
 *
 * BastaVerse : Nginx proxie /pb vers PocketBase → window.origin/pb fonctionne
 * Communauté : server.js proxie aussi /pb → même URL
 *
 * Si vous déployez sans proxy, modifiez PB_URL avec l'URL directe de votre PB.
 * Exemple : export const PB_URL = 'http://localhost:8140';
 */
export const PB_URL = `${window.location.origin}/pb`;
