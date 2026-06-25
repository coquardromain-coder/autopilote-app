/**
 * Outils Dolibarr exposés aux agents via le function calling Anthropic.
 *
 * Ce module fournit :
 *   - TOOLS    : les définitions d'outils (JSON Schema) envoyées à Claude
 *   - execute  : l'exécuteur qui traduit un appel d'outil en requête Dolibarr
 *
 * Principe TTC : le catalogue Dolibarr est en TTC, mais l'API /proposals stocke
 * les lignes en HT et recalcule la TVA. On convertit donc chaque prix TTC en
 * prix HT (subprice) en conservant le tva_tx EXACT de la fiche produit, puis on
 * relit le devis créé pour vérifier que le total Dolibarr correspond au TTC
 * attendu (auto-contrôle).
 */
const doli = require('./dolibarr');

// ─────────────────── Définitions d'outils (envoyées à Claude) ───────────────────

const TOOLS = [
  {
    name: 'search_products',
    description:
      'Recherche des produits/prestations dans le catalogue Dolibarr du client. ' +
      "Recherche tolérante (insensible aux accents et à la casse, correspondance partielle). " +
      'Renvoie pour chaque produit : ref, label, price_ttc (prix TTC, le catalogue est en TTC) ' +
      'et tva_tx (taux de TVA de la fiche, à reporter tel quel). ' +
      "Utilise TOUJOURS cet outil pour récupérer les vrais prix avant de chiffrer — n'invente jamais un prix.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texte recherché dans le libellé ou la référence (ex: "menu elegance", "cocktail").' },
        ref: { type: 'string', description: 'Filtre sur la référence produit (ex: "COCK-08").' },
        category: { type: 'string', description: 'Famille de produits recherchée (ex: "cocktail", "menu", "boisson").' },
        tosell_only: { type: 'boolean', description: 'Si vrai, ne renvoie que les produits en vente (tosell=1).' },
      },
    },
  },
  {
    name: 'get_products',
    description:
      'Liste les produits/prestations en vente (tosell=1) du catalogue Dolibarr. ' +
      'Utile pour avoir une vue d\'ensemble. Mêmes champs que search_products.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_thirdparty',
    description:
      'Cherche un client/tiers Dolibarr par son nom (insensible aux accents/casse, partiel). ' +
      'Renvoie { found, id, name } si trouvé. À appeler AVANT de créer un devis pour récupérer le socid.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Nom du client recherché.' } },
      required: ['name'],
    },
  },
  {
    name: 'create_thirdparty',
    description:
      "Crée un client/tiers dans Dolibarr s'il n'existe pas déjà. " +
      "N'appeler que si get_thirdparty n'a rien trouvé. Renvoie l'id du tiers créé (à utiliser comme socid).",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom du client (raison sociale ou nom complet).' },
        email: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_proposal',
    description:
      'Crée un devis (proposal) en BROUILLON dans Dolibarr pour un tiers existant. ' +
      'Fournir les lignes avec le price_ttc et le tva_tx EXACTS issus de search_products. ' +
      'La conversion TTC→HT est automatique : ne fournis PAS de prix HT, fournis le TTC. ' +
      'Le devis est créé en brouillon (non validé, non envoyé). ' +
      "L'outil relit le devis et renvoie le total calculé par Dolibarr pour contrôle.",
    input_schema: {
      type: 'object',
      properties: {
        socid: { type: 'integer', description: 'Id du tiers (obtenu via get_thirdparty ou create_thirdparty).' },
        lines: {
          type: 'array',
          description: 'Lignes du devis.',
          items: {
            type: 'object',
            properties: {
              ref: { type: 'string', description: 'Référence produit (pour traçabilité).' },
              label: { type: 'string', description: 'Désignation de la ligne.' },
              qty: { type: 'number', description: 'Quantité (ex: nombre de convives).' },
              price_ttc: { type: 'number', description: 'Prix unitaire TTC issu du catalogue (par personne pour les cocktails).' },
              tva_tx: { type: 'number', description: 'Taux de TVA EXACT de la fiche produit (ex: 10 ou 20). Ne pas le déduire.' },
            },
            required: ['label', 'qty', 'price_ttc', 'tva_tx'],
          },
        },
      },
      required: ['socid', 'lines'],
    },
  },
];

// ─────────────────── Exécuteur ───────────────────

/** Arrondi à n décimales. */
function round(n, d = 2) {
  const f = Math.pow(10, d);
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
}

/**
 * Crée le devis : conversion TTC→HT par ligne (tva_tx conservé), puis relecture
 * du total Dolibarr pour auto-contrôle.
 */
async function createProposal(config, input) {
  // socid peut arriver en chaîne ("1") depuis Dolibarr 19.0.2 → on le coerce.
  const socid = doli.extractId(input.socid);
  if (!socid) {
    return { error: "socid manquant ou invalide — récupère d'abord le tiers via get_thirdparty, ou crée-le via create_thirdparty." };
  }
  const rawLines = Array.isArray(input.lines) ? input.lines : [];
  if (!rawLines.length) return { error: 'Aucune ligne fournie pour le devis.' };

  let expectedTtc = 0;
  const lines = rawLines.map((l) => {
    const qty = Number(l.qty || 1);
    const priceTtc = Number(l.price_ttc);
    const tva = Number(l.tva_tx);
    // Dolibarr stocke en HT et rajoute la TVA : on convertit le TTC en HT.
    const subpriceHt = round(priceTtc / (1 + tva / 100), 5);
    expectedTtc += priceTtc * qty;
    return {
      desc: l.ref ? `${l.ref} — ${l.label || ''}`.trim() : (l.label || 'Prestation'),
      qty,
      subprice: subpriceHt, // HT
      tva_tx: tva,
      product_type: 0,
    };
  });

  const created = await doli.createDevis(config, { socid, lines });
  const id = doli.extractId(created);

  // Auto-contrôle : relit le devis et compare le total Dolibarr au TTC attendu.
  let dolibarrTotalTtc = null;
  let dolibarrTotalHt = null;
  let ref = null;
  let totalsMatch = null;
  try {
    const prop = await doli.getProposal(config, id);
    dolibarrTotalTtc = prop && prop.total_ttc != null ? Number(prop.total_ttc) : null;
    dolibarrTotalHt = prop && prop.total_ht != null ? Number(prop.total_ht) : null;
    ref = prop && prop.ref ? prop.ref : null;
    if (dolibarrTotalTtc != null) {
      // Tolérance : arrondis Dolibarr au centime, cumulés sur les lignes.
      const tol = Math.max(0.05, lines.length * 0.02);
      totalsMatch = Math.abs(dolibarrTotalTtc - expectedTtc) <= tol;
    }
  } catch (_) {
    /* relecture best-effort */
  }

  return {
    id,
    ref,
    status: 'brouillon',
    expected_ttc: round(expectedTtc, 2),
    dolibarr_total_ttc: dolibarrTotalTtc,
    dolibarr_total_ht: dolibarrTotalHt,
    totals_match: totalsMatch,
    note:
      totalsMatch === false
        ? 'ATTENTION : le total calculé par Dolibarr diffère du TTC attendu — signale-le au client et ne valide pas le devis.'
        : 'Devis créé en brouillon (non validé). Le client peut le relire et le valider dans Dolibarr.',
  };
}

/**
 * Exécute un appel d'outil et renvoie un objet sérialisable.
 * @param {string} name - nom de l'outil
 * @param {object} input - arguments fournis par Claude
 * @param {object} config - config Dolibarr du client
 */
async function execute(name, input, config) {
  switch (name) {
    case 'search_products': {
      const products = await doli.searchProducts(config, {
        query: input.query,
        ref: input.ref,
        category: input.category,
        tosellOnly: Boolean(input.tosell_only),
      });
      return { count: products.length, products };
    }
    case 'get_products': {
      const products = await doli.searchProducts(config, { tosellOnly: true });
      return { count: products.length, products };
    }
    case 'get_thirdparty': {
      const t = await doli.findThirdpartyByName(config, input.name);
      // id renvoyé en CHAÎNE par Dolibarr 19.0.2 → normalisé en nombre.
      return t
        ? { found: true, id: doli.extractId(t), name: t.name, email: t.email || null }
        : { found: false };
    }
    case 'create_thirdparty': {
      const created = await doli.createThirdparty(config, input);
      // POST /thirdparties peut renvoyer un id nu (nombre/chaîne) ou un objet.
      return { id: doli.extractId(created), name: input.name };
    }
    case 'create_proposal':
      return createProposal(config, input);
    default:
      return { error: `Outil inconnu : ${name}` };
  }
}

module.exports = { TOOLS, execute };
