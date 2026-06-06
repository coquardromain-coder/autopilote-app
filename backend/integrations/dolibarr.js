/**
 * Connecteur Dolibarr ERP/CRM ↔ AutoPilote (API REST Dolibarr).
 *
 * Chaque fonction reçoit un objet `config` propre au client :
 *   { url, login, password, apiKey }
 *
 * Authentification : clé API via l'en-tête DOLAPIKEY (recommandé), ou
 * récupération d'un token via login/mot de passe.
 *
 * Mode simulation : si le client n'a pas configuré Dolibarr, les fonctions
 * de lecture renvoient des données d'exemple marquées `_simulated: true`.
 * Les fonctions d'écriture lèvent une erreur SIMULATION gérée plus haut.
 */

class NotConfiguredError extends Error {
  constructor() {
    super('Dolibarr non configuré');
    this.code = 'DOLIBARR_NOT_CONFIGURED';
  }
}

/** Construit l'objet config à partir d'une ligne utilisateur. */
function configFromUser(user) {
  if (!user) return {};
  return {
    url: user.dolibarr_url || null,
    login: user.dolibarr_login || null,
    password: user.dolibarr_password || null,
    apiKey: user.dolibarr_apikey || null,
  };
}

/** Indique si la configuration Dolibarr est exploitable. */
function isConfigured(config) {
  return Boolean(config && config.url && (config.apiKey || (config.login && config.password)));
}

/** Construit l'URL d'API complète. */
function apiUrl(config, path) {
  const base = String(config.url).replace(/\/$/, '');
  return `${base}/api/index.php${path}`;
}

/**
 * Récupère un token Dolibarr à partir du login/mot de passe.
 * (Dolibarr : GET /api/index.php/login?login=...&password=...)
 */
async function getDolibarrToken(config) {
  if (config.apiKey) return config.apiKey;
  const url = apiUrl(config, `/login?login=${encodeURIComponent(config.login)}&password=${encodeURIComponent(config.password)}`);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Échec de l\'authentification Dolibarr');
  return data.success.token;
}

/** Effectue une requête authentifiée vers l'API Dolibarr. */
async function request(config, method, path, body) {
  const token = await getDolibarrToken(config);
  const res = await fetch(apiUrl(config, path), {
    method,
    headers: { DOLAPIKEY: token, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(typeof data === 'object' ? (data?.error?.message || JSON.stringify(data)) : data || `Erreur ${res.status}`);
  return data;
}

/** Teste la connexion : GET /version. */
async function testConnection(config) {
  if (!config || !config.url) throw new NotConfiguredError();
  const res = await fetch(apiUrl(config, '/version'), {
    headers: { DOLAPIKEY: config.apiKey || '', Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Connexion échouée (HTTP ${res.status})`);
  const version = await res.json().catch(() => null);
  return { success: true, version: typeof version === 'string' ? version : (version?.version || 'inconnue') };
}

// ─────────────────── Clients / prospects (thirdparties) ───────────────────

async function getClients(config) {
  if (!isConfigured(config)) return simulatedClients();
  return request(config, 'GET', '/thirdparties?limit=100');
}
async function createClient(config, data) {
  if (!isConfigured(config)) throw new NotConfiguredError();
  return request(config, 'POST', '/thirdparties', {
    name: data.name, client: 2, // 2 = prospect
    email: data.email || '', phone: data.phone || '', address: data.address || '',
  });
}
async function updateClient(config, id, data) {
  if (!isConfigured(config)) throw new NotConfiguredError();
  return request(config, 'PUT', `/thirdparties/${id}`, data);
}

// ─────────────────── Devis (proposals) ───────────────────

async function getDevis(config) {
  if (!isConfigured(config)) return simulatedDevis();
  return request(config, 'GET', '/proposals?limit=100');
}
async function createDevis(config, data) {
  if (!isConfigured(config)) throw new NotConfiguredError();
  // data : { socid, lines:[{desc, qty, subprice}] }
  const created = await request(config, 'POST', '/proposals', {
    socid: data.socid, date: Math.floor(Date.now() / 1000), lines: data.lines || [],
  });
  return created;
}
async function sendDevis(config, id) {
  if (!isConfigured(config)) throw new NotConfiguredError();
  // Validation puis envoi (selon API Dolibarr)
  return request(config, 'POST', `/proposals/${id}/validate`, {});
}

// ─────────────────── Factures (invoices) ───────────────────

async function getFactures(config) {
  if (!isConfigured(config)) return simulatedFactures();
  return request(config, 'GET', '/invoices?limit=100');
}
async function createFacture(config, data) {
  if (!isConfigured(config)) throw new NotConfiguredError();
  return request(config, 'POST', '/invoices', { socid: data.socid, lines: data.lines || [] });
}
async function getFacturesImpayees(config) {
  const all = await getFactures(config);
  // status 1 = validée, paye 0 = non payée
  return (Array.isArray(all) ? all : []).filter((f) => Number(f.paye) === 0 && Number(f.status) >= 1);
}

// ─────────────────── Produits / tarifs ───────────────────

async function getProduits(config) {
  if (!isConfigured(config)) return simulatedProduits();
  return request(config, 'GET', '/products?limit=100');
}
async function createProduit(config, data) {
  if (!isConfigured(config)) throw new NotConfiguredError();
  return request(config, 'POST', '/products', { label: data.label, price: data.price, type: 0 });
}

// ─────────────────── Comptabilité ───────────────────

async function getEcritures(config, dateDebut, dateFin) {
  if (!isConfigured(config)) return simulatedEcritures(dateDebut, dateFin);
  const sqlfilters = `(t.doc_date:>=:'${dateDebut}') and (t.doc_date:<=:'${dateFin}')`;
  return request(config, 'GET', `/accountancy/movements?limit=1000&sqlfilters=${encodeURIComponent(sqlfilters)}`);
}

/**
 * Génère un export comptable au format EBP (CSV) pour une période.
 * @returns {{filename, csv, count, simulated}}
 */
async function exportEBP(config, dateDebut, dateFin) {
  const ecritures = await getEcritures(config, dateDebut, dateFin);
  const rows = Array.isArray(ecritures) ? ecritures : [];
  // En-tête CSV au format compatible EBP
  const header = 'Date;Journal;Compte;Libelle;Debit;Credit;Piece';
  const lines = rows.map((e) => [
    (e.doc_date || e.date || '').toString().slice(0, 10),
    e.code_journal || e.journal || 'VT',
    e.numero_compte || e.account || '',
    (e.label_operation || e.libelle || 'Écriture').replace(/;/g, ','),
    Number(e.debit || 0).toFixed(2),
    Number(e.credit || 0).toFixed(2),
    e.piece_num || e.ref || '',
  ].join(';'));
  const csv = [header, ...lines].join('\n');
  const ym = dateDebut.slice(0, 7);
  return {
    filename: `dolibarr_export_EBP_${ym}.csv`,
    csv,
    count: rows.length,
    simulated: !isConfigured(config),
  };
}

// ─────────────────── Banque ───────────────────

async function getBanque(config) {
  if (!isConfigured(config)) return simulatedBanque();
  return request(config, 'GET', '/bankaccounts?limit=50');
}

// ─────────────────── Données simulées ───────────────────

function tag(arr) { arr._simulated = true; return arr; }

function simulatedClients() {
  return tag([
    { id: 1, name: 'Dupont BTP', email: 'contact@dupont-btp.fr', client: 1 },
    { id: 2, name: 'La Boutique', email: 'hello@laboutique.fr', client: 2 },
  ]);
}
function simulatedProduits() {
  return tag([
    { id: 1, label: 'Dépannage plomberie', price: 90 },
    { id: 2, label: 'Installation chauffe-eau', price: 650 },
    { id: 3, label: 'Rénovation salle de bain', price: 4500 },
  ]);
}
function simulatedDevis() {
  return tag([
    { id: 1, ref: 'PR2026-001', socname: 'Dupont BTP', total_ttc: 1200, status: 1 },
    { id: 2, ref: 'PR2026-002', socname: 'La Boutique', total_ttc: 830, status: 0 },
  ]);
}
function simulatedFactures() {
  return tag([
    { id: 1, ref: 'FA2026-001', socname: 'Dupont BTP', total_ttc: 1200, paye: 1, status: 1, date_lim_reglement: '2026-05-01' },
    { id: 2, ref: 'FA2026-002', socname: 'Artisan Pro', total_ttc: 850, paye: 0, status: 1, date_lim_reglement: '2026-05-20' },
    { id: 3, ref: 'FA2026-003', socname: 'StartUp.io', total_ttc: 2500, paye: 0, status: 1, date_lim_reglement: '2026-06-02' },
  ]);
}
function simulatedEcritures(d1, d2) {
  return tag([
    { doc_date: (d1 || '').slice(0, 10), code_journal: 'VT', numero_compte: '411000', label_operation: 'Facture client Dupont BTP', debit: 1200, credit: 0, piece_num: 'FA2026-001' },
    { doc_date: (d1 || '').slice(0, 10), code_journal: 'VT', numero_compte: '707000', label_operation: 'Vente prestations', debit: 0, credit: 1000, piece_num: 'FA2026-001' },
    { doc_date: (d1 || '').slice(0, 10), code_journal: 'VT', numero_compte: '445710', label_operation: 'TVA collectée', debit: 0, credit: 200, piece_num: 'FA2026-001' },
  ]);
}
function simulatedBanque() {
  return tag([{ id: 1, label: 'Compte courant pro', solde: 12450.32, currency_code: 'EUR' }]);
}

module.exports = {
  NotConfiguredError, isConfigured, configFromUser,
  getDolibarrToken, testConnection,
  getClients, createClient, updateClient,
  getDevis, createDevis, sendDevis,
  getFactures, createFacture, getFacturesImpayees,
  getProduits, createProduit,
  getEcritures, exportEBP,
  getBanque,
};
