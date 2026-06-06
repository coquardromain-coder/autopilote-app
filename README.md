# 🎯 AutoPilote

**Plateforme SaaS multi-agents IA pour TPE/PME.** 17 agents spécialisés
orchestrés par **le Directeur**, l'agent central qui analyse chaque demande et la
délègue au bon spécialiste.

## 🧱 Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Node.js + Express |
| Base de données | SQLite via `better-sqlite3` (module npm standard, binaires précompilés, compatible toutes versions de Node) |
| Authentification | JWT local (bcryptjs + jsonwebtoken) |
| Agents IA | API Anthropic — `claude-sonnet-4-6` (repli en mode démo sans clé) |
| Paiements | Simulés (pas de Stripe) |

## 🤖 Les agents

- **Orchestrateur** : Directeur 🎯
- **AutoPilote (8)** : Commercial (CRM), Chasseur (prospection), Assistance (support), Créatif (contenu), Vocal (téléphonie), Relance (relances), Coordinateur (coordination), Analyste (analytics)
- **Compta Pilote** : Comptable 🧾
- **Devis Pilote** : Deviseur 📄
- **Modules à la carte (8)** : Recruteur (RH), Juriste (juridique), Référenceur (marketing), Community (réseaux sociaux), Formateur (SEO), Stratège (design), Technicien (veille), Assistant (e-commerce)

## 🚀 Démarrage rapide

Prérequis : **Node.js ≥ 16** (`better-sqlite3` fournit des binaires précompilés).

### 1. Backend (API)

```bash
cd backend
npm install
cp .env.example .env      # (Windows : copy .env.example .env)
npm run seed              # crée un compte de démo
npm start                 # API sur http://localhost:4000
```

> Compte de démonstration : **demo@autopilote.fr** / **demo1234**

Pour activer les vraies réponses des agents IA, renseignez `ANTHROPIC_API_KEY`
dans `backend/.env`. Sans clé, l'application reste 100% fonctionnelle en *mode démonstration*.

### 2. Frontend (interface)

```bash
cd frontend
npm install
npm run dev               # interface sur http://localhost:3000
```

Ouvrez http://localhost:3000 et connectez-vous avec le compte de démo.

## 📂 Structure

```
autopilote-app/
├── backend/              # API Express + SQLite + JWT + agents
│   ├── agents/           # registry.js (17 agents) + pilot.js (orchestrateur)
│   ├── routes/           # auth, chat, crm, billing, analytics
│   ├── db.js             # schéma SQLite (better-sqlite3)
│   ├── anthropic.js      # client API Anthropic
│   └── server.js         # point d'entrée
├── frontend/             # Next.js 14 + Tailwind
│   ├── app/              # pages (landing, auth, pricing, onboarding, dashboard)
│   ├── components/       # composants partagés
│   └── lib/              # api.js, auth.js, agents.js
├── PROGRESS.md           # suivi de construction (4 phases)
└── README.md
```

## 💶 Tarification

| Pack | Prix |
|------|------|
| Essentiel | 297 €/mois |
| Croissance | 749 €/mois |
| Elite | 1 149 €/mois |
| Illimité | 1 490 €/mois |

## 🔌 Principales routes API

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/register` · `/login` | Inscription / connexion |
| GET/PATCH | `/api/auth/me` | Profil & onboarding |
| POST | `/api/chat/message` | Envoyer un message (le Directeur route) |
| GET/POST | `/api/crm/contacts` | CRM (Commercial) |
| GET/POST | `/api/billing/invoices` · `/quotes` | Factures & devis |
| POST | `/api/billing/subscribe` | Abonnement (paiement simulé) |
| GET | `/api/analytics/overview` | Indicateurs (Analyste) |
| GET | `/auth/google` · `/auth/google/callback` | Flux OAuth Google |
| GET | `/api/google/status` | État de la connexion Google |
| POST | `/api/google/gmail/send` | Envoyer un email (Gmail) |
| GET/POST | `/api/google/calendar/events` | Rendez-vous (Calendar) |
| GET/POST | `/api/google/drive/files` | Documents (Drive) |

## 🔗 Intégration Google (Gmail, Calendar, Drive)

1. Placez le fichier `client_secret_*.json` (téléchargé depuis Google Cloud Console)
   dans `backend/` — il est détecté automatiquement.
2. Dans la **Google Cloud Console**, vérifiez que :
   - les API **Gmail**, **Google Calendar** et **Google Drive** sont activées ;
   - l'URI de redirection autorisé est bien `http://localhost:4000/auth/google/callback` ;
   - votre compte Google est ajouté comme **utilisateur test** (si l'écran de consentement est en mode « Test »).
3. Connectez-vous à l'app → **Intégrations Google** → *Se connecter avec Google*.

Scopes demandés : `gmail.send`, `calendar.events`, `drive.file` (+ identité). Les
jetons (avec *refresh token*) sont stockés par utilisateur et rafraîchis automatiquement.
