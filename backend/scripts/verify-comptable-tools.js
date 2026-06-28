/**
 * Vérification LOCALE du function calling de l'agent COMPTABLE — sans déployer.
 *
 * Lance la VRAIE boucle d'outils (askAgentWithTools, 10 tours) avec :
 *   - la clé Anthropic (ANTHROPIC_API_KEY) → le modèle décide d'appeler les tools,
 *   - la config Dolibarr (DOLIBARR_URL / DOLIBARR_APIKEY) → les tools lisent l'ERP.
 * Journalise chaque tool_use + son résultat, puis affiche la réponse finale et un
 * verdict (le Comptable a-t-il RÉELLEMENT appelé ses tools ?).
 *
 * AUCUN secret en dur : tout vient des variables d'environnement.
 *
 * Pré-requis (une seule fois) :
 *   cd backend && npm install            # installe @anthropic-ai/sdk
 *
 * Usage (PowerShell) :
 *   $env:ANTHROPIC_API_KEY="sk-ant-..."; $env:DOLIBARR_URL="https://dolibarr.famcofinances.com"; $env:DOLIBARR_APIKEY="<clé>"
 *   node backend/scripts/verify-comptable-tools.js
 *   # question personnalisable : $env:ASK="Quel est mon CA de ce mois ?"
 */
const path = require('path');
// Charge backend/.env s'il existe (sinon on s'appuie sur l'environnement courant).
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { askAgentWithTools, isLive, MODEL } = require('../anthropic');
const { getAgent } = require('../agents/registry');
const doli = require('../integrations/dolibarr');
const comptableTools = require('../integrations/comptableTools');

const ctx = {
  userId: 0,
  dolibarr: {
    url: process.env.DOLIBARR_URL || process.env.SHARED_DOLIBARR_URL,
    apiKey: process.env.DOLIBARR_APIKEY || process.env.SHARED_DOLIBARR_APIKEY,
  },
};

async function main() {
  if (!isLive()) {
    console.error('❌ ANTHROPIC_API_KEY absente → le SDK est en mode démo (pas de function calling). Définis la clé.');
    process.exit(1);
  }
  if (!doli.isConfigured(ctx.dolibarr)) {
    console.error('❌ Config Dolibarr manquante. Définis DOLIBARR_URL et DOLIBARR_APIKEY.');
    process.exit(1);
  }
  console.log(`→ Modèle : ${MODEL} | Dolibarr : ${ctx.dolibarr.url}`);

  const agent = getAgent('comptable');
  const question = process.env.ASK || 'Liste mes factures impayées et donne-moi le total impayé.';
  console.log(`→ Question : « ${question} »\n`);

  // Executor instrumenté : journalise chaque appel d'outil.
  const calls = [];
  const exec = async (name, input) => {
    calls.push(name);
    console.log(`  → tool_use #${calls.length} : ${name}(${JSON.stringify(input)})`);
    const res = await comptableTools.execute(name, input, ctx);
    console.log(`  ← result : ${JSON.stringify(res).slice(0, 220)}`);
    return res;
  };

  const answer = await askAgentWithTools(
    agent.systemPrompt,
    [{ role: 'user', content: question }],
    comptableTools.TOOLS,
    exec,
    { maxTurns: 10, maxTokens: 2048 }
  );

  console.log('\n──────── RÉPONSE FINALE DU COMPTABLE ────────');
  console.log(answer);
  console.log('\n──────── VERDICT ────────');
  if (calls.length > 0) {
    console.log(`✅ Le Comptable a appelé ${calls.length} outil(s) : ${calls.join(', ')}`);
    console.log('   → Function calling Dolibarr OPÉRATIONNEL pour le Comptable.');
  } else {
    console.log('❌ AUCUN tool appelé — le Comptable a répondu en mode texte. (Vérifier prompt / tools.)');
    process.exit(2);
  }
}

main().catch((e) => { console.error('❌ Erreur :', e.message); process.exit(1); });
