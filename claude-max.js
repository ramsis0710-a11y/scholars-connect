'use strict';
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const PDF_CACHE = {};

module.exports = function(app, mongoose) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) return console.warn('[claude-max] Désactivé (clé absente).');

  const MODEL_CANDIDATES = ['anthropic/claude-sonnet-4.6', 'openrouter/free'];

  function genPDF(md, user, q) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        
        doc.font('Helvetica-Bold').fontSize(20).fillColor('#0a2540').text('RAPPORT TECHNIQUE', { align: 'center' });
        doc.moveDown(1);
        doc.font('Helvetica').fontSize(10).fillColor('#333').text('Demandeur : ' + user);
        doc.text('Question : ' + q);
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
        doc.moveDown(1);
        
        md.split('\n').forEach(line => {
          line = line.trim();
          if (!line) return;
          if (line.startsWith('## ')) { doc.moveDown(0.5).font('Helvetica-Bold').fontSize(14).fillColor('#1e5aa8').text(line.replace('## ', '')); }
          else if (line.startsWith('### ')) { doc.moveDown(0.5).font('Helvetica-Bold').fontSize(12).fillColor('#0a2540').text(line.replace('### ', '')); }
          else { doc.font('Helvetica').fontSize(10).fillColor('#333').text(line, { align: 'justify' }); }
        });
        doc.end();
      } catch (e) { reject(e); }
    });
  }

  app.get('/api/claude-pdf/:token', (req, res) => {
    const d = PDF_CACHE[req.params.token];
    if (!d || d.exp < Date.now()) return res.status(404).send('Document PDF expiré ou introuvable.');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="rapport.pdf"');
    res.send(d.buffer);
  });

  const interceptor = (req, res, next) => {
    if (req.method !== 'POST' || !req.body) return next();
    const origJson = res.json.bind(res);
    
    res.json = async (data) => {
      if (!data || !data.answer || data.claudeMaxUsed) return origJson(data);
      
      const q = req.body.question || 'Analyse';
      const prompt = q + (req.body.content ? '\n\nDocument :\n' + req.body.content : '');
      
      for (const model of MODEL_CANDIDATES) {
        try {
          const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + openRouterKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
          });
          
          if (r.ok) {
            const j = await r.json();
            const md = j.choices[0].message.content;
            const pdfBuf = await genPDF(md, 'Utilisateur', q);
            const token = crypto.randomBytes(16).toString('hex');
            PDF_CACHE[token] = { buffer: pdfBuf, exp: Date.now() + 7200000 };
            
            // --- LE CODE HTML COMPLET AVEC LE BOUTON ET LE STYLE ---
            data.answer = `
              <div style="width: 100%; height: 800px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; margin-top: 15px; background: #525659;">
                <iframe src="/api/claude-pdf/${token}" width="100%" height="100%" style="border: none;"></iframe>
              </div>
              <div style="text-align: center; margin-top: 10px;">
                <a href="/api/claude-pdf/${token}" download="Rapport_Expertise.pdf" style="display: inline-block; background: #0a2540; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-family: Arial, sans-serif;">
                  ? Télécharger le Rapport PDF
                </a>
              </div>
            `;
            data.claudeMaxUsed = true;
            data.enriched = true;
            return origJson(data);
          }
        } catch (e) { }
      }
      return origJson(data);
    };
    next();
  };

  app.use('/api/ask', interceptor);
  app.use('/api/analyze-content', interceptor);
  console.log('[claude-max] Agent chargé avec générateur PDF complet.');
};


