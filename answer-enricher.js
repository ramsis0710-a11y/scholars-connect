'use strict';

module.exports = function(app, mongoose) {
  console.log('[answer-enricher] Chargement des modules experts...');

  // 1. Modules de base de connaissances (API 14L, OEM, BCT)
  try { require('./api14l-kb')(app, mongoose); } catch (e) { console.warn('api14l', e.message); }
  try { require('./oem-chemical-injection-kb')(app, mongoose); } catch (e) { console.warn('oem', e.message); }
  try { require('./bct-kb')(app, mongoose); } catch (e) { console.warn('bct', e.message); }

  // 2. Modules IA
  try { require('./claude-max')(app, mongoose); } catch (e) { console.warn('claude', e.message); }
  try { require('./gemini-fallback')(app, mongoose); } catch (e) { console.warn('gemini', e.message); }
  try { require('./answer-guardian')(app, mongoose); } catch (e) { console.warn('guardian', e.message); }
  try { require('./chemical-injection-module')(app, mongoose); } catch (e) { console.warn('chemical', e.message); }

  // 3. LE FIX POUR L'AFFICHAGE ET L'HISTORIQUE
  app.use(['/api/ask', '/api/analyze-content'], function(req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      if (!data || !data.answer || data.enriched) return originalJson(data);

      let formattedAnswer = data.answer;
      if (!formattedAnswer.includes('<div') && !formattedAnswer.includes('<p>')) {
        formattedAnswer = '<div style="font-family:Arial; line-height:1.6; font-size:14px; color:#333;">' + 
                          formattedAnswer.replace(/\n/g, '<br>') + '</div>';
      }
      
      data.answerRaw = data.answer;
      data.answer = formattedAnswer;
      data.enriched = true;
      
      return originalJson(data);
    };
    next();
  });

  console.log('[answer-enricher] Tous les modules sont chargés, affichage corrigé.');
};
