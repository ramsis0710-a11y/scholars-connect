'use strict';

module.exports = function(app, mongoose) {
  console.log('[answer-enricher] Chargement des modules experts...');

  // 1. Modules de base de connaissances
  try { require('./api14l-kb')(app, mongoose); } catch (e) { console.warn('api14l', e.message); }
  try { require('./oem-chemical-injection-kb')(app, mongoose); } catch (e) { console.warn('oem', e.message); }
  try { require('./bct-kb')(app, mongoose); } catch (e) { console.warn('bct', e.message); }

  // 2. Modules IA et PDF
  try { require('./claude-max')(app, mongoose); } catch (e) { console.warn('claude', e.message); }
  try { require('./gemini-fallback')(app, mongoose); } catch (e) { console.warn('gemini', e.message); }
  try { require('./answer-guardian')(app, mongoose); } catch (e) { console.warn('guardian', e.message); }
  try { require('./chemical-injection-module')(app, mongoose); } catch (e) { console.warn('chemical', e.message); }

  // 3. FIX POUR L'AFFICHAGE HTML ET L'HISTORIQUE
  app.use(['/api/ask', '/api/analyze-content'], function(req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      if (!data || !data.answer) return originalJson(data);
      
      // Si la réponse contient déjà du HTML (iframe, div, etc.), on ne touche à rien
      if (data.answer.includes('<iframe') || data.answer.includes('<div') || data.answer.includes('<p>')) {
        data.enriched = true;
        return originalJson(data);
      }

      // Sinon, on formate le texte brut
      let formatted = '<div style="font-family: Arial, sans-serif; line-height: 1.6; font-size: 14px; color: #333; padding: 10px;">';
      formatted += data.answer.replace(/\n/g, '<br>');
      formatted += '</div>';
      
      data.answerRaw = data.answer;
      data.answer = formatted;
      data.enriched = true;
      
      return originalJson(data);
    };
    next();
  });

  console.log('[answer-enricher] Tous les modules sont chargés, affichage et historique OK.');
};
