/**
 * Sauvegarde + test d'un connecteur pour un utilisateur (partagé client/admin).
 * Synchronise aussi les systèmes existants (Dolibarr, WhatsApp, export EBP).
 */
const { db } = require('../db');
const { connectors } = require('./index');
const store = require('./store');
const { testConnector } = require('./test');

async function saveAndTest(userId, id, config) {
  if (!connectors[id]) return { error: 'Connecteur inconnu.' };

  // Synchronisation avec les systèmes existants
  if (id === 'dolibarr') {
    db.prepare('UPDATE users SET dolibarr_url=?, dolibarr_apikey=? WHERE id=?')
      .run(config.url || null, config.apikey || null, userId);
  }
  if (id === 'dolibarr_export') {
    db.prepare('UPDATE users SET compta_email=? WHERE id=?').run(config.email_compta || null, userId);
  }
  if (id === 'whatsapp' && config.whatsapp_number) {
    db.prepare('UPDATE users SET whatsapp_number=? WHERE id=?').run(config.whatsapp_number, userId);
  }

  store.setConfig(userId, id, config, 'en_cours');

  try {
    const t = await testConnector(id, userId, config);
    store.setStatus(userId, id, 'connecte');
    return { saved: true, success: true, status: 'connecte', version: t.version, name: t.name };
  } catch (err) {
    store.setStatus(userId, id, 'erreur');
    return { saved: true, success: false, status: 'erreur', error: err.message };
  }
}

module.exports = { saveAndTest };
