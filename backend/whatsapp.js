/**
 * Intégration WhatsApp via l'API Twilio (WhatsApp Business).
 *
 * Utilise l'API REST Twilio directement (fetch) — aucune dépendance
 * supplémentaire. Si les clés Twilio ne sont pas configurées, le module
 * bascule en mode simulation : l'envoi est journalisé sans appel réseau.
 */
const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_WHATSAPP_NUMBER; // ex: whatsapp:+14155238886

/** Indique si Twilio est réellement configuré. */
function isConfigured() {
  return Boolean(SID && TOKEN && FROM);
}

/** Normalise un numéro au format WhatsApp Twilio (whatsapp:+33...). */
function toWhatsApp(num) {
  if (!num) return num;
  const n = String(num).trim();
  return n.startsWith('whatsapp:') ? n : `whatsapp:${n}`;
}

/**
 * Envoie un message WhatsApp.
 * @returns {Promise<{sid:string, simulated:boolean}>}
 */
async function sendMessage(to, body) {
  if (!isConfigured()) {
    // Mode simulation : on n'appelle pas Twilio
    console.log(`[WhatsApp SIMULATION] → ${to} : ${body.slice(0, 80)}`);
    return { sid: 'SIMULATED-' + Math.abs(hashCode(body)).toString(36), simulated: true };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`;
  const form = new URLSearchParams({ From: FROM, To: toWhatsApp(to), Body: body });
  const auth = Buffer.from(`${SID}:${TOKEN}`).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erreur Twilio');
  return { sid: data.sid, simulated: false };
}

/**
 * Transcrit un message vocal WhatsApp.
 * En production réelle, on téléchargerait le média audio et on appellerait
 * un service de transcription (ex: Whisper). Ici, transcription simulée.
 */
async function transcribeVoice(mediaUrl) {
  // Mode simulation : pas de transcription réelle disponible localement.
  return `[Transcription simulée du message vocal] L'utilisateur a laissé un message vocal (${mediaUrl ? 'audio reçu' : 'audio'}). En production, l'audio serait transcrit automatiquement.`;
}

/** Petit hash déterministe (pour les ids simulés). */
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i) | 0;
  return h;
}

module.exports = { isConfigured, sendMessage, transcribeVoice, toWhatsApp };
