/**
 * Gestion de l'authentification par JWT (sans service externe).
 * Fournit les utilitaires de hachage de mot de passe, de génération
 * de jeton, et le middleware Express de protection des routes.
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-autopilote';
const TOKEN_EXPIRY = '7d';

/** Hache un mot de passe en clair. */
function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

/** Vérifie un mot de passe en clair contre son hachage. */
function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

/** Génère un jeton JWT pour un utilisateur. */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, plan: user.plan },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/** Vérifie et décode un jeton JWT (lève une exception si invalide). */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Middleware Express : vérifie le jeton "Authorization: Bearer <token>".
 * Place les données utilisateur dans req.user si valide, sinon renvoie 401.
 */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Jeton d\'authentification manquant.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Jeton invalide ou expiré.' });
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  authMiddleware,
};
