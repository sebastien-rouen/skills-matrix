---
name: commit
description: Commit git serein - revue des changements, détection de risques, message conventionnel
argument-hint: "[message de commit optionnel ou description des changements]"
---

# Agent de Commit Git

Préparer et exécuter un commit git de manière sûre et méthodique.

## Contexte utilisateur

$ARGUMENTS

## Méthodologie

### 1. État des lieux

Exécuter en parallèle :
- `git status` pour voir les fichiers modifiés, ajoutés et non suivis
- `git diff --staged` pour voir ce qui est déjà dans le staging area
- `git diff` pour voir les changements non stagés
- `git log --oneline -5` pour connaître le style des derniers messages de commit

### 2. Contrôle de sécurité

Avant toute action, vérifier la présence de fichiers sensibles ou indésirables dans les changements :

**Fichiers à ne JAMAIS committer :**
- `.env`, `.env.*` (variables d'environnement, secrets)
- `credentials.json`, `secrets.*`, `*token*`, `*password*`
- `*.pem`, `*.key`, `*.p12` (certificats et clés privées)
- `node_modules/`, `dist/`, `build/` (dépendances et artefacts)
- `.DS_Store`, `Thumbs.db` (fichiers système)
- `*.log` (fichiers de log)

Si un fichier sensible est détecté :
1. **Avertir l'utilisateur** clairement avec le nom du fichier et le risque
2. **Ne PAS l'inclure** dans le staging
3. **Suggérer** de l'ajouter au `.gitignore` si ce n'est pas déjà fait

### 3. Staging intelligent

- Si des fichiers sont déjà stagés, les lister et demander si on ajoute les autres changements
- Si rien n'est stagé, proposer les fichiers à ajouter en les listant un par un
- **Toujours stager les fichiers par nom** (`git add fichier1 fichier2`), jamais `git add .` ou `git add -A`
- Exclure automatiquement les fichiers sensibles identifiés à l'étape 2

### 4. Rédaction du message de commit

Respecter le format **Conventional Commits** en s'alignant sur le style existant du dépôt :

```
<type>(<scope>): <description courte>

<corps optionnel - détail des changements>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

**Types :** `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `test`, `perf`

**Règles :**
- Le message décrit le **pourquoi**, pas le **quoi** (le diff montre déjà le quoi)
- Description courte < 70 caractères, en anglais, impératif présent
- Si l'utilisateur a fourni un message via `$ARGUMENTS`, l'utiliser comme base et l'enrichir si nécessaire
- Si aucun message n'est fourni, analyser le diff pour en déduire un message pertinent

### 5. Confirmation et exécution

Présenter à l'utilisateur un récapitulatif clair :

```
Fichiers à committer :
  M  js/views/matrix.js
  A  js/utils/newHelper.js

Message de commit :
  feat(matrix): add inline editing for skill levels

  Enable direct level/appetence editing from the matrix view
  with real-time state updates and localStorage persistence.

  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

Puis exécuter le commit.

### 6. Vérification post-commit

Après le commit :
- Exécuter `git status` pour confirmer que le working tree est propre (ou afficher ce qui reste)
- Exécuter `git log --oneline -3` pour montrer le commit créé
- **Ne PAS push** sauf si l'utilisateur le demande explicitement

## Règles strictes

- **Ne jamais `push`** sans demande explicite de l'utilisateur
- **Ne jamais utiliser `--force`**, `--no-verify`, `--amend`** sauf demande explicite
- **Ne jamais `git add .`** ou `git add -A`** : toujours lister les fichiers nommément
- **Ne jamais modifier la config git** (`git config`)
- Si un pre-commit hook échoue, corriger le problème et créer un **nouveau** commit (pas d'amend)
- Toujours utiliser un HEREDOC pour passer le message de commit à git
