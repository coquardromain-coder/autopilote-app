/**
 * Envoi d'emails système (SMTP via nodemailer).
 * Configuré par variables d'env. Si non configuré → mode simulation
 * (l'email est journalisé sans envoi réel).
 */
const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
const FROM = process.env.MAIL_FROM || 'AutoPilote <no-reply@famcofinances.com>';

let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function isConfigured() { return Boolean(transporter); }

/**
 * Envoie un email. En simulation, journalise sans envoyer.
 * @returns {Promise<{sent:boolean, simulated:boolean}>}
 */
async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    console.log(`[MAIL SIMULATION] → ${to} | ${subject}`);
    return { sent: false, simulated: true };
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, text, html });
    return { sent: true, simulated: false };
  } catch (err) {
    console.error('[MAIL] Erreur envoi :', err.message);
    return { sent: false, simulated: false, error: err.message };
  }
}

module.exports = { isConfigured, sendMail };
