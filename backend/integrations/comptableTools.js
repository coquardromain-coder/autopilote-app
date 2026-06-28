/**
 * Outils Dolibarr exposés à l'agent COMPTABLE via le function calling Anthropic.
 *
 * V1 = LECTURE SEULE (aucune écriture : pas de création de facture — prévu V2).
 * Même patron que dolibarrTools.js (Deviseur) :
 *   - TOOLS    : définitions d'outils (JSON Schema) envoyées à Claude
 *   - execute(name, input, ctx) : traduit un appel d'outil en lecture Dolibarr
 *
 * `ctx.dolibarr` porte la config Dolibarr du client. La tolérance au quirk
 * Dolibarr 19.0.2 (HTTP 500 + corps JSON valide = succès) est gérée en amont
 * dans dolibarr.js (request()).
 */
const doli = require('./dolibarr');

// ─────────────────── Définitions d'outils ───────────────────

const TOOLS = [
  {
    name: 'get_invoices',
    description:
      'Liste les factures Dolibarr du client (lecture seule). Renvoie pour chaque facture : ' +
      'ref, client, total_ht, total_tva, total_ttc, payée (0/1), statut, date, échéance. ' +
      'Utilise TOUJOURS cet outil pour les chiffres — n\'invente jamais un montant.',
    input_schema: {
      type: 'object',
      properties: {
        unpaid_only: { type: 'boolean', description: 'Ne renvoyer que les factures impayées.' },
        period: { type: 'string', description: 'Filtre mois au format YYYY-MM (optionnel).' },
      },
    },
  },
  {
    name: 'get_unpaid_invoices',
    description:
      'Liste uniquement les factures impayées (validées et non réglées) — utile pour les relances. ' +
      'Renvoie le détail + le total impayé.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_revenue_summary',
    description:
      'Chiffre d\'affaires facturé (factures validées) : total TTC/HT/TVA et répartition par client, ' +
      'éventuellement sur un mois donné.',
    input_schema: {
      type: 'object',
      properties: { period: { type: 'string', description: 'Mois YYYY-MM (optionnel ; sinon tout l\'historique).' } },
    },
  },
  {
    name: 'get_vat_report',
    description:
      'TVA collectée sur les factures validées (total TVA, HT et TTC), éventuellement sur un mois donné.',
    input_schema: {
      type: 'object',
      properties: { period: { type: 'string', description: 'Mois YYYY-MM (optionnel).' } },
    },
  },
  {
    name: 'export_ebp',
    description:
      'Génère l\'export comptable au format EBP (CSV) pour un mois. Renvoie le nom de fichier, le nombre ' +
      'd\'écritures et un aperçu. (L\'envoi par email / l\'enregistrement se fait depuis la page Gestion.)',
    input_schema: {
      type: 'object',
      properties: { month: { type: 'string', description: 'Mois au format YYYY-MM.' } },
      required: ['month'],
    },
  },
  {
    name: 'get_bank_balance',
    description: 'Soldes des comptes bancaires Dolibarr (trésorerie).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_thirdparty',
    description: 'Recherche un client/tiers par nom (pour contextualiser une facture).',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Nom du client recherché.' } },
      required: ['name'],
    },
  },
];

// ─────────────────── Helpers ───────────────────

const num = (v) => Number(v || 0);

/** Déduit le mois (YYYY-MM) d'une facture, tolérant aux différents champs Dolibarr. */
function invoiceMonth(inv) {
  const raw = inv.date ?? inv.datef ?? inv.date_creation ?? inv.date_validation;
  if (raw == null || raw === '') return null;
  // timestamp Unix (secondes) ou chaîne "YYYY-MM-DD..."
  if (/^\d+$/.test(String(raw))) {
    return new Date(Number(raw) * 1000).toISOString().slice(0, 7);
  }
  return String(raw).slice(0, 7);
}

/** Ne garde que les champs utiles d'une facture pour l'agent. */
function slimInvoice(f) {
  return {
    ref: f.ref,
    client: f.socname || null,
    total_ht: num(f.total_ht),
    total_tva: num(f.total_tva),
    total_ttc: num(f.total_ttc),
    paye: Number(f.paye),
    status: Number(f.status),
    month: invoiceMonth(f),
    echeance: f.date_lim_reglement || null,
  };
}

/** Factures validées (status >= 1), éventuellement filtrées sur un mois. */
function validatedInvoices(list, period) {
  let arr = (Array.isArray(list) ? list : []).filter((f) => Number(f.status) >= 1);
  if (period) arr = arr.filter((f) => invoiceMonth(f) === period);
  return arr;
}

// ─────────────────── Exécuteur ───────────────────

async function execute(name, input, ctx) {
  const config = ctx.dolibarr;
  switch (name) {
    case 'get_invoices': {
      let list = await doli.getFactures(config);
      list = Array.isArray(list) ? list : [];
      if (input.unpaid_only) list = list.filter((f) => Number(f.paye) === 0 && Number(f.status) >= 1);
      if (input.period) list = list.filter((f) => invoiceMonth(f) === input.period);
      const slim = list.slice(0, 100).map(slimInvoice);
      return { count: slim.length, invoices: slim };
    }
    case 'get_unpaid_invoices': {
      const list = await doli.getFacturesImpayees(config);
      const slim = (Array.isArray(list) ? list : []).map(slimInvoice);
      const total_ttc = slim.reduce((s, f) => s + f.total_ttc, 0);
      return { count: slim.length, total_impaye_ttc: Math.round(total_ttc * 100) / 100, invoices: slim };
    }
    case 'get_revenue_summary': {
      const arr = validatedInvoices(await doli.getFactures(config), input.period);
      const totals = arr.reduce(
        (a, f) => ({
          ht: a.ht + num(f.total_ht),
          tva: a.tva + num(f.total_tva),
          ttc: a.ttc + num(f.total_ttc),
        }),
        { ht: 0, tva: 0, ttc: 0 }
      );
      const byClient = {};
      arr.forEach((f) => {
        const k = f.socname || 'Divers';
        byClient[k] = Math.round(((byClient[k] || 0) + num(f.total_ttc)) * 100) / 100;
      });
      return {
        period: input.period || 'tout',
        invoices_count: arr.length,
        total_ht: Math.round(totals.ht * 100) / 100,
        total_tva: Math.round(totals.tva * 100) / 100,
        total_ttc: Math.round(totals.ttc * 100) / 100,
        by_client: byClient,
      };
    }
    case 'get_vat_report': {
      const arr = validatedInvoices(await doli.getFactures(config), input.period);
      const tva = arr.reduce((s, f) => s + num(f.total_tva), 0);
      const ht = arr.reduce((s, f) => s + num(f.total_ht), 0);
      const ttc = arr.reduce((s, f) => s + num(f.total_ttc), 0);
      return {
        period: input.period || 'tout',
        invoices_count: arr.length,
        tva_collectee: Math.round(tva * 100) / 100,
        base_ht: Math.round(ht * 100) / 100,
        total_ttc: Math.round(ttc * 100) / 100,
      };
    }
    case 'export_ebp': {
      if (!input.month) return { error: 'Paramètre "month" (YYYY-MM) requis.' };
      const exp = await doli.exportEBP(config, `${input.month}-01`, `${input.month}-31`);
      const preview = String(exp.csv || '').split('\n').slice(0, 6);
      return {
        month: input.month,
        filename: exp.filename,
        ecritures: exp.count,
        simulated: Boolean(exp.simulated),
        preview,
        note: 'Pour l\'envoyer par email / l\'archiver, utilise la page Gestion (bouton Export EBP).',
      };
    }
    case 'get_bank_balance': {
      const list = await doli.getBanque(config);
      const accounts = (Array.isArray(list) ? list : []).map((b) => ({
        label: b.label || b.bank || null,
        solde: num(b.solde),
        devise: b.currency_code || 'EUR',
      }));
      return { count: accounts.length, accounts };
    }
    case 'get_thirdparty': {
      const t = await doli.findThirdpartyByName(config, input.name);
      return t ? { found: true, id: doli.extractId(t), name: t.name } : { found: false };
    }
    default:
      return { error: `Outil inconnu : ${name}` };
  }
}

module.exports = { TOOLS, execute };
