// ============================================================
// PDF-REPORT-GENERATOR.JS
// Module autonome - ne modifie AUCUNE ligne existante.
// Génère un PDF pour chaque réponse avec en-tête :
//   - Nom et email de l'utilisateur (extraits du JWT)
//   - Date et heure de sa visite
//   - Sujet de la demande
//   - Réponse complète
// ============================================================
'use strict';
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const PDF_CACHE = {};

module.exports = function(app, mongoose) {
  console.log('[pdf-report] Module PDF autonome chargé.');

  // ============================================================
  // ROUTE : SERVIR LE PDF
  // ============================================================
  app.get('/api/pdf-report/:token', function(req, res) {
    const data = PDF_CACHE[req.params.token];
    if (!data || data.exp < Date.now()) {
      return res.status(404).send('Rapport expiré ou introuvable.');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="rapport_expertise.pdf"');
    res.send(data.buffer);
  });

  // ============================================================
  // EXTRACTION DE L'UTILISATEUR (JWT)
  // ============================================================
  function getUserFromToken(req) {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim();
      if (!token) return { name: 'Invité', email: 'inconnu@localhost' };
      const parts = token.split('.');
      if (parts.length !== 3) return { name: 'Invité', email: 'inconnu@localhost' };
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      return {
        name: payload.name || 'Utilisateur',
        email: payload.email || 'inconnu@localhost'
      };
    } catch (e) {
      return { name: 'Invité', email: 'inconnu@localhost' };
    }
  }

  // ============================================================
  // NETTOYAGE DU TEXTE (retire HTML, liens claude-max, etc.)
  // ============================================================
  function extractPureText(answer) {
    if (!answer) return '';
    let text = String(answer);
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<\/h[1-6]>/gi, '\n\n');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    // Retire l'ancien message "Le rapport technique..." de claude-max
    text = text.replace(/Le rapport technique a été généré avec succès\.[\s\S]*?---\s*/i, '');
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
  }

  // ============================================================
  // GENERATION DU PDF
  // ============================================================
  function generatePDF(question, answer, user, dateHeure) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // EN-TETE
        doc.font('Helvetica-Bold').fontSize(20).fillColor('#0a2540')
           .text('RAPPORT TECHNIQUE D\'EXPERTISE', { align: 'center' });
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(9).fillColor('#666666')
           .text(`Demandeur : ${user.name}`, { align: 'right' });
        doc.text(`Email : ${user.email}`, { align: 'right' });
        doc.text(`Date de visite : ${dateHeure}`, { align: 'right' });
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
        doc.moveDown(1);

        // SUJET
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#333333')
           .text('Sujet de la demande :');
        doc.font('Helvetica-Oblique').fontSize(10).fillColor('#555555')
           .text(question || '(non spécifié)');
        doc.moveDown(1.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
        doc.moveDown(1);

        // CORPS
        const lines = extractPureText(answer).split('\n');
        for (let line of lines) {
          line = line.trim();
          if (line === '') { doc.moveDown(0.5); continue; }
          if (line.startsWith('## ')) {
            doc.moveDown(0.5).font('Helvetica-Bold').fontSize(14).fillColor('#1e5aa8')
               .text(line.replace('## ', ''));
          } else if (line.startsWith('### ')) {
            doc.moveDown(0.5).font('Helvetica-Bold').fontSize(12).fillColor('#0a2540')
               .text(line.replace('### ', ''));
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            doc.font('Helvetica').fontSize(10).fillColor('#333333')
               .text('• ' + line.substring(2), { indent: 15 });
          } else {
            doc.font('Helvetica').fontSize(10).fillColor('#333333')
               .text(line, { align: 'justify' });
          }
        }

        // PIED DE PAGE
        const pages = doc.bufferedPageRange();
        for (let i = pages.start; i < pages.start + pages.count; i++) {
          doc.switchToPage(i);
          doc.font('Helvetica').fontSize(8).fillColor('#999999')
             .text(
               `Document confidentiel - MBA-CONSULT AI CORE - Page ${i - pages.start + 1} / ${pages.count}`,
               50, doc.page.height - 40, { align: 'center' }
             );
        }
        doc.end();
      } catch (e) { reject(e); }
    });
  }

  // ============================================================
  // MIDDLEWARE D'INTERCEPTION
  // ============================================================
  app.use(['/api/ask', '/api/analyze-content'], function(req, res, next) {
    if (req.method !== 'POST' || !req.body) return next();
    
    const originalJson = res.json.bind(res);
    let processed = false;

    res.json = async function(data) {
      if (processed) return originalJson(data);
      
      // Ne pas toucher aux réponses QP (déjà en HTML structuré)
      if (data && data.qpStandard01) return originalJson(data);
      
      const answer = (data && (data.answer || data.answerRaw)) || '';
      if (!answer || typeof answer !== 'string') return originalJson(data);

      try {
        processed = true;
        
        const question = req.body.question || '(non spécifié)';
        const user = getUserFromToken(req);
        const dateHeure = new Date().toLocaleString('fr-FR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        
        const pdfBuffer = await generatePDF(question, answer, user, dateHeure);
        const token = crypto.randomBytes(16).toString('hex');
        PDF_CACHE[token] = { buffer: pdfBuffer, exp: Date.now() + 2 * 60 * 60 * 1000 };
        
        console.log(`[pdf-report] PDF généré pour ${user.email} (${pdfBuffer.length} octets)`);
        
        // Remplace la réponse par un lien texte propre
        data.answer = `?? Le rapport d'expertise a été généré pour ${user.name} (${user.email}) le ${dateHeure}.\n\n?? Cliquez sur ce lien pour ouvrir et télécharger le PDF :\nhttps://scholars-connect-app.onrender.com/api/pdf-report/${token}\n\n_(Le PDF contient la réponse complète à votre question.)_`;
        data.answerRaw = answer;
        data.pdfReport = true;
        data.enriched = true;
        
        return originalJson(data);
      } catch (e) {
        console.error('[pdf-report] Erreur génération PDF :', e.message);
        return originalJson(data);
      }
    };
    next();
  });
};
