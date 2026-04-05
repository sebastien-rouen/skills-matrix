# Changelog

Toutes les modifications notables de Skills Matrix sont documentees ici.

---

## [2.1.0] - 2026-04-06

### Commentaires sur les evaluations

- Champ "Note" dans l'editeur inline de chaque cellule de competence.
- Permet d'ajouter une justification, un contexte ou une date de formation prevue.
- Indicateur visuel (icone bulle) sur les cellules ayant un commentaire.
- Note visible au survol (title) et dans l'editeur.
- Fonctionne dans les deux vues (defaut et transposee).

### Mode compact

- Toggle "Compact" dans la barre de controles de la matrice.
- Reduit la taille des cellules, avatars, badges et polices pour afficher plus de colonnes sans scroller.
- Ideal pour les equipes avec beaucoup de competences.
- Fonctionne avec les deux dispositions (defaut et transposee).

### Alertes Bus Factor

- Nouveau bloc d'alerte dedie dans le dashboard pour les SPOF (Single Point Of Failure).
- Affiche chaque competence reposant sur un seul Confirme/Expert, avec le nom du detenteur.
- Classement des "personnes les plus critiques" (cumulant le plus de SPOF).
- Severite visuelle adaptative : critique (> 5), avertissement (> 2), mineur.
- Noms de competences cliquables vers la matrice filtree.

### Heatmap appetence vs niveau

- Nouvelle section collapsible dans le dashboard.
- **Potentiels de montee en competence** : niveau bas (0-2) + appetence forte (2-3) = candidats ideaux pour formation.
- **Experts peu motives** : niveau haut (3-4) + appetence basse (0-1) = risque de desengagement.
- Cartes cliquables renvoyant vers la matrice filtree.

### Favoris / Epingles

- Bouton pin sur chaque header de competence et chaque nom de membre dans la matrice.
- Section "Epingles" en haut du dashboard affichant les KPIs des elements surveilles.
- Stats instantanees : C+E, couverture, niveau moyen (competences) ou expert/confirme count (membres).
- Retrait d'epingle en un clic (bouton ✕ au hover).
- Etat persiste dans le state (`pinnedSkills`, `pinnedMembers`).

### Gestion avancee des groupes

#### Gestionnaire de groupes dans les Parametres
- Nouvelle section "Groupes" dans les parametres avec referentiel complet.
- Liste des groupes avec compteur de membres et avatars.
- Renommage inline (clic sur le crayon, validation au blur/Enter).
- Suppression avec confirmation (retire le groupe de tous les membres).
- Affichage des membres "sans groupe" en bas de liste.

#### Affectation en masse
- Panel depliable "Affectation en masse" avec liste de tous les membres et checkboxes.
- Boutons "Tout cocher/Tout decocher" et compteur de selection.
- Choix du groupe cible (existant ou nouveau) via select.
- Actions "Ajouter au groupe" et "Retirer du groupe" en un clic.

#### Import de groupes via coller
- Panel depliable "Importer via coller" pour import rapide par copier-coller.
- Format accepte : `Membre ; Groupe` ou `Membre [tab] Groupe` (un par ligne).
- Preview instantanee : code couleur vert (valide), orange (membre non trouve), rouge (format invalide).
- Compteur de lignes valides/invalides avec badges.
- Bouton "Appliquer" actif uniquement quand des lignes valides existent.

#### Onglets de groupe dans la matrice
- Barre de tabs pills `[Tous] [GroupA] [GroupB]...` au-dessus du tableau.
- Chaque tab affiche le compteur de membres du groupe.
- Clic filtre la matrice sur le groupe selectionne (via `updateFilters`).
- Synchronise avec le filtre groupe existant et les parametres d'URL.

#### Comparaison inter-groupes sur le dashboard
- Nouvelle section "Comparaison inter-groupes" dans le dashboard (collapsible).
- Tableau comparatif : membres, niveau moyen, couverture (barre + %), critiques, experts, point fort.
- Noms de groupes cliquables (lien vers la matrice filtree).
- Section masquee automatiquement si aucun groupe n'existe.
- Navigation ajoutee dans la barre du dashboard.

#### Regroupement visuel dans la matrice
- Separateurs de groupe entre les lignes de la matrice (quand aucun filtre groupe n'est actif).
- Tri par defaut des membres par leur premier groupe, puis par nom.
- Chaque separateur affiche le nom du groupe et le nombre de membres.
- Membres sans groupe regroupes en fin de tableau.

#### Badges de groupe sur les chips radar
- Petit badge affichant le premier groupe du membre a cote de son nom dans les chips du radar.
- Style adapte a l'etat actif/inactif du chip.

---

### Ameliorations Profil Radar

#### Objectifs sur le radar
- Ligne en pointilles orange representant le niveau cible (Confirme) pour chaque competence ayant un objectif defini.
- Toggle "Objectifs" dans les controles pour afficher/masquer.
- Legende mise a jour avec l'indicateur objectif.

#### Export image PNG
- Bouton "Export PNG" dans le header pour telecharger le radar en image.

#### Filtre par groupe
- Nouveau select "Groupe" filtrant les chips membres par groupe d'appartenance.
- Reduit le bruit quand l'equipe a beaucoup de membres.

#### Appetence dans le profil et la comparaison
- Profil individuel : nouveau compteur "Motive" (appetence >= 2) dans les stats, grille 5 colonnes.
- Tableau de comparaison : icone d'appetence affichee a cote du niveau dans chaque cellule.

#### Liens vers la matrice
- Noms de competences cliquables dans le profil individuel et le tableau de comparaison.
- Clic navigue vers la matrice avec filtre de recherche pre-rempli.

---

### Ameliorations Matrice de competences

#### Ligne d'objectifs sous le header
- Nouvelle ligne affichant `actuel/cible` pour chaque competence ayant un objectif defini (via `state.objectives`).
- Code couleur : vert (atteint), orange (presque), rouge (loin de la cible).
- Calcule sur l'ensemble de l'equipe (pas affecte par les filtres).

#### Compteur de filtres
- Le sous-titre affiche desormais `3/6 membres · 8/12 competences` lorsque des filtres sont actifs.
- Retour a l'affichage standard quand aucun filtre n'est applique.

#### Highlight ligne/colonne au hover
- Surlignage visuel de la colonne entiere (header, objectifs, cellules, synthese) au survol d'une cellule.
- Fonctionne dans les deux vues (defaut et transposee).

#### Ligne de synthese en bas
- Nouvelle ligne `<tfoot>` affichant le nombre de Confirmes+Experts par competence.
- Mini-barre de couverture (pourcentage de membres ayant la competence > 0).
- Calcule sur les membres filtres (reflete ce qui est affiche).

#### Vue transposee - indicateurs d'objectifs
- Affichage inline `actuel/cible` a cote du nom de competence dans la vue transposee.

#### Edition inline des objectifs
- Clic sur toute cellule de la ligne objectifs ouvre un editeur compact (stepper +/-).
- Permet d'ajouter, modifier ou retirer un objectif directement depuis la matrice.
- Persistance automatique (state, PocketBase, template actif).

#### Filtres dans l'URL
- Les filtres actifs sont synchronises dans le hash URL (`#matrix?cat=Frontend&search=js`).
- Permet de partager un lien filtre ou retrouver sa vue apres un refresh.
- Restauration automatique des filtres au chargement de la vue.

#### Liens dashboard vers matrice
- Noms de competences cliquables dans les action cards, objectifs, barres de criticite et alertes appetence.
- Clic navigue vers la matrice avec filtre de recherche pre-rempli.

#### Raccourcis clavier affiches
- Bouton `?` flottant en bas a droite ouvrant un overlay des raccourcis.
- Raccourcis : fleches (navigation), Entree (editer), Echap (quitter), `/` (focus recherche), `?` (aide).

#### Impression / Export PDF
- CSS `@media print` : mise en page paysage, sidebar masquee, matrice liberee du scroll.
- Couleurs des niveaux preservees (`print-color-adjust: exact`).
- Bouton imprimer ajoute dans les actions du header.

---

### Refonte Dashboard - Architecture visuelle

#### Health Banner
- **Barre de synthese** en haut du dashboard : indicateur colore (vert/orange/rouge) avec message une ligne resumant l'etat global de l'equipe (competences critiques, SPOF).

#### KPIs enrichis (fusion KPIs + Rings)
- **Suppression de la section "Vue equipe" (rings SVG)** : les informations (couverture, sante, appetence) sont desormais integrees directement dans les KPI cards via des mini-rings et mini-barres.
- **Sous-detail visible** sous chaque KPI : breakdown roles, categories, niveaux - visible sans hover.
- **Popins preservees** pour le detail complet au survol.

#### Actions prioritaires (fusion formation + mentorat)
- **Section unifiee "Actions prioritaires"** : fusionne les anciennes sections "Priorites de formation" et "Developpement & Mentorat" en une seule zone actionnable.
- Chaque card montre : urgence, mentors (Expert/Confirme), candidats motives, jauge de couverture.
- **Objectifs d'equipe** integres dans cette section (quand definis).

#### Repartition par categorie
- **Barres de criticite groupees par categorie** avec accordeons plieables (au lieu d'une liste plate).
- Compteur de competences critiques par categorie dans le header d'accordeon.

#### Sections collapsibles
- Les sections "Repartition" et "Plan individuel" sont desormais repliables via clic sur le header.
- Chevron (▾/▸) indique l'etat ouvert/ferme.

#### Reduction de la redondance
- Suppression de la section "Vue equipe" (4 rings redondants avec les KPIs).
- Suppression de la section separee "Developpement & Mentorat" (fusionnee dans Actions).
- Le dashboard passe de 9 sections a 5 sections distinctes.

---

## [Non publie] - 2026-04-03

### Ameliorations Dashboard

#### Alertes cliquables

- **Detail par membre** : clic sur une alerte (Critique ou Attention) deplie la liste des membres ventiles par niveau (Expert → Non renseigne), avec badges colores.
- **Indicateur visuel** : fleche de toggle (▸/▾) sur chaque alerte.

#### Priorites de formation - clarification

- **Formateurs internes** : chaque carte affiche desormais les membres Confirmes/Experts capables de former en interne (label vert "Formateurs internes").
- **A former** : les personnes motivees (appetence >= 2) mais pas encore au niveau sont listees sous "A former (motives)" - le terme "Candidats" (ambigu) est supprime.
- **Formation externe** : si aucun formateur interne n'est disponible, un message explicite "formation externe necessaire" est affiche.

### Vue "Mon profil" (mode partage)

- **Nouvelle vue** : accessible depuis le menu lateral uniquement en mode partage (lien share).
- **Plan de developpement compact** : chaque item tient sur 2 lignes - competence, progression et priorite sur la premiere, formateurs internes sur la seconde (badges avec avatar).
- **En-tete personnel** : avatar, role, stats cles (Expert, Confirme, Motive, Score moyen), jauge de completion.
- **Repartition par niveau** : barres horizontales pour chaque niveau (Expert → Non renseigne).
- **Par categorie** : cards avec score moyen par categorie, detail des competences avec niveaux et appetences.
- **Mes forces** : liste des competences a niveau Confirme ou Expert avec badges visuels.
- **Je peux mentorer** : competences ou le membre peut accompagner des collegues moins avances, avec compteur.
- **Competences critiques** : lacunes sur des competences ou l'equipe manque de couverture, avec mentors suggerees.
- **Plan de developpement** : recommandations priorisees (Haute/Moyenne/Basse), barres de progression, mentors internes.

### Correction mode partage (share link)

#### Fiabilisation de la sauvegarde des competences

- **Merge au lieu de remplacement** : le serveur fusionne desormais les competences envoyees avec celles existantes en base, au lieu de remplacer tout l'objet skills. Corrige la perte de competences ajoutees par le facilitateur pendant qu'un visiteur remplit ses donnees.
- **Envoi delta uniquement** : le client n'envoie plus toutes les competences du membre, seulement celles modifiees depuis le dernier envoi.
- **Verification du retour PocketBase** : les endpoints share verifient le status code PB et remontent une erreur 502 si l'ecriture echoue (au lieu de repondre `success: true` silencieusement).
- **Indicateur visuel par cellule** : chaque cellule affiche son statut de synchronisation PB - bordure bleue pulsante (en cours), bordure verte (sauvegardee), bordure rouge avec `!` (erreur). Plus de doute sur ce qui est enregistre ou non.

---

## [Non publie] - 2026-04-02

### 5 nouvelles fonctionnalites utilisateur

#### Plan de developpement individuel

- **Section Dashboard** : selecteur de membre pour afficher un plan de developpement personnalise.
- **Algorithme de recommandation** : identifie les competences a developper en priorite selon la criticite, l'appetence et le niveau actuel.
- **Mentors suggerees** : pour chaque recommandation, affiche les mentors internes (Confirme/Expert).
- **Cartes visuelles** : grille de cards avec niveau actuel -> cible, priorite (Haute/Moyenne/Basse), et raison.

#### Recherche globale rapide (Ctrl+K)

- **Palette de commandes** : overlay accessible via Ctrl+K (ou Cmd+K) depuis n'importe quel ecran.
- **Recherche multi-type** : membres, competences, categories, vues navigables.
- **Navigation clavier** : fleches haut/bas, Entree pour selectionner, Echap pour fermer.
- **Resultats groupes** : affichage par type avec icones et descriptions.

#### Vue Objectifs d'equipe

- **Parametres > Objectifs** : interface pour definir des cibles (nombre minimum de Confirmes/Experts) par competence.
- **Dashboard** : section avec barres de progression vers les objectifs, compteur global d'objectifs atteints.
- **Persistance** : les objectifs sont sauvegardes dans le state et le template actif.

#### Raccourcis clavier dans la matrice

- **Navigation par fleches** : deplacement cellule par cellule (haut/bas/gauche/droite) dans la matrice.
- **Entree** : ouvre l'editeur inline sur la cellule focalisee.
- **Echap** : quitte le mode navigation clavier.
- **Focus visuel** : contour bleu + ombre sur la cellule active.

#### Indicateur derniere mise a jour par membre

- **Champ `lastUpdated`** : horodatage automatique a chaque modification de competence.
- **Affichage relatif** : "il y a 5 min", "il y a 2h", "il y a 3j" sous le nom du membre dans la matrice.
- **Helper `timeAgo()`** : fonction utilitaire pour le formatage temporel relatif en francais.

### Fichiers crees

- `js/components/command-palette.js` - Palette de recherche (Ctrl+K)

### Fichiers modifies

- `js/app.js` - Import et init de la palette de commandes
- `js/state.js` - Timestamp `lastUpdated` sur `updateSkill()`
- `js/models/data.js` - Champ `lastUpdated` dans `createMember()`, champ `objectives` dans `createDefaultState()`
- `js/utils/helpers.js` - Fonction `timeAgo()`
- `js/views/matrix.js` - Affichage `lastUpdated`, navigation clavier (fleches/Entree/Echap), cleanup
- `js/views/dashboard.js` - Section objectifs, plan de developpement individuel, `bindDashboardEvents()`
- `js/views/settings.js` - Section objectifs (ajout/modification/suppression de cibles par competence)
- `js/components/sidebar.js` - (inchange, importe par command-palette)
- `css/matrix.css` - Styles `.member-last-updated`, `.skill-cell--focused`
- `css/components.css` - Styles objectifs settings, palette de commandes
- `css/charts.css` - Styles plan de developpement, objectifs dashboard

---

## [Non publie] - 2026-03-20

### Édition du référentiel en mode partage

- **Vue "Référentiel"** : les personnes avec un lien partagé peuvent désormais accéder à une vue allégée "Paramètres" (sidebar label "Référentiel") pour modifier catégories et compétences.
- **Auto-save catégories** : chaque modification de catégorie/compétence en mode partage est immédiatement sauvegardée sur le serveur via `PUT /api/share/:token/categories`.
- **Backend** : nouvel endpoint `PUT /api/share/:token/categories` dans `bdd/server.js`.
- **Sidebar** : l'entrée "Paramètres" s'affiche sous le label "Référentiel" en mode partage.

### Fichiers modifiés

- `bdd/server.js` - endpoint `PUT /api/share/:token/categories`
- `js/services/share.js` - fonction `saveSharedCategories()`
- `js/app.js` - `settings` ajouté à `SHARE_ALLOWED_VIEWS`
- `js/components/sidebar.js` - filtre et label adaptatifs en mode partage
- `js/views/settings.js` - `renderShareReferentielView()`, `saveActiveTemplate()` asynchrone + mode partage

---

## [Non publie] - 2026-03-11

### Refactoring UI de la vue Parametres (categories et membres)

- **Layout categories** : affichage en grille 2 colonnes (responsive 1 colonne sur mobile) avec classe `.settings-categories-grid`.
- **Badges non categorisees** : les competences sans categorie affichent desormais deux actions distinctes - bouton "assigner" (modale de choix) et bouton de suppression, via la classe `.skill-uncategorized-badge`.
- **Cards membres** : remplacement du tableau par une grille de cards en 3 colonnes (`.settings-member-card`), avec avatar, nom/role editables en place, appetences et groupes affichables avec badges.
- **Helper `saveActiveTemplate()`** : sauvegarde immediate du template actif avant navigation pour eviter les ecrasements serveur.
- **Import `closeModal`** : ajout de l'import depuis le composant modal.

### Fichiers modifies

- `css/components.css` (+184 lignes) - styles settings categories grid, members grid, skill badges, member cards
- `js/views/settings.js` (+146/−78 lignes) - refactoring renderMemberCard, renderCategoryCard, helper saveActiveTemplate

---

## [Non publie] - 2026-03-10

### Mode partage securise pour les membres de l'equipe

- **Liens de partage** : generation de liens securises (token unique) pour permettre aux membres de remplir leurs competences.
- **Sidebar identique** : en mode partage, la sidebar reste intacte visuellement ; seuls les liens Import et Parametres sont masques, et le panneau template est cache.
- **Modale de selection** : a l'ouverture du lien, une modale propose au membre de selectionner son nom dans la liste. Un bandeau informatif s'affiche ensuite au-dessus des filtres de la matrice.
- **Edition restreinte** : seul le membre selectionne peut editer sa propre ligne dans la matrice.
- **Sauvegarde automatique** : les competences saisies sont sauvegardees sur le serveur via l'API (debounce 1.5s).
- **Vues analytiques** : Dashboard et Radar accessibles en lecture seule en mode partage.
- **Restrictions** : pas d'acces aux Parametres, Import, Export CSV, renommage de competences ou modification des autres membres.
- **Gestion des liens** : bouton "Partager" dans la sidebar, liste des liens actifs avec copie et revocation.
- **Securite** : tokens cryptographiques (base64url, 24 bytes), revocables manuellement, pas de persistence localStorage en mode partage.

#### Fichiers crees
- `js/services/share.js` - Service frontend pour la gestion des liens de partage
- `js/components/share-bar.js` - Modale de selection du membre + bandeau informatif au-dessus des filtres + auto-save

#### Fichiers modifies
- `server.js` - 6 nouveaux endpoints API (`/api/share`, `/api/shares/:id`)
- `js/app.js` - Detection du param `?share=TOKEN`, initialisation du mode partage
- `js/state.js` - Ajout `isShareMode()`, `getShareMemberName()`, `getShareToken()`
- `js/models/data.js` - Champs `shareMode`, `shareToken`, `shareMemberName` dans le state
- `js/views/matrix.js` - Restriction edition a la ligne du membre selectionne, masquage exports
- `js/components/sidebar.js` - Bouton "Partager", liste des liens actifs, copie/revocation
- `js/services/storage.js` - Skip persistence localStorage en mode partage
- `css/components.css` - Styles share-bar, selecteur membre, bouton/liens partage sidebar
- `css/matrix.css` - Styles lignes actives/verrouillees en mode partage
- `.gitignore` - Ajout `shares.json`

---

### Renommage de competences, auto-categorisation enrichie, auto-save template

- **Renommage inline** : clic sur le nom d'une competence dans la matrice pour la renommer (editeur positionne, Enter/Escape/blur).
- **Tri separe** : icone de tri distincte du nom de competence dans les en-tetes.
- **renameSkill()** : nouvelle mutation dans le store, renomme la competence pour tous les membres et toutes les categories.
- **Auto-categorisation enrichie** : 10 categories (DevOps, Cloud, Observabilite, Reseau, SRE, Strategie...) avec patterns regex etendus.
- **Creation de competences** : ajout direct depuis la gestion des categories (input + bouton "+"), creation dans tous les membres.
- **Auto-save template** : sauvegarde automatique debounced (2s) vers le template personnalise actif, toggle dans la sidebar.
- **Panel template sidebar** : card avec nom du template, badge, toggle switch custom (iOS-like), colle au footer.
- **Rechargement au refresh** : au F5, les donnees sont rechargees depuis le fichier template (travail collaboratif multi-utilisateurs).

### Fichiers modifies

- `js/components/sidebar.js` (~220 lignes) - Panel template, auto-save listener, toggle, pause/resume
- `js/app.js` (~155 lignes) - Rechargement template au demarrage
- `js/state.js` (+23 lignes) - Mutation renameSkill()
- `js/views/matrix.js` (+67 lignes) - Rename inline, separation nom/tri
- `js/views/settings.js` (+63 lignes) - 10 categories auto-categorisation, creation competences
- `js/views/import.js` (+8 lignes) - Reset activeTemplate au chargement demo
- `js/models/data.js` (+2 lignes) - activeTemplate et autoSaveTemplate dans le state
- `css/components.css` (+120 lignes) - Styles sidebar template card, toggle switch
- `css/matrix.css` (+9 lignes) - Style .skill-name hover

---

## [2.0.0] - 2026-03-09

### Refonte majeure - Templates, Serveur Express, Sources API

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
