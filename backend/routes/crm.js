/**
 * Routes CRM — gestion des contacts (domaine de l'agent Commercial).
 */
const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

/** GET /api/crm/contacts — liste des contacts de l'utilisateur. */
router.get('/contacts', (req, res) => {
  const contacts = db
    .prepare('SELECT * FROM contacts WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ contacts });
});

/** POST /api/crm/contacts — crée un contact. */
router.post('/contacts', (req, res) => {
  const { name, email, phone, company, status, notes } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Le nom est requis.' });

  const info = db
    .prepare(
      `INSERT INTO contacts (user_id, name, email, phone, company, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.id, name, email || null, phone || null, company || null,
      status || 'prospect', notes || null);

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ contact });
});

/** PATCH /api/crm/contacts/:id — met à jour un contact. */
router.patch('/contacts/:id', (req, res) => {
  const contact = db
    .prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!contact) return res.status(404).json({ error: 'Contact introuvable.' });

  const { name, email, phone, company, status, notes } = req.body || {};
  db.prepare(
    `UPDATE contacts SET name=?, email=?, phone=?, company=?, status=?, notes=? WHERE id=?`
  ).run(
    name ?? contact.name,
    email ?? contact.email,
    phone ?? contact.phone,
    company ?? contact.company,
    status ?? contact.status,
    notes ?? contact.notes,
    contact.id
  );

  const updated = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contact.id);
  res.json({ contact: updated });
});

/** DELETE /api/crm/contacts/:id — supprime un contact. */
router.delete('/contacts/:id', (req, res) => {
  const info = db
    .prepare('DELETE FROM contacts WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Contact introuvable.' });
  res.json({ success: true });
});

module.exports = router;
