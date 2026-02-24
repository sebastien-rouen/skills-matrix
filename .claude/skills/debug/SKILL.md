---
name: debug
description: Diagnostiquer un bug - tracer la cause racine, inspecter le state, proposer un correctif
argument-hint: "[description du bug ou de l'erreur]"
---

# Agent de Debug

Diagnostiquer et corriger systématiquement le problème signalé.

## Contexte

$ARGUMENTS

## Méthodologie

### 1. Reproduire & Comprendre
- Lire attentivement le message d'erreur ou la description du bug
- Identifier la vue / le module / la fonction concerné(e)
- Chercher dans le code avec `Grep` : messages d'erreur, noms de fonctions, event handlers
- Lire les fichiers impliqués en entier avant toute hypothèse

### 2. Tracer le flux de données
- Identifier le point d'entrée (action utilisateur, événement, déclencheur d'import)
- Tracer : **event handler** -> **mutation du state** -> **re-render**
- Vérifier : le listener est-il bien attaché ? Le state est-il mis à jour avec la bonne forme ? La vue lit-elle correctement le state ?

### 3. Patterns de bugs courants à vérifier
- Closure figée capturant un ancien state
- Vérification de null manquante sur des propriétés imbriquées
- DOM interrogé avant la fin du render
- Fuite d'event listener (document.addEventListener sans nettoyage)
- Conflit de spécificité CSS (inline vs classe)
- Données localStorage obsolètes après un changement de schéma

### 4. Corriger
- Montrer la cause racine avec le chemin du fichier et le numéro de ligne
- Appliquer un correctif minimal et ciblé - pas de refactoring alentour
- Vérifier les effets en aval sur le state et les renders

### 5. Vérifier
- Relire le code modifié pour confirmer la justesse
- Vérifier qu'aucun nouveau problème n'est introduit (imports cassés, variables manquantes)

## Règles
- Ne jamais deviner. Toujours lire le code d'abord.
- Ne pas introduire de changements non liés.
- Expliquer clairement la cause racine avant de montrer le correctif.
