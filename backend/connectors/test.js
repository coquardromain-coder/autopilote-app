/**
 * Test de connexion d'un connecteur (partagé client/admin).
 */
const { db } = require('../db');
const doli = require('../integrations/dolibarr');
const metaWa = require('../integrations/whatsapp');
const opensign = require('../integrations/opensign');
const docuseal = require('../integrations/docuseal');
const fonoster = require('../integrations/fonoster');
const hunterio = require('../integrations/hunterio');
const wordpress = require('../wordpress');
const google = require('../google');

async function testConnector(id, userId, config) {
  switch (id) {
    case 'dolibarr': return doli.testConnection({ url: config.url, apiKey: config.apikey });
    case 'whatsapp': return metaWa.testConnection(config);
    case 'opensign': return opensign.testConnection(config);
    case 'docuseal': return docuseal.testConnection(config);
    case 'fonoster': return fonoster.testConnection(config);
    case 'hunterio': return hunterio.testConnection(config);
    case 'wordpress':
      if (!wordpress.isConfigured(config)) throw new Error('Champs WordPress incomplets');
      await wordpress.getTags(config); return { success: true };
    case 'stripe': {
      if (!config.secretKey) throw new Error('Clé secrète Stripe manquante');
      const r = await fetch('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${config.secretKey}` } });
      if (!r.ok) throw new Error('Clé Stripe invalide'); return { success: true };
    }
    case 'searchconsole': case 'analytics': case 'googlebusiness':
      if (!google.getAccount(userId)) throw new Error('Connectez d\'abord Google Workspace');
      return { success: true };
    default: return { success: true };
  }
}

module.exports = { testConnector };
