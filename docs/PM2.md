# PM2 - Guide rapide

PM2 gère deux processus pour Skills Matrix :

| Nom PM2 | Rôle | Port |
|---|---|---|
| `skills-matrix` | Serveur Express (proxy `/pb` + fichiers statiques) | 5500 |
| `skills-matrix-pb` | PocketBase (base de données) | 8140 |

## Commandes essentielles

```bash
# Démarrer les deux processus
npm run pm2

# Arrêter et supprimer les deux processus
npm run pm2:stop

# Voir les logs Express (30 dernières lignes)
npm run pm2:logs

# Logs PocketBase
pm2 logs skills-matrix-pb --lines 50

# Statut des deux processus
pm2 status

# Redémarrer un processus
pm2 restart skills-matrix
pm2 restart skills-matrix-pb
```

## Configuration (ecosystem.config.cjs)

```js
// skills-matrix  → Node.js sur port 5500
// skills-matrix-pb → PocketBase sur port 8140
```

Le fichier `ecosystem.config.cjs` à la racine du projet définit les deux apps.
`npm run pm2` est un alias pour `pm2 start ecosystem.config.cjs`.

## Démarrage automatique au boot

```bash
# Enregistrer la configuration PM2 pour le démarrage système
pm2 save
pm2 startup   # Suivre les instructions affichées
```

## Vérification de santé

```bash
# PocketBase OK ?
npm run health

# Ou manuellement
curl http://localhost:8140/api/health
curl http://localhost:5500/pb/api/health
```
