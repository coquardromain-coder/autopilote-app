/**
 * Emails de bienvenue à l'inscription d'un nouveau client :
 *  - notification interne (conseiller AutoPilote)
 *  - email d'accueil au client (identifiants, lien, suivi 24h)
 */
const { sendMail } = require('./mailer');

const APP_URL = (process.env.FRONTEND_ORIGIN || 'https://autopilote.famcofinances.com').split(',')[0].trim();
const NOTIFY = process.env.ADMIN_NOTIFY_EMAIL || 'contact@famcofinances.com';

/**
 * Envoie les deux emails. `password` optionnel (présent à l'inscription).
 */
async function sendWelcomeEmails(user, password) {
  const results = {};

  // 1) Notification interne
  results.admin = await sendMail({
    to: NOTIFY,
    subject: `🎉 Nouveau client AutoPilote : ${user.company || user.name}`,
    text:
      `Nouveau client inscrit sur AutoPilote :\n\n` +
      `Nom : ${user.name}\n` +
      `Email : ${user.email}\n` +
      `Société : ${user.company || '—'}\n` +
      `Secteur : ${user.sector || '—'}\n` +
      `Pack : ${user.plan || '—'}\n\n` +
      `👉 Contacter ce client sous 24h pour la session de démarrage.`,
  });

  // 2) Email d'accueil au client
  const creds = password
    ? `Vos identifiants :\n- Email : ${user.email}\n- Mot de passe : ${password}\n\n`
    : `Votre identifiant : ${user.email}\n\n`;
  results.client = await sendMail({
    to: user.email,
    subject: 'Bienvenue chez AutoPilote 🎯',
    text:
      `Bonjour ${user.name},\n\n` +
      `Bienvenue chez AutoPilote, votre équipe d'agents IA !\n\n` +
      creds +
      `Accédez à votre espace : ${APP_URL}\n\n` +
      `🗓️ Votre conseiller AutoPilote vous contactera dans les 24h pour ` +
      `configurer votre espace (WhatsApp, Dolibarr, réseaux sociaux…) et vous ` +
      `former à l'utilisation.\n\n` +
      `À très vite,\nL'équipe AutoPilote`,
    html:
      `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">` +
      `<h2>Bienvenue chez AutoPilote 🎯</h2>` +
      `<p>Bonjour ${user.name},</p>` +
      `<p>Bienvenue ! Votre équipe d'agents IA est prête.</p>` +
      `<p>${password ? `<b>Email :</b> ${user.email}<br><b>Mot de passe :</b> ${password}` : `<b>Identifiant :</b> ${user.email}`}</p>` +
      `<p><a href="${APP_URL}" style="background:#6C47FF;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Accéder à mon espace</a></p>` +
      `<p>🗓️ <b>Votre conseiller AutoPilote vous contactera dans les 24h</b> pour configurer votre espace et vous former.</p>` +
      `<p>À très vite,<br>L'équipe AutoPilote</p></div>`,
  });

  return results;
}

module.exports = { sendWelcomeEmails };
