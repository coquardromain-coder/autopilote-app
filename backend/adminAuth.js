/**
 * Authentification ADMIN (séparée des comptes clients).
 * Identifiants définis par variables d'env : ADMIN_EMAIL / ADMIN_PASSWORD.
 * Jeton JWT marqué { admin: true }, vérifié par adminMiddleware.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-autopilote';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@autopilote.fr';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

/** Vérifie les identifiants admin et renvoie un jeton, ou null. */
function adminLogin(email, password) {
  if (!ADMIN_PASSWORD) return { error: 'ADMIN_PASSWORD non configuré sur le serveur.' };
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) return { error: 'Identifiants admin incorrects.' };
  const token = jwt.sign({ admin: true, email }, JWT_SECRET, { expiresIn: '12h' });
  return { token };
}

/** Middleware : exige un jeton admin valide. */
function adminMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Jeton admin manquant.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload.admin) return res.status(403).json({ error: 'Accès réservé à l\'administrateur.' });
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Jeton admin invalide ou expiré.' });
  }
}

module.exports = { adminLogin, adminMiddleware, ADMIN_EMAIL };
