---
name: code-review
description: Revue de code - qualité, bugs, sécurité et respect des conventions du projet
argument-hint: "[chemin du fichier ou 'all' pour une revue complète]"
---

# Agent de Revue de Code

Effectuer une revue de code approfondie sur le périmètre spécifié.

## Périmètre

$ARGUMENTS

Si aucun périmètre n'est précisé, examiner les fichiers récemment modifiés (`git diff` ou `git status`).

## Checklist de revue

### 1. Justesse
- La logique correspond-elle à l'intention ? Tracer les cas limites.
- Toutes les branches sont-elles gérées (tableaux vides, valeurs null, 0 vs false) ?
- Les opérations asynchrones sont-elles correctement attendues ?
- Les event listeners sont-ils nettoyés au changement de vue ?

### 2. Sécurité
- Les entrées utilisateur sont-elles échappées avant insertion HTML (`escapeHtml()`) ?
- Y a-t-il des vecteurs XSS (innerHTML avec données non échappées) ?
- Des données sensibles sont-elles exposées dans localStorage ou la console ?
- Les URLs externes sont-elles validées ?

### 3. Gestion du state
- `getState()` est-il appelé au moment du render (pas de références figées) ?
- Les mutations du state passent-elles par `setState()` / les updaters dédiés ?
- `structuredClone()` est-il utilisé pour empêcher les mutations accidentelles ?
- Les événements sont-ils émis après les changements de state pour les abonnés ?

### 4. Performance
- Les calculs coûteux sont-ils mis en cache quand appelés dans des boucles ?
- `Chart.destroy()` est-il appelé avant de créer de nouvelles instances ?
- Les requêtes DOM sont-elles scopées au container (pas de `document.querySelector` dans les vues) ?
- Les event listeners sur `document` sont-ils nettoyés ?

### 5. CSS & UI
- Les conventions de nommage BEM sont-elles respectées ?
- Les CSS custom properties sont-elles utilisées au lieu de valeurs en dur ?
- Le layout est-il responsive (breakpoints grid) ?
- Les éléments interactifs sont-ils accessibles au clavier ?

### 6. Style de code
- Chaque fonction exportée a-t-elle un commentaire JSDoc ?
- Les séparateurs de section (`/* --- Nom --- */`) sont-ils utilisés dans le CSS ?
- Le français est-il utilisé pour le texte UI et l'anglais pour le code/commentaires ?
- Les imports sont-ils organisés (state, models, components, utils) ?

## Format de sortie

Pour chaque constat, rapporter :

```
[SÉVÉRITÉ] fichier:ligne - Description
  Contexte : ce que fait le code
  Problème : ce qui ne va pas
  Correctif : correction suggérée
```

Sévérités : `BUG` | `SÉCURITÉ` | `PERF` | `STYLE` | `SUGGESTION`

Terminer par un résumé : total des constats par sévérité, évaluation globale.
