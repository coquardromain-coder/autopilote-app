/**
 * OpenSign — signature électronique open source (alternative à YouSign).
 * config : { url, apikey, senderEmail }. Mode simulation si non configuré.
 */
function isConfigured(c) { return Boolean(c && c.url && c.apikey); }

function headers(c) {
  return { 'X-Parse-Application-Id': 'opensign', 'X-Parse-REST-API-Key': c.apikey, 'Content-Type': 'application/json' };
}
function api(c, path) { return `${String(c.url).replace(/\/$/, '')}${path}`; }

/** Teste la connexion : GET /api/app/classes/_User. */
async function testConnection(c) {
  if (!isConfigured(c)) throw new Error('OpenSign non configuré');
  const res = await fetch(api(c, '/api/app/classes/_User'), { headers: headers(c) });
  if (!res.ok) throw new Error(`Connexion OpenSign échouée (HTTP ${res.status})`);
  return { success: true };
}

/** Crée un document à signer à partir d'un PDF (base64) et de signataires. */
async function createDocument(c, pdfBase64, signataires) {
  if (!isConfigured(c)) return { _simulated: true, documentId: 'SIM-DOC-' + Date.now().toString(36) };
  const res = await fetch(api(c, '/api/app/functions/savePdf'), {
    method: 'POST', headers: headers(c),
    body: JSON.stringify({ file: pdfBase64, signers: signataires }),
  });
  const d = await res.json();
  return { documentId: d?.result?.objectId || d?.objectId };
}

/** Envoie le document aux signataires par email. */
async function sendForSignature(c, documentId) {
  if (!isConfigured(c)) return { _simulated: true, sent: true };
  await fetch(api(c, `/api/app/functions/sendMailForSignature`), {
    method: 'POST', headers: headers(c), body: JSON.stringify({ documentId }),
  });
  return { sent: true };
}

/** Vérifie le statut d'un document (signé / en attente). */
async function getDocumentStatus(c, documentId) {
  if (!isConfigured(c)) return { _simulated: true, status: 'en_attente' };
  const res = await fetch(api(c, `/api/app/classes/contracts_Document/${documentId}`), { headers: headers(c) });
  const d = await res.json();
  return { status: d?.IsCompleted ? 'signe' : 'en_attente', raw: d };
}

/** Télécharge le PDF signé (URL). */
async function downloadSignedDocument(c, documentId) {
  if (!isConfigured(c)) return { _simulated: true, url: null };
  const s = await getDocumentStatus(c, documentId);
  return { url: s.raw?.SignedUrl || null };
}

/** Liste tous les documents. */
async function listDocuments(c) {
  if (!isConfigured(c)) return tag([
    { documentId: 'SIM-1', title: 'Devis Dupont BTP', status: 'signe' },
    { documentId: 'SIM-2', title: 'Contrat de prestation', status: 'en_attente' },
  ]);
  const res = await fetch(api(c, '/api/app/classes/contracts_Document?limit=100'), { headers: headers(c) });
  const d = await res.json();
  return d?.results || [];
}

function tag(a) { a._simulated = true; return a; }

module.exports = { isConfigured, testConnection, createDocument, sendForSignature, getDocumentStatus, downloadSignedDocument, listDocuments };
