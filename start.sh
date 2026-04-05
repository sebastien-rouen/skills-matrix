#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start.sh - Skills Matrix : démarre PocketBase + le serveur web
#
# Usage :
#   ./start.sh               # ports par défaut (PB=8140, web=5500)
#   PB_PORT=9000 ./start.sh  # ports personnalisés
#
# Pour la communauté : clonez le repo, lancez ce script, ouvrez localhost:5500
# ─────────────────────────────────────────────────────────────────────────────

set -e

PB_PORT="${PB_PORT:-8140}"
APP_PORT="${APP_PORT:-5500}"
BDD_DIR="$(cd "$(dirname "$0")/bdd" && pwd)"

# ── Détection OS/Architecture (avant la vérification du binaire) ──────────────
PB_VERSION="0.36.6"
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
    x86_64)  ARCH_PB="amd64" ;;
    aarch64|arm64) ARCH_PB="arm64" ;;
    *)       echo "❌ Architecture non supportée : $ARCH"; exit 1 ;;
esac

case "$OS" in
    linux)  EXT="linux_${ARCH_PB}";  PB_BIN="$BDD_DIR/pocketbase" ;;
    darwin) EXT="darwin_${ARCH_PB}"; PB_BIN="$BDD_DIR/pocketbase" ;;
    mingw*|cygwin*|msys*) EXT="windows_${ARCH_PB}"; PB_BIN="$BDD_DIR/pocketbase.exe" ;;
    *)      echo "❌ OS non supporté : $OS"; exit 1 ;;
esac

# ── Téléchargement automatique de PocketBase si absent ───────────────────────
if [ ! -f "$PB_BIN" ]; then
    echo "📥 PocketBase introuvable, téléchargement en cours..."

    DL_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${EXT}.zip"
    TMP_ZIP="/tmp/pocketbase_${PB_VERSION}.zip"

    curl -fsSL "$DL_URL" -o "$TMP_ZIP"
    unzip -o "$TMP_ZIP" pocketbase -d "$BDD_DIR" 2>/dev/null || \
        unzip -o "$TMP_ZIP" pocketbase.exe -d "$BDD_DIR" 2>/dev/null || true
    rm -f "$TMP_ZIP"
    chmod +x "$PB_BIN" 2>/dev/null || true

    echo "✅ PocketBase $PB_VERSION installé dans bdd/"
fi

# ── Démarrage de PocketBase ───────────────────────────────────────────────────
echo "🗄️  Démarrage PocketBase sur le port $PB_PORT..."
"$PB_BIN" serve \
    --http="0.0.0.0:${PB_PORT}" \
    --dir="$BDD_DIR/pb_data" \
    --migrationsDir="$BDD_DIR/pb_migrations" \
    &
PB_PID=$!

# Attendre que PocketBase soit prêt (max 10s)
echo "⏳ Attente démarrage PocketBase..."
for i in $(seq 1 20); do
    if curl -sf "http://localhost:${PB_PORT}/api/health" > /dev/null 2>&1; then
        echo "✅ PocketBase prêt"
        break
    fi
    sleep 0.5
done

# ── Vérification des dépendances Node ────────────────────────────────────────
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -d "$APP_DIR/node_modules" ]; then
    echo "📦 Installation des dépendances npm..."
    (cd "$APP_DIR" && npm install)
fi

# ── Démarrage du serveur web ──────────────────────────────────────────────────
echo "🌐 Démarrage du serveur web sur le port $APP_PORT..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Skills Matrix : http://localhost:${APP_PORT}"
echo "  PocketBase    : http://localhost:${PB_PORT}"
echo "  Admin PB      : http://localhost:${PB_PORT}/_/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Trap pour arrêter PocketBase proprement à Ctrl+C
trap "echo ''; echo '👋 Arrêt...'; kill $PB_PID 2>/dev/null; exit 0" INT TERM

PORT="$APP_PORT" PB_PORT="$PB_PORT" node "$BDD_DIR/server.js"
