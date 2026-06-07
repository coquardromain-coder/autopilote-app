/**
 * Script de peuplement : crée un compte de démonstration avec des
 * données réalistes (contacts, factures, devis) pour explorer l'app.
 *
 * Lancer avec :  npm run seed
 * Identifiants créés :  demo@autopilote.fr / demo1234
 */
require('dotenv').config();
const { db, initSchema } = require('./db');
const { hashPassword } = require('./auth');

initSchema();

const EMAIL = 'demo@autopilote.fr';

// Supprime un éventuel compte de démo existant (réinitialisation)
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(EMAIL);
if (existing) {
  db.prepare('DELETE FROM users WHERE id = ?').run(existing.id);
  console.log('Ancien compte de démo supprimé.');
}

// Crée l'utilisateur de démonstration (onboarding déjà terminé).
// Pack : "Essentiel" → mappé sur le pack d'entrée actuel "starter" (49€).
const PLAN = 'starter';
const prestationsDemo = JSON.stringify([
  { label: 'Prestation de conseil', price: 80, unit: 'heure' },
  { label: 'Forfait accompagnement', price: 500, unit: 'mois' },
]);
const info = db
  .prepare(
    `INSERT INTO users
       (email, password_hash, name, company, plan, onboarded,
        sector, siret, address, vat_rate, prestations, brief)
     VALUES (?, ?, ?, ?, ?, 1, 'generique', ?, ?, 20, ?, ?)`
  )
  .run(
    EMAIL, hashPassword('demo1234'), 'Compte Démo', 'AutoPilote Démo', PLAN,
    '00000000000000', '1 rue de la Démo, 75000 Paris', prestationsDemo,
    'Entreprise de démonstration AutoPilote (secteur générique). ' +
    'Sert à explorer les agents, le CRM, la facturation et les intégrations.'
  );
const uid = info.lastInsertRowid;

// Contacts CRM
const contacts = [
  ['Jean Dupont', 'jean@client.fr', '0601020304', 'Dupont BTP', 'client'],
  ['Marie Martin', 'marie@boutique.fr', '0611223344', 'La Boutique', 'prospect'],
  ['Paul Bernard', 'paul@artisan.fr', '0655667788', 'Artisan Pro', 'client'],
  ['Sophie Petit', 'sophie@startup.io', '0699887766', 'StartUp.io', 'prospect'],
];
for (const [name, email, phone, company, status] of contacts) {
  db.prepare(
    `INSERT INTO contacts (user_id, name, email, phone, company, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(uid, name, email, phone, company, status);
}

// Factures
const invoices = [
  ['FACT-00000001', 'Dupont BTP', 1200, 'payee'],
  ['FACT-00000002', 'Artisan Pro', 850, 'envoyee'],
  ['FACT-00000003', 'La Boutique', 430, 'brouillon'],
];
for (const [number, client, amount, status] of invoices) {
  db.prepare(
    `INSERT INTO invoices (user_id, number, client_name, amount, status)
     VALUES (?, ?, ?, ?, ?)`
  ).run(uid, number, client, amount, status);
}

// Devis
db.prepare(
  `INSERT INTO quotes (user_id, number, client_name, amount, status, content)
   VALUES (?, ?, ?, ?, ?, ?)`
).run(uid, 'DEVIS-00000001', 'StartUp.io', 2500, 'envoye',
  'Prestation de conseil et accompagnement — forfait mensuel.');

// Abonnement actif (pack d'entrée)
db.prepare(
  `INSERT INTO subscriptions (user_id, plan, price, status)
   VALUES (?, ?, 49, 'active')`
).run(uid, PLAN);

console.log('✅ Compte de démonstration créé.');
console.log('   Email   : demo@autopilote.fr');
console.log('   Mot de passe : demo1234');
console.log('   Société : AutoPilote Démo · Secteur : Générique · Pack : Essentiel (starter)');
