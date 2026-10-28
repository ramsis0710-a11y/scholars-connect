'use strict';

module.exports = function(app, mongoose) {
  console.log('[answer-enricher] Mode texte propre avec RAG.');

  // 1. Bases de connaissances
  try { require('./api14l-kb')(app, mongoose); } catch (e) {}
  try { require('./oem-chemical-injection-kb')(app, mongoose); } catch (e) {}
  try { require('./bct-kb')(app, mongoose); } catch (e) {}

  // 2. Gemini en secours UNIQUEMENT (pas de PDF, pas de HTML)
  try { require('./gemini-fallback')(app, mongoose); } catch (e) {}

  // 3. Injection RAG : on cherche le document pertinent dans la base
  app.use(['/api/ask', '/api/analyze-content'], async function(req, res, next) {
    if (!req.body || !req.body.question) return next();
    
    try {
      const AutoFeedDoc = mongoose.model('AutoFeedDocument');
      const q = req.body.question;
      const tokens = q.toLowerCase().match(/\b\w{3,}\b/g) || [];
      
      const docs = await AutoFeedDoc.find({}).limit(500).lean();
      let bestDoc = null, maxScore = 0;
      
      docs.forEach(d => {
        const content = (d.title + ' ' + d.content).toLowerCase();
        let score = 0;
        tokens.forEach(t => { if (content.includes(t)) score++; });
        if (score > maxScore) { maxScore = score; bestDoc = d; }
      });

      if (bestDoc && maxScore > 1) {
        console.log('[RAG] Document trouve :', bestDoc.title);
        req.body.question = `REPONDS UNIQUEMENT avec ces donnees techniques :\n\n${bestDoc.content}\n\nQuestion : ${q}`;
      }
    } catch (e) {
      // Si le modele n'existe pas encore, on ignore
    }
    
    next();
  });

  // 4. Nettoyage : si par erreur du HTML arrive, on le transforme en texte
  app.use(['/api/ask', '/api/analyze-content'], function(req, res, next) {
    const orig = res.json.bind(res);
    res.json = function(data) {
      if (!data || !data.answer) return orig(data);
      // Si la réponse contient des balises HTML, on nettoie
      if (/<[a-z][\s\S]*>/i.test(data.answer)) {
        data.answer = data.answer
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim();
      }
      return orig(data);
    };
    next();
  });
};
