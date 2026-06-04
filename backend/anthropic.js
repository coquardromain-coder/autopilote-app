/**
 * Client de connexion à l'API Anthropic (Claude).
 *
 * Si aucune clé ANTHROPIC_API_KEY n'est configurée, le module bascule
 * automatiquement en "mode démonstration" : il renvoie des réponses
 * simulées cohérentes afin que l'application reste 100% fonctionnelle
 * en local, sans dépendance externe obligatoire.
 */
const Anthropic = require('@anthropic-ai/sdk');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

// Instancie le client uniquement si une clé est présente
const client = API_KEY ? new Anthropic({ apiKey: API_KEY }) : null;

/** Indique si l'API réelle est disponible. */
function isLive() {
  return Boolean(client);
}

/**
 * Envoie une requête à un agent IA.
 * @param {string} systemPrompt - Personnalité / rôle de l'agent.
 * @param {Array<{role:string, content:string}>} messages - Historique.
 * @returns {Promise<string>} La réponse textuelle de l'agent.
 */
async function askAgent(systemPrompt, messages) {
  // Mode démonstration (aucune clé API)
  if (!client) {
    return demoResponse(systemPrompt, messages);
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    // Concatène les blocs de texte renvoyés
    return response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  } catch (err) {
    console.error('[Anthropic] Erreur API :', err.message);
    return `Je rencontre une difficulté technique pour répondre (${err.message}). ` +
      `Réessayez dans un instant.`;
  }
}

/**
 * Génère une réponse simulée plausible en l'absence de clé API.
 * Permet de démontrer l'orchestration et l'interface sans coût.
 */
function demoResponse(systemPrompt, messages) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const question = lastUser ? lastUser.content : '';
  // Extrait le prénom de l'agent depuis le prompt système (1ère ligne)
  const firstLine = systemPrompt.split('\n')[0] || 'Agent';
  return (
    `[Mode démonstration — sans clé API Anthropic]\n\n` +
    `Bonjour, ici votre agent. J'ai bien reçu votre demande : ` +
    `« ${question.slice(0, 140)}${question.length > 140 ? '…' : ''} ».\n\n` +
    `En mode réel, je traiterais cette requête avec le modèle ${MODEL}. ` +
    `Pour activer mes pleines capacités, renseignez ANTHROPIC_API_KEY dans le fichier .env du backend.`
  );
}

module.exports = { askAgent, isLive, MODEL };
