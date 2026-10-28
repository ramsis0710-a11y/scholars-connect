'use strict';
module.exports = function(app, mongoose) {
  console.log('[answer-enricher] Mode RAG ameliore.');

  // 1. Charger les bases de connaissances
  try { require('./api14l-kb')(app, mongoose); } catch (e) { console.warn('api14l', e.message); }
  try { require('./oem-chemical-injection-kb')(app, mongoose); } catch (e) { console.warn('oem', e.message); }
  try { require('./bct-kb')(app, mongoose); } catch (e) { console.warn('bct', e.message); }

  // 2. RAG AMELIORE : Score basé sur le titre + filtrage strict
  app.use(['/api/ask', '/api/analyze-content'], async function(req, res, next) {
    if (!req.body || !req.body.question) return next();
    
    try {
      const AutoFeedDoc = mongoose.model('AutoFeedDocument');
      const q = req.body.question.toLowerCase();
      
      // Mots-clés techniques de la question
      const qKeywords = q.match(/\b\w{3,}\b/g) || [];
      
      const docs = await AutoFeedDoc.find({}).limit(500).lean();
      let bestDoc = null;
      let maxScore = 0;
      
      docs.forEach(d => {
        const title = (d.title || '').toLowerCase();
        const content = (d.content || '').toLowerCase();
        let score = 0;
        
        // PRIORITE 1 : Si un mot-clé de la question est dans le TITRE (+10 points)
        qKeywords.forEach(kw => { if (title.includes(kw)) score += 10; });
        
        // PRIORITE 2 : Si le titre contient "API 14L" spécifiquement (+20 points)
        if (q.includes('14l') && title.includes('14l')) score += 20;
        
        // PRIORITE 3 : Contenu (max +2 par mot-clé)
        qKeywords.forEach(kw => { if (content.includes(kw)) score += 1; });
        
        // PENALITE : Si le titre contient VAM TOP mais pas la question, on pénalise
        if (title.includes('vam') && !q.includes('vam') && !q.includes('top')) score -= 15;
        
        if (score > maxScore) { maxScore = score; bestDoc = d; }
      });

      console.log('[RAG] Meilleur document : ' + (bestDoc ? bestDoc.title : 'aucun') + ' (score=' + maxScore + ')');
      
      // On injecte si le score est positif
      if (bestDoc && maxScore > 0) {
        // On force l'IA à utiliser ces données avec le format [EXTRAITS]
        req.body.question = `Question originale : ${req.body.question}\n\n[EXTRAITS]\nTitre : ${bestDoc.title}\nContenu : ${bestDoc.content}\n[FIN EXTRAITS]`;
      }
    } catch (e) {
      console.warn('[RAG] Erreur:', e.message);
    }
    next();
  });
};
