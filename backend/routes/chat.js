/**
 * Routes de chat avec les agents (via l'orchestrateur Directeur).
 * Gère les conversations, l'historique et l'envoi de messages.
 */
const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../auth');
const pilot = require('../agents/pilot');
const { listAgents, getAgent } = require('../agents/registry');
const { buildClientContext } = require('../context');
const social = require('../social');
const dolibarrAgent = require('../integrations/dolibarrAgent');
const { notify } = require('../notify');

const router = express.Router();
router.use(authMiddleware);

/** Classe un agent en "type de document" pour la bibliothèque. */
function documentType(agentId) {
  const map = {
    deviseur: 'Devis', comptable: 'Comptabilité', creatif: 'Contenu',
    referenceur: 'Marketing', juriste: 'Document juridique', chasseur: 'Prospection',
    relance: 'Relance', assistance: 'Support', commercial: 'CRM',
  };
  return map[agentId] || 'Réponse agent';
}

/** GET /api/chat/agents — liste de tous les agents disponibles. */
router.get('/agents', (req, res) => {
  res.json({ agents: listAgents() });
});

/** GET /api/chat/conversations — conversations de l'utilisateur. */
router.get('/conversations', (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(req.user.id);
  res.json({ conversations: rows });
});

/** GET /api/chat/conversations/:id/messages — messages d'une conversation. */
router.get('/conversations/:id/messages', (req, res) => {
  const conv = db
    .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!conv) return res.status(404).json({ error: 'Conversation introuvable.' });

  const messages = db
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(conv.id);
  res.json({ conversation: conv, messages });
});

/**
 * POST /api/chat/message — envoie un message et reçoit la réponse de l'agent.
 * Corps : { message, conversationId?, agentId? }
 *  - conversationId : pour continuer une conversation existante
 *  - agentId : pour s'adresser directement à un agent (sinon le Directeur route)
 */
router.post('/message', async (req, res) => {
  const { message, conversationId, agentId } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Le message ne peut pas être vide.' });
  }

  // Récupère ou crée la conversation
  let conv;
  if (conversationId) {
    conv = db
      .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
      .get(conversationId, req.user.id);
    if (!conv) return res.status(404).json({ error: 'Conversation introuvable.' });
  } else {
    const startAgent = agentId && getAgent(agentId) ? agentId : 'directeur';
    const title = message.slice(0, 40);
    const info = db
      .prepare(
        'INSERT INTO conversations (user_id, agent_id, title) VALUES (?, ?, ?)'
      )
      .run(req.user.id, startAgent, title);
    conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(info.lastInsertRowid);
  }

  // Historique existant (limité aux 20 derniers messages)
  const history = db
    .prepare(
      `SELECT role, content FROM messages WHERE conversation_id = ?
       ORDER BY created_at ASC LIMIT 20`
    )
    .all(conv.id);

  // Enregistre le message utilisateur
  db.prepare(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
  ).run(conv.id, 'user', message);

  // Charge le profil complet de l'entreprise pour personnaliser la réponse
  const fullUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const clientContext = buildClientContext(fullUser);

  // Détection des commandes spéciales (le Directeur confie au bon agent)
  const doliCmd = dolibarrAgent.interpret(message);          // ERP Dolibarr
  const socialCmd = social.interpretCommand(message);        // réseaux sociaux
  const routeAgent = agentId || doliCmd?.agent || (socialCmd ? 'creatif' : null);

  // Le Directeur route et génère la réponse (avec contexte entreprise injecté)
  const result = await pilot.handle(message, history, routeAgent, clientContext);

  // Commande Dolibarr : exécution (création devis, impayées, EBP, CA, prospect…)
  if (doliCmd) {
    result.content += await dolibarrAgent.perform(fullUser, doliCmd.action, result.content);
  }

  // Si commande sociale : publication (réelle ou simulée) du contenu produit
  if (socialCmd) {
    const account = db.prepare('SELECT * FROM social_accounts WHERE user_id = ? AND provider = ?')
      .get(req.user.id, socialCmd.provider);
    if (account) {
      const pub = await social.publish(socialCmd.provider, account, result.content);
      const status = socialCmd.schedule ? 'programme' : 'publie';
      db.prepare(
        'INSERT INTO social_posts (user_id, provider, content, status, stats) VALUES (?, ?, ?, ?, ?)'
      ).run(req.user.id, socialCmd.provider, result.content, status, JSON.stringify(pub.stats));
      notify(req.user.id, `Post ${social.label(socialCmd.provider)} ${status === 'programme' ? 'programmé' : 'publié'} par le Créatif`, '📣');
      result.content += `\n\n---\n✅ _${status === 'programme' ? 'Programmé' : 'Publié'} sur ${social.label(socialCmd.provider)}${pub.simulated ? ' (mode simulation)' : ''}._`;
    } else {
      result.content += `\n\n---\n⚠️ _Connectez votre compte ${social.label(socialCmd.provider)} dans « Intégrations » pour publier._`;
    }
  }

  // Enregistre la réponse de l'agent
  db.prepare(
    'INSERT INTO messages (conversation_id, role, agent_id, content) VALUES (?, ?, ?, ?)'
  ).run(conv.id, 'assistant', result.agentId, result.content);

  // Journalise l'activité (pour Analyste / analytics)
  db.prepare(
    'INSERT INTO activity_logs (user_id, agent_id, action) VALUES (?, ?, ?)'
  ).run(req.user.id, result.agentId, 'message');

  // Auto-enregistrement dans la bibliothèque "Mes documents" (canal web)
  if (conv.channel !== 'whatsapp') {
    db.prepare(
      'INSERT INTO documents (user_id, type, agent_id, title, content) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, documentType(result.agentId), result.agentId, message.slice(0, 60), result.content);
  }

  res.json({ conversationId: conv.id, reply: result });
});

/** GET /api/chat/search?q= — recherche dans les conversations et messages. */
router.get('/search', (req, res) => {
  const q = `%${(req.query.q || '').trim()}%`;
  const rows = db.prepare(
    `SELECT DISTINCT c.* FROM conversations c
     LEFT JOIN messages m ON m.conversation_id = c.id
     WHERE c.user_id = ? AND (c.title LIKE ? OR m.content LIKE ?)
     ORDER BY c.created_at DESC LIMIT 50`
  ).all(req.user.id, q, q);
  res.json({ conversations: rows });
});

/** DELETE /api/chat/conversations/:id — supprime une conversation. */
router.delete('/conversations/:id', (req, res) => {
  const info = db
    .prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Conversation introuvable.' });
  res.json({ success: true });
});

module.exports = router;
