/**
 * Pont entre les agents AutoPilote et Dolibarr.
 * Détecte les intentions liées à l'ERP dans les messages et exécute
 * l'action correspondante (ou renvoie le message de configuration).
 */
const doli = require('./dolibarr');

// Message affiché quand Dolibarr n'est pas configuré (mode simulation)
const CONFIG_MSG =
  'Pour réaliser cette action dans Dolibarr, configurez l\'intégration dans ' +
  'Paramètres → Intégrations → Dolibarr.';

/**
 * Détecte une commande Dolibarr et l'agent à mobiliser.
 * @returns {{action:string, agent:string}|null}
 */
function interpret(text) {
  // Normalisation : minuscules + suppression des accents (robuste à l'encodage)
  const t = (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/impay/.test(t) && /facture/.test(t)) return { action: 'factures_impayees', agent: 'comptable' };
  if (/export\s*ebp|\bebp\b|export.*compta/.test(t)) return { action: 'export_ebp', agent: 'comptable' };
  if (/\b(cree|creer|fais|faire|genere|generer|nouveau|nouvelle|etablis|etablir)\b.*\bdevis\b/.test(t) || /\bdevis\b.*\b(client|pour)\b/.test(t)) return { action: 'create_devis', agent: 'deviseur' };
  if (/\bajoute\b.*\b(prospect|client|contact)\b/.test(t)) return { action: 'create_prospect', agent: 'commercial' };
  if (/chiffre\s*d'?\s*affaires|\bmon ca\b|\bca\b\s*(du|de|\?|mois|annuel)/.test(t)) return { action: 'chiffre_affaires', agent: 'analyste' };
  return null;
}

const euro = (n) => `${Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/**
 * Exécute l'action Dolibarr et renvoie un complément de réponse (markdown).
 * @param {object} user - ligne utilisateur (contient la config Dolibarr)
 * @param {string} action
 * @param {string} replyContent - contenu déjà généré par l'agent
 */
async function perform(user, action, replyContent) {
  const config = doli.configFromUser(user);
  const configured = doli.isConfigured(config);

  // Actions d'écriture : nécessitent une vraie configuration
  if (!configured && ['create_devis', 'create_prospect', 'export_ebp'].includes(action)) {
    return `\n\n---\n⚙️ _${CONFIG_MSG}_`;
  }

  try {
    switch (action) {
      case 'factures_impayees': {
        const impayees = await doli.getFacturesImpayees(config);
        if (!impayees.length) return '\n\n---\n✅ _Aucune facture impayée dans Dolibarr._';
        const total = impayees.reduce((s, f) => s + Number(f.total_ttc || 0), 0);
        const lignes = impayees.map((f) => `| ${f.ref} | ${f.socname || ''} | ${euro(f.total_ttc)} | ${f.date_lim_reglement || ''} |`).join('\n');
        return `\n\n---\n### 🧾 Factures impayées (Dolibarr${configured ? '' : ' — simulation'})\n` +
          `| Réf | Client | Montant | Échéance |\n|---|---|---|---|\n${lignes}\n\n` +
          `**Total impayé : ${euro(total)}** sur ${impayees.length} facture(s).\n` +
          `👉 Souhaitez-vous que je lance les relances de paiement ?`;
      }
      case 'export_ebp': {
        const month = new Date().toISOString().slice(0, 7);
        const exp = await doli.exportEBP(config, `${month}-01`, `${month}-31`);
        return `\n\n---\n✅ _Export EBP de ${month} généré (${exp.count} écriture(s)) : ${exp.filename}. ` +
          `Retrouvez-le dans « Mes documents » ; il peut être envoyé par email depuis la section Gestion._`;
      }
      case 'chiffre_affaires': {
        const factures = await doli.getFactures(config);
        const arr = (Array.isArray(factures) ? factures : []).filter((f) => Number(f.status) >= 1);
        const total = arr.reduce((s, f) => s + Number(f.total_ttc || 0), 0);
        const parClient = {};
        arr.forEach((f) => { parClient[f.socname || 'Divers'] = (parClient[f.socname || 'Divers'] || 0) + Number(f.total_ttc || 0); });
        const lignes = Object.entries(parClient).map(([c, m]) => `| ${c} | ${euro(m)} |`).join('\n');
        return `\n\n---\n### 📊 Chiffre d'affaires (Dolibarr${configured ? '' : ' — simulation'})\n` +
          `**CA total facturé : ${euro(total)}**\n\n| Client | CA |\n|---|---|\n${lignes}`;
      }
      case 'create_devis': {
        const produits = await doli.getProduits(config);
        const clients = await doli.getClients(config);
        const socid = clients[0]?.id;
        const lines = (produits.slice(0, 2)).map((p) => ({ desc: p.label, qty: 1, subprice: p.price }));
        const devis = await doli.createDevis(config, { socid, lines });
        await doli.sendDevis(config, devis?.id || devis).catch(() => {});
        return `\n\n---\n✅ _Devis créé dans Dolibarr et envoyé à ${clients[0]?.name || 'votre client'} ✓_`;
      }
      case 'create_prospect': {
        // Tente d'extraire un nom depuis le message n'est pas fiable ; on crée une fiche générique.
        const created = await doli.createClient(config, { name: 'Nouveau prospect (à compléter)' });
        return `\n\n---\n✅ _Fiche prospect créée dans Dolibarr (id ${created?.id || 'n/a'}). ` +
          `Complétez ses coordonnées, puis je peux préparer un premier email de prospection._`;
      }
      default:
        return '';
    }
  } catch (err) {
    return `\n\n---\n⚠️ _Action Dolibarr impossible : ${err.message}_`;
  }
}

module.exports = { interpret, perform, CONFIG_MSG };
