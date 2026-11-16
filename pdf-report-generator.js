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
    if (!data || data.exp < Date.now()) return res.status(404).send('Expiré');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="rapport_expertise.pdf"');
    res.send(data.buffer);
  });

  // Nouvelle route pour générer le PDF à la volée
  app.post('/api/pdf-report/generate', async function(req, res) {
    try {
      const { question, answer } = req.body;
      if (!answer) return res.status(400).json({ error: "Réponse vide" });
      
      const user = { name: 'Utilisateur', email: 'client@mba-consult.tn' };
      const dateHeure = new Date().toLocaleString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      
      const pdfBuffer = await generatePDF(question, answer, user, dateHeure);
      const token = crypto.randomBytes(16).toString('hex');
      PDF_CACHE[token] = { buffer: pdfBuffer, exp: Date.now() + 2 * 60 * 60 * 1000 };
      
      res.json({ pdfUrl: `https://scholars-connect-app.onrender.com/api/pdf-report/${token}` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  function extractPureText(answer) {
    if (!answer) return '';
    let text = String(answer);
    text = text.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<\/div>/gi, '\n').replace(/<\/h[1-6]>/gi, '\n\n');
    text = text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
    return text.trim();
  }

  function generatePDF(question, answer, user, dateHeure) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        const isArabic = /[\u0600-\u06FF]/.test(question + answer);

        // PAGE DE GARDE
        doc.rect(0, 0, doc.page.width, 150).fill('#0a2540');
        doc.font('Helvetica-Bold').fontSize(28).fillColor('#ffffff').text('RAPPORT D\'EXPERTISE', 50, 60, { align: 'center' });
        doc.font('Helvetica').fontSize(14).fillColor('#F5B800').text('MBA-CONSULT AI CORE', 50, 100, { align: 'center' });

        const boxY = 250;
        doc.roundedRect(50, boxY, doc.page.width - 100, 180, 10).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#1e5aa8').text('INFORMATIONS DE LA SESSION', 70, boxY + 20);
        
        doc.font('Helvetica').fontSize(12).fillColor('#333333');
        doc.text(`Utilisateur : `, 70, boxY + 60, { continued: true }).font('Helvetica-Bold').text(user.name);
        doc.font('Helvetica').text(`Email : `, 70, boxY + 85, { continued: true }).font('Helvetica-Bold').text(user.email);
        doc.font('Helvetica').text(`Date : `, 70, boxY + 110, { continued: true }).font('Helvetica-Bold').text(dateHeure);
        
        doc.font('Helvetica').fontSize(10).fillColor('#94a3b8').text('Document confidentiel généré par Scholars Connect', 50, 750, { align: 'center' });

        // CONTENU
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#0a2540').text('Détail de l\'échange', 50, 50);
        doc.moveTo(50, 80).lineTo(doc.page.width - 50, 80).strokeColor('#1e5aa8').lineWidth(2).stroke();
        doc.moveDown(1.5);

        doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e5aa8').text('SUJET DE LA DEMANDE');
        doc.moveDown(0.5);

        const qText = extractPureText(question) || '(non spécifié)';
        const qOptions = { width: doc.page.width - 100, align: isArabic ? 'right' : 'left' };
        if (isArabic) doc.font('Helvetica'); else doc.font('Helvetica-Oblique');
        
        doc.fontSize(11).fillColor('#333333');
        const qHeight = doc.heightOfString(qText, qOptions);
        doc.roundedRect(50, doc.y, doc.page.width - 100, qHeight + 20, 6).fill('#e0f2fe');
        doc.fillColor('#0c4a6e').text(qText, 60, doc.y + 10, qOptions);
        
        doc.moveDown(2);
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e5aa8').text('RÉPONSE DE L\'EXPERT');
        doc.moveDown(0.5);

        const lines = extractPureText(answer).split('\n');
        doc.font('Helvetica').fontSize(11).fillColor('#1e293b');

        for (let line of lines) {
          line = line.trim();
          if (line === '') { doc.moveDown(0.5); continue; }

          if (line.startsWith('### ')) {
            doc.moveDown(1).font('Helvetica-Bold').fontSize(13).fillColor('#0a2540').text(line.replace('### ', ''), { align: isArabic ? 'right' : 'left' });
            doc.moveDown(0.3);
          } else if (line.startsWith('## ')) {
            doc.moveDown(1).font('Helvetica-Bold').fontSize(15).fillColor('#1e5aa8').text(line.replace('## ', ''), { align: isArabic ? 'right' : 'left' });
            doc.moveDown(0.5);
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            doc.font('Helvetica').fontSize(11).fillColor('#333333').text('• ' + line.substring(2), { indent: 15, align: isArabic ? 'right' : 'left' });
          } else {
            doc.font('Helvetica').fontSize(11).fillColor('#334155').text(line, { align: isArabic ? 'right' : 'left', lineGap: 4 });
          }
        }

        const pages = doc.bufferedPageRange();
        for (let i = pages.start; i < pages.start + pages.count; i++) {
          doc.switchToPage(i);
          if (i === 0) continue;
          doc.font('Helvetica').fontSize(9).fillColor('#94a3b8').text(`Scholars Connect - MBA-CONSULT | Page ${i} / ${pages.count - 1}`, 50, doc.page.height - 40, { align: 'center', width: doc.page.width - 100 });
        }

        doc.end();
      } catch (e) { reject(e); }
    });
  }
};