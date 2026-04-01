# PocketBase — Guide rapide

PocketBase est la base de données embarquée de Skills Matrix.
Elle tourne sur le **port 8140** et est gérée par PM2 (`skills-matrix-pb`).

## Démarrage

```bash
# Via PM2 (recommandé)
npm run pm2

# Manuel (debug)
cd bdd && ./pocketbase serve --http=0.0.0.0:8140 --dir=pb_data --migrationsDir=pb_migrations
```

## Interfaces d'administration

| Environnement | URL |
|---|---|
| Local | http://localhost:5500/pb/_/ |
| Local (direct) | http://localhost:8140/_/ |
| Drafts BastaVerse | https://skills-matrix-drafts.bastou.dev/pb/_/ |
| Prod BastaVerse | https://skills-matrix.bastou.dev/pb/_/ |

Identifiants par défaut : `admin@skills-matrix.local` / `Admin2026$`
(modifiables via `npm run superuser`)

## Collections

| Collection | Rôle |
|---|---|
| `skills_categories` | Référentiel global des catégories |
| `skills_competences` | Référentiel global des compétences (liées à une catégorie) |
| `skills_equipes` | Équipes (identifiées par un `code` unique) |
| `skills_membres` | Membres d'une équipe |
| `skills_equipe_competences` | Pivot : quelles compétences chaque équipe évalue |
| `skills_evaluations` | Évaluations atomiques (1 ligne = 1 membre × 1 compétence) |

## Migrations

Les migrations sont dans `bdd/pb_migrations/`. PocketBase les exécute automatiquement au démarrage, dans l'ordre chronologique (timestamp dans le nom de fichier).

| Fichier | Contenu |
|---|---|
| `1741737600_init_skills_matrix.js` | Création du schéma (toutes les collections) |
| `1773187200_seed_equipes.js` | Seed : Equipe GABBIANO, Equipe FUEGO v2, Tribu Value |

### Rejouer les migrations (reset complet)

```bash
# Arrêter PM2
npm run pm2:stop

# Supprimer les données (ATTENTION : irréversible)
rm -rf bdd/pb_data

# Relancer — PocketBase recrée tout depuis les migrations
npm run pm2
```

## Niveaux de compétence

| Valeur | Signification |
|:---:|---|
| 0 | Aucun |
| 1 | Débutant |
| 2 | Intermédiaire |
| 3 | Confirmé |
| 4 | Expert |

## Appétence

| Valeur | Signification |
|:---:|---|
| 0 | Aucune |
| 1 | Faible |
| 2 | Moyen |
| 3 | Fort |

## Règles d'accès

Les collections sont en lecture publique (`listRule: ''`, `viewRule: ''`).
Les écritures sont ouvertes pour les collections de données (équipes, membres, évaluations).
Les suppressions d'équipes sont réservées à l'admin PocketBase (rule `null`).

## Compétences partagées entre équipes

Certaines compétences apparaissent dans plusieurs équipes (ex: `Agile`, `Leadership`, `Ansible`).
Elles partagent le **même enregistrement** dans `skills_competences`.
La catégorie associée est déterminée par l'ordre de création (première équipe seedée = Gabbiano).
