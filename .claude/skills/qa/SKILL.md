---
name: qa
description: Passe QA - vérifier les fonctionnalités, tester les cas limites, contrôler la cohérence UI
argument-hint: "[feature ou vue à tester, ou 'full' pour une QA complète]"
---

# Agent QA

Effectuer une passe d'assurance qualité sur l'application en lisant le code et en vérifiant la logique.

## Périmètre

$ARGUMENTS

Si aucun périmètre n'est précisé, lancer une passe QA complète sur toutes les vues.

## Stratégie de test

### 1. Vérification du flux de données
Pour chaque vue, tracer le chemin complet des données :
- **Import** : collage/fichier -> parseur -> validation -> state
- **State** : getState() -> render -> affichage
- **Édition** : action utilisateur -> handler -> updateMember/updateSkill -> setState -> re-render
- **Export** : getState() -> exporter -> téléchargement

Vérifier : chaque étape gère-t-elle les données vides, les entrées malformées, les champs manquants ?

### 2. Contrôles vue par vue

#### Vue Import
- [ ] La zone de collage vide se soumet sans crash
- [ ] Un CSV/TSV malformé affiche un toast d'erreur clair
- [ ] Les données démo se chargent et remplissent toutes les vues
- [ ] Les noms de membres en doublon sont gérés
- [ ] Les caractères spéciaux dans les noms (accents, guillemets, virgules) sont préservés

#### Vue Matrice
- [ ] L'état vide affiche « Aucune donnée » avec lien vers l'import
- [ ] Tous les membres et compétences s'affichent dans le tableau
- [ ] Le clic sur une cellule de compétence ouvre l'éditeur inline
- [ ] Les changements de niveau/appétence persistent après rechargement
- [ ] Le tri par nom, ownership, niveau de compétence fonctionne dans les deux sens
- [ ] Les filtres (recherche, catégorie, rôle) réduisent les lignes/colonnes visibles
- [ ] L'export CSV contient toutes les données avec le bon délimiteur
- [ ] L'édition du nom met à jour les initiales de l'avatar
- [ ] L'éditeur de chips ownership/appétences ajoute et supprime les valeurs

#### Vue Dashboard
- [ ] Les cartes KPI affichent les bons décomptes
- [ ] Les graphiques en anneau montrent des pourcentages corrects
- [ ] Les popins affichent les détails au survol
- [ ] Les alertes de compétences critiques correspondent au seuil configuré
- [ ] Les graphiques s'affichent sans erreur JS

#### Vue Radar
- [ ] La sélection d'un seul membre affiche le profil avec badges
- [ ] La multi-sélection (2-5) affiche le tableau comparatif
- [ ] La sélection d'un 6e membre affiche un toast d'avertissement
- [ ] Le filtre par catégorie réduit les compétences du radar
- [ ] Le toggle moyenne équipe ajoute/retire la surcouche en pointillé
- [ ] Les compétences critiques ont des labels rouges sur le radar
- [ ] Le tri sur les colonnes du tableau comparatif fonctionne

#### Vue Paramètres
- [ ] Le changement de seuil se reflète dans la matrice et le dashboard
- [ ] La gestion des catégories (ajout/suppression/renommage) persiste
- [ ] Le réglage du délimiteur CSV affecte les exports
- [ ] L'export de sauvegarde JSON contient l'état complet
- [ ] L'import JSON restaure toutes les données

### 3. Préoccupations transversales
- [ ] localStorage sauvegarde à chaque changement de state
- [ ] Le rechargement de page préserve toutes les données et paramètres
- [ ] La navigation entre les vues ne laisse pas fuiter d'event listeners
- [ ] Les instances de Chart sont détruites au changement de vue
- [ ] Aucune erreur console en utilisation normale
- [ ] Le layout responsive fonctionne sous 1200px

### 4. Cas limites
- [ ] 0 membre : toutes les vues affichent l'état vide
- [ ] 1 membre avec 0 compétence : la matrice affiche une ligne vide
- [ ] 50+ compétences : la matrice scrolle horizontalement, le radar se limite à 12
- [ ] Nom de compétence avec caractères HTML : `<script>`, `"guillemets"`, `accénts`
- [ ] Membre sans ownership/appétences : affiche un tiret placeholder
- [ ] Tous les membres au niveau 0 : couverture à 0%, pas de faux positif critique

## Format de sortie

```
[OK/ÉCHEC] Vue > Cas de test - Détails
```

Terminer par un résumé : X réussis, Y échoués, Z ignorés. Lister tous les échecs avec la cause racine et le correctif suggéré.
