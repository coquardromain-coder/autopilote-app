/**
 * Planificateur léger : génère et envoie l'export EBP du mois précédent
 * le 1er de chaque mois à 8h, pour chaque client ayant configuré Dolibarr
 * et une adresse "email export mensuel".
 *
 * Implémentation sans dépendance : vérification horaire avec garde anti-doublon.
 */
const { db } = require('./db');
const doli = require('./integrations/dolibarr');
const google = require('./google');
const { notify } = require('./notify');

let lastRunMonth = null; // garde anti-doublon (mois déjà traité)

/** Renvoie le mois précédent au format YYYY-MM à partir d'une date. */
function previousMonth(now) {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-11
  const prev = new Date(y, m - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

/** Exécute l'export EBP mensuel pour tous les comptes éligibles. */
async function runMonthlyExports(month) {
  const users = db.prepare(
    "SELECT * FROM users WHERE dolibarr_url IS NOT NULL AND compta_email IS NOT NULL AND compta_email <> ''"
  ).all();
  for (const u of users) {
    try {
      const config = doli.configFromUser(u);
      const exp = await doli.exportEBP(config, `${month}-01`, `${month}-31`);
      db.prepare('INSERT INTO documents (user_id, type, agent_id, title, content) VALUES (?, ?, ?, ?, ?)')
        .run(u.id, 'Export comptable', 'comptable', exp.filename, '```\n' + exp.csv + '\n```');
      if (google.getAccount(u.id)) {
        await google.sendGmail(u.id, {
          to: u.compta_email,
          subject: `Export EBP ${month} — AutoPilote`,
          body: `Bonjour,\n\nVoici l'export comptable EBP automatique du mois ${month}.\n\n${exp.csv}\n\n— AutoPilote (Comptable)`,
        }).catch(() => {});
      }
      notify(u.id, `Export EBP automatique de ${month} généré ✓`, '📊');
    } catch (err) {
      console.error('[Scheduler EBP]', u.email, err.message);
    }
  }
}

/** Démarre la vérification horaire. */
function start() {
  const check = async () => {
    const now = new Date();
    const month = previousMonth(now);
    // 1er du mois, 8h → on lance une seule fois pour ce mois
    if (now.getDate() === 1 && now.getHours() === 8 && lastRunMonth !== month) {
      lastRunMonth = month;
      console.log(`[Scheduler] Export EBP mensuel pour ${month}`);
      await runMonthlyExports(month);
    }
  };
  // Vérifie toutes les heures
  setInterval(check, 60 * 60 * 1000);
  console.log('[Scheduler] Export EBP mensuel planifié (1er du mois à 8h).');
}

module.exports = { start, runMonthlyExports };
