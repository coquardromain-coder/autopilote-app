#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  Diagnostic + correction live du Bad Gateway Dolibarr (Coolify v4)
#  À exécuter en SSH DIRECT sur l'hôte Hetzner :
#     ssh root@157.180.72.230  puis coller ce script (ou:  bash diagnose-dolibarr.sh)
# ════════════════════════════════════════════════════════════════
set -uo pipefail
DOMAIN="dolibarr.famcofinances.com"
line(){ echo "──────────────────────────────────────────────"; }

line; echo "1) RÉSEAUX DOCKER"; line
docker network ls

line; echo "2) CONTENEURS DOLIBARR"; line
docker ps --format '{{.Names}}\t{{.Status}}\t{{.Image}}' | grep -i doli || echo "  (aucun conteneur dolibarr)"

line; echo "3) RÉSEAU(X) DU PROXY COOLIFY"; line
PROXY=$(docker ps --format '{{.Names}}' | grep -Ei 'coolify-proxy|traefik' | head -1)
echo "  Proxy détecté: ${PROXY:-introuvable}"
PROXYNET=""
if [ -n "${PROXY:-}" ]; then
  docker inspect "$PROXY" --format '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}'
  PROXYNET=$(docker inspect "$PROXY" --format '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | grep -vi '^bridge$' | head -1)
fi
echo "  → Réseau proxy retenu: ${PROXYNET:-inconnu}"

line; echo "4) L'APP RÉPOND-ELLE SUR SON PORT 80 ?"; line
DID=$(docker ps -qf name=dolibarr | head -1)
if [ -z "$DID" ]; then echo "  ❌ conteneur dolibarr introuvable"; else
  IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' "$DID" | awk '{print $1}')
  echo "  IP interne Dolibarr: $IP"
  echo "  Réseaux du conteneur dolibarr:"
  docker inspect "$DID" --format '{{range $k,$v := .NetworkSettings.Networks}}   - {{$k}}{{println}}{{end}}'
  BODY=$(curl -s -m 5 "http://$IP:80/" | head -c 200)
  if [ -n "$BODY" ]; then echo "  ✅ APP RÉPOND (extrait): ${BODY:0:120}"; APP_OK=1
  else echo "  ❌ APP NE RÉPOND PAS sur :80 (problème image/DB, voir logs)"; APP_OK=0; fi
fi

line; echo "5) LOGS DOLIBARR (30 dernières lignes)"; line
[ -n "${DID:-}" ] && docker logs "$DID" --tail 30 2>&1 || true

# ── CORRECTION LIVE : si l'app répond mais n'est pas sur le réseau proxy ──
line; echo "6) TENTATIVE DE CORRECTION AUTOMATIQUE"; line
if [ "${APP_OK:-0}" = "1" ] && [ -n "$PROXYNET" ] && [ -n "${DID:-}" ]; then
  ON_NET=$(docker inspect "$DID" --format "{{range \$k,\$v := .NetworkSettings.Networks}}{{\$k}} {{end}}" | grep -ow "$PROXYNET" || true)
  if [ -z "$ON_NET" ]; then
    echo "  Dolibarr n'est PAS sur '$PROXYNET' → connexion en cours…"
    docker network connect "$PROXYNET" "$DID" && echo "  ✅ Connecté à '$PROXYNET'. Teste maintenant: https://$DOMAIN"
    echo "  ⚠️ Correction temporaire (perdue au prochain redeploy). Applique la version"
    echo "     Coolify-native du docker-compose.dolibarr.yml pour une fix durable."
  else
    echo "  Dolibarr est déjà sur '$PROXYNET'. Le 502 vient probablement des LABELS"
    echo "  Traefik (port/règle) → utilise docker-compose.dolibarr.yml (SERVICE_FQDN)"
    echo "  et mets le domaine dans 'Domains' du service, puis redeploy."
  fi
elif [ "${APP_OK:-0}" = "0" ]; then
  echo "  L'app ne répond pas sur son port → ce n'est PAS le routage."
  echo "  Vérifie la connexion MySQL dans les logs ci-dessus (DOLI_DB_HOST=dolibarr_db)."
  echo "  Si 1er déploiement: patiente 2-3 min (install Dolibarr en cours)."
else
  echo "  Diagnostic incomplet — copie les sorties ci-dessus."
fi
line; echo "Diagnostic terminé."
