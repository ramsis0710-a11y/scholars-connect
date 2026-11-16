// ============================================================
// PDF-REPORT-GENERATOR.JS (Version 3.0 - Design Pro)
// ============================================================
'use strict';
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const PDF_CACHE = {};

module.exports = function(app, mongoose) {
  console.log('[pdf-report] Module PDF autonome chargé (v3.0).');

  app.get('/api/pdf-report/:token', function(req, res) {
    const data = PDF_CACHE[req.params.token];
    if (!data || data.exp < Date.now()) {
      return res.status(404).send('Rapport expiré ou introuvable.');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="rapport_expertise.pdf"');
    res.send(data.buffer);
  });

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

  // Nettoyage du texte pour retirer le HTML
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
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
  }

  // Génération du PDF
  function generatePDF(question, answer, user, dateHeure) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        const isArabic = /[\u0600-\u06FF]/.test(question + answer);

        // --- PAGE DE GARDE (Design) ---
        // Fond blanc par défaut, on ajoute une touche de bleu en haut
        doc.rect(0, 0, doc.page.width, 150).fill('#0a2540');
        doc.font('Helvetica-Bold').fontSize(28).fillColor('#ffffff')
           .text('RAPPORT D\'EXPERTISE', 50, 60, { align: 'center' });
        doc.font('Helvetica').fontSize(14).fillColor('#F5B800')
           .text('MBA-CONSULT AI CORE', 50, 100, { align: 'center' });

        // Bloc d'informations utilisateur
        const boxY = 250;
        doc.roundedRect(50, boxY, doc.page.width - 100, 180, 10).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#1e5aa8')
           .text('INFORMATIONS DE LA SESSION', 70, boxY + 20);
        
        doc.font('Helvetica').fontSize(12).fillColor('#333333');
        doc.text(`Utilisateur : `, 70, boxY + 60, { continued: true }).font('Helvetica-Bold').text(user.name);
        doc.font('Helvetica').text(`Email : `, 70, boxY + 85, { continued: true }).font('Helvetica-Bold').text(user.email);
        doc.font('Helvetica').text(`Date de la demande : `, 70, boxY + 110, { continued: true }).font('Helvetica-Bold').text(dateHeure);
        
        doc.font('Helvetica').fontSize(10).fillColor('#94a3b8')
           .text('Document confidentiel généré par Scholars Connect', 50, 750, { align: 'center' });

        // --- PAGE 2 : CONTENU ---
        doc.addPage();
        
        // En-tête de page
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#0a2540').text('Détail de l\'échange', 50, 50);
        doc.moveTo(50, 80).lineTo(doc.page.width - 50, 80).strokeColor('#1e5aa8').lineWidth(2).stroke();
        doc.moveDown(1.5);

        // Boîte Question
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e5aa8').text('SUJET DE LA DEMANDE');
        doc.moveDown(0.5);

        const qText = extractPureText(question) || '(non spécifié)';
        const qOptions = { width: doc.page.width - 100, align: isArabic ? 'right' : 'left' };
        if (isArabic) doc.font('Helvetica'); else doc.font('Helvetica-Oblique'); // Helvetica est plus sûr sur Render
        
        doc.fontSize(11).fillColor('#333333');
        const qHeight = doc.heightOfString(qText, qOptions);
        doc.roundedRect(50, doc.y, doc.page.width - 100, qHeight + 20, 6).fill('#e0f2fe');
        doc.fillColor('#0c4a6e').text(qText, 60, doc.y + 10, qOptions);
        
        doc.moveDown(2);

        // Titre Réponse
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e5aa8').text('RÉPONSE DE L\'EXPERT');
        doc.moveDown(0.5);

        // Corps de la réponse (Texte aéré)
        const lines = extractPureText(answer).split('\n');
        doc.font('Helvetica').fontSize(11).fillColor('#1e293b');

        for (let line of lines) {
          line = line.trim();
          if (line === '') { doc.moveDown(0.5); continue; }

          if (line.startsWith('### ')) {
            doc.moveDown(1).font('Helvetica-Bold').fontSize(13).fillColor('#0a2540')
               .text(line.replace('### ', ''), { align: isArabic ? 'right' : 'left' });
            doc.moveDown(0.3);
          } else if (line.startsWith('## ')) {
            doc.moveDown(1).font('Helvetica-Bold').fontSize(15).fillColor('#1e5aa8')
               .text(line.replace('## ', ''), { align: isArabic ? 'right' : 'left' });
            doc.moveDown(0.5);
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            doc.font('Helvetica').fontSize(11).fillColor('#333333')
               .text('• ' + line.substring(2), { indent: 15, align: isArabic ? 'right' : 'left' });
          } else {
            doc.font('Helvetica').fontSize(11).fillColor('#334155')
               .text(line, { align: isArabic ? 'right' : 'left', lineGap: 4 }); // lineGap aère les paragraphes
          }
        }

        // Pied de page
        const pages = doc.bufferedPageRange();
        for (let i = pages.start; i < pages.start + pages.count; i++) {
          doc.switchToPage(i);
          if (i === 0) continue;
          doc.font('Helvetica').fontSize(9).fillColor('#94a3b8')
             .text(`Scholars Connect - MBA-CONSULT | Page ${i} / ${pages.count - 1}`, 50, doc.page.height - 40, { align: 'center', width: doc.page.width - 100 });
        }

        doc.end();
      } catch (e) { reject(e); }
    });
  }

  // Interception
  app.use(['/api/ask', '/api/analyze-content'], function(req, res, next) {
    if (req.method !== 'POST' || !req.body) return next();
    
    const originalJson = res.json.bind(res);
    let processed = false;

    res.json = async function(data) {
      if (processed) return originalJson(data);
      if (data && data.qpStandard01) return originalJson(data);
      
      const answer = (data && (data.answer || data.answerRaw)) || '';
      if (!answer || typeof answer !== 'string') return originalJson(data);

      try {
        processed = true;
        const question = req.body.question || '(non spécifié)';
        const user = getUserFromToken(req);
        const dateHeure = new Date().toLocaleString('fr-FR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
        
        const pdfBuffer = await generatePDF(question, answer, user, dateHeure);
        const token = crypto.randomBytes(16).toString('hex');
        PDF_CACHE[token] = { buffer: pdfBuffer, exp: Date.now() + 2 * 60 * 60 * 1000 };
        
        console.log(`[pdf-report] PDF design généré pour ${user.email}`);
        
        // Ajout du lien pour le client
        data.pdfUrl = `https://scholars-connect-app.onrender.com/api/pdf-report/${token}`;
        data.pdfReport = true;
        
        return originalJson(data);
      } catch (e) {
        console.error('[pdf-report] Erreur :', e.message);
        return originalJson(data);
      }
    };
    next();
  });
};