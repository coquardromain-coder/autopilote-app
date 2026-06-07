# 💾 Persistance des données sur Coolify v4.1.1 — AutoPilote + Dolibarr

Sans volume persistant, **les données s'effacent à chaque redéploiement**.
Voici la configuration exacte à appliquer dans Coolify pour chaque service.

---

## 1) Backend AutoPilote — base SQLite

La base est un fichier SQLite. Par défaut `backend/autopilote.db` (dans le
conteneur → **effacé au redeploy**). Le code lit désormais la variable
`DATABASE_PATH` pour la placer sur un volume persistant.

### a. Variable d'environnement (Coolify → service backend → Environment Variables)
```
DATABASE_PATH=/app/data/autopilote.db
```
> `/app` est le répertoire de travail des apps Coolify (Nixpacks/Dockerfile).
> Le code crée automatiquement le dossier `/app/data` au démarrage.

### b. Persistent Storage (Coolify → service backend → Storages → + Add)
| Champ | Valeur |
|------|--------|
| Name | `autopilote-data` |
| Destination Path (dans le conteneur) | `/app/data` |

→ Après redeploy, vérifie : `[DB] SQLite : /app/data/autopilote.db` dans les logs.
   Le fichier `/app/data/autopilote.db` survit désormais aux redéploiements.

> 💡 Si tu avais déjà des données dans l'ancien fichier, copie-le une fois :
> ```bash
> # en SSH sur l'hôte, dans le conteneur backend :
> docker exec <backend> sh -lc 'mkdir -p /app/data && cp -n /app/backend/autopilote.db /app/data/autopilote.db 2>/dev/null || true'
> ```

---

## 2) Dolibarr — déjà géré par le compose

Le `docker-compose.dolibarr.yml` déclare des **volumes nommés** (persistants par
défaut sur Coolify). Aucune action manuelle si tu utilises ce compose.

| Volume | Chemin conteneur | Contenu |
|--------|------------------|---------|
| `dolibarr_documents` | `/var/www/documents` | Documents & données Dolibarr |
| `dolibarr_conf` | `/var/www/html/conf` | `conf.php` (évite la ré-installation) |
| `dolibarr_db_data` | `/var/lib/mysql` | Base MySQL |

Si tu préfères les déclarer en **Persistent Storage** dans l'UI Coolify
(service dolibarr → Storages) :
| Name | Destination Path |
|------|------------------|
| `dolibarr-documents` | `/var/www/documents` |
| `dolibarr-conf` | `/var/www/html/conf` |

Et pour le service `dolibarr_db` :
| Name | Destination Path |
|------|------------------|
| `dolibarr-db` | `/var/lib/mysql` |

---

## 3) Réseau Dolibarr permanent

Le compose connecte Dolibarr au réseau `coolify` (externe) → **plus de
`docker network connect` manuel** après redeploy.

Si jamais un conteneur perd le réseau (cas rare), lance le script idempotent :
```bash
bash scripts/reconnect-coolify-network.sh
```
Tu peux aussi le mettre en **Post-deployment Command** dans Coolify.

> ⚠️ Vérifie le nom réel du réseau proxy (souvent `coolify`) :
> ```bash
> docker inspect coolify-proxy --format '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}'
> ```
> S'il diffère, remplace `coolify` dans `docker-compose.dolibarr.yml`.

---

## ✅ Check-list de redéploiement sans perte de données
- [ ] Backend : `DATABASE_PATH=/app/data/autopilote.db` + Persistent Storage `/app/data`
- [ ] Dolibarr : volumes `documents`, `conf`, `db_data` présents
- [ ] Réseau `coolify` attaché (compose) ou script de reconnexion en post-deploy
- [ ] Redeploy → vérifier les logs (`[DB] SQLite : /app/data/...`) et l'accès Dolibarr
