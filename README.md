# 📊 Skills Matrix

> Visualisez les competences de votre equipe en un coup d'oeil.
> Identifiez les lacunes critiques.
> Priorisez les formations.
> Le tout sans framework, sans build, sans backend.

---

## 💡 Pourquoi Skills Matrix ?

Chaque equipe a un tableur de competences qui dort dans un Drive. **Skills Matrix** le transforme en outil vivant :

- 📋 **Collez vos donnees** depuis Excel ou Google Sheets, c'est parti
- 🔍 **Reperez en 2 secondes** qui maitrise quoi grace a la heatmap couleur
- 🚨 **Identifiez les risques** : competences critiques couvertes par une seule personne
- 🎯 **Comparez les profils** avec des radars superposables
- ⚡ **Zero install** : un navigateur et un serveur HTTP, rien d'autre

---

## 🚀 Demarrage rapide

```bash
# 1. Cloner le depot
git clone https://gitlab.octo.tools/sebastien.rouen/skills-matrix.git
cd skills-matrix

# 2. Lancer un serveur local (au choix)
npx serve .                    # Node.js
python -m http.server 8080     # Python
# ou "Go Live" dans VS Code (extension Live Server)

# 3. Ouvrir http://localhost:8080 (ou :3000 avec npx serve)
```

> **Pourquoi un serveur ?** L'app utilise les modules ES natifs (`import`/`export`), qui necessitent le protocole HTTP.

---

## ✨ Fonctionnalites

| Vue | Description |
|-----|-------------|
| 🗂️ **Matrice** | Tableau heatmap membres x competences, edition inline, tri multi-colonnes, badges d'appetence |
| 📈 **Dashboard** | KPIs de couverture, alertes competences critiques, priorites de formation |
| 🕸️ **Radar** | Graphique radar par membre, comparaison multi-profils (jusqu'a 5), overlay moyenne equipe |
| 📥 **Import** | Collage direct depuis Excel/Sheets, upload CSV, donnees de demo en 1 clic |
| ⚙️ **Parametres** | Seuils de criticite, gestion des categories, delimiteur CSV, export/import JSON complet |

**Transversal :**
- 🔎 Filtres avancees (recherche, categorie, role, niveau, criticite)
- 💾 Sauvegarde automatique en `localStorage` a chaque modification
- 📤 Export CSV simple, CSV detaille et JSON (backup complet)
- 🏷️ Categories de competences avec auto-categorisation

---

## 📋 Format d'import

La premiere ligne contient les en-tetes. Les deux premieres colonnes sont **Nom** et **Role**, les suivantes sont les competences.

```
Nom;Role;JavaScript;React;Python;Docker
Jean Dupont;Developpeur;4/3;3/2;1/1;2/0
Marie Martin;Tech Lead;3/2;4/3;2/0;3/2
```

Chaque cellule suit le format **`niveau/appetence`** :

| Niveau | | Appetence | |
|:------:|------------|:---------:|-----------|
| 0 | Aucun | 0 | Aucune |
| 1 | Debutant | 1 | Faible |
| 2 | Intermediaire | 2 | Moyen |
| 3 | Confirme | 3 | Fort |
| 4 | Expert | | |

> Exemple : `3/2` = Confirme + Appetence Moyenne

**Delimiteurs supportes :** tabulation (copier-coller Excel/Sheets), point-virgule (`;`), virgule (`,`). Auto-detecte.

---

## 🏗️ Architecture

```
skills-matrix/
├── index.html                # Point d'entree unique
├── css/
│   ├── variables.css         # Design tokens (couleurs, typo, spacing)
│   ├── base.css              # Reset, layout global
│   ├── components.css        # Composants UI reutilisables
│   ├── matrix.css            # Heatmap et edition inline
│   └── charts.css            # Dashboard et graphiques
└── js/
    ├── app.js                # Init, routing entre vues
    ├── state.js              # Store centralise (pattern pub/sub)
    ├── models/data.js        # Modele de donnees, validation, stats
    ├── services/
    │   ├── storage.js        # Persistance localStorage
    │   ├── importer.js       # Parsing CSV/TSV
    │   ├── exporter.js       # Export CSV/JSON
    │   └── demos.js          # Jeux de donnees de demo
    ├── views/
    │   ├── matrix.js         # Vue matrice heatmap
    │   ├── dashboard.js      # Vue KPIs et alertes
    │   ├── radar.js          # Vue radar comparatif
    │   ├── import.js         # Vue import de donnees
    │   └── settings.js       # Vue parametres
    ├── components/
    │   ├── sidebar.js        # Navigation laterale
    │   ├── filters.js        # Barre de filtres
    │   ├── modal.js          # Dialogues modaux
    │   └── toast.js          # Notifications toast
    └── utils/helpers.js      # Fonctions utilitaires pures
```

**Patterns cles :**
- **Store pub/sub** : mutations via `setState()`, abonnement via `on(event, callback)`
- **Vues** : fonctions `renderXxxView(container)` qui recoivent un element DOM
- **Services** : fonctions pures sans acces DOM
- **CSS BEM** : `.block__element--modifier`

---

## 🛠️ Stack technique

| | |
|---|---|
| **Langages** | HTML5, CSS3 (custom properties, grid, flexbox), JavaScript ES2022+ (modules natifs) |
| **Graphiques** | [Chart.js 4.x](https://www.chartjs.org/) via CDN |
| **Typographie** | [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts |
| **Framework** | Aucun |
| **Build step** | Aucun |
| **Dependencies npm** | Aucune |

---

## Licence MIT
