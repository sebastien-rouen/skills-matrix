# Changelog

Toutes les modifications notables de Skills Matrix sont documentees ici.

---

## [2.0.0] - 2026-03-09

### Refonte majeure — Templates, Serveur Express, Sources API

Refonte complete de l'application avec ajout d'un serveur Express, gestion des templates persistants, import depuis des API externes et nombreuses ameliorations UI.

### Templates et persistance

- **Serveur Express** : mini serveur local (`server.js`) pour la persistance des templates en fichiers JSON.
- **Templates built-in** : fichiers `.json` commites dans `templates/` (lecture seule).
- **Templates personnalises** : fichiers `.local.json` (gitignores), creables via l'interface.
- **Fallback localStorage** : detection automatique du serveur, sauvegarde locale si indisponible.
- **Import/Export** : import de templates `.json`, export individuel, suppression (templates locaux uniquement).
- **Modale de creation** : formulaire style avec apercu (nombre de membres/competences).

### Sources API externes

- **Import depuis API JSON** : connexion a des endpoints externes pour importer des membres.
- **Gestion des sources** : ajout, test de connexion, suppression.
- **Mapping flexible** : configuration des champs JSON vers le modele Skills Matrix.

### Dashboard ameliore

- **Section Developpement & Mentorat** : identification des mentors et apprenants potentiels.
- **Alertes critiques** : detection des competences couvertes par une seule personne.
- **KPIs de couverture** : anneaux de sante, priorites de formation.

### Parametres enrichis

- **Auto-categorisation** : algorithme de classification des competences avec modale avant/apres.
- **Gestion des categories** : ajout, suppression, assignation de competences.
- **Seuils de criticite** : configuration des niveaux d'alerte.
- **Backup/Restore** : export JSON complet, import avec confirmation.

### UI/UX

- **Toasts colores** : notifications avec fond gradie par type (succes, erreur, warning, info).
- **Modale reusable** : composant modal avec confirmation, annulation, fermeture Escape/backdrop.
- **Filtres avances** : recherche, categorie, role, niveau, criticite.
- **Sidebar renommee** : "Donnees" au lieu de "Importer" pour la vue d'import/templates.
- **Z-index fiabilise** : toasts toujours au premier plan (z-index 10000).

### Infrastructure

- **PM2** : configuration `ecosystem.config.cjs` pour lancement en arriere-plan.
- **Scripts npm** : `start`, `pm2`, `pm2:stop`, `pm2:logs`.
- **README complet** : documentation utilisateur avec emojis, deux modes de demarrage, FAQ.

### Fichiers modifies

- `server.js` (+123 lignes) - Serveur Express avec API templates CRUD
- `ecosystem.config.cjs` (+12 lignes) - Configuration PM2
- `js/services/templates.js` (+237 lignes) - Service templates (API + localStorage fallback)
- `js/services/api-source.js` (~286 lignes) - Service import depuis API externes
- `js/views/settings.js` (~562 lignes) - Vue parametres enrichie
- `js/views/import.js` (~299 lignes) - Vue donnees + templates
- `js/views/dashboard.js` (~170 lignes) - Dashboard ameliore
- `js/components/modal.js` (+58 lignes) - Modale de creation template
- `css/components.css` (+164 lignes) - Toasts colores, modale, badges

---

## [1.0.0] - 2026-02-15

### Commit initial

- Matrice heatmap membres x competences avec edition inline.
- Dashboard KPIs de couverture et alertes.
- Graphique radar par membre avec comparaison multi-profils.
- Import CSV/TSV (copier-coller ou upload).
- Sauvegarde automatique localStorage.
- Export CSV et JSON.
- Onboarding wizard pour les nouveaux utilisateurs.
- URL routing (`#matrix`, `#dashboard`, `#radar`, `#import`, `#settings`).
