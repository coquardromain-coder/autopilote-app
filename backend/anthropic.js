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
 * Envoie une requête à un agent IA EN LUI DONNANT DES OUTILS (function calling).
 *
 * Boucle de tool use : tant que Claude demande un outil (stop_reason === 'tool_use'),
 * on exécute l'outil via `executor`, on renvoie le résultat, et on recommence —
 * jusqu'à ce que Claude produise une réponse finale ou que la limite de tours
 * soit atteinte.
 *
 * `askAgent` (ci-dessus) reste l'appel texte simple : cette fonction est une
 * voie séparée, activée seulement pour les agents outillés (ex. Deviseur).
 *
 * @param {string} systemPrompt
 * @param {Array<{role:string, content:any}>} messages - historique initial
 * @param {Array<object>} tools - définitions d'outils (JSON Schema Anthropic)
 * @param {(name:string, input:object)=>Promise<any>} executor - exécute un outil
 * @param {{maxTurns?:number, maxTokens?:number}} [options]
 * @returns {Promise<string>} réponse textuelle finale de l'agent
 */
async function askAgentWithTools(systemPrompt, messages, tools, executor, options = {}) {
  // Mode démonstration (aucune clé API) : pas d'outils, on retombe sur le texte.
  if (!client) {
    return demoResponse(systemPrompt, messages);
  }

  const maxTurns = options.maxTurns || 10;
  const maxTokens = options.maxTokens || 2048;
  // Copie de travail de la conversation (on y empile les tours assistant/outils).
  const convo = messages.map((m) => ({ role: m.role, content: m.content }));
  let finalText = '';

  try {
    for (let turn = 0; turn < maxTurns; turn++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        tools,
        messages: convo,
      });

      // Mémorise le texte produit à ce tour (réponse finale potentielle).
      const textPart = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      if (textPart) finalText = textPart;

      const toolUses = response.content.filter((b) => b.type === 'tool_use');

      // Plus d'outil demandé → réponse finale.
      if (response.stop_reason !== 'tool_use' || toolUses.length === 0) {
        return finalText;
      }

      // Empile le tour de l'assistant (texte + demandes d'outils) tel quel.
      convo.push({ role: 'assistant', content: response.content });

      // Exécute chaque outil demandé et prépare les résultats.
      const toolResults = [];
      for (const tu of toolUses) {
        let result;
        try {
          result = await executor(tu.name, tu.input || {});
        } catch (err) {
          result = { error: err.message };
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        });
      }
      convo.push({ role: 'user', content: toolResults });
    }

    // Limite de tours atteinte : renvoie le dernier texte connu (ou un message).
    return (
      finalText ||
      "Je n'ai pas pu finaliser l'opération dans le nombre d'étapes autorisé. " +
        'Précisez votre demande et je reprends.'
    );
  } catch (err) {
    console.error('[Anthropic] Erreur API (tools) :', err.message);
    return (
      finalText ||
      `Je rencontre une difficulté technique pour réaliser cette action (${err.message}). ` +
        `Réessayez dans un instant.`
    );
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

module.exports = { askAgent, askAgentWithTools, isLive, MODEL };
