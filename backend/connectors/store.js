/**
 * Stockage chiffré (AES-256-GCM) des configurations de connecteurs,
 * par utilisateur. Les clés/identifiants ne sont jamais stockés en clair.
 *
 * Clé de chiffrement : variable d'env ENCRYPTION_KEY (recommandé, 32+ car.),
 * sinon dérivée du JWT_SECRET pour le développement.
 */
const crypto = require('crypto');
const { db } = require('../db');

// Dérive une clé 256 bits stable
const SECRET = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'autopilote-dev-encryption-key';
const KEY = crypto.createHash('sha256').update(SECRET).digest(); // 32 octets

/** Chiffre une chaîne → "iv.tag.cipher" (base64). */
function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

/** Déchiffre une chaîne "iv.tag.cipher". */
function decrypt(blob) {
  try {
    const [iv, tag, data] = String(blob).split('.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** Enregistre (chiffré) la configuration d'un connecteur pour un utilisateur. */
function setConfig(userId, connector, obj, status = 'connecte') {
  const data = encrypt(JSON.stringify(obj || {}));
  const existing = db.prepare('SELECT id FROM connector_configs WHERE user_id = ? AND connector = ?').get(userId, connector);
  if (existing) {
    db.prepare('UPDATE connector_configs SET data = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(data, status, existing.id);
  } else {
    db.prepare('INSERT INTO connector_configs (user_id, connector, data, status) VALUES (?, ?, ?, ?)')
      .run(userId, connector, data, status);
  }
}

/** Récupère la configuration déchiffrée d'un connecteur (objet, {} si absent). */
function getConfig(userId, connector) {
  const row = db.prepare('SELECT data FROM connector_configs WHERE user_id = ? AND connector = ?').get(userId, connector);
  if (!row) return {};
  const json = decrypt(row.data);
  try { return json ? JSON.parse(json) : {}; } catch { return {}; }
}

/** Met à jour uniquement le statut d'un connecteur. */
function setStatus(userId, connector, status) {
  db.prepare('UPDATE connector_configs SET status = ? WHERE user_id = ? AND connector = ?').run(status, userId, connector);
}

/** Renvoie une map { connector: status } pour un utilisateur. */
function statusMap(userId) {
  const rows = db.prepare('SELECT connector, status FROM connector_configs WHERE user_id = ?').all(userId);
  const map = {};
  for (const r of rows) map[r.connector] = r.status;
  return map;
}

/** Supprime la configuration d'un connecteur. */
function removeConfig(userId, connector) {
  db.prepare('DELETE FROM connector_configs WHERE user_id = ? AND connector = ?').run(userId, connector);
}

module.exports = { encrypt, decrypt, setConfig, getConfig, setStatus, statusMap, removeConfig };
