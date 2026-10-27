'use strict';

module.exports = function(app, mongoose) {
  console.log('[answer-enricher] Chargement des modules experts...');

  // 1. Modules de base de connaissances (API 14L, OEM, BCT)
  require('./api14l-kb')(app, mongoose);
  require('./oem-chemical-injection-kb')(app, mongoose);
  require('./bct-kb')(app, mongoose);

  // 2. Modules IA et génération de rapports
  try { require('./claude-max')(app, mongoose); } catch (e) { console.warn('[claude-max] ignore'); }
  try { require('./gemini-fallback')(app, mongoose); } catch (e) { console.warn('[gemini] ignore'); }
  try { require('./answer-guardian')(app, mongoose); } catch (e) { console.warn('[guardian] ignore'); }
  try { require('./chemical-injection-module')(app, mongoose); } catch (e) { console.warn('[chemical] ignore'); }
  
  console.log('[answer-enricher] Tous les modules sont chargés avec succès.');
};
