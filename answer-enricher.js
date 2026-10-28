'use strict';

module.exports = function(app, mongoose) {
  console.log('[answer-enricher] Initialisation complète.');

  // 1. Modules de base de connaissances
  try { require('./api14l-kb')(app, mongoose); } catch (e) {}
  try { require('./oem-chemical-injection-kb')(app, mongoose); } catch (e) {}
  try { require('./bct-kb')(app, mongoose); } catch (e) {}

  // 2. Modules IA
  try { require('./claude-max')(app, mongoose); } catch (e) {}
  try { require('./gemini-fallback')(app, mongoose); } catch (e) {}
  try { require('./answer-guardian')(app, mongoose); } catch (e) {}

  // 3. INTERCEPTION : on transforme le HTML du PDF en lien direct cliquable
  app.use(['/api/ask', '/api/analyze-content'], function(req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      if (!data || !data.answer) return originalJson(data);

      // Si la réponse contient l'iframe du PDF, on extrait le lien et on le remplace par un lien texte
      if (data.answer.includes('<iframe') && data.answer.includes('/api/claude-pdf/')) {
        const match = data.answer.match(/\/api\/claude-pdf\/([a-f0-9]+)/);
        if (match && match[1]) {
          const token = match[1];
          const pdfUrl = `https://scholars-connect-app.onrender.com/api/claude-pdf/${token}`;
          data.answer = `Le rapport technique est prêt.\n\n?? Cliquez ici pour ouvrir le PDF :\n${pdfUrl}\n\n---\n\n(Le PDF contient la réponse complète à votre question.)`;
          data.enriched = true;
        }
      }

      return originalJson(data);
    };
    next();
  });
};
