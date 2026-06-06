/**
 * DocuSeal — signature électronique open source auto-hébergée.
 * config : { url, apikey }. Mode simulation si non configuré.
 */
function isConfigured(c) { return Boolean(c && c.url && c.apikey); }
function api(c, path) { return `${String(c.url).replace(/\/$/, '')}${path}`; }
function headers(c) { return { 'X-Auth-Token': c.apikey, 'Content-Type': 'application/json' }; }

async function testConnection(c) {
  if (!isConfigured(c)) throw new Error('DocuSeal non configuré');
  const res = await fetch(api(c, '/api/templates'), { headers: headers(c) });
  if (!res.ok) throw new Error(`Connexion DocuSeal échouée (HTTP ${res.status})`);
  return { success: true };
}

/** Crée un template de document à partir d'un PDF (base64). */
async function createTemplate(c, pdfBase64) {
  if (!isConfigured(c)) return { _simulated: true, templateId: 'SIM-TPL-' + Date.now().toString(36) };
  const res = await fetch(api(c, '/api/templates/pdf'), {
    method: 'POST', headers: headers(c),
    body: JSON.stringify({ name: 'AutoPilote', documents: [{ name: 'document', file: pdfBase64 }] }),
  });
  const d = await res.json();
  return { templateId: d?.id };
}

/** Crée une demande de signature pour des signataires. */
async function createSubmission(c, templateId, signataires) {
  if (!isConfigured(c)) return { _simulated: true, submissionId: 'SIM-SUB-' + Date.now().toString(36) };
  const res = await fetch(api(c, '/api/submissions'), {
    method: 'POST', headers: headers(c),
    body: JSON.stringify({ template_id: templateId, submitters: (signataires || []).map((s) => ({ email: s.email, name: s.name })) }),
  });
  const d = await res.json();
  return { submissionId: d?.[0]?.submission_id || d?.id };
}

/** Statut d'une demande de signature. */
async function getSubmissionStatus(c, submissionId) {
  if (!isConfigured(c)) return { _simulated: true, status: 'en_attente' };
  const res = await fetch(api(c, `/api/submissions/${submissionId}`), { headers: headers(c) });
  const d = await res.json();
  return { status: d?.status === 'completed' ? 'signe' : 'en_attente', raw: d };
}

/** Télécharge le document signé (URL). */
async function downloadCompleted(c, submissionId) {
  if (!isConfigured(c)) return { _simulated: true, url: null };
  const s = await getSubmissionStatus(c, submissionId);
  return { url: s.raw?.documents?.[0]?.url || null };
}

module.exports = { isConfigured, testConnection, createTemplate, createSubmission, getSubmissionStatus, downloadCompleted };
