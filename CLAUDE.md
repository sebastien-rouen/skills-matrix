# CLAUDE.md - Skills Matrix

## Vue d'ensemble du projet
Application web interactive de matrice de compétences pour suivre les compétences d'une équipe, identifier les lacunes et planifier les formations prioritaires. Construite en vanilla HTML/CSS/JS (modules ES), aucun build nécessaire.

## Stack technique
- **HTML5** - balisage sémantique
- **CSS3** - custom properties, flexbox, grid
- **JavaScript (ES2022+)** - modules ES natifs (`import`/`export`)
- **Chart.js 4.x** - graphiques radar (CDN)
- **Google Fonts** - police Inter

## Architecture
```
index.html          → Point d'entrée
css/                → Feuilles de styles (variables, base, composants, matrice, graphiques)
js/
  app.js            → Initialisation, routing
  state.js          → Store centralisé (pattern pub/sub)
  models/data.js    → Modèle de données, validation, statistiques
  services/         → Storage (localStorage), importer (CSV/TSV), exporter (CSV/JSON)
  views/            → Matrice, Dashboard, Radar, Import
  components/       → Sidebar, Filtres, Modal, Toast
  utils/helpers.js  → Fonctions utilitaires pures
```

## Patterns clés
- **Store pub/sub** dans `state.js` : toutes les mutations passent par `setState()` / `updateState()`, les listeners s'abonnent via `on(event, callback)`
- **Vues** : fonctions de rendu `renderXxxView(container)` - reçoivent un élément DOM et y injectent le contenu
- **Services** : fonctions pures (pas d'accès DOM), faciles à tester
- **CSS suit la convention BEM** : `.block__element--modifier`

## Modèle de données
- Membres : `{ id, name, role, skills: { [skillName]: { level: 0-4, appetence: 0-3 } } }`
- Catégories : `{ [categoryName]: [skillName, ...] }`
- Niveaux de compétence : 0=Aucun, 1=Débutant, 2=Intermédiaire, 3=Confirmé, 4=Expert
- Appétence : 0=Aucune, 1=Faible, 2=Moyen, 3=Fort

## Format d'import (CSV/TSV)
```
Nom;Rôle;JavaScript;React;Python
Jean Dupont;Dev;4/3;3/2;1/1
```
Format des cellules : `niveau/appétence` (ex : `3/2` = Confirmé + Appétence Moyenne)

## Lancement
Ouvrir `index.html` dans un navigateur via un serveur HTTP (Live Server, `npx serve .`, ou `python -m http.server`).

## Qualité du code
- Toutes les fonctions publiques documentées en JSDoc (anglais)
- Aucune dépendance externe hormis Chart.js
- Fonctions courtes (< 30 lignes), early returns
- Protection XSS : toutes les chaînes utilisateur échappées via `escapeHtml()` avant injection DOM
- Les messages et labels affichés dans l'interface sont en français avec accents
