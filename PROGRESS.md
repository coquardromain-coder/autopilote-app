# 📋 AutoPilote — Suivi de construction

> Plateforme multi-agents IA pour TPE/PME — 17 agents orchestrés par **le Directeur**.
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
5. **Agent Directeur (orchestrateur)** — `backend/agents/pilot.js` : analyse d'intention par mots-clés + délégation.

**Base de données** : SQLite via `better-sqlite3` (module npm standard avec binaires précompilés, compatible production et toutes versions de Node). Schéma dans `backend/db.js`.

## PHASE 2 — Premiers agents ✅

6. **Agent Commercial (CRM)** — routes `/api/crm/*`, page `dashboard/crm`.
7. **Agent Assistance (support client)** — défini dans le registre, routé par le Directeur.
8. **Agent Comptable (comptabilité)** — routes `/api/billing/invoices`, page facturation.
9. **Interface de chat** — `app/dashboard/chat` : sélecteur d'agent, routage auto par le Directeur, persistance des conversations.

## PHASE 3 — Interface commerciale ✅

10. **Page pricing (4 packs)** — `app/pricing` : Essentiel 297€, Croissance 749€, Elite 1 149€, Illimité 1 490€ + souscription (paiement **simulé**).
11. **Onboarding nouveaux clients** — `app/onboarding` : parcours guidé par Commercial.
12. **Tableau de bord analytics** — `app/dashboard` + routes `/api/analytics/*` (KPI, CA, activité par agent — agent Analyste).

## PHASE 4 — Agents complets ✅

13. **Les 17 agents** — registre complet `backend/agents/registry.js` :
    - **AutoPilote (8)** : Commercial, Chasseur, Assistance, Créatif, Vocal, Relance, Coordinateur, Analyste
    - **Compta Pilote** : Comptable
    - **Devis Pilote** : Deviseur
    - **Modules à la carte (8)** : Recruteur, Juriste, Référenceur, Community, Formateur, Stratège, Technicien, Assistant
14. **Gestion multi-utilisateurs** — champ `role` (owner/member/admin) + section équipe dans les paramètres.
15. **Tests & optimisations** — tests E2E backend (routage, CRM, facturation, abonnement, analytics) ✅ ; build de production frontend ✅ (14 routes) ; rendu visuel validé ✅.

---

## 🧪 Validation effectuée

- ✅ Backend démarre, `/api/health` répond.
- ✅ Inscription / connexion / JWT fonctionnels.
- ✅ Le Directeur route correctement : « prospection »→Chasseur, « support »→Assistance, « devis »→Deviseur
- ✅ Choix d'agent forcé respecté.
- ✅ CRM, factures, devis, abonnement simulé, analytics opérationnels.
- ✅ Build Next.js de production réussi (aucune erreur, aucune erreur console).

---

## 🚀 PHASE 5 — Personnalisation métier & expérience premium ✅

Ajoutée après les 4 phases initiales.

### Étape 1 — Prompts experts des agents ✅
Chaque agent (`backend/agents/registry.js`) dispose d'un **prompt système expert** :
socle commun (français, ton pro & accessible, expertise métier, adaptation au secteur,
cadre légal FR) + spécialisation approfondie (méthodes, vocabulaire, bonnes pratiques)
pour Directeur, Commercial, Chasseur, Assistance, Créatif, Vocal, Relance, Coordinateur, Analyste, Comptable, Deviseur (+ 8 modules).

### Étape 2 — Secteurs d'activité ✅
`backend/sectors.js` : **8 secteurs préconfigurés** (Traiteur, Restaurant, Artisan,
Commerce, Profession libérale, Immobilier, Beauté/Bien-être, Générique). Chacun fournit
contexte métier, vocabulaire, types de clients, prestations courantes et saisonnalité.

### Étape 3 — Modèles de documents ✅
`backend/templates.js` : devis, **facture (mentions légales FR + TVA)**, email de
prospection (3 variantes/secteur), relance (J+3 / J+7 / J+15), email de bienvenue,
compte-rendu de réunion. Rendus pré-remplis avec les infos de l'entreprise.

### Étape 4 — Onboarding guidé 5 étapes ✅
`frontend/app/onboarding` (design dark premium) :
1. Infos entreprise (nom, SIRET, adresse, logo) · 2. Secteur · 3. Prestations & tarifs
· 4. Brief agents · 5. Google Workspace (optionnel) → dashboard.

### Étape 5 — Paramètres enrichis ✅
`frontend/app/dashboard/settings` : sections Mon entreprise, Mes prestations,
Contexte agents (secteur + brief), Modèles de documents (prévisualisation).

### 🔌 Injection automatique du contexte
`backend/context.js` construit un bloc « contexte entreprise » (secteur + infos légales
+ prestations + brief) injecté dans le prompt de chaque agent à chaque message
(`routes/chat.js` → `agents/pilot.js`). Les réponses sont ainsi personnalisées sans
que le client ait à répéter son contexte. Migration BD non destructive (`db.js`).

**Validé** : agent Deviseur chiffre un devis avec les vraies prestations et la TVA du
client ; prévisualisation des modèles pré-remplie ; onboarding et paramètres rendus en
dark premium ; build de production OK.

---

## 🏷️ PHASE 6 — Renommage des agents en noms de poste ✅

Tous les agents ont été renommés (prénoms → noms de poste), **IDs techniques inclus**
(en minuscules, sans accent), dans tout le code et l'interface :

| Avant | Après | id technique |
|---|---|---|
| Pilot | Directeur | `directeur` |
| Léa | Commercial | `commercial` |
| Max | Chasseur | `chasseur` |
| Sofia | Assistance | `assistance` |
| Clara | Créatif | `creatif` |
| Tom | Vocal | `vocal` |
| Alex | Relance | `relance` |
| Hub | Coordinateur | `coordinateur` |
| Vox | Analyste | `analyste` |
| Manon | Comptable | `comptable` |
| Manon D. | Deviseur | `deviseur` |
| Sol | Recruteur | `recruteur` |
| Robin | Juriste | `juriste` |
| Charly | Référenceur | `referenceur` |
| Flora | Community | `community` |
| Sam | Formateur | `formateur` |
| Pablo | Stratège | `stratege` |
| Victor | Technicien | `technicien` |
| Maxi | Assistant | `assistant` |

Fichiers mis à jour : `registry.js` (ids, noms, prompts système), `pilot.js`, `chat.js`,
`lib/agents.js`, chat, dashboard, onboarding, CRM, facturation, landing, layout, README.
Domaines, rôles, mots-clés et fonctionnalités **inchangés**. Build de production OK,
aucune occurrence des anciens noms ne subsiste (hors marque « AutoPilote »).

---

## 📝 Notes & limitations connues

- **Mode IA** : sans `ANTHROPIC_API_KEY`, les agents répondent en *mode démonstration*
  (réponses simulées cohérentes). Renseigner la clé dans `backend/.env` active les vraies réponses Claude.
- **Paiements** : entièrement simulés (aucun Stripe), conformément aux consignes.
- **Multi-utilisateurs** : socle de données en place (rôles) ; l'invitation de collaborateurs
  est préparée mais non activée (évolution future).
