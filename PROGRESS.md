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

## 🚀 PHASE 7 — Canaux, publication & UX avancée ✅

### Étape 1 — WhatsApp pour le Directeur ✅
`backend/whatsapp.js` (API Twilio via fetch, **mode simulation** sans clés) +
`routes/whatsapp.js` : `POST /api/whatsapp/webhook` (réception, **transcription**
des messages vocaux), `POST /api/whatsapp/send`, `GET /api/whatsapp/conversations`.
Le Directeur reçoit, délègue et répond sur WhatsApp. Page `dashboard/whatsapp`
(liaison du numéro, envoi, historique). Env : `TWILIO_ACCOUNT_SID/AUTH_TOKEN/WHATSAPP_NUMBER`.

### Étape 2 — Publication réseaux sociaux (Créatif) ✅
`backend/social.js` + `routes/social.js` + `routes/socialAuth.js` : OAuth Facebook/Instagram
(Meta) et LinkedIn, publication & programmation, stats basiques. **Commandes via le Directeur**
(« publie ce post sur LinkedIn ») détectées et exécutées (`chat.js`). UI dans Intégrations.
Mode simulation si pas de clés. Env : `META_APP_ID/SECRET`, `LINKEDIN_CLIENT_ID/SECRET`.

### Étape 3 — Enrichissement du Référenceur ✅
Prompt enrichi (articles de blog H1/H2/H3 + meta description + mots-clés, calendrier
éditorial, analyse de mots-clés). Publication WordPress via `backend/wordpress.js` +
`routes/content.js` (`POST /api/content/wordpress/publish`). Mode simulation.
Env : `WORDPRESS_URL/USER/PASSWORD`. (Formateur recentré sur la formation pour éviter
le doublon SEO.)

### Étape 4 — Enrichissement du Juriste ✅
Prompt enrichi (CGV, mentions légales, contrats de prestation, NDA, Q&R juridiques FR)
avec mention obligatoire « Ce document est fourni à titre indicatif et ne remplace pas
l'avis d'un avocat ». Modèles juridiques ajoutés à `templates.js`.

### Étape 5 — UX prioritaires ✅
- Indicateur de travail **contextuel** (« Le Deviseur rédige votre devis… »).
- Historique des conversations **persistant et recherchable** (`GET /api/chat/search`).
- **Export PDF** des réponses (`lib/pdf.js`).
- Page **« Mes documents »** : tous les contenus générés, classés par type/date
  (auto-enregistrement, `routes/documents.js`).
- **Notifications** dashboard quand une tâche est terminée (cloche + `routes/notifications.js`).

### Étape 6 — Nouvelle grille tarifaire ✅
Starter 49€ · Business 99€ · Elite 199€ · Agence 399€ (front `lib/agents.js` + back `billing.js`).

**Validé** : build de production OK (17 routes) ; backend testé (WhatsApp/social/WordPress en
simulation, commande Directeur→Créatif→publication, documents auto-enregistrés, notifications) ;
design dark premium conservé ; tout en français ; modes simulation actifs sans clés API.

---

## 🚀 PHASE 8 — Intégration Dolibarr ERP ✅

### Partie 1 — Déploiement ✅
`docker-compose.dolibarr.yml` (image `tuxgasy/dolibarr` + MySQL 8) + `.env.dolibarr.example`
(variables `DOLIBARR_DB_PASSWORD`, `DOLIBARR_DB_ROOT_PASSWORD`, `DOLIBARR_ADMIN_PASSWORD`,
`DOLIBARR_COMPANY_NAME`) et procédure Coolify documentée.

### Partie 2 — Connecteur ✅
`backend/integrations/dolibarr.js` (API REST Dolibarr via DOLAPIKEY) : `getDolibarrToken`,
`testConnection`, clients (`getClients/createClient/updateClient`), devis (`getDevis/
createDevis/sendDevis`), factures (`getFactures/createFacture/getFacturesImpayees`),
produits (`getProduits/createProduit`), compta (`getEcritures/exportEBP`), banque (`getBanque`).
Config par client (URL, login, mot de passe, clé API) → `routes/dolibarr.js` avec **test
automatique** (`GET /version`) à la sauvegarde. Mode simulation si non configuré.

### Partie 3 — Agents connectés ✅
`backend/integrations/dolibarrAgent.js` + `chat.js` : le Directeur détecte les intentions
(robuste aux accents) et confie à l'agent : **Deviseur** (« crée un devis » → produits Dolibarr
+ création + envoi), **Comptable** (« factures impayées », « export EBP »), **Commercial**
(« ajoute ce prospect »), **Analyste** (« chiffre d'affaires »). Message de configuration si
Dolibarr non connecté.

### Partie 4 — Interface Gestion ✅
Page `dashboard/gestion` : widgets CA du mois, factures impayées, devis en attente,
bouton « Ouvrir Dolibarr » et « Export EBP ». Section Dolibarr dans Intégrations (config + test).

### Partie 5 — Export EBP automatique ✅
`backend/scheduler.js` : le 1er du mois à 8h, génère l'export EBP du mois précédent
(`dolibarr_export_EBP_YYYY-MM.csv`), l'envoie à l'email configuré (Comptabilité) et le
journalise dans « Mes documents ».

### Partie 6 — Onboarding ✅
Étape « Connectez vos outils » : carte Dolibarr (URL, login, mot de passe, **Tester la
connexion** avec statut vert/rouge).

**Validé** : build OK (18 routes) ; endpoints Dolibarr testés en simulation (status, widgets
CA/impayées/devis, export EBP) ; commandes agents (« factures impayées » → tableau, « chiffre
d'affaires » → synthèse, « crée un devis » → message de configuration) ; scheduler démarré.

> Config Dolibarr : **par client** dans l'UI (pas de variable d'env backend). Le déploiement
> Dolibarr utilise les variables de `.env.dolibarr.example` côté Coolify.

---

## 🚀 PHASE 9 — Connecteurs gratuits & open source + système unifié ✅

**Système unifié (Partie 10)** : `backend/connectors/index.js` (registre de 14 connecteurs)
+ `backend/connectors/store.js` (**chiffrement AES-256-GCM** des identifiants par client)
+ `routes/connectors.js` (`GET /api/connectors` catalogue+statut, `POST /:id` sauvegarde+test
auto, `POST /:id/test`, `DELETE`). Page **Intégrations redesignée** : grille 3 colonnes,
statut ⚫🟡🟢🔴, modal de configuration, glow vert quand connecté. **Onboarding** : 3 connecteurs
recommandés selon le secteur (optionnel, configurable plus tard).

Intégrations créées (mode simulation si non configuré) :
1. **OpenSign** (`integrations/opensign.js`) — signature électronique (devis/contrats/factures).
2. **WhatsApp Cloud Meta** (`integrations/whatsapp.js`) — remplace Twilio, webhook verify GET +
   réception POST, 10 000 msg/mois gratuits. Directeur/Assistance/Relance/Commercial.
3. **Fonoster** (`integrations/fonoster.js`) — appels + SMS open source. Vocal/Relance/Commercial.
4. **DocuSeal** (`integrations/docuseal.js`) — signature alternative auto-hébergée.
5. **Google Search Console** (`integrations/searchconsole.js`) — SEO réel (OAuth Google).
6. **Google Analytics 4** (`integrations/analytics.js`) — trafic & conversions (OAuth Google).
7. **Google Business Profile** (`integrations/googlebusiness.js`) — avis & posts (OAuth Google).
8. **Hunter.io** (`integrations/hunterio.js`) — recherche d'emails (free tier). Chasseur.
9. **WordPress** enrichi — catégories, tags, médias, programmation, mise à jour, stats.

**Agents** : offre de **signature électronique** automatique (Deviseur/Juriste/Comptable),
message uniforme « Pour [action], connectez [Service]… Moins de 2 minutes ✓ » si non configuré.
Chiffrement AES-256 des clés (`ENCRYPTION_KEY`).

**Validé** : build OK (18 routes) ; 14 connecteurs au catalogue avec statut ; sauvegarde chiffrée
+ test réel (ex. Hunter.io clé invalide → statut 🔴 erreur) ; grille et modal rendus en dark premium.

---

## 🚀 PHASE 10 — Onboarding intelligent adapté au pack ✅

Moteur `backend/onboarding.js` : catalogue d'outils, **outils par pack**
(Starter 3 / Business 6 / Elite 10 / Agence 14, cumulatif) et **activation
automatique des agents** selon leurs connecteurs requis/optionnels
(Inactif / Actif basique / Actif complet / Actif). Route `routes/onboarding.js`
(`GET /api/onboarding` état complet, `PATCH` sauvegarde de progression,
`POST /dolibarr` Option A mutualisé). Exemples brief + prestations par secteur
(`sectors.js`). Migration BD : `phone, billing_email, tone, email_signature,
onboarding_step, dolibarr_provisioned`. Ton + signature injectés dans le contexte
des agents (`context.js`).

Frontend `app/onboarding` (dark premium, responsive) en 6 étapes :
1. Entreprise (nom, SIRET, adresse, tél, **logo upload**, secteur, email facturation)
2. Présentation de l'équipe IA incluse dans le pack
3. **Connexion des outils** du pack (cards avec statut ⬜🔄✅⚠️, OAuth en nouvel
   onglet, formulaires connecteurs + test, « Passer », « Rafraîchir »)
4. Personnalisation : brief + prestations (**pré-remplis selon le secteur**), ton, signature
5. Espace Dolibarr (Option A mutualisé, migration Option B prévue)
6. Premier contact avec le Directeur (suggestion par secteur + **animation de célébration**)

Progression **sauvegardée en base** (reprise possible). Validé : build OK (18 routes),
endpoint testé (pack→outils, activation agents), parcours rendu de bout en bout.

---

## 📝 Notes & limitations connues

- **Mode IA** : sans `ANTHROPIC_API_KEY`, les agents répondent en *mode démonstration*
  (réponses simulées cohérentes). Renseigner la clé dans `backend/.env` active les vraies réponses Claude.
- **Paiements** : entièrement simulés (aucun Stripe), conformément aux consignes.
- **Multi-utilisateurs** : socle de données en place (rôles) ; l'invitation de collaborateurs
  est préparée mais non activée (évolution future).
