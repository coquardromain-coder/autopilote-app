/**
 * WhatsApp via l'API Meta WhatsApp Cloud (gratuit, sans Twilio).
 * config : { phoneNumberId, accessToken, verifyToken, wabaId }.
 * 10 000 conversations/mois gratuites. Mode simulation si non configuré.
 */
const GRAPH = 'https://graph.facebook.com/v19.0';

function isConfigured(c) { return Boolean(c && c.phoneNumberId && c.accessToken); }

/** Teste la connexion à l'API Graph Meta. */
async function testConnection(c) {
  if (!isConfigured(c)) throw new Error('WhatsApp Cloud non configuré');
  const res = await fetch(`${GRAPH}/${c.phoneNumberId}?fields=verified_name,display_phone_number&access_token=${c.accessToken}`);
  const d = await res.json();
  if (!res.ok) throw new Error(d.error?.message || 'Connexion WhatsApp échouée');
  return { success: true, name: d.verified_name, number: d.display_phone_number };
}

/** Envoie un message texte WhatsApp. */
async function sendMessage(c, to, message) {
  if (!isConfigured(c)) {
    console.log(`[WhatsApp Cloud SIMULATION] → ${to} : ${String(message).slice(0, 80)}`);
    return { _simulated: true, id: 'SIM-' + Date.now().toString(36) };
  }
  const res = await fetch(`${GRAPH}/${c.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: String(to).replace(/\D/g, ''), type: 'text', text: { body: message } }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error?.message || 'Erreur envoi WhatsApp');
  return { id: d.messages?.[0]?.id };
}

/** Envoie un message template approuvé. */
async function sendTemplate(c, to, template, params = []) {
  if (!isConfigured(c)) return { _simulated: true, id: 'SIM-TPL-' + Date.now().toString(36) };
  const components = params.length ? [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: String(p) })) }] : [];
  const res = await fetch(`${GRAPH}/${c.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: String(to).replace(/\D/g, ''), type: 'template', template: { name: template, language: { code: 'fr' }, components } }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error?.message || 'Erreur envoi template');
  return { id: d.messages?.[0]?.id };
}

/**
 * Extrait le message entrant d'un webhook Meta.
 * @returns {{from, text, type}|null}
 */
function parseWebhook(body) {
  try {
    const change = body.entry?.[0]?.changes?.[0]?.value;
    const msg = change?.messages?.[0];
    if (!msg) return null;
    let text = '';
    if (msg.type === 'text') text = msg.text?.body || '';
    else if (msg.type === 'audio') text = '[Message vocal reçu — transcription à venir]';
    else text = `[Message ${msg.type} reçu]`;
    return { from: msg.from, text, type: msg.type };
  } catch { return null; }
}

module.exports = { isConfigured, testConnection, sendMessage, sendTemplate, parseWebhook };
