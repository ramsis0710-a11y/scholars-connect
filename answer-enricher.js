'use strict';

module.exports = function(app, mongoose) {
  console.log('[answer-enricher] Chargement des modules experts...');

  // 1. Modules de base de connaissances (API 14L, OEM, BCT)
  try { require('./api14l-kb')(app, mongoose); } catch (e) { console.warn('api14l', e.message); }
  try { require('./oem-chemical-injection-kb')(app, mongoose); } catch (e) { console.warn('oem', e.message); }
  try { require('./bct-kb')(app, mongoose); } catch (e) { console.warn('bct', e.message); }

  // 2. Modules IA
  try { require('./gemini-fallback')(app, mongoose); } catch (e) { console.warn('gemini', e.message); }
  try { require('./answer-guardian')(app, mongoose); } catch (e) { console.warn('guardian', e.message); }
  try { require('./chemical-injection-module')(app, mongoose); } catch (e) { console.warn('chemical', e.message); }

  // 3. LE MOTEUR DE RECHERCHE (RAG) DANS LA BASE DE DONNEES
  app.use('/api/ask', async function(req, res, next) {
    if (!req.body || !req.body.question) return next();
    
    try {
      const AutoFeedDoc = mongoose.model('AutoFeedDocument');
      const q = req.body.question;
      const tokens = q.toLowerCase().match(/\b\w{3,}\b/g) || [];
      
      // Chercher les documents dans la base (API 14L, etc.)
      const docs = await AutoFeedDoc.find({}).limit(500).lean();
      
      let bestDoc = null;
      let maxScore = 0;
      
      docs.forEach(d => {
        const content = (d.title + ' ' + d.content).toLowerCase();
        let score = 0;
        tokens.forEach(t => { if (content.includes(t)) score++; });
        if (score > maxScore) { maxScore = score; bestDoc = d; }
      });

      // Si on a trouvé un document pertinent, on l'injecte dans le prompt
      if (bestDoc && maxScore > 1) {
        console.log('[RAG] Document trouvé pour la question :', bestDoc.title);
        req.body.question = `Utilise OBLIGATOIREMENT ces données extraites de la base de connaissances pour répondre :\n\n${bestDoc.content}\n\n---\n\nQuestion : ${req.body.question}`;
      }
    } catch (e) { console.warn('[RAG] Erreur:', e.message); }
    
    next();
  });

  // 4. NETTOYAGE DU HTML POUR L'AFFICHAGE
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

  console.log('[answer-enricher] Chargé. Moteur RAG et affichage propres activés.');
};
