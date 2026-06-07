#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  Reconnecte les conteneurs au réseau du proxy Coolify si nécessaire.
#  À lancer en SSH sur l'hôte Hetzner après un (re)déploiement, ou en
#  "Post-deployment command" dans Coolify.
#
#  Idempotent : ne fait rien si le conteneur est déjà sur le réseau.
#  Usage :   bash reconnect-coolify-network.sh [motif1 motif2 ...]
#  Défaut :  reconnecte les conteneurs dont le nom contient "dolibarr".
# ════════════════════════════════════════════════════════════════
set -uo pipefail

# 1) Détecte le réseau du proxy Coolify
PROXY=$(docker ps --format '{{.Names}}' | grep -Ei 'coolify-proxy|^traefik' | head -1)
if [ -z "${PROXY:-}" ]; then echo "❌ Proxy Coolify introuvable (coolify-proxy)."; exit 1; fi
NET=$(docker inspect "$PROXY" --format '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | grep -vi '^bridge$' | head -1)
if [ -z "${NET:-}" ]; then echo "❌ Réseau du proxy introuvable."; exit 1; fi
echo "🔌 Réseau proxy Coolify : $NET"

# 2) Conteneurs cibles (par motif de nom)
PATTERNS=("$@")
[ ${#PATTERNS[@]} -eq 0 ] && PATTERNS=("dolibarr")

for pat in "${PATTERNS[@]}"; do
  # On évite la base de données (réseau interne uniquement)
  for cid in $(docker ps --format '{{.ID}} {{.Names}}' | grep -i "$pat" | grep -vi 'dolibarr_db\|_db' | awk '{print $1}'); do
    name=$(docker inspect -f '{{.Name}}' "$cid" | sed 's#^/##')
    on=$(docker inspect "$cid" --format "{{range \$k,\$v := .NetworkSettings.Networks}}{{\$k}} {{end}}" | grep -ow "$NET" || true)
    if [ -n "$on" ]; then
      echo "✅ $name déjà sur $NET"
    else
      docker network connect "$NET" "$cid" && echo "🔗 $name connecté à $NET"
    fi
  done
done
echo "Terminé."
