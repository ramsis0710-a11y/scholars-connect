'use strict';
module.exports = function(app, mongoose) {
  require('./api14l-kb')(app, mongoose);
  require('./oem-chemical-injection-kb')(app, mongoose);
  require('./bct-kb')(app, mongoose);
  console.log('[answer-enricher] Version minimale chargée (les autres modules sont inclus).');
};
