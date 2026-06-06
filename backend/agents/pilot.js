/**
 * Pilot — l'agent orchestrateur central.
 *
 * Pour chaque demande utilisateur, Pilot :
 *   1. analyse l'intention (détection par mots-clés, extensible à l'IA),
 *   2. choisit l'agent spécialisé le plus pertinent,
 *   3. fait répondre cet agent,
 *   4. restitue la réponse en indiquant quel agent a traité la demande.
 */
const { AGENTS, getAgent } = require('./registry');
const { askAgent } = require('../anthropic');

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
  let best = { id: 'pilot', score: 0 };

  for (const agent of Object.values(AGENTS)) {
    if (agent.id === 'pilot') continue;
    let score = 0;
    for (const kw of agent.keywords) {
      // Correspondance par limites de mots (évite que « prospect » matche
      // « prospection »). Les lettres accentuées sont considérées comme
      // faisant partie d'un mot.
      if (matchesWord(text, kw)) score += 1;
    }
    // Mention explicite du prénom de l'agent : fort bonus
    if (matchesWord(text, agent.name.toLowerCase())) score += 2;
    if (score > best.score) best = { id: agent.id, score };
  }

  // Aucun mot-clé reconnu : Pilot répond lui-même et oriente
  return best.score > 0 ? best.id : 'pilot';
}

/**
 * Traite une demande utilisateur de bout en bout.
 * @param {string} message - dernier message de l'utilisateur
 * @param {Array} history - historique [{role, content}]
 * @param {string|null} forcedAgentId - agent imposé (depuis l'UI)
 * @param {string} clientContext - contexte entreprise à injecter (secteur, prestations…)
 * @returns {Promise<{agentId, agentName, content, routedBy}>}
 */
async function handle(message, history = [], forcedAgentId = null, clientContext = '') {
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

  const content = await askAgent(systemPrompt, messages);

  return {
    agentId: agent.id,
    agentName: agent.name,
    avatar: agent.avatar,
    content,
    // Indique si Pilot a routé automatiquement (vs choix explicite)
    routedBy: forcedAgentId ? 'utilisateur' : 'pilot',
  };
}

module.exports = { routeIntent, handle };
