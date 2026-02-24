---
name: start-project
description: Créer un nouveau projet vanilla JS SPA en suivant les bonnes pratiques éprouvées
argument-hint: "[nom du projet et brève description]"
---

# Agent de Création de Projet

Créer un nouveau projet from scratch en suivant l'architecture et les bonnes pratiques du projet Skills Matrix.

## Contexte

$ARGUMENTS

## Architecture à suivre

### Stack technique
- **Vanilla JS** avec modules ES6 (`<script type="module">`)
- **Aucun outil de build** - tourne directement dans le navigateur
- **CSS Custom Properties** pour le theming (variables.css)
- **Nommage BEM** pour les classes CSS
- **localStorage** pour la persistance
- **Imports CDN** uniquement pour les grosses libs (ex : Chart.js)

### Structure des répertoires

```
nom-du-projet/
  index.html              # Point d'entrée HTML unique, <script type="module" src="js/app.js">
  css/
    variables.css          # Custom properties CSS (couleurs, espacements, fonts, ombres, z-index)
    base.css               # Reset, typographie, primitives de layout
    components.css         # UI réutilisable : boutons, cartes, badges, modals, toasts, formulaires
    [feature].css          # Styles spécifiques à une feature (matrix.css, charts.css...)
  js/
    app.js                 # Point d'entrée : imports, routing des vues, init
    state.js               # Store centralisé avec pub/sub (emit/on)
    models/
      data.js              # Modèle de données : factories, validation, requêtes calculées
    components/
      sidebar.js           # Composant de navigation
      toast.js             # Notifications toast (succès, erreur, avertissement)
      modal.js             # Dialogue modal
      filters.js           # Barre de filtres
    views/
      [nom-vue].js         # Un fichier par vue/page (fonction renderXxxView)
    services/
      storage.js           # Lecture/écriture localStorage avec support de migration
      importer.js          # Import de données (CSV, JSON, collage)
      exporter.js          # Export de données (CSV, JSON, téléchargement)
    utils/
      helpers.js           # Fonctions utilitaires pures, constantes, enums
  .claude/
    skills/                # Skills personnalisés Claude Code
  CLAUDE.md                # Conventions du projet pour Claude
```

### Patterns clés

#### Gestion du state (state.js)
```javascript
let state = loadFromStorage() || createDefaultState();
export function getState() { return structuredClone(state); }
export function setState(newState, silent = false) { ... }
export function emit(event, data) { ... }
export function on(event, callback) { ... }
// Updaters spécifiques : updateMember(), updateSkill(), etc.
```

#### Routing des vues (app.js)
```javascript
const VIEW_RENDERERS = {
  dashboard: renderDashboardView,
  list: renderListView,
  settings: renderSettingsView,
};
on('view:changed', (viewId) => {
  const container = document.getElementById(`view-${viewId}`);
  VIEW_RENDERERS[viewId]?.(container);
});
```

#### Pattern de vue (views/xxx.js)
```javascript
export function renderXxxView(container) {
  const state = getState();
  container.innerHTML = `...`;  // Template HTML déclaratif
  bindXxxEvents(container, state);  // Délégation d'événements
}
```

#### Modèles de données (models/data.js)
- Fonctions factory : `createItem({ ... })` avec `generateId()`
- Validation : `validateItem(raw)` qui assainit les entrées
- Requêtes calculées : `getAllXxx(items)`, `getXxxStats(items, key)`

### Conventions
- Tout le texte UI en **français**, tout le code/JSDoc en **anglais**
- Chaque fonction exportée a un commentaire JSDoc
- Les fichiers CSS utilisent des séparateurs `/* --- Nom de section --- */`
- Pas de styles inline sauf pour les valeurs dynamiques (couleurs issues des données)
- Utiliser `escapeHtml()` pour tout contenu généré par l'utilisateur dans les templates
- Utiliser `structuredClone()` pour empêcher les mutations du state
- Responsive : CSS Grid avec breakpoint à 1200px

## Étapes

1. Créer l'arborescence des répertoires
2. Écrire `variables.css` avec un jeu complet de design tokens
3. Écrire `base.css` avec reset et layout
4. Écrire `index.html` liant tous les CSS et le module d'entrée
5. Écrire `state.js` avec le pattern pub/sub
6. Écrire `app.js` avec le routing des vues
7. Écrire `sidebar.js` avec la navigation
8. Écrire `toast.js` pour les notifications
9. Écrire la première vue en fonction de la description du projet
10. Écrire `CLAUDE.md` documentant les conventions du projet
