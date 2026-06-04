# 📋 AutoPilote — Suivi de construction

> Plateforme multi-agents IA pour TPE/PME — 17 agents orchestrés par **Pilot**.
> Dernière mise à jour : **3 juin 2026**.

## ✅ État global : les 4 phases sont terminées

| Phase | Intitulé | Statut |
|-------|----------|--------|
| 1 | Fondations | ✅ Terminée |
| 2 | Premiers agents | ✅ Terminée |
| 3 | Interface commerciale | ✅ Terminée |
| 4 | Agents complets | ✅ Terminée |

---

## PHASE 1 — Fondations ✅

1. **Structure du projet Next.js** — `frontend/` (Next.js 14 + App Router + Tailwind CSS).
2. **Authentification JWT locale** — `backend/auth.js` (bcryptjs + jsonwebtoken), routes `/api/auth/*`, contexte React `lib/auth.js`.
3. **Dashboard utilisateur** — coque protégée `app/dashboard/layout.js` + vue d'ensemble.
4. **Connexion API Anthropic** — `backend/anthropic.js` (modèle `claude-sonnet-4-6`, repli automatique en mode démonstration sans clé).
5. **Agent Pilot (orchestrateur)** — `backend/agents/pilot.js` : analyse d'intention par mots-clés + délégation.

**Base de données** : SQLite via le module natif `node:sqlite` (aucune compilation, aucune config). Schéma dans `backend/db.js`.

## PHASE 2 — Premiers agents ✅

6. **Agent Léa (CRM)** — routes `/api/crm/*`, page `dashboard/crm`.
7. **Agent Sofia (support client)** — défini dans le registre, routé par Pilot.
8. **Agent Manon (comptabilité)** — routes `/api/billing/invoices`, page facturation.
9. **Interface de chat** — `app/dashboard/chat` : sélecteur d'agent, routage auto par Pilot, persistance des conversations.

## PHASE 3 — Interface commerciale ✅

10. **Page pricing (4 packs)** — `app/pricing` : Essentiel 297€, Croissance 749€, Elite 1 149€, Illimité 1 490€ + souscription (paiement **simulé**).
11. **Onboarding nouveaux clients** — `app/onboarding` : parcours guidé en 3 étapes par Léa.
12. **Tableau de bord analytics** — `app/dashboard` + routes `/api/analytics/*` (KPI, CA, activité par agent — agent Vox).

## PHASE 4 — Agents complets ✅

13. **Les 17 agents** — registre complet `backend/agents/registry.js` :
    - **AutoPilote (8)** : Léa, Max, Sofia, Clara, Tom, Alex, Hub, Vox
    - **Compta Pilote** : Manon
    - **Devis Pilote** : Manon D.
    - **Modules à la carte (8)** : Sol, Robin, Charly, Flora, Sam, Pablo, Victor, Maxi
14. **Gestion multi-utilisateurs** — champ `role` (owner/member/admin) + section équipe dans les paramètres.
15. **Tests & optimisations** — tests E2E backend (routage, CRM, facturation, abonnement, analytics) ✅ ; build de production frontend ✅ (14 routes) ; rendu visuel validé ✅.

---

## 🧪 Validation effectuée

- ✅ Backend démarre, `/api/health` répond.
- ✅ Inscription / connexion / JWT fonctionnels.
- ✅ Pilot route correctement : « prospection »→Max, « support »→Sofia, « devis »→Manon D.
- ✅ Choix d'agent forcé respecté.
- ✅ CRM, factures, devis, abonnement simulé, analytics opérationnels.
- ✅ Build Next.js de production réussi (aucune erreur, aucune erreur console).

## 📝 Notes & limitations connues

- **Mode IA** : sans `ANTHROPIC_API_KEY`, les agents répondent en *mode démonstration*
  (réponses simulées cohérentes). Renseigner la clé dans `backend/.env` active les vraies réponses Claude.
- **Paiements** : entièrement simulés (aucun Stripe), conformément aux consignes.
- **Multi-utilisateurs** : socle de données en place (rôles) ; l'invitation de collaborateurs
  est préparée mais non activée (évolution future).
