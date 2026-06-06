/**
 * Petit utilitaire de création de notifications dashboard.
 */
const { db } = require('./db');

/** Crée une notification pour un utilisateur. */
function notify(userId, message, icon = '🔔') {
  db.prepare('INSERT INTO notifications (user_id, message, icon) VALUES (?, ?, ?)')
    .run(userId, message, icon);
}

module.exports = { notify };
