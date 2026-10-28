'use strict';
module.exports = function(app, mongoose) {
  console.log('[answer-enricher] Mode KB uniquement (sans appels IA)');

  // 1. Charger les bases de connaissances (API 14L, OEM, BCT)
  try { require('./api14l-kb')(app, mongoose); console.log('[api14l-kb] OK'); } catch (e) { console.warn('api14l', e.message); }
  try { require('./oem-chemical-injection-kb')(app, mongoose); console.log('[oem-kb] OK'); } catch (e) { console.warn('oem', e.message); }
  try { require('./bct-kb')(app, mongoose); console.log('[bct-kb] OK'); } catch (e) { console.warn('bct', e.message); }

  // 2. Intercepter les requêtes pour injecter le contexte de la base de données
  app.use(['/api/ask', '/api/analyze-content'], async function(req, res, next) {
    if (!req.body || !req.body.question) return next();
    
    try {
      const AutoFeedDoc = mongoose.model('AutoFeedDocument');
      const q = req.body.question;
      const tokens = q.toLowerCase().match(/\b\w{3,}\b/g) || [];
      
      const docs = await AutoFeedDoc.find({}).limit(500).lean();
      let bestDoc = null;
      let maxScore = 0;
      
      docs.forEach(d => {
        const content = (d.title + ' ' + d.content).toLowerCase();
        let score = 0;
        tokens.forEach(t => { if (content.includes(t)) score++; });
        if (score > maxScore) { maxScore = score; bestDoc = d; }
      });

      if (bestDoc && maxScore > 1) {
        req.body.question = `Utilise ces donnees officielles pour repondre :\n\n${bestDoc.content}\n\n---\n\nQuestion : ${req.body.question}`;
      }
    } catch (e) {}
    
    next();
  });

  // 3. Nettoyer le HTML pour l'affichage
  app.use(['/api/ask', '/api/analyze-content'], function(req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      if (!data || !data.answer) return originalJson(data);
      
      let cleanText = data.answer
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&');
        
      data.answerRaw = data.answer;
      data.answer = cleanText;
      data.enriched = true;
      
      return originalJson(data);
    };
    next();
  });
};
