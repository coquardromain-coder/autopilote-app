# 💾 Infrastructure AutoPilote sur Coolify v4.1.1 — Persistance & déploiement

Récapitulatif complet pour que **rien ne s'efface au redéploiement**.

---

## 1) 🌐 Services & URLs

| Service | URL | Hébergement |
|---------|-----|-------------|
| Frontend AutoPilote | https://autopilote.famcofinances.com | Coolify (Next.js) |
| Backend AutoPilote (API) | https://api.famcofinances.com | Coolify (Node/Express) |
| Dolibarr ERP | https://dolibarr.famcofinances.com | Coolify (Docker Compose) |
| Serveur | 157.180.72.230 | Hetzner |

---

## 2) 🔑 Variables d'environnement requises

### Frontend (build-time)
| Variable | Valeur |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://api.famcofinances.com` |

### Backend AutoPilote
| Variable | Valeur | Rôle |
|----------|--------|------|
| `DATABASE_PATH` | `/app/data/autopilote.db` | **Base sur volume persistant** |
| `JWT_SECRET` | (secret stable) | Auth |
| `ANTHROPIC_API_KEY` | (clé) | Agents IA |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` | Modèle |
| `FRONTEND_ORIGIN` | `https://autopilote.famcofinances.com` | CORS |
| `ENCRYPTION_KEY` | (32+ car. stable) | Chiffrement AES-256 des connecteurs |
| `BACKEND_URL` | `https://api.famcofinances.com` | OAuth réseaux sociaux |

### Dolibarr (Docker Compose)
| Variable | Valeur |
|----------|--------|
| `DOLIBARR_DB_PASSWORD` | `autopilote_doli_2026` |
| `DOLIBARR_DB_ROOT_PASSWORD` | `root_doli_2026` |
| `DOLIBARR_ADMIN_PASSWORD` | `Admin@AutoPilote2026` |
| `DOLIBARR_COMPANY_NAME` | `AutoPilote Client` |

---

## 3) 📦 Volumes persistants (Persistent Storage)

### Backend AutoPilote (service → Storages → + Add)
| Name | Destination Path |
|------|------------------|
| `autopilote-data` | `/app/data` |
> + variable `DATABASE_PATH=/app/data/autopilote.db`. Le code crée le dossier et
> logue `[DB] SQLite : /app/data/autopilote.db` au démarrage.

### Dolibarr (déclarés dans docker-compose.dolibarr.yml — volumes nommés)
| Volume | Chemin conteneur | Contenu |
|--------|------------------|---------|
| `dolibarr_conf` | `/var/www/html/conf` | `conf.php` (évite la ré-installation) |
| `dolibarr_documents` | `/var/www/html/documents` | Fichiers uploadés / documents |
| `dolibarr_db_data` | `/var/lib/mysql` | Base de données |

---

## 4) 🔌 Réseau Dolibarr (permanent)

`docker-compose.dolibarr.yml` attache Dolibarr au réseau **`coolify`** (external)
→ plus aucun `docker network connect` manuel après un redeploy.

```yaml
networks:
  coolify:
    external: true
  dolibarr_internal:
    driver: bridge
services:
  dolibarr:
    networks: [coolify, dolibarr_internal]
  dolibarr_db:
    networks: [dolibarr_internal]
```
Secours (si un conteneur perd le réseau) :
```bash
bash scripts/reconnect-coolify-network.sh
```

---

## 5) 🌱 Compte de démonstration (seed)

`backend/seed.js` (`npm run seed`) crée :
- **Email** : `demo@autopilote.fr`
- **Mot de passe** : `demo1234`
- **Société** : AutoPilote Démo
- **Secteur** : Générique
- **Pack** : Essentiel (pack d'entrée `starter`, 49€)

Le seed s'exécute automatiquement si la base est vide via le post-déploiement.

---

## 6) 🚀 Procédure de redéploiement SANS perte

1. **Backend** : vérifie `DATABASE_PATH=/app/data/autopilote.db` + Persistent Storage `/app/data`.
2. **Dolibarr** : redeploy avec `docker-compose.dolibarr.yml` (réseau + 3 volumes).
3. **Post-déploiement** (Coolify → Post-deployment Command du backend, ou en SSH) :
   ```bash
   bash scripts/post-deploy.sh
   ```
   → crée le dossier DB, seede si vide, vérifie Dolibarr.
4. **Vérifications** :
   - Logs backend : `[DB] SQLite : /app/data/autopilote.db`
   - `curl https://api.famcofinances.com/api/health` → `{"status":"ok",...}`
   - `curl -H "DOLAPIKEY: <clé>" https://dolibarr.famcofinances.com/api/index.php/status` → HTTP 200
   - Connexion `demo@autopilote.fr / demo1234`

### ⚠️ Migration des données existantes (une seule fois)
Si des données existent dans l'ancien fichier (avant volume) :
```bash
docker exec <backend> sh -lc 'mkdir -p /app/data && cp -n /app/backend/autopilote.db /app/data/autopilote.db 2>/dev/null || true'
```

---

## ✅ Check-list finale
- [ ] Backend : `DATABASE_PATH` + Persistent Storage `/app/data`
- [ ] Dolibarr : volumes `conf`, `documents`, `db_data` + réseau `coolify`
- [ ] `ENCRYPTION_KEY`, `JWT_SECRET`, `ANTHROPIC_API_KEY` définis (stables)
- [ ] Post-deploy command : `bash scripts/post-deploy.sh`
- [ ] Redeploy testé → données conservées + `demo@autopilote.fr` fonctionne
