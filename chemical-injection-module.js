'use strict';
module.exports = function(app, mongoose) {
  app.get('/api/chemical-injection/presentation', (req, res) => {
    res.json({ ok: true, titre: 'Chemical Injection (API 14L)', tolerance: '+0.0020 in / -0.0000 in' });
  });
  console.log('[chemical-injection] Module chargé.');
};
