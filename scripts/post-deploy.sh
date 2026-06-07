#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  Post-déploiement AutoPilote — à lancer après chaque deploy backend
#  (ou en "Post-deployment Command" Coolify).
#
#  1. Vérifie l'emplacement de la base (DATABASE_PATH) et crée le dossier
#  2. Seede le compte démo si la base est vide
#  3. Vérifie la connexion à Dolibarr
# ════════════════════════════════════════════════════════════════
set -uo pipefail

# Se place dans le dossier backend (où vivent db.js / seed.js / node_modules)
if [ -f "./db.js" ]; then cd "."; elif [ -f "./backend/db.js" ]; then cd "./backend"; \
elif [ -f "/app/backend/db.js" ]; then cd "/app/backend"; elif [ -f "/app/db.js" ]; then cd "/app"; fi
echo "📂 Dossier backend : $(pwd)"

# 1) Emplacement de la base
DB="${DATABASE_PATH:-$(pwd)/autopilote.db}"
mkdir -p "$(dirname "$DB")"
echo "🗄️  DATABASE_PATH : $DB"

# 2) Seed si la base est vide (aucun utilisateur)
COUNT=$(node -e "try{const{db,initSchema}=require('./db');initSchema();process.stdout.write(String(db.prepare('SELECT COUNT(*) AS n FROM users').get().n))}catch(e){process.stdout.write('ERR:'+e.message)}")
if [ "$COUNT" = "0" ]; then
  echo "🌱 Base vide → exécution du seed (compte démo)…"
  node seed.js
elif [[ "$COUNT" == ERR:* ]]; then
  echo "⚠️  Impossible de lire la base ($COUNT) — tentative de seed…"
  node seed.js || true
else
  echo "✅ Base déjà peuplée ($COUNT utilisateur(s)) — pas de seed."
fi

# 3) Vérification de la connexion Dolibarr (endpoint /status)
DURL="${DOLIBARR_HEALTH_URL:-https://dolibarr.famcofinances.com/api/index.php/status}"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 8 "$DURL" || echo 000)
if [ "$CODE" = "200" ]; then
  echo "✅ Dolibarr accessible ($DURL) — HTTP 200"
else
  echo "⚠️  Dolibarr ($DURL) — HTTP $CODE (vérifie le déploiement / module API REST)"
fi

echo "✅ Post-déploiement terminé."
