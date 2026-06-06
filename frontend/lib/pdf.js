/**
 * Export PDF léger sans dépendance : ouvre une fenêtre imprimable
 * stylée et déclenche l'impression (l'utilisateur choisit « Enregistrer en PDF »).
 */
export function exportToPdf(title, markdown) {
  const win = window.open('', '_blank');
  if (!win) return;
  // Conversion markdown très simple en HTML (titres, gras, listes, sauts).
  const html = markdown
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\s*[-*] (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');
  win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
    <title>${title}</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; color:#111; max-width:800px; margin:40px auto; padding:0 24px; line-height:1.6; }
      h1{font-size:24px} h2{font-size:19px} h3{font-size:16px}
      table{border-collapse:collapse;width:100%} td,th{border:1px solid #ccc;padding:6px}
      .footer{margin-top:40px;color:#888;font-size:12px;border-top:1px solid #eee;padding-top:12px}
    </style></head><body>
    <p>${html}</p>
    <div class="footer">Document généré par AutoPilote — ${new Date().toLocaleDateString('fr-FR')}</div>
    <script>window.onload=()=>{window.print();}<\/script>
    </body></html>`);
  win.document.close();
}
