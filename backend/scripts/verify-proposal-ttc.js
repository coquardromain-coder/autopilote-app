/**
 * Vérification empirique du point 1 : comment l'API Dolibarr /proposals attend
 * réellement les lignes quand le catalogue est en TTC.
 *
 * Ce script :
 *   1. lit le catalogue (search_products) et choisit un produit ayant price_ttc + tva_tx,
 *   2. trouve ou crée un tiers de test,
 *   3. crée un devis BROUILLON via la même logique que les agents (TTC→HT + tva_tx),
 *   4. relit le devis et COMPARE le total_ttc Dolibarr au TTC attendu,
 *   5. affiche le verdict.
 *
 * AUCUNE clé en dur : les identifiants sont lus dans les variables d'environnement.
 *   DOLIBARR_URL / DOLIBARR_APIKEY   (ou)   SHARED_DOLIBARR_URL / SHARED_DOLIBARR_APIKEY
 *
 * Usage (PowerShell) :
 *   $env:DOLIBARR_URL="https://dolibarr.famcofinances.com"; $env:DOLIBARR_APIKEY="<clé>"; node backend/scripts/verify-proposal-ttc.js
 * Options :
 *   $env:DELETE_AFTER="1"   → supprime le devis de test à la fin.
 */
const doli = require('../integrations/dolibarr');
const tools = require('../integrations/dolibarrTools');

const config = {
  url: process.env.DOLIBARR_URL || process.env.SHARED_DOLIBARR_URL,
  apiKey: process.env.DOLIBARR_APIKEY || process.env.SHARED_DOLIBARR_APIKEY,
};

async function main() {
  if (!doli.isConfigured(config)) {
    console.error('❌ Config manquante. Définis DOLIBARR_URL et DOLIBARR_APIKEY (ou SHARED_*).');
    process.exit(1);
  }
  console.log(`→ Dolibarr : ${config.url}`);

  // 1) Un produit exploitable
  const products = await doli.searchProducts(config, { tosellOnly: true });
  const product = products.find((p) => p.price_ttc != null && p.tva_tx != null);
  if (!product) {
    console.error('❌ Aucun produit avec price_ttc + tva_tx trouvé dans le catalogue.');
    process.exit(1);
  }
  const qty = 3;
  console.log(
    `→ Produit test : ${product.ref} "${product.label}" — price_ttc=${product.price_ttc}, tva_tx=${product.tva_tx}% × ${qty}`
  );

  // 2) Tiers de test — réutilise un tiers existant si possible, sinon le crée.
  // L'id Dolibarr 19.0.2 arrive en CHAÎNE ("1") → extractId() le normalise.
  const name = process.env.TEST_CLIENT || 'Client Test';
  let socid;
  console.log(`\n[ÉTAPE 2] Recherche du tiers "${name}"…`);
  let found = null;
  try {
    found = await doli.findThirdpartyByName(config, name);
  } catch (e) {
    console.error(`   ✗ findThirdpartyByName a levé une exception : ${e.message}`);
    console.error('   → C\'est l\'appel GET /thirdparties qui casse (probable quirk HTTP 500). Relance avec DOLIBARR_DEBUG=1.');
    process.exit(1);
  }
  console.log(`   tiers trouvé (brut) : ${JSON.stringify(found)}`);
  if (found) {
    socid = doli.extractId(found);
    console.log(`   ✓ socid extrait = ${socid} (type ${typeof socid}), code ${found.code_client || '?'}`);
  } else {
    console.log('   tiers absent → création…');
    const created = await doli.createThirdparty(config, { name });
    console.log(`   réponse création (brut) : ${JSON.stringify(created)}`);
    socid = doli.extractId(created);
    console.log(`   ✓ socid extrait = ${socid}`);
  }
  if (!socid) {
    console.error('❌ socid non extractible. Réponse brute :', JSON.stringify(found));
    process.exit(1);
  }

  // 3) Devis via la MÊME logique que les agents
  console.log(`\n[ÉTAPE 3] create_proposal avec socid=${socid}…`);
  let res;
  try {
    res = await tools.execute(
      'create_proposal',
      {
        socid,
        lines: [
          { ref: product.ref, label: product.label, qty, price_ttc: product.price_ttc, tva_tx: product.tva_tx },
        ],
      },
      config
    );
  } catch (e) {
    console.error(`   ✗ POST /proposals a levé une exception : ${e.message}`);
    console.error('   → Relance avec DOLIBARR_DEBUG=1 pour voir le payload et la réponse brute.');
    process.exit(1);
  }
  console.log(`   réponse create_proposal : ${JSON.stringify(res)}`);

  // Erreur explicite de l'outil (ne pas afficher des champs "undefined").
  if (res.error) {
    console.error('❌ create_proposal a échoué :', res.error);
    process.exit(1);
  }

  // 4) Verdict
  const expected = res.expected_ttc;
  const got = res.dolibarr_total_ttc;
  console.log('\n──────── RÉSULTAT ────────');
  console.log(`Devis créé : id=${res.id} ref=${res.ref} (${res.status})`);
  console.log(`TTC attendu (price_ttc × qty)   : ${expected} €`);
  console.log(`TTC calculé par Dolibarr        : ${got} €  (HT ${res.dolibarr_total_ht})`);
  if (res.totals_match === true) {
    console.log('✅ MATCH — la conversion TTC→HT + tva_tx est correcte. subprice=HT est le bon format.');
  } else if (res.totals_match === false) {
    const ratio = got && expected ? (got / expected).toFixed(4) : '?';
    console.log(`❌ ÉCART — ratio got/attendu = ${ratio}.`);
    console.log('   Si ratio ≈ 1 + tva/100, Dolibarr a traité subprice comme du TTC (à investiguer).');
  } else {
    console.log('⚠️ Relecture impossible (total non renvoyé). Vérifie manuellement le devis dans Dolibarr.');
  }

  // 5) Nettoyage optionnel
  if (process.env.DELETE_AFTER === '1' && res.id) {
    try {
      await doli.getProposal(config, res.id); // s'assure de l'existence
      // suppression directe via l'API REST
      const del = await fetch(`${config.url.replace(/\/+$/, '')}/api/index.php/proposals/${res.id}`, {
        method: 'DELETE',
        headers: { DOLAPIKEY: config.apiKey, Accept: 'application/json' },
      });
      console.log(`\n🧹 Suppression du devis de test : HTTP ${del.status}`);
    } catch (e) {
      console.log(`\n⚠️ Suppression impossible : ${e.message}`);
    }
  } else if (res.id) {
    console.log(`\nℹ️ Devis de test laissé en brouillon (id ${res.id}). Relance avec DELETE_AFTER=1 pour le supprimer.`);
  }
}

main().catch((e) => {
  console.error('❌ Erreur :', e.message);
  process.exit(1);
});
