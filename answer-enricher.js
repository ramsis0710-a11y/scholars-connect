'use strict';

module.exports = function(app, mongoose) {
  console.log('[answer-enricher] Chargement des modules experts...');

  // 1. Modules de base de connaissances (API 14L, OEM, BCT)
  try { require('./api14l-kb')(app, mongoose); } catch (e) { console.warn('api14l', e.message); }
  try { require('./oem-chemical-injection-kb')(app, mongoose); } catch (e) { console.warn('oem', e.message); }
  try { require('./bct-kb')(app, mongoose); } catch (e) { console.warn('bct', e.message); }

  // 2. Modules IA (On laisse tomber claude-max pour le chat car il génère le PDF qui casse l'interface)
  // try { require('./claude-max')(app, mongoose); } 
  try { require('./gemini-fallback')(app, mongoose); } catch (e) { console.warn('gemini', e.message); }
  try { require('./answer-guardian')(app, mongoose); } catch (e) { console.warn('guardian', e.message); }
  try { require('./chemical-injection-module')(app, mongoose); } catch (e) { console.warn('chemical', e.message); }

  // 3. FIX POUR L'AFFICHAGE PROPRE (SANS HTML BRUT)
  app.use(['/api/ask', '/api/analyze-content'], function(req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      if (!data || !data.answer) return originalJson(data);
      
      // On nettoie les balises HTML pour que ça s'affiche en texte propre
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

  console.log('[answer-enricher] Tous les modules sont chargés, affichage texte propre.');
};
