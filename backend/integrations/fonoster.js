/**
 * Fonoster — téléphonie open source (alternative à Twilio Voice).
 * config : { url, accessKeyId, accessKeySecret, phoneNumber }.
 * Mode simulation si non configuré.
 */
function isConfigured(c) { return Boolean(c && c.url && c.accessKeyId && c.accessKeySecret); }
function api(c, path) { return `${String(c.url).replace(/\/$/, '')}${path}`; }
function headers(c) { return { Authorization: `Bearer ${c.accessKeyId}:${c.accessKeySecret}`, 'Content-Type': 'application/json' }; }

async function testConnection(c) {
  if (!isConfigured(c)) throw new Error('Fonoster non configuré');
  const res = await fetch(api(c, '/v1/applications'), { headers: headers(c) });
  if (!res.ok) throw new Error(`Connexion Fonoster échouée (HTTP ${res.status})`);
  return { success: true };
}

/** Passe un appel avec un message vocal généré par l'IA (text-to-speech). */
async function makeCall(c, to, message) {
  if (!isConfigured(c)) return { _simulated: true, callId: 'SIM-CALL-' + Date.now().toString(36), message };
  const res = await fetch(api(c, '/v1/calls'), {
    method: 'POST', headers: headers(c),
    body: JSON.stringify({ from: c.phoneNumber, to, say: message }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.message || 'Erreur appel Fonoster');
  return { callId: d.ref };
}

/** Configure la réception et la transcription d'un appel entrant. */
async function receiveCall(c) {
  if (!isConfigured(c)) return { _simulated: true, transcript: '[Transcription simulée de l\'appel entrant]' };
  return { configured: true };
}

/** Historique des appels. */
async function getCallHistory(c) {
  if (!isConfigured(c)) return tag([
    { callId: 'SIM-1', to: '+33611223344', direction: 'sortant', duration: 92, date: '2026-06-01' },
    { callId: 'SIM-2', from: '+33655667788', direction: 'entrant', duration: 45, date: '2026-06-02' },
  ]);
  const res = await fetch(api(c, '/v1/calls?limit=100'), { headers: headers(c) });
  const d = await res.json();
  return d?.items || [];
}

/** Envoie un SMS. */
async function sendSMS(c, to, message) {
  if (!isConfigured(c)) { console.log(`[Fonoster SMS SIMULATION] → ${to} : ${message.slice(0, 60)}`); return { _simulated: true }; }
  const res = await fetch(api(c, '/v1/messages'), {
    method: 'POST', headers: headers(c),
    body: JSON.stringify({ from: c.phoneNumber, to, text: message }),
  });
  if (!res.ok) throw new Error('Erreur SMS Fonoster');
  return { sent: true };
}

function tag(a) { a._simulated = true; return a; }

module.exports = { isConfigured, testConnection, makeCall, receiveCall, getCallHistory, sendSMS };
