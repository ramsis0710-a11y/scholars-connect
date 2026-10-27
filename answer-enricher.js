'use strict';

module.exports = function(app, mongoose) {
  console.log('[answer-enricher] Chargement des modules experts...');

  try { require('./api14l-kb')(app, mongoose); } catch (e) { console.warn('api14l-kb', e.message); }
  try { require('./oem-chemical-injection-kb')(app, mongoose); } catch (e) { console.warn('oem', e.message); }
  try { require('./bct-kb')(app, mongoose); } catch (e) { console.warn('bct', e.message); }
  
  try { require('./claude-max')(app, mongoose); } catch (e) { console.warn('claude', e.message); }
  try { require('./gemini-fallback')(app, mongoose); } catch (e) { console.warn('gemini', e.message); }
  try { require('./answer-guardian')(app, mongoose); } catch (e) { console.warn('guardian', e.message); }
  try { require('./chemical-injection-module')(app, mongoose); } catch (e) { console.warn('chemical', e.message); }
  
  console.log('[answer-enricher] Tous les modules sont chargés.');
};
