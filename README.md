# Skills Matrix

Matrice de compétences interactive pour visualiser les skills d'une équipe, identifier les gaps critiques et planifier les formations.

## Fonctionnalités

- **Import en masse** - Collez des données depuis Excel/Google Sheets (TSV) ou CSV avec auto-détection du format
- **Matrice heatmap** - Vue tabulaire avec code couleur par niveau, badges d'appétence, tri et édition inline
- **Dashboard** - KPIs, alertes sur les compétences critiques, priorités de formation
- **Radar** - Graphique radar par personne avec superposition niveau/appétence et comparaison
- **Filtres avancés** - Recherche, filtrage par catégorie, rôle, niveau, criticité
- **Persistance** - Sauvegarde automatique en localStorage
- **Export** - CSV simple, CSV détaillé, JSON (backup/restauration)
- **Catégories** - Organisation des compétences par catégorie avec auto-catégorisation

## Démarrage rapide

1. Ouvrir `index.html` avec un serveur HTTP local (les modules ES nécessitent un serveur) :
   ```bash
   # Avec Python
   python -m http.server 8080

   # Avec Node.js (npx)
   npx serve .

   # Avec VS Code : installer l'extension "Live Server" et cliquer "Go Live"
   ```

2. Naviguer vers `http://localhost:8080`

3. Aller dans l'onglet **Import** et coller vos données

## Format d'import

### Structure
La première ligne contient les en-têtes. Les deux premières colonnes sont **Nom** et **Rôle**. Les colonnes suivantes sont les compétences.

```
Nom;Rôle;JavaScript;React;Python;Docker
Jean Dupont;Développeur;4/3;3/2;1/1;2/0
Marie Martin;Tech Lead;3/2;4/3;2/0;3/2
```

### Format des cellules
Chaque cellule contient `niveau/appétence` :

| Niveau | Signification |
|--------|--------------|
| 0 | Aucun |
| 1 | Débutant |
| 2 | Intermédiaire |
| 3 | Confirmé |
| 4 | Expert |

| Appétence | Signification |
|-----------|--------------|
| 0 | Aucune |
| 1 | Faible |
| 2 | Moyen |
| 3 | Fort |

Exemple : `3/2` = Confirmé avec appétence Moyenne

### Délimiteurs supportés
- Tabulation (copier-coller depuis Excel/Sheets)
- Point-virgule (`;`)
- Virgule (`,`)

Le délimiteur est auto-détecté.

## Architecture

```
skills-matrix/
├── index.html              # Point d'entrée
├── css/
│   ├── variables.css       # Design tokens (couleurs, typo, spacing)
│   ├── base.css            # Reset, layout global
│   ├── components.css      # Composants UI réutilisables
│   ├── matrix.css          # Styles de la matrice heatmap
│   └── charts.css          # Styles dashboard et graphiques
├── js/
│   ├── app.js              # Initialisation et routing
│   ├── state.js            # Store centralisé pub/sub
│   ├── models/data.js      # Modèle de données et statistiques
│   ├── services/
│   │   ├── storage.js      # Persistance localStorage
│   │   ├── importer.js     # Parsing CSV/TSV
│   │   └── exporter.js     # Export CSV/JSON
│   ├── views/
│   │   ├── matrix.js       # Vue matrice principale
│   │   ├── dashboard.js    # Vue dashboard KPIs
│   │   ├── radar.js        # Vue graphique radar
│   │   └── import.js       # Vue import de données
│   ├── components/
│   │   ├── sidebar.js      # Navigation latérale
│   │   ├── filters.js      # Barre de filtres
│   │   ├── modal.js        # Dialogues modaux
│   │   └── toast.js        # Notifications toast
│   └── utils/helpers.js    # Fonctions utilitaires
├── CLAUDE.md               # Instructions Claude Code
└── README.md               # Cette documentation
```

## Technologies

- HTML5 / CSS3 / JavaScript ES2022+
- [Chart.js](https://www.chartjs.org/) (via CDN) pour les graphiques radar
- [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts)
- Aucun framework, aucun build step, aucune dépendance npm
