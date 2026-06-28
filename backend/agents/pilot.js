/**
 * Le Directeur — l'agent orchestrateur central.
 *
 * Pour chaque demande utilisateur, le Directeur :
 *   1. analyse l'intention (détection par mots-clés, extensible à l'IA),
 *   2. choisit l'agent spécialisé le plus pertinent,
 *   3. fait répondre cet agent,
 *   4. restitue la réponse en indiquant quel agent a traité la demande.
 */
const { AGENTS, getAgent } = require('./registry');
const { askAgent, askAgentWithTools } = require('../anthropic');
const doli = require('../integrations/dolibarr');
const dolibarrTools = require('../integrations/dolibarrTools');
const comptableTools = require('../integrations/comptableTools');

/**
 * Registre des agents OUTILLÉS (function calling).
 *
 * Chaque entrée :
 *   - opts  : options de la boucle d'outils (tours / tokens),
 *   - build(ctx) : renvoie { tools, execute } à partir du contexte résolu
 *                  (configs des services du client), ou `null` si le service
 *                  requis n'est pas configuré (→ repli sur la voie texte simple).
 *
 * `ctx` porte les configs par client : { userId, dolibarr, ... } — ce qui permet
 * à un agent d'utiliser plusieurs services (ex. futur Chasseur : Dolibarr + Hunter).
 *
 * Le Deviseur (validé) garde un exécuteur lié au `config` Dolibarr BRUT, donc son
 * comportement est strictement identique à avant la factorisation.
 */
const TOOL_AGENTS = {
  deviseur: {
    opts: { maxTurns: 10, maxTokens: 2048 },
    build: (ctx) =>
      doli.isConfigured(ctx.dolibarr)
        ? {
            tools: dolibarrTools.TOOLS,
            execute: (name, input) => dolibarrTools.execute(name, input, ctx.dolibarr),
          }
        : null,
  },
  comptable: {
    opts: { maxTurns: 10, maxTokens: 2048 },
    build: (ctx) =>
      doli.isConfigured(ctx.dolibarr)
        ? {
            tools: comptableTools.TOOLS,
            execute: (name, input) => comptableTools.execute(name, input, ctx),
          }
        : null,
  },
};

/** Échappe les caractères spéciaux d'une chaîne pour un usage en regex. */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Vérifie qu'un mot-clé apparaît comme un mot entier dans le texte
 * (et non comme une sous-chaîne d'un mot plus long). Les lettres
 * accentuées françaises sont traitées comme des caractères de mot.
 */
function matchesWord(text, keyword) {
  const re = new RegExp(`(^|[^a-zà-ÿ0-9])${escapeRegex(keyword)}([^a-zà-ÿ0-9]|$)`, 'i');
  return re.test(text);
}

/**
 * Analyse l'intention d'un message et renvoie l'id de l'agent cible.
 * Score basé sur le nombre de mots-clés présents dans le message.
 * @param {string} message
 * @param {string|null} forcedAgentId - agent imposé par l'utilisateur (optionnel)
 * @returns {string} id de l'agent choisi
 */
function routeIntent(message, forcedAgentId = null) {
  // L'utilisateur s'adresse directement à un agent : on respecte son choix
  if (forcedAgentId && getAgent(forcedAgentId)) {
    return forcedAgentId;
  }

  const text = (message || '').toLowerCase();
  let best = { id: 'directeur', score: 0 };

  for (const agent of Object.values(AGENTS)) {
    if (agent.id === 'directeur') continue;
    let score = 0;
    for (const kw of agent.keywords) {
      // Correspondance par limites de mots (évite que « prospect » matche
      // « prospection »). Les lettres accentuées sont considérées comme
      // faisant partie d'un mot.
      if (matchesWord(text, kw)) score += 1;
    }
    // Mention explicite du nom de l'agent : fort bonus
    if (matchesWord(text, agent.name.toLowerCase())) score += 2;
    if (score > best.score) best = { id: agent.id, score };
  }

  // Aucun mot-clé reconnu : le Directeur répond lui-même et oriente
  return best.score > 0 ? best.id : 'directeur';
}

/**
 * Traite une demande utilisateur de bout en bout.
 * @param {string} message - dernier message de l'utilisateur
 * @param {Array} history - historique [{role, content}]
 * @param {string|null} forcedAgentId - agent imposé (depuis l'UI)
 * @param {string} clientContext - contexte entreprise à injecter (secteur, prestations…)
 * @param {object|null} user - ligne utilisateur (pour la config Dolibarr des agents outillés)
 * @returns {Promise<{agentId, agentName, content, routedBy}>}
 */
async function handle(message, history = [], forcedAgentId = null, clientContext = '', user = null) {
  const agentId = routeIntent(message, forcedAgentId);
  const agent = getAgent(agentId);

  // Construit l'historique pour l'API (rôles user/assistant uniquement)
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  // Le contexte de l'entreprise du client est ajouté au prompt système
  // pour personnaliser automatiquement la réponse de l'agent.
  const systemPrompt = clientContext
    ? `${agent.systemPrompt}\n${clientContext}`
    : agent.systemPrompt;

  let content = null;

  // Agent outillé → voie function calling, si son service requis est configuré.
  const entry = TOOL_AGENTS[agentId];
  if (entry && user) {
    // Contexte des services du client (résolus une fois, partagés par les tools).
    const ctx = {
      userId: user.id,
      dolibarr: doli.configFromUser(user),
    };
    const built = entry.build(ctx);
    if (built) {
      content = await askAgentWithTools(
        systemPrompt,
        messages,
        built.tools,
        built.execute,
        entry.opts
      );
    }
  }

  // Voie texte simple (agents non outillés, ou service requis non configuré).
  if (content == null) {
    content = await askAgent(systemPrompt, messages);
  }

  return {
    agentId: agent.id,
    agentName: agent.name,
    avatar: agent.avatar,
    content,
    // Indique si le Directeur a routé automatiquement (vs choix explicite)
    routedBy: forcedAgentId ? 'utilisateur' : 'directeur',
  };
}

module.exports = { routeIntent, handle };
