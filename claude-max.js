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
        doc.font('Helvetica').fontSize(10).text('Question : ' + q);
        doc.moveDown(1);
        md.split('\n').forEach(line => { if(line.trim()) doc.text(line); });
        doc.end();
      } catch (e) { reject(e); }
    });
  }

  app.get('/api/claude-pdf/:token', (req, res) => {
    const d = PDF_CACHE[req.params.token];
    if (!d || d.exp < Date.now()) return res.status(404).send('Expiré');
    res.setHeader('Content-Type', 'application/pdf');
    res.send(d.buffer);
  });

  const interceptor = (req, res, next) => {
    if (req.method !== 'POST' || !req.body) return next();
    const origJson = res.json.bind(res);
    
    res.json = async (data) => {
      if (!data || !data.answer || data.claudeMaxUsed) return origJson(data);
      
      const q = req.body.question || 'Analyse';
      const prompt = q + (req.body.content ? '\n' + req.body.content : '');
      
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
            
            // LIEN TEXTE PROPRE POUR LE CHAT (evite le bug HTML)
            data.answer = `Le rapport technique a été généré avec succès.\n\n?? Cliquez sur ce lien pour ouvrir le PDF :\nhttps://scholars-connect-app.onrender.com/api/claude-pdf/${token}\n\n---\n\n${md}`;
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
