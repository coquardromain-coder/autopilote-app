/**
 * Couche d'accès à la base de données.
 * Utilise better-sqlite3, un module npm standard compatible avec toutes
 * les versions de Node.js (binaires précompilés, fonctionne en
 * production). L'API (prepare/run/get/all, lastInsertRowid, changes)
 * est identique à celle de node:sqlite. La base est un simple fichier
 * local "autopilote.db".
 */
const Database = require('better-sqlite3');
const path = require('path');

// Fichier de base de données local (créé automatiquement)
const DB_PATH = path.join(__dirname, 'autopilote.db');
const db = new Database(DB_PATH);

// Active les clés étrangères
db.pragma('foreign_keys = ON');

/**
 * Initialise le schéma de la base si nécessaire.
 * Appelée une seule fois au démarrage du serveur.
 */
function initSchema() {
  db.exec(`
    -- Utilisateurs de la plateforme
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      company TEXT,
      role TEXT NOT NULL DEFAULT 'owner',     -- owner | member | admin
      plan TEXT NOT NULL DEFAULT 'essentiel', -- essentiel | croissance | elite | illimite
      onboarded INTEGER NOT NULL DEFAULT 0,   -- 0 = onboarding non terminé
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Contacts CRM (gérés par Léa)
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      status TEXT NOT NULL DEFAULT 'prospect', -- prospect | client | inactif
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Conversations avec les agents
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      agent_id TEXT NOT NULL,           -- identifiant de l'agent (ex: 'lea', 'pilot')
      title TEXT NOT NULL DEFAULT 'Nouvelle conversation',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Messages échangés dans les conversations
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL,               -- user | assistant
      agent_id TEXT,                    -- agent qui a répondu (pour 'assistant')
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    -- Factures (gérées par Manon — compta pilote)
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      number TEXT NOT NULL,
      client_name TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'brouillon', -- brouillon | envoyee | payee
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Devis (gérés par Manon D. — devis pilote)
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      number TEXT NOT NULL,
      client_name TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'brouillon', -- brouillon | envoye | accepte | refuse
      content TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Abonnements simulés (paiements simulés, pas de Stripe)
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan TEXT NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', -- active | annule
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- (colonnes entreprise ajoutées par migration plus bas)

    -- Connexions Google OAuth (Gmail, Calendar, Drive) par utilisateur
    CREATE TABLE IF NOT EXISTS google_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      google_email TEXT,
      access_token TEXT,
      refresh_token TEXT,
      scope TEXT,
      token_type TEXT,
      expiry_date INTEGER,             -- timestamp d'expiration (ms)
      connected_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Journal d'activité des agents (pour analytics / Vox)
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      agent_id TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  migrate();
}

/**
 * Migration légère : ajoute les colonnes "entreprise" à la table users
 * si elles n'existent pas encore (préserve les données existantes).
 */
function migrate() {
  const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  const add = (name, def) => {
    if (!cols.includes(name)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${name} ${def};`);
    }
  };
  add('sector', 'TEXT');                 // identifiant du secteur d'activité
  add('siret', 'TEXT');                  // numéro SIRET
  add('address', 'TEXT');                // adresse postale
  add('logo', 'TEXT');                   // logo (URL ou data URI)
  add('brief', 'TEXT');                  // brief libre de l'activité (contexte agents)
  add('vat_rate', 'REAL NOT NULL DEFAULT 20'); // taux de TVA par défaut
  add('prestations', "TEXT NOT NULL DEFAULT '[]'"); // prestations & tarifs (JSON)
}

module.exports = { db, initSchema, DB_PATH };
