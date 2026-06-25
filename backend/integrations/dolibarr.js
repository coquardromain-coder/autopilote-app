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
  const t = (v) => (v == null ? null : String(v).trim());
  return {
    url: t(user.dolibarr_url),
    login: t(user.dolibarr_login),
    password: t(user.dolibarr_password),
    apiKey: t(user.dolibarr_apikey),
  };
}

/** Indique si la configuration Dolibarr est exploitable. */
function isConfigured(config) {
  return Boolean(config && config.url && (config.apiKey || (config.login && config.password)));
}

/** Nettoie une valeur de config (espaces/sauts de ligne issus d'un copier-coller). */
function clean(v) { return v == null ? v : String(v).trim(); }

/** Construit l'URL d'API complète. */
function apiUrl(config, path) {
  // Retire les espaces et un éventuel /, voire un /api/index.php déjà saisi
  let base = clean(config.url).replace(/\/+$/, '');
  base = base.replace(/\/api\/index\.php$/i, '');
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
  const token = clean(await getDolibarrToken(config));
  // En-têtes : DOLAPIKEY (auth Dolibarr) ; Content-Type seulement si corps.
  const headers = { DOLAPIKEY: token, Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (process.env.DOLIBARR_DEBUG) {
    console.log(`[Dolibarr] → ${method} ${path}${body ? ' payload=' + JSON.stringify(body) : ''}`);
  }
  const res = await fetch(apiUrl(config, path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  let parsed = true;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; parsed = false; }

  if (process.env.DOLIBARR_DEBUG) {
    console.log(`[Dolibarr] ← ${method} ${path} HTTP ${res.status} body=${(text || '').slice(0, 300)}`);
  }

  // Une "vraie" erreur Dolibarr a la forme { error: { code, message } }.
  const isErrorBody = parsed && data && typeof data === 'object' && !Array.isArray(data) && data.error;

  if (!res.ok) {
    // Quirk Dolibarr 19.0.2 : renvoie PARFOIS HTTP 500 (voire 4xx) AVEC un corps
    // JSON parfaitement valide correspondant au SUCCÈS de l'opération (même
    // comportement déjà toléré par testConnection). On ne lève une erreur que si
    // le corps est une vraie erreur Dolibarr, ou n'est pas du JSON exploitable.
    const usableBody = parsed && data !== null && data !== undefined && !isErrorBody;
    if (usableBody) {
      if (process.env.DOLIBARR_DEBUG) {
        console.warn(`[Dolibarr] ⚠ HTTP ${res.status} sur ${method} ${path} mais corps valide → traité comme succès.`);
      }
      return data;
    }
    const msg = isErrorBody
      ? (data.error.message || data.error.code || JSON.stringify(data.error))
      : (typeof data === 'string' && data ? data.slice(0, 200) : `Erreur HTTP ${res.status}`);
    throw new Error(msg);
  }

  // Réponse 2xx mais corps d'erreur explicite (rare) → on le signale aussi.
  if (isErrorBody) {
    throw new Error(data.error.message || data.error.code || JSON.stringify(data.error));
  }
  return data;
}

/**
 * Teste la connexion à Dolibarr.
 * Auth : en-tête DOLAPIKEY (Dolibarr 19.x). Endpoint : GET /api/index.php/status.
 * Réponse attendue : {"success":{"code":200,"dolibarr_version":"19.0.2"}}
 */
async function testConnection(config) {
  if (!config || !config.url) throw new NotConfiguredError();
  const url = apiUrl(config, '/status');
  const res = await fetch(url, {
    method: 'GET',
    headers: { DOLAPIKEY: clean(config.apiKey) || '', Accept: 'application/json' },
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }

  // Dolibarr 19.0.2 renvoie parfois HTTP 500 AVEC un body valide
  // {"success":{"code":200,"dolibarr_version":"19.0.2"}} → on considère ça OK.
  const okBody = data && data.success && Number(data.success.code) === 200;

  if (!res.ok && !okBody) {
    // Surface le vrai message de Dolibarr (utile pour 401/403/404/501…)
    const hint = res.status === 501 || res.status === 404
      ? ' (vérifiez que le module "API REST" est activé dans Dolibarr)'
      : res.status === 401 || res.status === 403
      ? ' (clé API invalide ou droits insuffisants)'
      : '';
    throw new Error(`Dolibarr a répondu HTTP ${res.status} sur /api/index.php/status${hint} — ${text.slice(0, 200)}`);
  }

  if (data === null) data = text;
  // Format Dolibarr : { success: { code, dolibarr_version } }
  const version =
    data?.success?.dolibarr_version ||
    data?.dolibarr_version ||
    data?.version ||
    (typeof data === 'string' ? data.replace(/"/g, '') : 'OK');
  return { success: true, version };
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

/**
 * Normalise une réponse de liste Dolibarr en tableau.
 * Dolibarr 19.x renvoie parfois un OBJET UNIQUE (et non un tableau) quand il n'y
 * a qu'un seul enregistrement — on le réenveloppe pour un traitement uniforme.
 */
function asArray(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') return [data];
  return [];
}

/**
 * Extrait un id numérique depuis une réponse Dolibarr, qui peut être :
 *   - un nombre (12) ou une chaîne ("12") — id renvoyé directement par un POST,
 *   - un objet société/devis complet { id: "1", ... } (id en CHAÎNE en 19.0.2).
 * @returns {number|null}
 */
function extractId(data) {
  if (data == null) return null;
  if (typeof data === 'number') return data;
  if (typeof data === 'string') {
    const n = Number(data);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof data === 'object' && data.id != null) return extractId(data.id);
  return null;
}

/** Normalise une chaîne : minuscules, sans accents, sans espaces superflus. */
function normalize(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/** Ne conserve que les champs utiles d'un produit pour l'agent. */
function slimProduct(p) {
  return {
    id: p.id,
    ref: p.ref,
    label: p.label,
    // Le catalogue est en TTC ; on expose price_ttc et la TVA de la fiche produit.
    price_ttc: p.price_ttc != null ? Number(p.price_ttc) : null,
    price_ht: p.price != null ? Number(p.price) : null,
    tva_tx: p.tva_tx != null ? Number(p.tva_tx) : null,
    tosell: Number(p.status) === 1,
  };
}

/**
 * Recherche tolérante dans le catalogue produits.
 * Récupère le catalogue puis filtre en mémoire (insensible accents/casse,
 * correspondance partielle) — robuste aux libellés sans accents ("Menu Elegance").
 * @param {object} config
 * @param {{query?:string, ref?:string, category?:string, tosellOnly?:boolean}} opts
 */
async function searchProducts(config, opts = {}) {
  if (!isConfigured(config)) return simulatedProduits().map(slimProduct);
  const all = await request(config, 'GET', '/products?limit=1000');
  let list = asArray(all);

  if (opts.tosellOnly) list = list.filter((p) => Number(p.status) === 1);

  if (opts.ref) {
    const r = normalize(opts.ref);
    list = list.filter((p) => normalize(p.ref).includes(r));
  }
  // "catégorie" et "query" sont traitées en correspondance partielle sur ref+label
  // (les libellés du catalogue regroupent déjà les familles : "Cocktail…", "Menu…").
  const needles = [opts.category, opts.query].map(normalize).filter(Boolean);
  for (const n of needles) {
    list = list.filter((p) => normalize(p.label).includes(n) || normalize(p.ref).includes(n));
  }
  return list.map(slimProduct);
}

// ─────────────────── Tiers (recherche) & devis (lecture unitaire) ───────────────────

/**
 * Cherche un tiers par son nom (insensible accents/casse, partiel).
 * @returns {Promise<object|null>} le tiers trouvé (ou null)
 */
async function findThirdpartyByName(config, name) {
  if (!isConfigured(config)) return null;
  if (!name || !String(name).trim()) return null;
  const all = await request(config, 'GET', '/thirdparties?limit=1000');
  const list = asArray(all); // Dolibarr 19.x peut renvoyer un objet unique
  const target = normalize(name);
  // Priorité à l'égalité exacte, sinon correspondance partielle dans les deux sens.
  return (
    list.find((t) => normalize(t.name) === target) ||
    list.find((t) => normalize(t.name).includes(target) || target.includes(normalize(t.name))) ||
    null
  );
}

/** Crée un tiers (client/prospect). type client : 1=client, 2=prospect, 3=les deux. */
async function createThirdparty(config, data) {
  if (!isConfigured(config)) throw new NotConfiguredError();
  return request(config, 'POST', '/thirdparties', {
    name: data.name,
    client: data.client != null ? data.client : 2,
    email: data.email || '',
    phone: data.phone || '',
    address: data.address || '',
  });
}

/** Lit un devis (proposal) par son id — utilisé pour vérifier les totaux. */
async function getProposal(config, id) {
  if (!isConfigured(config)) throw new NotConfiguredError();
  return request(config, 'GET', `/proposals/${id}`);
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
  searchProducts, slimProduct, normalize, asArray, extractId,
  findThirdpartyByName, createThirdparty, getProposal,
  getEcritures, exportEBP,
  getBanque,
};
